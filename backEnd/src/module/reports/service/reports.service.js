import Order, { ORDER_STATUSES } from "../../../DB/model/Order.model.js";
import Product from "../../../DB/model/Product.model.js";
import InventoryItem from "../../../DB/model/InventoryItem.model.js";
import CustomerProfile from "../../../DB/model/CustomerProfile.model.js";
import User from "../../../DB/model/User.model.js";
import Table from "../../../DB/model/Table.model.js";
import TableSession from "../../../DB/model/TableSession.model.js";
import { AppError } from "../../../util/error/AppError.js";

const getDateRange = (period, startDate, endDate) => {
  const now = new Date();
  let start, end;

  if (startDate && endDate) {
    start = new Date(startDate);
    end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
  } else {
    end = new Date(now);
    end.setHours(23, 59, 59, 999);

    switch (period) {
      case "daily":
        start = new Date(now);
        start.setHours(0, 0, 0, 0);
        break;
      case "weekly":
        start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        start.setHours(0, 0, 0, 0);
        break;
      case "monthly":
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case "yearly":
        start = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        start = new Date(now.getFullYear(), now.getMonth(), 1);
    }
  }

  const previousEnd = new Date(start);
  previousEnd.setMilliseconds(previousEnd.getMilliseconds() - 1);
  const duration = end.getTime() - start.getTime();
  const previousStart = new Date(previousEnd.getTime() - duration);

  return { start, end, previousStart, previousEnd };
};

const getPeriodGroupFormat = (period, date) => {
  const d = new Date(date);
  switch (period) {
    case "daily":
      return d.toISOString().slice(0, 10);
    case "weekly": {
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(d.setDate(diff));
      return monday.toISOString().slice(0, 10);
    }
    case "monthly":
      return d.toISOString().slice(0, 7);
    case "yearly":
      return String(d.getFullYear());
    default:
      return d.toISOString().slice(0, 7);
  }
};

export const getSalesReport = async ({ period = "monthly", startDate, endDate } = {}) => {
  const { start, end, previousStart, previousEnd } = getDateRange(period, startDate, endDate);

  const [currentOrders, previousOrders] = await Promise.all([
    Order.find({ createdAt: { $gte: start, $lte: end }, status: { $nin: ["Cancelled", "Rejected"] } }).lean(),
    Order.find({ createdAt: { $gte: previousStart, $lte: previousEnd }, status: { $nin: ["Cancelled", "Rejected"] } }).lean(),
  ]);

  const currentRevenue = currentOrders.reduce((s, o) => s + (o.total || 0), 0);
  const previousRevenue = previousOrders.reduce((s, o) => s + (o.total || 0), 0);
  const revenueChange = previousRevenue > 0 ? Number((((currentRevenue - previousRevenue) / previousRevenue) * 100).toFixed(1)) : 0;

  const currentCount = currentOrders.length;
  const previousCount = previousOrders.length;
  const orderChange = previousCount > 0 ? Number((((currentCount - previousCount) / previousCount) * 100).toFixed(1)) : 0;

  const trend = {};
  for (const order of currentOrders) {
    const key = getPeriodGroupFormat(period, order.createdAt);
    if (!trend[key]) trend[key] = { period: key, revenue: 0, orders: 0 };
    trend[key].revenue += order.total || 0;
    trend[key].orders += 1;
  }

  const previousTrend = {};
  for (const order of previousOrders) {
    const key = getPeriodGroupFormat(period, order.createdAt);
    if (!previousTrend[key]) previousTrend[key] = { period: key, revenue: 0, orders: 0 };
    previousTrend[key].revenue += order.total || 0;
    previousTrend[key].orders += 1;
  }

  return {
    summary: {
      currentRevenue,
      previousRevenue,
      revenueChange,
      currentOrders: currentCount,
      previousOrders: previousCount,
      orderChange,
      averageOrderValue: currentCount > 0 ? Number((currentRevenue / currentCount).toFixed(2)) : 0,
    },
    trend: Object.values(trend).sort((a, b) => a.period.localeCompare(b.period)),
    previousTrend: Object.values(previousTrend).sort((a, b) => a.period.localeCompare(b.period)),
    period,
    dateRange: { start, end },
  };
};

