import User from "../../../DB/model/User.model.js";
import Order from "../../../DB/model/Order.model.js";
import WaiterRequest from "../../../DB/model/WaiterRequest.model.js";
import Delivery from "../../../DB/model/Delivery.model.js";
import Task from "../../../DB/model/Task.model.js";
import Table from "../../../DB/model/Table.model.js";
import { AppError } from "../../../util/error/AppError.js";
import { safeObjectId } from "../../../util/validation/validateObjectId.js";

const WAITER_ROLES = ["User", "Order Taker"];
const ACTIVE_DELIVERY_STATUSES = ["assigned", "accepted", "picked_up"];
const ACTIVE_TASK_STATUSES = ["pending", "in_progress"];

export const listWaiters = async (query = {}) => {
  const filter = {
    role: { $in: WAITER_ROLES },
  };

  if (query.employeeStatus) {
    filter.employeeStatus = query.employeeStatus;
  }
  if (query.online === "true") {
    filter["shift.clockedIn"] = true;
    filter.employeeStatus = { $nin: ["offline", "on_break"] };
  }
  if (query.branchId) {
    const safeBranchId = safeObjectId(query.branchId);
    if (safeBranchId) filter.branchId = safeBranchId;
  }

  const waiters = await User.find(filter)
    .select("name email phone role employeeStatus currentTaskCount maxConcurrentTasks shift branchId image")
    .populate("branchId", "name")
    .sort({ currentTaskCount: 1 })
    .lean();

  return waiters.map((waiter) => ({
    ...waiter,
    workloadPercent:
      waiter.maxConcurrentTasks > 0
        ? Math.round((waiter.currentTaskCount / waiter.maxConcurrentTasks) * 100)
        : 100,
    isOnline: waiter.shift?.clockedIn && !["offline", "on_break"].includes(waiter.employeeStatus),
  }));
};

export const getWaiterDetails = async (waiterId) => {
  const waiter = await User.findById(waiterId)
    .select("-password")
    .populate("branchId", "name")
    .lean();

  if (!waiter) throw new AppError("Waiter not found", 404);

  const [assignedTables, activeTasks, pendingRequests, deliveryQueue, todayStats] = await Promise.all([
    getAssignedTables(waiterId),
    getActiveTasks(waiterId),
    getPendingRequests(waiterId),
    getDeliveryQueue(waiterId),
    getWaiterStats(waiterId, "today"),
  ]);

  return {
    ...waiter,
    assignedTables,
    activeTasks,
    pendingRequests,
    deliveryQueue,
    todayStats,
  };
};

export const getAssignedTables = async (waiterId) => {
  const activeOrderTables = await Order.distinct("tableNumber", {
    assignedWaiter: waiterId,
    status: { $nin: ["Paid", "Cancelled", "Rejected", "Cleaning"] },
  });

  const deliveryTables = await Delivery.distinct("tableNumber", {
    waiter: waiterId,
    status: { $in: ACTIVE_DELIVERY_STATUSES },
    tableNumber: { $ne: null },
  });

  const tableNumbers = [...new Set([...activeOrderTables, ...deliveryTables])].filter(Boolean);

  if (tableNumbers.length === 0) return [];

  const tables = await Table.find({ tableNumber: { $in: tableNumbers } })
    .select("tableNumber status section capacity")
    .lean();

  const orders = await Order.find({
    tableNumber: { $in: tableNumbers },
    status: { $nin: ["Paid", "Cancelled", "Rejected"] },
  })
    .select("tableNumber status code items")
    .sort({ createdAt: -1 })
    .lean();

  return tables.map((table) => {
    const tableOrders = orders.filter((o) => o.tableNumber === table.tableNumber);
    return {
      ...table,
      orders: tableOrders,
      activeOrderCount: tableOrders.length,
    };
  });
};

export const getActiveTasks = async (waiterId) => {
  const tasks = await Task.find({
    assignedTo: waiterId,
    status: { $in: ACTIVE_TASK_STATUSES },
  })
    .sort({ priority: -1, createdAt: 1 })
    .lean();

  return tasks;
};

export const getPendingRequests = async (waiterId) => {
  const requests = await WaiterRequest.find({
    status: "pending",
  })
    .populate("table", "tableNumber section")
    .sort({ createdAt: -1 })
    .lean();

  return requests.filter((r) => {
    return r.table?.tableNumber;
  });
};

export const getDeliveryQueue = async (waiterId) => {
  const deliveries = await Delivery.find({
    waiter: waiterId,
    status: { $in: ACTIVE_DELIVERY_STATUSES },
  })
    .populate("order", "id code items total")
    .sort({ createdAt: 1 })
    .lean();

  return deliveries.map((d) => ({
    ...d,
    waitTimeMin: d.assignedAt
      ? Math.floor((Date.now() - new Date(d.assignedAt).getTime()) / 60000)
      : 0,
  }));
};

