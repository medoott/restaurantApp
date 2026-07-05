import Visit from "../../../DB/model/Visit.model.js";
import Table from "../../../DB/model/Table.model.js";
import GuestQueue from "../../../DB/model/GuestQueue.model.js";
import TableSession from "../../../DB/model/TableSession.model.js";
import Order from "../../../DB/model/Order.model.js";
import AuditLog from "../../../DB/model/AuditLog.model.js";
import Notification from "../../../DB/model/Notification.model.js";
import User from "../../../DB/model/User.model.js";
import { AppError } from "../../../util/error/AppError.js";
import { getIO } from "../../../config/socket.js";

function generateVisitNumber() {
  const now = new Date();
  const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  const random = Math.floor(1000 + Math.random() * 9000);
  return `V-${datePart}-${random}`;
}

const findBestWaiter = async (section) => {
  const waiters = await User.find({
    role: "Order Taker",
    employeeStatus: { $in: ["available", "serving"] },
  }).sort({ currentTaskCount: 1, lastStatusChange: 1 }).limit(1);

  return waiters.length > 0 ? waiters[0] : null;
};

export const createWalkInVisit = async ({ guestName, guestPhone, guestCount, notes, branch } = {}) => {
  const visit = await Visit.create({
    visitNumber: generateVisitNumber(),
    source: "walk_in",
    status: "waiting",
    guestName: guestName || "Guest",
    guestPhone: guestPhone || "",
    guestCount: guestCount || 1,
    notes: notes || "",
    branch: branch || "",
  });

  const socket = getIO();
  if (socket) socket.emit("visit:created", { visitId: visit._id, visitNumber: visit.visitNumber });

  return visit;
};

export const createReservationVisit = async (reservation) => {
  const visit = await Visit.create({
    visitNumber: generateVisitNumber(),
    source: "reservation",
    status: "waiting",
    guestName: reservation.customerName,
    guestPhone: reservation.phoneNumber,
    guestCount: reservation.partySize,
    reservation: reservation._id,
    table: reservation.table || null,
    tableNumber: reservation.tableNumber || null,
    branch: reservation.branch || "",
    notes: reservation.notes || "",
  });

  const socket = getIO();
  if (socket) socket.emit("visit:created", { visitId: visit._id, visitNumber: visit.visitNumber });

  return visit;
};

export const seatVisit = async (visitId, { tableId, tableNumber, guestCount } = {}) => {
  const visit = await Visit.findById(visitId);
  if (!visit) throw new AppError("Visit not found", 404);
  if (visit.status !== "waiting") throw new AppError("Visit is not in waiting status", 400);

  let table;
  if (tableId) {
    table = await Table.findById(tableId);
  } else if (tableNumber) {
    table = await Table.findOne({ tableNumber });
  }
  if (!table) throw new AppError("Table not found", 404);
  if (table.status !== "available") throw new AppError("Table is not available", 409);
  if (table.isLocked) throw new AppError("Table is locked", 409);

  const waiter = await findBestWaiter(table.section);

  const guestCountFinal = guestCount || visit.guestCount;

  const sessionToken = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const session = await TableSession.create({
    table: table._id,
    sessionToken,
    status: "active",
    startedAt: new Date(),
    lastActivityAt: new Date(),
    expiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000),
    customerName: visit.guestName,
  });

  table.status = "occupied";
  table.currentSession = session._id;
  await table.save();

  visit.status = "seated";
  visit.table = table._id;
  visit.tableNumber = table.tableNumber;
  visit.tableSection = table.section;
  visit.waiter = waiter ? waiter._id : visit.waiter;
  visit.session = session._id;
  visit.guestCount = guestCountFinal;
  visit.seatedAt = new Date();
  await visit.save();

  if (waiter) {
    waiter.employeeStatus = "serving";
    waiter.currentTaskCount = (waiter.currentTaskCount || 0) + 1;
    await waiter.save();
  }

  await AuditLog.create({
    action: "visit_seated",
    module: "visit",
    performedBy: null,
    targetId: visit._id,
    details: { visitNumber: visit.visitNumber, tableNumber: table.tableNumber, waiter: waiter?.name },
  });

  const socket = getIO();
  if (socket) {
    socket.emit("table:statusChanged", { tableId: table._id, tableNumber: table.tableNumber, status: "occupied" });
    socket.emit("visit:seated", { visitId: visit._id, visitNumber: visit.visitNumber, tableNumber: table.tableNumber });
  }

  if (waiter && socket) {
    socket.emit(`notification:${waiter._id}`, {
      type: "table_assigned",
      title: "New Table Assigned",
      message: `Table #${table.tableNumber} — ${visit.guestName} (${guestCountFinal} guests)`,
    });
  }

  return visit.populate(["table", "waiter", "session"]);
};