export const getOrdersReport = async ({ period = "monthly", startDate, endDate } = {}) => {
  const { start, end } = getDateRange(period, startDate, endDate);

  const orders = await Order.find({ createdAt: { $gte: start, $lte: end } }).lean();

  const byStatus = {};
  let totalValue = 0;
  const hourlyCount = {};

  for (const order of orders) {
    const status = order.status || "Unknown";
    byStatus[status] = (byStatus[status] || 0) + 1;
    totalValue += order.total || 0;

    const hour = new Date(order.createdAt).getHours();
    const hourKey = `${String(hour).padStart(2, "0")}:00`;
    hourlyCount[hourKey] = (hourlyCount[hourKey] || 0) + 1;
  }

  return {
    totalOrders: orders.length,
    totalRevenue: totalValue,
    averageOrderValue: orders.length > 0 ? Number((totalValue / orders.length).toFixed(2)) : 0,
    byStatus,
    peakHours: Object.entries(hourlyCount)
      .map(([hour, count]) => ({ hour, count }))
      .sort((a, b) => a.hour.localeCompare(b.hour)),
    paidOrders: orders.filter((o) => o.paymentStatus === "paid").length,
    unpaidOrders: orders.filter((o) => o.paymentStatus === "unpaid").length,
  };
};

export const getProductsReport = async ({ period = "monthly", startDate, endDate, limit = 20 } = {}) => {
  const { start, end } = getDateRange(period, startDate, endDate);
  const lim = Math.min(Math.max(Number(limit) || 20, 1), 100);

  const orders = await Order.find({ createdAt: { $gte: start, $lte: end }, status: { $nin: ["Cancelled", "Rejected"] } }).lean();

  const productSales = {};
  const categorySales = {};

  for (const order of orders) {
    const items = order.itemsDetail || [];
    for (const item of items) {
      const name = item.name || item.itemName || "Unknown";
      const category = item.category || "Uncategorized";
      const qty = Number(item.quantity || item.qty || 1);
      const price = Number(item.price || item.totalPrice || 0);

      if (!productSales[name]) productSales[name] = { name, quantity: 0, revenue: 0, category };
      productSales[name].quantity += qty;
      productSales[name].revenue += price;

      if (!categorySales[category]) categorySales[category] = { category, quantity: 0, revenue: 0 };
      categorySales[category].quantity += qty;
      categorySales[category].revenue += price;
    }
  }

  const topSelling = Object.values(productSales)
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, lim);

  const topByRevenue = Object.values(productSales)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, lim);

  return {
    topSelling,
    topByRevenue,
    categoryBreakdown: Object.values(categorySales).sort((a, b) => b.revenue - a.revenue),
    totalProductsSold: topSelling.reduce((s, p) => s + p.quantity, 0),
    totalRevenue: topSelling.reduce((s, p) => s + p.revenue, 0),
  };
};

export const getInventoryReport = async ({ period = "monthly", startDate, endDate } = {}) => {
  const { start, end } = getDateRange(period, startDate, endDate);

  const items = await InventoryItem.find().lean();

  const totalStockValue = items.reduce((s, i) => s + ((i.currentStock || 0) * (i.costPerUnit || 0)), 0);
  const totalItems = items.length;
  const lowStockItems = items.filter((i) => i.currentStock <= i.minStockLevel);
  const outOfStockItems = items.filter((i) => (i.currentStock || 0) <= 0);

  const movements = items.flatMap((i) =>
    (i.movements || [])
      .filter((m) => {
        const mDate = new Date(m.date);
        return mDate >= start && mDate <= end;
      })
      .map((m) => ({ ...m, itemName: i.name, itemCategory: i.category }))
  );

  const totalReduced = movements.filter((m) => m.type === "reduce" || m.type === "wastage").reduce((s, m) => s + Math.abs(m.qty), 0);
  const totalRestocked = movements.filter((m) => m.type === "restock").reduce((s, m) => s + Math.abs(m.qty), 0);

  const avgStock = items.reduce((s, i) => s + (i.currentStock || 0), 0) / (items.length || 1);
  const turnoverRate = avgStock > 0 ? Number((totalReduced / avgStock).toFixed(2)) : 0;

  return {
    summary: {
      totalItems,
      totalStockValue,
      lowStockCount: lowStockItems.length,
      outOfStockCount: outOfStockItems.length,
      totalReduced,
      totalRestocked,
      turnoverRate,
    },
    lowStockItems: lowStockItems.map((i) => ({
      id: i._id,
      name: i.name,
      category: i.category,
      currentStock: i.currentStock,
      minStockLevel: i.minStockLevel,
      unit: i.unit,
    })),
    movements,
  };
};

