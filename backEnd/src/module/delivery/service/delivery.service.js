import mongoose from "mongoose";
import Delivery, { DELIVERY_STATUSES } from "../../../DB/model/Delivery.model.js";
import Order from "../../../DB/model/Order.model.js";
import Table from "../../../DB/model/Table.model.js";
import TableSession from "../../../DB/model/TableSession.model.js";
import Visit from "../../../DB/model/Visit.model.js";
import User from "../../../DB/model/User.model.js";
import AuditLog from "../../../DB/model/AuditLog.model.js";
import { createTask } from "../../task/task.service.js";
import { createNotification } from "../../notification/notification.service.js";
import { getIO } from "../../../config/socket.js";
import { getSettings } from "../../settings/settings.service.js";
import { AppError } from "../../../util/error/AppError.js";

const DEFAULT_DELAY_THRESHOLD_MS = 5 * 60 * 1000;
const DEFAULT_ESCALATION_TIMEOUT_MS = 60 * 1000;

async function findBestWaiterForDelivery(order) {
  const settings = await getSettings();
  const assignmentMode = settings?.delivery?.waiterAssignment || "auto";
  if (assignmentMode === "manual") return null;

  const branchId = order.branchId || null;
  const filter = {
    role: "Order Taker",
    employeeStatus: { $nin: ["offline", "on_break"] },
    "shift.clockedIn": true,
  };
  if (branchId) filter.branchId = branchId;

  if (order.tableNumber) {
    const table = await Table.findOne({ tableNumber: order.tableNumber }).lean();
    if (table?.assignedWaiters?.length) {
      filter.$or = [
        { _id: { $in: table.assignedWaiters } },
        { assignedTables: order.tableNumber },
      ];
    }
  }

  const waiters = await User.find(filter)
    .select("name currentTaskCount maxConcurrentTasks employeeStatus role performance")
    .sort({ currentTaskCount: 1, employeeStatus: 1 })
    .lean();

  if (!waiters.length) return null;

  return waiters.reduce((best, w) => {
    const load = w.maxConcurrentTasks > 0 ? (w.currentTaskCount || 0) / w.maxConcurrentTasks : Infinity;
    const bestLoad = best.maxConcurrentTasks > 0 ? (best.currentTaskCount || 0) / best.maxConcurrentTasks : Infinity;
    return load < bestLoad ? w : best;
  });
}

