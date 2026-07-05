import WaiterRequest, { REQUEST_TYPES, REQUEST_STATUSES } from "../../../DB/model/WaiterRequest.model.js";
import Table from "../../../DB/model/Table.model.js";
import TableSession from "../../../DB/model/TableSession.model.js";
import Visit from "../../../DB/model/Visit.model.js";
import User from "../../../DB/model/User.model.js";
import Task from "../../../DB/model/Task.model.js";
import AuditLog from "../../../DB/model/AuditLog.model.js";
import { AppError } from "../../../util/error/AppError.js";
import { getIO } from "../../../config/socket.js";
import { createNotification } from "../../notification/notification.service.js";
import { createTask } from "../../task/task.service.js";
import { scheduleEscalation } from "../../host/service/escalation.service.js";

const REQUEST_LABELS = {
  call_waiter: "Waiter Call",
  request_bill: "Bill Request",
  need_water: "Water",
  need_cutlery: "Cutlery",
  need_napkins: "Napkins",
  need_sauce: "Sauce",
  need_assistance: "Assistance",
  request_water_refill: "Water Refill",
  order_issue: "Order Issue",
  complaint: "Complaint",
  request_manager: "Manager Request",
};

const REQUEST_PRIORITY_MAP = {
  call_waiter: "medium",
  request_bill: "high",
  need_water: "low",
  need_cutlery: "low",
  need_napkins: "low",
  need_sauce: "low",
  need_assistance: "medium",
  request_water_refill: "low",
  order_issue: "high",
  complaint: "critical",
  request_manager: "critical",
};

async function findBestWaiter(branchId = null, tableNumber = null, excludeId = null) {
  const filter = {
    role: "Order Taker",
    employeeStatus: { $nin: ["offline", "on_break"] },
    "shift.clockedIn": true,
  };
  if (branchId) filter.branchId = branchId;

  let preferredWaiters = [];
  if (tableNumber) {
    const table = await Table.findOne({ tableNumber: Number(tableNumber) }).lean();
    if (table?.assignedWaiters?.length) {
      preferredWaiters = await User.find({
        _id: { $in: table.assignedWaiters },
        employeeStatus: { $nin: ["offline", "on_break"] },
        "shift.clockedIn": true,
      }).lean();
    }
  }

  const waiters = preferredWaiters.length > 0
    ? preferredWaiters
    : await User.find(filter).select("name currentTaskCount maxConcurrentTasks employeeStatus role").lean();

  if (waiters.length === 0) return null;

  const available = waiters.filter((w) => w.employeeStatus === "available");
  const candidates = available.length > 0 ? available : waiters;

  const sorted = candidates.sort((a, b) => {
    const aLoad = a.maxConcurrentTasks > 0 ? (a.currentTaskCount || 0) / a.maxConcurrentTasks : 1;
    const bLoad = b.maxConcurrentTasks > 0 ? (b.currentTaskCount || 0) / b.maxConcurrentTasks : 1;
    if (aLoad !== bLoad) return aLoad - bLoad;
    if (a.employeeStatus === "available" && b.employeeStatus !== "available") return -1;
    if (b.employeeStatus === "available" && a.employeeStatus !== "available") return 1;
    return 0;
  });

  if (excludeId) {
    return sorted.find((w) => w._id.toString() !== excludeId.toString()) || sorted[0];
  }

  return sorted[0];
}

