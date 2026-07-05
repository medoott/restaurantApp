import mongoose from "mongoose";
import Reservation, { RESERVATION_STATUSES } from "../../../DB/model/Reservation.model.js";
import Table from "../../../DB/model/Table.model.js";
import TableSession from "../../../DB/model/TableSession.model.js";
import { AppError } from "../../../util/error/AppError.js";
import { escapeRegExp } from "../../../util/string/escape-regexp.js";
import { randomUUID } from "node:crypto";

const RESERVATION_PREFIX = "RES-";
const SESSION_DURATION_MS = 45 * 60 * 1000;

export const generateReservationId = () => {
  return `${RESERVATION_PREFIX}${Date.now()}-${Math.floor(Math.random() * 1000)}`;
};

export const listReservations = async (query = {}) => {
  const { date, status, search, page = 1, limit = 20 } = query;
  const filter = {};

  if (date) {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    filter.reservationDate = { $gte: start, $lte: end };
  }

  if (status) {
    if (!RESERVATION_STATUSES.includes(status)) {
      throw new AppError(`Invalid status: ${status}`, 400);
    }
    filter.status = status;
  }

  if (search) {
    const escaped = escapeRegExp(search);
    filter.$or = [
      { customerName: { $regex: escaped, $options: "i" } },
      { phoneNumber: { $regex: escaped, $options: "i" } },
    ];
  }

  const skip = (Math.max(1, Number(page)) - 1) * Math.min(Math.max(1, Number(limit)), 100);
  const pageLimit = Math.min(Math.max(1, Number(limit)), 100);

  const [reservations, total] = await Promise.all([
    Reservation.find(filter)
      .sort({ reservationDate: -1, reservationTime: -1 })
      .skip(skip)
      .limit(pageLimit)
      .populate("table", "tableNumber capacity section")
      .populate("createdBy", "name email")
      .lean(),
    Reservation.countDocuments(filter),
  ]);

  return {
    data: reservations,
    pagination: {
      page: Math.max(1, Number(page)),
      limit: pageLimit,
      total,
      totalPages: Math.ceil(total / pageLimit),
    },
  };
};

export const getReservationById = async (id) => {
  if (!id) throw new AppError("Reservation ID is required", 400);

  const reservation = await Reservation.findOne({
    $or: [
      { _id: mongoose.Types.ObjectId.isValid(id) ? id : null },
      { reservationId: id },
    ].filter(Boolean),
  })
    .populate("table", "tableNumber capacity section status")
    .populate("createdBy", "name email")
    .lean();

  if (!reservation) throw new AppError("Reservation not found", 404);
  return reservation;
};

export const createReservation = async (payload) => {
  const { customerName, partySize, reservationDate, reservationTime, table: tableId, ...rest } = payload;

  if (!customerName || !customerName.trim()) {
    throw new AppError("Customer name is required", 400);
  }
  if (!partySize || Number(partySize) < 1) {
    throw new AppError("Party size must be at least 1", 400);
  }
  if (!reservationDate) {
    throw new AppError("Reservation date is required", 400);
  }
  if (!reservationTime) {
    throw new AppError("Reservation time is required", 400);
  }

  if (tableId) {
    const table = await Table.findById(tableId).lean();
    if (!table) throw new AppError("Table not found", 404);
    if (table.status === "out_of_service") {
      throw new AppError("This table is out of service", 400);
    }
    if (table.isLocked) {
      throw new AppError("This table is currently locked", 400);
    }
    if (Number(partySize) > table.capacity) {
      throw new AppError(`Table capacity (${table.capacity}) is less than party size (${partySize})`, 400);
    }

    const conflict = await checkDoubleBooking(tableId, reservationDate, reservationTime);
    if (conflict) {
      throw new AppError("This table is already booked for the requested time slot", 409);
    }
  }

  const reservationId = generateReservationId();
  const parsedDate = new Date(reservationDate);
  if (isNaN(parsedDate.getTime())) {
    throw new AppError("Invalid reservation date", 400);
  }

  const reservation = await Reservation.create({
    reservationId,
    customerName: customerName.trim(),
    partySize: Number(partySize),
    reservationDate: parsedDate,
    reservationTime,
    table: tableId || null,
    ...rest,
  });

  if (tableId) {
    await Table.findByIdAndUpdate(tableId, { $set: { status: "reserved" } });
  }

  return reservation.toObject();
};

