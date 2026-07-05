import { api } from "./api.js";
import {
  normalizeProduct,
  normalizeOrder,
  normalizeShortage,
  normalizeInventoryItem,
  unwrapList,
} from "../utils/normalize.js";

export async function fetchAllProducts() {
  const data = await api.get("/products");
  return unwrapList(data, "products").map(normalizeProduct);
}

export async function createProduct(product) {
  const data = await api.post("/products", product);
  return normalizeProduct(data.product || data);
}

export async function fetchAllOrders() {
  const data = await api.get("/orders");
  return unwrapList(data, "orders").map(normalizeOrder);
}

export async function createOrder(payload) {
  const data = await api.post("/orders", payload);
  return normalizeOrder(data.order || data);
}

export async function addItemsToOrder(orderId, payload) {
  const data = await api.post(`/orders/${orderId}/items`, payload);
  return normalizeOrder(data.order || data);
}

export async function updateOrderStatus(id, status) {
  const data = await api.put(`/orders/${id}`, { status });
  return normalizeOrder(data.order || data);
}

export async function fetchAllShortages() {
  const data = await api.get("/shortages");
  return unwrapList(data, "shortages").map(normalizeShortage);
}

export async function reportShortage(payload) {
  const data = await api.post("/shortages", payload);
  return normalizeShortage(data.shortage || data);
}

export async function fetchAllTables() {
  const data = await api.get("/tables");
  return unwrapList(data?.data || data, "items").map(t => ({ ...t, id: t._id || t.id }));
}

export async function fetchTableByNumber(number) {
  const data = await api.get(`/tables/number/${number}`);
  return data?.data || data?.table || null;
}

export async function createTable(payload) {
  const data = await api.post("/tables", payload);
  return data?.data || data;
}

export async function updateTableById(id, payload) {
  const data = await api.put(`/tables/${id}`, payload);
  return data?.data || data;
}

export async function deleteTableById(id) {
  await api.delete(`/tables/${id}`);
}

export async function fetchTableQRCode(id) {
  const data = await api.get(`/tables/${id}/qrcode`);
  return data?.data || null;
}

export async function fetchInventoryItems(params = {}) {
  const qs = new URLSearchParams(params).toString();
  const data = await api.get(`/inventory${qs ? `?${qs}` : ""}`);
  const items = Array.isArray(data?.data?.items) ? data.data.items : Array.isArray(data) ? data : [];
  return items.map(normalizeInventoryItem);
}

export async function fetchInventoryItem(id) {
  const data = await api.get(`/inventory/${id}`);
  return normalizeInventoryItem(data?.data || data);
}

export async function createInventoryItem(payload) {
  const data = await api.post("/inventory", payload);
  return normalizeInventoryItem(data?.data || data);
}

export async function updateInventoryItem(id, payload) {
  const data = await api.put(`/inventory/${id}`, payload);
  return normalizeInventoryItem(data?.data || data);
}

export async function deleteInventoryItem(id) {
  await api.delete(`/inventory/${id}`);
}

export async function addStockToItem(id, payload) {
  const data = await api.post(`/inventory/${id}/stock/add`, payload);
  return normalizeInventoryItem(data?.data || data);
}

export async function reduceStockFromItem(id, payload) {
  const data = await api.post(`/inventory/${id}/stock/reduce`, payload);
  return normalizeInventoryItem(data?.data || data);
}

export async function adjustStockOfItem(id, payload) {
  const data = await api.post(`/inventory/${id}/stock/adjust`, payload);
  return normalizeInventoryItem(data?.data || data);
}

export async function transferStockBetweenItems(payload) {
  const data = await api.post("/inventory/stock/transfer", payload);
  return data?.data || data;
}

export async function fetchInventorySummary() {
  const data = await api.get("/inventory/summary");
  return data?.data || data;
}

export async function fetchInventoryAlerts() {
  const data = await api.get("/inventory/alerts");
  return data?.data || data;
}

export async function fetchInventoryAnalytics(period = "monthly") {
  const data = await api.get(`/inventory/analytics?period=${period}`);
  return data?.data || data;
}

export async function fetchInventoryConsumptionTrends(days = 30) {
  const data = await api.get(`/inventory/analytics/consumption?days=${days}`);
  return data?.data || data;
}

export async function fetchInventoryStockLevels() {
  const data = await api.get("/inventory/analytics/stock-levels");
  return data?.data || data;
}

export async function fetchShortageReports(period = "monthly") {
  const data = await api.get(`/shortages/reports?period=${period}`);
  return data?.data || data;
}

