import * as systemHealthService from "./service/system.health.service.js";
import { asyncHandler } from "../../util/error/error.js";
import { successResponse } from "../../util/response/success.res.js";

export const getSystemHealth = asyncHandler(async (req, res) => {
  const result = await systemHealthService.getSystemHealth();
  successResponse({ res, data: result, status: 200 });
});

export const getErrorLogs = asyncHandler(async (req, res) => {
  const result = await systemHealthService.getErrorLogs(req.query);
  res.json({ message: "Done", data: result });
});

export const getBackupStatus = asyncHandler(async (req, res) => {
  const result = await systemHealthService.getBackupStatus();
  successResponse({ res, data: result, status: 200 });
});

export const getSystemInfo = asyncHandler(async (req, res) => {
  const result = await systemHealthService.getSystemInfo();
  successResponse({ res, data: result, status: 200 });
});
