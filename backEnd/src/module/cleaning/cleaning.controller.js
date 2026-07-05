import * as cleaningService from "./service/cleaning.service.js";
import { asyncHandler } from "../../util/error/error.js";
import { successResponse } from "../../util/response/success.res.js";

export const markNeedsCleaning = asyncHandler(async (req, res) => {
  const result = await cleaningService.markNeedsCleaning(req.body.tableId, { userId: req.user?._id });
  successResponse({ res, data: result, status: 200 });
});

export const startCleaning = asyncHandler(async (req, res) => {
  const result = await cleaningService.startCleaning(req.params.id, { userId: req.user?._id });
  successResponse({ res, data: result, status: 200 });
});

export const completeCleaning = asyncHandler(async (req, res) => {
  const result = await cleaningService.completeCleaning(req.params.id, { userId: req.user?._id });
  successResponse({ res, data: result, status: 200 });
});

export const getTablesNeedingCleaning = asyncHandler(async (req, res) => {
  const result = await cleaningService.getTablesNeedingCleaning();
  res.json({ message: "Done", data: result });
});

export const getCleaningStats = asyncHandler(async (req, res) => {
  const result = await cleaningService.getCleaningStats();
  successResponse({ res, data: result, status: 200 });
});

export const getCleaningHistory = asyncHandler(async (req, res) => {
  const result = await cleaningService.getCleaningHistory(req.query);
  res.json({ message: "Done", data: result });
});