export async function fetchShortageConsumption(days = 30) {
  const data = await api.get(`/shortages/consumption?days=${days}`);
  return data?.data || data;
}

export async function fetchShortageStats() {
  const data = await api.get("/shortages/stats");
  return data?.data || data;
}

// === Reservation API ===
export async function fetchReservations(params = {}) {
  const qs = new URLSearchParams(params).toString();
  const data = await api.get(`/reservations${qs ? `?${qs}` : ""}`);
  const items = Array.isArray(data?.data?.items) ? data.data.items : Array.isArray(data?.items) ? data.items : Array.isArray(data?.data?.data) ? data.data.data : [];
  return items.map(r => ({ ...r, id: r._id || r.reservationId }));
}

export async function fetchReservation(id) {
  const data = await api.get(`/reservations/${id}`);
  return data?.data || data;
}

export async function createReservation(payload) {
  const data = await api.post("/reservations", payload);
  return data?.data || data;
}

export async function updateReservation(id, payload) {
  const data = await api.put(`/reservations/${id}`, payload);
  return data?.data || data;
}

export async function cancelReservation(id, reason = "") {
  const data = await api.put(`/reservations/${id}/cancel`, { reason });
  return data?.data || data;
}

export async function rescheduleReservation(id, newDate, newTime) {
  const data = await api.put(`/reservations/${id}/reschedule`, { reservationDate: newDate, reservationTime: newTime });
  return data?.data || data;
}

export async function assignTableToReservation(id, tableId) {
  const data = await api.put(`/reservations/${id}/assign-table`, { tableId });
  return data?.data || data;
}

export async function checkInReservation(id) {
  const data = await api.put(`/reservations/${id}/check-in`);
  return data?.data || data;
}

export async function seatReservation(id) {
  const data = await api.put(`/reservations/${id}/seat`);
  return data?.data || data;
}

export async function completeReservation(id) {
  const data = await api.put(`/reservations/${id}/complete`);
  return data?.data || data;
}

export async function fetchTodayReservations() {
  const data = await api.get("/reservations/today");
  const items = Array.isArray(data?.data?.items) ? data.data.items : Array.isArray(data?.data?.data) ? data.data.data : [];
  return items.map(r => ({ ...r, id: r._id || r.reservationId }));
}

export async function fetchAvailableTables(params = {}) {
  const qs = new URLSearchParams(params).toString();
  const data = await api.get(`/reservations/available-tables${qs ? `?${qs}` : ""}`);
  return data?.data || data;
}

export async function fetchReservationHistory(phone) {
  const data = await api.get(`/reservations/history?phone=${encodeURIComponent(phone)}`);
  const items = Array.isArray(data?.data?.items) ? data.data.items : Array.isArray(data?.data?.data) ? data.data.data : [];
  return items.map(r => ({ ...r, id: r._id || r.reservationId }));
}

// === Recipe API ===
export async function fetchRecipes(params = {}) {
  const qs = new URLSearchParams(params).toString();
  const data = await api.get(`/recipes${qs ? `?${qs}` : ""}`);
  const items = Array.isArray(data?.data?.items) ? data.data.items : Array.isArray(data?.items) ? data.items : Array.isArray(data?.data?.data) ? data.data.data : [];
  return items;
}

export async function fetchRecipe(id) {
  const data = await api.get(`/recipes/${id}`);
  return data?.data || data;
}

export async function createRecipe(payload) {
  const data = await api.post("/recipes", payload);
  return data?.data || data;
}

export async function updateRecipe(id, payload) {
  const data = await api.put(`/recipes/${id}`, payload);
  return data?.data || data;
}

export async function deleteRecipe(id) {
  await api.delete(`/recipes/${id}`);
}

export async function fetchRecipesByProduct(productId) {
  const data = await api.get(`/recipes/by-product/${productId}`);
  const items = Array.isArray(data?.data?.items) ? data.data.items : Array.isArray(data?.items) ? data.items : Array.isArray(data?.data?.data) ? data.data.data : [];
  return items;
}

export async function fetchRecipeCostAnalysis() {
  const data = await api.get("/recipes/cost-analysis");
  return data?.data || data;
}

// === New Inventory API ===
export async function recordWaste(id, payload) {
  const data = await api.post(`/inventory/${id}/waste`, payload);
  return data?.data || data;
}

export async function performStockCount(id, payload) {
  const data = await api.post(`/inventory/${id}/stock-count`, payload);
  return data?.data || data;
}

export async function fetchInventoryValue() {
  const data = await api.get("/inventory/analytics/value");
  return data?.data || data;
}

