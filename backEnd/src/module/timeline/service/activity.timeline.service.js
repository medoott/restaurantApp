import Order from "../../../DB/model/Order.model.js";
import AuditLog from "../../../DB/model/AuditLog.model.js";
import TableSession from "../../../DB/model/TableSession.model.js";
import { AppError } from "../../../util/error/AppError.js";

const TIMELINE_EVENTS = {
  order_created: { icon: "shopping-cart", label: "Order Created", color: "blue" },
  order_accepted: { icon: "check", label: "Kitchen Accepted", color: "indigo" },
  preparing: { icon: "cook", label: "Preparing", color: "amber" },
  ready: { icon: "check-circle", label: "Ready", color: "emerald" },
  ready_for_pickup: { icon: "package", label: "Ready for Pickup", color: "emerald" },
  being_delivered: { icon: "walk", label: "Being Delivered", color: "teal" },
  served: { icon: "utensils", label: "Served", color: "green" },
  dining: { icon: "coffee", label: "Dining", color: "blue" },
  bill_requested: { icon: "receipt", label: "Bill Requested", color: "purple" },
  payment_in_progress: { icon: "credit-card", label: "Payment In Progress", color: "violet" },
  paid: { icon: "check", label: "Payment Completed", color: "emerald" },
  cleaning: { icon: "spray-can", label: "Table Cleaning", color: "slate" },
  cancelled: { icon: "x", label: "Cancelled", color: "red" },
  rejected: { icon: "x-circle", label: "Rejected", color: "red" },
  items_added: { icon: "plus", label: "Items Added", color: "blue" },
  order_modified: { icon: "edit", label: "Order Modified", color: "amber" },
  assigned_waiter: { icon: "user-check", label: "Waiter Assigned", color: "indigo" },
  payment_received: { icon: "dollar-sign", label: "Payment Received", color: "emerald" },
  table_closed: { icon: "door-closed", label: "Table Closed", color: "slate" },
};

const AUDIT_ACTION_EVENT_MAP = {
  order_created: "order_created",
  order_accepted: "order_accepted",
  preparing: "preparing",
  ready: "ready",
  ready_for_pickup: "ready_for_pickup",
  being_delivered: "being_delivered",
  served: "served",
  dining: "dining",
  bill_requested: "bill_requested",
  payment_in_progress: "payment_in_progress",
  paid: "paid",
  cleaning: "cleaning",
  cancelled: "cancelled",
  rejected: "rejected",
  items_added: "items_added",
  order_modified: "order_modified",
  assigned_waiter: "assigned_waiter",
  payment_received: "payment_received",
  table_closed: "table_closed",
};

const STATUS_TIMESTAMP_FIELDS = [
  { field: "acceptedAt", event: "order_accepted", userField: "acceptedBy", notes: (o) => "Order accepted by kitchen" },
  { field: "preparedAt", event: "preparing", notes: () => "Preparation started" },
  { field: "readyAt", event: "ready", notes: () => "Order is ready" },
  { field: "pickedUpAt", event: "ready_for_pickup", notes: () => "Order picked up for delivery" },
  { field: "deliveredAt", event: "being_delivered", notes: () => "Order is being delivered" },
  { field: "servedAt", event: "served", notes: () => "Order served to customer" },
  { field: "completionConfirmedAt", event: "dining", notes: () => "Customer confirmed completion" },
  { field: "billRequestedAt", event: "bill_requested", notes: () => "Bill requested" },
  { field: "paymentStartedAt", event: "payment_in_progress", notes: () => "Payment process started" },
  { field: "paidAt", event: "paid", userField: "paidBy", notes: () => "Payment completed" },
  { field: "cancelledAt", event: "cancelled", notes: (o) => o.cancellationReason ? `Cancelled: ${o.cancellationReason}` : "Order cancelled" },
  { field: "rejectedAt", event: "rejected", userField: "rejectedBy", notes: (o) => o.rejectionReason ? `Rejected: ${o.rejectionReason}` : "Order rejected" },
];

const buildEvent = (event, timestamp, { user, role, notes } = {}) => {
  const def = TIMELINE_EVENTS[event];
  return {
    timestamp,
    event,
    label: def?.label || event,
    icon: def?.icon || "circle",
    color: def?.color || "gray",
    user: user ?? null,
    role: role ?? null,
    notes: notes ?? "",
  };
};

const resolveUser = (userDoc) => {
  if (!userDoc) return null;
  if (userDoc._id) {
    return { _id: userDoc._id, name: userDoc.name, role: userDoc.role };
  }
  return userDoc;
};

export const getOrderTimeline = async (orderId) => {
  const order = await Order.findOne({ id: orderId })
    .populate("submittedBy", "name role")
    .populate("acceptedBy", "name role")
    .populate("rejectedBy", "name role")
    .populate("paidBy", "name role")
    .populate("assignedWaiter", "name role");

  if (!order) {
    throw new AppError("Order not found", 404);
  }

  const events = [];

  if (order.createdAt) {
    events.push(buildEvent("order_created", order.createdAt, {
      user: resolveUser(order.submittedBy),
      notes: `Order #${order.code || orderId} created`,
    }));
  }

  for (const { field, event, userField, notes } of STATUS_TIMESTAMP_FIELDS) {
    const ts = order[field];
    if (!ts) continue;
    const user = userField ? resolveUser(order[userField]) : null;
    events.push(buildEvent(event, ts, { user, notes: notes(order) }));
  }

  const auditLogs = await AuditLog.find({ orderId })
    .sort({ createdAt: 1 })
    .populate("user", "name role");

  for (const log of auditLogs) {
    const eventKey = AUDIT_ACTION_EVENT_MAP[log.action] || log.action;
    events.push(buildEvent(eventKey, log.createdAt, {
      user: resolveUser(log.user) || (log.userName ? { name: log.userName } : null),
      role: log.userRole,
      notes: log.description,
    }));
  }

  if (order.tableSession) {
    const session = await TableSession.findById(order.tableSession).populate("closedBy", "name role");
    if (session?.closedAt) {
      events.push(buildEvent("table_closed", session.closedAt, {
        user: resolveUser(session.closedBy),
        notes: `Table ${order.tableNumber || ""} session closed`,
      }));
    }
  }

  events.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  return events;
};

export const getOrderTimelineEvents = async () => {
  return TIMELINE_EVENTS;
};
