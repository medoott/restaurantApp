import * as purchaseOrderService from "./service/purchaseOrder.service.js";
import { asyncHandler } from "../../util/error/error.js";
import { successResponse } from "../../util/response/success.res.js";

export const listPurchaseOrders = asyncHandler(async (req, res) => {
  const result = await purchaseOrderService.listPurchaseOrders(req.query);
  res.json({ message: "Done", data: result });
});

export const getPurchaseOrder = asyncHandler(async (req, res) => {
  const result = await purchaseOrderService.getPurchaseOrder(req.params.id);
  successResponse({ res, data: result, status: 200 });
});

export const createPurchaseOrder = asyncHandler(async (req, res) => {
  const result = await purchaseOrderService.createPurchaseOrder({ ...req.body, userId: req.user?._id });
  successResponse({ res, data: result, status: 201 });
});

export const updatePurchaseOrder = asyncHandler(async (req, res) => {
  const result = await purchaseOrderService.updatePurchaseOrder(req.params.id, req.body);
  successResponse({ res, data: result, status: 200 });
});

export const deletePurchaseOrder = asyncHandler(async (req, res) => {
  await purchaseOrderService.deletePurchaseOrder(req.params.id);
  successResponse({ res, message: "Purchase order deleted.", status: 200 });
});

export const approvePurchaseOrder = asyncHandler(async (req, res) => {
  const result = await purchaseOrderService.approvePurchaseOrder(req.params.id, { userId: req.user?._id });
  successResponse({ res, data: result, status: 200 });
});

export const receivePurchaseOrder = asyncHandler(async (req, res) => {
  const result = await purchaseOrderService.receivePurchaseOrder(req.params.id, { ...req.body, userId: req.user?._id });
  successResponse({ res, data: result, status: 200 });
});

export const cancelPurchaseOrder = asyncHandler(async (req, res) => {
  const result = await purchaseOrderService.cancelPurchaseOrder(req.params.id, { userId: req.user?._id, reason: req.body.reason });
  successResponse({ res, data: result, status: 200 });
});

export const updatePaymentStatus = asyncHandler(async (req, res) => {
  const result = await purchaseOrderService.updatePaymentStatus(req.params.id, req.body);
  successResponse({ res, data: result, status: 200 });
});
