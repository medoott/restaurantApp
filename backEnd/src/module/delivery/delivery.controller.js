import { asyncHandler } from "../../util/error/error.js";
import * as deliveryService from "./service/delivery.service.js";

export const assignDelivery = asyncHandler(async (req, res) => {
  const { orderId, waiterId } = req.body;
  const result = await deliveryService.assignDelivery(orderId, waiterId || null);
  res.json({ message: result.waiter ? "Waiter assigned" : result.message || "No waiter available", ...result });
});

export const acceptDelivery = asyncHandler(async (req, res) => {
  const result = await deliveryService.acceptDelivery(req.params.id, req.user._id);
  res.json(result);
});

export const confirmPickup = asyncHandler(async (req, res) => {
  const result = await deliveryService.confirmPickup(req.params.id, req.user._id);
  res.json(result);
});

export const confirmDelivery = asyncHandler(async (req, res) => {
  const result = await deliveryService.confirmDelivery(req.params.id, req.user._id);
  res.json(result);
});

export const myDeliveries = asyncHandler(async (req, res) => {
  const deliveries = await deliveryService.getWaiterDeliveries(req.user._id, req.query);
  res.json({ deliveries });
});

export const pendingDeliveries = asyncHandler(async (req, res) => {
  const deliveries = await deliveryService.getPendingDeliveries(req.query);
  res.json({ deliveries });
});

export const delayedDeliveries = asyncHandler(async (req, res) => {
  const deliveries = await deliveryService.getDelayedDeliveries();
  res.json({ deliveries });
});

export const awaitingAssignment = asyncHandler(async (req, res) => {
  const deliveries = await deliveryService.waitersAwaitingAssignment();
  res.json({ deliveries });
});

export const checkDelays = asyncHandler(async (req, res) => {
  const delayed = await deliveryService.checkDelayedDeliveries();
  res.json({ delayed, count: delayed.length });
});
