import { asyncHandler } from "../../util/error/error.js";
import { successResponse } from "../../util/response/success.res.js";
import {
  createWaiterRequest,
  listWaiterRequests,
  acknowledgeRequest,
  resolveRequest,
  getPendingCounts,
} from "./service/waiter.service.js";
import { createBillRequest } from "./service/billEscalation.service.js";

export const callWaiter = asyncHandler(async (req, res) => {
  const request = await createWaiterRequest("call_waiter", {
    sessionToken: req.body.sessionToken,
    message: req.body.message,
    ip: req.ip || "",
  });
  successResponse({ res, data: request, status: 201 });
});

export const requestBill = asyncHandler(async (req, res) => {
  const result = await createBillRequest(req.body.sessionToken, req.body.message || "");
  successResponse({ res, data: result, status: 201 });
});

export const requestWater = asyncHandler(async (req, res) => {
  const request = await createWaiterRequest("need_water", {
    sessionToken: req.body.sessionToken,
    message: req.body.message,
    ip: req.ip || "",
  });
  successResponse({ res, data: request, status: 201 });
});

export const requestCutlery = asyncHandler(async (req, res) => {
  const request = await createWaiterRequest("need_cutlery", {
    sessionToken: req.body.sessionToken,
    message: req.body.message,
    ip: req.ip || "",
  });
  successResponse({ res, data: request, status: 201 });
});

export const requestAssistance = asyncHandler(async (req, res) => {
  const request = await createWaiterRequest("need_assistance", {
    sessionToken: req.body.sessionToken,
    message: req.body.message,
    ip: req.ip || "",
  });
  successResponse({ res, data: request, status: 201 });
});

export const requestNapkins = asyncHandler(async (req, res) => {
  const request = await createWaiterRequest("need_napkins", {
    sessionToken: req.body.sessionToken,
    message: req.body.message,
    ip: req.ip || "",
  });
  successResponse({ res, data: request, status: 201 });
});

export const requestSauce = asyncHandler(async (req, res) => {
  const request = await createWaiterRequest("need_sauce", {
    sessionToken: req.body.sessionToken,
    message: req.body.message,
    ip: req.ip || "",
  });
  successResponse({ res, data: request, status: 201 });
});

export const requestCustom = asyncHandler(async (req, res) => {
  const request = await createWaiterRequest("other", {
    sessionToken: req.body.sessionToken,
    message: req.body.message,
    ip: req.ip || "",
  });
  successResponse({ res, data: request, status: 201 });
});

export const getRequests = asyncHandler(async (req, res) => {
  const requests = await listWaiterRequests(req.query);
  successResponse({ res, data: { items: requests }, status: 200 });
});

export const acknowledge = asyncHandler(async (req, res) => {
  const request = await acknowledgeRequest(req.params.id, req.user._id);
  successResponse({ res, data: request, status: 200 });
});

export const resolve = asyncHandler(async (req, res) => {
  const request = await resolveRequest(req.params.id, req.user._id);
  successResponse({ res, data: request, status: 200 });
});

export const pendingCounts = asyncHandler(async (_req, res) => {
  const counts = await getPendingCounts();
  successResponse({ res, data: counts, status: 200 });
});