export const updateReservation = async (id, payload) => {
  if (!id) throw new AppError("Reservation ID is required", 400);

  const allowedFields = ["customerName", "phoneNumber", "partySize", "notes", "specialRequests", "email"];
  const updates = {};
  for (const field of allowedFields) {
    if (payload[field] !== undefined) {
      updates[field] = field === "customerName" ? String(payload[field]).trim() : payload[field];
    }
  }

  if (Object.keys(updates).length === 0) {
    throw new AppError("No valid fields provided to update", 400);
  }

  if (updates.partySize !== undefined && Number(updates.partySize) < 1) {
    throw new AppError("Party size must be at least 1", 400);
  }

  const reservation = await Reservation.findOneAndUpdate(
    {
      $or: [
        { _id: mongoose.Types.ObjectId.isValid(id) ? id : null },
        { reservationId: id },
      ].filter(Boolean),
    },
    { $set: updates },
    { new: true, runValidators: true },
  )
    .populate("table", "tableNumber capacity section")
    .lean();

  if (!reservation) throw new AppError("Reservation not found", 404);

  if (updates.partySize && reservation.table && Number(updates.partySize) > reservation.table.capacity) {
    await Table.findByIdAndUpdate(reservation.table._id, { $set: { status: "available" } });
    await Reservation.findByIdAndUpdate(reservation._id, { $set: { table: null, tableNumber: null } });
  }

  return reservation;
};

export const cancelReservation = async (id, reason = "") => {
  if (!id) throw new AppError("Reservation ID is required", 400);

  const reservation = await Reservation.findOne({
    $or: [
      { _id: mongoose.Types.ObjectId.isValid(id) ? id : null },
      { reservationId: id },
    ].filter(Boolean),
  }).lean();

  if (!reservation) throw new AppError("Reservation not found", 404);

  if (["cancelled", "completed", "no_show"].includes(reservation.status)) {
    throw new AppError(`Cannot cancel a reservation with status: ${reservation.status}`, 400);
  }

  if (reservation.table) {
    const hasActiveSession = await TableSession.findOne({
      table: reservation.table,
      status: "active",
    }).lean();

    if (!hasActiveSession) {
      await Table.findByIdAndUpdate(reservation.table, { $set: { status: "available" } });
    }
  }

  const updated = await Reservation.findByIdAndUpdate(
    reservation._id,
    {
      $set: {
        status: "cancelled",
        cancelledAt: new Date(),
        cancelledReason: reason || "",
      },
    },
    { new: true },
  ).lean();

  return updated;
};

export const rescheduleReservation = async (id, newDate, newTime) => {
  if (!id) throw new AppError("Reservation ID is required", 400);
  if (!newDate) throw new AppError("New reservation date is required", 400);
  if (!newTime) throw new AppError("New reservation time is required", 400);

  const parsedDate = new Date(newDate);
  if (isNaN(parsedDate.getTime())) throw new AppError("Invalid reservation date", 400);

  const reservation = await Reservation.findOne({
    $or: [
      { _id: mongoose.Types.ObjectId.isValid(id) ? id : null },
      { reservationId: id },
    ].filter(Boolean),
  }).lean();

  if (!reservation) throw new AppError("Reservation not found", 404);

  if (["cancelled", "completed", "no_show"].includes(reservation.status)) {
    throw new AppError(`Cannot reschedule a reservation with status: ${reservation.status}`, 400);
  }

  if (reservation.table) {
    const conflict = await checkDoubleBooking(reservation.table, newDate, newTime, reservation._id);
    if (conflict) {
      throw new AppError("The assigned table is already booked for the new time slot. Please unassign it first.", 409);
    }
  }

  const updates = {
    reservationDate: parsedDate,
    reservationTime: newTime,
  };

  if (["confirmed", "arrived"].includes(reservation.status)) {
    updates.status = "pending";
  }

  const updated = await Reservation.findByIdAndUpdate(
    reservation._id,
    { $set: updates },
    { new: true },
  ).lean();

  return updated;
};

