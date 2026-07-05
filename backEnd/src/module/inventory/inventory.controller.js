import * as inventoryService from "./service/inventory.service.js";
import * as inventoryUpgradeService from "./service/inventory.upgrade.service.js";
import { asyncHandler } from "../../util/error/error.js";
import { successResponse } from "../../util/response/success.res.js";

export const listItems = asyncHandler(async (req, res) => {
  const result = await inventoryService.listInventoryItems(req.query);
  successResponse({ res, data: result, status: 200 });
});

export const getItem = asyncHandler(async (req, res) => {
  const item = await inventoryService.getInventoryItemById(req.params.id);
  successResponse({ res, data: item, status: 200 });
});

export const createItem = asyncHandler(async (req, res) => {
  const item = await inventoryService.createInventoryItem({ ...req.body, userId: req.user?._id });
  successResponse({ res, data: item, status: 201 });
});

export const updateItem = asyncHandler(async (req, res) => {
  const item = await inventoryService.updateInventoryItem(req.params.id, req.body);
  successResponse({ res, data: item, status: 200 });
});

export const deleteItem = asyncHandler(async (req, res) => {
  await inventoryService.deleteInventoryItem(req.params.id);
  successResponse({ res, message: "Inventory item deleted.", status: 200 });
});

export const addStock = asyncHandler(async (req, res) => {
  const item = await inventoryService.addStock(req.params.id, { ...req.body, userId: req.user?._id });
  successResponse({ res, data: item, status: 200 });
});

export const reduceStock = asyncHandler(async (req, res) => {
  const item = await inventoryService.reduceStock(req.params.id, { ...req.body, userId: req.user?._id });
  successResponse({ res, data: item, status: 200 });
});

export const adjustStock = asyncHandler(async (req, res) => {
  const item = await inventoryService.adjustStock(req.params.id, { ...req.body, userId: req.user?._id });
  successResponse({ res, data: item, status: 200 });
});

export const transferStock = asyncHandler(async (req, res) => {
  const result = await inventoryService.transferStock({ ...req.body, userId: req.user?._id });
  successResponse({ res, data: result, status: 200 });
});

export const getSummary = asyncHandler(async (req, res) => {
  const summary = await inventoryService.getInventorySummary();
  successResponse({ res, data: summary, status: 200 });
});

export const getAlerts = asyncHandler(async (req, res) => {
  const alerts = await inventoryService.getInventoryAlerts();
  successResponse({ res, data: alerts, status: 200 });
});

export const getAnalytics = asyncHandler(async (req, res) => {
  const analytics = await inventoryService.getInventoryAnalytics(req.query.period || "monthly");
  successResponse({ res, data: analytics, status: 200 });
});

export const getConsumptionTrends = asyncHandler(async (req, res) => {
  const trends = await inventoryService.getInventoryConsumptionTrends(Number(req.query.days) || 30);
  successResponse({ res, data: trends, status: 200 });
});

export const getStockDistribution = asyncHandler(async (req, res) => {
  const dist = await inventoryService.getStockLevelDistribution();
  successResponse({ res, data: dist, status: 200 });
});

export const recordWaste = asyncHandler(async (req, res) => {
  const result = await inventoryUpgradeService.recordWaste({ ...req.body, userId: req.user?._id });
  successResponse({ res, data: result, status: 201 });
});

export const performStockCount = asyncHandler(async (req, res) => {
  const result = await inventoryUpgradeService.performStockCount({ ...req.body, userId: req.user?._id });
  successResponse({ res, data: result, status: 200 });
});

export const getInventoryValue = asyncHandler(async (req, res) => {
  const result = await inventoryUpgradeService.getInventoryValue(req.query);
  successResponse({ res, data: result, status: 200 });
});

export const getMostConsumedIngredients = asyncHandler(async (req, res) => {
  const result = await inventoryUpgradeService.getMostConsumedIngredients(req.query);
  successResponse({ res, data: result, status: 200 });
});

export const getInventoryUsageTrends = asyncHandler(async (req, res) => {
  const result = await inventoryUpgradeService.getInventoryUsageTrends(req.query);
  successResponse({ res, data: result, status: 200 });
});

export const exportInventoryReport = asyncHandler(async (req, res) => {
  const result = await inventoryUpgradeService.exportInventoryReport(req.query);
  successResponse({ res, data: result, status: 200 });
});

export const getExpiredItems = asyncHandler(async (req, res) => {
  const result = await inventoryUpgradeService.getExpiredItems();
  successResponse({ res, data: result, status: 200 });
});

export const getNearExpirationItems = asyncHandler(async (req, res) => {
  const result = await inventoryUpgradeService.getNearExpirationItems(req.query);
  successResponse({ res, data: result, status: 200 });
});
