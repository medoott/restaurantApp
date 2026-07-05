import Visit, { VISIT_STATUSES } from "../../../DB/model/Visit.model.js";
import Table from "../../../DB/model/Table.model.js";
import TableSession from "../../../DB/model/TableSession.model.js";
import Reservation from "../../../DB/model/Reservation.model.js";
import CustomerProfile from "../../../DB/model/CustomerProfile.model.js";
import WaitingQueue from "../../../DB/model/WaitingQueue.model.js";
import User from "../../../DB/model/User.model.js";
import AuditLog from "../../../DB/model/AuditLog.model.js";
import { createNotification } from "../../notification/notification.service.js";
import { AppError } from "../../../util/error/AppError.js";

function generateVisitNumber() {
  const now = new Date();
  const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  const random = Math.floor(1000 + Math.random() * 9000);
  return `V-${datePart}-${random}`;
}

function findOptimalTable(tables, partySize, isVIP = false) {
  if (tables.length === 0) return null;

  if (isVIP) {
    const vipTable = tables.find((t) =>
      ["VIP", "Private Room"].includes(t.section)
    );
    if (vipTable) return vipTable;
  }

  return tables.reduce((best, t) => {
    const bestWaste = best ? best.capacity - partySize : Infinity;
    const tWaste = t.capacity - partySize;
    if (tWaste >= 0 && tWaste < bestWaste) return t;
    if (tWaste >= 0 && bestWaste === Infinity) return t;
    return best;
  });
}

async function autoAssignWaiter(tableNumber, section) {
  const waiters = await User.find({
    role: "Order Taker",
    employeeStatus: { $in: ["available", "serving"] },
    "shift.clockedIn": true,
  })
    .select("name currentTaskCount maxConcurrentTasks assignedTables employeeStatus")
    .sort({ currentTaskCount: 1, lastStatusChange: 1 })
    .lean();

  if (waiters.length === 0) return null;

  const available = waiters.filter((w) => {
    const capacity = w.maxConcurrentTasks || 5;
    return (w.currentTaskCount || 0) < capacity;
  });

  if (available.length === 0) return null;

  return available.reduce((best, w) => {
    const load = w.maxConcurrentTasks > 0
      ? (w.currentTaskCount || 0) / w.maxConcurrentTasks
      : Infinity;
    const bestLoad = best.maxConcurrentTasks > 0
      ? (best.currentTaskCount || 0) / best.maxConcurrentTasks
      : Infinity;
    const hasSectionMatch = w.assignedSections?.includes(section);
    const bestHasSectionMatch = best.assignedSections?.includes(section);
    if (hasSectionMatch && !bestHasSectionMatch) return w;
    if (!hasSectionMatch && bestHasSectionMatch) return best;
    return load < bestLoad ? w : best;
  });
}

export async function customerArrival(payload = {}) {
  const {
    name = "Guest",
    phone = "",
    email = "",
    partySize = 1,
    source = "walk_in",
    reservationId = null,
    preferredSection = "",
    notes = "",
    createdBy = null,
    branchId = null,
    branch = "",
    ip = "",
    isVIP = false,
  } = payload;

  let customerProfile = null;
  if (phone) {
    customerProfile = await CustomerProfile.findOne({ phone }).lean();
  }

  const resolvedVIP = isVIP || customerProfile?.isVIP || false;
  const resolvedMembership = customerProfile?.membershipLevel || "bronze";

  const visit = await Visit.create({
    visitNumber: generateVisitNumber(),
    source,
    status: "arrived",
    guestName: name,
    guestPhone: phone,
    email,
    guestCount: partySize,
    isVIP: resolvedVIP,
    membershipLevel: resolvedMembership,
    customerProfileId: customerProfile?._id || null,
    host: createdBy,
    arrivedAt: new Date(),
    notes,
    branch: branch || (branchId ? String(branchId) : ""),
    branchId: branchId || null,
    ip: ip || "",
  });

  const availableTables = await Table.find({
    status: "available",
    isLocked: false,
    mergedInto: null,
    capacity: { $gte: partySize },
    ...(preferredSection ? { section: preferredSection } : {}),
  }).sort({ capacity: 1 }).lean();

  const bestTable = findOptimalTable(availableTables, partySize, resolvedVIP);

  if (bestTable) {
    const result = await seatCustomer(visit._id, bestTable.tableNumber, {
      seatedBy: createdBy,
      actualGuests: partySize,
    });
    return result;
  }

  const nextPosition = await getNextQueuePosition(branchId);
  const waitEstimate = await getAverageWaitTime(branchId);

  visit.status = "waiting";
  visit.queuePosition = nextPosition;
  visit.queueEstimatedWaitMinutes = waitEstimate;
  await visit.save();

  await WaitingQueue.create({
    visitId: visit._id,
    position: nextPosition,
    partySize,
    status: "waiting",
    customer: {
      name,
      phone,
      email,
      profileId: customerProfile?._id || null,
      isVIP: resolvedVIP,
      membershipLevel: resolvedMembership,
    },
    priority: resolvedVIP ? "vip" : "regular",
    estimatedWaitMinutes: waitEstimate,
    preferences: {
      preferredSection,
      specialRequests: notes,
    },
    origin: source,
    branchId: branchId || null,
    createdBy,
  });

  await AuditLog.create({
    action: "customer_arrived_queue",
    description: `${resolvedVIP ? "VIP " : ""}${name} (${partySize}) — no tables available — queue position ${nextPosition} (est. ${waitEstimate} min)`,
    customer: name,
    tableNumber: undefined,
    ip,
  });

  return {
    visit,
    message: `Added to queue at position ${nextPosition}. Estimated wait: ${waitEstimate} minutes.`,
    queuePosition: nextPosition,
    estimatedWaitMinutes: waitEstimate,
  };
}

