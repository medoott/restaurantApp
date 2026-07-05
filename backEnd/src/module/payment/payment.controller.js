import { asyncHandler } from "../../util/error/error.js";
import * as paymentService from "./service/paymentSession.service.js";

export const createPayment = asyncHandler(async (req, res) => {
  const { orderId, paymentMethod } = req.body;
  const session = await paymentService.createPaymentSession(orderId, req.user._id, paymentMethod);
  res.json({ message: "Payment session created", session });
});

export const processPayment = asyncHandler(async (req, res) => {
  const result = await paymentService.processPayment(req.params.id, req.user._id, req.body);
  res.json({ message: "Payment completed", ...result });
});

export const pendingPayments = asyncHandler(async (req, res) => {
  const sessions = await paymentService.getPendingPayments(req.query);
  res.json({ sessions });
});

export const paymentHistory = asyncHandler(async (req, res) => {
  const sessions = await paymentService.getPaymentHistory(req.user._id, req.query);
  res.json({ sessions });
});

export const closeTable = asyncHandler(async (req, res) => {
  const { orderId } = req.body;
  const result = await paymentService.closeTableAfterPayment(orderId);
  res.json(result);
});
