import { Router } from "express";
import auth from "./module/auth/auth.controller.js";
import user from "./module/user/user.controller.js";
import {
  addItemsToOrder, createOrder, getOrdersStats, getOrders, trackOrder,
  updateOrder,   cancelOrder,
  payOrder,
  rejectOrder,
  reopenOrder,
  deleteOrder,
} from "./module/order/order.controller.js";
import { createProduct, getProducts } from "./module/product/product.controller.js";
import {
  getSettings, updateSettings, downloadBackup, restoreBackup,
} from "./module/settings/settings.controller.js";
import {
  createShortage, getShortages, getShortage,
  resolveShortageEndpoint, dismissShortageEndpoint,
  getShortageReportsEndpoint, getConsumptionReportEndpoint, getShortageStatsEndpoint,
} from "./module/shortage/shortage.controller.js";
import {
  listItems, getItem, createItem, updateItem, deleteItem,
  addStock, reduceStock, adjustStock, transferStock,
  getSummary, getAlerts, getAnalytics,
  getConsumptionTrends, getStockDistribution,
} from "./module/inventory/inventory.controller.js";
import {
  listTables, getTable, getTableByNumberEndpoint,
  addTable, editTable, removeTable, getTableQRCode,
  startSession, verifySession, endSession, getSessionStatus, getTableSession,
  mergeTables, splitTables, moveOrderToTable, changeTableNumber,
  lockTable, unlockTable, reopenTable,
  getTablesBySection, updateTableLayout, getTableWithDetails, getFloorLayout,
} from "./module/table/table.controller.js";
import {
  callWaiter, requestBill, requestWater, requestCutlery,
  requestNapkins, requestSauce, requestAssistance, requestCustom,
  getRequests, acknowledge, resolve, pendingCounts,
} from "./module/waiter/waiter.controller.js";
import {
  listNotifications, acknowledgeNotification, acknowledgeAllNotifications, getUnreadCount,
} from "./module/notification/notification.controller.js";
import {
  listEmployees, getEmployee, updateStatus,
  clockIn, clockOut, startBreak, endBreak,
  getOnlineEmployees, getEmployeeStats,
} from "./module/employee/employee.controller.js";
import {
  listEmployeeTasks, listPendingTasks, updateTaskStatus, reassignTask, createTask, escalateOverdue,
} from "./module/task/task.controller.js";
import analyticsRoutes from "./module/analytics/analytics.routes.js";
import { listAuditLogs, getAuditLog } from "./module/audit/audit.controller.js";
import {
  assignDelivery, acceptDelivery, confirmPickup, confirmDelivery,
  myDeliveries, pendingDeliveries, delayedDeliveries, awaitingAssignment, checkDelays,
} from "./module/delivery/delivery.controller.js";
import {
  createPayment, processPayment, pendingPayments, paymentHistory, closeTable,
} from "./module/payment/payment.controller.js";
import {
  kitchenPerformance, waiterPerformance, cashierPerformance, restaurantOverview,
} from "./module/analytics/performance.controller.js";
import {
  listReservations, getReservation, createReservation, updateReservation,
  cancelReservation, rescheduleReservation, assignTable, checkInCustomer,
  seatReservation, completeReservation, getReservationHistory,
  getAvailableTables, getTodayReservations, processNoShows,
} from "./module/reservation/reservation.controller.js";
import {
  listRecipes, getRecipe, getRecipesByProduct,
  createRecipe, updateRecipe, deleteRecipe, getRecipeCostAnalysis,
} from "./module/recipe/recipe.controller.js";
import {
  recordWaste, performStockCount, getInventoryValue,
  getMostConsumedIngredients, getInventoryUsageTrends,
  exportInventoryReport, getExpiredItems, getNearExpirationItems,
} from "./module/inventory/inventory.controller.js";
import {
  listSuppliers, getSupplier, createSupplier, updateSupplier, deleteSupplier,
  getOutstandingBalances, getSupplierPerformance, getSupplierAnalytics,
} from "./module/supplier/supplier.controller.js";
import {
  listCustomers, getCustomer, getCustomerByPhone, createCustomer, updateCustomer, deleteCustomer,
  addStaffNote, recordVisit, addFavoriteProduct, removeFavoriteProduct,
  updateLoyaltyPoints, getCustomerAnalytics, getTopCustomers, getCustomerSegmentation, getCustomerStats,
} from "./module/customer/customer.controller.js";
import {
  listPurchaseOrders, getPurchaseOrder, createPurchaseOrder, updatePurchaseOrder, deletePurchaseOrder,
  approvePurchaseOrder, receivePurchaseOrder, cancelPurchaseOrder, updatePaymentStatus,
} from "./module/purchaseOrder/purchaseOrder.controller.js";
import {
  markNeedsCleaning, startCleaning, completeCleaning,
  getTablesNeedingCleaning, getCleaningStats, getCleaningHistory,
} from "./module/cleaning/cleaning.controller.js";
import { getSystemHealth, getErrorLogs, getBackupStatus, getSystemInfo } from "./module/system/system.controller.js";
import { globalSearch } from "./module/search/search.controller.js";
import { getOrderTimeline, getTimelineEvents } from "./module/timeline/timeline.controller.js";
import {
  getKDSOrders, getKDSOrderStats, acceptKDSOrder, completeKDSOrder, getDelayedOrders,
} from "./module/kitchen/kitchen.controller.js";
import {
  listWaiters, getWaiterDetails, getAssignedTables, getActiveTasks,
  getPendingRequests, getDeliveryQueue, getWaiterStats,
  reassignWaiterRequest, getWorkloadBalancing, autoAssignWaiter,
} from "./module/waiter/waiter.management.controller.js";
import {
  getSalesReport, getOrdersReport, getProductsReport, getInventoryReport,
  getCustomerReport, getWaiterReport, getTableReport, getPaymentReport,
} from "./module/reports/reports.controller.js";
import {
  createWalkIn, createReservationVisitEndpoint, seatVisitEndpoint,
  requestBillEndpoint, closeVisitEndpoint, getActiveVisitByTableEndpoint,
  getActiveVisitsEndpoint, getVisitHistoryEndpoint, getVisitAnalyticsEndpoint,
  transferVisitTableEndpoint, completePaymentEndpoint, abandonVisitEndpoint,
  addToQueue, callFromQueue, seatFromQueue, cancelFromQueue, getQueueStatusEndpoint,
} from "./module/visit/visit.controller.js";
import {
  customerArrival, seatCustomer, getQueueStatus,
  notifyCustomerFromQueue, cancelWaiting, getHostDashboard,
  calculateBill, createPaymentSession, processPaymentSession,
  splitBillByAmount, applyCoupon, escalateOverdueTasks,
} from "./module/host/host.controller.js";
import rbacRouter from "./module/rbac/rbac.controller.js";
import { authentication, requirePermission } from "./middleware/auth.middleware.js";
import { optionalAuth } from "./middleware/optionalAuth.middleware.js";
import { scopeToBranch } from "./middleware/scopeToBranch.middleware.js";
import { validate } from "./middleware/validate.middleware.js";
import {
  orderLimiter, sessionLimiter, waiterRequestLimiter, apiLimiter,
} from "./middleware/rateLimiter.middleware.js";
import { createOrderSchema, updateOrderSchema, addItemsToOrderSchema } from "./module/order/order.validation.js";
import { createProductSchema } from "./module/product/product.validation.js";

