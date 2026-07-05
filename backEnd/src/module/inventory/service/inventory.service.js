import InventoryItem, { UNITS, MOVEMENT_TYPES } from "../../../DB/model/InventoryItem.model.js";
import { AppError } from "../../../util/error/AppError.js";
import { escapeRegExp } from "../../../util/string/escape-regexp.js";

const STATUS_LABELS = {
  in_stock: { label: "In Stock", color: "text-emerald-600 bg-emerald-50" },
  low_stock: { label: "Low Stock", color: "text-amber-600 bg-amber-50" },
  critical: { label: "Critical", color: "text-rose-600 bg-rose-50" },
  out_of_stock: { label: "Out of Stock", color: "text-red-700 bg-red-50" },
  expired: { label: "Expired", color: "text-stone-600 bg-stone-100" },
  near_expiration: { label: "Near Expiration", color: "text-orange-600 bg-orange-50" },
};

const STATUS_FILTERS = {
  in_stock: (now) => ({
    $expr: { $gt: ["$currentStock", "$minStockLevel"] },
    $or: [
      { expirationDate: { $exists: false } },
      { expirationDate: null },
      { expirationDate: { $gt: now } },
    ],
  }),
  low_stock: () => ({
    $and: [
      { $expr: { $lte: ["$currentStock", "$minStockLevel"] } },
      { $expr: { $gt: ["$currentStock", { $multiply: ["$minStockLevel", 0.25] }] } },
      { currentStock: { $gt: 0 } },
    ],
  }),
  critical: () => ({
    $and: [
      { $expr: { $lte: ["$currentStock", { $multiply: ["$minStockLevel", 0.25] }] } },
      { currentStock: { $gt: 0 } },
    ],
  }),
  out_of_stock: () => ({ currentStock: { $lte: 0 } }),
  expired: (now) => ({ expirationDate: { $lte: now } }),
  near_expiration: (now) => {
    const threshold = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    return { expirationDate: { $gt: now, $lte: threshold } };
  },
};

export const listInventoryItems = async (query = {}) => {
  const page = Math.max(Number(query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(query.limit) || 50, 1), 200);
  const search = String(query.search || "").trim();
  const category = String(query.category || "").trim();
  const supplier = String(query.supplier || "").trim();
  const status = String(query.status || "").trim();
  const dateFrom = query.dateFrom ? new Date(query.dateFrom) : null;
  const dateTo = query.dateTo ? new Date(query.dateTo) : null;

  const filter = {};
  if (search) {
    const regex = new RegExp(escapeRegExp(search), "i");
    filter.$or = [{ name: regex }, { category: regex }, { supplier: regex }];
  }
  if (category) filter.category = category;
  if (supplier) filter.supplier = { $regex: new RegExp(escapeRegExp(supplier), "i") };
  if (dateFrom || dateTo) {
    filter.expirationDate = {};
    if (dateFrom) filter.expirationDate.$gte = dateFrom;
    if (dateTo) filter.expirationDate.$lte = dateTo;
  }
  if (status && STATUS_FILTERS[status]) {
    Object.assign(filter, STATUS_FILTERS[status](new Date()));
  }

  const [items, total] = await Promise.all([
    InventoryItem.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    InventoryItem.countDocuments(filter),
  ]);

  return {
    items,
    meta: { page, limit, total, pages: Math.max(Math.ceil(total / limit), 1) },
  };
};

export const getInventoryItemById = async (id) => {
  const item = await InventoryItem.findById(id).lean();
  if (!item) throw new AppError("Inventory item not found.", 404);
  return item;
};

export const createInventoryItem = async (payload = {}) => {
  const { name, category, currentStock, minStockLevel, maxStockLevel, unit, supplier, expirationDate, notes } = payload;

  if (!name || !String(name).trim()) throw new AppError("Item name is required.", 400);

  const existing = await InventoryItem.findOne({ name: { $regex: new RegExp(`^${escapeRegExp(String(name).trim())}$`, "i") } }).lean();
  if (existing) throw new AppError("An item with this name already exists.", 409);

  const item = await InventoryItem.create({
    name: String(name).trim(),
    category: String(category || "Uncategorized").trim(),
    currentStock: Math.max(Number(currentStock) || 0, 0),
    minStockLevel: Math.max(Number(minStockLevel) || 10, 0),
    maxStockLevel: Math.max(Number(maxStockLevel) || 100, 0),
    unit: UNITS.includes(unit) ? unit : "pcs",
    supplier: String(supplier || "").trim(),
    lastRestockDate: currentStock > 0 ? new Date() : null,
    expirationDate: expirationDate ? new Date(expirationDate) : null,
    notes: String(notes || "").trim(),
  });

  if (currentStock > 0) {
    item.movements.push({
      type: "restock",
      qty: Number(currentStock),
      beforeStock: 0,
      afterStock: Number(currentStock),
      date: new Date(),
      note: "Initial stock",
    });
    await item.save();
  }

  return item;
};

