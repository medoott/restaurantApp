import jwt from "jsonwebtoken";
import crypto from "crypto";
import userModel from "../DB/model/User.model.js";
import TokenBlacklist from "../DB/model/TokenBlacklist.model.js";
import { asyncHandler } from "../util/error/error.js";
import { AppError } from "../util/error/AppError.js";
import { extractBearerToken, resolveTokenSecret } from "../util/security/token.js";

export const userRoles = {
  user: "User",
  admin: "Admin",
  cashier: "Cashier",
  cook: "Cook",
  orderTaker: "Order Taker",
  generalManager: "General Manager",
  branchManager: "Branch Manager",
  host: "Host",
  cleaner: "Cleaner",
};

export const authentication = () => {
  return asyncHandler(async (req, res, next) => {
    const { authorization } = req.headers;
    const token = extractBearerToken(authorization);

    if (!token) {
      return next(new AppError("Authorization token is required", 401));
    }

    const [scheme] = String(authorization || "").trim().split(/\s+/);
    let signature;
    switch (scheme) {
      case "Admin":
        signature = process.env.TOKEN_SIGNATURE_ADMIN;
        break;
      default:
        signature = process.env.TOKEN_SIGNATURE;
    }

    let decoded;
    try {
      decoded = jwt.verify(token, resolveTokenSecret(signature), { algorithms: ['HS256'] });
    } catch {
      return next(new AppError("Invalid or expired token", 401));
    }

    if (!decoded?.id) {
      return next(new AppError("Invalid token payload", 401));
    }

    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const blacklisted = await TokenBlacklist.findOne({ tokenHash }).lean();
    if (blacklisted) {
      return next(new AppError("Token has been revoked", 401));
    }

    const user = await userModel.findById(decoded.id).select("-password").lean();
    if (!user) {
      return next(new AppError("Invalid token", 401));
    }

    req.user = user;
    next();
  });
};

export const authorization = (accessRoles = []) => {
  return asyncHandler(async (req, res, next) => {
    if (!Array.isArray(accessRoles) || accessRoles.length === 0) {
      return next(new AppError("Access denied", 403));
    }

    const normalizedUserRole = resolveRoleName(req.user?.role);
    const hasAccess = accessRoles.some((role) => resolveRoleName(role) === normalizedUserRole);
    if (!hasAccess) {
      return next(new AppError("Access denied", 403));
    }
    next();
  });
};

export const roleAliases = {
  "Admin": "administrator",
  "Cook": "kitchen staff",
  "Order Taker": "waiter",
  "User": "user",
};

function resolveRoleName(role) {
  return roleAliases[role] || role?.toLowerCase() || "";
}

const roleDefaultsCache = new Map();
let _permissionRegistry = null;

async function loadPermissionRegistry() {
  if (_permissionRegistry) return _permissionRegistry;
  try {
    const mod = await import("../module/rbac/PermissionRegistry.js");
    _permissionRegistry = mod.default || mod;
    return _permissionRegistry;
  } catch {
    return null;
  }
}

async function getRoleDefaults(roleName) {
  const resolvedName = resolveRoleName(roleName);
  const cacheKey = `role:${resolvedName}`;
  if (roleDefaultsCache.has(cacheKey)) {
    return roleDefaultsCache.get(cacheKey);
  }
  try {
    const Role = (await import("../DB/model/Role.model.js")).default;
    const role = await Role.findOne({ name: resolvedName }).lean();
    if (role?.permissions) {
      roleDefaultsCache.set(cacheKey, role.permissions);
      return role.permissions;
    }
  } catch {}
  console.warn(`[RBAC] Using hardcoded fallback permissions for role "${resolvedName}". Ensure this role exists in the Role collection.`);
  return getHardcodedRolePermissions(roleName);
}

