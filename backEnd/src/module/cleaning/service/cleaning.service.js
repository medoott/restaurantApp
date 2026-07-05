import Table from "../../../DB/model/Table.model.js";
import Visit from "../../../DB/model/Visit.model.js";
import AuditLog from "../../../DB/model/AuditLog.model.js";
import User from "../../../DB/model/User.model.js";
import { createNotification } from "../../notification/notification.service.js";
import { getIO } from "../../../config/socket.js";
import { AppError } from "../../../util/error/AppError.js";

export const startCleaning = async (tableNumber, userId) => {
  const table = await Table.findOne({ tableNumber: Number(tableNumber) });
  if (!table) throw new AppError("Table not found.", 404);
  if (table.status !== "needs_cleaning") {
    throw new AppError("Table is not marked for cleaning.", 400);
  }

  const now = new Date();
  table.status = "cleaning_in_progress";
  table.cleaning = {
    assignedTo: userId,
    startedAt: now,
    completedAt: null,
    verifiedBy: null,
  };
  await table.save();

  await User.findByIdAndUpdate(userId, { $set: { employeeStatus: "busy" } });

  await createNotification({
    type: "cleaning_started",
    title: "Cleaning Started",
    message: `Cleaning started on Table ${tableNumber}`,
    priority: "low",
    recipientId: userId,
    metadata: { tableNumber },
  });

  await AuditLog.create({
    user: userId,
    tableNumber: Number(tableNumber),
    module: "cleaning",
    action: "start_cleaning",
    description: `Cleaning started on table ${tableNumber}`,
    previousValue: { status: "needs_cleaning" },
    newValue: { status: "cleaning_in_progress", cleanerId: userId },
  });

  const io = getIO();
  if (io) {
    io.emit("table:statusChanged", { tableNumber, status: "cleaning_in_progress" });
  }

  return { table, message: `Cleaning started on table ${tableNumber}` };
};

export const completeCleaning = async (tableNumber, userId) => {
  const table = await Table.findOne({ tableNumber: Number(tableNumber) });
  if (!table) throw new AppError("Table not found.", 404);
  if (table.status !== "cleaning_in_progress") {
    throw new AppError("Table cleaning is not in progress.", 400);
  }

  const now = new Date();
  const cleaningDuration = table.cleaning?.startedAt
    ? Math.round((now - table.cleaning.startedAt) / 60000)
    : 0;

  table.status = "available";
  table.cleaning.completedAt = now;
  table.cleaning.verifiedBy = userId;
  table.currentSession = null;
  table.currentVisit = null;
  table.metrics.lastCleanedAt = now;
  table.metrics.totalSittingsToday = (table.metrics.totalSittingsToday || 0) + 1;
  await table.save();

  await User.findByIdAndUpdate(userId, { $set: { employeeStatus: "available" } });

  await createNotification({
    type: "cleaning_completed",
    title: "Cleaning Completed",
    message: `Table ${tableNumber} is now available (${cleaningDuration} min)`,
    priority: "low",
    roleTarget: "Host",
    metadata: { tableNumber, cleaningDuration },
  });

  await AuditLog.create({
    user: userId,
    tableNumber: Number(tableNumber),
    module: "cleaning",
    action: "complete_cleaning",
    description: `Cleaning completed on table ${tableNumber} (${cleaningDuration} min)`,
    previousValue: { status: "cleaning_in_progress" },
    newValue: { status: "available", cleaningDuration },
  });

  const io = getIO();
  if (io) {
    io.emit("table:statusChanged", { tableNumber, status: "available" });
    io.to("role:Host").emit("table:cleaned", { tableNumber, cleaningDuration });
  }

  return {
    table,
    cleaningDuration,
    message: `Table ${tableNumber} is now available (${cleaningDuration} min cleaning time)`,
  };
};