export const getCustomerReport = async ({ period = "monthly", startDate, endDate, limit = 20 } = {}) => {
  const { start, end } = getDateRange(period, startDate, endDate);
  const lim = Math.min(Math.max(Number(limit) || 20, 1), 100);

  const customers = await CustomerProfile.find().lean();
  const orders = await Order.find({ createdAt: { $gte: start, $lte: end }, status: { $nin: ["Cancelled", "Rejected"] } }).lean();

  const customerIds = new Set(orders.map((o) => o.customer).filter(Boolean));
  const newCustomers = customers.filter((c) => {
    const created = new Date(c.createdAt);
    return created >= start && created <= end;
  });

  const returningCustomers = customers.filter((c) => {
    const created = new Date(c.createdAt);
    return created < start && customerIds.has(c.name);
  });

  const customerSpending = {};
  for (const order of orders) {
    const name = order.customer || "Unknown";
    if (!customerSpending[name]) customerSpending[name] = { name, orders: 0, totalSpent: 0 };
    customerSpending[name].orders += 1;
    customerSpending[name].totalSpent += order.total || 0;
  }

  const topCustomers = Object.values(customerSpending)
    .sort((a, b) => b.totalSpent - a.totalSpent)
    .slice(0, lim);

  const totalCustomers = customers.length;
  const avgSpendPerCustomer = totalCustomers > 0
    ? Number((orders.reduce((s, o) => s + (o.total || 0), 0) / totalCustomers).toFixed(2))
    : 0;

  return {
    summary: {
      totalCustomers,
      newCustomers: newCustomers.length,
      returningCustomers: returningCustomers.length,
      activeCustomers: customerIds.size,
      totalOrders: orders.length,
      totalRevenue: orders.reduce((s, o) => s + (o.total || 0), 0),
      avgSpendPerCustomer,
    },
    topCustomers,
  };
};

export const getWaiterReport = async ({ period = "monthly", startDate, endDate, limit = 20 } = {}) => {
  const { start, end } = getDateRange(period, startDate, endDate);
  const lim = Math.min(Math.max(Number(limit) || 20, 1), 100);

  const orders = await Order.find({ createdAt: { $gte: start, $lte: end } })
    .populate("assignedWaiter", "name email")
    .lean();

  const waiterStats = {};
  for (const order of orders) {
    if (!order.assignedWaiter) continue;
    const waiterId = String(order.assignedWaiter._id);
    const waiterName = order.assignedWaiter.name;

    if (!waiterStats[waiterId]) {
      waiterStats[waiterId] = {
        waiterId,
        waiterName,
        totalOrders: 0,
        totalRevenue: 0,
        avgDeliveryTime: 0,
        deliveryTimes: [],
      };
    }

    waiterStats[waiterId].totalOrders += 1;
    waiterStats[waiterId].totalRevenue += order.total || 0;

    if (order.servedAt && order.acceptedAt) {
      const deliveryTime = (new Date(order.servedAt) - new Date(order.acceptedAt)) / (1000 * 60);
      if (deliveryTime > 0 && deliveryTime < 180) {
        waiterStats[waiterId].deliveryTimes.push(deliveryTime);
      }
    }
  }

  const waiters = Object.values(waiterStats).map((w) => ({
    ...w,
    avgDeliveryTime: w.deliveryTimes.length > 0
      ? Number((w.deliveryTimes.reduce((s, t) => s + t, 0) / w.deliveryTimes.length).toFixed(1))
      : 0,
    deliveryTimes: undefined,
  }));

  waiters.sort((a, b) => b.totalOrders - a.totalOrders);

  return {
    waiters: waiters.slice(0, lim),
    summary: {
      totalWaiters: waiters.length,
      totalOrders: waiters.reduce((s, w) => s + w.totalOrders, 0),
      totalRevenue: waiters.reduce((s, w) => s + w.totalRevenue, 0),
    },
  };
};

