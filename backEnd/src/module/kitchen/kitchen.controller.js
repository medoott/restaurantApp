import * as kdsService from "./service/kds.service.js";
import { asyncHandler } from "../../util/error/error.js";
import { successResponse } from "../../util/response/success.res.js";

export const getKDSOrders = asyncHandler(async (req, res) => {
  const result = await kdsService.getKDSOrders(req.query);
  res.json({ message: "Done", data: result });
});

export const getKDSOrderStats = asyncHandler(async (req, res) => {
  const result = await kdsService.getKDSOrderStats();
  successResponse({ res, data: result, status: 200 });
});

export const acceptKDSOrder = asyncHandler(async (req, res) => {
  const result = await kdsService.acceptKDSOrder(req.params.id, req.user?._id);
  successResponse({ res, data: result, status: 200 });
});

export const completeKDSOrder = asyncHandler(async (req, res) => {
  const result = await kdsService.completeKDSOrder(req.params.id, req.user?._id);
  successResponse({ res, data: result, status: 200 });
});

export const getDelayedOrders = asyncHandler(async (req, res) => {
  const result = await kdsService.getDelayedOrders();
  res.json({ message: "Done", data: result });
});