export const linkOrderToVisit = async (orderId) => {
  const order = await Order.findById(orderId);
  if (!order) throw new AppError("Order not found", 404);

  let visit;
  if (order.tableSession) {
    visit = await Visit.findOne({ session: order.tableSession, status: { $in: ["seated", "dining"] } });
  }
  if (!visit && order.tableNumber) {
    visit = await Visit.findOne({ tableNumber: order.tableNumber, status: { $in: ["seated", "dining"] } });
  }

  if (visit) {
    if (!visit.orders.includes(order._id)) {
      visit.orders.push(order._id);
      visit.totalOrders = visit.orders.length;
      visit.totalSpent = (visit.totalSpent || 0) + (order.total || 0);
      if (!visit.firstOrderAt) visit.firstOrderAt = new Date();
      if (visit.status === "seated") visit.status = "dining";
      await visit.save();
    }
    return visit.populate(["table", "waiter"]);
  }
  return null;
};

export const updateVisitOnOrder = async (order) => {
  return linkOrderToVisit(order._id || order);
};

export const requestBill = async (visitId) => {
  const visit = await Visit.findById(visitId).populate(["table", "waiter", "orders"]);
  if (!visit) throw new AppError("Visit not found", 404);
  if (!["seated", "dining"].includes(visit.status)) throw new AppError("Visit cannot request bill", 400);

  visit.status = "bill_requested";
  visit.billRequestedAt = new Date();
  await visit.save();

  if (visit.table) {
    visit.table.status = "waiting_for_bill";
    await visit.table.save();
  }

  if (visit.waiter) {
    const socket = getIO();
    if (socket) {
      socket.emit(`notification:${visit.waiter._id}`, {
        type: "bill_request",
        title: "Bill Requested",
        message: `Table #${visit.tableNumber} — ${visit.guestName} has requested the bill. Total: $${visit.totalSpent.toFixed(2)}`,
        priority: "high",
        metadata: { visitId: visit._id, tableNumber: visit.tableNumber },
      });
    }
  }

  await AuditLog.create({
    action: "bill_requested",
    module: "visit",
    targetId: visit._id,
    details: { visitNumber: visit.visitNumber, tableNumber: visit.tableNumber, total: visit.totalSpent },
  });

  return visit;
};

export const completePayment = async (visitId, { paidAmount, paymentMethod, processedBy } = {}) => {
  const visit = await Visit.findById(visitId).populate(["table"]);
  if (!visit) throw new AppError("Visit not found", 404);
  if (visit.status !== "bill_requested") throw new AppError("Visit has not requested bill", 400);

  const orders = await Order.find({ visitId: visit._id, paymentStatus: "unpaid" });
  let totalPaid = 0;
  for (const order of orders) {
    order.paymentStatus = "paid";
    order.status = "Paid";
    order.paidAt = new Date();
    order.paidBy = processedBy || null;
    await order.save();
    totalPaid += order.total || 0;
  }

  visit.status = "payment";
  visit.totalSpent = (visit.totalSpent || 0) + totalPaid;
  await visit.save();

  return visit;
};

