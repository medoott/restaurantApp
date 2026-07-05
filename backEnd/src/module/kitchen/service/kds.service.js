import Order from "../../../DB/model/Order.model.js";
import User from "../../../DB/model/User.model.js";
import Table from "../../../DB/model/Table.model.js";
import { getIO } from "../../../config/socket.js";
import { AppError } from "../../../util/error/AppError.js";

const KDS_STATUSES = ["Pending", "Preparing", "Ready"];
const DELAY_THRESHOLD_MIN = 15;

export const getKDSOrders = async (query = {}) => {
  const filter = { status: { $in: KDS_STATUSES } };
  if (query.status && KDS_STATUSES.includes(query.status)) {
    filter.status = query.status;
  }

  const page = Math.max(Number(query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(query.limit) || 50, 1), 200);

  const [orders, total] = await Promise.all([
    Order.find(filter)
      .select("id code tableNumber items itemsDetail status acceptedBy acceptedAt preparedAt createdAt")
      .populate("acceptedBy", "name")
      .sort({ createdAt: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Order.countDocuments(filter),
  ]);

  const enriched = orders.map((order) => {
    const prepTime =
      order.status === "Preparing" && order.acceptedAt
        ? Math.floor((Date.now() - new Date(order.acceptedAt).getTime()) / 60000)
        : 0;

    const delayed = order.status === "Preparing" && prepTime > DELAY_THRESHOLD_MIN;

    return {
      ...order,
      prepTime,
      delayed,
    };
  }).sort((a, b) => {
    if (a.delayed && !b.delayed) return -1;
    if (!a.delayed && b.delayed) return 1;
    return new Date(a.createdAt) - new Date(b.createdAt);
  });

  return {
    items: enriched,
    meta: { page, limit, total, pages: Math.max(Math.ceil(total / limit), 1) },
  };
};

export const getKDSOrderStats = async () => {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const [statusCounts, todayCompleted, prepTimes] = await Promise.all([
    Promise.all(
      KDS_STATUSES.map((status) =>
        Order.countDocuments({ status }).then((count) => ({ [status.toLowerCase()]: count })),
      ),
    ),
    Order.countDocuments({
      status: "Ready",
      updatedAt: { $gte: todayStart },
    }),
    Order.aggregate([
      { $match: { status: "Ready", acceptedAt: { $ne: null }, preparedAt: { $ne: null } } },
      {
        $group: {
          _id: null,
          avgPrepMin: { $avg: { $divide: [{ $subtract: ["$preparedAt", "$acceptedAt"] }, 60000] } },
        },
      },
    ]),
  ]);

  const counts = statusCounts.reduce((acc, c) => ({ ...acc, ...c }), {});
  const delayed = await Order.countDocuments({
    status: "Preparing",
    acceptedAt: { $lte: new Date(Date.now() - DELAY_THRESHOLD_MIN * 60 * 1000) },
    preparedAt: null,
  });

  return {
    new: counts.pending || 0,
    preparing: counts.preparing || 0,
    ready: counts.ready || 0,
    delayed,
    todayCompleted,
    avgPrepTimeMin: prepTimes.length > 0 ? Math.round(prepTimes[0].avgPrepMin * 10) / 10 : 0,
  };
};

export const acceptKDSOrder = async (orderId, userId) => {
  const user = await User.findById(userId).select("name").lean();
  if (!user) throw new AppError("User not found", 404);

  const order = await Order.findOneAndUpdate(
    { id: orderId, status: "Pending" },
    {
      $set: {
        status: "Preparing",
        acceptedBy: userId,
        acceptedAt: new Date(),
      },
    },
    { new: true },
  )
    .populate("acceptedBy", "name")
    .lean();

  if (!order) throw new AppError("Order not found or already accepted", 404);

  try {
    const io = getIO();
    if (io) {
      io.to(`order:${order.id}`).emit("order:statusChanged", order);
      io.to(`order:${order.id}`).emit("order:track", order);
      io.emit("kds:orderUpdated", { orderId: order.id, status: "Preparing" });
    }
  } catch {}

  return order;
};

export const completeKDSOrder = async (orderId, userId) => {
  const user = await User.findById(userId).select("name").lean();
  if (!user) throw new AppError("User not found", 404);

  const order = await Order.findOneAndUpdate(
    { id: orderId, status: "Preparing" },
    {
      $set: {
        status: "Ready",
        preparedAt: new Date(),
        readyAt: new Date(),
      },
    },
    { new: true },
  )
    .populate("acceptedBy", "name")
    .lean();

  if (!order) throw new AppError("Order not found or not in Preparing status", 404);

  try {
    let preferredWaiterId = order.assignedWaiter;

    if (!preferredWaiterId && order.tableNumber) {
      const table = await Table.findOne({ tableNumber: order.tableNumber })
        .select("assignedWaiter")
        .lean();
      if (table?.assignedWaiter) {
        preferredWaiterId = table.assignedWaiter;
      }
    }

    if (!preferredWaiterId) {
      const { findBestWaiter } = await import("../../waiter/service/waiter.service.js");
      const best = await findBestWaiter(order.branchId, order.tableNumber);
      if (best) {
        preferredWaiterId = best._id;
      }
    }

    const { assignDelivery } = await import("../../delivery/service/delivery.service.js");
    const deliveryResult = await assignDelivery(order.id, preferredWaiterId || null);

    const io = getIO();
    if (io) {
      io.to(`order:${order.id}`).emit("delivery:assigned", {
        deliveryId: deliveryResult.delivery?._id,
        orderId: order.id,
        tableNumber: order.tableNumber,
        waiterId: deliveryResult.task?.assignedTo || preferredWaiterId,
      });
    }
  } catch (err) {
    console.error("Auto-delivery assignment failed:", err.message);
  }

  try {
    const io = getIO();
    if (io) {
      io.to(`order:${order.id}`).emit("order:statusChanged", order);
      io.to(`order:${order.id}`).emit("order:track", order);
      io.emit("kds:orderUpdated", { orderId: order.id, status: "Ready" });
    }
  } catch {}

  return order;
};

export const getDelayedOrders = async () => {
  const threshold = new Date(Date.now() - DELAY_THRESHOLD_MIN * 60 * 1000);

  const orders = await Order.find({
    status: "Preparing",
    preparedAt: null,
    acceptedAt: { $lte: threshold },
  })
    .select("id code tableNumber items itemsDetail status acceptedAt createdAt")
    .populate("acceptedBy", "name")
    .sort({ acceptedAt: 1 })
    .lean();

  return orders.map((order) => ({
    ...order,
    delayedMinutes: Math.floor((Date.now() - new Date(order.acceptedAt || order.createdAt).getTime()) / 60000),
  }));
};
