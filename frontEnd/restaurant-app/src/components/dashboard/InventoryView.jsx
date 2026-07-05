import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Package, Search, Plus, AlertTriangle, TrendingDown, RefreshCw,
  ArrowRightLeft, X, Eye, Edit2, Trash2, ChevronLeft, ChevronRight,
  AlertCircle, BarChart3, FileText, Download,
} from "lucide-react";
import {
  fetchInventoryItems,
  fetchInventorySummary,
  fetchInventoryAlerts,
  fetchInventoryAnalytics,
  createInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
  addStockToItem,
  reduceStockFromItem,
  adjustStockOfItem,
  transferStockBetweenItems,
} from "../../services/data.js";
import {
  LineChart, BarChart, PieChart,
  ResponsiveContainer, Tooltip, Legend,
  XAxis, YAxis, CartesianGrid, Line, Bar, Pie, Cell,
} from "recharts";

const STATUS_STYLES = {
  in_stock: "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-300",
  low_stock: "bg-amber-100 text-amber-700 ring-1 ring-amber-300",
  critical: "bg-rose-100 text-rose-700 ring-1 ring-rose-300",
  out_of_stock: "bg-red-100 text-red-700 ring-1 ring-red-300",
  expired: "bg-stone-100 text-stone-600 ring-1 ring-stone-300",
  near_expiration: "bg-orange-100 text-orange-700 ring-1 ring-orange-300",
};

const STATUS_LABELS = {
  in_stock: "In Stock",
  low_stock: "Low Stock",
  critical: "Critical",
  out_of_stock: "Out of Stock",
  expired: "Expired",
  near_expiration: "Near Expiration",
};

const ALL_CATEGORIES = [
  "Coffee", "Tea", "Syrups", "Milk", "Pastry", "Packaging",
  "Cleaning", "Office", "Equipment", "Uncategorized",
];

const UNITS = ["kg", "g", "L", "ml", "pcs", "units", "boxes", "bags", "bottles", "cans"];

const CHART_COLORS = ["#B07B4F", "#3B2515", "#C9925F", "#A9805F", "#7B4B2A", "#5C4033", "#EDE1CF", "#9C8268", "#D4A574", "#8A6E51"];

function computeStatus(item) {
  if (!item) return "in_stock";
  const now = new Date();
  if (item.expirationDate && new Date(item.expirationDate) <= now) return "expired";
  if (item.expirationDate && new Date(item.expirationDate) <= new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)) return "near_expiration";
  if (item.currentStock <= 0) return "out_of_stock";
  if (item.currentStock <= item.minStockLevel * 0.25) return "critical";
  if (item.currentStock <= item.minStockLevel) return "low_stock";
  return "in_stock";
}