export const assignTableToReservation = async (id, tableId) => {
  if (!id) throw new AppError("Reservation ID is required", 400);
  if (!tableId) throw new AppError("Table ID is required", 400);

  const reservation = await Reservation.findOne({
    $or: [
      { _id: mongoose.Types.ObjectId.isValid(id) ? id : null },
      { reservationId: id },
    ].filter(Boolean),
  }).lean();

  if (!reservation) throw new AppError("Reservation not found", 404);

  if (["cancelled", "completed", "no_show"].includes(reservation.status)) {
    throw new AppError(`Cannot assign table to a reservation with status: ${reservation.status}`, 400);
  }

  const table = await Table.findById(tableId).lean();
  if (!table) throw new AppError("Table not found", 404);
  if (table.status === "out_of_service") {
    throw new AppError("This table is out of service", 400);
  }
  if (table.isLocked) {
    throw new AppError("This table is currently locked", 400);
  }

  if (Number(reservation.partySize) > table.capacity) {
    throw new AppError(`Table capacity (${table.capacity}) is less than party size (${reservation.partySize})`, 400);
  }

  const conflict = await checkDoubleBooking(tableId, reservation.reservationDate, reservation.reservationTime, reservation._id);
  if (conflict) {
    throw new AppError("This table is already booked for the requested time slot", 409);
  }

  if (reservation.table && String(reservation.table) !== String(tableId)) {
    const oldTableHasActiveSession = await TableSession.findOne({
      table: reservation.table,
      status: "active",
    }).lean();
    if (!oldTableHasActiveSession) {
      await Table.findByIdAndUpdate(reservation.table, { $set: { status: "available" } });
    }
  }

  await Table.findByIdAndUpdate(tableId, { $set: { status: "reserved" } });

  const newStatus = reservation.status === "pending" ? "confirmed" : reservation.status;

  const updated = await Reservation.findByIdAndUpdate(
    reservation._id,
    {
      $set: {
        table: tableId,
        tableNumber: table.tableNumber,
        status: newStatus,
        confirmedAt: newStatus === "confirmed" ? new Date() : reservation.confirmedAt,
      },
    },
    { new: true },
  ).lean();

  return updated;
};

export const checkInReservation = async (id) => {
  if (!id) throw new AppError("Reservation ID is required", 400);

  const reservation = await Reservation.findOne({
    $or: [
      { _id: mongoose.Types.ObjectId.isValid(id) ? id : null },
      { reservationId: id },
    ].filter(Boolean),
  }).lean();

  if (!reservation) throw new AppError("Reservation not found", 404);

  if (!["pending", "confirmed"].includes(reservation.status)) {
    throw new AppError(`Cannot check in a reservation with status: ${reservation.status}`, 400);
  }

  const updated = await Reservation.findByIdAndUpdate(
    reservation._id,
    {
      $set: {
        status: "arrived",
        arrivedAt: new Date(),
      },
    },
    { new: true },
  ).lean();

  return updated;
};

export const seatReservation = async (id) => {
  if (!id) throw new AppError("Reservation ID is required", 400);

  const reservation = await Reservation.findOne({
    $or: [
      { _id: mongoose.Types.ObjectId.isValid(id) ? id : null },
      { reservationId: id },
    ].filter(Boolean),
  }).lean();

  if (!reservation) throw new AppError("Reservation not found", 404);

  if (reservation.status !== "arrived" && reservation.status !== "confirmed") {
    throw new AppError(`Cannot seat a reservation with status: ${reservation.status}`, 400);
  }

  if (!reservation.table) {
    throw new AppError("Reservation must have a table assigned before seating", 400);
  }

  const table = await Table.findById(reservation.table).lean();
  if (!table) throw new AppError("Assigned table not found", 404);

  if (table.currentSession) {
    const activeSession = await TableSession.findById(table.currentSession).lean();
    if (activeSession && activeSession.status === "active" && activeSession.expiresAt > new Date()) {
      throw new AppError("Table already has an active session", 409);
    }
  }

  await TableSession.updateMany(
    { table: table._id, status: "active" },
    { $set: { status: "expired" } },
  ).lean();

  const now = new Date();
  const sessionToken = `tab-${randomUUID()}`;
  const session = await TableSession.create({
    table: table._id,
    sessionToken,
    status: "active",
    startedAt: now,
    lastActivityAt: now,
    expiresAt: new Date(now.getTime() + SESSION_DURATION_MS),
    customerName: reservation.customerName || "",
    customerPhone: reservation.phoneNumber || "",
  });

  await Table.findByIdAndUpdate(table._id, {
    $set: { status: "occupied", currentSession: session._id },
  });

  const updated = await Reservation.findByIdAndUpdate(
    reservation._id,
    {
      $set: {
        status: "seated",
        seatedAt: now,
      },
    },
    { new: true },
  ).lean();

  return { reservation: updated, session: session.toObject() };
};