export async function fetchMostConsumedIngredients(days = 30) {
  const data = await api.get(`/inventory/analytics/most-consumed?days=${days}`);
  return data?.data || data;
}

export async function fetchInventoryUsageTrends(days = 30) {
  const data = await api.get(`/inventory/analytics/usage-trends?days=${days}`);
  return data?.data || data;
}

export async function fetchExpiredItems() {
  const data = await api.get("/inventory/analytics/expired");
  return data?.data || data;
}

export async function fetchNearExpirationItems() {
  const data = await api.get("/inventory/analytics/near-expiration");
  return data?.data || data;
}

export async function exportInventoryReport(format = "csv") {
  const data = await api.get(`/inventory/export/${format}`);
  return data?.data || data;
}

// === New Table API ===
export async function fetchFloorLayout() {
  const data = await api.get("/tables/floor/layout");
  return data?.data || data;
}

export async function fetchTablesBySection(section) {
  const data = await api.get(`/tables/section/${encodeURIComponent(section)}`);
  return data?.data || data;
}

export async function fetchTableWithDetails(id) {
  const data = await api.get(`/tables/${id}/details`);
  return data?.data || data;
}

export async function updateTableLayout(id, payload) {
  const data = await api.put(`/tables/${id}/layout`, payload);
  return data?.data || data;
}

export async function mergeTables(payload) {
  const data = await api.post("/tables/merge", payload);
  return data?.data || data;
}

export async function splitTables(id) {
  const data = await api.post(`/tables/${id}/split`);
  return data?.data || data;
}

export async function moveOrderToTable(payload) {
  const data = await api.post("/tables/move-order", payload);
  return data?.data || data;
}

export async function changeTableNumber(id, newNumber) {
  const data = await api.put(`/tables/${id}/number`, { tableNumber: newNumber });
  return data?.data || data;
}

export async function lockTable(id, reason = "") {
  const data = await api.put(`/tables/${id}/lock`, { reason });
  return data?.data || data;
}

export async function unlockTable(id) {
  const data = await api.put(`/tables/${id}/unlock`);
  return data?.data || data;
}

export async function reopenTable(tableNumber) {
  const data = await api.post("/tables/reopen", { tableNumber });
  return data?.data || data;
}

// === Supplier API ===
export async function fetchAllSuppliers(params = {}) {
  const qs = new URLSearchParams(params).toString();
  const data = await api.get(`/suppliers${qs ? `?${qs}` : ""}`);
  const items = Array.isArray(data?.data?.items) ? data.data.items : Array.isArray(data?.items) ? data.items : Array.isArray(data?.data) ? data.data : [];
  return items.map(s => ({ ...s, id: s._id || s.id }));
}

export async function fetchSupplier(id) {
  const data = await api.get(`/suppliers/${id}`);
  return data?.data || data;
}

export async function createSupplier(payload) {
  const data = await api.post("/suppliers", payload);
  return data?.data || data;
}

export async function updateSupplier(id, payload) {
  const data = await api.put(`/suppliers/${id}`, payload);
  return data?.data || data;
}

export async function deleteSupplier(id) {
  await api.delete(`/suppliers/${id}`);
}

export async function fetchSupplierPerformance(id) {
  const data = await api.get(`/suppliers/${id}/performance`);
  return data?.data || data;
}

export async function fetchSupplierAnalytics() {
  const data = await api.get("/suppliers/analytics");
  return data?.data || data;
}

export async function fetchOutstandingBalances() {
  const data = await api.get("/suppliers/outstanding");
  return data?.data || data;
}

// === Customer API ===
export async function fetchAllCustomers(params = {}) {
  const qs = new URLSearchParams(params).toString();
  const data = await api.get(`/customers${qs ? `?${qs}` : ""}`);
  const items = Array.isArray(data?.data?.items) ? data.data.items : Array.isArray(data?.items) ? data.items : Array.isArray(data?.data) ? data.data : [];
  return items.map(c => ({ ...c, id: c._id || c.id }));
}

export async function fetchCustomer(id) {
  const data = await api.get(`/customers/${id}`);
  return data?.data || data;
}

export async function fetchCustomerByPhone(phone) {
  const data = await api.get(`/customers/phone/${encodeURIComponent(phone)}`);
  return data?.data || data;
}

export async function createCustomer(payload) {
  const data = await api.post("/customers", payload);
  return data?.data || data;
}

export async function updateCustomer(id, payload) {
  const data = await api.put(`/customers/${id}`, payload);
  return data?.data || data;
}

export async function deleteCustomer(id) {
  await api.delete(`/customers/${id}`);
}

