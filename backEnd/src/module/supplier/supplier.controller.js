import * as supplierService from "./service/supplier.service.js";
import { asyncHandler } from "../../util/error/error.js";
import { successResponse } from "../../util/response/success.res.js";

export const listSuppliers = asyncHandler(async (req, res) => {
  const result = await supplierService.listSuppliers(req.query);
  res.json({ message: "Done", data: result });
});

export const getSupplier = asyncHandler(async (req, res) => {
  const result = await supplierService.getSupplier(req.params.id);
  successResponse({ res, data: result, status: 200 });
});

export const createSupplier = asyncHandler(async (req, res) => {
  const result = await supplierService.createSupplier({ ...req.body, userId: req.user?._id });
  successResponse({ res, data: result, status: 201 });
});

export const updateSupplier = asyncHandler(async (req, res) => {
  const result = await supplierService.updateSupplier(req.params.id, req.body);
  successResponse({ res, data: result, status: 200 });
});

export const deleteSupplier = asyncHandler(async (req, res) => {
  await supplierService.deleteSupplier(req.params.id);
  successResponse({ res, message: "Supplier deleted.", status: 200 });
});

export const getOutstandingBalances = asyncHandler(async (req, res) => {
  const result = await supplierService.getOutstandingBalances(req.query);
  res.json({ message: "Done", data: result });
});

export const getSupplierPerformance = asyncHandler(async (req, res) => {
  const result = await supplierService.getSupplierPerformance(req.params.id);
  successResponse({ res, data: result, status: 200 });
});

export const getSupplierAnalytics = asyncHandler(async (req, res) => {
  const result = await supplierService.getSupplierAnalytics(req.query.period || "monthly");
  successResponse({ res, data: result, status: 200 });
});
