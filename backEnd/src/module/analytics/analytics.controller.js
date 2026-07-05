import Order from "../../DB/model/Order.model.js";
import Product from "../../DB/model/Product.model.js";
import Shortage from "../../DB/model/Shortage.model.js";
import { asyncHandler } from "../../util/error/error.js";

const ORDER_STATUSES = [
  "Pending",
  "Accepted",
  "Preparing",
  "Ready",
  "Served",
  "Completed",
  "Paid",
  "Cancelled",
  "Rejected",
];

const toFixedNumber = (value = 0, digits = 2) => Number(Number(value).toFixed(digits));

const buildStatusMap = (records = []) =>
  ORDER_STATUSES.reduce((acc, status) => {
    acc[status] = records.find((record) => record.status === status)?.count || 0;
    return acc;
  }, {});

const formatDuration = (value = 0) => `${value}%`;

export const getAnalytics = asyncHandler(async (_req, res) => {
  const [
    statusCounts,
    revenueAgg,
    paymentMethodsAgg,
    topProducts,
    categoryAnalysisAgg,
    shortagesAgg,
    totalOrders,
    totalProducts,
    totalShortages,
    dailyTrend,
  ] = await Promise.all([
    Order.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
      { $project: { _id: 0, status: "$_id", count: 1 } },
    ]),
    Order.aggregate([{ $group: { _id: null, revenue: { $sum: "$total" } } }]),
    Order.aggregate([
      {
        $group: {
          _id: "$payment",
          count: { $sum: 1 },
          total: { $sum: "$total" },
        },
      },
      { $project: { _id: 0, method: "$_id", count: 1, total: 1 } },
      { $sort: { total: -1 } },
    ]),
    Order.aggregate([
      { $unwind: "$itemsDetail" },
      {
        $group: {
          _id: "$itemsDetail.name",
          qty: { $sum: "$itemsDetail.qty" },
          revenue: {
            $sum: {
              $multiply: ["$itemsDetail.price", "$itemsDetail.qty"],
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          name: "$_id",
          qty: 1,
          revenue: 1,
        },
      },
      { $sort: { revenue: -1 } },
      { $limit: 10 },
    ]),
    Product.aggregate([
      {
        $group: {
          _id: "$category",
          count: { $sum: 1 },
          totalValue: { $sum: "$price" },
        },
      },
      {
        $project: {
          _id: 0,
          category: "$_id",
          count: 1,
          totalValue: 1,
          avgPrice: {
            $cond: [
              { $gt: ["$count", 0] },
              { $divide: ["$totalValue", "$count"] },
              0,
            ],
          },
        },
      },
      { $sort: { count: -1, category: 1 } },
    ]),
    Shortage.aggregate([
      {
        $group: {
          _id: "$item",
          count: { $sum: 1 },
          totalQuantityNeeded: { $sum: "$quantityNeeded" },
          lastReported: { $max: "$createdAt" },
        },
      },
      { $sort: { count: -1, _id: 1 } },
      { $limit: 5 },
      {
        $project: {
          _id: 0,
          item: "$_id",
          count: 1,
          totalQuantityNeeded: 1,
          lastReported: 1,
        },
      },
    ]),
    Order.countDocuments(),
    Product.countDocuments(),
    Shortage.countDocuments(),
    Order.aggregate([
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
          },
          orders: { $sum: 1 },
          revenue: { $sum: "$total" },
        },
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          _id: 0,
          date: "$_id",
          orders: 1,
          revenue: 1,
        },
      },
    ]),
  ]);

  const ordersByStatus = buildStatusMap(statusCounts);
  const paymentMethods = paymentMethodsAgg.reduce((acc, item) => {
    acc[item.method || "Unknown"] = {
      count: item.count,
      total: toFixedNumber(item.total),
    };
    return acc;
  }, {});

  const categoryAnalysis = categoryAnalysisAgg.reduce((acc, item) => {
    const category = item.category || "Misc";
    const totalValue = item.totalValue || 0;
    const count = item.count || 0;
    acc[category] = {
      count,
      totalValue: toFixedNumber(totalValue),
      avgPrice: count > 0 ? toFixedNumber(totalValue / count) : 0,
    };
    return acc;
  }, {});

  const criticalShortages = shortagesAgg.map((item) => ({
    item: item.item || "Unknown",
    count: item.count,
    totalQuantityNeeded: item.totalQuantityNeeded || 0,
    lastReported: item.lastReported,
  }));

  const totalRevenue = revenueAgg[0]?.revenue || 0;
  const completedCount = (ordersByStatus.Completed || 0) + (ordersByStatus.Paid || 0) + (ordersByStatus.Served || 0);
  const completionRate = totalOrders > 0 ? (completedCount / totalOrders) * 100 : 0;
  const cancelledCount = (ordersByStatus.Cancelled || 0) + (ordersByStatus.Rejected || 0);
  const cancellationRate = totalOrders > 0 ? (cancelledCount / totalOrders) * 100 : 0;
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  res.json({
    success: true,
    analytics: {
      overview: {
        totalOrders,
        totalRevenue: totalRevenue.toFixed(2),
        avgOrderValue: avgOrderValue.toFixed(2),
        completionRate: formatDuration(completionRate.toFixed(2)),
        cancellationRate: formatDuration(cancellationRate.toFixed(2)),
        totalProducts,
        totalCategories: Object.keys(categoryAnalysis).length,
        activeShortages: totalShortages,
      },
      ordersByStatus,
      paymentMethods,
      topProducts: topProducts.map((item) => ({
        ...item,
        revenue: toFixedNumber(item.revenue),
      })),
      categoryAnalysis,
      criticalShortages,
      dailyTrend: dailyTrend.slice(-7).map((item) => ({
        ...item,
        revenue: toFixedNumber(item.revenue),
      })),
      productInventory: totalProducts,
    },
  });
});