export async function createWaiterRequest(type, options = {}) {
  if (!REQUEST_TYPES.includes(type)) {
    throw new AppError("Invalid request type", 400);
  }

  const { sessionToken, message, ip, visitId } = options;

  if (!sessionToken && !visitId) {
    throw new AppError("Table session or visit ID is required", 400);
  }

  let tableData = null;
  let resolvedVisitId = visitId;

  if (sessionToken) {
    const session = await TableSession.findOne({ sessionToken, status: "active" }).lean();
    if (!session) throw new AppError("Invalid or expired table session", 401);

    const table = await Table.findById(session.table).lean();
    if (!table) throw new AppError("Table not found", 404);
    tableData = { table: table._id, tableNumber: table.tableNumber, tableSession: session._id };

    if (!resolvedVisitId) {
      const activeVisit = await Visit.findOne({
        "session.tableSessionId": session._id,
        status: { $in: ["seated", "dining"] },
      }).lean();
      resolvedVisitId = activeVisit?._id;
    }
  }

  const recentRequest = await WaiterRequest.findOne({
    table: tableData?.table,
    type,
    status: { $in: ["pending", "acknowledged"] },
  }).lean();

  if (recentRequest) {
    throw new AppError(
      "Your request has already been received. A staff member will be with you shortly.",
      409,
    );
  }

  const priority = REQUEST_PRIORITY_MAP[type] || "medium";

  const request = await WaiterRequest.create({
    table: tableData?.table,
    tableNumber: tableData?.tableNumber,
    tableSession: tableData?.tableSession,
    visitId: resolvedVisitId,
    type,
    status: "pending",
    priority,
    message: String(message || "").trim(),
    ip: ip || "",
    source: "customer",
  });

  const assignedWaiter = await findBestWaiter(null, tableData?.tableNumber);

  if (assignedWaiter) {
    request.assignedTo = assignedWaiter._id;
    request.assignedAt = new Date();
    await request.save();

    const task = await createTask({
      title: `${REQUEST_LABELS[type] || type} — Table ${tableData?.tableNumber}`,
      description: message || `Customer at Table ${tableData?.tableNumber} requested ${REQUEST_LABELS[type] || type}`,
      category: "waiter_call",
      priority,
      assignedTo: assignedWaiter._id,
      tableNumber: tableData?.tableNumber,
      requestId: request._id,
      dueBy: new Date(Date.now() + 60000),
    });

    await createNotification({
      type: `waiter_${type}`,
      title: `${REQUEST_LABELS[type] || type} — Table ${tableData?.tableNumber}`,
      message: message || `Assigned to ${assignedWaiter.name}`,
      priority,
      recipientId: assignedWaiter._id,
      metadata: {
        tableNumber: tableData?.tableNumber,
        requestId: request._id.toString(),
        taskId: task._id.toString(),
        url: "/waiter",
      },
    });

    scheduleEscalation(
      request._id,
      task._id,
      type,
      tableData?.tableNumber || 0,
      { visitId: resolvedVisitId },
    );
  } else {
    await createNotification({
      type: "manager_alert",
      title: `Unattended: ${REQUEST_LABELS[type] || type}`,
      message: `Table ${tableData?.tableNumber} — ${type} — no waiter available`,
      priority: "critical",
      roleTarget: "General Manager",
      metadata: { tableNumber: tableData?.tableNumber, requestId: request._id.toString() },
    });
  }

  await AuditLog.create({
    action: `waiter_${type}`,
    tableNumber: tableData?.tableNumber,
    tableSession: tableData?.tableSession,
    description: `${REQUEST_LABELS[type] || type} at table ${tableData?.tableNumber}`,
    ip: ip || "",
    newValue: assignedWaiter ? { assignedTo: assignedWaiter.name } : { assignedTo: null },
  });

  const io = getIO();
  if (io) {
    io.emit("waiter:requestCreated", {
      ...request.toObject(),
      assignedWaiter: assignedWaiter ? { _id: assignedWaiter._id, name: assignedWaiter.name } : null,
    });
  }

  return request.toObject();
}

export async function acknowledgeRequest(requestId, userId) {
  const now = new Date();
  const request = await WaiterRequest.findById(requestId);
  if (!request) throw new AppError("Request not found", 404);

  const responseTime = Math.round((now - new Date(request.createdAt)) / 1000);

  request.status = "acknowledged";
  request.acknowledgedBy = userId;
  request.acknowledgedAt = now;
  request.responseTimeSeconds = responseTime;
  await request.save();

  const io = getIO();
  if (io) io.emit("waiter:requestUpdated", { ...request.toObject(), status: "acknowledged" });

  return request.toObject();
}

export async function startInProgress(requestId, userId) {
  const request = await WaiterRequest.findById(requestId);
  if (!request) throw new AppError("Request not found", 404);
  if (request.status !== "acknowledged") throw new AppError("Request must be acknowledged first", 400);

  request.status = "in_progress";
  request.inProgressBy = userId;
  request.inProgressAt = new Date();
  await request.save();

  const io = getIO();
  if (io) io.emit("waiter:requestUpdated", { ...request.toObject(), status: "in_progress" });

  return request.toObject();
}