export const markNeedsCleaning = async (tableNumber, userId) => {
  const table = await Table.findOne({ tableNumber: Number(tableNumber) });
  if (!table) throw new AppError("Table not found.", 404);
  if (table.status === "needs_cleaning" || table.status === "cleaning_in_progress") {
    throw new AppError("Table is already marked for cleaning.", 400);
  }

  const previousStatus = table.status;
  table.status = "needs_cleaning";
  await table.save();

  await AuditLog.create({
    user: userId,
    tableNumber: Number(tableNumber),
    module: "cleaning",
    action: "mark_needs_cleaning",
    description: `Table ${tableNumber} marked as needs cleaning`,
    previousValue: { status: previousStatus },
    newValue: { status: "needs_cleaning" },
  });

  return table;
};

export const autoAssignCleaningStaff = async (tableNumber) => {
  const cleaner = await User.findOne({
    role: "Cleaner",
    employeeStatus: "available",
    "shift.clockedIn": true,
  })
    .sort({ currentTaskCount: 1 })
    .lean();

  if (cleaner) {
    await createNotification({
      type: "cleaning_assigned",
      title: "New Cleaning Task",
      message: `Table ${tableNumber} needs cleaning`,
      priority: "medium",
      recipientId: cleaner._id,
      metadata: { tableNumber },
    });
  }

  return cleaner || null;
};

export const getTablesNeedingCleaning = async () => {
  const tables = await Table.find({
    status: { $in: ["needs_cleaning", "cleaning_in_progress"] },
  })
    .select("tableNumber capacity section status cleaning notes")
    .sort({ tableNumber: 1 })
    .lean();
  return tables;
};

export const getCleaningStats = async () => {
  const [needsCleaning, inProgress, available, total] = await Promise.all([
    Table.countDocuments({ status: "needs_cleaning" }),
    Table.countDocuments({ status: "cleaning_in_progress" }),
    Table.countDocuments({ status: "available" }),
    Table.countDocuments(),
  ]);

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayCompleted = await AuditLog.countDocuments({
    module: "cleaning",
    action: "complete_cleaning",
    createdAt: { $gte: todayStart },
  });

  const recentCompletions = await AuditLog.find({
    module: "cleaning",
    action: "complete_cleaning",
  })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();

  let totalCleaningTime = 0;
  let count = 0;

  for (const log of recentCompletions) {
    const startLog = await AuditLog.findOne({
      module: "cleaning",
      action: "start_cleaning",
      tableNumber: log.tableNumber,
      createdAt: { $lte: log.createdAt },
    })
      .sort({ createdAt: -1 })
      .lean();

    if (startLog) {
      const diff = (new Date(log.createdAt) - new Date(startLog.createdAt)) / 60000;
      if (diff > 0 && diff < 180) {
        totalCleaningTime += diff;
        count++;
      }
    }
  }

  const avgCleaningTime = count > 0 ? Number((totalCleaningTime / count).toFixed(1)) : 0;

  return {
    tablesNeedingCleaning: needsCleaning,
    cleaningInProgress: inProgress,
    availableTables: available,
    totalTables: total,
    cleanedToday: todayCompleted,
    avgCleaningTimeMinutes: avgCleaningTime,
    cleaningCompletionRate: total > 0
      ? Number((((total - needsCleaning - inProgress) / total) * 100).toFixed(1))
      : 0,
  };
};

export const getCleaningHistory = async (days = 7) => {
  const since = new Date(Date.now() - Number(days) * 24 * 60 * 60 * 1000);

  const logs = await AuditLog.find({
    module: "cleaning",
    createdAt: { $gte: since },
  })
    .sort({ createdAt: -1 })
    .limit(500)
    .populate("user", "name")
    .lean();

  const history = logs.map((log) => ({
    id: log._id,
    tableNumber: log.tableNumber,
    action: log.action,
    description: log.description,
    user: log.user || null,
    createdAt: log.createdAt,
  }));

  const byDay = {};
  for (const entry of history) {
    const day = new Date(entry.createdAt).toISOString().slice(0, 10);
    if (!byDay[day]) byDay[day] = { date: day, marked: 0, started: 0, completed: 0 };
    if (entry.action === "mark_needs_cleaning") byDay[day].marked++;
    else if (entry.action === "start_cleaning") byDay[day].started++;
    else if (entry.action === "complete_cleaning") byDay[day].completed++;
  }

  return {
    history,
    byDay: Object.values(byDay).sort((a, b) => a.date.localeCompare(b.date)),
    totalEvents: history.length,
  };
};