export const getDashboardMetrics = asyncHandler(async (_req, res) => {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const totalProducts = await Product.countDocuments();

  const [todayAgg, monthAgg, allAgg, productStats] = await Promise.all([
    Order.aggregate([
      { $match: { createdAt: { $gte: todayStart } } },
      { $group: { _id: null, orders: { $sum: 1 }, revenue: { $sum: "$total" } } },
    ]),
    Order.aggregate([
      { $match: { createdAt: { $gte: monthStart } } },
      { $group: { _id: null, orders: { $sum: 1 }, revenue: { $sum: "$total" } } },
    ]),
    Order.aggregate([
      { $group: { _id: null, orders: { $sum: 1 }, revenue: { $sum: "$total" } } },
    ]),
    Product.aggregate([
      { $group: { _id: "$category" } },
      { $group: { _id: null, categories: { $sum: 1 } } },
    ]),
  ]);

  const allOrders = allAgg[0] || { orders: 0, revenue: 0 };
  const todayOrders = todayAgg[0] || { orders: 0, revenue: 0 };
  const monthOrders = monthAgg[0] || { orders: 0, revenue: 0 };

  res.json({
    success: true,
    metrics: {
      today: {
        orders: todayOrders.orders || 0,
        revenue: toFixedNumber(todayOrders.revenue).toFixed(2),
      },
      thisMonth: {
        orders: monthOrders.orders || 0,
        revenue: toFixedNumber(monthOrders.revenue).toFixed(2),
      },
      all: {
        orders: allOrders.orders || 0,
        revenue: toFixedNumber(allOrders.revenue).toFixed(2),
      },
      inventory: {
        totalProducts,
        categories: productStats[0]?.categories || 0,
      },
    },
  });
});

export const getShortageReport = asyncHandler(async (_req, res) => {
  const report = await Shortage.aggregate([
    {
      $group: {
        _id: "$item",
        totalReports: { $sum: 1 },
        totalQuantityNeeded: { $sum: "$quantityNeeded" },
        lastReported: { $max: "$createdAt" },
      },
    },
    { $sort: { totalReports: -1, _id: 1 } },
    {
      $project: {
        _id: 0,
        item: "$_id",
        totalReports: 1,
        totalQuantityNeeded: 1,
        lastReported: 1,
      },
    },
  ]);

  res.json({
    success: true,
    report: report.map((item) => ({
      ...item,
      status: item.totalReports > 3 ? "CRITICAL" : "NORMAL",
    })),
  });
});
