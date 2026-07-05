import Shortage, { SHORTAGE_STATUSES } from "../../../DB/model/Shortage.model.js";
import InventoryItem from "../../../DB/model/InventoryItem.model.js";
import { AppError } from "../../../util/error/AppError.js";
import { escapeRegExp } from "../../../util/string/escape-regexp.js";

export const listShortages = async (query = {}) => {
  const page = Math.max(Number(query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(query.limit) || 10, 1), 100);
  const search = String(query.search || "").trim();
  const status = String(query.status || "").trim();
  const type = String(query.type || "").trim();

  const filter = {};
  if (search) {
    const regex = new RegExp(escapeRegExp(search), "i");
    filter.$or = [
      { item: regex },
      { message: regex },
      { createdBy: regex },
    ];
  }

  if (status && status !== "All") {
    filter.status = status;
  }

  const [items, total] = await Promise.all([
    Shortage.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Shortage.countDocuments(filter),
  ]);

  return {
    items,
    meta: { page, limit, total, pages: Math.max(Math.ceil(total / limit), 1) },
  };
};

export const getShortageById = async (id) => {
  const shortage = await Shortage.findById(id).lean();
  if (!shortage) throw new AppError("Shortage record not found", 404);
  return shortage;
};

export const resolveShortage = async (id, resolvedBy = null) => {
  const shortage = await Shortage.findById(id);
  if (!shortage) throw new AppError("Shortage record not found", 404);

  shortage.status = "Resolved";
  if (resolvedBy) shortage.resolvedBy = resolvedBy;
  shortage.resolvedAt = new Date();
  await shortage.save();

  if (shortage.inventoryItemId) {
    const item = await InventoryItem.findById(shortage.inventoryItemId);
    if (item) {
      item.currentStock += shortage.quantityNeeded;
      item.lastRestockDate = new Date();
      item.movements.push({
        type: "restock",
        qty: shortage.quantityNeeded,
        beforeStock: item.currentStock - shortage.quantityNeeded,
        afterStock: item.currentStock,
        date: new Date(),
        note: `Auto-restock from shortage resolution: ${shortage.message}`,
      });
      await item.save();
    }
  }

  return shortage;
};

export const dismissShortage = async (id, resolvedBy = null) => {
  const shortage = await Shortage.findById(id);
  if (!shortage) throw new AppError("Shortage record not found", 404);

  shortage.status = "Dismissed";
  if (resolvedBy) shortage.resolvedBy = resolvedBy;
  shortage.resolvedAt = new Date();
  await shortage.save();

  return shortage;
};

export const createShortageService = async (payload = {}) => {
  const {
    item = "",
    inventoryItemId = null,
    quantityNeeded = 1,
    message = "Need restock",
    createdBy = "Cook",
  } = payload;

  const resolvedItem = String(item).trim();
  const resolvedMessage = String(message || "Need restock").trim() || "Need restock";
  const resolvedCreatedBy = String(createdBy || "Cook").trim() || "Cook";
  const resolvedQuantity = Math.max(Number(quantityNeeded) || 1, 1);

  if (!resolvedItem) {
    throw new AppError("Item name is required", 400);
  }

  const shortage = await Shortage.create({
    item: resolvedItem,
    inventoryItemId: inventoryItemId || undefined,
    quantityNeeded: resolvedQuantity,
    message: resolvedMessage,
    createdBy: resolvedCreatedBy,
  });

  if (inventoryItemId) {
    const invItem = await InventoryItem.findById(inventoryItemId);
    if (invItem) {
      invItem.movements.push({
        type: "wastage",
        qty: 0,
        beforeStock: invItem.currentStock,
        afterStock: invItem.currentStock,
        date: new Date(),
        note: `Shortage reported: ${resolvedMessage}`,
      });
      await invItem.save();
    }
  }

  return shortage;
};

