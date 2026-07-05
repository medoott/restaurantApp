const MODULE_KEYS = {
  dashboard: ["view", "analytics", "reports"],
  orders: ["view", "create", "edit", "delete", "cancel", "pay", "refund", "reopen", "assign", "priority", "split", "merge", "print", "changeStatus", "export"],
  products: ["view", "create", "edit", "delete", "manageStock", "manageIngredients", "manageCustomizations", "import", "export"],
  categories: ["view", "create", "edit", "delete", "reorder"],
  kitchen: ["view", "manageOrders", "markPreparing", "markReady", "requestIngredients", "viewPrepTime", "accept", "prepare", "complete", "print"],
  tables: ["view", "create", "edit", "delete", "assign", "merge", "manageStatus", "viewAvailability"],
  customers: ["view", "create", "edit", "delete", "viewHistory", "manageVIP", "managePreferences", "mergeProfiles", "export"],
  payments: ["view", "process", "refund", "splitBill", "applyDiscount", "viewHistory", "manageTips", "closeRegister", "voidTransaction", "export"],
  reports: ["view", "sales", "inventory", "labor", "customerInsights", "export", "schedule", "financial", "kitchen"],
  inventory: ["view", "create", "edit", "delete", "adjust", "receive", "transfer", "count", "setReorder", "manageSuppliers", "print"],
  employees: ["view", "create", "edit", "delete", "assignRoles", "manageSchedule", "viewPerformance", "manageTimeOff", "manageDocuments"],
  roles: ["view", "create", "edit", "delete", "manage"],
  settings: ["view", "edit", "restaurant", "billing", "integrations", "backup", "security", "system"],
  reservations: ["view", "create", "edit", "delete", "confirm", "manageWaitlist", "approve"],
  notifications: ["view", "send", "manageTemplates", "configure", "manage"],
  analytics: ["view", "customReports", "exportData", "dashboard", "predictions"],
  auditLog: ["view", "export", "manageRetention"],
  waiter: ["view", "manageRequests", "processDeliveries", "viewAssignedTables", "requestAssistance", "own", "callWaiter", "billRequest", "customerRequests"],
  host: ["view", "manageArrivals", "manageQueue", "assignTables", "createReservations", "viewFloorPlan"],
  cleaning: ["view", "startCleaning", "completeCleaning", "viewSchedule"],
  systemHealth: ["view"],
  globalSearch: ["view"],
  activities: ["view"],
  suppliers: ["view", "create", "edit", "delete"],
  purchaseOrders: ["view", "create", "edit", "delete", "approve", "receive", "cancel"],
};

class PermissionRegistry {
  static getAllKeys() {
    const keys = [];
    for (const [module, actions] of Object.entries(MODULE_KEYS)) {
      for (const action of actions) {
        keys.push(`${module}.${action}`);
      }
    }
    return keys;
  }

  static getModuleKeys(moduleName) {
    const actions = MODULE_KEYS[moduleName];
    if (!actions) return [];
    return actions.map((action) => `${moduleName}.${action}`);
  }

  static getModules() {
    return Object.keys(MODULE_KEYS);
  }

  static isValidPermission(key) {
    const [module, action] = key.split(".");
    if (!module || !action) return false;
    const actions = MODULE_KEYS[module];
    if (!actions) return false;
    return actions.includes(action);
  }

  static getAllPermissions() {
    return this.getAllKeys().map((key) => {
      const [module, action] = key.split(".");
      return { key, module, action };
    });
  }

  static getPermission(key) {
    if (!this.isValidPermission(key)) return null;
    const [module, action] = key.split(".");
    return { key, module, action };
  }

  static get groups() {
    return Object.fromEntries(
      Object.entries(MODULE_KEYS).map(([module, actions]) => [
        module,
        {
          label: module.charAt(0).toUpperCase() + module.slice(1),
          permissions: actions.map((action) => ({
            key: `${module}.${action}`,
            label: action.charAt(0).toUpperCase() + action.slice(1),
            action,
          })),
        },
      ])
    );
  }
}

export { MODULE_KEYS };
export default PermissionRegistry;
