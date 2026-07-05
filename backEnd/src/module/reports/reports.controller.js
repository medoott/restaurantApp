import * as reportsService from "./service/reports.service.js";
import { asyncHandler } from "../../util/error/error.js";
import { successResponse } from "../../util/response/success.res.js";

export const getSalesReport = asyncHandler(async (req, res) => {
  const result = await reportsService.getSalesReport(req.query);
  successResponse({ res, data: result, status: 200 });
});

export const getOrdersReport = asyncHandler(async (req, res) => {
  const result = await reportsService.getOrdersReport(req.query);
  successResponse({ res, data: result, status: 200 });
});

export const getProductsReport = asyncHandler(async (req, res) => {
  const result = await reportsService.getProductsReport(req.query);
  successResponse({ res, data: result, status: 200 });
});

export const getInventoryReport = asyncHandler(async (req, res) => {
  const result = await reportsService.getInventoryReport(req.query);
  successResponse({ res, data: result, status: 200 });
});

export const getCustomerReport = asyncHandler(async (req, res) => {
  const result = await reportsService.getCustomerReport(req.query);
  successResponse({ res, data: result, status: 200 });
});

export const getWaiterReport = asyncHandler(async (req, res) => {
  const result = await reportsService.getWaiterReport(req.query);
  successResponse({ res, data: result, status: 200 });
});

export const getTableReport = asyncHandler(async (req, res) => {
  const result = await reportsService.getTableReport(req.query);
  successResponse({ res, data: result, status: 200 });
});

export const getPaymentReport = asyncHandler(async (req, res) => {
  const result = await reportsService.getPaymentReport(req.query);
  successResponse({ res, data: result, status: 200 });
});