export async function assignDelivery(orderId, assignedWaiterId = null) {
  const order = await Order.findOne({ id: String(orderId) }).lean();
  if (!order) throw new AppError("Order not found.", 404);

  const orderStatus = order.status;
  if (orderStatus !== "Ready" && orderStatus !== "Reopened") {
    throw new AppError("Order must be Ready before assignment.", 400);
  }

  let delivery = await Delivery.findOne({ order: order._id }).lean();
  if (!delivery) {
    delivery = await Delivery.create({
      order: order._id,
      orderId: order.id,
      tableNumber: order.tableNumber,
      readyAt: order.readyAt || new Date(),
      branchId: order.branchId || null,
    });
  }
  if (delivery.status !== "pending_assignment") throw new AppError("Delivery already assigned.", 400);

  let waiter = null;
  if (assignedWaiterId) {
    waiter = await User.findById(assignedWaiterId).lean();
    if (!waiter) throw new AppError("Waiter not found.", 404);
    if (waiter.role !== "Order Taker") throw new AppError("Assigned user is not a waiter.", 400);
  } else {
    waiter = await findBestWaiterForDelivery(order);
    if (!waiter) {
      await createNotification({
        type: "manager_alert",
        title: "No waiters available",
        message: `Order ${order.id} is ready but no waiter is available to deliver.`,
        priority: "high",
        roleTarget: "General Manager",
        metadata: { orderId: order.id, tableNumber: order.tableNumber },
      });
      return { delivery, waiter: null, message: "No available waiters. Manager notified." };
    }
  }

  await Delivery.findByIdAndUpdate(delivery._id, {
    $set: {
      waiter: waiter._id,
      status: "assigned",
      assignedAt: new Date(),
    },
  });

  await Order.findByIdAndUpdate(order._id, {
    $set: {
      status: "ReadyForPickup",
      assignedWaiter: waiter._id,
    },
  });

  const task = await createTask({
    title: `Deliver Order #${order.code || order.id.slice(-6)}`,
    description: `Deliver order to Table ${order.tableNumber || "—"}`,
    category: "deliver_order",
    priority: "high",
    assignedTo: waiter._id,
    tableNumber: order.tableNumber,
    orderId: order.id,
    dueBy: new Date(Date.now() + DEFAULT_ESCALATION_TIMEOUT_MS),
  });

  await User.findByIdAndUpdate(waiter._id, { $inc: { currentTaskCount: 1 } });

  await createNotification({
    type: "waiter_assigned",
    title: "New Delivery Assignment",
    message: `Deliver Order #${order.code || order.id.slice(-6)} to Table ${order.tableNumber || "—"}`,
    priority: "high",
    recipientId: waiter._id,
    metadata: {
      orderId: order.id,
      tableNumber: order.tableNumber,
      taskId: String(task._id),
      deliveryId: String(delivery._id),
    },
  });

  await AuditLog.create({
    action: "waiter_assigned",
    description: `Waiter ${waiter.name} assigned to deliver order ${order.id}`,
    orderId: order.id,
    tableNumber: order.tableNumber,
    newValue: { waiter: waiter.name, waiterId: waiter._id },
  });

  const io = getIO();
  if (io) {
    io.to(`role:Order Taker`).emit("delivery:assigned", {
      deliveryId: delivery._id,
      orderId: order.id,
      tableNumber: order.tableNumber,
      waiterId: waiter._id,
    });
    io.to(`order:${order.id}`).emit("order:statusChanged", { ...order, status: "ReadyForPickup", assignedWaiter: waiter._id });
  }

  return { delivery: await Delivery.findById(delivery._id).lean(), task };
}

export async function acceptDelivery(deliveryId, userId) {
  const delivery = await Delivery.findById(deliveryId).lean();
  if (!delivery) throw new AppError("Delivery not found.", 404);
  if (String(delivery.waiter) !== String(userId)) throw new AppError("This delivery is not assigned to you.", 403);
  if (delivery.status !== "assigned") throw new AppError("Delivery already accepted or completed.", 400);

  await Delivery.findByIdAndUpdate(deliveryId, {
    $set: { status: "accepted", acceptedAt: new Date() },
  });

  const io = getIO();
  if (io) io.to(`role:Order Taker`).emit("delivery:accepted", { deliveryId, waiterId: userId });

  return { message: "Delivery accepted" };
}

export async function confirmPickup(deliveryId, userId) {
  const delivery = await Delivery.findById(deliveryId).lean();
  if (!delivery) throw new AppError("Delivery not found.", 404);
  if (String(delivery.waiter) !== String(userId)) throw new AppError("Not your delivery.", 403);

  if (delivery.status !== "accepted" && delivery.status !== "assigned") {
    throw new AppError("Delivery must be accepted first.", 400);
  }

  const now = new Date();
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    await Delivery.findByIdAndUpdate(deliveryId, {
      $set: { status: "picked_up", pickedUpAt: now },
    }).session(session);

    const order = await Order.findByIdAndUpdate(delivery.order, {
      $set: { status: "BeingDelivered", pickedUpAt: now },
    }, { new: true, session }).lean();

    const timeFromReady = order?.readyAt
      ? Math.round((now - new Date(order.readyAt)) / 1000)
      : 0;

    if (delivery.waiter) {
      await User.findByIdAndUpdate(delivery.waiter, {
        $inc: { "performance.ordersDelivered": 1 },
      }).session(session);
    }

    await AuditLog.create([{
      action: "picked_up_order",
      description: `Order ${delivery.orderId} picked up from kitchen by ${userId}`,
      orderId: delivery.orderId,
      tableNumber: delivery.tableNumber,
      newValue: { pickupDelaySeconds: timeFromReady },
    }], { session });

    await session.commitTransaction();
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }

  const io = getIO();
  if (io) {
    io.to(`order:${delivery.orderId}`).emit("order:statusChanged", { id: delivery.orderId, status: "BeingDelivered" });
    io.to(`role:Order Taker`).emit("delivery:pickedUp", { deliveryId, orderId: delivery.orderId });
    io.to(`role:Cook`).emit("delivery:pickedUp", { deliveryId, orderId: delivery.orderId });
  }

  return { message: "Order picked up", pickupDelaySeconds: timeFromReady };
}

