import Task, { TASK_STATUSES, TASK_CATEGORIES } from "../../DB/model/Task.model.js";
import User from "../../DB/model/User.model.js";
import { AppError } from "../../util/error/AppError.js";
import { getIO } from "../../config/socket.js";
import { createNotification } from "../notification/notification.service.js";

export const createTask = async ({
  title, description = "", category = "other", priority = "medium",
  assignedTo = null, assignedBy = null, tableNumber = null,
  orderId = null, requestId = null, dueBy = null, note = "",
}) => {
  const task = await Task.create({
    title, description, category, priority,
    assignedTo, assignedBy, tableNumber, orderId, requestId, dueBy, note,
  });

  if (assignedTo) {
    await User.findByIdAndUpdate(assignedTo, { $inc: { currentTaskCount: 1 } });
  }

  const io = getIO();
  if (io) {
    io.emit("task:created", task.toObject());
    if (assignedTo) io.to(`user:${assignedTo}`).emit("task:assigned", task.toObject());
  }

  if (assignedTo) {
    const assignee = await User.findById(assignedTo).select("name").lean();
    await createNotification({
      type: "task_assigned",
      title: `New task: ${title}`,
      message: description || `Category: ${category}`,
      priority,
      recipientId: assignedTo,
      metadata: { taskId: task._id, tableNumber, orderId },
    });
  }

  return task;
};

export const getEmployeeTasks = async (userId, query = {}) => {
  const status = String(query.status || "").trim();
  const category = String(query.category || "").trim();
  const limit = Math.min(Number(query.limit) || 50, 100);
  const skip = Number(query.skip) || 0;

  const filter = { assignedTo: userId };
  if (status) filter.status = status;
  if (category) filter.category = category;

  const [items, total] = await Promise.all([
    Task.find(filter).sort({ priority: -1, createdAt: 1 }).skip(skip).limit(limit).lean(),
    Task.countDocuments(filter),
  ]);

  return { items, total, limit, skip };
};

export const getPendingTasks = async (query = {}) => {
  const role = String(query.role || "").trim();
  const category = String(query.category || "").trim();
  const limit = Math.min(Number(query.limit) || 50, 100);

  const filter = { status: { $in: ["pending", "in_progress"] } };
  if (category) filter.category = category;

  const items = await Task.find(filter)
    .sort({ priority: -1, createdAt: 1 })
    .limit(limit)
    .populate("assignedTo", "name role employeeStatus")
    .lean();

  if (role) {
    const employees = await User.find({ role, employeeStatus: { $ne: "offline" } }).select("_id").lean();
    const empIds = employees.map((e) => e._id.toString());
    return items.filter((t) => !t.assignedTo || empIds.includes(t.assignedTo._id?.toString()));
  }

  return items;
};

export const updateTaskStatus = async (id, status, userId = null) => {
  if (!TASK_STATUSES.includes(status)) {
    throw new AppError(`Invalid status. Must be one of: ${TASK_STATUSES.join(", ")}`, 400);
  }

  const update = { status };
  if (status === "in_progress") update.startedAt = new Date();
  if (status === "completed") update.completedAt = new Date();
  if (status === "escalated") update.escalatedAt = new Date();

  const task = await Task.findById(id);
  if (!task) throw new AppError("Task not found", 404);

  const previousStatus = task.status;
  Object.assign(task, update);
  await task.save();

  if (status === "completed" && previousStatus !== "completed" && task.assignedTo) {
    await User.findByIdAndUpdate(task.assignedTo, { $inc: { currentTaskCount: -1 } });
  }

  const io = getIO();
  if (io) io.emit("task:updated", task.toObject());

  return task;
};

export const reassignTask = async (id, newUserId) => {
  const task = await Task.findById(id);
  if (!task) throw new AppError("Task not found", 404);

  const oldUserId = task.assignedTo;
  task.assignedTo = newUserId;
  task.escalationCount = (task.escalationCount || 0) + 1;
  task.status = "pending";
  await task.save();

  if (oldUserId) await User.findByIdAndUpdate(oldUserId, { $inc: { currentTaskCount: -1 } });
  if (newUserId) await User.findByIdAndUpdate(newUserId, { $inc: { currentTaskCount: 1 } });

  const io = getIO();
  if (io) {
    io.emit("task:updated", task.toObject());
    if (newUserId) io.to(`user:${newUserId}`).emit("task:assigned", task.toObject());
  }

  if (newUserId) {
    const assignee = await User.findById(newUserId).select("name").lean();
    await createNotification({
      type: "task_assigned",
      title: `Reassigned: ${task.title}`,
      message: `Previously assigned to another employee. Escalation #${task.escalationCount}`,
      priority: task.escalationCount > 2 ? "critical" : "high",
      recipientId: newUserId,
      metadata: { taskId: task._id },
    });
  }

  return task;
};

export const escalateOverdueTasks = async () => {
  const overdue = await Task.find({
    status: { $in: ["pending", "in_progress"] },
    dueBy: { $lte: new Date() },
    escalationCount: { $lt: 3 },
  }).lean();

  const results = [];
  for (const task of overdue) {
    const managers = await User.find({
      role: { $in: ["General Manager", "Branch Manager"] },
      employeeStatus: "available",
    }).select("_id name").lean();

    if (managers.length > 0) {
      const manager = managers[0];
      await reassignTask(task._id, manager._id);
      await createNotification({
        type: "manager_alert",
        title: `Escalated: ${task.title}`,
        message: `Task has been escalated (attempt ${task.escalationCount + 1}). No employee completed it by the due time.`,
        priority: "critical",
        recipientId: manager._id,
        metadata: { taskId: task._id },
      });
      results.push({ taskId: task._id, escalatedTo: manager._id });
    }
  }

  return results;
};