export async function resolveRequest(requestId, userId) {
  const now = new Date();
  const request = await WaiterRequest.findById(requestId);
  if (!request) throw new AppError("Request not found", 404);

  const resolutionTime = request.acknowledgedAt
    ? Math.round((now - new Date(request.acknowledgedAt)) / 1000)
    : 0;

  request.status = "resolved";
  request.resolvedBy = userId;
  request.resolvedAt = now;
  request.resolutionTimeSeconds = resolutionTime;
  await request.save();

  if (request.assignedTo) {
    const currentTask = await Task.findOne({ requestId: request._id, status: "pending" }).lean();
    if (currentTask) {
      await Task.findByIdAndUpdate(currentTask._id, { $set: { status: "completed", completedAt: now } });
    }

    await User.findByIdAndUpdate(request.assignedTo, {
      $inc: { currentTaskCount: -1, "performance.requestsResolved": 1 },
    });
  }

  const io = getIO();
  if (io) io.emit("waiter:requestUpdated", { ...request.toObject(), status: "resolved" });

  return request.toObject();
}

export async function listWaiterRequests(query = {}) {
  const filter = {};
  if (query.status && query.status !== "all") filter.status = query.status;
  if (query.type) filter.type = query.type;
  if (query.assignedTo) filter.assignedTo = query.assignedTo;
  if (query.visitId) filter.visitId = query.visitId;

  const requests = await WaiterRequest.find(filter)
    .sort({ priority: 1, createdAt: -1 })
    .populate("resolvedBy", "name")
    .populate("acknowledgedBy", "name")
    .populate("assignedTo", "name")
    .lean();

  return requests;
}

export async function getPendingCounts() {
  const [calls, bills, water, cutlery, assistance, complaints] = await Promise.all([
    WaiterRequest.countDocuments({ type: "call_waiter", status: "pending" }),
    WaiterRequest.countDocuments({ type: "request_bill", status: "pending" }),
    WaiterRequest.countDocuments({ type: "need_water", status: "pending" }),
    WaiterRequest.countDocuments({ type: "need_cutlery", status: "pending" }),
    WaiterRequest.countDocuments({ type: "need_assistance", status: "pending" }),
    WaiterRequest.countDocuments({ type: "complaint", status: "pending" }),
  ]);

  return {
    callWaiter: calls,
    requestBill: bills,
    needWater: water,
    needCutlery: cutlery,
    needAssistance: assistance,
    complaints,
    total: calls + bills + water + cutlery + assistance + complaints,
  };
}

export async function getActiveRequestsForTable(tableNumber) {
  return WaiterRequest.find({
    tableNumber: Number(tableNumber),
    status: { $in: ["pending", "acknowledged", "in_progress"] },
  })
    .sort({ createdAt: -1 })
    .lean();
}

export async function sendReminder(requestId) {
  const request = await WaiterRequest.findById(requestId).lean();
  if (!request) throw new AppError("Request not found", 404);
  if (request.status !== "pending") throw new AppError("Request already being handled", 400);

  if (request.assignedTo) {
    await WaiterRequest.findByIdAndUpdate(requestId, { $set: { reminderSentAt: new Date() } });

    await createNotification({
      type: "waiter_reminder",
      title: "Reminder: Pending Request",
      message: `Table ${request.tableNumber} — ${REQUEST_LABELS[request.type] || request.type} still pending`,
      priority: "high",
      recipientId: request.assignedTo,
      metadata: { tableNumber: request.tableNumber, requestId: request._id.toString() },
    });

    return { message: "Reminder sent" };
  }

  const newWaiter = await findBestWaiter(null, request.tableNumber, null);
  if (newWaiter) {
    request.assignedTo = newWaiter._id;
    await WaiterRequest.findByIdAndUpdate(requestId, {
      $set: { assignedTo: newWaiter._id, assignedAt: new Date() },
    });

    await createNotification({
      type: "waiter_reassigned",
      title: "Request Reassigned",
      message: `Table ${request.tableNumber} — ${REQUEST_LABELS[request.type] || request.type} reassigned to you`,
      priority: "high",
      recipientId: newWaiter._id,
      metadata: { tableNumber: request.tableNumber, requestId: request._id.toString() },
    });
  }

  return { message: "Reminder sent" };
}