export async function confirmDelivery(deliveryId, userId) {
  const delivery = await Delivery.findById(deliveryId).lean();
  if (!delivery) throw new AppError("Delivery not found.", 404);
  if (String(delivery.waiter) !== String(userId)) throw new AppError("Not your delivery.", 403);
  if (delivery.status !== "picked_up") throw new AppError("Order must be picked up first.", 400);

  const now = new Date();
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    await Delivery.findByIdAndUpdate(deliveryId, {
      $set: { status: "delivered", deliveredAt: now },
    }).session(session);

    const order = await Order.findByIdAndUpdate(delivery.order, {
      $set: { status: "Served", deliveredAt: now, servedAt: now },
    }, { new: true, session }).lean();

    const deliveryTime = order?.readyAt
      ? Math.round((now - new Date(order.readyAt)) / 60000)
      : 0;

    await Order.findByIdAndUpdate(delivery.order, {
      $set: { deliveryTimeMinutes: deliveryTime },
    }).session(session);

    if (delivery.tableNumber) {
      const table = await Table.findOne({ tableNumber: delivery.tableNumber }).lean();
      if (table?.currentVisit) {
        await Visit.findByIdAndUpdate(table.currentVisit, {
          $set: { status: "dining" },
        }).session(session);
      }

      await Table.findOneAndUpdate(
        { tableNumber: delivery.tableNumber },
        { $set: { status: "dining" } },
      ).session(session);
    }

    if (delivery.waiter) {
      await User.findByIdAndUpdate(delivery.waiter, {
        $inc: { currentTaskCount: -1 },
      }).session(session);
    }

    await AuditLog.create([{
      action: "delivered_order",
      description: `Order ${delivery.orderId} delivered to Table ${delivery.tableNumber || "—"} (${deliveryTime} min)`,
      orderId: delivery.orderId,
      tableNumber: delivery.tableNumber,
      newValue: { deliveryTimeMinutes: deliveryTime },
    }], { session });

    await session.commitTransaction();
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }

  const io = getIO();
  if (io) {
    io.to(`order:${delivery.orderId}`).emit("order:statusChanged", { id: delivery.orderId, status: "Served" });
    io.to(`role:Order Taker`).emit("delivery:completed", { deliveryId, orderId: delivery.orderId });
    io.emit("table:statusChanged", { tableNumber: delivery.tableNumber, status: "dining" });
  }

  return { message: "Order delivered", deliveryTimeMinutes: deliveryTime };
}

export async function getWaiterDeliveries(userId, query = {}) {
  const filter = { waiter: userId };
  if (query.status) filter.status = query.status;
  const deliveries = await Delivery.find(filter)
    .sort({ createdAt: -1 })
    .limit(Math.min(Number(query.limit) || 50, 100))
    .lean();
  return deliveries;
}

export async function getPendingDeliveries(query = {}) {
  const filter = { status: { $in: ["pending_assignment", "assigned", "accepted", "picked_up"] } };
  const deliveries = await Delivery.find(filter)
    .populate("waiter", "name email")
    .sort({ createdAt: 1 })
    .lean();
  return deliveries;
}