export async function addStaffNote(id, payload) {
  const data = await api.post(`/customers/${id}/notes`, payload);
  return data?.data || data;
}

export async function recordVisit(id, payload) {
  const data = await api.post(`/customers/${id}/visit`, payload);
  return data?.data || data;
}

export async function addFavoriteProduct(id, productId) {
  const data = await api.post(`/customers/${id}/favorites`, { productId });
  return data?.data || data;
}

export async function removeFavoriteProduct(id) {
  await api.delete(`/customers/${id}/favorites`);
}

export async function updateLoyaltyPoints(id, payload) {
  const data = await api.post(`/customers/${id}/loyalty`, payload);
  return data?.data || data;
}

export async function fetchCustomerAnalytics() {
  const data = await api.get("/customers/analytics");
  return data?.data || data;
}

export async function fetchTopCustomers(limit = 10) {
  const data = await api.get(`/customers/top?limit=${limit}`);
  return data?.data || data;
}

export async function fetchCustomerSegmentation() {
  const data = await api.get("/customers/segmentation");
  return data?.data || data;
}

export async function fetchCustomerStats() {
  const data = await api.get("/customers/stats");
  return data?.data || data;
}

// === Purchase Order API ===
export async function fetchAllPurchaseOrders(params = {}) {
  const qs = new URLSearchParams(params).toString();
  const data = await api.get(`/purchase-orders${qs ? `?${qs}` : ""}`);
  const items = Array.isArray(data?.data?.items) ? data.data.items : Array.isArray(data?.items) ? data.items : Array.isArray(data?.data) ? data.data : [];
  return items.map(po => ({ ...po, id: po._id || po.id }));
}

export async function fetchPurchaseOrder(id) {
  const data = await api.get(`/purchase-orders/${id}`);
  return data?.data || data;
}

export async function createPurchaseOrder(payload) {
  const data = await api.post("/purchase-orders", payload);
  return data?.data || data;
}

export async function updatePurchaseOrder(id, payload) {
  const data = await api.put(`/purchase-orders/${id}`, payload);
  return data?.data || data;
}

export async function deletePurchaseOrder(id) {
  await api.delete(`/purchase-orders/${id}`);
}

export async function approvePurchaseOrder(id) {
  const data = await api.post(`/purchase-orders/${id}/approve`);
  return data?.data || data;
}

export async function receivePurchaseOrder(id, payload) {
  const data = await api.post(`/purchase-orders/${id}/receive`, payload);
  return data?.data || data;
}

export async function cancelPurchaseOrder(id, reason = "") {
  const data = await api.post(`/purchase-orders/${id}/cancel`, { reason });
  return data?.data || data;
}

export async function updatePaymentStatus(id, paymentStatus) {
  const data = await api.post(`/purchase-orders/${id}/payment`, { paymentStatus });
  return data?.data || data;
}

// === Cleaning API ===
export async function markNeedsCleaning(tableId) {
  const data = await api.post("/cleaning/needs-cleaning", { tableId });
  return data?.data || data;
}

export async function startCleaning(id) {
  const data = await api.post(`/cleaning/${id}/start`);
  return data?.data || data;
}

export async function completeCleaning(id) {
  const data = await api.post(`/cleaning/${id}/complete`);
  return data?.data || data;
}

export async function fetchTablesNeedingCleaning() {
  const data = await api.get("/cleaning/pending");
  return data?.data || data;
}

export async function fetchCleaningStats() {
  const data = await api.get("/cleaning/stats");
  return data?.data || data;
}

export async function fetchCleaningHistory(params = {}) {
  const qs = new URLSearchParams(params).toString();
  const data = await api.get(`/cleaning/history${qs ? `?${qs}` : ""}`);
  return data?.data || data;
}

// === KDS API ===
export async function fetchKDSOrders(params = {}) {
  const qs = new URLSearchParams(params).toString();
  const data = await api.get(`/kds/orders${qs ? `?${qs}` : ""}`);
  const items = Array.isArray(data?.data?.items) ? data.data.items : Array.isArray(data?.items) ? data.items : Array.isArray(data?.data) ? data.data : [];
  return items;
}

export async function fetchKDSOrderStats() {
  const data = await api.get("/kds/stats");
  return data?.data || data;
}

export async function acceptKDSOrder(id) {
  const data = await api.put(`/kds/orders/${id}/accept`);
  return data?.data || data;
}

export async function completeKDSOrder(id) {
  const data = await api.put(`/kds/orders/${id}/complete`);
  return data?.data || data;
}

export async function fetchDelayedOrders() {
  const data = await api.get("/kds/delayed");
  return data?.data || data;
}

