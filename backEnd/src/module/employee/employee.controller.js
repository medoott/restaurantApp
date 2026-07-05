import { asyncHandler } from "../../util/error/error.js";
import { successResponse } from "../../util/response/success.res.js";
import * as employeeService from "./employee.service.js";

export const listEmployees = asyncHandler(async (req, res) => {
  const result = await employeeService.listEmployees(req.query);
  successResponse({ res, data: result, status: 200 });
});

export const getEmployee = asyncHandler(async (req, res) => {
  const emp = await employeeService.getEmployeeById(req.params.id);
  successResponse({ res, data: emp, status: 200 });
});

export const updateStatus = asyncHandler(async (req, res) => {
  const emp = await employeeService.updateEmployeeStatus(req.params.id, req.body.status);
  successResponse({ res, data: emp, status: 200 });
});

export const clockIn = asyncHandler(async (req, res) => {
  const emp = await employeeService.clockIn(req.user._id);
  successResponse({ res, data: emp, status: 200 });
});

export const clockOut = asyncHandler(async (req, res) => {
  const emp = await employeeService.clockOut(req.user._id);
  successResponse({ res, data: emp, status: 200 });
});

export const startBreak = asyncHandler(async (req, res) => {
  const emp = await employeeService.startBreak(req.user._id);
  successResponse({ res, data: emp, status: 200 });
});

export const endBreak = asyncHandler(async (req, res) => {
  const emp = await employeeService.endBreak(req.user._id);
  successResponse({ res, data: emp, status: 200 });
});

export const getOnlineEmployees = asyncHandler(async (req, res) => {
  const employees = await employeeService.getOnlineEmployees(req.query.branchId);
  successResponse({ res, data: employees, status: 200 });
});

export const getEmployeeStats = asyncHandler(async (req, res) => {
  const stats = await employeeService.getEmployeeStats();
  successResponse({ res, data: stats, status: 200 });
});