const router = Router();

router.use("/auth", auth);
router.use("/user", user);

// --- Products ---
router.get("/products", optionalAuth, getProducts);
router.post("/products", authentication(), requirePermission("products.create"), validate(createProductSchema), createProduct);

// --- Orders ---
router.get("/orders", authentication(), scopeToBranch, requirePermission("orders.view"), apiLimiter, getOrders);
router.get("/orders/stats", authentication(), scopeToBranch, requirePermission("orders.view"), apiLimiter, getOrdersStats);
router.get("/orders/:id/track", optionalAuth, trackOrder);
router.post("/orders/:id/items", authentication(), requirePermission("orders.edit"), orderLimiter, validate(addItemsToOrderSchema), addItemsToOrder);
router.post("/orders", optionalAuth, orderLimiter, validate(createOrderSchema), createOrder);
router.put("/orders/:id", authentication(), requirePermission("orders.edit"), apiLimiter, validate(updateOrderSchema), updateOrder);
router.put("/orders/:id/cancel", authentication(), requirePermission("orders.edit"), cancelOrder);
router.put("/orders/:id/pay", authentication(), requirePermission("payments.process"), payOrder);
router.put("/orders/:id/reject", authentication(), requirePermission("kitchen.manageOrders"), rejectOrder);
router.put("/orders/:id/reopen", authentication(), requirePermission("orders.edit"), reopenOrder);
router.delete("/orders/:id", authentication(), requirePermission("orders.delete"), deleteOrder);

