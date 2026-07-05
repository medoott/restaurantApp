import mongoose from "mongoose";
import Order, { ORDER_STATUSES, PAYMENT_STATUSES } from "../../../DB/model/Order.model.js";
import Table from "../../../DB/model/Table.model.js";
import TableSession from "../../../DB/model/TableSession.model.js";
import AuditLog from "../../../DB/model/AuditLog.model.js";
import { AppError } from "../../../util/error/AppError.js";
import { escapeRegExp } from "../../../util/string/escape-regexp.js";
import { safeObjectId } from "../../../util/validation/validateObjectId.js";
import { getIO } from "../../../config/socket.js";
import { emitToBranch, emitToOrderAndBranch } from "../../../util/socket/emitHelper.js";
import { getSettings } from "../../settings/settings.service.js";

const VALID_TRANSITIONS = {
  Pending: ["Preparing", "Cancelled", "Rejected", "Modified"],
  Preparing: ["Ready", "Cancelled", "Modified"],
  Ready: ["ReadyForPickup"],
  ReadyForPickup: ["BeingDelivered", "Cancelled"],
  BeingDelivered: ["Served"],
  Served: ["Dining", "Paid"],
  Dining: ["BillRequested", "Paid", "Modified"],
  BillRequested: ["PaymentInProgress", "Paid", "Modified"],
  PaymentInProgress: ["Paid", "Modified"],
  Paid: ["Cleaning", "Reopened", "Refunded"],
  Cleaning: [],
  Cancelled: ["Reopened"],
  Rejected: [],
  Reopened: ["Pending", "Preparing"],
  Refunded: [],
  Modified: ["Pending", "Preparing", "Ready"],
};

const PAYMENT_METHODS = ["Cash", "Online"];
const DEFAULT_EDIT_WINDOW_MS = 45 * 1000;

const generateOrderCode = () => Math.floor(100000 + Math.random() * 900000);

export { ORDER_STATUSES, PAYMENT_STATUSES, VALID_TRANSITIONS };

export const getOrderById = async (id, opts = {}) => {
  const order = await Order.findOne({ id: String(id) }).lean();
  if (!order) throw new AppError("Order not found. Please check the order ID.", 404);

  if (opts?.userId) return order;

  if (opts?.sessionToken) {
    const session = await TableSession.findOne({
      sessionToken: opts.sessionToken,
      status: "active",
    }).lean();
    if (session && String(order.tableSession) === String(session._id)) {
      return order;
    }
    throw new AppError("You are not authorized to view this order.", 403);
  }

  throw new AppError("Authorization token is required", 401);
};

export const listOrders = async (query = {}) => {
  const page = Math.max(Number(query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(query.limit) || 10, 1), 100);
  const search = String(query.search || "").trim();
  const status = String(query.status || "").trim();
  const paymentStatus = String(query.paymentStatus || "").trim();

  const filter = {};
  if (query.branchId) {
    const safeBranchId = safeObjectId(query.branchId);
    if (safeBranchId) filter.branchId = safeBranchId;
  }
  if (search) {
    const regex = new RegExp(escapeRegExp(search), "i");
    const searchNumber = Number(search);
    filter.$or = [
      { id: regex },
      { customer: regex },
      { payment: regex },
      ...(Number.isFinite(searchNumber) ? [{ code: searchNumber }] : []),
    ];
  }
  if (status && status !== "All" && ORDER_STATUSES.includes(status)) {
    filter.status = status;
  }
  if (paymentStatus && PAYMENT_STATUSES.includes(paymentStatus)) {
    filter.paymentStatus = paymentStatus;
  }

  const [items, total] = await Promise.all([
    Order.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Order.countDocuments(filter),
  ]);

  return {
    items,
    meta: { page, limit, total, pages: Math.max(Math.ceil(total / limit), 1) },
  };
};