async function getHardcodedRolePermissions(roleName) {
  const resolved = resolveRoleName(roleName);
  const allKeys = await getAllPermissionKeys();
  const defaults = {
    "owner": allKeys,
    "administrator": allKeys,
    "general manager": [
      ...await getModuleKeysStatic("dashboard"),
      ...await getModuleKeysStatic("orders"),
      ...await getModuleKeysStatic("products"),
      ...await getModuleKeysStatic("categories"),
      ...await getModuleKeysStatic("kitchen"),
      ...await getModuleKeysStatic("tables"),
      ...await getModuleKeysStatic("customers"),
      ...await getModuleKeysStatic("payments"),
      ...await getModuleKeysStatic("reports"),
      ...await getModuleKeysStatic("inventory"),
      ...await getModuleKeysStatic("employees"),
      ...await getModuleKeysStatic("reservations"),
      ...await getModuleKeysStatic("notifications"),
      ...await getModuleKeysStatic("analytics"),
      ...await getModuleKeysStatic("waiter"),
      ...await getModuleKeysStatic("host"),
      ...await getModuleKeysStatic("cleaning"),
      "auditLog.view",
      "settings.view",
    ],
    "branch manager": [
      ...await getModuleKeysStatic("dashboard"),
      ...await getModuleKeysStatic("orders"),
      ...await getModuleKeysStatic("products"),
      ...await getModuleKeysStatic("categories"),
      ...await getModuleKeysStatic("kitchen"),
      ...await getModuleKeysStatic("tables"),
      ...await getModuleKeysStatic("customers"),
      ...await getModuleKeysStatic("payments"),
      ...await getModuleKeysStatic("reports"),
      ...await getModuleKeysStatic("inventory"),
      ...await getModuleKeysStatic("employees"),
      ...await getModuleKeysStatic("reservations"),
      ...await getModuleKeysStatic("notifications"),
      ...await getModuleKeysStatic("waiter"),
      ...await getModuleKeysStatic("host"),
      ...await getModuleKeysStatic("cleaning"),
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
      "inventory.view", "inventory.adjust",
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
  return defaults[resolved] || [];
}

async function getAllPermissionKeys() {
  const reg = await loadPermissionRegistry();
  if (reg) return reg.getAllKeys();
  return [
    "dashboard.view", "dashboard.reports",
    "orders.view", "orders.create", "orders.edit", "orders.delete", "orders.reopen", "orders.assign", "orders.priority", "orders.split", "orders.merge",
    "products.view", "products.create", "products.edit", "products.delete", "products.manageStock", "products.manageIngredients", "products.manageCustomizations",
    "categories.view", "categories.create", "categories.edit", "categories.delete", "categories.reorder",
    "kitchen.view", "kitchen.manageOrders", "kitchen.markPreparing", "kitchen.markReady", "kitchen.requestIngredients", "kitchen.viewPrepTime",
    "tables.view", "tables.create", "tables.edit", "tables.delete", "tables.assign", "tables.merge", "tables.manageStatus", "tables.viewAvailability",
    "customers.view", "customers.create", "customers.edit", "customers.delete", "customers.viewHistory", "customers.manageVIP", "customers.managePreferences", "customers.mergeProfiles",
    "payments.view", "payments.process", "payments.refund", "payments.splitBill", "payments.applyDiscount", "payments.viewHistory", "payments.manageTips", "payments.closeRegister", "payments.voidTransaction",
    "reports.view", "reports.sales", "reports.inventory", "reports.labor", "reports.customerInsights", "reports.export", "reports.schedule",
    "inventory.view", "inventory.create", "inventory.edit", "inventory.delete", "inventory.adjust", "inventory.receive", "inventory.transfer", "inventory.count", "inventory.setReorder", "inventory.manageSuppliers",
    "employees.view", "employees.create", "employees.edit", "employees.delete", "employees.assignRoles", "employees.manageSchedule", "employees.viewPerformance", "employees.manageTimeOff", "employees.manageDocuments",
    "roles.view", "roles.create", "roles.edit", "roles.delete", "roles.manage",
    "settings.view", "settings.edit", "settings.restaurant", "settings.billing", "settings.integrations", "settings.backup", "settings.security",
    "reservations.view", "reservations.create", "reservations.edit", "reservations.delete", "reservations.confirm", "reservations.manageWaitlist",
    "notifications.view", "notifications.send", "notifications.manageTemplates", "notifications.configure",
    "analytics.view", "analytics.customReports", "analytics.exportData", "analytics.dashboard", "analytics.predictions",
    "auditLog.view", "auditLog.export", "auditLog.manageRetention",
    "waiter.view", "waiter.manageRequests", "waiter.processDeliveries", "waiter.viewAssignedTables", "waiter.requestAssistance",
    "host.view", "host.manageArrivals", "host.manageQueue", "host.assignTables", "host.createReservations", "host.viewFloorPlan",
    "cleaning.view", "cleaning.startCleaning", "cleaning.completeCleaning", "cleaning.viewSchedule",
  ];
}

async function getModuleKeysStatic(moduleKey) {
  const reg = await loadPermissionRegistry();
  if (reg) return reg.getModuleKeys(moduleKey);
  return [];
}

export async function computeEffectivePermissions(user) {
  if (!user) return [];
  const roleDefaults = await getRoleDefaults(user.role);
  const roleSet = new Set(roleDefaults);
  (user.revokedPermissions || []).forEach((k) => roleSet.delete(k));
  (user.permissions || []).forEach((k) => roleSet.add(k));
  return [...roleSet];
}

export const requirePermission = (...permissionKeys) => {
  return asyncHandler(async (req, res, next) => {
    if (!permissionKeys || permissionKeys.length === 0) {
      return next();
    }

    const user = req.user;
    if (!user) {
      return next(new AppError("Authentication required", 401));
    }

    const effectivePermissions = await computeEffectivePermissions(user);

    const hasPermission = permissionKeys.some((key) => {
      return effectivePermissions.includes(key);
    });

    if (!hasPermission) {
      return next(new AppError("Insufficient permissions", 403));
    }
    next();
  });
};

export const developerAuthentication = () => {
  return asyncHandler(async (req, res, next) => {
    const { authorization } = req.headers;
    const token = extractBearerToken(authorization);

    if (!token) {
      return next(new AppError("Authorization token is required", 401));
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.TOKEN_SIGNATURE_DEVELOPER, { algorithms: ['HS256'] });
    } catch {
      return next(new AppError("Invalid or expired token", 401));
    }

    if (!decoded?.id) {
      return next(new AppError("Invalid token payload", 401));
    }

    const user = await userModel.findById(decoded.id).lean();
    if (!user || !user.isDeveloper) {
      return next(new AppError("Access denied", 403));
    }

    req.user = user;
    next();
  });
};

export const requireAllPermissions = (...permissionKeys) => {
  return asyncHandler(async (req, res, next) => {
    if (!permissionKeys || permissionKeys.length === 0) {
      return next();
    }

    const user = req.user;
    if (!user) {
      return next(new AppError("Authentication required", 401));
    }

    const effectivePermissions = await computeEffectivePermissions(user);

    const hasAll = permissionKeys.every((key) => {
      return effectivePermissions.includes(key);
    });

    if (!hasAll) {
      return next(new AppError("Insufficient permissions", 403));
    }
    next();
  });
};
