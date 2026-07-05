import WaiterRequest from "../../../DB/model/WaiterRequest.model.js";
import Order from "../../../DB/model/Order.model.js";
import TableSession from "../../../DB/model/TableSession.model.js";
import User from "../../../DB/model/User.model.js";
import Task from "../../../DB/model/Task.model.js";
import AuditLog from "../../../DB/model/AuditLog.model.js";
import { createTask } from "../../task/task.service.js";
import { createNotification } from "../../notification/notification.service.js";
import { getIO } from "../../../config/socket.js";
import { getSettings } from "../../settings/settings.service.js";
import { AppError } from "../../../util/error/AppError.js";

export async function createBillRequest(sessionToken, message = "") {
  const session = await TableSession.findOne({ sessionToken, status: "active" }).lean();
  if (!session) throw new AppError("Invalid or expired table session.", 401);

  const existing = await WaiterRequest.findOne({
    tableSession: session._id,
    type: "request_bill",
    status: { $in: ["pending", "acknowledged"] },
  }).lean();
  if (existing) throw new AppError("A bill request is already pending for this table.", 409);

  const request = await WaiterRequest.create({
    table: session.table,
    tableNumber: session.tableNumber,
    tableSession: session._id,
    type: "request_bill",
    status: "pending",
    message,
  });

  await Order.findOneAndUpdate(
    { tableSession: session._id, status: { $in: ["Served", "Dining"] } },
    { $set: { status: "BillRequested", billRequestedAt: new Date() } },
  );

  const assignedWaiter = await User.findOne({
    role: "Order Taker",
    assignedTables: session.tableNumber,
    employeeStatus: { $nin: ["offline", "on_break"] },
    "shift.clockedIn": true,
  })
    .sort({ currentTaskCount: 1 })
    .lean();

  const targetRole = assignedWaiter ? null : "Order Taker";
  const recipientId = assignedWaiter?._id || null;

  const task = await createTask({
    title: `Bill Request - Table ${session.tableNumber}`,
    description: message || `Customer at Table ${session.tableNumber} requested the bill.`,
    category: "bill_request",
    priority: "high",
    assignedTo: recipientId,
    roleTarget: targetRole,
    tableNumber: session.tableNumber,
    requestId: request._id,
    dueBy: new Date(Date.now() + 60000),
  });

  await createNotification({
    type: "waiter_bill",
    title: "Bill Requested",
    message: `Table ${session.tableNumber} has requested the bill.`,
    priority: "high",
    recipientId,
    roleTarget: targetRole,
    metadata: { tableNumber: session.tableNumber, requestId: String(request._id), taskId: String(task._id) },
  });

  if (assignedWaiter) {
    setTimeout(async () => {
      await checkBillEscalation(request._id, task._id, session);
    }, 60000);
  }

  await AuditLog.create({
    action: "bill_requested",
    description: `Bill requested at Table ${session.tableNumber}`,
    tableNumber: session.tableNumber,
    tableSession: session._id,
  });

  const io = getIO();
  if (io) {
    io.to(`role:Order Taker`).emit("bill:requested", {
      requestId: request._id,
      tableNumber: session.tableNumber,
    });
    if (recipientId) io.to(`user:${recipientId}`).emit("bill:assigned", { requestId: request._id, taskId: task._id });
  }

  return { request, task };
}

async function checkBillEscalation(requestId, taskId, session) {
  const request = await WaiterRequest.findById(requestId).lean();
  if (!request || request.status !== "pending") return;

  const nextWaiter = await User.find({
    role: "Order Taker",
    employeeStatus: { $nin: ["offline", "on_break"] },
    "shift.clockedIn": true,
    _id: { $ne: request.acknowledgedBy || undefined },
  })
    .sort({ currentTaskCount: 1 })
    .limit(1)
    .lean();

  if (nextWaiter.length) {
    await Task.findByIdAndUpdate(taskId, {
      $set: { assignedTo: nextWaiter[0]._id, escalationCount: 1, escalatedAt: new Date() },
    });
    await createNotification({
      type: "waiter_escalated",
      title: "Bill Request Escalated",
      message: `Bill request from Table ${session.tableNumber} reassigned to you.`,
      priority: "high",
      recipientId: nextWaiter[0]._id,
      metadata: { tableNumber: session.tableNumber, requestId: String(requestId) },
    });
  } else {
    await createNotification({
      type: "manager_alert",
      title: "Unanswered Bill Request",
      message: `Bill request at Table ${session.tableNumber} has not been answered.`,
      priority: "critical",
      roleTarget: "General Manager",
      metadata: { tableNumber: session.tableNumber, requestId: String(requestId) },
    });
  }

  await AuditLog.create({
    action: "bill_escalated",
    description: `Bill request at Table ${session.tableNumber} escalated`,
    tableNumber: session.tableNumber,
  });
}

export async function acknowledgeBillRequest(requestId, userId) {
  const request = await WaiterRequest.findByIdAndUpdate(requestId, {
    $set: { status: "acknowledged", acknowledgedBy: userId, acknowledgedAt: new Date() },
  }, { new: true }).lean();
  if (!request) throw new AppError("Request not found.", 404);

  const io = getIO();
  if (io) io.to(`role:Order Taker`).emit("bill:acknowledged", { requestId, waiterId: userId });

  return request;
}

export async function resolveBillRequest(requestId, userId) {
  const request = await WaiterRequest.findByIdAndUpdate(requestId, {
    $set: { status: "resolved", resolvedBy: userId, resolvedAt: new Date() },
  }, { new: true }).lean();
  if (!request) throw new AppError("Request not found.", 404);

  await AuditLog.create({
    action: "bill_resolved",
    description: `Bill request at Table ${request.tableNumber} resolved`,
    tableNumber: request.tableNumber,
  });

  const io = getIO();
  if (io) io.to(`role:Order Taker`).emit("bill:resolved", { requestId });

  return request;
}
