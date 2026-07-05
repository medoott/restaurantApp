import { asyncHandler } from "../../util/error/error.js";
import { successResponse } from "../../util/response/success.res.js";
import * as taskService from "./task.service.js";

export const listEmployeeTasks = asyncHandler(async (req, res) => {
  const result = await taskService.getEmployeeTasks(req.user._id, req.query);
  successResponse({ res, data: result, status: 200 });
});

export const listPendingTasks = asyncHandler(async (req, res) => {
  const result = await taskService.getPendingTasks(req.query);
  successResponse({ res, data: result, status: 200 });
});

export const updateTaskStatus = asyncHandler(async (req, res) => {
  const task = await taskService.updateTaskStatus(req.params.id, req.body.status, req.user._id);
  successResponse({ res, data: task, status: 200 });
});

export const reassignTask = asyncHandler(async (req, res) => {
  const task = await taskService.reassignTask(req.params.id, req.body.assignedTo);
  successResponse({ res, data: task, status: 200 });
});

export const createTask = asyncHandler(async (req, res) => {
  const task = await taskService.createTask({ ...req.body, assignedBy: req.user._id });
  successResponse({ res, data: task, status: 201 });
});

export const escalateOverdue = asyncHandler(async (req, res) => {
  const results = await taskService.escalateOverdueTasks();
  successResponse({ res, data: { escalated: results.length, results }, status: 200 });
});
