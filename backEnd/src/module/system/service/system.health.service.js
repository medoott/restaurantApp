import mongoose from "mongoose";
import os from "os";
import AuditLog from "../../../DB/model/AuditLog.model.js";
import User from "../../../DB/model/User.model.js";
import TableSession from "../../../DB/model/TableSession.model.js";
import Settings from "../../../DB/model/Settings.model.js";
import { AppError } from "../../../util/error/AppError.js";

export const getSystemHealth = async () => {
  let dbStatus = "disconnected";
  try {
    if (mongoose.connection.readyState === 1) {
      dbStatus = "connected";
    } else if (mongoose.connection.readyState === 2) {
      dbStatus = "connecting";
    } else {
      dbStatus = "disconnected";
    }
  } catch {
    dbStatus = "error";
  }

  const memory = process.memoryUsage();
  const uptime = process.uptime();

  const cpus = os.cpus();
  const cpuUsage = cpus.length > 0
    ? Number(((cpus.reduce((acc, cpu) => {
        const total = Object.values(cpu.times).reduce((a, b) => a + b, 0);
        const idle = cpu.times.idle;
        return acc + ((total - idle) / total) * 100;
      }, 0) / cpus.length).toFixed(1)))
    : 0;

  const [activeUsers, activeSessions] = await Promise.all([
    User.countDocuments({ employeeStatus: { $ne: "offline" } }),
    TableSession.countDocuments({ status: "active" }),
  ]);

  const version = process.env.npm_package_version || process.env.APP_VERSION || "1.0.0";

  return {
    apiStatus: "ok",
    dbStatus,
    uptime: Math.floor(uptime),
    memory: {
      heapUsed: Math.round(memory.heapUsed / 1024 / 1024),
      heapTotal: Math.round(memory.heapTotal / 1024 / 1024),
      rss: Math.round(memory.rss / 1024 / 1024),
      external: Math.round(memory.external / 1024 / 1024),
    },
    cpu: {
      usagePercent: cpuUsage,
      cores: cpus.length,
      model: cpus[0]?.model || "unknown",
    },
    version,
    activeUsers,
    activeSessions,
    timestamp: new Date().toISOString(),
  };
};

export const getErrorLogs = async (days = 7, limit = 100) => {
  const since = new Date(Date.now() - Number(days) * 24 * 60 * 60 * 1000);
  const lim = Math.min(Math.max(Number(limit) || 100, 1), 500);

  const logs = await AuditLog.find({
    action: { $in: ["error", "system_error", "api_error"] },
    createdAt: { $gte: since },
  })
    .sort({ createdAt: -1 })
    .limit(lim)
    .populate("user", "name email")
    .lean();

  return {
    logs: logs.map((l) => ({
      id: l._id,
      action: l.action,
      module: l.module,
      description: l.description,
      user: l.user || null,
      previousValue: l.previousValue,
      newValue: l.newValue,
      createdAt: l.createdAt,
    })),
    total: logs.length,
    days: Number(days),
  };
};

export const getBackupStatus = async () => {
  const settings = await Settings.findOne({ key: "main" }).lean();
  const backupConfig = settings?.data?.backup || {};

  return {
    lastBackup: backupConfig.lastBackup || null,
    lastBackupSize: backupConfig.lastBackupSize || null,
    autoBackupEnabled: backupConfig.autoBackupEnabled || false,
    backupFrequency: backupConfig.backupFrequency || "daily",
    backupLocation: backupConfig.backupLocation || "",
    retentionDays: backupConfig.retentionDays || 30,
    nextScheduledBackup: backupConfig.nextScheduledBackup || null,
  };
};

export const getSystemInfo = async () => {
  const version = process.env.npm_package_version || process.env.APP_VERSION || "1.0.0";

  return {
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
    appVersion: version,
    environment: process.env.NODE_ENV || "development",
    hostname: os.hostname(),
    totalMemory: Math.round(os.totalmem() / 1024 / 1024 / 1024 * 100) / 100 + " GB",
    freeMemory: Math.round(os.freemem() / 1024 / 1024 / 1024 * 100) / 100 + " GB",
    uptime: Math.floor(os.uptime()),
    pid: process.pid,
    mongodbVersion: mongoose.version,
  };
};