// --- Shortages ---
router.get("/shortages/stats", authentication(), requirePermission("reports.inventory"), getShortageStatsEndpoint);
router.get("/shortages/reports", authentication(), requirePermission("reports.inventory"), getShortageReportsEndpoint);
router.get("/shortages/consumption", authentication(), requirePermission("reports.inventory"), getConsumptionReportEndpoint);
router.get("/shortages", authentication(), requirePermission("inventory.view"), getShortages);
router.get("/shortages/:id", authentication(), requirePermission("inventory.view"), getShortage);
router.post("/shortages", authentication(), requirePermission("inventory.adjust"), createShortage);
router.put("/shortages/:id/resolve", authentication(), requirePermission("inventory.adjust"), resolveShortageEndpoint);
router.put("/shortages/:id/dismiss", authentication(), requirePermission("inventory.adjust"), dismissShortageEndpoint);

// --- Settings ---
router.get("/settings", authentication(), requirePermission("settings.view"), getSettings);
router.put("/settings", authentication(), requirePermission("settings.edit"), updateSettings);
router.get("/settings/backup", authentication(), requirePermission("settings.backup"), downloadBackup);
router.post("/settings/restore", authentication(), requirePermission("settings.backup"), restoreBackup);

// --- Tables ---
router.get("/tables", authentication(), requirePermission("tables.view"), listTables);
router.get("/tables/number/:number", optionalAuth, getTableByNumberEndpoint);
router.get("/tables/:id", authentication(), requirePermission("tables.view"), getTable);
router.post("/tables", authentication(), requirePermission("tables.create"), addTable);
router.put("/tables/:id", authentication(), requirePermission("tables.edit"), editTable);
router.delete("/tables/:id", authentication(), requirePermission("tables.delete"), removeTable);
router.get("/tables/:id/qrcode", authentication(), requirePermission("tables.view"), getTableQRCode);
router.post("/tables/session/start", sessionLimiter, startSession);
router.post("/tables/session/verify", sessionLimiter, verifySession);
router.post("/tables/session/end", authentication(), requirePermission("tables.manageStatus"), endSession);
router.get("/tables/session/:sessionToken", authentication(), requirePermission("tables.view"), getSessionStatus);
router.get("/tables/:tableNumber/session", authentication(), requirePermission("tables.view"), getTableSession);

// --- New Table Operations ---
router.get("/tables/floor/layout", authentication(), requirePermission("tables.view"), getFloorLayout);
router.get("/tables/section/:section", authentication(), requirePermission("tables.view"), getTablesBySection);
router.get("/tables/:id/details", authentication(), requirePermission("tables.view"), getTableWithDetails);
router.put("/tables/:id/layout", authentication(), requirePermission("tables.edit"), updateTableLayout);
router.post("/tables/merge", authentication(), requirePermission("tables.merge"), mergeTables);
router.post("/tables/:id/split", authentication(), requirePermission("tables.manageStatus"), splitTables);
router.post("/tables/move-order", authentication(), requirePermission("orders.edit"), moveOrderToTable);
router.put("/tables/:id/number", authentication(), requirePermission("tables.edit"), changeTableNumber);
router.put("/tables/:id/lock", authentication(), requirePermission("tables.manageStatus"), lockTable);
router.put("/tables/:id/unlock", authentication(), requirePermission("tables.manageStatus"), unlockTable);
router.post("/tables/reopen", authentication(), requirePermission("tables.manageStatus"), reopenTable);