async function getNextQueuePosition(branchId) {
  const filter = { status: "waiting" };
  if (branchId) filter.branchId = branchId;
  const last = await WaitingQueue.findOne(filter).sort({ position: -1 }).lean();
  return last ? last.position + 1 : 1;
}

async function getAverageWaitTime(branchId) {
  const now = new Date();
  const oneHourAgo = new Date(now - 3600000);

  const filter = { status: "seated", checkedInAt: { $gte: oneHourAgo } };
  if (branchId) filter.branchId = branchId;

  const recent = await WaitingQueue.find(filter).lean();
  if (recent.length === 0) return 10;

  const waitTimes = recent
    .filter((r) => r.actualWaitMinutes > 0)
    .map((r) => r.actualWaitMinutes);

  return waitTimes.length > 0
    ? Math.round(waitTimes.reduce((a, b) => a + b, 0) / waitTimes.length)
    : 10;
}

export async function seatCustomer(visitId, tableNumber, options = {}) {
  const { seatedBy, actualGuests } = options;

  const visit = await Visit.findById(visitId);
  if (!visit) throw new AppError("Visit not found", 404);
  if (["closed", "cancelled"].includes(visit.status)) {
    throw new AppError("Visit is already closed", 400);
  }

  const table = await Table.findOne({ tableNumber: Number(tableNumber) });
  if (!table) throw new AppError("Table not found", 404);
  if (table.status !== "available") {
    throw new AppError(`Table ${tableNumber} is not available (${table.status})`, 400);
  }
  if (table.isLocked) throw new AppError("Table is locked", 400);

  const now = new Date();

  const session = await TableSession.create({
    table: table._id,
    sessionToken: `tab-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`,
    status: "active",
    startedAt: now,
    lastActivityAt: now,
    expiresAt: new Date(now.getTime() + 4 * 60 * 60 * 1000),
    customerName: visit.guestName,
    customerPhone: visit.guestPhone,
    ip: visit.ip || "",
  });

  const waiter = await autoAssignWaiter(tableNumber, table.section);

  table.status = "occupied";
  table.currentSession = session._id;
  table.currentVisit = visit._id;
  if (waiter) {
    table.assignedWaiter = waiter._id;
    if (!table.assignedWaiters?.some((w) => w.toString() === waiter._id.toString())) {
      table.assignedWaiters = [...(table.assignedWaiters || []), waiter._id];
    }
  }
  await table.save();

  visit.status = "seated";
  visit.table = table._id;
  visit.tableNumber = tableNumber;
  visit.tableSection = table.section;
  visit.session = session._id;
  visit.sessionToken = session.sessionToken;
  visit.waiter = waiter?._id || visit.waiter;
  visit.guestCount = actualGuests || visit.guestCount;
  visit.seatedAt = now;
  await visit.save();

  if (visit.queueEntry) {
    await WaitingQueue.findOneAndUpdate(
      { _id: visit.queueEntry },
      {
        $set: {
          status: "seated",
          seatedAt: now,
          seatedBy,
          assignedTable: table._id,
          assignedTableNumber: tableNumber,
        },
      },
    );
  }

  if (visit.reservation) {
    await Reservation.findByIdAndUpdate(visit.reservation, {
      $set: { status: "seated" },
    });
  }

  if (waiter) {
    waiter.employeeStatus = "serving";
    waiter.currentTaskCount = (waiter.currentTaskCount || 0) + 1;
    if (!waiter.assignedTables?.includes(tableNumber)) {
      waiter.assignedTables = [...(waiter.assignedTables || []), tableNumber];
    }
    await waiter.save();
  }

  if (customerProfile) {
    await CustomerProfile.findByIdAndUpdate(visit.customerProfileId, {
      $inc: { totalVisits: 1 },
      $set: { lastVisitDate: now },
    });
  }

  await createNotification({
    type: "customer_seated",
    title: "Customer Seated",
    message: `${visit.guestName} (${visit.guestCount}) at Table ${tableNumber}`,
    priority: "medium",
    recipientId: waiter?._id || null,
    roleTarget: waiter ? null : "Order Taker",
    metadata: { tableNumber, visitId: visit._id.toString(), guestCount: visit.guestCount },
  });

  await AuditLog.create({
    action: "customer_seated",
    description: `${visit.guestName} seated at Table ${tableNumber} (${visit.guestCount} guests), section ${table.section}${waiter ? `, waiter: ${waiter.name}` : ""}`,
    tableNumber,
    newValue: { tableNumber, guestCount: visit.guestCount, waiterId: waiter?._id || null },
    ip: visit.ip || "",
  });

  return {
    visit,
    table,
    session,
    waiter,
    message: `Seated at Table ${tableNumber}${waiter ? `. ${waiter.name} is your waiter.` : "."}`,
  };
}

