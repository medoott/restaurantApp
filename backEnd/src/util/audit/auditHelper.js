import AuditLog from "../../DB/model/AuditLog.model.js";

export function extractUserContext(req) {
  if (!req?.user) return { user: null, userName: "", userRole: "", ip: "", userAgent: "" };
  return {
    user: req.user._id,
    userName: req.user.name || req.user.username || "",
    userRole: req.user.role || "",
    ip: req.ip || req.headers?.["x-forwarded-for"] || "",
    userAgent: req.headers?.["user-agent"] || "",
  };
}

export async function createAuditLog({ req, action, description, module = "", tableNumber, orderId, previousValue, newValue, sessionId }) {
  const ctx = extractUserContext(req);

  return AuditLog.create({
    ...ctx,
    action,
    description,
    module,
    tableNumber: tableNumber || null,
    orderId: orderId || null,
    previousValue: previousValue || null,
    newValue: newValue || null,
    sessionId: sessionId || "",
  });
}

export async function createSystemAuditLog({ action, description, module = "", user = null, tableNumber, orderId, previousValue, newValue, ip = "", userAgent = "" }) {
  return AuditLog.create({
    user: user?._id || user || null,
    userName: user?.name || user?.username || "",
    userRole: user?.role || "",
    action,
    description,
    module,
    tableNumber: tableNumber || null,
    orderId: orderId || null,
    previousValue: previousValue || null,
    newValue: newValue || null,
    ip,
    userAgent,
  });
}