export const getShortageReports = async (period = "monthly") => {
  const now = new Date();
  const periods = { daily: 1, weekly: 7, monthly: 30, yearly: 365 };
  const days = periods[period] || 30;
  const since = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

  const pipeline = [
    { $match: { createdAt: { $gte: since } } },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
        count: { $sum: 1 },
        totalQuantity: { $sum: "$quantityNeeded" },
        pendingCount: { $sum: { $cond: [{ $eq: ["$status", "Pending"] }, 1, 0] } },
        resolvedCount: { $sum: { $cond: [{ $eq: ["$status", "Resolved"] }, 1, 0] } },
      },
    },
    { $sort: { _id: 1 } },
  ];

  const dailyBreakdown = await Shortage.aggregate(pipeline);

  const topMissing = await Shortage.aggregate([
    { $match: { createdAt: { $gte: since } } },
    {
      $group: {
        _id: "$item",
        totalReports: { $sum: 1 },
        totalQuantityNeeded: { $sum: "$quantityNeeded" },
        lastReported: { $max: "$createdAt" },
      },
    },
    { $sort: { totalReports: -1 } },
    { $limit: 20 },
  ]);

  const pendingCount = await Shortage.countDocuments({
    status: "Pending",
    createdAt: { $gte: since },
  });

  const resolvedCount = await Shortage.countDocuments({
    status: "Resolved",
    createdAt: { $gte: since },
  });

  const dismissedCount = await Shortage.countDocuments({
    status: "Dismissed",
    createdAt: { $gte: since },
  });

  const totalCount = pendingCount + resolvedCount + dismissedCount;

  return {
    periodDays: days,
    period,
    summary: {
      total: totalCount,
      pending: pendingCount,
      resolved: resolvedCount,
      dismissed: dismissedCount,
    },
    dailyBreakdown,
    topMissingItems: topMissing,
    resolutionRate: totalCount > 0
      ? Number(((resolvedCount / totalCount) * 100).toFixed(1))
      : 0,
  };
};

export const getConsumptionReport = async (days = 30) => {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const items = await InventoryItem.find({
    "movements.date": { $gte: since },
  }).lean();

  const consumptionByItem = [];
  const restockByItem = [];
  const dailyConsumption = {};

  for (const item of items) {
    let totalReduced = 0;
    let totalRestocked = 0;
    let restockCount = 0;

    for (const m of item.movements) {
      if (new Date(m.date) < since) continue;

      if (m.type === "reduce" || m.type === "wastage") {
        totalReduced += m.qty;
        const day = new Date(m.date).toISOString().slice(0, 10);
        if (!dailyConsumption[day]) dailyConsumption[day] = 0;
        dailyConsumption[day] += m.qty;
      }
      if (m.type === "restock") {
        totalRestocked += m.qty;
        restockCount++;
      }
    }

    if (totalReduced > 0) {
      consumptionByItem.push({ name: item.name, qty: totalReduced, unit: item.unit, category: item.category });
    }
    if (restockCount > 0) {
      restockByItem.push({ name: item.name, count: restockCount, qty: totalRestocked, unit: item.unit });
    }
  }

  consumptionByItem.sort((a, b) => b.qty - a.qty);
  restockByItem.sort((a, b) => b.count - a.count);

  const dailyTrend = Object.entries(dailyConsumption)
    .map(([date, qty]) => ({ date, qty }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    days,
    mostConsumed: consumptionByItem.slice(0, 20),
    mostRestocked: restockByItem.slice(0, 20),
    dailyTrend,
    totalItemsTracked: items.length,
  };
};

export const getShortageStats = async () => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [todayShortages, weekShortages, monthShortages, pendingCount] = await Promise.all([
    Shortage.countDocuments({ createdAt: { $gte: today } }),
    Shortage.countDocuments({ createdAt: { $gte: weekAgo } }),
    Shortage.countDocuments({ createdAt: { $gte: monthAgo } }),
    Shortage.countDocuments({ status: "Pending" }),
  ]);

  const topPending = await Shortage.find({ status: "Pending" })
    .sort({ createdAt: -1 })
    .limit(5)
    .lean();

  return {
    todayShortages,
    weekShortages,
    monthShortages,
    pendingCount,
    topPending,
  };
};
