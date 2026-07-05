import InventoryItem, { MOVEMENT_TYPES } from "../../../DB/model/InventoryItem.model.js";
import { AppError } from "../../../util/error/AppError.js";

export const recordWaste = async (id, payload = {}) => {
  const { qty = 0, reason = "", userId = null } = payload;
  const amount = Math.max(Number(qty) || 0, 0);
  if (amount <= 0) throw new AppError("Waste quantity must be greater than 0.", 400);

  const item = await InventoryItem.findById(id);
  if (!item) throw new AppError("Inventory item not found.", 404);
  if (item.currentStock < amount) throw new AppError("Insufficient stock to record waste.", 400);

  const before = item.currentStock;
  item.currentStock -= amount;
  item.movements.push({
    type: "wastage",
    qty: amount,
    beforeStock: before,
    afterStock: item.currentStock,
    date: new Date(),
    note: String(reason || "Wastage recorded").trim(),
    userId,
  });

  await item.save();
  return item;
};

export const performStockCount = async (id, payload = {}) => {
  const { countedStock = 0, userId = null } = payload;
  const target = Math.max(Number(countedStock) || 0, 0);

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
    note: `Manual stock count: adjusted from ${before} to ${target}`,
    userId,
  });

  await item.save();
  return item;
};

export const getInventoryValue = async () => {
  const items = await InventoryItem.find()
    .select("name category currentStock costPerUnit unit")
    .lean();

  let totalValue = 0;
  const byCategory = {};

  for (const item of items) {
    const costPerUnit = Number(item.costPerUnit) || 0;
    const value = item.currentStock * costPerUnit;
    totalValue += value;

    const cat = item.category || "Uncategorized";
    if (!byCategory[cat]) byCategory[cat] = { items: 0, stock: 0, value: 0 };
    byCategory[cat].items += 1;
    byCategory[cat].stock += item.currentStock;
    byCategory[cat].value += value;
  }

  return {
    totalValue: Number(totalValue.toFixed(2)),
    currency: "EGP",
    itemCount: items.length,
    byCategory: Object.entries(byCategory)
      .map(([name, data]) => ({ category: name, ...data, value: Number(data.value.toFixed(2)) }))
      .sort((a, b) => b.value - a.value),
    items: items.map((i) => ({
      name: i.name,
      category: i.category,
      currentStock: i.currentStock,
      costPerUnit: Number(i.costPerUnit) || 0,
      value: Number((i.currentStock * (Number(i.costPerUnit) || 0)).toFixed(2)),
      unit: i.unit,
    })),
  };
};

export const getMostConsumedIngredients = async (days = 30) => {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const items = await InventoryItem.find({ "movements.date": { $gte: since } })
    .select("name category unit movements")
    .lean();

  const consumptionMap = {};

  for (const item of items) {
    let total = 0;
    for (const m of item.movements) {
      if (new Date(m.date) < since) continue;
      if (m.type === "reduce" || m.type === "wastage") {
        total += m.qty;
      }
    }
    if (total > 0) {
      consumptionMap[item.name] = {
        name: item.name,
        category: item.category,
        unit: item.unit,
        totalConsumed: total,
      };
    }
  }

  return Object.values(consumptionMap)
    .sort((a, b) => b.totalConsumed - a.totalConsumed)
    .slice(0, 50);
};

