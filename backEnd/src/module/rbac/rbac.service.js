import Role from "../../DB/model/Role.model.js";
import User from "../../DB/model/User.model.js";
import PermissionRegistry from "./PermissionRegistry.js";

export function getPermissionRegistry() {
  return {
    groups: PermissionRegistry.groups,
    modules: PermissionRegistry.getModules(),
    allPermissions: PermissionRegistry.getAllPermissions(),
    allKeys: PermissionRegistry.getAllKeys(),
  };
}

export async function listRoles() {
  const dbRoles = await Role.find({}).lean();
  return dbRoles.map((r) => ({
    _id: r._id,
    name: r.name,
    label: r.label,
    description: r.description || "",
    permissions: r.permissions || [],
    isSystem: r.isSystem || false,
    priority: r.priority || 0,
    createdAt: r.createdAt,
  }));
}

export async function createRole(data) {
  const existing = await Role.findOne({ name: data.name });
  if (existing) throw new Error(`Role "${data.name}" already exists`);
  const role = await Role.create({
    name: data.name,
    label: data.label || data.name,
    description: data.description || "",
    permissions: data.permissions || [],
    isSystem: false,
    priority: data.priority || 0,
  });
  return role;
}

export async function updateRole(id, data) {
  const role = await Role.findById(id);
  if (!role) throw new Error("Role not found");
  if (role.isSystem && data.permissions) {
    const systemFixed = await Role.findOne({ name: role.name }).lean();
    const merged = [...new Set([...(systemFixed.permissions || []), ...(data.permissions || [])])];
    data.permissions = merged;
  }
  Object.assign(role, data);
  await role.save();
  return role;
}

export async function deleteRole(id) {
  const role = await Role.findById(id);
  if (!role) throw new Error("Role not found");
  if (role.isSystem) throw new Error("Cannot delete system roles");
  const usersWithRole = await User.countDocuments({ role: role.name });
  if (usersWithRole > 0) throw new Error(`Cannot delete role: ${usersWithRole} user(s) still have this role`);
  await Role.findByIdAndDelete(id);
}

export async function getUsersWithPermissions(query) {
  const filter = {};
  if (query.role) filter.role = query.role;
  if (query.search) {
    filter.$or = [
      { userName: { $regex: query.search, $options: "i" } },
      { email: { $regex: query.search, $options: "i" } },
    ];
  }
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 50));
  const skip = (page - 1) * limit;

  const [users, total] = await Promise.all([
    User.find(filter)
      .select("userName email role permissions revokedPermissions isDeleted createdAt")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    User.countDocuments(filter),
  ]);

  const roleMap = {};
  const dbRoles = await Role.find({}).lean();
  dbRoles.forEach((r) => { roleMap[r.name] = r.permissions || []; });

  const enriched = users.map((u) => {
    const roleDefaults = roleMap[u.role] || [];
    const effectivePermissions = [
      ...new Set([
        ...roleDefaults.filter((p) => !(u.revokedPermissions || []).includes(p)),
        ...(u.permissions || []),
      ]),
    ];
    return {
      _id: u._id,
      userName: u.userName,
      email: u.email,
      role: u.role,
      isDeleted: u.isDeleted,
      permissions: u.permissions || [],
      revokedPermissions: u.revokedPermissions || [],
      effectivePermissions,
      roleDefaultPermissions: roleDefaults,
    };
  });

  return {
    users: enriched,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  };
}

export async function getUserEffectivePermissions(userId) {
  const user = await User.findById(userId).lean();
  if (!user) throw new Error("User not found");

  const roleDefaults = await getRoleDefaults(user.role);
  const effectivePermissions = computeEffectivePermissions(roleDefaults, user.permissions || [], user.revokedPermissions || []);

  return {
    userId: user._id,
    userName: user.userName,
    role: user.role,
    roleDefaultPermissions: roleDefaults,
    grantedOverrides: user.permissions || [],
    revokedOverrides: user.revokedPermissions || [],
    effectivePermissions,
    allPermissions: PermissionRegistry.getAllPermissions().map((p) => ({
      key: p.key,
      label: p.label,
      module: p.module,
      granted: effectivePermissions.includes(p.key),
      fromRole: roleDefaults.includes(p.key) && !(user.revokedPermissions || []).includes(p.key),
      fromOverride: (user.permissions || []).includes(p.key),
      revoked: (user.revokedPermissions || []).includes(p.key),
    })),
  };
}