export const updateInventoryItem = async (id, payload = {}) => {
  const item = await InventoryItem.findById(id);
  if (!item) throw new AppError("Inventory item not found.", 404);

  const allowed = ["name", "category", "minStockLevel", "maxStockLevel", "unit", "supplier", "expirationDate", "notes"];
  for (const field of allowed) {
    if (payload[field] !== undefined) {
      if (field === "name") item[field] = String(payload[field]).trim();
      else if (field === "minStockLevel" || field === "maxStockLevel") item[field] = Math.max(Number(payload[field]) || 0, 0);
      else if (field === "expirationDate") item[field] = payload[field] ? new Date(payload[field]) : null;
      else item[field] = payload[field];
    }
  }

  await item.save();
  return item;
};

export const deleteInventoryItem = async (id) => {
  const item = await InventoryItem.findByIdAndDelete(id).lean();
  if (!item) throw new AppError("Inventory item not found.", 404);
  return { message: "Inventory item deleted." };
};

export const addStock = async (id, payload = {}) => {
  const { qty = 0, note = "", userId = null } = payload;
  const amount = Math.max(Number(qty) || 0, 0);
  if (amount <= 0) throw new AppError("Quantity must be greater than 0.", 400);

  const item = await InventoryItem.findById(id);
  if (!item) throw new AppError("Inventory item not found.", 404);

  const before = item.currentStock;
  item.currentStock += amount;
  item.lastRestockDate = new Date();
  item.movements.push({
    type: "restock",
    qty: amount,
    beforeStock: before,
    afterStock: item.currentStock,
    date: new Date(),
    note: String(note || "").trim(),
    userId,
  });

  await item.save();
  return item;
};

export const reduceStock = async (id, payload = {}) => {
  const { qty = 0, note = "", userId = null } = payload;
  const amount = Math.max(Number(qty) || 0, 0);
  if (amount <= 0) throw new AppError("Quantity must be greater than 0.", 400);

  const item = await InventoryItem.findById(id);
  if (!item) throw new AppError("Inventory item not found.", 404);
  if (item.currentStock < amount) throw new AppError("Insufficient stock.", 400);

  const before = item.currentStock;
  item.currentStock -= amount;
  item.movements.push({
    type: "reduce",
    qty: amount,
    beforeStock: before,
    afterStock: item.currentStock,
    date: new Date(),
    note: String(note || "").trim(),
    userId,
  });

  await item.save();
  return item;
};

export const adjustStock = async (id, payload = {}) => {
  const { newStock = 0, note = "", userId = null } = payload;
  const target = Math.max(Number(newStock) || 0, 0);

  const item = await InventoryItem.findById(id);
  if (!item) throw new AppError("Inventory item not found.", 404);

  const before = item.currentStock;
  const diff = target - before;
  item.currentStock = target;
  if (diff > 0) item.lastRestockDate = new Date();
  item.movements.push({
    type: "adjustment",
    qty: Math.abs(diff),
    beforeStock: before,
    afterStock: item.currentStock,
    date: new Date(),
    note: String(note || `Adjusted from ${before} to ${target}`).trim(),
    userId,
  });

  await item.save();
  return item;
};

export const transferStock = async (payload = {}) => {
  const { fromId, toId, qty = 0, note = "", userId = null } = payload;
  const amount = Math.max(Number(qty) || 0, 0);
  if (amount <= 0) throw new AppError("Quantity must be greater than 0.", 400);
  if (!fromId || !toId) throw new AppError("Both source and destination items are required.", 400);
  if (fromId === toId) throw new AppError("Cannot transfer to the same item.", 400);

  const from = await InventoryItem.findById(fromId);
  const to = await InventoryItem.findById(toId);
  if (!from || !to) throw new AppError("Inventory item not found.", 404);
  if (from.currentStock < amount) throw new AppError("Insufficient stock in source item.", 400);

  const fromBefore = from.currentStock;
  from.currentStock -= amount;
  from.movements.push({
    type: "transfer_out",
    qty: amount,
    beforeStock: fromBefore,
    afterStock: from.currentStock,
    date: new Date(),
    note: String(note || `Transferred to ${to.name}`).trim(),
    userId,
  });

  const toBefore = to.currentStock;
  to.currentStock += amount;
  to.movements.push({
    type: "transfer_in",
    qty: amount,
    beforeStock: toBefore,
    afterStock: to.currentStock,
    date: new Date(),
    note: String(note || `Transferred from ${from.name}`).trim(),
    userId,
  });

  await Promise.all([from.save(), to.save()]);
  return { from: from, to: to };
};

export const getInventorySummary = async () => {
  const items = await InventoryItem.find().lean();
  const now = new Date();
  const threeDays = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

  return {
    total: items.length,
    lowStock: items.filter((i) => i.currentStock <= i.minStockLevel && i.currentStock > i.minStockLevel * 0.25 && i.currentStock > 0).length,
    outOfStock: items.filter((i) => i.currentStock <= 0).length,
    critical: items.filter((i) => i.currentStock <= i.minStockLevel * 0.25 && i.currentStock > 0).length,
    expired: items.filter((i) => i.expirationDate && i.expirationDate <= now).length,
    nearExpiration: items.filter((i) => i.expirationDate && i.expirationDate > now && i.expirationDate <= threeDays).length,
  };
};

