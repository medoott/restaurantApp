import * as customerService from "./service/customer.service.js";
import { asyncHandler } from "../../util/error/error.js";
import { successResponse } from "../../util/response/success.res.js";

export const listCustomers = asyncHandler(async (req, res) => {
  const result = await customerService.listCustomers(req.query);
  res.json({ message: "Done", data: result });
});

export const getCustomer = asyncHandler(async (req, res) => {
  const result = await customerService.getCustomer(req.params.id);
  successResponse({ res, data: result, status: 200 });
});

export const getCustomerByPhone = asyncHandler(async (req, res) => {
  const result = await customerService.getCustomerByPhone(req.params.phone);
  successResponse({ res, data: result, status: 200 });
});

export const createCustomer = asyncHandler(async (req, res) => {
  const result = await customerService.createCustomer({ ...req.body, userId: req.user?._id });
  successResponse({ res, data: result, status: 201 });
});

export const updateCustomer = asyncHandler(async (req, res) => {
  const result = await customerService.updateCustomer(req.params.id, req.body);
  successResponse({ res, data: result, status: 200 });
});

export const deleteCustomer = asyncHandler(async (req, res) => {
  await customerService.deleteCustomer(req.params.id);
  successResponse({ res, message: "Customer deleted.", status: 200 });
});

export const addStaffNote = asyncHandler(async (req, res) => {
  const result = await customerService.addStaffNote(req.params.id, { ...req.body, userId: req.user?._id });
  successResponse({ res, data: result, status: 200 });
});

export const recordVisit = asyncHandler(async (req, res) => {
  const result = await customerService.recordVisit(req.params.id, { ...req.body, userId: req.user?._id });
  successResponse({ res, data: result, status: 200 });
});

export const addFavoriteProduct = asyncHandler(async (req, res) => {
  const result = await customerService.addFavoriteProduct(req.params.id, req.body.productId);
  successResponse({ res, data: result, status: 200 });
});

export const removeFavoriteProduct = asyncHandler(async (req, res) => {
  const result = await customerService.removeFavoriteProduct(req.params.id, req.body.productId);
  successResponse({ res, data: result, status: 200 });
});

export const updateLoyaltyPoints = asyncHandler(async (req, res) => {
  const result = await customerService.updateLoyaltyPoints(req.params.id, req.body);
  successResponse({ res, data: result, status: 200 });
});

export const getCustomerAnalytics = asyncHandler(async (req, res) => {
  const result = await customerService.getCustomerAnalytics(req.params.id);
  successResponse({ res, data: result, status: 200 });
});

export const getTopCustomers = asyncHandler(async (req, res) => {
  const result = await customerService.getTopCustomers(req.query);
  res.json({ message: "Done", data: result });
});

export const getCustomerSegmentation = asyncHandler(async (req, res) => {
  const result = await customerService.getCustomerSegmentation();
  res.json({ message: "Done", data: result });
});

export const getCustomerStats = asyncHandler(async (req, res) => {
  const result = await customerService.getCustomerStats();
  successResponse({ res, data: result, status: 200 });
});
