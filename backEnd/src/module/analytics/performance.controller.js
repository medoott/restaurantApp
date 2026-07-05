import { asyncHandler } from "../../util/error/error.js";
import * as performanceService from "./service/performance.service.js";

export const kitchenPerformance = asyncHandler(async (req, res) => {
  const data = await performanceService.getKitchenPerformance(req.query);
  res.json(data);
});

export const waiterPerformance = asyncHandler(async (req, res) => {
  const waiterId = req.query.waiterId || null;
  const data = await performanceService.getWaiterPerformance(waiterId, req.query);
  res.json(data);
});

export const cashierPerformance = asyncHandler(async (req, res) => {
  const cashierId = req.query.cashierId || null;
  const data = await performanceService.getCashierPerformance(cashierId, req.query);
  res.json(data);
});

export const restaurantOverview = asyncHandler(async (req, res) => {
  const data = await performanceService.getRestaurantOverview(req.query);
  res.json(data);
});
