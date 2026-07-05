import Order from "../../../DB/model/Order.model.js";
import Delivery from "../../../DB/model/Delivery.model.js";
import PaymentSession from "../../../DB/model/PaymentSession.model.js";
import WaiterRequest from "../../../DB/model/WaiterRequest.model.js";
import User from "../../../DB/model/User.model.js";

export async function getKitchenPerformance(query = {}) {
  const days = Number(query.days) || 7;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const orders = await Order.find({
    preparedAt: { $gte: since },
    readyAt: { $ne: null },
  })
    .select("preparedAt readyAt code id")
    .lean();

  const prepTimes = orders
    .filter((o) => o.preparedAt && o.readyAt)
    .map((o) => new Date(o.readyAt) - new Date(o.preparedAt));

  const avgPrepTime = prepTimes.length
    ? prepTimes.reduce((a, b) => a + b, 0) / prepTimes.length
    : 0;

  return {
    totalOrdersPrepared: orders.length,
    averagePreparationTimeMs: Math.round(avgPrepTime),
    averagePreparationTimeMin: Math.round(avgPrepTime / 60000 * 10) / 10,
    periodDays: days,
  };
}

export async function getWaiterPerformance(waiterId = null, query = {}) {
  const days = Number(query.days) || 7;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const filter = { assignedAt: { $gte: since } };
  if (waiterId) filter.waiter = waiterId;
  if (!waiterId) filter.status = { $in: ["delivered", "picked_up"] };

  const deliveries = await Delivery.find(filter)
    .populate("waiter", "name email")
    .lean();

  const grouped = {};
  for (const d of deliveries) {
    const wid = d.waiter ? String(d.waiter._id) : "unknown";
    if (!grouped[wid]) {
      grouped[wid] = {
        waiterId: wid,
        waiterName: d.waiter?.name || "Unknown",
        totalDeliveries: 0,
        totalDeliveryTimeMs: 0,
        delayedCount: 0,
      };
    }
    grouped[wid].totalDeliveries++;

    if (d.assignedAt && d.deliveredAt) {
      const time = new Date(d.deliveredAt) - new Date(d.assignedAt);
      grouped[wid].totalDeliveryTimeMs += time;
    }

    if (d.delayAlertSent) grouped[wid].delayedCount++;
  }

  const waiters = Object.values(grouped).map((w) => ({
    ...w,
    averageDeliveryTimeMs: w.totalDeliveries ? Math.round(w.totalDeliveryTimeMs / w.totalDeliveries) : 0,
    averageDeliveryTimeMin: w.totalDeliveries ? Math.round(w.totalDeliveryTimeMs / w.totalDeliveries / 60000 * 10) / 10 : 0,
  }));

  return {
    waiters,
    totalDeliveries: deliveries.length,
    periodDays: days,
  };
}

export async function getCashierPerformance(cashierId = null, query = {}) {
  const days = Number(query.days) || 7;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const filter = { completedAt: { $gte: since } };
  if (cashierId) filter.processedBy = cashierId;

  const sessions = await PaymentSession.find(filter)
    .populate("processedBy", "name")
    .lean();

  const grouped = {};
  for (const s of sessions) {
    const cid = s.processedBy ? String(s.processedBy._id) : "unknown";
    if (!grouped[cid]) {
      grouped[cid] = {
        cashierId: cid,
        cashierName: s.processedBy?.name || "Unknown",
        totalTransactions: 0,
        totalProcessingTimeMs: 0,
        totalAmount: 0,
      };
    }
    grouped[cid].totalTransactions++;
    grouped[cid].totalAmount += s.total || 0;

    if (s.startedAt && s.completedAt) {
      grouped[cid].totalProcessingTimeMs += new Date(s.completedAt) - new Date(s.startedAt);
    }
  }

  const cashiers = Object.values(grouped).map((c) => ({
    ...c,
    averageProcessingTimeMs: c.totalTransactions ? Math.round(c.totalProcessingTimeMs / c.totalTransactions) : 0,
    averageProcessingTimeSec: c.totalTransactions ? Math.round(c.totalProcessingTimeMs / c.totalTransactions / 1000 * 10) / 10 : 0,
  }));

  return { cashiers, totalTransactions: sessions.length, periodDays: days };
}

export async function getRestaurantOverview(query = {}) {
  const now = new Date();

  const statusCounts = await Order.aggregate([
    { $group: { _id: "$status", count: { $sum: 1 } } },
  ]);

  const statusMap = {};
  for (const s of statusCounts) statusMap[s._id] = s.count;

  const settings = await (await import("../../settings/settings.service.js")).getSettings();
  const delayThreshold = (settings?.delivery?.delayThresholdMinutes || 5) * 60 * 1000;
  const delayCutoff = new Date(now.getTime() - delayThreshold);

  const delayedDeliveries = await Delivery.countDocuments({
    status: { $in: ["assigned", "accepted", "picked_up"] },
    assignedAt: { $lte: delayCutoff },
  });

  const totalRevenue = await Order.aggregate([
    { $match: { status: "Paid" } },
    { $group: { _id: null, total: { $sum: "$total" } } },
  ]);

  const onlineCount = await User.countDocuments({
    role: { $in: ["Order Taker", "Cook", "Cashier"] },
    employeeStatus: { $nin: ["offline", "on_break"] },
    "shift.clockedIn": true,
  });

  return {
    statusSummary: statusMap,
    delayedDeliveries,
    totalRevenue: totalRevenue[0]?.total || 0,
    onlineStaff: onlineCount,
    timestamp: now,
  };
}