// --- Reservation Routes ---
router.get("/reservations/today", authentication(), requirePermission("reservations.view"), getTodayReservations);
router.get("/reservations/available-tables", authentication(), requirePermission("reservations.view"), getAvailableTables);
router.get("/reservations/history", authentication(), requirePermission("reservations.view"), getReservationHistory);
router.post("/reservations/process-no-shows", authentication(), requirePermission("reservations.edit"), processNoShows);
router.get("/reservations", authentication(), requirePermission("reservations.view"), listReservations);
router.get("/reservations/:id", authentication(), requirePermission("reservations.view"), getReservation);
router.post("/reservations", authentication(), requirePermission("reservations.create"), createReservation);
router.put("/reservations/:id", authentication(), requirePermission("reservations.edit"), updateReservation);
router.put("/reservations/:id/cancel", authentication(), requirePermission("reservations.delete"), cancelReservation);
router.put("/reservations/:id/reschedule", authentication(), requirePermission("reservations.edit"), rescheduleReservation);
router.put("/reservations/:id/assign-table", authentication(), requirePermission("reservations.edit"), assignTable);
router.put("/reservations/:id/check-in", authentication(), requirePermission("reservations.confirm"), checkInCustomer);
router.put("/reservations/:id/seat", authentication(), requirePermission("reservations.confirm"), seatReservation);
router.put("/reservations/:id/complete", authentication(), requirePermission("reservations.edit"), completeReservation);

// --- Recipe Routes ---
router.get("/recipes", authentication(), requirePermission("products.view"), listRecipes);
router.get("/recipes/by-product/:productId", authentication(), requirePermission("products.view"), getRecipesByProduct);
router.get("/recipes/cost-analysis", authentication(), requirePermission("reports.view"), getRecipeCostAnalysis);
router.get("/recipes/:id", authentication(), requirePermission("products.view"), getRecipe);
router.post("/recipes", authentication(), requirePermission("products.manageIngredients"), createRecipe);
router.put("/recipes/:id", authentication(), requirePermission("products.manageIngredients"), updateRecipe);
router.delete("/recipes/:id", authentication(), requirePermission("products.manageIngredients"), deleteRecipe);

// --- Waiter Request Routes (public from table, authenticated for management) ---
router.post("/waiter/call", waiterRequestLimiter, callWaiter);
router.post("/waiter/bill", waiterRequestLimiter, requestBill);
router.post("/waiter/water", waiterRequestLimiter, requestWater);
router.post("/waiter/cutlery", waiterRequestLimiter, requestCutlery);
router.post("/waiter/napkins", waiterRequestLimiter, requestNapkins);
router.post("/waiter/sauce", waiterRequestLimiter, requestSauce);
router.post("/waiter/assistance", waiterRequestLimiter, requestAssistance);
router.get("/waiter/requests", authentication(), requirePermission("waiter.manageRequests"), getRequests);
router.get("/waiter/pending-counts", authentication(), requirePermission("waiter.view"), pendingCounts);
router.put("/waiter/requests/:id/acknowledge", authentication(), requirePermission("waiter.manageRequests"), acknowledge);
router.put("/waiter/requests/:id/resolve", authentication(), requirePermission("waiter.manageRequests"), resolve);

// --- Analytics ---
router.use("/analytics", authentication(), requirePermission("analytics.view"), analyticsRoutes);

