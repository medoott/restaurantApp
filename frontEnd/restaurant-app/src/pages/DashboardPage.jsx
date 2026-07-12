import { useState, useEffect, useCallback, useMemo, lazy, Suspense } from "react";
import {
  LayoutGrid, ClipboardList, Coffee, Package, Tags, BarChart3, Settings,
  SquareStack, CalendarDays, Users, ShoppingBag, FileText, ChefHat,
  UserCog, SprayCan, Activity, HeartPulse, Search, Bell, ScrollText, Warehouse,
} from "lucide-react";
import StatCard from "../components/ui/StatCard.jsx";
import OrdersTable from "../components/dashboard/OrdersTable.jsx";
import ProductsTable from "../components/products/ProductsTable.jsx";
import CategoriesGrid from "../components/products/CategoriesGrid.jsx";
import SettingsView from "../components/dashboard/SettingsView.jsx";
import InventoryView from "../components/dashboard/InventoryView.jsx";
import ErrorBoundary from "../components/ui/ErrorBoundary.jsx";
import { unwrapList, normalizeOrder } from "../utils/normalize.js";
import LoadingSpinner from "../components/ui/LoadingSpinner.jsx";

const CookPage = lazy(() => import("./CookPage.jsx"));
const FloorLayoutPage = lazy(() => import("./FloorLayoutPage.jsx"));
const ReservationPage = lazy(() => import("./ReservationPage.jsx"));
const CustomerCRMpage = lazy(() => import("./CustomerCRMpage.jsx"));
const SupplierManagementPage = lazy(() => import("./SupplierManagementPage.jsx"));
const PurchaseOrdersPage = lazy(() => import("./PurchaseOrdersPage.jsx"));
const KDSPage = lazy(() => import("./KDSPage.jsx"));
const WaiterManagementPage = lazy(() => import("./WaiterManagementPage.jsx"));
const CleaningWorkflowPage = lazy(() => import("./CleaningWorkflowPage.jsx"));
const ActivityTimelinePage = lazy(() => import("./ActivityTimelinePage.jsx"));
const SystemHealthPage = lazy(() => import("./SystemHealthPage.jsx"));
const AdvancedReportsPage = lazy(() => import("./AdvancedReportsPage.jsx"));
const GlobalSearchPage = lazy(() => import("./GlobalSearchPage.jsx"));
const NotificationCenterPage = lazy(() => import("./NotificationCenterPage.jsx"));
const AuditLogPage = lazy(() => import("./AuditLogPage.jsx"));

const ICON_MAP = {
  LayoutGrid, ClipboardList, Coffee, Package, Tags, SquareStack, Users,
  CalendarDays, ShoppingBag, FileText, ChefHat, UserCog, SprayCan, Activity,
  BarChart3, Warehouse, Settings, HeartPulse, Search, Bell, ScrollText,
};

const SIDEBAR_CONFIG = [
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
  { label: "Waiter Management", icon: "UserCog", permission: "waiter.view" },
  { label: "Cleaning", icon: "SprayCan", permission: "cleaning.view" },
  { label: "Activities", icon: "Activity", permission: "activities.view" },
  { label: "Reports", icon: "BarChart3", permission: "reports.view" },
  { label: "Inventory", icon: "Warehouse", permission: "inventory.view" },
  { label: "Settings", icon: "Settings", permission: "settings.view" },
  { label: "System Health", icon: "HeartPulse", permission: "systemHealth.view" },
  { label: "Global Search", icon: "Search", permission: "globalSearch.view" },
  { label: "Notifications", icon: "Bell", permission: "notifications.view" },
  { label: "Audit Log", icon: "ScrollText", permission: "auditLog.view" },
];

