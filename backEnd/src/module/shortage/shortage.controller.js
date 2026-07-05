import { asyncHandler } from "../../util/error/error.js";
import { successResponse } from "../../util/response/success.res.js";
import {
  createShortageService,
  listShortages,
  getShortageById,
  resolveShortage,
  dismissShortage,
  getShortageReports,
  getConsumptionReport,
  getShortageStats,
} from "./service/shortage.service.js";

export const getShortages = asyncHandler(async (req, res) => {
  const shortages = await listShortages(req.query);
  successResponse({ res, data: shortages, status: 200 });
});

export const getShortage = asyncHandler(async (req, res) => {
  const shortage = await getShortageById(req.params.id);
  successResponse({ res, data: shortage, status: 200 });
});

export const createShortage = asyncHandler(async (req, res) => {
  const shortage = await createShortageService({
    ...req.body,
    createdBy: req.user?.name || req.body.createdBy || "Cook",
  });
  successResponse({ res, data: shortage, status: 201 });
});

export const resolveShortageEndpoint = asyncHandler(async (req, res) => {
  const shortage = await resolveShortage(req.params.id, req.user?.name || null);
  successResponse({ res, data: shortage, status: 200 });
});

export const dismissShortageEndpoint = asyncHandler(async (req, res) => {
  const shortage = await dismissShortage(req.params.id, req.user?.name || null);
  successResponse({ res, data: shortage, status: 200 });
});

export const getShortageReportsEndpoint = asyncHandler(async (req, res) => {
  const report = await getShortageReports(req.query.period || "monthly");
  successResponse({ res, data: report, status: 200 });
});

export const getConsumptionReportEndpoint = asyncHandler(async (req, res) => {
  const report = await getConsumptionReport(Number(req.query.days) || 30);
  successResponse({ res, data: report, status: 200 });
});

export const getShortageStatsEndpoint = asyncHandler(async (req, res) => {
  const stats = await getShortageStats();
  successResponse({ res, data: stats, status: 200 });
});
