import mongoose from "mongoose";
import PaymentSession, { PAYMENT_SESSION_STATUSES } from "../../../DB/model/PaymentSession.model.js";
import Order, { ORDER_STATUSES } from "../../../DB/model/Order.model.js";
import Table from "../../../DB/model/Table.model.js";
import TableSession from "../../../DB/model/TableSession.model.js";
import User from "../../../DB/model/User.model.js";
import AuditLog from "../../../DB/model/AuditLog.model.js";
import { createNotification } from "../../notification/notification.service.js";
import { getIO } from "../../../config/socket.js";
import { AppError } from "../../../util/error/AppError.js";

export async function createPaymentSession(orderId, requestedBy, paymentMethod = "Cash") {
  const order = await Order.findOne({ id: String(orderId) }).lean();
  if (!order) throw new AppError("Order not found.", 404);
  if (order.status !== "BillRequested" && order.status !== "PaymentInProgress" && order.status !== "Served" && order.status !== "Dining") {
    throw new AppError("Order is not ready for payment.", 400);
  }
  if (order.paymentStatus === "paid") throw new AppError("Order is already paid.", 400);

  const existing = await PaymentSession.findOne({ order: order._id, status: { $in: ["pending", "processing"] } }).lean();
  if (existing) throw new AppError("A payment session already exists for this order.", 409);

  const subtotal = order.total || 0;
  const items = (order.itemsDetail || []).map((i) => ({ ...i, total: (i.price || 0) * (i.qty || 0) }));

  const session = await PaymentSession.create({
    order: order._id,
    orderId: order.id,
    tableNumber: order.tableNumber,
    requestedBy,
    status: "pending",
    paymentMethod,
    subtotal,
    total: subtotal,
    amountPaid: 0,
    items,
    startedAt: new Date(),
  });

  await Order.findByIdAndUpdate(order._id, {
    $set: { status: "PaymentInProgress", paymentStartedAt: new Date() },
  });

  await createNotification({
    type: "payment_request",
    title: "Payment Requested",
    message: `Payment requested for Order ${order.id} at Table ${order.tableNumber || "—"}. Total: $${subtotal.toFixed(2)}`,
    priority: "high",
    roleTarget: "Cashier",
    metadata: {
      orderId: order.id,
      tableNumber: order.tableNumber,
      paymentSessionId: String(session._id),
      total: subtotal,
    },
  });

  await AuditLog.create({
    action: "payment_started",
    description: `Payment started for order ${order.id}. Method: ${paymentMethod}`,
    orderId: order.id,
    tableNumber: order.tableNumber,
    newValue: { paymentMethod, total: subtotal },
  });

  const io = getIO();
  if (io) {
    io.to(`role:Cashier`).emit("payment:requested", {
      paymentSessionId: session._id,
      orderId: order.id,
      tableNumber: order.tableNumber,
      total: subtotal,
    });
    io.to(`order:${order.id}`).emit("order:statusChanged", { id: order.id, status: "PaymentInProgress" });
  }

  return session;
}

