import { DEFAULT_ROLES } from "../components/dashboard/settings/rbac/permissionData.js";

const ROLE_ALIASES = {
  User: null,
  Admin: "Owner",
  Cook: "Kitchen Staff",
  "Order Taker": "Waiter",
};

export function getEffectivePermissions(user, settings) {
  if (!user) return [];

  const userRole = user.role || "User";
  const mapped = ROLE_ALIASES[userRole] || userRole;

  const rolesSource = settings?.staff?.roles || [];
  const rolesList = rolesSource.length > 0 ? rolesSource : DEFAULT_ROLES;

  const roleConfig = rolesList.find(
    (r) => r.name.toLowerCase() === mapped.toLowerCase()
  );

  const rolePermissions = roleConfig ? [...roleConfig.permissions] : [];

  const extraPermissions = user.permissions || [];
  const revokedPermissions = user.revokedPermissions || [];

  const merged = [...rolePermissions, ...extraPermissions];

  const filtered = merged.filter((p) => !revokedPermissions.includes(p));

  return [...new Set(filtered)];
}

export function hasPermission(effectivePermissions, key) {
  return effectivePermissions.includes(key);
}

export function hasAnyPermission(effectivePermissions, keys) {
  return keys.some((key) => effectivePermissions.includes(key));
}

export function hasAllPermissions(effectivePermissions, keys) {
  return keys.every((key) => effectivePermissions.includes(key));
}

export function getModulePermissions(effectivePermissions, moduleKey) {
  return effectivePermissions.filter((p) => p.startsWith(moduleKey + "."));
}

export const WORKSPACE_PAGES = [
  { key: "waiter-workspace", label: "My Service", icon: "User", permission: "waiter.own" },
  { key: "cashier-workspace", label: "Payments", icon: "DollarSign", permission: "orders.payment" },
  { key: "host-workspace", label: "Host", icon: "ClipboardList", permission: "host.view" },
  { key: "kitchen-workspace", label: "Kitchen", icon: "ChefHat", permission: "kitchen.view" },
];

export const NAV_ITEMS = [
  { label: "Dashboard", icon: "LayoutGrid", permission: "dashboard.view" },
  { label: "Orders", icon: "ClipboardList", permission: "orders.view" },
  { label: "Cook", icon: "Coffee", permission: "kitchen.view" },
  { label: "Products", icon: "Package", permission: "products.view" },
  { label: "Categories", icon: "Tags", permission: "categories.view" },
  { label: "Tables", icon: "SquareStack", permission: "tables.view" },
  { label: "Customers", icon: "Users", permission: "customers.view" },
  { label: "Reservations", icon: "CalendarDays", permission: "reservations.view" },
  { label: "Suppliers", icon: "ShoppingBag", permission: "suppliers.view" },
  { label: "Purchase Orders", icon: "FileText", permission: "purchaseOrders.view" },
  { label: "KDS", icon: "ChefHat", permission: "kitchen.view" },
  { label: "Waiter Panel", icon: "User", permission: "waiter.own", page: "waiter" },
  { label: "Host", icon: "ClipboardList", permission: "host.view", page: "host" },
  { label: "Cleaning", icon: "SprayCan", permission: "cleaning.view", page: "cleaning" },
  { label: "Waiter Management", icon: "UserCog", permission: "waiter.view" },
  { label: "Activities", icon: "Activity", permission: "activities.view" },
  { label: "Reports", icon: "BarChart3", permission: "reports.view" },
  { label: "Inventory", icon: "Warehouse", permission: "inventory.view" },
  { label: "Settings", icon: "Settings", permission: "settings.view" },
  { label: "System Health", icon: "HeartPulse", permission: "systemHealth.view" },
  { label: "Global Search", icon: "Search", permission: "globalSearch.view" },
  { label: "Notifications", icon: "Bell", permission: "notifications.view" },
  { label: "Audit Log", icon: "ScrollText", permission: "auditLog.view" },
  { label: "RBAC", icon: "Shield", permission: "roles.view", page: "rbac" },
];

export function getDashboardSections(effectivePermissions) {
  return NAV_ITEMS
    .filter((item) => hasPermission(effectivePermissions, item.permission))
    .map((item) => item.label);
}

export const TOP_PAGES = [
  { key: "home", label: "Home", icon: "Coffee", permission: null },
  { key: "menu", label: "Menu", icon: "ShoppingBag", permission: null },
  { key: "track", label: "Track Order", icon: "Truck", permission: null },
  { key: "dashboard", label: "Dashboard", icon: "LayoutDashboard", permission: null },
  { key: "cook", label: "Cook", icon: "LayoutDashboard", permission: "kitchen.view" },
  ...WORKSPACE_PAGES.map((w) => ({ key: w.key, label: w.label, icon: w.icon, permission: w.permission })),
  { key: "tables", label: "Setup", icon: "SquareStack", permission: "tables.view" },
  { key: "tables-dashboard", label: "Tables", icon: "SquareStack", permission: "tables.view" },
  { key: "rbac", label: "RBAC", icon: "Shield", permission: "roles.view" },
];

export function getTopPages(effectivePermissions) {
  return TOP_PAGES.filter((page) => {
    if (!page.permission) return true;
    return hasPermission(effectivePermissions, page.permission);
  });
}

export function getRoleAccess(roleName, settings) {
  const allPermissions = getEffectivePermissions({ role: roleName, permissions: [], revokedPermissions: [] }, settings);
  const dashboardSections = getDashboardSections(allPermissions);
  const pages = getTopPages(allPermissions).map((p) => p.key);

  if (dashboardSections.length > 0 && !pages.includes("dashboard")) {
    pages.unshift("dashboard");
  }

  return {
    pages,
    dashboardSections,
    permissions: allPermissions,
    can: (key) => hasPermission(allPermissions, key),
    canAny: (keys) => hasAnyPermission(allPermissions, keys),
    canAll: (keys) => hasAllPermissions(allPermissions, keys),
  };
}

export function getPermissionKeysForRole(roleId, settings) {
  const rolesSource = settings?.staff?.roles || [];
  const rolesList = rolesSource.length > 0 ? rolesSource : DEFAULT_ROLES;
  const role = rolesList.find((r) => r.id === roleId || r._id === roleId);
  return role ? [...role.permissions] : [];
}

export function computeEffectivePermissions(rolePermissions, extraPermissions, revokedPermissions) {
  const merged = [...rolePermissions, ...(extraPermissions || [])];
  const filtered = merged.filter((p) => !(revokedPermissions || []).includes(p));
  return [...new Set(filtered)];
}
