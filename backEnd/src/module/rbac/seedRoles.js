import Role from "../../DB/model/Role.model.js";
import PermissionRegistry from "./PermissionRegistry.js";

const SEED_ROLES = [
  {
    name: "owner",
    label: "Owner",
    description: "Full system access with all permissions",
    permissions: PermissionRegistry.getAllKeys(),
    isSystem: true,
    priority: 100,
  },
  {
    name: "administrator",
    label: "Administrator",
    description: "Full system access for system configuration",
    permissions: PermissionRegistry.getAllKeys(),
    isSystem: true,
    priority: 99,
  },
  {
    name: "general manager",
    label: "General Manager",
    description: "Access to all operational and management features",
    permissions: [
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
    isSystem: true,
    priority: 90,
  },
  {
    name: "branch manager",
    label: "Branch Manager",
    description: "Full access within assigned branch",
    permissions: [
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
    isSystem: true,
    priority: 80,
  },
  {
    name: "waiter",
    label: "Waiter",
    description: "Take orders, serve customers, and process table-side payments",
    permissions: [
      "dashboard.view",
      "orders.view", "orders.create", "orders.edit", "orders.reopen", "orders.split", "orders.merge",
      "products.view",
      "tables.view", "tables.viewAvailability",
      "payments.view", "payments.process", "payments.splitBill", "payments.applyDiscount", "payments.manageTips",
      "customers.view", "customers.create", "customers.edit",
      "waiter.view", "waiter.manageRequests", "waiter.processDeliveries", "waiter.viewAssignedTables", "waiter.requestAssistance",
      "notifications.view",
    ],
    isSystem: true,
    priority: 50,
  },
  {
    name: "kitchen staff",
    label: "Kitchen Staff",
    description: "View and manage orders in the kitchen display system",
    permissions: [
      "dashboard.view",
      "orders.view", "orders.assign",
      "products.view",
      "kitchen.view", "kitchen.manageOrders", "kitchen.markPreparing", "kitchen.markReady", "kitchen.viewPrepTime",
      "inventory.view", "inventory.adjust",
      "notifications.view",
    ],
    isSystem: true,
    priority: 40,
  },
  {
    name: "chef",
    label: "Chef",
    description: "Full kitchen access including recipe and inventory management",
    permissions: [
      "dashboard.view",
      "orders.view", "orders.assign", "orders.priority",
      "products.view", "products.manageIngredients",
      "kitchen.view", "kitchen.manageOrders", "kitchen.markPreparing", "kitchen.markReady", "kitchen.requestIngredients", "kitchen.viewPrepTime",
      "inventory.view", "inventory.adjust", "inventory.receive",
      "notifications.view",
    ],
    isSystem: true,
    priority: 45,
  },
  {
    name: "cashier",
    label: "Cashier",
    description: "Process payments, handle refunds, and close the register",
    permissions: [
      "dashboard.view",
      "payments.view", "payments.process", "payments.refund", "payments.splitBill", "payments.applyDiscount", "payments.viewHistory", "payments.manageTips", "payments.closeRegister", "payments.voidTransaction",
      "orders.view",
      "products.view",
      "customers.view",
      "notifications.view",
    ],
    isSystem: true,
    priority: 55,
  },
  {
    name: "host",
    label: "Host",
    description: "Manage the front-of-house, arrivals, and waitlist",
    permissions: [
      "dashboard.view",
      "host.view", "host.manageArrivals", "host.manageQueue", "host.assignTables", "host.createReservations", "host.viewFloorPlan",
      "tables.view", "tables.viewAvailability", "tables.manageStatus",
      "reservations.view", "reservations.create", "reservations.edit", "reservations.confirm", "reservations.manageWaitlist",
      "customers.view", "customers.create",
      "notifications.view",
    ],
    isSystem: true,
    priority: 35,
  },
  {
    name: "cleaner",
    label: "Cleaner",
    description: "Manage table cleaning and sanitation workflow",
    permissions: [
      "dashboard.view",
      "cleaning.view", "cleaning.startCleaning", "cleaning.completeCleaning", "cleaning.viewSchedule",
      "tables.view", "tables.viewAvailability",
      "notifications.view",
    ],
    isSystem: true,
    priority: 30,
  },
];

export async function seedRoles() {
  for (const roleData of SEED_ROLES) {
    const existing = await Role.findOne({ name: roleData.name });
    if (!existing) {
      await Role.create(roleData);
      console.log(`  ✓ Created role: ${roleData.label}`);
    } else {
      existing.permissions = roleData.permissions;
      existing.label = roleData.label;
      existing.description = roleData.description;
      existing.isSystem = roleData.isSystem;
      existing.priority = roleData.priority;
      await existing.save();
    }
  }
  console.log(`  Roles seeded: ${SEED_ROLES.length} roles configured`);
}

export { SEED_ROLES };
