import * as waiterManagementService from "./service/waiter.management.service.js";
import { asyncHandler } from "../../util/error/error.js";
import { successResponse } from "../../util/response/success.res.js";

export const listWaiters = asyncHandler(async (req, res) => {
  const result = await waiterManagementService.listWaiters(req.query);
  res.json({ message: "Done", data: result });
});

export const getWaiterDetails = asyncHandler(async (req, res) => {
  const result = await waiterManagementService.getWaiterDetails(req.params.id);
  successResponse({ res, data: result, status: 200 });
});

export const getAssignedTables = asyncHandler(async (req, res) => {
  const result = await waiterManagementService.getAssignedTables(req.params.id);
  res.json({ message: "Done", data: result });
});

export const getActiveTasks = asyncHandler(async (req, res) => {
  const result = await waiterManagementService.getActiveTasks(req.params.id);
  res.json({ message: "Done", data: result });
});

export const getPendingRequests = asyncHandler(async (req, res) => {
  const result = await waiterManagementService.getPendingRequests(req.params.id);
  res.json({ message: "Done", data: result });
});

export const getDeliveryQueue = asyncHandler(async (req, res) => {
  const result = await waiterManagementService.getDeliveryQueue();
  res.json({ message: "Done", data: result });
});

export const getWaiterStats = asyncHandler(async (req, res) => {
  const result = await waiterManagementService.getWaiterStats(req.params.id);
  successResponse({ res, data: result, status: 200 });
});

export const reassignWaiterRequest = asyncHandler(async (req, res) => {
  const payload = req.body || {};
  const result = await waiterManagementService.reassignWaiterRequest(
    payload.requestId || req.params.id,
    payload.toWaiterId || payload.newWaiterId || payload.waiterId,
    req.user?._id || payload.userId,
  );
  successResponse({ res, data: result, status: 200 });
});

export const getWorkloadBalancing = asyncHandler(async (req, res) => {
  const result = await waiterManagementService.getWorkloadBalancing();
  res.json({ message: "Done", data: result });
});

export const autoAssignWaiter = asyncHandler(async (req, res) => {
  const payload = req.body || {};
  const result = await waiterManagementService.autoAssignWaiter(
    payload.tableNumber ?? payload.orderId ?? payload.id,
    payload.requestType ?? payload.type,
  );
  successResponse({ res, data: result, status: 200 });
});