// --- Inventory ---
router.get("/inventory", authentication(), requirePermission("inventory.view"), listItems);
router.get("/inventory/summary", authentication(), requirePermission("inventory.view"), getSummary);
router.get("/inventory/alerts", authentication(), requirePermission("inventory.view"), getAlerts);
router.get("/inventory/analytics", authentication(), requirePermission("reports.inventory"), getAnalytics);
router.get("/inventory/:id", authentication(), requirePermission("inventory.view"), getItem);
router.post("/inventory", authentication(), requirePermission("inventory.create"), createItem);
router.put("/inventory/:id", authentication(), requirePermission("inventory.edit"), updateItem);
router.delete("/inventory/:id", authentication(), requirePermission("inventory.delete"), deleteItem);
router.post("/inventory/:id/stock/add", authentication(), requirePermission("inventory.adjust"), addStock);
router.post("/inventory/:id/stock/reduce", authentication(), requirePermission("inventory.adjust"), reduceStock);
router.post("/inventory/:id/stock/adjust", authentication(), requirePermission("inventory.adjust"), adjustStock);
router.post("/inventory/stock/transfer", authentication(), requirePermission("inventory.transfer"), transferStock);
router.get("/inventory/analytics/consumption", authentication(), requirePermission("reports.inventory"), getConsumptionTrends);
router.get("/inventory/analytics/stock-levels", authentication(), requirePermission("inventory.view"), getStockDistribution);

// --- New Inventory Routes ---
router.post("/inventory/:id/waste", authentication(), requirePermission("inventory.adjust"), recordWaste);
router.post("/inventory/:id/stock-count", authentication(), requirePermission("inventory.count"), performStockCount);
router.get("/inventory/analytics/value", authentication(), requirePermission("reports.inventory"), getInventoryValue);
router.get("/inventory/analytics/most-consumed", authentication(), requirePermission("reports.inventory"), getMostConsumedIngredients);
router.get("/inventory/analytics/usage-trends", authentication(), requirePermission("reports.inventory"), getInventoryUsageTrends);
router.get("/inventory/analytics/expired", authentication(), requirePermission("inventory.view"), getExpiredItems);
router.get("/inventory/analytics/near-expiration", authentication(), requirePermission("inventory.view"), getNearExpirationItems);
router.get("/inventory/export/:format", authentication(), requirePermission("inventory.view"), exportInventoryReport);

// --- Notifications ---
router.get("/notifications", authentication(), requirePermission("notifications.view"), listNotifications);
router.get("/notifications/unread-count", authentication(), requirePermission("notifications.view"), getUnreadCount);
router.put("/notifications/:id/acknowledge", authentication(), requirePermission("notifications.view"), acknowledgeNotification);
router.put("/notifications/acknowledge-all", authentication(), requirePermission("notifications.view"), acknowledgeAllNotifications);

// --- Employees ---
router.get("/employees", authentication(), requirePermission("employees.view"), listEmployees);
router.get("/employees/stats", authentication(), requirePermission("employees.viewPerformance"), getEmployeeStats);
router.get("/employees/online", authentication(), requirePermission("employees.view"), getOnlineEmployees);
router.get("/employees/:id", authentication(), requirePermission("employees.view"), getEmployee);
router.put("/employees/:id/status", authentication(), requirePermission("employees.edit"), updateStatus);
router.post("/employees/clock-in", authentication(), clockIn);
router.post("/employees/clock-out", authentication(), clockOut);
router.post("/employees/break-start", authentication(), startBreak);
router.post("/employees/break-end", authentication(), endBreak);

// --- Tasks ---
router.get("/tasks/mine", authentication(), listEmployeeTasks);
router.get("/tasks/pending", authentication(), requirePermission("employees.view"), listPendingTasks);
router.post("/tasks", authentication(), requirePermission("employees.edit"), createTask);
router.put("/tasks/:id/status", authentication(), updateTaskStatus);
router.put("/tasks/:id/reassign", authentication(), requirePermission("employees.edit"), reassignTask);
router.post("/tasks/escalate-overdue", authentication(), requirePermission("employees.edit"), escalateOverdue);

// --- Audit Logs ---
router.get("/audit-logs", authentication(), requirePermission("auditLog.view"), listAuditLogs);
router.get("/audit-logs/:id", authentication(), requirePermission("auditLog.view"), getAuditLog);

// --- Delivery Routes ---
router.post("/delivery/assign", authentication(), requirePermission("orders.assign"), assignDelivery);
router.put("/delivery/:id/accept", authentication(), acceptDelivery);
router.put("/delivery/:id/pickup", authentication(), confirmPickup);
router.put("/delivery/:id/deliver", authentication(), confirmDelivery);
router.get("/delivery/mine", authentication(), myDeliveries);
router.get("/delivery/pending", authentication(), requirePermission("orders.view"), pendingDeliveries);
router.get("/delivery/delayed", authentication(), requirePermission("orders.view"), delayedDeliveries);
router.get("/delivery/awaiting-assignment", authentication(), requirePermission("orders.view"), awaitingAssignment);
router.post("/delivery/check-delays", authentication(), requirePermission("orders.assign"), checkDelays);