function exportToCSV(filename, headers, rows) {
  const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function InventoryView({ apiRequest }) {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [selectedItem, setSelectedItem] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddStock, setShowAddStock] = useState(false);
  const [showReduceStock, setShowReduceStock] = useState(false);
  const [showAdjustStock, setShowAdjustStock] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const [reportsData, setReportsData] = useState(null);
  const [reportsPeriod, setReportsPeriod] = useState("monthly");
  const [reportsLoading, setReportsLoading] = useState(false);

  const [analyticsData, setAnalyticsData] = useState(null);
  const [analyticsPeriod, setAnalyticsPeriod] = useState("monthly");
  const [consumptionData, setConsumptionData] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  const [exporting, setExporting] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = { page: String(page), limit: "50" };
      if (search.trim()) params.search = search.trim();
      if (categoryFilter) params.category = categoryFilter;
      if (statusFilter) params.status = statusFilter;
      const [itemsRes, summaryRes, alertsRes] = await Promise.all([
        fetchInventoryItems(params),
        fetchInventorySummary(),
        fetchInventoryAlerts(),
      ]);
      setItems(itemsRes?.items || []);
      setPages(itemsRes?.meta?.pages || 1);
      setTotal(itemsRes?.meta?.total || 0);
      setSummary(summaryRes || null);
      setAlerts(Array.isArray(alertsRes) ? alertsRes : []);
    } catch (err) {
      setError(err.message || "Failed to load inventory data");
    } finally {
      setLoading(false);
    }
  }, [page, search, categoryFilter, statusFilter]);

  useEffect(() => { loadData(); }, [loadData]);

  const loadReports = useCallback(async () => {
    setReportsLoading(true);
    try {
      const res = await fetchInventoryAnalytics(reportsPeriod);
      setReportsData(res || null);
    } catch {} finally {
      setReportsLoading(false);
    }
  }, [reportsPeriod]);

  useEffect(() => {
    if (activeTab === "reports" || activeTab === "analytics") loadReports();
  }, [activeTab, loadReports]);

  const loadAnalytics = useCallback(async () => {
    setAnalyticsLoading(true);
    try {
      const res = await fetchInventoryAnalytics(analyticsPeriod);
      setAnalyticsData(res || null);
    } catch {} finally {
      setAnalyticsLoading(false);
    }
  }, [analyticsPeriod]);

  useEffect(() => {
    if (activeTab === "analytics") loadAnalytics();
  }, [activeTab, loadAnalytics]);

  const handleMutate = async (fn) => {
    try {
      await fn();
      await loadData();
    } catch (err) {
      throw err;
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteInventoryItem(id);
      setConfirmDelete(null);
      await loadData();
    } catch (err) {
      setError(err.message || "Failed to delete item");
    }
  };

  const handleExportInventory = () => {
    const headers = ["Name", "Category", "Current Stock", "Min Level", "Max Level", "Unit", "Supplier", "Status", "Expiration Date", "Last Restock"];
    const rows = items.map((item) => [
      `"${item.name}"`, `"${item.category}"`, item.currentStock, item.minStockLevel, item.maxStockLevel,
      `"${item.unit}"`, `"${item.supplier || ""}"`, `"${STATUS_LABELS[computeStatus(item)]}"`,
      item.expirationDate ? new Date(item.expirationDate).toLocaleDateString() : "",
      item.lastRestockDate ? new Date(item.lastRestockDate).toLocaleDateString() : "",
    ]);
    exportToCSV(`inventory-${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
  };

  const handleExportReports = () => {
    if (!reportsData) return;
    const headers = ["Date", "Count", "Total Quantity", "Pending", "Resolved"];
    const rows = (reportsData.dailyBreakdown || []).map((d) => [
      `"${d._id}"`, d.count, d.totalQuantity, d.pendingCount, d.resolvedCount,
    ]);
    exportToCSV(`shortage-report-${reportsPeriod}-${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
  };

  const kpiCards = summary ? [
    { label: "Total Items", value: summary.total, accent: "bg-[#B07B4F]" },
    { label: "Low Stock", value: summary.lowStock, accent: "bg-amber-400" },
    { label: "Out of Stock", value: summary.outOfStock, accent: "bg-red-400" },
    { label: "Critical", value: summary.critical, accent: "bg-rose-400" },
    { label: "Expired", value: summary.expired, accent: "bg-stone-400" },
    { label: "Near Expiration", value: summary.nearExpiration, accent: "bg-orange-400" },
  ] : [];

  const criticalAlerts = alerts.filter((a) => a.severity === "critical");
  const highAlerts = alerts.filter((a) => a.severity === "high");

  const tabs = [
    { id: "dashboard", label: "Dashboard", icon: Package },
    { id: "reports", label: "Reports", icon: FileText },
    { id: "analytics", label: "Analytics", icon: BarChart3 },
    { id: "alerts", label: "Alerts", icon: AlertTriangle, badge: alerts.length },
  ];

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 flex items-center gap-2">
          <AlertCircle size={16} />
          {error}
          <button onClick={() => setError("")} className="ml-auto text-rose-400 hover:text-rose-600"><X size={14} /></button>
        </div>
      )}

      <div className="flex gap-1 border-b border-[#EDE1CF]">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                isActive
                  ? "text-[#3B2515] border-[#B07B4F]"
                  : "text-[#9C8268] border-transparent hover:text-[#3B2515]"
              }`}
            >
              <tab.icon size={16} />
              {tab.label}
              {tab.badge > 0 && tab.id !== "dashboard" && (
                <span className="bg-rose-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                  {tab.badge > 9 ? "9+" : tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {activeTab === "dashboard" && (
        <DashboardSection
          loading={loading}
          items={items}
          summary={summary}
          kpiCards={kpiCards}
          search={search} setSearch={setSearch}
          categoryFilter={categoryFilter} setCategoryFilter={setCategoryFilter}
          statusFilter={statusFilter} setStatusFilter={setStatusFilter}
          page={page} setPage={setPage}
          pages={pages} total={total}
          onAdd={() => setShowAddModal(true)}
          onTransfer={() => setShowTransfer(true)}
          onExport={handleExportInventory}
          onViewDetail={(item) => { setSelectedItem(item); setShowDetail(true); }}
          onEdit={(item) => { setSelectedItem(item); setShowEditModal(true); }}
          onDelete={(item) => setConfirmDelete(item)}
          onAddStock={(item) => { setSelectedItem(item); setShowAddStock(true); }}
          onReduceStock={(item) => { setSelectedItem(item); setShowReduceStock(true); }}
          onAdjustStock={(item) => { setSelectedItem(item); setShowAdjustStock(true); }}
        />
      )}

      {activeTab === "reports" && (
        <ReportsSection
          period={reportsPeriod}
          onPeriodChange={setReportsPeriod}
          data={reportsData}
          loading={reportsLoading}
          onExport={handleExportReports}
        />
      )}

      {activeTab === "analytics" && (
        <AnalyticsSection
          period={analyticsPeriod}
          onPeriodChange={setAnalyticsPeriod}
          data={analyticsData}
          loading={analyticsLoading}
        />
      )}

      {activeTab === "alerts" && (
        <AlertsSection alerts={alerts} />
      )}

      {showAddModal && (
        <ItemFormModal
          title="Add Inventory Item"
          onClose={() => setShowAddModal(false)}
          onSubmit={async (data) => {
            await handleMutate(() => createInventoryItem(data));
            setShowAddModal(false);
          }}
        />
      )}

      {showEditModal && selectedItem && (
        <ItemFormModal
          title="Edit Inventory Item"
          initial={selectedItem}
          onClose={() => { setShowEditModal(false); setSelectedItem(null); }}
          onSubmit={async (data) => {
            await handleMutate(() => updateInventoryItem(selectedItem.id || selectedItem._id, data));
            setShowEditModal(false);
            setSelectedItem(null);
          }}
        />
      )}

      {showAddStock && selectedItem && (
        <StockActionModal
          title={`Add Stock — ${selectedItem.name}`}
          label="Quantity to add"
          action="add"
          currentStock={selectedItem.currentStock}
          onClose={() => { setShowAddStock(false); setSelectedItem(null); }}
          onSubmit={async ({ qty, note }) => {
            await handleMutate(() => addStockToItem(selectedItem.id || selectedItem._id, { qty, note }));
            setShowAddStock(false);
            setSelectedItem(null);
          }}
        />
      )}

      {showReduceStock && selectedItem && (
        <StockActionModal
          title={`Reduce Stock — ${selectedItem.name}`}
          label="Quantity to reduce"
          action="reduce"
          currentStock={selectedItem.currentStock}
          maxQty={selectedItem.currentStock}
          onClose={() => { setShowReduceStock(false); setSelectedItem(null); }}
          onSubmit={async ({ qty, note }) => {
            await handleMutate(() => reduceStockFromItem(selectedItem.id || selectedItem._id, { qty, note }));
            setShowReduceStock(false);
            setSelectedItem(null);
          }}
        />
      )}

      {showAdjustStock && selectedItem && (
        <AdjustStockModal
          item={selectedItem}
          onClose={() => { setShowAdjustStock(false); setSelectedItem(null); }}
          onSubmit={async ({ newStock, note }) => {
            await handleMutate(() => adjustStockOfItem(selectedItem.id || selectedItem._id, { newStock, note }));
            setShowAdjustStock(false);
            setSelectedItem(null);
          }}
        />
      )}

      {showTransfer && (
        <TransferStockModal
          items={items}
          onClose={() => setShowTransfer(false)}
          onSubmit={async ({ fromId, toId, qty, note }) => {
            await handleMutate(() => transferStockBetweenItems({ fromId, toId, qty, note }));
            setShowTransfer(false);
          }}
        />
      )}

      {showDetail && selectedItem && (
        <ItemDetailModal
          item={selectedItem}
          onClose={() => { setShowDetail(false); setSelectedItem(null); }}
        />
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full mx-4">
            <h3 className="font-semibold text-[#3B2515] mb-2">Delete Item</h3>
            <p className="text-sm text-[#9C8268] mb-4">
              Are you sure you want to delete <strong>{confirmDelete.name}</strong>? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirmDelete(null)} className="px-4 py-2 rounded-xl border border-[#EDE1CF] text-sm text-[#3B2515] hover:bg-[#FBF6EF]">Cancel</button>
              <button onClick={() => handleDelete(confirmDelete.id || confirmDelete._id)} className="px-4 py-2 rounded-xl bg-rose-600 text-white text-sm hover:bg-rose-700">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DashboardSection({
  loading, items, summary, kpiCards,
  search, setSearch, categoryFilter, setCategoryFilter,
  statusFilter, setStatusFilter, page, setPage, pages, total,
  onAdd, onTransfer, onExport,
  onViewDetail, onEdit, onDelete, onAddStock, onReduceStock, onAdjustStock,
}) {
  return loading && items.length === 0 ? (
    <div className="flex items-center justify-center py-20 text-[#9C8268]">
      <RefreshCw size={20} className="animate-spin mr-2" />
      Loading inventory...
    </div>
  ) : (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          <button onClick={onAdd} className="flex items-center gap-2 rounded-xl bg-[#B07B4F] text-white px-4 py-2.5 text-sm font-medium hover:bg-[#9A6B42] transition-colors">
            <Plus size={16} />
            Add Item
          </button>
          <button onClick={onTransfer} className="flex items-center gap-2 rounded-xl border border-[#EDE1CF] bg-white text-[#3B2515] px-4 py-2.5 text-sm font-medium hover:bg-[#FBF6EF] transition-colors">
            <ArrowRightLeft size={16} />
            Transfer
          </button>
          <button onClick={onExport} className="flex items-center gap-2 rounded-xl border border-[#EDE1CF] bg-white text-[#3B2515] px-4 py-2.5 text-sm font-medium hover:bg-[#FBF6EF] transition-colors">
            <Download size={16} />
            Export CSV
          </button>
        </div>
      </div>

      {kpiCards.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
          {kpiCards.map((kpi) => (
            <div key={kpi.label} className="rounded-xl bg-white border border-[#EDE1CF] p-4">
              <div className={`w-2 h-2 rounded-full mb-2 ${kpi.accent}`} />
              <p className="text-xs text-[#9C8268]">{kpi.label}</p>
              <p className="text-lg font-semibold text-[#3B2515] mt-0.5">{kpi.value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 bg-white rounded-xl px-3.5 py-2 ring-1 ring-[#EDE1CF] text-sm text-[#9C8268]">
          <Search size={14} />
          <input value={search} onChange={(e) => { setPage(1); setSearch(e.target.value); }} placeholder="Search items..." className="w-44 bg-transparent text-xs outline-none placeholder:text-[#A9805F]" />
        </div>
        <select value={categoryFilter} onChange={(e) => { setPage(1); setCategoryFilter(e.target.value); }} className="rounded-xl bg-white px-3 py-2 text-xs ring-1 ring-[#EDE1CF] text-[#3B2515]">
          <option value="">All Categories</option>
          {ALL_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={statusFilter} onChange={(e) => { setPage(1); setStatusFilter(e.target.value); }} className="rounded-xl bg-white px-3 py-2 text-xs ring-1 ring-[#EDE1CF] text-[#3B2515]">
          <option value="">All Statuses</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <span className="text-xs text-[#9C8268]">{total} item{total !== 1 ? "s" : ""}</span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-[#EDE1CF] bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#EDE1CF] bg-[#FBF6EF]">
              <th className="text-left px-4 py-3 text-xs font-medium text-[#9C8268]">Name</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-[#9C8268]">Category</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-[#9C8268]">Stock</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-[#9C8268]">Min</th>
              <th className="text-center px-4 py-3 text-xs font-medium text-[#9C8268]">Unit</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-[#9C8268]">Supplier</th>
              <th className="text-center px-4 py-3 text-xs font-medium text-[#9C8268]">Status</th>
              <th className="text-center px-4 py-3 text-xs font-medium text-[#9C8268]">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-12 text-[#9C8268]">No inventory items found</td></tr>
            ) : items.map((item) => {
              const status = computeStatus(item);
              const style = STATUS_STYLES[status] || STATUS_STYLES.in_stock;
              const label = STATUS_LABELS[status] || "In Stock";
              return (
                <tr key={item.id || item._id} className="border-b border-[#EDE1CF] last:border-0 hover:bg-[#FBF6EF]/50">
                  <td className="px-4 py-3 font-medium text-[#3B2515]">{item.name}</td>
                  <td className="px-4 py-3 text-[#9C8268]">{item.category}</td>
                  <td className="px-4 py-3 text-right font-mono text-sm text-[#3B2515]">{item.currentStock}</td>
                  <td className="px-4 py-3 text-right font-mono text-sm text-[#9C8268]">{item.minStockLevel}</td>
                  <td className="px-4 py-3 text-center text-[#9C8268]">{item.unit}</td>
                  <td className="px-4 py-3 text-[#9C8268] max-w-[120px] truncate">{item.supplier || "—"}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-medium ${style}`}>{label}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => onAddStock(item)} className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-colors" title="Add Stock"><Plus size={14} /></button>
                      <button onClick={() => onReduceStock(item)} className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 transition-colors" title="Reduce Stock"><TrendingDown size={14} /></button>
                      <button onClick={() => onAdjustStock(item)} className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors" title="Adjust Stock"><RefreshCw size={14} /></button>
                      <button onClick={() => onViewDetail(item)} className="p-1.5 rounded-lg text-[#9C8268] hover:bg-[#FBF6EF] transition-colors" title="View Details"><Eye size={14} /></button>
                      <button onClick={() => onEdit(item)} className="p-1.5 rounded-lg text-[#9C8268] hover:bg-[#FBF6EF] transition-colors" title="Edit"><Edit2 size={14} /></button>
                      <button onClick={() => onDelete(item)} className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition-colors" title="Delete"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-[#9C8268]">Page {page} of {pages}</span>
          <div className="flex items-center gap-2">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="p-2 rounded-lg border border-[#EDE1CF] bg-white text-[#3B2515] disabled:opacity-40 hover:bg-[#FBF6EF] transition-colors"><ChevronLeft size={16} /></button>
            <button onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page >= pages} className="p-2 rounded-lg border border-[#EDE1CF] bg-white text-[#3B2515] disabled:opacity-40 hover:bg-[#FBF6EF] transition-colors"><ChevronRight size={16} /></button>
          </div>
        </div>
      )}
    </div>
  );
}

