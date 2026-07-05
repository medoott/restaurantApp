import GuestQueue from "../../../DB/model/GuestQueue.model.js";
import Table from "../../../DB/model/Table.model.js";
import Visit from "../../../DB/model/Visit.model.js";
import AuditLog from "../../../DB/model/AuditLog.model.js";
import Notification from "../../../DB/model/Notification.model.js";
import { AppError } from "../../../util/error/AppError.js";
import { getIO } from "../../../config/socket.js";
import { createWalkInVisit, seatVisit } from "./visit.service.js";

const getNextQueueNumber = async (branch = "") => {
  const filter = branch ? { branch } : {};
  const last = await GuestQueue.findOne(filter).sort({ createdAt: -1 });
  return last ? last.queueNumber + 1 : 1;
};

const estimateWaitTime = async (partySize, section = "") => {
  const tableFilter = { status: "available", capacity: { $gte: partySize } };
  if (section) tableFilter.section = section;
  const availableTables = await Table.countDocuments(tableFilter);
  if (availableTables > 0) return 0;

  const aheadInQueue = await GuestQueue.countDocuments({ status: "waiting" });
  const avgTurnoverMinutes = 45;
  return aheadInQueue * avgTurnoverMinutes;
};

export const addToQueue = async ({ guestName, guestPhone, partySize, requestedSection, notes, branch, source } = {}) => {
  const queueNumber = await getNextQueueNumber(branch);
  const estimatedWaitMinutes = await estimateWaitTime(partySize, requestedSection);

  const entry = await GuestQueue.create({
    queueNumber,
    guestName: guestName || "Guest",
    guestPhone: guestPhone || "",
    partySize: partySize || 1,
    status: "waiting",
    source: source || "walk_in",
    requestedSection: requestedSection || "",
    estimatedWaitMinutes,
    notes: notes || "",
    branch: branch || "",
  });

  const socket = getIO();
  if (socket) {
    socket.emit("queue:updated", { action: "added", entry });
    socket.emit("queue:estimatedWait", { queueNumber, estimatedWaitMinutes });
  }

  return entry;
};

export const callFromQueue = async (queueId) => {
  const entry = await GuestQueue.findById(queueId);
  if (!entry) throw new AppError("Queue entry not found", 404);
  if (entry.status !== "waiting") throw new AppError("Entry is not waiting", 400);

  entry.status = "called";
  entry.calledAt = new Date();
  await entry.save();

  const socket = getIO();
  if (socket) {
    socket.emit("queue:updated", { action: "called", entry });
  }

  return entry;
};

export const seatFromQueue = async (queueId, { tableId, tableNumber, guestCount } = {}) => {
  const entry = await GuestQueue.findById(queueId);
  if (!entry) throw new AppError("Queue entry not found", 404);
  if (!["waiting", "called"].includes(entry.status)) throw new AppError("Entry cannot be seated", 400);

  let table;
  if (tableId) {
    table = await Table.findById(tableId);
  } else if (tableNumber) {
    table = await Table.findOne({ tableNumber });
  }
  if (!table) throw new AppError("Table not found", 404);
  if (table.status !== "available") throw new AppError("Table is not available", 409);

  const visit = await createWalkInVisit({
    guestName: entry.guestName,
    guestPhone: entry.guestPhone,
    guestCount: guestCount || entry.partySize,
    notes: entry.notes,
    branch: entry.branch,
  });

  const seatedVisit = await seatVisit(visit._id, { tableId: table._id, guestCount: guestCount || entry.partySize });

  entry.status = "seated";
  entry.visit = visit._id;
  entry.seatedAtTable = table._id;
  entry.seatedAt = new Date();
  entry.actualWaitMinutes = entry.calledAt
    ? Math.round((entry.seatedAt - entry.calledAt) / 60000)
    : Math.round((entry.seatedAt - entry.createdAt) / 60000);
  await entry.save();

  await AuditLog.create({
    action: "queue_seated",
    module: "guest_queue",
    targetId: entry._id,
    details: { queueNumber: entry.queueNumber, guestName: entry.guestName, tableNumber: table.tableNumber },
  });

  return { queue: entry, visit: seatedVisit };
};

export const cancelFromQueue = async (queueId, reason = "") => {
  const entry = await GuestQueue.findById(queueId);
  if (!entry) throw new AppError("Queue entry not found", 404);
  if (!["waiting", "called"].includes(entry.status)) throw new AppError("Entry cannot be cancelled", 400);

  entry.status = "cancelled";
  entry.cancelledAt = new Date();
  entry.cancelledReason = reason;
  await entry.save();

  const socket = getIO();
  if (socket) socket.emit("queue:updated", { action: "cancelled", entry });

  return entry;
};

export const getQueueStatus = async ({ branch } = {}) => {
  const filter = { status: "waiting" };
  if (branch) filter.branch = branch;

  const waiting = await GuestQueue.find(filter).sort({ createdAt: 1 });
  const called = await GuestQueue.find({ status: "called", ...(branch ? { branch } : {}) }).sort({ calledAt: 1 });
  const seatedToday = await GuestQueue.find({
    status: "seated",
    seatedAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) },
    ...(branch ? { branch } : {}),
  }).sort({ seatedAt: -1 }).limit(20);

  const availableTables = await Table.find({ status: "available", isLocked: false }).countDocuments();

  const avgWaitMinutes = waiting.length > 0
    ? waiting.reduce((sum, w) => sum + (w.estimatedWaitMinutes || 0), 0) / waiting.length
    : 0;

  return {
    waiting,
    called,
    seatedToday,
    waitingCount: waiting.length,
    calledCount: called.length,
    availableTables,
    avgEstimatedWaitMinutes: Math.round(avgWaitMinutes),
  };
};