export const getOrderStats = async () => {
  const [statusCounts, paymentStatusCounts, totalOrders, totalRevenue] = await Promise.all([
    Order.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
      { $project: { _id: 0, status: "$_id", count: 1 } },
    ]),
    Order.aggregate([
      { $group: { _id: "$paymentStatus", count: { $sum: 1 } } },
      { $project: { _id: 0, paymentStatus: "$_id", count: 1 } },
    ]),
    Order.countDocuments(),
    Order.aggregate([{ $group: { _id: null, revenue: { $sum: "$total" } } }]),
  ]);

  return {
    totalOrders,
    totalRevenue: totalRevenue[0]?.revenue || 0,
    statusCounts,
    paymentStatusCounts,
  };
};

export const createOrderService = async (payload = {}) => {
  const {
    customer = "",
    code = 0,
    items = 0,
    payment = "Cash",
    total = 0,
    status = "Pending",
    itemsDetail = [],
    id,
    sessionToken,
  } = payload;

  const resolvedPayment = PAYMENT_METHODS.includes(payment) ? payment : "Cash";
  const resolvedTotal = Number.isFinite(Number(total)) ? Number(total) : 0;
  const resolvedCode = Number.isFinite(Number(code)) && Number(code) > 0 ? Number(code) : generateOrderCode();
  const normalizedItemsDetail = Array.isArray(itemsDetail)
    ? itemsDetail.map((item) => ({
        id: item?.id ?? item?._id ?? item?.name ?? "",
        name: String(item?.name || "").trim(),
        qty: Math.max(Number(item?.qty) || 0, 0),
        price: Math.max(Number(item?.price) || 0, 0),
      }))
    : [];

  if (normalizedItemsDetail.length === 0) {
    throw new AppError("Your order must include at least one item.", 400);
  }

  if (normalizedItemsDetail.some((i) => !i.name)) {
    throw new AppError("Each item must have a name.", 400);
  }

  if (normalizedItemsDetail.some((i) => i.price <= 0)) {
    throw new AppError("Invalid item price detected.", 400);
  }

  if (resolvedTotal <= 0) {
    throw new AppError("Order total must be greater than 0.", 400);
  }

  let tableSession = null;
  let tableNumber = null;

  if (sessionToken) {
    tableSession = await TableSession.findOne({ sessionToken, status: "active" }).lean();
    if (!tableSession) {
      throw new AppError("Your table session has expired. Please scan the QR code again.", 401);
    }
    if (tableSession.expiresAt <= new Date()) {
      await TableSession.findByIdAndUpdate(tableSession._id, { $set: { status: "expired" } });
      throw new AppError("Your table session has expired. Please scan the QR code again.", 401);
    }

    const tableDoc = await Table.findById(tableSession.table).lean();
    tableNumber = tableDoc?.tableNumber || null;

    await TableSession.findByIdAndUpdate(tableSession._id, {
      $set: { lastActivityAt: new Date(), expiresAt: new Date(Date.now() + 30 * 60 * 1000) },
    });
  }

  const resolvedCustomer = String(customer || "Guest").trim() || "Guest";

  // Generate a guest label for table ordering (e.g., "Guest 1", "Guest 2")
  let guestLabel = "";
  if (tableSession) {
    const orderCount = await Order.countDocuments({ tableSession: tableSession._id });
    const labels = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z"];
    guestLabel = `Guest ${labels[orderCount] || `#${orderCount + 1}`}`;
  }

  const settings = await getSettings();
  const orderPrefix = settings?.ordering?.orderPrefix || "ORD-";
  const orderId = id || `${orderPrefix}${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const now = new Date();
  const editExpiresAt = new Date(now.getTime() + DEFAULT_EDIT_WINDOW_MS);

  const toCreate = {
    id: orderId,
    customer: resolvedCustomer,
    code: resolvedCode,
    items: normalizedItemsDetail.reduce((sum, item) => sum + item.qty, 0),
    payment: resolvedPayment,
    paymentStatus: "unpaid",
    total: resolvedTotal,
    status: "Pending",
    itemsDetail: normalizedItemsDetail,
    editExpiresAt,
    guestLabel,
    ...(tableSession ? { tableSession: tableSession._id } : {}),
    ...(tableNumber ? { tableNumber } : {}),
    ...(payload.submittedBy ? { submittedBy: payload.submittedBy } : {}),
  };

  let created;
  try {
    created = await Order.create(toCreate);
  } catch (err) {
    if (err.code === 11000) {
      throw new AppError("Duplicate order detected. Please try again.", 409);
    }
    throw err;
  }

  if (tableSession) {
    await TableSession.findByIdAndUpdate(tableSession._id, {
      $push: { orderIds: created._id },
    });
  }

  await AuditLog.create({
    customer: resolvedCustomer,
    tableNumber,
    tableSession: tableSession?._id || null,
    orderId,
    action: "order_created",
    description: `Order ${orderId} created for ${resolvedCustomer}`,
    newValue: { status: "Pending", total: resolvedTotal, items: normalizedItemsDetail.length },
    ip: payload.ip || "",
    sessionId: sessionToken || "",
    userAgent: payload.userAgent || "",
  });

  try {
    const io = getIO();
    emitToBranch(io, created.branchId, "order:created", created.toObject());
  } catch { }

  // Auto-deduct inventory after order creation
  if (process.env.INVENTORY_AUTO_DEDUCT !== "false") {
    import("../../recipe/service/recipe.service.js").then(({ deductInventoryForOrder }) => {
      Promise.all(
        normalizedItemsDetail.map((item) =>
          deductInventoryForOrder(item.name, item.qty, payload.submittedBy)
            .catch((e) => console.error(`[inventory] deduction failed for ${item.name}:`, e?.message))
        )
      ).then((results) => {
        const allShortages = results.flatMap((r) => r?.shortages || []);
        if (allShortages.length > 0) {
          try {
            const io = getIO();
            emitToBranch(io, created.branchId, "order:shortages", { orderId, shortages: allShortages });
          } catch {}
        }
      });
    }).catch((e) => console.error("[inventory] failed to load recipe service:", e?.message));
  }

  return created;
};

export const addItemsToOrderService = async (id, payload = {}) => {
  const { items = [] } = payload;

  if (!Array.isArray(items) || items.length === 0) {
    throw new AppError("Items list is required.", 400);
  }

  const order = await Order.findOne({ id: String(id) }).lean();
  if (!order) throw new AppError("Order not found.", 404);

  if (order.locked) {
    throw new AppError("This order is locked and cannot be modified.", 400);
  }

  if (order.editExpiresAt && new Date(order.editExpiresAt) < new Date()) {
    throw new AppError("The edit window has expired. Please ask a staff member for assistance.", 400);
  }

  const blockedStatuses = ["Preparing", "Ready", "Served", "Paid", "Cancelled", "Rejected"];
  if (blockedStatuses.includes(order.status)) {
    throw new AppError(
      order.status === "Cancelled" || order.status === "Rejected"
        ? "This order has been cancelled and cannot be modified."
        : "Your order is being prepared and can no longer be modified.",
      400,
    );
  }

  const normalizedNewItems = items
    .filter((item) => item?.name?.trim())
    .map((item) => ({
      id: item?.id ?? item?.name ?? "",
      name: String(item?.name || "").trim(),
      qty: Math.max(Number(item?.qty) || 0, 0),
      price: Math.max(Number(item?.price) || 0, 0),
    }))
    .filter((item) => item.qty > 0 && item.price > 0);

  if (normalizedNewItems.length === 0) {
    throw new AppError("No valid items to add.", 400);
  }

  const oldItems = Array.isArray(order.itemsDetail) ? order.itemsDetail : [];
  const mergedItems = [...oldItems];

  for (const newItem of normalizedNewItems) {
    const existing = mergedItems.find(
      (i) => String(i.id) === String(newItem.id),
    );
    if (existing) {
      existing.qty += newItem.qty;
    } else {
      mergedItems.push(newItem);
    }
  }

  const totalItems = mergedItems.reduce((sum, item) => sum + item.qty, 0);
  const totalPrice = mergedItems.reduce((sum, item) => sum + item.price * item.qty, 0);
  const newTotal = Number(totalPrice.toFixed(2));

  const maxExtend = new Date(Date.now() + 5 * 60 * 1000);
  const updated = await Order.findOneAndUpdate(
    { id: String(id), status: order.status },
    {
      $set: {
        itemsDetail: mergedItems,
        items: totalItems,
        total: newTotal,
        editExpiresAt: new Date(Math.min(
          (order.editExpiresAt ? new Date(order.editExpiresAt).getTime() : Date.now()) + DEFAULT_EDIT_WINDOW_MS,
          maxExtend.getTime()
        )),
      },
    },
    { new: true },
  ).lean();
  if (!updated) throw new AppError("Order was modified concurrently.", 409);

  await AuditLog.create({
    orderId: id,
    action: "order_items_added",
    description: `Items added to order ${id}`,
    previousValue: { items: oldItems.length, total: order.total },
    newValue: { items: mergedItems.length, total: newTotal },
    ip: payload.ip || "",
    sessionId: payload.sessionToken || "",
  });

  try {
    const io = getIO();
    emitToOrderAndBranch(io, updated, "order:statusChanged", updated);
    io.to(`order:${updated.id}`).emit("order:track", updated);
  } catch { }

  return updated;
};

export const updateOrderService = async (id, payload = {}) => {
  const current = await Order.findOne({ id: String(id) }).lean();
  if (!current) throw new AppError("Order not found.", 404);

  if (current.locked) {
    throw new AppError("This order is locked and cannot be modified.", 400);
  }

  const updates = {};
  const allowedFields = [
    "status", "payment", "customer", "items", "code",
  ];

  for (const field of allowedFields) {
    if (payload[field] !== undefined) updates[field] = payload[field];
  }

  if (updates.status) {
    if (!ORDER_STATUSES.includes(updates.status)) {
      throw new AppError("Invalid order status.", 400);
    }
    const allowed = VALID_TRANSITIONS[current.status];
    if (!allowed || !allowed.includes(updates.status)) {
      throw new AppError(
        `Cannot change status from "${current.status}" to "${updates.status}". Please ask a staff member for assistance.`,
        400,
      );
    }
    // Set appropriate performance timestamps
    const now = new Date();
    if (updates.status === "Preparing") {
      updates.preparedAt = now;
    } else if (updates.status === "Ready") {
      updates.readyAt = now;
    } else if (updates.status === "Served") {
      updates.servedAt = now;
    } else if (updates.status === "Paid") {
      updates.completionConfirmedAt = now;
    } else if (updates.status === "Cancelled") {
      updates.cancelledAt = now;
    } else if (updates.status === "Rejected") {
      updates.rejectedAt = now;
      updates.rejectedBy = payload.userId || null;
    }
  }

  if (updates.payment && !PAYMENT_METHODS.includes(updates.payment)) {
    throw new AppError("Invalid payment method.", 400);
  }

  if (updates.items !== undefined) {
    updates.items = Math.max(Number(updates.items) || 0, 0);
  }

  if (updates.code !== undefined) {
    updates.code = Math.max(Number(updates.code) || 0, 0);
  }

  if (Object.keys(updates).length === 0) {
    throw new AppError("No changes provided.", 400);
  }

  const updated = await Order.findOneAndUpdate(
    { id: String(id), status: current.status },
    { $set: updates },
    { new: true, runValidators: true },
  ).lean();

  if (!updated) throw new AppError("Order was modified concurrently.", 409);

  await AuditLog.create({
    user: payload.userId || null,
    orderId: id,
    action: "order_updated",
    description: `Order ${id} updated`,
    previousValue: { status: current.status, paymentStatus: current.paymentStatus },
    newValue: { status: updated.status, paymentStatus: updated.paymentStatus },
    ip: payload.ip || "",
    sessionId: payload.sessionToken || "",
  });

  try {
    const io = getIO();
    emitToOrderAndBranch(io, updated, "order:statusChanged", updated);
    io.to(`order:${updated.id}`).emit("order:track", updated);
  } catch { }

  if (updated.status === "Ready") {
    const { assignDelivery } = await import("../../delivery/service/delivery.service.js");
    assignDelivery(updated.id).catch((e) => console.error("[auto-assign]", e?.message));
  }

  return updated;
};

export const cancelOrderService = async (id, payload = {}) => {
  const order = await Order.findOne({ id: String(id) }).lean();
  if (!order) throw new AppError("Order not found.", 404);

  if (order.status === "Cancelled" || order.status === "Rejected") {
    throw new AppError("This order has already been cancelled.", 400);
  }

  if (order.status === "Completed" || order.status === "Paid") {
    throw new AppError("A completed or paid order cannot be cancelled. Please ask a staff member for assistance.", 400);
  }

  if (!payload.force && order.status === "Preparing" && !payload.isStaff) {
    throw new AppError("Your order is being prepared and can no longer be cancelled directly. Please ask a staff member for assistance.", 400);
  }

  const prevStatus = order.status;
  const updated = await Order.findOneAndUpdate(
    { id: String(id), status: order.status },
    {
      $set: {
        status: "Cancelled",
        locked: true,
        cancelledAt: new Date(),
        cancelledBy: payload.userId || null,
        ...(payload.reason ? { cancellationReason: payload.reason } : {}),
      },
    },
    { new: true },
  ).lean();
  if (!updated) throw new AppError("Order was modified concurrently.", 409);

  await AuditLog.create({
    user: payload.userId || null,
    customer: order.customer,
    tableNumber: order.tableNumber || undefined,
    orderId: id,
    action: "order_cancelled",
    description: `Order ${id} cancelled`,
    previousValue: { status: prevStatus },
    newValue: { status: "Cancelled" },
    ip: payload.ip || "",
    sessionId: payload.sessionToken || "",
  });

  try {
    const io = getIO();
    emitToOrderAndBranch(io, updated, "order:statusChanged", updated);
    io.to(`order:${updated.id}`).emit("order:track", updated);
  } catch { }

  return updated;
};

export const processPaymentService = async (id, payload = {}) => {
  const order = await Order.findOne({ id: String(id) }).lean();
  if (!order) throw new AppError("Order not found.", 404);

  if (order.paymentStatus !== "unpaid") {
    throw new AppError("Order payment already processed.", 400);
  }

  if (order.status === "Cancelled" || order.status === "Rejected") {
    throw new AppError(`Cannot process payment for a ${order.status.toLowerCase()} order.`, 400);
  }

  const payableStatuses = ["Served", "Dining", "BillRequested", "PaymentInProgress"];
  if (!payableStatuses.includes(order.status)) {
    throw new AppError("Order must be served, dining, or awaiting payment.", 400);
  }

  const prevPaymentStatus = order.paymentStatus;
  const prevStatus = order.status;

  const now = new Date();
  const updates = { paymentStatus: "paid", paidAt: now, paidBy: payload.paidBy || null, completionConfirmedAt: now };

  if (order.status !== "Paid") {
    const allowed = VALID_TRANSITIONS[order.status];
    if (allowed && allowed.includes("Paid")) {
      updates.status = "Paid";
    }
  }

  const updated = await Order.findOneAndUpdate(
    { id: String(id), status: order.status },
    { $set: updates },
    { new: true },
  ).lean();
  if (!updated) throw new AppError("Order was modified concurrently.", 409);

  await AuditLog.create({
    user: payload.userId || null,
    customer: order.customer,
    tableNumber: order.tableNumber || undefined,
    orderId: id,
    action: "payment_processed",
    description: `Payment processed for order ${id}`,
    previousValue: { paymentStatus: prevPaymentStatus, status: prevStatus },
    newValue: { paymentStatus: "paid", status: updated.status },
    ip: payload.ip || "",
  });

  try {
    const io = getIO();
    emitToOrderAndBranch(io, updated, "order:paymentReceived", updated);
    emitToOrderAndBranch(io, updated, "order:statusChanged", updated);
    io.to(`order:${updated.id}`).emit("order:track", updated);
  } catch { }

  return updated;
};

export const rejectOrderService = async (id, payload = {}) => {
  const order = await Order.findOne({ id: String(id) }).lean();
  if (!order) throw new AppError("Order not found.", 404);

  if (order.status !== "Pending") {
    throw new AppError("Only pending orders can be rejected.", 400);
  }

  const prevStatus = order.status;
  const updated = await Order.findOneAndUpdate(
    { id: String(id), status: order.status },
    {
      $set: {
        status: "Rejected",
        locked: true,
        rejectedBy: payload.userId || null,
        rejectionReason: String(payload.reason || "").trim() || "Rejected by staff",
      },
    },
    { new: true },
  ).lean();
  if (!updated) throw new AppError("Order was modified concurrently.", 409);

  await AuditLog.create({
    user: payload.userId || null,
    orderId: id,
    action: "order_rejected",
    description: `Order ${id} rejected: ${updated.rejectionReason}`,
    previousValue: { status: prevStatus },
    newValue: { status: "Rejected", reason: updated.rejectionReason },
    ip: payload.ip || "",
  });

  try {
    const io = getIO();
    emitToOrderAndBranch(io, updated, "order:statusChanged", updated);
    io.to(`order:${updated.id}`).emit("order:track", updated);
  } catch { }

  return updated;
};

export const reopenOrderService = async (id, payload = {}) => {
  const order = await Order.findOne({ id: String(id) }).lean();
  if (!order) throw new AppError("Order not found.", 404);

  if (order.status !== "Paid" && order.status !== "Cancelled") {
    throw new AppError("Only paid or cancelled orders can be reopened.", 400);
  }

  const prevStatus = order.status;
  const updated = await Order.findOneAndUpdate(
    { id: String(id), status: order.status },
    {
      $set: {
        status: "Reopened",
        isReopened: true,
        reopenedAt: new Date(),
        reopenedBy: payload.userId || null,
        reopenReason: String(payload.reason || "").trim(),
        locked: false,
        paymentStatus: "unpaid",
        paidAt: null,
        paidBy: null,
      },
    },
    { new: true },
  ).lean();
  if (!updated) throw new AppError("Order was modified concurrently.", 409);

  await AuditLog.create({
    user: payload.userId || null,
    orderId: id,
    action: "order_reopened",
    description: `Order ${id} reopened (was ${prevStatus})`,
    previousValue: { status: prevStatus },
    newValue: { status: "Reopened" },
    ip: payload.ip || "",
  });

  try {
    const io = getIO();
    emitToOrderAndBranch(io, updated, "order:statusChanged", updated);
    io.to(`order:${updated.id}`).emit("order:track", updated);
  } catch { }

  return updated;
};

export const deleteOrderPermanently = async (id) => {
  const order = await Order.findOne({ id: String(id) }).lean();
  if (!order) throw new AppError("Order not found.", 404);

  if (order.status !== "Cancelled" && order.status !== "Rejected") {
    throw new AppError("Only cancelled or rejected orders can be permanently deleted.", 400);
  }

  await Order.deleteOne({ id: String(id) });

  await AuditLog.create({
    orderId: id,
    action: "order_deleted",
    description: `Order ${id} permanently deleted`,
    previousValue: { status: order.status, total: order.total },
  });

  return { message: "Order deleted" };
};