export const completeReservation = async (id) => {
  if (!id) throw new AppError("Reservation ID is required", 400);

  const reservation = await Reservation.findOne({
    $or: [
      { _id: mongoose.Types.ObjectId.isValid(id) ? id : null },
      { reservationId: id },
    ].filter(Boolean),
  }).lean();

  if (!reservation) throw new AppError("Reservation not found", 404);

  if (reservation.status !== "seated") {
    throw new AppError(`Cannot complete a reservation with status: ${reservation.status}`, 400);
  }

  const updated = await Reservation.findByIdAndUpdate(
    reservation._id,
    {
      $set: {
        status: "completed",
        completedAt: new Date(),
      },
    },
    { new: true },
  ).lean();

  return updated;
};

export const getReservationHistory = async (phoneNumber, query = {}) => {
  if (!phoneNumber) throw new AppError("Phone number is required", 400);

  const page = Math.max(Number(query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(query.limit) || 20, 1), 100);

  const filter = { phoneNumber };
  const [items, total] = await Promise.all([
    Reservation.find(filter)
      .sort({ reservationDate: -1, reservationTime: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("table", "tableNumber section")
      .lean(),
    Reservation.countDocuments(filter),
  ]);

  return {
    items,
    meta: { page, limit, total, pages: Math.max(Math.ceil(total / limit), 1) },
  };
};

export const getAvailableTables = async (date, time, partySize) => {
  if (!date) throw new AppError("Date is required", 400);
  if (!time) throw new AppError("Time is required", 400);
  if (!partySize || Number(partySize) < 1) throw new AppError("Valid party size is required", 400);

  const partySizeNum = Number(partySize);
  const parsedDate = new Date(date);
  if (isNaN(parsedDate.getTime())) throw new AppError("Invalid date", 400);

  const allTables = await Table.find({
    status: { $ne: "out_of_service" },
    isLocked: { $ne: true },
  })
    .select("-__v")
    .lean();

  const activeSessions = await TableSession.find({
    status: "active",
    expiresAt: { $gt: new Date() },
  }).lean();
  const activeTableIds = new Set(activeSessions.map((s) => String(s.table)));

  const available = [];

  for (const table of allTables) {
    if (table.capacity < partySizeNum) continue;

    if (activeTableIds.has(String(table._id))) continue;

    const conflict = await checkDoubleBooking(table._id, date, time);
    if (conflict) continue;

    available.push(table);
  }

  available.sort((a, b) => {
    const diffA = Math.abs(a.capacity - partySizeNum);
    const diffB = Math.abs(b.capacity - partySizeNum);
    if (diffA !== diffB) return diffA - diffB;
    return (a.tableNumber || 0) - (b.tableNumber || 0);
  });

  return available;
};

export const checkDoubleBooking = async (tableId, date, time, excludeId = null) => {
  if (!tableId || !date || !time) return null;

  const parsedDate = new Date(date);
  if (isNaN(parsedDate.getTime())) return null;

  const timeRegex = /^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i;
  let targetMinutes;

  const match = String(time).match(timeRegex);
  if (match) {
    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const modifier = match[3]?.toUpperCase();
    if (modifier === "PM" && hours !== 12) hours += 12;
    if (modifier === "AM" && hours === 12) hours = 0;
    targetMinutes = hours * 60 + minutes;
  } else {
    const parts = String(time).split(":").map(Number);
    if (parts.length < 2 || isNaN(parts[0]) || isNaN(parts[1])) return null;
    targetMinutes = parts[0] * 60 + parts[1];
  }

  const windowStart = targetMinutes - 120;
  const windowEnd = targetMinutes + 120;

  const startOfDay = new Date(parsedDate);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(parsedDate);
  endOfDay.setHours(23, 59, 59, 999);

  const allReservations = await Reservation.find({
    table: tableId,
    reservationDate: { $gte: startOfDay, $lte: endOfDay },
    status: { $in: ["pending", "confirmed", "arrived", "seated"] },
    ...(excludeId ? { _id: { $ne: excludeId } } : {}),
  }).lean();

  for (const existing of allReservations) {
    const existingMatch = String(existing.reservationTime).match(timeRegex);
    let existingMinutes;
    if (existingMatch) {
      let hours = parseInt(existingMatch[1], 10);
      const minutes = parseInt(existingMatch[2], 10);
      const modifier = existingMatch[3]?.toUpperCase();
      if (modifier === "PM" && hours !== 12) hours += 12;
      if (modifier === "AM" && hours === 12) hours = 0;
      existingMinutes = hours * 60 + minutes;
    } else {
      const parts = String(existing.reservationTime).split(":").map(Number);
      if (parts.length < 2) continue;
      existingMinutes = parts[0] * 60 + parts[1];
    }

    if (existingMinutes >= windowStart && existingMinutes <= windowEnd) {
      return existing;
    }
  }

  return null;
};

export const getTodayReservations = async () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  const reservations = await Reservation.find({
    reservationDate: { $gte: start, $lte: end },
  })
    .sort({ reservationTime: 1 })
    .populate("table", "tableNumber capacity section")
    .lean();

  return reservations;
};

export const processNoShows = async () => {
  const now = new Date();

  const candidates = await Reservation.find({
    status: { $in: ["confirmed", "arrived"] },
  }).lean();

  const noShowIds = [];
  const tablesToRelease = [];

  for (const reservation of candidates) {
    const [hours, minutes] = String(reservation.reservationTime).split(":").map(Number);
    if (isNaN(hours) || isNaN(minutes)) continue;

    const reservationDateTime = new Date(reservation.reservationDate);
    reservationDateTime.setHours(hours, minutes, 0, 0);

    const graceMs = (reservation.gracePeriodMinutes || 15) * 60 * 1000;
    const cutoff = new Date(reservationDateTime.getTime() + graceMs);

    if (now >= cutoff) {
      noShowIds.push(reservation._id);
      if (reservation.table) {
        tablesToRelease.push(reservation.table);
      }
    }
  }

  if (noShowIds.length > 0) {
    await Reservation.updateMany(
      { _id: { $in: noShowIds } },
      { $set: { status: "no_show", noShowAt: now } },
    );
  }

  if (tablesToRelease.length > 0) {
    for (const tableId of tablesToRelease) {
      const hasActiveSession = await TableSession.findOne({
        table: tableId,
        status: "active",
      }).lean();
      if (!hasActiveSession) {
        await Table.findByIdAndUpdate(tableId, { $set: { status: "available" } });
      }
    }
  }

  return { processedCount: noShowIds.length };
};

export const sendReminderNotifications = async () => {
  const now = new Date();
  const twoHoursLater = new Date(now.getTime() + 2 * 60 * 60 * 1000);

  const targetDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const targetHour = twoHoursLater.getHours();
  const targetMinute = twoHoursLater.getMinutes();
  const targetTime = `${String(targetHour).padStart(2, "0")}:${String(targetMinute).padStart(2, "0")}`;

  const startHour = Math.max(0, targetHour - 1);
  const endHour = Math.min(23, targetHour + 1);
  const timeFilters = [];

  for (let h = startHour; h <= endHour; h++) {
    timeFilters.push(
      `${String(h).padStart(2, "0")}:${String(targetMinute).padStart(2, "0")}`,
    );
  }

  const dayStart = new Date(targetDate);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(targetDate);
  dayEnd.setHours(23, 59, 59, 999);

  const reservations = await Reservation.find({
    reservationDate: { $gte: dayStart, $lte: dayEnd },
    reservationTime: { $in: timeFilters },
    status: { $in: ["pending", "confirmed"] },
    reminderSentAt: null,
  })
    .populate("table", "tableNumber section")
    .lean();

  return reservations;
};