export default function DashboardPage({
  _orders,
  products,
  shortages,
  apiRequest,
  openAddProduct,
  updateOrderStatus,
  onReportShortage,
  initialActive = "Dashboard",
  permissions,
  liveOrder,
}) {
  const perm = permissions || { can: () => false, canAny: () => false, canAll: () => false, permissions: [] };
  const navItems = useMemo(() => {
    if (!perm || !perm.can) return ["Dashboard"];
    return SIDEBAR_CONFIG
      .filter((item) => perm.can(item.permission))
      .map((item) => item.label);
  }, [perm]);

  const [active, setActive] = useState(
    navItems.includes(initialActive) ? initialActive : navItems[0] || "Dashboard",
  );

  useEffect(() => {
    if (!navItems.includes(active)) {
      setActive(navItems[0] || "Dashboard");
    }
  }, [navItems, active]);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(8);
  const [serverOrders, setServerOrders] = useState([]);
  const [ordersMeta, setOrdersMeta] = useState({
    page: 1, limit: 8, total: 0, pages: 1,
  });
  const [orderStats, setOrderStats] = useState({
    totalOrders: 0, totalRevenue: 0, statusCounts: [],
  });
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [dashboardError, setDashboardError] = useState("");

  useEffect(() => {
    let alive = true;

    const loadOrders = async () => {
      setLoadingOrders(true);
      setDashboardError("");
      try {
        const [ordersResponse, statsResponse] = await Promise.all([
          apiRequest(
            `/orders?page=${page}&limit=${limit}&status=${encodeURIComponent(statusFilter)}&search=${encodeURIComponent(searchTerm.trim())}`,
          ),
          apiRequest("/orders/stats"),
        ]);

        if (!alive) return;

        const items = unwrapList(ordersResponse, "items").map(normalizeOrder);
        setServerOrders(items);
        setOrdersMeta({
          page: Number(ordersResponse?.meta?.page) || page,
          limit: Number(ordersResponse?.meta?.limit) || limit,
          total: Number(ordersResponse?.meta?.total) || 0,
          pages: Number(ordersResponse?.meta?.pages) || 1,
        });
        setOrderStats(statsResponse);
      } catch (error) {
        if (alive) setDashboardError(error.message || "Failed to load dashboard");
      } finally {
        if (alive) setLoadingOrders(false);
      }
    };

    loadOrders();
    const interval = window.setInterval(loadOrders, 30000);

    return () => {
      alive = false;
      window.clearInterval(interval);
    };
  }, [apiRequest, page, limit, searchTerm, statusFilter]);

  useEffect(() => {
    if (liveOrder?.id) {
      setServerOrders((prev) => {
        const idx = prev.findIndex((o) => String(o.id) === String(liveOrder.id));
        if (idx !== -1) {
          const updated = [...prev];
          updated[idx] = { ...updated[idx], ...liveOrder };
          return updated;
        }
        return [liveOrder, ...prev];
      });
    }
  }, [liveOrder]);

  const totalOrders = orderStats.totalOrders ?? serverOrders.length;
  const revenue = orderStats.totalRevenue ?? 0;
  const pending =
    orderStats.statusCounts?.find((s) => s.status === "Pending")?.count || 0;
  const preparing =
    orderStats.statusCounts?.find((s) => s.status === "Preparing")?.count || 0;
  const completed =
    orderStats.statusCounts?.find((s) => s.status === "Delivered")?.count || 0;

  const goToPage = useCallback(
    (nextPage) => {
      const safePage = Math.min(Math.max(nextPage, 1), ordersMeta.pages || 1);
      setPage(safePage);
    },
    [ordersMeta.pages],
  );

  return (
    <div className="min-h-screen bg-[#FBF6EF] flex pt-14">
      <aside className="hidden lg:flex flex-col w-60 bg-[#2A1B12] text-[#F3E5D3] shrink-0">
        <div className="px-6 py-6 flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#7B4B2A] to-[#C9925F] flex items-center justify-center">
            <Coffee size={17} className="text-[#2A1B12]" />
          </div>
          <span className="font-serif text-lg">Brúne Admin</span>
        </div>
        <nav className="flex-1 px-3 mt-4 space-y-1" aria-label="Dashboard navigation">
          {navItems.map((label) => {
            const config = SIDEBAR_CONFIG.find((c) => c.label === label);
            const Icon = config ? ICON_MAP[config.icon] : LayoutGrid;
            return (
              <button
                key={label}
                onClick={() => setActive(label)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm transition-colors ${
                  active === label
                    ? "bg-[#3B2515] text-[#F3E5D3]"
                    : "text-[#C9B496] hover:bg-[#3B2515]/50"
                }`}
              >
                <Icon size={16} />
                {label}
              </button>
            );
          })}
        </nav>
        <div className="px-6 py-5 text-xs text-[#8A6E51]">v1.0 &middot; Live data</div>
      </aside>

      <main className="flex-1 min-w-0 pt-14">
        <div className="sticky top-0 z-20 bg-[#FBF6EF]/90 backdrop-blur-md border-b border-[#EDE1CF] px-6 sm:px-8 py-4 flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="font-serif text-2xl text-[#3B2515]">{active}</h1>
              <p className="text-xs text-[#A9805F] mt-0.5">
                Restaurant overview &amp; order management
              </p>
            </div>
            <div className="hidden sm:flex items-center gap-2">
              <div className="flex items-center gap-2 bg-white rounded-full px-3.5 py-2 ring-1 ring-[#EDE1CF] text-sm text-[#9C8268]">
                <Search size={14} />
                <input
                  value={searchTerm}
                  onChange={(e) => {
                    setPage(1);
                    setSearchTerm(e.target.value);
                  }}
                  placeholder="Search orders..."
                  className="w-36 bg-transparent text-xs outline-none placeholder:text-[#A9805F]"
                  aria-label="Search orders"
                />
              </div>
              <select
                value={limit}
                onChange={(e) => {
                  setPage(1);
                  setLimit(Number(e.target.value));
                }}
                className="rounded-full bg-white px-3 py-2 text-xs ring-1 ring-[#EDE1CF]"
                aria-label="Items per page"
              >
                {[5, 8, 12, 20].map((n) => (
                  <option key={n} value={n}>{n} / page</option>
                ))}
              </select>
            </div>
          </div>

          <div className="lg:hidden overflow-x-auto pb-2">
            <div className="flex gap-2 min-w-max">
              {navItems.map((item) => (
                <button
                  key={item}
                  onClick={() => setActive(item)}
                  className={`whitespace-nowrap rounded-full px-4 py-2 text-xs font-semibold transition-colors ${
                    active === item
                      ? "bg-[#3B2515] text-[#F3E5D3]"
                      : "bg-[#FBF6EF] text-[#7B4B2A] ring-1 ring-[#EDE1CF] hover:bg-[#EDE1CF]"
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="px-6 sm:px-8 py-6 space-y-6">
          {dashboardError && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700" role="alert">
              {dashboardError}
            </div>
          )}

          <ErrorBoundary>
            {active === "Dashboard" && (
              loadingOrders ? (
                <div className="flex items-center justify-center py-12 text-[#9C8268]">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full border-2 border-[#EDE1CF] border-t-[#B07B4F] animate-spin" />
                    <span className="text-sm">Loading dashboard...</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <StatCard label="Total Orders" value={totalOrders} accent="bg-[#B07B4F]" />
                  <StatCard label="Revenue" value={`$${Number(revenue).toFixed(2)}`} accent="bg-emerald-400" />
                  <StatCard label="Pending + Preparing" value={pending + preparing} accent="bg-amber-400" />
                  <StatCard label="Delivered" value={completed} accent="bg-stone-400" />
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <StatCard label="Visible Items" value={serverOrders.length} accent="bg-sky-400" />
                  <StatCard label="Pages" value={ordersMeta.pages || 1} accent="bg-indigo-400" />
                  <StatCard label="Current Page" value={ordersMeta.page || 1} accent="bg-rose-400" />
                  <StatCard label="Page Size" value={ordersMeta.limit || limit} accent="bg-lime-400" />
                </div>
                <OrdersTable orders={serverOrders.slice(0, 4)} title="Recent Orders" />
                </div>
              )
            )}
          </ErrorBoundary>

          <ErrorBoundary>
            {active === "Orders" && perm.can("orders.view") && (
              <OrdersTable
                orders={serverOrders}
                title="All Orders"
                showFilters
                statusFilter={statusFilter}
                onStatusChange={(value) => {
                  setPage(1);
                  setStatusFilter(value);
                }}
                searchTerm={searchTerm}
                onSearchChange={(value) => {
                  setPage(1);
                  setSearchTerm(value);
                }}
                onUpdateOrderStatus={
                  perm.can("orders.changeStatus") ? updateOrderStatus : undefined
                }
                canUpdateOrderStatus={perm.can("orders.changeStatus")}
                loading={loadingOrders}
                page={ordersMeta.page}
                pages={ordersMeta.pages}
                onPrevPage={() => goToPage(page - 1)}
                onNextPage={() => goToPage(page + 1)}
              />
            )}
          </ErrorBoundary>

          <ErrorBoundary>
            {active === "Products" && perm.can("products.view") && (
              <ProductsTable
                products={products}
                onAddClick={perm.can("products.create") ? openAddProduct : undefined}
                showEdit={perm.can("products.edit")}
              />
            )}
          </ErrorBoundary>

          <ErrorBoundary>
            {active === "Categories" && perm.can("categories.view") && (
              <CategoriesGrid products={products} />
            )}
          </ErrorBoundary>

          <ErrorBoundary>
            <Suspense fallback={<LoadingSpinner size="md" />}>
            {active === "Reports" && perm.can("reports.view") && (
              <AdvancedReportsPage permissions={perm} />
            )}

            {active === "Cook" && perm.can("kitchen.view") && (
              <CookPage
                orders={serverOrders}
                shortages={shortages}
                updateOrderStatus={updateOrderStatus}
                onReportShortage={onReportShortage}
                canUpdateOrderStatus={perm.can("orders.changeStatus")}
                canReportShortage={perm.canAny(["inventory.edit", "inventory.receive"])}
              />
            )}

            {active === "Tables" && perm.can("tables.view") && <FloorLayoutPage />}

            {active === "Reservations" && perm.can("reservations.view") && <ReservationPage />}

            {active === "Customers" && perm.can("customers.view") && <CustomerCRMpage permissions={permissions} />}

            {active === "Suppliers" && perm.can("suppliers.view") && <SupplierManagementPage permissions={permissions} />}

            {active === "Purchase Orders" && perm.can("purchaseOrders.view") && <PurchaseOrdersPage permissions={permissions} />}

            {active === "KDS" && perm.can("kitchen.view") && <KDSPage permissions={permissions} />}

            {active === "Waiter Management" && perm.can("waiter.view") && <WaiterManagementPage permissions={permissions} />}

            {active === "Cleaning" && perm.can("cleaning.view") && <CleaningWorkflowPage permissions={permissions} />}

            {active === "Activities" && perm.can("activities.view") && <ActivityTimelinePage permissions={permissions} />}

            {active === "Global Search" && perm.can("globalSearch.view") && <GlobalSearchPage permissions={permissions} />}

            {active === "Notifications" && perm.can("notifications.view") && <NotificationCenterPage permissions={permissions} />}

            {active === "Audit Log" && perm.can("auditLog.view") && <AuditLogPage permissions={permissions} />}

            {active === "System Health" && perm.can("systemHealth.view") && <SystemHealthPage permissions={permissions} />}

            {active === "Inventory" && perm.can("inventory.view") && (
              <InventoryView apiRequest={apiRequest} />
            )}

            {active === "Settings" && perm.can("settings.view") && <SettingsView />}
            </Suspense>
          </ErrorBoundary>
        </div>
      </main>
    </div>
  );
}
