import User, { EMPLOYEE_STATUSES } from "../../DB/model/User.model.js";
import Task from "../../DB/model/Task.model.js";
import { AppError } from "../../util/error/AppError.js";
import { escapeRegExp } from "../../util/string/escape-regexp.js";
import { safeObjectId } from "../../util/validation/validateObjectId.js";
import { getIO } from "../../config/socket.js";

export const listEmployees = async (query = {}) => {
  const page = Math.max(Number(query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(query.limit) || 50, 1), 200);
  const search = String(query.search || "").trim();
  const role = String(query.role || "").trim();
  const status = String(query.status || "").trim();
  const branchId = String(query.branchId || "").trim();

  const filter = { role: { $ne: "User" }, isDeveloper: { $ne: true } };
  if (search) {
    const regex = new RegExp(escapeRegExp(search), "i");
    filter.$or = [{ name: regex }, { email: regex }, { phone: regex }];
  }
  if (role) filter.role = role;
  if (status) filter.employeeStatus = status;
  if (branchId) {
    const safeBranchId = safeObjectId(branchId);
    if (safeBranchId) filter.branchId = safeBranchId;
  }

  const [items, total] = await Promise.all([
    User.find(filter).select("-password").sort({ name: 1 }).skip((page - 1) * limit).limit(limit).lean(),
    User.countDocuments(filter),
  ]);

  const enriched = await Promise.all(items.map(async (emp) => {
    const activeTasks = await Task.countDocuments({ assignedTo: emp._id, status: { $in: ["pending", "in_progress"] } });
    return { ...emp, activeTaskCount: activeTasks };
  }));

  return { items: enriched, meta: { page, limit, total, pages: Math.max(Math.ceil(total / limit), 1) } };
};

export const getEmployeeById = async (id) => {
  const emp = await User.findById(id).select("-password").lean();
  if (!emp || emp.isDeveloper) throw new AppError("Employee not found", 404);
  const activeTasks = await Task.countDocuments({ assignedTo: id, status: { $in: ["pending", "in_progress"] } });
  return { ...emp, activeTaskCount: activeTasks };
};

export const updateEmployeeStatus = async (id, status) => {
  if (!EMPLOYEE_STATUSES.includes(status)) {
    throw new AppError(`Invalid status. Must be one of: ${EMPLOYEE_STATUSES.join(", ")}`, 400);
  }

  const emp = await User.findByIdAndUpdate(
    id,
    { employeeStatus: status, lastStatusChange: new Date() },
    { returnDocument: "after" },
  ).select("-password");

  if (!emp) throw new AppError("Employee not found", 404);

  const io = getIO();
  if (io) {
    io.emit("employee:statusChanged", { userId: id, status, name: emp.name });
  }

  return emp;
};

export const clockIn = async (id) => {
  const emp = await User.findByIdAndUpdate(
    id,
    {
      "shift.clockedIn": true,
      "shift.clockedInAt": new Date(),
      "shift.clockedOutAt": null,
      employeeStatus: "available",
      lastStatusChange: new Date(),
    },
    { returnDocument: "after" },
  ).select("-password");

  if (!emp) throw new AppError("Employee not found", 404);

  const io = getIO();
  if (io) io.emit("employee:statusChanged", { userId: id, status: "available", name: emp.name });
  return emp;
};

export const clockOut = async (id) => {
  const emp = await User.findById(id);
  if (!emp) throw new AppError("Employee not found", 404);

  const breakMinutes = emp.shift?.breakStartedAt
    ? emp.shift.totalBreakMinutes + (Date.now() - new Date(emp.shift.breakStartedAt).getTime()) / 60000
    : emp.shift?.totalBreakMinutes || 0;

  const updated = await User.findByIdAndUpdate(
    id,
    {
      "shift.clockedIn": false,
      "shift.clockedOutAt": new Date(),
      "shift.breakStartedAt": null,
      "shift.totalBreakMinutes": Math.round(breakMinutes),
      employeeStatus: "offline",
      lastStatusChange: new Date(),
    },
    { returnDocument: "after" },
  ).select("-password");

  const io = getIO();
  if (io) io.emit("employee:statusChanged", { userId: id, status: "offline", name: updated.name });
  return updated;
};

export const startBreak = async (id) => {
  const emp = await User.findByIdAndUpdate(
    id,
    {
      "shift.breakStartedAt": new Date(),
      employeeStatus: "on_break",
      lastStatusChange: new Date(),
    },
    { returnDocument: "after" },
  ).select("-password");

  if (!emp) throw new AppError("Employee not found", 404);

  const io = getIO();
  if (io) io.emit("employee:statusChanged", { userId: id, status: "on_break", name: emp.name });
  return emp;
};

export const endBreak = async (id) => {
  const emp = await User.findById(id);
  if (!emp) throw new AppError("Employee not found", 404);
  if (!emp.shift?.breakStartedAt) throw new AppError("No active break", 400);

  const breakMinutes = (Date.now() - new Date(emp.shift.breakStartedAt).getTime()) / 60000;
  const totalBreakMinutes = Math.round((emp.shift.totalBreakMinutes || 0) + breakMinutes);

  const updated = await User.findByIdAndUpdate(
    id,
    {
      "shift.breakStartedAt": null,
      "shift.totalBreakMinutes": totalBreakMinutes,
      employeeStatus: "available",
      lastStatusChange: new Date(),
    },
    { returnDocument: "after" },
  ).select("-password");

  const io = getIO();
  if (io) io.emit("employee:statusChanged", { userId: id, status: "available", name: updated.name });
  return updated;
};

export const getOnlineEmployees = async (branchId = null) => {
  const filter = {
    role: { $ne: "User" },
    isDeveloper: { $ne: true },
    employeeStatus: { $in: ["available", "busy", "serving", "preparing"] },
  };
  if (branchId) filter.branchId = branchId;

  const employees = await User.find(filter).select("name role employeeStatus currentTaskCount maxConcurrentTasks image").lean();
  return employees.map((e) => ({
    ...e,
    available: e.employeeStatus === "available",
    workload: e.maxConcurrentTasks > 0 ? e.currentTaskCount / e.maxConcurrentTasks : 1,
  }));
};

export const getEmployeeStats = async () => {
  const baseFilter = { role: { $ne: "User" }, isDeveloper: { $ne: true } };
  const [total, available, busy, onBreak, offline, clockedIn] = await Promise.all([
    User.countDocuments(baseFilter),
    User.countDocuments({ ...baseFilter, employeeStatus: "available" }),
    User.countDocuments({ ...baseFilter, employeeStatus: { $in: ["busy", "serving", "preparing"] } }),
    User.countDocuments({ ...baseFilter, employeeStatus: "on_break" }),
    User.countDocuments({ ...baseFilter, employeeStatus: "offline" }),
    User.countDocuments({ ...baseFilter, "shift.clockedIn": true }),
  ]);

  return { total, available, busy, onBreak, offline, clockedIn };
};