// --- Payment Session Routes ---
router.post("/payments/create", authentication(), requirePermission("payments.process"), createPayment);
router.put("/payments/:id/process", authentication(), requirePermission("payments.process"), processPayment);
router.get("/payments/pending", authentication(), requirePermission("payments.view"), pendingPayments);
router.get("/payments/history", authentication(), requirePermission("payments.view"), paymentHistory);
router.post("/payments/close-table", authentication(), requirePermission("payments.process"), closeTable);

// --- Performance Routes ---
router.get("/performance/kitchen", authentication(), requirePermission("reports.view"), kitchenPerformance);
router.get("/performance/waiter", authentication(), requirePermission("reports.view"), waiterPerformance);
router.get("/performance/cashier", authentication(), requirePermission("reports.view"), cashierPerformance);
router.get("/performance/overview", authentication(), requirePermission("reports.view"), restaurantOverview);

// --- Supplier Routes ---
router.get("/suppliers", authentication(), requirePermission("inventory.manageSuppliers"), listSuppliers);
router.get("/suppliers/outstanding", authentication(), requirePermission("reports.view"), getOutstandingBalances);
router.get("/suppliers/analytics", authentication(), requirePermission("reports.view"), getSupplierAnalytics);
router.get("/suppliers/:id", authentication(), requirePermission("inventory.manageSuppliers"), getSupplier);
router.get("/suppliers/:id/performance", authentication(), requirePermission("reports.view"), getSupplierPerformance);
router.post("/suppliers", authentication(), requirePermission("inventory.manageSuppliers"), createSupplier);
router.put("/suppliers/:id", authentication(), requirePermission("inventory.manageSuppliers"), updateSupplier);
router.delete("/suppliers/:id", authentication(), requirePermission("inventory.manageSuppliers"), deleteSupplier);

// --- Customer Routes ---
router.get("/customers", authentication(), requirePermission("customers.view"), listCustomers);
router.get("/customers/stats", authentication(), requirePermission("customers.viewHistory"), getCustomerStats);
router.get("/customers/analytics", authentication(), requirePermission("customers.viewHistory"), getCustomerAnalytics);
router.get("/customers/top", authentication(), requirePermission("customers.viewHistory"), getTopCustomers);
router.get("/customers/segmentation", authentication(), requirePermission("customers.viewHistory"), getCustomerSegmentation);
router.get("/customers/phone/:phone", authentication(), requirePermission("customers.view"), getCustomerByPhone);
router.get("/customers/:id", authentication(), requirePermission("customers.view"), getCustomer);
router.post("/customers", authentication(), requirePermission("customers.create"), createCustomer);
router.put("/customers/:id", authentication(), requirePermission("customers.edit"), updateCustomer);
router.delete("/customers/:id", authentication(), requirePermission("customers.delete"), deleteCustomer);
router.post("/customers/:id/notes", authentication(), requirePermission("customers.edit"), addStaffNote);
router.post("/customers/:id/visit", authentication(), requirePermission("customers.edit"), recordVisit);
router.post("/customers/:id/favorites", authentication(), requirePermission("customers.edit"), addFavoriteProduct);
router.delete("/customers/:id/favorites", authentication(), requirePermission("customers.edit"), removeFavoriteProduct);
router.post("/customers/:id/loyalty", authentication(), requirePermission("customers.edit"), updateLoyaltyPoints);