// === Waiter Management API ===
export async function fetchAllWaiters(params = {}) {
  const qs = new URLSearchParams(params).toString();
  const data = await api.get(`/waiter-management${qs ? `?${qs}` : ""}`);
  const items = Array.isArray(data?.data?.items) ? data.data.items : Array.isArray(data?.items) ? data.items : Array.isArray(data?.data) ? data.data : [];
  return items.map(w => ({ ...w, id: w._id || w.id }));
}

export async function fetchWaiterDetails(id) {
  const data = await api.get(`/waiter-management/${id}`);
  return data?.data || data;
}

export async function fetchAssignedTables(id) {
  const data = await api.get(`/waiter-management/${id}/tables`);
  return data?.data || data;
}

export async function fetchActiveTasks(id) {
  const data = await api.get(`/waiter-management/${id}/tasks`);
  return data?.data || data;
}

export async function fetchPendingRequests(id) {
  const data = await api.get(`/waiter-management/${id}/requests`);
  return data?.data || data;
}

export async function fetchDeliveryQueue(id) {
  const data = await api.get(`/waiter-management/${id}/deliveries`);
  return data?.data || data;
}

export async function fetchWaiterStats(id) {
  const data = await api.get(`/waiter-management/${id}/stats`);
  return data?.data || data;
}

export async function reassignWaiterRequest(payload) {
  const data = await api.post("/waiter-management/reassign", payload);
  return data?.data || data;
}

export async function fetchWorkloadBalancing() {
  const data = await api.get("/waiter-management/workload");
  return data?.data || data;
}

export async function autoAssignWaiter(orderId) {
  const data = await api.post("/waiter-management/auto-assign", { orderId });
  return data?.data || data;
}

// === Timeline API ===
export async function fetchOrderTimeline(orderId) {
  const data = await api.get(`/timeline/${orderId}`);
  return data?.data || data;
}

export async function fetchTimelineEvents(params = {}) {
  const qs = new URLSearchParams(params).toString();
  const data = await api.get(`/timeline/events/list${qs ? `?${qs}` : ""}`);
  return data?.data || data;
}

// === Search API ===
export async function globalSearch(query = "", limit = 10) {
  const data = await api.get(`/search?q=${encodeURIComponent(query)}&limit=${limit}`);
  return data?.data || data;
}

// === System Health API ===
export async function fetchSystemHealth() {
  const data = await api.get("/system/health");
  return data?.data || data;
}

export async function fetchErrorLogs(params = {}) {
  const qs = new URLSearchParams(params).toString();
  const data = await api.get(`/system/errors${qs ? `?${qs}` : ""}`);
  return data?.data || data;
}

export async function fetchBackupStatus() {
  const data = await api.get("/system/backup-status");
  return data?.data || data;
}

export async function fetchSystemInfo() {
  const data = await api.get("/system/info");
  return data?.data || data;
}

// === Reports API ===
export async function fetchSalesReport(params = {}) {
  const qs = new URLSearchParams(params).toString();
  const data = await api.get(`/reports/sales${qs ? `?${qs}` : ""}`);
  return data?.data || data;
}

export async function fetchOrdersReport(params = {}) {
  const qs = new URLSearchParams(params).toString();
  const data = await api.get(`/reports/orders${qs ? `?${qs}` : ""}`);
  return data?.data || data;
}

export async function fetchProductsReport(params = {}) {
  const qs = new URLSearchParams(params).toString();
  const data = await api.get(`/reports/products${qs ? `?${qs}` : ""}`);
  return data?.data || data;
}

export async function fetchInventoryReport(params = {}) {
  const qs = new URLSearchParams(params).toString();
  const data = await api.get(`/reports/inventory${qs ? `?${qs}` : ""}`);
  return data?.data || data;
}

export async function fetchCustomerReport(params = {}) {
  const qs = new URLSearchParams(params).toString();
  const data = await api.get(`/reports/customers${qs ? `?${qs}` : ""}`);
  return data?.data || data;
}

export async function fetchWaiterReport(params = {}) {
  const qs = new URLSearchParams(params).toString();
  const data = await api.get(`/reports/waiters${qs ? `?${qs}` : ""}`);
  return data?.data || data;
}

export async function fetchTableReport(params = {}) {
  const qs = new URLSearchParams(params).toString();
  const data = await api.get(`/reports/tables${qs ? `?${qs}` : ""}`);
  return data?.data || data;
}

export async function fetchPaymentReport(params = {}) {
  const qs = new URLSearchParams(params).toString();
  const data = await api.get(`/reports/payments${qs ? `?${qs}` : ""}`);
  return data?.data || data;
}
