import { asyncHandler } from "../../util/error/error.js";
import { getAuditLogs, getAuditLogById } from "./audit.service.js";

export const listAuditLogs = asyncHandler(async (req, res) => {
  const logs = await getAuditLogs(req.query);
  res.json(logs);
});

export const getAuditLog = asyncHandler(async (req, res) => {
  const log = await getAuditLogById(req.params.id);
  res.json({ data: log });
});