// --- Purchase Order Routes ---
router.get("/purchase-orders", authentication(), requirePermission("purchaseOrders.view"), listPurchaseOrders);
router.get("/purchase-orders/:id", authentication(), requirePermission("purchaseOrders.view"), getPurchaseOrder);
router.post("/purchase-orders", authentication(), requirePermission("purchaseOrders.create"), createPurchaseOrder);
router.put("/purchase-orders/:id", authentication(), requirePermission("purchaseOrders.edit"), updatePurchaseOrder);
router.delete("/purchase-orders/:id", authentication(), requirePermission("purchaseOrders.delete"), deletePurchaseOrder);
router.post("/purchase-orders/:id/approve", authentication(), requirePermission("purchaseOrders.approve"), approvePurchaseOrder);
router.post("/purchase-orders/:id/receive", authentication(), requirePermission("inventory.receive"), receivePurchaseOrder);
router.post("/purchase-orders/:id/cancel", authentication(), requirePermission("purchaseOrders.edit"), cancelPurchaseOrder);
router.post("/purchase-orders/:id/payment", authentication(), requirePermission("purchaseOrders.edit"), updatePaymentStatus);

// --- Cleaning Routes ---
router.get("/cleaning/pending", authentication(), requirePermission("cleaning.view"), getTablesNeedingCleaning);
router.get("/cleaning/stats", authentication(), requirePermission("reports.view"), getCleaningStats);
router.get("/cleaning/history", authentication(), requirePermission("reports.view"), getCleaningHistory);
router.post("/cleaning/needs-cleaning", authentication(), requirePermission("cleaning.view"), markNeedsCleaning);
router.post("/cleaning/:id/start", authentication(), requirePermission("cleaning.startCleaning"), startCleaning);
router.post("/cleaning/:id/complete", authentication(), requirePermission("cleaning.completeCleaning"), completeCleaning);

// --- Host Routes ---
router.get("/host/dashboard", authentication(), requirePermission("host.view"), getHostDashboard);
router.post("/host/arrival", authentication(), requirePermission("host.manageArrivals"), customerArrival);
router.put("/host/seat/:visitId", authentication(), requirePermission("host.assignTables"), seatCustomer);
router.get("/host/queue", authentication(), requirePermission("host.manageQueue"), getQueueStatus);
router.put("/host/queue/:queueId/notify", authentication(), requirePermission("host.manageQueue"), notifyCustomerFromQueue);
router.put("/host/queue/:queueId/cancel", authentication(), requirePermission("host.manageQueue"), cancelWaiting);

// --- Bill & Payment Routes ---
router.get("/bills/visit/:visitId", authentication(), requirePermission("payments.view"), calculateBill);
router.post("/bills/visit/:visitId/payment-session", authentication(), requirePermission("payments.process"), createPaymentSession);
router.put("/bills/payment-session/:sessionId/process", authentication(), requirePermission("payments.process"), processPaymentSession);
router.post("/bills/visit/:visitId/split", authentication(), requirePermission("payments.splitBill"), splitBillByAmount);
router.post("/bills/visit/:visitId/coupon", authentication(), requirePermission("payments.applyDiscount"), applyCoupon);

// --- Escalation Routes ---
router.post("/escalation/check-overdue", authentication(), requirePermission("employees.edit"), escalateOverdueTasks);

// --- KDS Routes ---
router.get("/kds/orders", authentication(), requirePermission("kitchen.view"), getKDSOrders);
router.get("/kds/stats", authentication(), requirePermission("kitchen.view"), getKDSOrderStats);
router.get("/kds/delayed", authentication(), requirePermission("kitchen.view"), getDelayedOrders);
router.put("/kds/orders/:id/accept", authentication(), requirePermission("kitchen.manageOrders"), acceptKDSOrder);
router.put("/kds/orders/:id/complete", authentication(), requirePermission("kitchen.manageOrders"), completeKDSOrder);

