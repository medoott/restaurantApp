import AuditLog from "../../DB/model/AuditLog.model.js";
import { AppError } from "../../util/error/AppError.js";

export async function recordAudit(entry) {
  return AuditLog.create({
    user: entry.user || null,
    customer: entry.customer || "",
    tableNumber: entry.tableNumber || null,
    tableSession: entry.tableSession || null,
    orderId: entry.orderId || null,
    action: entry.action,
    description: entry.description || "",
    previousValue: entry.previousValue || null,
    newValue: entry.newValue || null,
    ip: entry.ip || "",
    sessionId: entry.sessionId || "",
    userAgent: entry.userAgent || "",
  });
}

export async function getAuditLogs(query = {}) {
  const page = Math.max(Number(query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(query.limit) || 50, 1), 200);
  const filter = {};

  if (query.action) filter.action = query.action;
  if (query.tableNumber) filter.tableNumber = Number(query.tableNumber);
  if (query.orderId) filter.orderId = query.orderId;
  if (query.startDate || query.endDate) {
    filter.createdAt = {};
    if (query.startDate) filter.createdAt.$gte = new Date(query.startDate);
    if (query.endDate) filter.createdAt.$lte = new Date(query.endDate);
  }

  const [items, total] = await Promise.all([
    AuditLog.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("user", "name role")
      .lean(),
    AuditLog.countDocuments(filter),
  ]);

  return {
    items,
    meta: { page, limit, total, pages: Math.max(Math.ceil(total / limit), 1) },
  };
}

export async function getAuditLogById(id) {
  const log = await AuditLog.findById(id).populate("user", "name role").lean();
  if (!log) throw new AppError("Audit log not found", 404);
  return log;
}