export const getTableReport = async ({ period = "monthly", startDate, endDate } = {}) => {
  const { start, end } = getDateRange(period, startDate, endDate);

  const tables = await Table.find().lean();
  const sessions = await TableSession.find({ startedAt: { $gte: start, $lte: end } }).lean();

  const tableUtilization = {};
  for (const table of tables) {
    const tableSessions = sessions.filter((s) => String(s.table) === String(table._id));
    const totalSessions = tableSessions.length;
    const totalOccupiedMinutes = tableSessions.reduce((sum, s) => {
      if (s.startedAt && s.closedAt) {
        return sum + (new Date(s.closedAt) - new Date(s.startedAt)) / (1000 * 60);
      }
      return sum;
    }, 0);
    const avgOccupancyTime = totalSessions > 0 ? Number((totalOccupiedMinutes / totalSessions).toFixed(1)) : 0;
    const dailyMinutes = (end - start) / (1000 * 60);
    const utilizationRate = dailyMinutes > 0
      ? Number(((totalOccupiedMinutes / (dailyMinutes * 1)) * 100).toFixed(1))
      : 0;

    tableUtilization[table.tableNumber] = {
      tableNumber: table.tableNumber,
      capacity: table.capacity,
      section: table.section,
      status: table.status,
      totalSessions,
      avgOccupancyTimeMinutes: avgOccupancyTime,
      utilizationRate,
      totalOccupiedMinutes: Number(totalOccupiedMinutes.toFixed(1)),
    };
  }

  const sortedTables = Object.values(tableUtilization).sort((a, b) => b.totalSessions - a.totalSessions);
  const avgUtilization = sortedTables.length > 0
    ? Number((sortedTables.reduce((s, t) => s + t.utilizationRate, 0) / sortedTables.length).toFixed(1))
    : 0;

  return {
    tables: sortedTables,
    summary: {
      totalTables: tables.length,
      totalSessions: sessions.length,
      averageUtilizationRate: avgUtilization,
      mostUsedTable: sortedTables[0] || null,
      leastUsedTable: sortedTables[sortedTables.length - 1] || null,
    },
  };
};

export const getPaymentReport = async ({ period = "monthly", startDate, endDate } = {}) => {
  const { start, end } = getDateRange(period, startDate, endDate);

  const orders = await Order.find({ createdAt: { $gte: start, $lte: end }, paymentStatus: { $ne: "unpaid" } }).lean();

  const byMethod = {};
  let totalProcessingTime = 0;
  let processingCount = 0;

  for (const order of orders) {
    const method = order.payment || "Unknown";
    if (!byMethod[method]) byMethod[method] = { method, count: 0, total: 0 };
    byMethod[method].count += 1;
    byMethod[method].total += order.total || 0;

    if (order.paidAt && order.createdAt) {
      const processingTime = (new Date(order.paidAt) - new Date(order.createdAt)) / (1000 * 60);
      if (processingTime > 0 && processingTime < 1440) {
        totalProcessingTime += processingTime;
        processingCount++;
      }
    }
  }

  const totalPaid = orders.reduce((s, o) => s + (o.total || 0), 0);

  return {
    byMethod: Object.values(byMethod),
    summary: {
      totalTransactions: orders.length,
      totalRevenue: totalPaid,
      avgProcessingTimeMinutes: processingCount > 0 ? Number((totalProcessingTime / processingCount).toFixed(1)) : 0,
      mostUsedMethod: Object.values(byMethod).sort((a, b) => b.count - a.count)[0]?.method || "N/A",
    },
  };
};