export async function getQueueStatus(branchId = null) {
  const filter = { status: { $in: ["waiting", "notified"] } };
  if (branchId) filter.branchId = branchId;

  const queue = await WaitingQueue.find(filter)
    .sort({ priority: 1, position: 1 })
    .lean();

  const waitEstimate = await WaitingQueue.getEstimatedWait?.(branchId) || { averageWaitMinutes: 10, partiesAhead: queue.length };

  return {
    queue,
    totalWaiting: queue.length,
    waitEstimate,
  };
}

export async function notifyCustomerFromQueue(queueId, userId) {
  const entry = await WaitingQueue.findById(queueId);
  if (!entry) throw new AppError("Queue entry not found", 404);
  if (entry.status !== "waiting") throw new AppError("Customer is no longer waiting", 400);

  const now = new Date();
  const waitMs = now - new Date(entry.checkedInAt || entry.createdAt);
  const actualWait = Math.round(waitMs / 60000);

  entry.status = "notified";
  entry.notifiedAt = now;
  entry.actualWaitMinutes = actualWait;
  entry.notificationSent = true;
  await entry.save();

  await Visit.findByIdAndUpdate(entry.visitId, {
    $set: { status: "arrived" },
  });

  await AuditLog.create({
    action: "customer_notified",
    description: `${entry.customer?.name} notified (table ready) after ${actualWait} min wait`,
    tableNumber: entry.assignedTableNumber || undefined,
  });

  return entry;
}

export async function cancelWaiting(queueId, reason = "", userId) {
  const entry = await WaitingQueue.findById(queueId);
  if (!entry) throw new AppError("Queue entry not found", 404);

  entry.status = "cancelled";
  entry.cancelledAt = new Date();
  entry.cancellationReason = reason;
  await entry.save();

  await Visit.findByIdAndUpdate(entry.visitId, {
    $set: { status: "cancelled", cancellationReason: reason },
  });

  return entry;
}

export async function getHostDashboard(branchId = null) {
  const filter = branchId ? { branchId } : {};
  const tableFilter = branchId ? { branch: String(branchId) } : {};

  const [availableTables, occupiedTables, cleaningTables, waitingCount, todayVisits] = await Promise.all([
    Table.countDocuments({ status: "available", isLocked: false, mergedInto: null }),
    Table.countDocuments({ status: { $in: ["occupied", "dining", "ordering", "serving"] } }),
    Table.countDocuments({ status: { $in: ["needs_cleaning", "cleaning_in_progress"] } }),
    WaitingQueue.countDocuments({ status: { $in: ["waiting", "notified"] } }),
    Visit.countDocuments({
      createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) },
    }),
  ]);

  const queue = await getQueueStatus(branchId);

  const upcomingReservations = await Reservation.find({
    status: { $in: ["confirmed", "pending"] },
    reservationDate: {
      $gte: new Date(),
      $lte: new Date(Date.now() + 4 * 60 * 60 * 1000),
    },
  })
    .sort({ reservationTime: 1 })
    .limit(10)
    .lean();

  return {
    availableTables,
    occupiedTables,
    cleaningTables,
    waitingCustomers: waitingCount,
    todayVisits,
    queue,
    upcomingReservations,
  };
}