export const getInventoryAlerts = async () => {
  const items = await InventoryItem.find().lean();
  const now = new Date();
  const threeDays = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
  const alerts = [];

  for (const item of items) {
    if (item.currentStock <= 0) {
      alerts.push({ type: "out_of_stock", severity: "critical", item: item.name, message: `${item.name} is out of stock.` });
    } else if (item.currentStock <= item.minStockLevel * 0.25) {
      alerts.push({ type: "critical", severity: "high", item: item.name, message: `${item.name} is at critical level (${item.currentStock} ${item.unit}).` });
    } else if (item.currentStock <= item.minStockLevel) {
      alerts.push({ type: "low_stock", severity: "medium", item: item.name, message: `${item.name} is low (${item.currentStock}/${item.minStockLevel} ${item.unit}).` });
    }
    if (item.expirationDate && item.expirationDate <= now) {
      alerts.push({ type: "expired", severity: "critical", item: item.name, message: `${item.name} expired on ${item.expirationDate.toLocaleDateString()}.` });
    } else if (item.expirationDate && item.expirationDate <= threeDays) {
      alerts.push({ type: "near_expiration", severity: "high", item: item.name, message: `${item.name} expires on ${item.expirationDate.toLocaleDateString()}.` });
    }
  }

  return alerts.sort((a, b) => ({ critical: 0, high: 1, medium: 2 }[a.severity] || 3) - ({ critical: 0, high: 1, medium: 2 }[b.severity] || 3));
};

export const getInventoryAnalytics = async (period = "monthly") => {
  const items = await InventoryItem.find().lean();
  const now = new Date();
  const periods = { daily: 1, weekly: 7, monthly: 30, yearly: 365 };
  const days = periods[period] || 30;
  const since = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

  const consumption = [];
  const restockFrequency = [];
  const usageByCategory = {};

  for (const item of items) {
    const recentMovements = item.movements.filter((m) => new Date(m.date) >= since);
    const totalReduced = recentMovements.filter((m) => m.type === "reduce" || m.type === "wastage").reduce((s, m) => s + m.qty, 0);
    const totalRestocked = recentMovements.filter((m) => m.type === "restock").reduce((s, m) => s + m.qty, 0);
    const restockCount = recentMovements.filter((m) => m.type === "restock").length;

    if (totalReduced > 0) consumption.push({ name: item.name, qty: totalReduced, unit: item.unit });
    if (restockCount > 0) restockFrequency.push({ name: item.name, count: restockCount, qty: totalRestocked, unit: item.unit });

    const cat = item.category || "Uncategorized";
    if (!usageByCategory[cat]) usageByCategory[cat] = { reduced: 0, restocked: 0 };
    usageByCategory[cat].reduced += totalReduced;
    usageByCategory[cat].restocked += totalRestocked;
  }

  consumption.sort((a, b) => b.qty - a.qty);
  restockFrequency.sort((a, b) => b.count - a.count);

  return {
    consumption: consumption.slice(0, 20),
    restockFrequency: restockFrequency.slice(0, 20),
    usageByCategory,
    periodDays: days,
    totalItems: items.length,
  };
};

export const getInventoryConsumptionTrends = async (days = 30) => {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const items = await InventoryItem.find({ "movements.date": { $gte: since } })
    .select("name category unit movements")
    .lean();

  const dailyMap = {};
  const categoryMap = {};
  const itemConsumption = [];

  for (const item of items) {
    let total = 0;
    for (const m of item.movements) {
      if (new Date(m.date) < since) continue;
      if (m.type !== "reduce" && m.type !== "wastage") continue;

      total += m.qty;
      const day = new Date(m.date).toISOString().slice(0, 10);
      if (!dailyMap[day]) dailyMap[day] = {};
      if (!dailyMap[day][item.category || "Uncategorized"]) dailyMap[day][item.category || "Uncategorized"] = 0;
      dailyMap[day][item.category || "Uncategorized"] += m.qty;

      const cat = item.category || "Uncategorized";
      if (!categoryMap[cat]) categoryMap[cat] = 0;
      categoryMap[cat] += m.qty;
    }
    if (total > 0) {
      itemConsumption.push({ name: item.name, qty: total, unit: item.unit });
    }
  }

  itemConsumption.sort((a, b) => b.qty - a.qty);

  const dailyTrend = Object.entries(dailyMap)
    .map(([date, cats]) => ({ date, ...cats }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    days,
    dailyTrend,
    byCategory: Object.entries(categoryMap).map(([name, qty]) => ({ name, qty })).sort((a, b) => b.qty - a.qty),
    topItems: itemConsumption.slice(0, 20),
  };
};

export const getStockLevelDistribution = async () => {
  const items = await InventoryItem.find().select("name category currentStock minStockLevel maxStockLevel unit").lean();

  return {
    total: items.length,
    items: items.map((i) => ({
      name: i.name,
      category: i.category,
      currentStock: i.currentStock,
      minStockLevel: i.minStockLevel,
      maxStockLevel: i.maxStockLevel,
      unit: i.unit,
    })),
  };
};

export { STATUS_LABELS };