// --- Waiter Management Routes ---
router.get("/waiter-management", authentication(), requirePermission("employees.view"), listWaiters);
router.get("/waiter-management/workload", authentication(), requirePermission("employees.view"), getWorkloadBalancing);
router.get("/waiter-management/:id", authentication(), requirePermission("employees.view"), getWaiterDetails);
router.get("/waiter-management/:id/tables", authentication(), requirePermission("employees.view"), getAssignedTables);
router.get("/waiter-management/:id/tasks", authentication(), requirePermission("employees.view"), getActiveTasks);
router.get("/waiter-management/:id/requests", authentication(), requirePermission("employees.view"), getPendingRequests);
router.get("/waiter-management/:id/deliveries", authentication(), requirePermission("employees.view"), getDeliveryQueue);
router.get("/waiter-management/:id/stats", authentication(), requirePermission("employees.viewPerformance"), getWaiterStats);
router.post("/waiter-management/reassign", authentication(), requirePermission("employees.edit"), reassignWaiterRequest);
router.post("/waiter-management/auto-assign", authentication(), requirePermission("employees.edit"), autoAssignWaiter);

// --- Timeline Routes ---
router.get("/timeline/:orderId", authentication(), requirePermission("orders.view"), getOrderTimeline);
router.get("/timeline/events/list", authentication(), getTimelineEvents);

// --- Search Route ---
router.get("/search", authentication(), requirePermission("globalSearch.view"), globalSearch);

// --- System Health Routes ---
router.get("/system/health", authentication(), requirePermission("systemHealth.view"), getSystemHealth);
router.get("/system/errors", authentication(), requirePermission("systemHealth.view"), getErrorLogs);
router.get("/system/backup-status", authentication(), requirePermission("systemHealth.view"), getBackupStatus);
router.get("/system/info", authentication(), requirePermission("systemHealth.view"), getSystemInfo);

// --- Visit Routes ---
router.post("/visits/walk-in", authentication(), requirePermission("host.manageArrivals"), createWalkIn);
router.post("/visits/reservation/:reservationId", authentication(), requirePermission("reservations.confirm"), createReservationVisitEndpoint);
router.get("/visits/active", authentication(), requirePermission("tables.view"), getActiveVisitsEndpoint);
router.get("/visits/active/table/:tableNumber", authentication(), requirePermission("tables.view"), getActiveVisitByTableEndpoint);
router.get("/visits/history", authentication(), requirePermission("reports.view"), getVisitHistoryEndpoint);
router.get("/visits/analytics", authentication(), requirePermission("analytics.view"), getVisitAnalyticsEndpoint);
router.put("/visits/:id/seat", authentication(), requirePermission("host.assignTables"), seatVisitEndpoint);
router.put("/visits/:id/request-bill", authentication(), requestBillEndpoint);
router.put("/visits/:id/payment", authentication(), requirePermission("payments.process"), completePaymentEndpoint);
router.put("/visits/:id/close", authentication(), requirePermission("payments.process"), closeVisitEndpoint);
router.put("/visits/:id/abandon", authentication(), requirePermission("payments.process"), abandonVisitEndpoint);
router.put("/visits/:id/transfer", authentication(), requirePermission("tables.edit"), transferVisitTableEndpoint);

// --- Guest Queue Routes ---
router.get("/queue/status", authentication(), requirePermission("host.manageQueue"), getQueueStatusEndpoint);
router.post("/queue", authentication({ required: false }), addToQueue);
router.put("/queue/:id/call", authentication(), requirePermission("host.manageQueue"), callFromQueue);
router.put("/queue/:id/seat", authentication(), requirePermission("host.assignTables"), seatFromQueue);
router.put("/queue/:id/cancel", authentication(), requirePermission("host.manageQueue"), cancelFromQueue);

// --- Reports Routes ---
router.get("/reports/sales", authentication(), requirePermission("reports.sales"), getSalesReport);
router.get("/reports/orders", authentication(), requirePermission("reports.sales"), getOrdersReport);
router.get("/reports/products", authentication(), requirePermission("reports.sales"), getProductsReport);
router.get("/reports/inventory", authentication(), requirePermission("reports.inventory"), getInventoryReport);
router.get("/reports/customers", authentication(), requirePermission("reports.customerInsights"), getCustomerReport);
router.get("/reports/waiters", authentication(), requirePermission("reports.view"), getWaiterReport);
router.get("/reports/tables", authentication(), requirePermission("reports.view"), getTableReport);
router.get("/reports/payments", authentication(), requirePermission("reports.view"), getPaymentReport);

// --- RBAC Routes ---
router.use("/rbac", rbacRouter);

export default router;
