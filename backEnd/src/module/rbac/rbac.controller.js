import { Router } from "express";
import { asyncHandler } from "../../util/error/error.js";
import { successResponse } from "../../util/response/success.res.js";
import { authentication, authorization, requirePermission, userRoles } from "../../middleware/auth.middleware.js";
import * as rbacService from "./rbac.service.js";

const router = Router();

router.get("/permissions/registry", authentication(), requirePermission("roles.view"), asyncHandler(async (req, res) => {
  const registry = rbacService.getPermissionRegistry();
  successResponse({ res, data: registry });
}));

router.get("/roles", authentication(), requirePermission("roles.view"), asyncHandler(async (req, res) => {
  const roles = await rbacService.listRoles();
  successResponse({ res, data: roles });
}));

router.post("/roles", authentication(), requirePermission("roles.create"), asyncHandler(async (req, res) => {
  const role = await rbacService.createRole(req.body);
  successResponse({ res, data: role, status: 201 });
}));

router.put("/roles/:id", authentication(), requirePermission("roles.edit"), asyncHandler(async (req, res) => {
  const role = await rbacService.updateRole(req.params.id, req.body);
  successResponse({ res, data: role });
}));

router.delete("/roles/:id", authentication(), requirePermission("roles.delete"), asyncHandler(async (req, res) => {
  await rbacService.deleteRole(req.params.id);
  successResponse({ res, data: { message: "Role deleted" } });
}));

router.get("/users/permissions", authentication(), requirePermission("employees.view", "roles.view"), asyncHandler(async (req, res) => {
  const result = await rbacService.getUsersWithPermissions(req.query);
  successResponse({ res, data: result });
}));

router.get("/users/:id/permissions", authentication(), requirePermission("employees.view"), asyncHandler(async (req, res) => {
  const result = await rbacService.getUserEffectivePermissions(req.params.id);
  successResponse({ res, data: result });
}));

router.put("/users/:id/permissions", authentication(), requirePermission("employees.assignRoles"), asyncHandler(async (req, res) => {
  const result = await rbacService.updateUserPermissions(req.params.id, req.body, req.user?._id);
  successResponse({ res, data: result });
}));

router.put("/users/:id/role", authentication(), requirePermission("employees.assignRoles"), asyncHandler(async (req, res) => {
  const result = await rbacService.updateUserRole(req.params.id, req.body.role, req.user?._id);
  successResponse({ res, data: result });
}));

router.post("/users/:id/permissions/reset", authentication(), requirePermission("employees.assignRoles"), asyncHandler(async (req, res) => {
  const result = await rbacService.resetUserPermissions(req.params.id);
  successResponse({ res, data: result });
}));

router.post("/users/:id/permissions/duplicate", authentication(), requirePermission("employees.assignRoles"), asyncHandler(async (req, res) => {
  const result = await rbacService.duplicateUserPermissions(req.params.id, req.body.targetUserId);
  successResponse({ res, data: result });
}));

router.get("/audit/permissions", authentication(), requirePermission("auditLog.view"), asyncHandler(async (req, res) => {
  const result = await rbacService.getPermissionAuditLogs(req.query);
  successResponse({ res, data: result });
}));

router.get("/check/:permissionKey", authentication(), asyncHandler(async (req, res) => {
  const { permissionKey } = req.params;
  const hasAccess = await rbacService.checkUserPermission(req.user._id, permissionKey);
  successResponse({ res, data: { permissionKey, hasAccess } });
}));

export default router;