export async function updateUserPermissions(userId, body, modifierId) {
  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");

  if (body.permissions) {
    const allKeys = new Set(PermissionRegistry.getAllKeys());
    const invalid = body.permissions.filter((k) => !allKeys.has(k));
    if (invalid.length > 0) throw new Error(`Invalid permission keys: ${invalid.join(", ")}`);
    user.permissions = [...new Set(body.permissions)];
  }

  if (body.revokedPermissions) {
    const allKeys = new Set(PermissionRegistry.getAllKeys());
    const invalid = body.revokedPermissions.filter((k) => !allKeys.has(k));
    if (invalid.length > 0) throw new Error(`Invalid permission keys: ${invalid.join(", ")}`);
    const roleDefaults = await getRoleDefaults(user.role);
    const invalidForRole = body.revokedPermissions.filter((k) => !roleDefaults.includes(k));
    if (invalidForRole.length > 0) throw new Error(`Cannot revoke permissions not in role defaults: ${invalidForRole.join(", ")}`);
    user.revokedPermissions = [...new Set(body.revokedPermissions)];
  }

  if (body.role) {
    user.role = body.role;
  }

  await user.save();

  if (modifierId) {
    try {
      await logPermissionChange(modifierId, userId, body);
    } catch {}
  }

  return getUserEffectivePermissions(userId);
}

export async function updateUserRole(userId, newRole, modifierId) {
  const role = await Role.findOne({ name: newRole });
  if (!role) throw new Error(`Role "${newRole}" not found`);
  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");
  user.role = newRole;
  await user.save();
  if (modifierId) {
    try {
      await logPermissionChange(modifierId, userId, { role: newRole });
    } catch {}
  }
  return getUserEffectivePermissions(userId);
}

export async function resetUserPermissions(userId) {
  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");
  user.permissions = [];
  user.revokedPermissions = [];
  await user.save();
  return getUserEffectivePermissions(userId);
}

export async function duplicateUserPermissions(sourceUserId, targetUserId) {
  const [source, target] = await Promise.all([
    User.findById(sourceUserId),
    User.findById(targetUserId),
  ]);
  if (!source) throw new Error("Source user not found");
  if (!target) throw new Error("Target user not found");
  target.permissions = [...source.permissions];
  target.revokedPermissions = [...source.revokedPermissions];
  target.role = source.role;
  await target.save();
  return getUserEffectivePermissions(targetUserId);
}

export async function getPermissionAuditLogs(query) {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 50));
  const skip = (page - 1) * limit;
  const filter = {};
  if (query.permissionKey) filter["details.permissionKey"] = query.permissionKey;
  if (query.userId) filter.targetUser = query.userId;
  if (query.action) filter.action = query.action;

  const model = getAuditLogModel();
  if (!model) return { logs: [], pagination: { page, limit, total: 0, pages: 0 } };

  const [logs, total] = await Promise.all([
    model.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    model.countDocuments(filter),
  ]);
  return { logs, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
}

export async function checkUserPermission(userId, permissionKey) {
  const user = await User.findById(userId).lean();
  if (!user) return false;
  const roleDefaults = await getRoleDefaults(user.role);
  const effective = computeEffectivePermissions(roleDefaults, user.permissions || [], user.revokedPermissions || []);
  if (effective.includes(permissionKey)) return true;
  const perm = PermissionRegistry.getPermission(permissionKey);
  if (!perm) return false;
  return effective.includes(permissionKey);
}

export function computeEffectivePermissions(roleDefaults = [], extra = [], revoked = []) {
  const roleSet = new Set(roleDefaults);
  revoked.forEach((k) => roleSet.delete(k));
  extra.forEach((k) => roleSet.add(k));
  return [...roleSet];
}

const roleAliases = {
  "Admin": "administrator",
  "Cook": "kitchen staff",
  "Order Taker": "waiter",
  "User": "user",
};

function resolveRoleName(role) {
  return roleAliases[role] || role?.toLowerCase() || "";
}

async function getRoleDefaults(roleName) {
  const resolved = resolveRoleName(roleName);
  const role = await Role.findOne({ name: resolved }).lean();
  if (role?.permissions) return role.permissions;
  return getHardcodedRolePermissions(resolved);
}

