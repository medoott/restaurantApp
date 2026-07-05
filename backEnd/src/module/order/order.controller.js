import { asyncHandler } from "../../util/error/error.js";
import {
  addItemsToOrderService,
  createOrderService,
  getOrderById,
  getOrderStats,
  listOrders,
  updateOrderService,
  cancelOrderService,
  processPaymentService,
  rejectOrderService,
  reopenOrderService,
  deleteOrderPermanently,
} from "./service/order.service.js";

export const getOrders = asyncHandler(async (req, res) => {
  const orders = await listOrders({ ...req.query, ...req.branchScope });
  res.json(orders);
});

export const getOrdersStats = asyncHandler(async (_req, res) => {
  const stats = await getOrderStats();
  res.json(stats);
});

export const createOrder = asyncHandler(async (req, res) => {
  const guestName = req.tableSession?.customerName || `Table ${req.body.tableNumber || ""}`.trim() || "Guest";
  const body = {
    ...req.body,
    ...(!req.body.customer ? { customer: req.user?.name || guestName } : {}),
    submittedBy: req.user?._id || null,
    ip: req.ip || "",
    userAgent: req.headers["user-agent"] || "",
  };
  const order = await createOrderService(body);
  res.status(201).json({ message: "Order created", order });
});

export const updateOrder = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updated = await updateOrderService(id, {
    ...req.body,
    userId: req.user?._id,
    ip: req.ip || "",
  });
  res.json({ message: "Order updated", order: updated });
});

export const addItemsToOrder = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updated = await addItemsToOrderService(id, {
    ...req.body,
    ip: req.ip || "",
    sessionToken: req.body.sessionToken,
  });
  res.json({ message: "Order updated with new items", order: updated });
});

export const trackOrder = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const sessionToken = req.query?.sessionToken || "";
  const order = await getOrderById(id, {
    userId: req.user?._id,
    userRole: req.user?.role,
    sessionToken,
  });
  res.json({ order });
});

export const cancelOrder = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updated = await cancelOrderService(id, {
    userId: req.user?._id,
    force: req.body?.force === true,
    isStaff: ["admin", "generalManager", "branchManager", "cashier", "cook"].includes(req.user?.role),
    rejectionReason: req.body?.reason || "",
    ip: req.ip || "",
  });
  res.json({ message: "Order cancelled", order: updated });
});

export const payOrder = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updated = await processPaymentService(id, {
    paidBy: req.user?._id,
    userId: req.user?._id,
    ip: req.ip || "",
  });
  res.json({ message: "Payment processed", order: updated });
});

export const rejectOrder = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updated = await rejectOrderService(id, {
    userId: req.user?._id,
    reason: req.body?.reason || "",
    ip: req.ip || "",
  });
  res.json({ message: "Order rejected", order: updated });
});

export const reopenOrder = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updated = await reopenOrderService(id, {
    userId: req.user?._id,
    reason: req.body?.reason || "",
    ip: req.ip || "",
  });
  res.json({ message: "Order reopened", order: updated });
});

export const deleteOrder = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await deleteOrderPermanently(id);
  res.json(result);
});