export const getWaiterStats = async (waiterId, period = "today") => {
  const now = new Date();
  let startDate;

  switch (period) {
    case "today":
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case "week":
      startDate = new Date(now);
      startDate.setDate(startDate.getDate() - startDate.getDay());
      startDate.setHours(0, 0, 0, 0);
      break;
    case "month":
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    default:
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }

  const [
    ordersServed,
    totalDeliveries,
    delayedDeliveries,
    avgDeliveryTime,
    resolvedRequests,
  ] = await Promise.all([
    Order.countDocuments({
      assignedWaiter: waiterId,
      status: { $in: ["Served", "Paid"] },
      updatedAt: { $gte: startDate },
    }),
    Delivery.countDocuments({
      waiter: waiterId,
      deliveredAt: { $gte: startDate },
    }),
    Delivery.countDocuments({
      waiter: waiterId,
      deliveredAt: { $gte: startDate },
      delayAlertSent: true,
    }),
    Delivery.aggregate([
      {
        $match: {
          waiter: waiterId,
          deliveredAt: { $ne: null },
          assignedAt: { $ne: null },
          deliveredAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: null,
          avgMin: { $avg: { $divide: [{ $subtract: ["$deliveredAt", "$assignedAt"] }, 60000] } },
        },
      },
    ]),
    WaiterRequest.aggregate([
      {
        $match: {
          resolvedAt: { $gte: startDate },
          resolvedAt: { $ne: null },
          createdAt: { $ne: null },
        },
      },
      {
        $group: {
          _id: null,
          avgResponseMin: {
            $avg: { $divide: [{ $subtract: ["$resolvedAt", "$createdAt"] }, 60000] },
          },
          total: { $sum: 1 },
        },
      },
    ]),
  ]);

  const avgDeliveryTimeMin =
    avgDeliveryTime.length > 0 ? Math.round(avgDeliveryTime[0].avgMin * 10) / 10 : 0;
  const avgResponseTimeMin =
    resolvedRequests.length > 0 ? Math.round(resolvedRequests[0].avgResponseMin * 10) / 10 : 0;

  const responseTimeScore = Math.max(0, 100 - avgResponseTimeMin * 5);
  const deliveryTimeScore = Math.max(0, 100 - avgDeliveryTimeMin * 3);
  const delayScore = totalDeliveries > 0
    ? Math.max(0, 100 - (delayedDeliveries / totalDeliveries) * 100)
    : 100;
  const performanceScore = Math.round((responseTimeScore + deliveryTimeScore + delayScore) / 3);

  return {
    ordersServed,
    totalDeliveries,
    delayedDeliveries,
    avgDeliveryTimeMin,
    avgResponseTimeMin,
    performanceScore,
    period,
  };
};

export const reassignWaiterRequest = async (requestId, newWaiterId, userId) => {
  const [request, newWaiter] = await Promise.all([
    WaiterRequest.findById(requestId).lean(),
    User.findById(newWaiterId).select("name employeeStatus shift").lean(),
  ]);

  if (!request) throw new AppError("Waiter request not found", 404);
  if (!newWaiter) throw new AppError("Target waiter not found", 404);

  const task = await Task.findOneAndUpdate(
    { requestId: request._id, status: { $in: ["pending", "in_progress"] } },
    {
      $set: {
        assignedTo: newWaiterId,
        assignedBy: userId,
        escalationCount: (request._id ? 1 : 0),
        escalatedAt: new Date(),
      },
    },
    { new: true },
  ).lean();

  return { request, task };
};

export const getWorkloadBalancing = async () => {
  const waiters = await User.find({
    role: { $in: WAITER_ROLES },
    employeeStatus: { $nin: ["offline"] },
  })
    .select("name role employeeStatus currentTaskCount maxConcurrentTasks shift")
    .lean();

  const workloads = await Promise.all(
    waiters.map(async (waiter) => {
      const [activeDeliveries, activeTasks] = await Promise.all([
        Delivery.countDocuments({
          waiter: waiter._id,
          status: { $in: ACTIVE_DELIVERY_STATUSES },
        }),
        Task.countDocuments({
          assignedTo: waiter._id,
          status: { $in: ACTIVE_TASK_STATUSES },
        }),
      ]);

      return {
        _id: waiter._id,
        name: waiter.name,
        employeeStatus: waiter.employeeStatus,
        currentTaskCount: waiter.currentTaskCount,
        maxConcurrentTasks: waiter.maxConcurrentTasks,
        activeDeliveries,
        activeTasks,
        totalActive: activeDeliveries + activeTasks,
        isOnline: waiter.shift?.clockedIn && waiter.employeeStatus !== "on_break",
        workloadPercent:
          waiter.maxConcurrentTasks > 0
            ? Math.round(
                ((activeDeliveries + activeTasks) / waiter.maxConcurrentTasks) * 100,
              )
            : 100,
      };
    }),
  );

  return workloads.sort((a, b) => a.totalActive - b.totalActive || a.workloadPercent - b.workloadPercent);
};

export const autoAssignWaiter = async (tableNumber, requestType) => {
  const table = await Table.findOne({ tableNumber }).lean();
  if (!table) throw new AppError("Table not found", 404);

  const waiters = await User.find({
    role: { $in: WAITER_ROLES },
    employeeStatus: { $nin: ["offline", "on_break"] },
    "shift.clockedIn": true,
  })
    .select("name role employeeStatus currentTaskCount maxConcurrentTasks branchId")
    .lean();

  if (waiters.length === 0) throw new AppError("No available waiters", 404);

  const scored = await Promise.all(
    waiters.map(async (waiter) => {
      const [activeDeliveries, activeTasks] = await Promise.all([
        Delivery.countDocuments({
          waiter: waiter._id,
          status: { $in: ACTIVE_DELIVERY_STATUSES },
        }),
        Task.countDocuments({
          assignedTo: waiter._id,
          status: { $in: ACTIVE_TASK_STATUSES },
        }),
      ]);

      const totalLoad = activeDeliveries + activeTasks;
      const capacity = waiter.maxConcurrentTasks || 5;
      const workloadScore = capacity > 0 ? 1 - totalLoad / capacity : 0;
      const statusScore = waiter.employeeStatus === "available" ? 1 : 0.5;
      const overallScore = workloadScore * 0.7 + statusScore * 0.3;

      return {
        _id: waiter._id,
        name: waiter.name,
        employeeStatus: waiter.employeeStatus,
        currentTaskCount: waiter.currentTaskCount,
        totalLoad,
        score: Math.round(overallScore * 100),
      };
    }),
  );

  scored.sort((a, b) => b.score - a.score);

  return scored[0];
};