function getHardcodedRolePermissions(roleName) {
  const defaults = {
    "owner": PermissionRegistry.getAllKeys(),
    "administrator": PermissionRegistry.getAllKeys(),
    "general manager": [
      ...PermissionRegistry.getModuleKeys("dashboard"),
      ...PermissionRegistry.getModuleKeys("orders"),
      ...PermissionRegistry.getModuleKeys("products"),
      ...PermissionRegistry.getModuleKeys("categories"),
      ...PermissionRegistry.getModuleKeys("kitchen"),
      ...PermissionRegistry.getModuleKeys("tables"),
      ...PermissionRegistry.getModuleKeys("customers"),
      ...PermissionRegistry.getModuleKeys("payments"),
      ...PermissionRegistry.getModuleKeys("reports"),
      ...PermissionRegistry.getModuleKeys("inventory"),
      ...PermissionRegistry.getModuleKeys("employees"),
      ...PermissionRegistry.getModuleKeys("reservations"),
      ...PermissionRegistry.getModuleKeys("notifications"),
      ...PermissionRegistry.getModuleKeys("analytics"),
      ...PermissionRegistry.getModuleKeys("waiter"),
      ...PermissionRegistry.getModuleKeys("host"),
      ...PermissionRegistry.getModuleKeys("cleaning"),
      "auditLog.view",
      "settings.view",
    ],
    "branch manager": [
      ...PermissionRegistry.getModuleKeys("dashboard"),
      ...PermissionRegistry.getModuleKeys("orders"),
      ...PermissionRegistry.getModuleKeys("products"),
      ...PermissionRegistry.getModuleKeys("categories"),
      ...PermissionRegistry.getModuleKeys("kitchen"),
      ...PermissionRegistry.getModuleKeys("tables"),
      ...PermissionRegistry.getModuleKeys("customers"),
      ...PermissionRegistry.getModuleKeys("payments"),
      ...PermissionRegistry.getModuleKeys("reports"),
      ...PermissionRegistry.getModuleKeys("inventory"),
      ...PermissionRegistry.getModuleKeys("employees"),
      ...PermissionRegistry.getModuleKeys("reservations"),
      ...PermissionRegistry.getModuleKeys("notifications"),
      ...PermissionRegistry.getModuleKeys("waiter"),
      ...PermissionRegistry.getModuleKeys("host"),
      ...PermissionRegistry.getModuleKeys("cleaning"),
      "auditLog.view",
      "settings.view",
    ],
    "waiter": [
      "dashboard.view",
      "orders.view", "orders.create", "orders.edit", "orders.reopen", "orders.split", "orders.merge",
      "products.view",
      "tables.view", "tables.viewAvailability",
      "payments.view", "payments.process", "payments.splitBill", "payments.applyDiscount", "payments.manageTips",
      "customers.view", "customers.create", "customers.edit",
      "waiter.view", "waiter.manageRequests", "waiter.processDeliveries", "waiter.viewAssignedTables", "waiter.requestAssistance",
      "notifications.view",
    ],
    "kitchen staff": [
      "dashboard.view",
      "orders.view", "orders.assign",
      "products.view",
      "kitchen.view", "kitchen.manageOrders", "kitchen.markPreparing", "kitchen.markReady", "kitchen.viewPrepTime",
      "inventory.view", "inventory.adjust", "inventory.requestIngredients",
      "notifications.view",
    ],
    "chef": [
      "dashboard.view",
      "orders.view", "orders.assign", "orders.priority",
      "products.view", "products.manageIngredients",
      "kitchen.view", "kitchen.manageOrders", "kitchen.markPreparing", "kitchen.markReady", "kitchen.requestIngredients", "kitchen.viewPrepTime",
      "inventory.view", "inventory.adjust", "inventory.receive",
      "notifications.view",
    ],
    "cashier": [
      "dashboard.view",
      "payments.view", "payments.process", "payments.refund", "payments.splitBill", "payments.applyDiscount", "payments.viewHistory", "payments.manageTips", "payments.closeRegister", "payments.voidTransaction",
      "orders.view",
      "products.view",
      "customers.view",
      "notifications.view",
    ],
    "host": [
      "dashboard.view",
      "host.view", "host.manageArrivals", "host.manageQueue", "host.assignTables", "host.createReservations", "host.viewFloorPlan",
      "tables.view", "tables.viewAvailability", "tables.manageStatus",
      "reservations.view", "reservations.create", "reservations.edit", "reservations.confirm", "reservations.manageWaitlist",
      "customers.view", "customers.create",
      "notifications.view",
    ],
    "cleaner": [
      "dashboard.view",
      "cleaning.view", "cleaning.startCleaning", "cleaning.completeCleaning", "cleaning.viewSchedule",
      "tables.view", "tables.viewAvailability",
      "notifications.view",
    ],
  };
  return defaults[roleName?.toLowerCase()] || [];
}

let AuditLogModel = null;
function getAuditLogModel() {
  if (!AuditLogModel) {
    try {
      AuditLogModel = require("../../DB/model/AuditLog.model.js");
    } catch {}
  }
  return AuditLogModel;
}

async function logPermissionChange(modifierId, targetUserId, changes) {
  const model = getAuditLogModel();
  if (!model) return;
  await model.create({
    action: "PERMISSION_CHANGE",
    performedBy: modifierId,
    targetUser: targetUserId,
    details: changes,
  });
}
