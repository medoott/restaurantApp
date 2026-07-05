import * as hostService from "./service/host.service.js";
import * as billService from "./service/bill.service.js";
import * as escalationService from "./service/escalation.service.js";
import { asyncHandler } from "../../util/error/error.js";
import { AppError } from "../../util/error/AppError.js";
import { successResponse } from "../../util/response/success.res.js";
import { safeObjectId } from "../../util/validation/validateObjectId.js";

export const customerArrival = asyncHandler(async (req, res, next) => {
  const result = await hostService.customerArrival({
    ...req.body,
    createdBy: req.user?._id,
    branchId: req.user?.branchId,
    ip: req.ip,
  });
  successResponse({ res, data: result, status: result.queue ? 200 : 201 });
});

export const seatCustomer = asyncHandler(async (req, res, next) => {
  const { visitId } = req.params;
  const { tableNumber, actualGuests } = req.body;
  const result = await hostService.seatCustomer(visitId, tableNumber, {
    seatedBy: req.user?._id,
    actualGuests,
  });
  successResponse({ res, data: result });
});

export const getQueueStatus = asyncHandler(async (req, res, next) => {
  const rawBranchId = req.user?.branchId || req.query.branchId;
  const branchId = safeObjectId(rawBranchId) || rawBranchId;
  const result = await hostService.getQueueStatus(branchId);
  successResponse({ res, data: result });
});

export const notifyCustomerFromQueue = asyncHandler(async (req, res, next) => {
  const { queueId } = req.params;
  const result = await hostService.notifyCustomerFromQueue(queueId, req.user?._id);
  successResponse({ res, data: result });
});

export const cancelWaiting = asyncHandler(async (req, res, next) => {
  const { queueId } = req.params;
  const { reason } = req.body;
  const result = await hostService.cancelWaiting(queueId, reason, req.user?._id);
  successResponse({ res, data: result });
});

export const getHostDashboard = asyncHandler(async (req, res, next) => {
  const branchId = req.user?.branchId;
  const result = await hostService.getHostDashboard(branchId);
  successResponse({ res, data: result });
});

export const calculateBill = asyncHandler(async (req, res, next) => {
  const { visitId } = req.params;
  const result = await billService.calculateBill(visitId);
  successResponse({ res, data: result });
});

export const createPaymentSession = asyncHandler(async (req, res, next) => {
  const { visitId } = req.params;
  const result = await billService.createVisitPaymentSession(visitId, req.user?._id, req.body);
  successResponse({ res, data: result, status: 201 });
});

export const processPaymentSession = asyncHandler(async (req, res, next) => {
  const { sessionId } = req.params;
  const result = await billService.processVisitPaymentSession(sessionId, req.user?._id, req.body);
  successResponse({ res, data: result });
});

export const splitBillByAmount = asyncHandler(async (req, res, next) => {
  const { visitId } = req.params;
  const { amounts } = req.body;
  if (!Array.isArray(amounts) || amounts.length < 2) {
    throw new AppError("At least 2 split amounts required", 400);
  }
  const sessions = await billService.splitBillByAmount(visitId, amounts, req.user?._id);
  successResponse({ res, data: { sessions } });
});

export const applyCoupon = asyncHandler(async (req, res, next) => {
  const { visitId } = req.params;
  const { couponCode } = req.body;
  const result = await billService.applyCoupon(visitId, couponCode);
  successResponse({ res, data: result });
});

export const escalateOverdueTasks = asyncHandler(async (req, res, next) => {
  const results = await escalationService.escalateOverdueTasks();
  successResponse({ res, data: { escalated: results.length, results } });
});
