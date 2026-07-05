import User from "../../../DB/model/User.model.js";
import Task from "../../../DB/model/Task.model.js";
import WaiterRequest from "../../../DB/model/WaiterRequest.model.js";
import { createNotification } from "../../notification/notification.service.js";
import { reassignTask } from "../../task/task.service.js";
import { getIO } from "../../../config/socket.js";
import AuditLog from "../../../DB/model/AuditLog.model.js";

const ESCALATION_TIMEOUTS = {
  waiter_call: 60000,
  request_water: 60000,
  request_cutlery: 60000,
  request_napkins: 60000,
  request_sauce: 60000,
  request_assistance: 60000,
  request_bill: 60000,
  delivery: 90000,
};

const MAX_ESCALATION_LEVELS = 3;

export async function scheduleEscalation(requestId, taskId, type, tableNumber, context = {}) {
  const timeout = ESCALATION_TIMEOUTS[type] || 60000;

  setTimeout(async () => {
    try {
      const task = await Task.findById(taskId).lean();
      if (!task || task.status !== "pending") return;

      const request = await WaiterRequest.findById(requestId).lean();
      if (!request || request.status !== "pending") return;

      const escalationLevel = (task.escalationCount || 0) + 1;
      await executeEscalation(requestId, taskId, type, tableNumber, escalationLevel, context);
    } catch (err) {
      console.error(`[Escalation Error] ${err.message}`);
    }
  }, timeout);
}

async function executeEscalation(requestId, taskId, type, tableNumber, level, context) {
  const currentTask = await Task.findById(taskId).lean();
  if (!currentTask || currentTask.status !== "pending") return;

  const previousAssignee = currentTask.assignedTo;
  const targetRoles = getEscalationRoles(level);
  let nextAssignee = null;

  for (const role of targetRoles) {
    const candidates = await User.find({
      role,
      employeeStatus: { $nin: ["offline", "on_break"] },
      "shift.clockedIn": true,
      ...(previousAssignee ? { _id: { $ne: previousAssignee } } : {}),
    })
      .select("name role employeeStatus currentTaskCount maxConcurrentTasks")
      .sort({ currentTaskCount: 1, employeeStatus: 1 })
      .limit(1)
      .lean();

    if (candidates.length > 0) {
      nextAssignee = candidates[0];
      break;
    }
  }

  if (!nextAssignee) {
    await createNotification({
      type: "manager_alert",
      title: "Critical: No Staff Available",
      message: `Escalation level ${level} — ${type} at Table ${tableNumber} — no available staff found.`,
      priority: "critical",
      roleTarget: "General Manager",
      metadata: { tableNumber, requestId, taskId },
    });
    return;
  }

  await reassignTask(taskId, nextAssignee._id);
  await Task.findByIdAndUpdate(taskId, {
    $set: {
      escalationCount: level,
      escalatedAt: new Date(),
      priority: level >= 2 ? "critical" : "high",
    },
  });

  const escalationLabel = getEscalationLabel(level);
  const typeLabel = getTypeLabel(type);

  await createNotification({
    type: level >= 2 ? "manager_alert" : "waiter_escalated",
    title: `${escalationLabel} — ${typeLabel}`,
    message: `Table ${tableNumber}: ${typeLabel} — ${escalationLabel} to ${nextAssignee.name}`,
    priority: level >= 2 ? "critical" : "high",
    recipientId: nextAssignee._id,
    metadata: { tableNumber, requestId, taskId, escalationLevel: level },
  });

  await AuditLog.create({
    action: `request_escalated_level_${level}`,
    description: `${typeLabel} at Table ${tableNumber} escalated (level ${level}) to ${nextAssignee.name}`,
    tableNumber,
    newValue: { escalationLevel: level, previousAssignee, nextAssignee: nextAssignee._id },
  });

  const io = getIO();
  if (io) {
    io.to(`user:${nextAssignee._id}`).emit("task:escalated", {
      taskId,
      requestId,
      tableNumber,
      type,
      escalationLevel: level,
    });
    if (level >= 2) {
      io.to("role:General Manager").emit("manager:alert", {
        type: "escalation",
        tableNumber,
        message: `${typeLabel} escalated to level ${level}`,
      });
    }
  }

  if (level < MAX_ESCALATION_LEVELS) {
    const nextTimeout = getEscalationTimeout(level);
    setTimeout(async () => {
      await executeEscalation(requestId, taskId, type, tableNumber, level + 1, context);
    }, nextTimeout);
  }
}

function getEscalationRoles(level) {
  switch (level) {
    case 1: return ["Order Taker"];
    case 2: return ["Branch Manager", "Order Taker"];
    case 3: return ["General Manager", "Branch Manager"];
    default: return ["General Manager"];
  }
}

function getEscalationLabel(level) {
  switch (level) {
    case 1: return "Reassigned";
    case 2: return "Escalated to Supervisor";
    case 3: return "Critical — Manager Required";
    default: return "Critical Escalation";
  }
}

function getEscalationTimeout(level) {
  switch (level) {
    case 1: return 60000;
    case 2: return 90000;
    default: return 120000;
  }
}

function getTypeLabel(type) {
  const labels = {
    call_waiter: "Waiter Call",
    request_water: "Water Request",
    request_cutlery: "Cutlery Request",
    request_napkins: "Napkins Request",
    request_sauce: "Sauce Request",
    request_assistance: "Assistance Request",
    request_bill: "Bill Request",
    delivery: "Delivery",
  };
  return labels[type] || type;
}

export async function escalateOverdueTasks() {
  const overdue = await Task.find({
    status: "pending",
    dueBy: { $lte: new Date() },
    escalationCount: { $lt: MAX_ESCALATION_LEVELS },
  })
    .sort({ priority: 1, createdAt: 1 })
    .limit(20)
    .lean();

  const results = [];
  for (const task of overdue) {
    const newLevel = (task.escalationCount || 0) + 1;
    const type = task.category || "waiter_call";
    await executeEscalation(
      task.requestId?.toString() || task._id.toString(),
      task._id,
      type,
      task.tableNumber || 0,
      newLevel,
      {},
    );
    results.push({ taskId: task._id, escalatedTo: newLevel });
  }
  return results;
}