export const closeVisit = async (visitId, { closedBy } = {}) => {
  const visit = await Visit.findById(visitId).populate(["table", "session"]);
  if (!visit) throw new AppError("Visit not found", 404);
  if (visit.status === "closed") throw new AppError("Visit already closed", 400);

  const unpaidOrders = await Order.countDocuments({ visitId: visit._id, paymentStatus: { $ne: "paid" } });
  if (unpaidOrders > 0) {
    throw new AppError(`Cannot close visit: ${unpaidOrders} order(s) with pending payment.`, 400);
  }

  const table = visit.table;
  if (table) {
    table.status = "needs_cleaning";
    table.currentSession = null;
    await table.save();
  }

  if (visit.session) {
    visit.session.status = "closed";
    visit.session.closedAt = new Date();
    visit.session.closedBy = closedBy || null;
    await visit.session.save();
  }

  visit.status = "closed";
  visit.closedAt = new Date();
  visit.closedBy = closedBy || null;
  await visit.save();

  const waiter = visit.waiter ? await User.findById(visit.waiter) : null;
  if (waiter) {
    waiter.currentTaskCount = Math.max(0, (waiter.currentTaskCount || 0) - 1);
    if (waiter.currentTaskCount === 0) waiter.employeeStatus = "available";
    await waiter.save();
  }

  await AuditLog.create({
    action: "visit_closed",
    module: "visit",
    performedBy: closedBy,
    targetId: visit._id,
    details: { visitNumber: visit.visitNumber, tableNumber: visit.tableNumber, totalSpent: visit.totalSpent, duration: visit.closedAt && visit.seatedAt ? Math.round((visit.closedAt - visit.seatedAt) / 60000) : 0 },
  });

  const socket = getIO();
  if (socket) {
    socket.emit("table:statusChanged", { tableId: table?._id, tableNumber: table?.tableNumber, status: "needs_cleaning" });
    socket.emit("visit:closed", { visitId: visit._id, visitNumber: visit.visitNumber });
    socket.emit("session:closed", { sessionId: visit.session?._id, tableNumber: visit.tableNumber });
  }

  return visit;
};

export const abandonVisit = async (visitId, { abandonedBy, reason = "customer_left" } = {}) => {
  const visit = await Visit.findById(visitId).populate(["table", "session"]);
  if (!visit) throw new AppError("Visit not found", 404);
  if (visit.status === "closed") throw new AppError("Visit already closed", 400);

  const orders = await Order.find({ visitId: visit._id, status: { $nin: ["Cancelled", "Paid", "Cleaning"] } });
  for (const order of orders) {
    order.status = "Cancelled";
    order.cancellationReason = "customer_left";
    order.paymentStatus = "unpaid";
    await order.save();
  }

  const table = visit.table;
  if (table) {
    table.status = "needs_cleaning";
    table.currentSession = null;
    await table.save();
  }

  if (visit.session) {
    visit.session.status = "closed";
    visit.session.closedAt = new Date();
    visit.session.closedBy = abandonedBy || null;
    await visit.session.save();
  }

  visit.status = "closed";
  visit.closedAt = new Date();
  visit.closedBy = abandonedBy || null;
  visit.notes = `Abandoned — ${reason}`;
  visit.paymentStatus = "unpaid";
  await visit.save();

  const waiter = visit.waiter ? await User.findById(visit.waiter) : null;
  if (waiter) {
    waiter.currentTaskCount = Math.max(0, (waiter.currentTaskCount || 0) - 1);
    if (waiter.currentTaskCount === 0) waiter.employeeStatus = "available";
    await waiter.save();
  }

  await AuditLog.create({
    action: "visit_abandoned",
    module: "visit",
    performedBy: abandonedBy,
    targetId: visit._id,
    details: { visitNumber: visit.visitNumber, tableNumber: visit.tableNumber, reason, totalSpent: visit.totalSpent },
  });

  const socket = getIO();
  if (socket) {
    socket.emit("table:statusChanged", { tableId: table?._id, tableNumber: table?.tableNumber, status: "needs_cleaning" });
    socket.emit("visit:closed", { visitId: visit._id, visitNumber: visit.visitNumber });
    socket.emit("session:closed", { sessionId: visit.session?._id, tableNumber: visit.tableNumber });
  }

  return visit;
};

export const getActiveVisitByTable = async (tableNumber) => {
  return Visit.findOne({
    tableNumber,
    status: { $in: ["seated", "dining", "bill_requested", "payment"] },
  }).populate(["table", "waiter", "session", "orders"]);
};