export async function checkDelayedDeliveries() {
  const settings = await getSettings();
  const thresholdMs = (settings?.delivery?.delayThresholdMinutes || 5) * 60 * 1000;

  const now = new Date();
  const cutoff = new Date(now.getTime() - thresholdMs);

  const delayed = await Delivery.find({
    status: { $in: ["assigned", "accepted", "picked_up"] },
    assignedAt: { $lte: cutoff },
    delayAlertSent: { $ne: true },
  })
    .populate("waiter", "name email role")
    .lean();

  const results = [];
  for (const delivery of delayed) {
    await Delivery.findByIdAndUpdate(delivery._id, { $set: { delayAlertSent: true } });

    if (delivery.waiter) {
      await createNotification({
        type: "waiter_alert",
        title: "Delivery Delayed",
        message: `Order ${delivery.orderId} to Table ${delivery.tableNumber || "—"} is delayed!`,
        priority: "high",
        recipientId: delivery.waiter._id,
        metadata: { orderId: delivery.orderId, tableNumber: delivery.tableNumber, deliveryId: String(delivery._id) },
      });
    }

    if (delivery.escalationCount < 3) {
      const nextWaiter = await User.find({
        role: "Order Taker",
        employeeStatus: { $nin: ["offline", "on_break"] },
        "shift.clockedIn": true,
        _id: { $ne: delivery.waiter?._id },
      })
        .sort({ currentTaskCount: 1 })
        .limit(1)
        .lean();
      if (nextWaiter.length) {
        await Delivery.findByIdAndUpdate(delivery._id, {
          $set: { waiter: nextWaiter[0]._id, escalationCount: delivery.escalationCount + 1, lastEscalatedAt: now },
        });
        await createNotification({
          type: "waiter_escalated",
          title: "Delivery Reassigned",
          message: `Order ${delivery.orderId} reassigned to you (delayed).`,
          priority: "high",
          recipientId: nextWaiter[0]._id,
          metadata: { orderId: delivery.orderId, deliveryId: String(delivery._id) },
        });
      }
    }

    await createNotification({
      type: "manager_alert",
      title: "Delayed Delivery",
      message: `Delivery of order ${delivery.orderId} to Table ${delivery.tableNumber || "—"} is delayed (escalation ${delivery.escalationCount + 1}).`,
      priority: "critical",
      roleTarget: "General Manager",
      metadata: { orderId: delivery.orderId, tableNumber: delivery.tableNumber, deliveryId: String(delivery._id) },
    });

    results.push(delivery);
  }

  return results;
}

export async function getDelayedDeliveries() {
  const settings = await getSettings();
  const thresholdMs = (settings?.delivery?.delayThresholdMinutes || 5) * 60 * 1000;
  const cutoff = new Date(Date.now() - thresholdMs);

  return Delivery.find({
    status: { $in: ["assigned", "accepted", "picked_up"] },
    assignedAt: { $lte: cutoff },
  })
    .populate("waiter", "name email")
    .sort({ assignedAt: 1 })
    .lean();
}

export async function waitersAwaitingAssignment() {
  return Delivery.find({ status: "pending_assignment" })
    .sort({ createdAt: 1 })
    .lean();
}

export async function getDeliveryPerformance(startDate, endDate) {
  const filter = {
    status: "delivered",
    deliveredAt: {
      $gte: startDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      $lte: endDate || new Date(),
    },
  };

  const deliveries = await Delivery.find(filter).populate("waiter", "name").lean();

  const byWaiter = {};
  let totalTime = 0;

  for (const d of deliveries) {
    const time = d.readyAt && d.deliveredAt
      ? (new Date(d.deliveredAt) - new Date(d.readyAt)) / 60000
      : 0;
    totalTime += time;

    if (d.waiter) {
      const id = d.waiter._id.toString();
      if (!byWaiter[id]) byWaiter[id] = { name: d.waiter.name, deliveries: 0, totalTime: 0 };
      byWaiter[id].deliveries++;
      byWaiter[id].totalTime += time;
    }
  }

  return {
    totalDeliveries: deliveries.length,
    averageDeliveryTimeMinutes: deliveries.length > 0
      ? Number((totalTime / deliveries.length).toFixed(1))
      : 0,
    byWaiter: Object.values(byWaiter).map((w) => ({
      ...w,
      averageTime: w.deliveries > 0 ? Number((w.totalTime / w.deliveries).toFixed(1)) : 0,
    })),
  };
}