export async function processPayment(paymentSessionId, userId, opts = {}) {
  const session = await PaymentSession.findById(paymentSessionId).lean();
  if (!session) throw new AppError("Payment session not found.", 404);
  if (session.status !== "pending") throw new AppError("Payment session already processed.", 400);

  const order = await Order.findById(session.order).lean();
  if (!order) throw new AppError("Order not found.", 404);

  const discount = Number(opts.discount) || 0;
  const discountType = opts.discountType || "fixed";
  const taxRate = Number(opts.taxRate) || 0;
  const serviceCharge = Number(opts.serviceCharge) || 0;
  const paymentMethod = opts.paymentMethod || session.paymentMethod;

  const discountAmount = discountType === "percentage" ? (session.subtotal * discount) / 100 : discount;
  const taxAmount = (session.subtotal - discountAmount) * taxRate / 100;
  const total = session.subtotal - discountAmount + taxAmount + serviceCharge;
  const amountPaid = Math.max(total, 0);
  const change = amountPaid > total ? amountPaid - total : 0;

  const now = new Date();

  const sessionInstance = await mongoose.startSession();
  try {
    await sessionInstance.withTransaction(async () => {
      await PaymentSession.findByIdAndUpdate(paymentSessionId, {
        $set: {
          status: "completed",
          processedBy: userId,
          paymentMethod,
          discount,
          discountType,
          taxRate,
          taxAmount,
          serviceCharge,
          total,
          amountPaid,
          change,
          completedAt: now,
          receiptGenerated: true,
        },
      }).session(sessionInstance);

      await Order.findByIdAndUpdate(session.order, {
        $set: {
          status: "Paid",
          paymentStatus: "paid",
          paidAt: now,
          paidBy: userId,
        },
      }).session(sessionInstance);

      await Table.findByIdAndUpdate(order.tableId || null, { $set: { status: "needs_cleaning" } }).session(sessionInstance);

      if (session.tableNumber) {
        await Table.findOneAndUpdate(
          { tableNumber: session.tableNumber },
          { $set: { status: "needs_cleaning" } },
        ).session(sessionInstance);
      }
    });
  } finally {
    await sessionInstance.endSession();
  }

  await createNotification({
    type: "payment_completed",
    title: "Payment Completed",
    message: `Payment of $${amountPaid.toFixed(2)} completed for Order ${order.id}`,
    priority: "medium",
    recipientId: session.requestedBy,
    metadata: { orderId: order.id, tableNumber: session.tableNumber, total: amountPaid },
  });

  await AuditLog.create({
    action: "payment_completed",
    description: `Payment completed for order ${order.id}. Amount: $${amountPaid.toFixed(2)}, Method: ${paymentMethod}`,
    orderId: order.id,
    tableNumber: session.tableNumber,
    newValue: { amount: amountPaid, method: paymentMethod, discount: discountAmount, tax: taxAmount },
  });

  const io = getIO();
  if (io) {
    io.to(`order:${order.id}`).emit("order:statusChanged", { id: order.id, status: "Paid" });
    io.to(`role:Cashier`).emit("payment:completed", { paymentSessionId, orderId: order.id });
    io.to(`role:Order Taker`).emit("payment:completed", { paymentSessionId, orderId: order.id, tableNumber: session.tableNumber });
  }

  return {
    session: await PaymentSession.findById(paymentSessionId).lean(),
    receipt: {
      orderId: order.id,
      tableNumber: session.tableNumber,
      items: session.items,
      subtotal: session.subtotal,
      discount: discountAmount,
      tax: taxAmount,
      serviceCharge,
      total,
      amountPaid,
      change,
      paymentMethod,
      completedAt: now,
    },
  };
}

export async function getPendingPayments(query = {}) {
  const filter = { status: "pending" };
  if (query.cashierId) filter.cashierId = query.cashierId;
  if (query.tableNumber) filter.tableNumber = Number(query.tableNumber);
  const sessions = await PaymentSession.find(filter)
    .populate("requestedBy", "name")
    .sort({ createdAt: 1 })
    .lean();
  return sessions;
}

export async function getPaymentHistory(userId, query = {}) {
  const filter = { $or: [{ requestedBy: userId }, { processedBy: userId }, { cashierId: userId }] };
  if (query.status) filter.status = query.status;
  const sessions = await PaymentSession.find(filter)
    .sort({ createdAt: -1 })
    .limit(Math.min(Number(query.limit) || 50, 100))
    .lean();
  return sessions;
}

export async function closeTableAfterPayment(orderId) {
  const order = await Order.findOne({ id: String(orderId) }).lean();
  if (!order) throw new AppError("Order not found.", 404);
  if (order.status !== "Paid") throw new AppError("Order must be paid first.", 400);

  const unpaidOrders = await Order.countDocuments({
    $or: [
      { tableSession: order.tableSession },
      { tableNumber: order.tableNumber },
    ].filter(Boolean),
    paymentStatus: { $ne: "paid" },
    status: { $nin: ["Cancelled", "Rejected", "Refunded"] },
    _id: { $ne: order._id },
  }).lean();

  if (unpaidOrders > 0) {
    throw new AppError(
      `Cannot close table: ${unpaidOrders} unpaid order(s) remaining. Process all payments first.`,
      400,
    );
  }

  if (order.tableNumber) {
    await Table.findOneAndUpdate(
      { tableNumber: order.tableNumber },
      { $set: { status: "available" } },
    );
  }

  if (order.tableSession) {
    await TableSession.findByIdAndUpdate(order.tableSession, {
      $set: { status: "closed", closedAt: new Date() },
    });
  }

  await AuditLog.create({
    action: "table_closed",
    description: `Table ${order.tableNumber || "—"} closed after payment for order ${order.id}. All orders paid.`,
    orderId: order.id,
    tableNumber: order.tableNumber,
  });

  const io = getIO();
  if (io) {
    io.emit("table:statusChanged", { tableNumber: order.tableNumber, status: "available" });
  }

  return { message: "Table closed" };
}