export const getActiveVisitBySession = async (sessionId) => {
  return Visit.findOne({
    session: sessionId,
    status: { $in: ["seated", "dining", "bill_requested", "payment"] },
  }).populate(["table", "waiter", "session", "orders"]);
};

export const getActiveVisits = async ({ branch } = {}) => {
  const filter = { status: { $in: ["waiting", "seated", "dining", "bill_requested", "payment"] } };
  if (branch) filter.branch = branch;
  return Visit.find(filter).populate(["table", "waiter"]).sort({ createdAt: -1 });
};

export const getVisitHistory = async ({ limit = 50, skip = 0, branch } = {}) => {
  const filter = { status: "closed" };
  if (branch) filter.branch = branch;
  return Visit.find(filter)
    .populate(["table", "waiter"])
    .sort({ closedAt: -1 })
    .skip(skip)
    .limit(limit);
};

export const getVisitAnalytics = async ({ period = "daily" } = {}) => {
  const now = new Date();
  let start;
  if (period === "daily") start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  else if (period === "weekly") start = new Date(now.setDate(now.getDate() - 7));
  else if (period === "monthly") start = new Date(now.getFullYear(), now.getMonth(), 1);
  else start = new Date(now.getFullYear(), 0, 1);

  const visits = await Visit.find({ createdAt: { $gte: start } });
  const closedVisits = visits.filter(v => v.status === "closed");
  const avgDuration = closedVisits.length > 0
    ? closedVisits.reduce((sum, v) => sum + (v.closedAt && v.seatedAt ? (v.closedAt - v.seatedAt) : 0), 0) / closedVisits.length
    : 0;

  return {
    totalVisits: visits.length,
    closedVisits: closedVisits.length,
    activeVisits: visits.filter(v => v.status !== "closed").length,
    totalRevenue: closedVisits.reduce((sum, v) => sum + (v.totalSpent || 0), 0),
    avgVisitDurationMinutes: Math.round(avgDuration / 60000),
    avgPartySize: visits.length > 0 ? visits.reduce((sum, v) => sum + (v.guestCount || 1), 0) / visits.length : 0,
    bySource: {
      walkIn: visits.filter(v => v.source === "walk_in").length,
      reservation: visits.filter(v => v.source === "reservation").length,
    },
  };
};

export const transferVisitTable = async (visitId, newTableId) => {
  const visit = await Visit.findById(visitId).populate(["table", "session"]);
  if (!visit) throw new AppError("Visit not found", 404);

  const newTable = await Table.findById(newTableId);
  if (!newTable) throw new AppError("New table not found", 404);
  if (newTable.status !== "available") throw new AppError("New table is not available", 409);
  if (newTable.isLocked) throw new AppError("New table is locked", 409);

  const oldTable = visit.table;
  if (oldTable) {
    oldTable.status = "available";
    oldTable.currentSession = null;
    await oldTable.save();
  }

  newTable.status = "occupied";
  newTable.currentSession = visit.session?._id || null;
  await newTable.save();

  if (visit.session) {
    visit.session.table = newTable._id;
    await visit.session.save();
  }

  const oldTableNumber = visit.tableNumber;
  visit.table = newTable._id;
  visit.tableNumber = newTable.tableNumber;
  visit.tableSection = newTable.section;
  await visit.save();

  await Order.updateMany(
    { tableNumber: oldTableNumber, status: { $nin: ["Cancelled", "Paid", "Cleaning"] } },
    { tableNumber: newTable.tableNumber, tableId: String(newTable._id) },
  );

  await AuditLog.create({
    action: "visit_table_transferred",
    module: "visit",
    targetId: visit._id,
    details: { visitNumber: visit.visitNumber, fromTable: oldTableNumber, toTable: newTable.tableNumber },
  });

  const socket = getIO();
  if (socket) {
    socket.emit("table:statusChanged", { tableId: oldTable?._id, tableNumber: oldTableNumber, status: "available" });
    socket.emit("table:statusChanged", { tableId: newTable._id, tableNumber: newTable.tableNumber, status: "occupied" });
  }

  return visit.populate(["table", "waiter"]);
};