function ReportsSection({ period, onPeriodChange, data, loading, onExport }) {
  const summary = data?.summary;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <select value={period} onChange={(e) => onPeriodChange(e.target.value)} className="rounded-xl bg-white px-3 py-2 text-xs ring-1 ring-[#EDE1CF] text-[#3B2515]">
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </select>
          <span className="text-xs text-[#9C8268]">Report period</span>
        </div>
        <button onClick={onExport} disabled={!data} className="flex items-center gap-2 rounded-xl border border-[#EDE1CF] bg-white text-[#3B2515] px-4 py-2.5 text-sm font-medium hover:bg-[#FBF6EF] disabled:opacity-40 transition-colors">
          <Download size={16} />
          Export CSV
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-[#9C8268]"><RefreshCw size={20} className="animate-spin mr-2" />Loading reports...</div>
      ) : !data ? (
        <div className="text-center py-20 text-[#9C8268] text-sm">No report data available</div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="rounded-xl bg-white border border-[#EDE1CF] p-4">
              <div className="w-2 h-2 rounded-full mb-2 bg-[#B07B4F]" />
              <p className="text-xs text-[#9C8268]">Total Reports</p>
              <p className="text-lg font-semibold text-[#3B2515] mt-0.5">{summary?.total || 0}</p>
            </div>
            <div className="rounded-xl bg-white border border-[#EDE1CF] p-4">
              <div className="w-2 h-2 rounded-full mb-2 bg-amber-400" />
              <p className="text-xs text-[#9C8268]">Pending</p>
              <p className="text-lg font-semibold text-[#3B2515] mt-0.5">{summary?.pending || 0}</p>
            </div>
            <div className="rounded-xl bg-white border border-[#EDE1CF] p-4">
              <div className="w-2 h-2 rounded-full mb-2 bg-emerald-400" />
              <p className="text-xs text-[#9C8268]">Resolved</p>
              <p className="text-lg font-semibold text-[#3B2515] mt-0.5">{summary?.resolved || 0}</p>
            </div>
            <div className="rounded-xl bg-white border border-[#EDE1CF] p-4">
              <div className="w-2 h-2 rounded-full mb-2 bg-stone-400" />
              <p className="text-xs text-[#9C8268]">Resolution Rate</p>
              <p className="text-lg font-semibold text-[#3B2515] mt-0.5">{data.resolutionRate || 0}%</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-xl bg-white border border-[#EDE1CF] p-4">
              <h3 className="text-sm font-semibold text-[#3B2515] mb-3">Daily Breakdown</h3>
              <div className="max-h-64 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-[#EDE1CF] text-[#9C8268]">
                      <th className="text-left py-2">Date</th>
                      <th className="text-right py-2">Reports</th>
                      <th className="text-right py-2">Quantity</th>
                      <th className="text-right py-2">Pending</th>
                      <th className="text-right py-2">Resolved</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data.dailyBreakdown || []).length === 0 ? (
                      <tr><td colSpan={5} className="text-center py-8 text-[#9C8268]">No data for this period</td></tr>
                    ) : (data.dailyBreakdown || []).map((d) => (
                      <tr key={d._id} className="border-b border-[#EDE1CF]/50">
                        <td className="py-2 text-[#3B2515]">{d._id}</td>
                        <td className="py-2 text-right font-mono">{d.count}</td>
                        <td className="py-2 text-right font-mono">{d.totalQuantity}</td>
                        <td className="py-2 text-right font-mono text-amber-600">{d.pendingCount}</td>
                        <td className="py-2 text-right font-mono text-emerald-600">{d.resolvedCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rounded-xl bg-white border border-[#EDE1CF] p-4">
              <h3 className="text-sm font-semibold text-[#3B2515] mb-3">Top Missing Items</h3>
              <div className="max-h-64 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-[#EDE1CF] text-[#9C8268]">
                      <th className="text-left py-2">Item</th>
                      <th className="text-right py-2">Reports</th>
                      <th className="text-right py-2">Total Qty</th>
                      <th className="text-right py-2">Last Reported</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data.topMissingItems || []).length === 0 ? (
                      <tr><td colSpan={4} className="text-center py-8 text-[#9C8268]">No shortages reported</td></tr>
                    ) : (data.topMissingItems || []).map((d) => (
                      <tr key={d._id} className="border-b border-[#EDE1CF]/50">
                        <td className="py-2 text-[#3B2515] font-medium">{d._id}</td>
                        <td className="py-2 text-right font-mono">{d.totalReports}</td>
                        <td className="py-2 text-right font-mono">{d.totalQuantityNeeded}</td>
                        <td className="py-2 text-right text-[#9C8268]">{new Date(d.lastReported).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {(data.dailyBreakdown || []).length > 0 && (
            <div className="rounded-xl bg-white border border-[#EDE1CF] p-4">
              <h3 className="text-sm font-semibold text-[#3B2515] mb-3">Shortage Trend</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={data.dailyBreakdown}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#EDE1CF" />
                  <XAxis dataKey="_id" tick={{ fontSize: 10, fill: "#9C8268" }} />
                  <YAxis tick={{ fontSize: 10, fill: "#9C8268" }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#B07B4F" radius={[4, 4, 0, 0]} name="Reports" />
                  <Bar dataKey="pendingCount" fill="#F59E0B" radius={[4, 4, 0, 0]} name="Pending" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function AnalyticsSection({ period, onPeriodChange, data, loading }) {
  const consumption = data?.consumption || [];
  const restockFrequency = data?.restockFrequency || [];
  const usageByCategory = data?.usageByCategory || {};

  const categoryData = useMemo(() => {
    return Object.entries(usageByCategory).map(([name, vals]) => ({
      name,
      reduced: vals.reduced,
      restocked: vals.restocked,
    })).sort((a, b) => b.reduced - a.reduced);
  }, [usageByCategory]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <select value={period} onChange={(e) => onPeriodChange(e.target.value)} className="rounded-xl bg-white px-3 py-2 text-xs ring-1 ring-[#EDE1CF] text-[#3B2515]">
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
          <option value="yearly">Yearly</option>
        </select>
        <span className="text-xs text-[#9C8268]">Analysis period</span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-[#9C8268]"><RefreshCw size={20} className="animate-spin mr-2" />Loading analytics...</div>
      ) : !data ? (
        <div className="text-center py-20 text-[#9C8268] text-sm">No analytics data available. Add stock movements to see charts.</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {consumption.length > 0 && (
            <div className="rounded-xl bg-white border border-[#EDE1CF] p-4">
              <h3 className="text-sm font-semibold text-[#3B2515] mb-3">Most Consumed Items</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={consumption.slice(0, 10)} layout="vertical" margin={{ left: 80 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#EDE1CF" />
                  <XAxis type="number" tick={{ fontSize: 10, fill: "#9C8268" }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "#3B2515" }} width={80} />
                  <Tooltip formatter={(value, name, props) => [value, props.payload.unit || "units"]} />
                  <Bar dataKey="qty" fill="#B07B4F" radius={[0, 4, 4, 0]} name="Consumed" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {restockFrequency.length > 0 && (
            <div className="rounded-xl bg-white border border-[#EDE1CF] p-4">
              <h3 className="text-sm font-semibold text-[#3B2515] mb-3">Most Restocked Items</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={restockFrequency.slice(0, 10)} layout="vertical" margin={{ left: 80 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#EDE1CF" />
                  <XAxis type="number" tick={{ fontSize: 10, fill: "#9C8268" }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "#3B2515" }} width={80} />
                  <Tooltip formatter={(value, name, props) => [value, props.payload.unit || "times"]} />
                  <Bar dataKey="count" fill="#3B2515" radius={[0, 4, 4, 0]} name="Restocks" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {categoryData.length > 0 && (
            <div className="rounded-xl bg-white border border-[#EDE1CF] p-4">
              <h3 className="text-sm font-semibold text-[#3B2515] mb-3">Usage by Category</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={categoryData} dataKey="reduced" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {categoryData.map((_, idx) => <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="rounded-xl bg-white border border-[#EDE1CF] p-4">
            <h3 className="text-sm font-semibold text-[#3B2515] mb-3">Summary</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between py-1.5 border-b border-[#EDE1CF]/50">
                <span className="text-[#9C8268]">Period</span>
                <span className="text-[#3B2515] font-medium capitalize">{period}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[#EDE1CF]/50">
                <span className="text-[#9C8268]">Period Days</span>
                <span className="text-[#3B2515] font-medium">{data.periodDays || 0}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[#EDE1CF]/50">
                <span className="text-[#9C8268]">Total Items</span>
                <span className="text-[#3B2515] font-medium">{data.totalItems || 0}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[#EDE1CF]/50">
                <span className="text-[#9C8268]">Items with Consumption</span>
                <span className="text-[#3B2515] font-medium">{consumption.length}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[#EDE1CF]/50">
                <span className="text-[#9C8268]">Items Restocked</span>
                <span className="text-[#3B2515] font-medium">{restockFrequency.length}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-[#9C8268]">Categories</span>
                <span className="text-[#3B2515] font-medium">{categoryData.length}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AlertsSection({ alerts }) {
  if (alerts.length === 0) {
    return (
      <div className="text-center py-20 text-[#9C8268] text-sm">
        <Package size={40} className="mx-auto mb-3 opacity-30" />
        No active alerts
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-[#9C8268]">{alerts.length} alert{alerts.length > 1 ? "s" : ""}</p>
      {alerts.map((alert, i) => (
        <div key={i} className={`rounded-xl border p-4 ${
          alert.severity === "critical" ? "border-rose-200 bg-rose-50" :
          alert.severity === "high" ? "border-orange-200 bg-orange-50" :
          "border-amber-200 bg-amber-50"
        }`}>
          <div className="flex items-start gap-3">
            <AlertCircle size={16} className={`mt-0.5 ${
              alert.severity === "critical" ? "text-rose-500" :
              alert.severity === "high" ? "text-orange-500" :
              "text-amber-500"
            }`} />
            <div>
              <p className="text-sm font-medium text-[#3B2515]">{alert.item}</p>
              <p className="text-xs text-[#9C8268] mt-0.5">{alert.message}</p>
              <span className={`inline-block mt-1.5 text-[10px] font-semibold uppercase tracking-wide ${
                alert.severity === "critical" ? "text-rose-600" :
                alert.severity === "high" ? "text-orange-600" :
                "text-amber-600"
              }`}>{alert.severity}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ItemFormModal({ title, initial, onClose, onSubmit }) {
  const [form, setForm] = useState({
    name: initial?.name || "",
    category: initial?.category || "Uncategorized",
    currentStock: initial?.currentStock ?? "",
    minStockLevel: initial?.minStockLevel ?? 10,
    maxStockLevel: initial?.maxStockLevel ?? 100,
    unit: initial?.unit || "pcs",
    supplier: initial?.supplier || "",
    expirationDate: initial?.expirationDate ? new Date(initial.expirationDate).toISOString().split("T")[0] : "",
    notes: initial?.notes || "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    if (!form.name.trim()) { setErr("Item name is required"); return; }
    setSubmitting(true);
    try { await onSubmit(form); }
    catch (error) { setErr(error.message || "Failed to save item"); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 overflow-y-auto py-10">
      <div className="bg-white rounded-2xl shadow-xl p-6 max-w-lg w-full mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-[#3B2515]">{title}</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-[#FBF6EF] text-[#9C8268]"><X size={18} /></button>
        </div>
        {err && <div className="mb-4 text-sm text-rose-600 bg-rose-50 rounded-xl px-3 py-2">{err}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-xs text-[#9C8268] font-medium block mb-1">Name *</label>
              <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full rounded-xl border border-[#EDE1CF] px-3.5 py-2.5 text-sm text-[#3B2515] bg-white focus:outline-none focus:ring-2 focus:ring-[#B07B4F]/40" />
            </div>
            <div>
              <label className="text-xs text-[#9C8268] font-medium block mb-1">Category</label>
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full rounded-xl border border-[#EDE1CF] px-3.5 py-2.5 text-sm text-[#3B2515] bg-white focus:outline-none focus:ring-2 focus:ring-[#B07B4F]/40">
                {ALL_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-[#9C8268] font-medium block mb-1">Unit</label>
              <select value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} className="w-full rounded-xl border border-[#EDE1CF] px-3.5 py-2.5 text-sm text-[#3B2515] bg-white focus:outline-none focus:ring-2 focus:ring-[#B07B4F]/40">
                {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-[#9C8268] font-medium block mb-1">Current Stock</label>
              <input type="number" min="0" value={form.currentStock} onChange={(e) => setForm({ ...form, currentStock: e.target.value })} className="w-full rounded-xl border border-[#EDE1CF] px-3.5 py-2.5 text-sm text-[#3B2515] bg-white focus:outline-none focus:ring-2 focus:ring-[#B07B4F]/40" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-[#9C8268] font-medium block mb-1">Min Stock</label>
                <input type="number" min="0" value={form.minStockLevel} onChange={(e) => setForm({ ...form, minStockLevel: e.target.value })} className="w-full rounded-xl border border-[#EDE1CF] px-3.5 py-2.5 text-sm text-[#3B2515] bg-white focus:outline-none focus:ring-2 focus:ring-[#B07B4F]/40" />
              </div>
              <div>
                <label className="text-xs text-[#9C8268] font-medium block mb-1">Max Stock</label>
                <input type="number" min="0" value={form.maxStockLevel} onChange={(e) => setForm({ ...form, maxStockLevel: e.target.value })} className="w-full rounded-xl border border-[#EDE1CF] px-3.5 py-2.5 text-sm text-[#3B2515] bg-white focus:outline-none focus:ring-2 focus:ring-[#B07B4F]/40" />
              </div>
            </div>
            <div>
              <label className="text-xs text-[#9C8268] font-medium block mb-1">Supplier</label>
              <input value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} className="w-full rounded-xl border border-[#EDE1CF] px-3.5 py-2.5 text-sm text-[#3B2515] bg-white focus:outline-none focus:ring-2 focus:ring-[#B07B4F]/40" />
            </div>
            <div>
              <label className="text-xs text-[#9C8268] font-medium block mb-1">Expiration Date</label>
              <input type="date" value={form.expirationDate} onChange={(e) => setForm({ ...form, expirationDate: e.target.value })} className="w-full rounded-xl border border-[#EDE1CF] px-3.5 py-2.5 text-sm text-[#3B2515] bg-white focus:outline-none focus:ring-2 focus:ring-[#B07B4F]/40" />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-[#9C8268] font-medium block mb-1">Notes</label>
              <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} className="w-full rounded-xl border border-[#EDE1CF] px-3.5 py-2.5 text-sm text-[#3B2515] bg-white focus:outline-none focus:ring-2 focus:ring-[#B07B4F]/40 resize-none" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl border border-[#EDE1CF] text-sm text-[#3B2515] hover:bg-[#FBF6EF]">Cancel</button>
            <button type="submit" disabled={submitting} className="px-4 py-2 rounded-xl bg-[#B07B4F] text-white text-sm font-medium hover:bg-[#9A6B42] disabled:opacity-50 transition-colors">
              {submitting ? "Saving..." : initial ? "Update" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function StockActionModal({ title, label, action, currentStock, maxQty, onClose, onSubmit }) {
  const [qty, setQty] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    const n = Number(qty);
    if (!n || n <= 0) { setErr("Quantity must be greater than 0"); return; }
    if (maxQty !== undefined && n > maxQty) { setErr(`Cannot exceed current stock (${maxQty})`); return; }
    setSubmitting(true);
    setErr("");
    try { await onSubmit({ qty: n, note }); }
    catch (error) { setErr(error.message || "Operation failed"); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-[#3B2515]">{title}</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-[#FBF6EF] text-[#9C8268]"><X size={18} /></button>
        </div>
        <p className="text-xs text-[#9C8268] mb-4">Current stock: <strong>{currentStock}</strong></p>
        {err && <div className="mb-3 text-sm text-rose-600 bg-rose-50 rounded-xl px-3 py-2">{err}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs text-[#9C8268] font-medium block mb-1">{label}</label>
            <input type="number" min="0" step="1" value={qty} onChange={(e) => setQty(e.target.value)} className="w-full rounded-xl border border-[#EDE1CF] px-3.5 py-2.5 text-sm text-[#3B2515] bg-white focus:outline-none focus:ring-2 focus:ring-[#B07B4F]/40" />
          </div>
          <div>
            <label className="text-xs text-[#9C8268] font-medium block mb-1">Note (optional)</label>
            <input value={note} onChange={(e) => setNote(e.target.value)} className="w-full rounded-xl border border-[#EDE1CF] px-3.5 py-2.5 text-sm text-[#3B2515] bg-white focus:outline-none focus:ring-2 focus:ring-[#B07B4F]/40" />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl border border-[#EDE1CF] text-sm text-[#3B2515] hover:bg-[#FBF6EF]">Cancel</button>
            <button type="submit" disabled={submitting} className={`px-4 py-2 rounded-xl text-white text-sm font-medium disabled:opacity-50 transition-colors ${
              action === "add" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-amber-600 hover:bg-amber-700"
            }`}>{submitting ? "Processing..." : action === "add" ? "Add Stock" : "Reduce Stock"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AdjustStockModal({ item, onClose, onSubmit }) {
  const [newStock, setNewStock] = useState(item.currentStock);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    const n = Number(newStock);
    if (n < 0) { setErr("Stock cannot be negative"); return; }
    setSubmitting(true);
    setErr("");
    try { await onSubmit({ newStock: n, note }); }
    catch (error) { setErr(error.message || "Adjustment failed"); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-[#3B2515]">Adjust Stock — {item.name}</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-[#FBF6EF] text-[#9C8268]"><X size={18} /></button>
        </div>
        <p className="text-xs text-[#9C8268] mb-4">Current stock: <strong>{item.currentStock}</strong> {item.unit}</p>
        {err && <div className="mb-3 text-sm text-rose-600 bg-rose-50 rounded-xl px-3 py-2">{err}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs text-[#9C8268] font-medium block mb-1">New Stock Level</label>
            <input type="number" min="0" value={newStock} onChange={(e) => setNewStock(e.target.value)} className="w-full rounded-xl border border-[#EDE1CF] px-3.5 py-2.5 text-sm text-[#3B2515] bg-white focus:outline-none focus:ring-2 focus:ring-[#B07B4F]/40" />
          </div>
          <div>
            <label className="text-xs text-[#9C8268] font-medium block mb-1">Reason (optional)</label>
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g., Inventory count correction" className="w-full rounded-xl border border-[#EDE1CF] px-3.5 py-2.5 text-sm text-[#3B2515] bg-white focus:outline-none focus:ring-2 focus:ring-[#B07B4F]/40" />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl border border-[#EDE1CF] text-sm text-[#3B2515] hover:bg-[#FBF6EF]">Cancel</button>
            <button type="submit" disabled={submitting} className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
              {submitting ? "Adjusting..." : "Adjust Stock"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function TransferStockModal({ items, onClose, onSubmit }) {
  const [fromId, setFromId] = useState("");
  const [toId, setToId] = useState("");
  const [qty, setQty] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState("");

  const fromItem = items.find((i) => (i.id || i._id) === fromId);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!fromId || !toId) { setErr("Select both source and destination items"); return; }
    if (fromId === toId) { setErr("Cannot transfer to the same item"); return; }
    const n = Number(qty);
    if (!n || n <= 0) { setErr("Quantity must be greater than 0"); return; }
    if (fromItem && n > fromItem.currentStock) { setErr(`Insufficient stock in source (${fromItem.currentStock})`); return; }
    setSubmitting(true);
    setErr("");
    try { await onSubmit({ fromId, toId, qty: n, note }); }
    catch (error) { setErr(error.message || "Transfer failed"); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl p-6 max-w-md w-full mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-[#3B2515]">Transfer Stock</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-[#FBF6EF] text-[#9C8268]"><X size={18} /></button>
        </div>
        {err && <div className="mb-3 text-sm text-rose-600 bg-rose-50 rounded-xl px-3 py-2">{err}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs text-[#9C8268] font-medium block mb-1">From</label>
            <select value={fromId} onChange={(e) => setFromId(e.target.value)} className="w-full rounded-xl border border-[#EDE1CF] px-3.5 py-2.5 text-sm text-[#3B2515] bg-white focus:outline-none focus:ring-2 focus:ring-[#B07B4F]/40">
              <option value="">Select source item...</option>
              {items.map((i) => (<option key={i.id || i._id} value={i.id || i._id}>{i.name} ({i.currentStock} {i.unit})</option>))}
            </select>
          </div>
          <div>
            <label className="text-xs text-[#9C8268] font-medium block mb-1">To</label>
            <select value={toId} onChange={(e) => setToId(e.target.value)} className="w-full rounded-xl border border-[#EDE1CF] px-3.5 py-2.5 text-sm text-[#3B2515] bg-white focus:outline-none focus:ring-2 focus:ring-[#B07B4F]/40">
              <option value="">Select destination item...</option>
              {items.filter((i) => (i.id || i._id) !== fromId).map((i) => (<option key={i.id || i._id} value={i.id || i._id}>{i.name} ({i.currentStock} {i.unit})</option>))}
            </select>
          </div>
          <div>
            <label className="text-xs text-[#9C8268] font-medium block mb-1">Quantity</label>
            <input type="number" min="0" value={qty} onChange={(e) => setQty(e.target.value)} className="w-full rounded-xl border border-[#EDE1CF] px-3.5 py-2.5 text-sm text-[#3B2515] bg-white focus:outline-none focus:ring-2 focus:ring-[#B07B4F]/40" />
          </div>
          <div>
            <label className="text-xs text-[#9C8268] font-medium block mb-1">Note (optional)</label>
            <input value={note} onChange={(e) => setNote(e.target.value)} className="w-full rounded-xl border border-[#EDE1CF] px-3.5 py-2.5 text-sm text-[#3B2515] bg-white focus:outline-none focus:ring-2 focus:ring-[#B07B4F]/40" />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl border border-[#EDE1CF] text-sm text-[#3B2515] hover:bg-[#FBF6EF]">Cancel</button>
            <button type="submit" disabled={submitting} className="px-4 py-2 rounded-xl bg-[#B07B4F] text-white text-sm font-medium hover:bg-[#9A6B42] disabled:opacity-50 transition-colors">
              {submitting ? "Transferring..." : "Transfer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ItemDetailModal({ item, onClose }) {
  const movements = Array.isArray(item.movements) ? [...item.movements].reverse() : [];

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 overflow-y-auto py-10">
      <div className="bg-white rounded-2xl shadow-xl p-6 max-w-lg w-full mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-[#3B2515]">{item.name}</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-[#FBF6EF] text-[#9C8268]"><X size={18} /></button>
        </div>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><span className="text-[#9C8268] text-xs">Category</span><p className="text-[#3B2515]">{item.category}</p></div>
            <div><span className="text-[#9C8268] text-xs">Status</span><p><span className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-medium ${STATUS_STYLES[computeStatus(item)] || ""}`}>{STATUS_LABELS[computeStatus(item)] || "In Stock"}</span></p></div>
            <div><span className="text-[#9C8268] text-xs">Current Stock</span><p className="text-[#3B2515] font-mono">{item.currentStock} {item.unit}</p></div>
            <div><span className="text-[#9C8268] text-xs">Min / Max</span><p className="text-[#3B2515] font-mono">{item.minStockLevel} / {item.maxStockLevel} {item.unit}</p></div>
            <div><span className="text-[#9C8268] text-xs">Supplier</span><p className="text-[#3B2515]">{item.supplier || "—"}</p></div>
            <div><span className="text-[#9C8268] text-xs">Expiration</span><p className="text-[#3B2515]">{item.expirationDate ? new Date(item.expirationDate).toLocaleDateString() : "—"}</p></div>
            {item.lastRestockDate && <div><span className="text-[#9C8268] text-xs">Last Restock</span><p className="text-[#3B2515]">{new Date(item.lastRestockDate).toLocaleDateString()}</p></div>}
            {item.notes && <div className="col-span-2"><span className="text-[#9C8268] text-xs">Notes</span><p className="text-[#3B2515]">{item.notes}</p></div>}
          </div>

          <div>
            <h4 className="text-sm font-medium text-[#3B2515] mb-2">Stock Movement History ({movements.length})</h4>
            {movements.length === 0 ? (
              <p className="text-xs text-[#9C8268]">No movements recorded</p>
            ) : (
              <div className="max-h-48 overflow-y-auto space-y-2">
                {movements.slice(0, 50).map((m, i) => (
                  <div key={i} className="flex items-center justify-between text-xs text-[#3B2515] bg-[#FBF6EF] rounded-xl px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        m.type === "restock" || m.type === "transfer_in" ? "bg-emerald-400" :
                        m.type === "reduce" || m.type === "transfer_out" ? "bg-amber-400" :
                        m.type === "adjustment" ? "bg-blue-400" : "bg-stone-400"
                      }`} />
                      <span className="capitalize">{m.type.replace(/_/g, " ")}</span>
                      <span className="font-mono text-[#9C8268]">{m.beforeStock} → {m.afterStock}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[#9C8268]">
                      {m.note && <span className="max-w-[120px] truncate">{m.note}</span>}
                      <span>{m.date ? new Date(m.date).toLocaleDateString() : ""}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