export const getInventoryUsageTrends = async (days = 30) => {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const items = await InventoryItem.find({ "movements.date": { $gte: since } })
    .select("name category unit movements")
    .lean();

  const dailyMap = {};
  const weeklyMap = {};
  const categoryMap = {};

  for (const item of items) {
    for (const m of item.movements) {
      if (new Date(m.date) < since) continue;
      if (m.type !== "reduce" && m.type !== "wastage") continue;

      const d = new Date(m.date);
      const dayKey = d.toISOString().slice(0, 10);

      const weekStart = new Date(d);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      const weekKey = weekStart.toISOString().slice(0, 10);

      if (!dailyMap[dayKey]) dailyMap[dayKey] = 0;
      dailyMap[dayKey] += m.qty;

      if (!weeklyMap[weekKey]) weeklyMap[weekKey] = 0;
      weeklyMap[weekKey] += m.qty;

      const cat = item.category || "Uncategorized";
      if (!categoryMap[cat]) categoryMap[cat] = 0;
      categoryMap[cat] += m.qty;
    }
  }

  return {
    days,
    daily: Object.entries(dailyMap)
      .map(([date, qty]) => ({ date, qty }))
      .sort((a, b) => a.date.localeCompare(b.date)),
    weekly: Object.entries(weeklyMap)
      .map(([week, qty]) => ({ week, qty }))
      .sort((a, b) => a.week.localeCompare(b.week)),
    byCategory: Object.entries(categoryMap)
      .map(([name, qty]) => ({ name, qty }))
      .sort((a, b) => b.qty - a.qty),
  };
};

export const exportInventoryReport = async (format = "csv") => {
  const items = await InventoryItem.find()
    .select("name category currentStock minStockLevel maxStockLevel unit status supplier costPerUnit expirationDate")
    .lean();

  const now = new Date();
  const rows = items.map((i) => {
    let status;
    if (i.expirationDate && i.expirationDate <= now) status = "expired";
    else if (i.currentStock <= 0) status = "out_of_stock";
    else if (i.currentStock <= (i.minStockLevel || 0) * 0.25) status = "critical";
    else if (i.currentStock <= (i.minStockLevel || 0)) status = "low_stock";
    else status = "in_stock";

    return {
      name: i.name,
      category: i.category,
      currentStock: i.currentStock,
      minStockLevel: i.minStockLevel,
      maxStockLevel: i.maxStockLevel,
      unit: i.unit,
      status,
      supplier: i.supplier || "",
      costPerUnit: Number(i.costPerUnit) || 0,
      value: Number((i.currentStock * (Number(i.costPerUnit) || 0)).toFixed(2)),
      expirationDate: i.expirationDate ? i.expirationDate.toISOString().slice(0, 10) : "",
    };
  });

  if (format === "csv") {
    const headers = ["name", "category", "currentStock", "minStockLevel", "maxStockLevel", "unit", "status", "supplier", "costPerUnit", "value", "expirationDate"];
    const csvLines = [headers.join(",")];

    for (const row of rows) {
      csvLines.push(headers.map((h) => {
        const val = String(row[h] ?? "");
        return val.includes(",") || val.includes('"') ? `"${val.replace(/"/g, '""')}"` : val;
      }).join(","));
    }

    return { format: "csv", data: csvLines.join("\n"), rows: rows.length };
  }

  return { format: "json", data: rows, rows: rows.length };
};

export const getExpiredItems = async (query = {}) => {
  const now = new Date();
  const page = Math.max(Number(query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(query.limit) || 50, 1), 200);

  const filter = { expirationDate: { $lte: now } };
  const [items, total] = await Promise.all([
    InventoryItem.find(filter)
      .select("name category currentStock unit expirationDate supplier")
      .sort({ expirationDate: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    InventoryItem.countDocuments(filter),
  ]);

  return {
    items: items.map((i) => ({
      ...i,
      daysExpired: Math.floor((now - new Date(i.expirationDate)) / (1000 * 60 * 60 * 24)),
    })),
    meta: { page, limit, total, pages: Math.max(Math.ceil(total / limit), 1) },
  };
};

export const getNearExpirationItems = async (days = 7, query = {}) => {
  const now = new Date();
  const threshold = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  const page = Math.max(Number(query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(query.limit) || 50, 1), 200);

  const filter = { expirationDate: { $gt: now, $lte: threshold } };
  const [items, total] = await Promise.all([
    InventoryItem.find(filter)
      .select("name category currentStock unit expirationDate supplier")
      .sort({ expirationDate: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    InventoryItem.countDocuments(filter),
  ]);

  return {
    items: items.map((i) => ({
      ...i,
      daysUntilExpiration: Math.ceil((new Date(i.expirationDate) - now) / (1000 * 60 * 60 * 24)),
    })),
    meta: { page, limit, total, pages: Math.max(Math.ceil(total / limit), 1) },
  };
};
