import { useEffect, useState } from "react";
import { fetchSalesReport, fetchOrdersReport, fetchProductsReport, fetchInventoryReport, fetchCustomerReport, fetchWaiterReport, fetchTableReport, fetchPaymentReport } from "../services/data.js";

const REPORTS = [
  { key: "sales", label: "Sales" },
  { key: "orders", label: "Orders" },
  { key: "products", label: "Products" },
  { key: "inventory", label: "Inventory" },
  { key: "customers", label: "Customers" },
  { key: "waiters", label: "Waiters" },
  { key: "tables", label: "Tables" },
  { key: "payments", label: "Payments" },
];

const PERIODS = ["daily", "weekly", "monthly", "yearly"];

function formatCurrency(val) {
  if (val == null) return "$0.00";
  return `$${Number(val).toFixed(2)}`;
}

function formatPct(val) {
  if (val == null) return "0%";
  return `${Number(val).toFixed(1)}%`;
}

function Bar({ value, max, label, color = "bg-[#B07B4F]" }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-[#9C8268] w-24 truncate text-right shrink-0">{label}</span>
      <div className="flex-1 h-5 bg-[#EDE1CF] rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
      <span className="text-xs text-[#3B2515] font-medium w-16 text-right shrink-0">{value}</span>
    </div>
  );
}

function SummaryCard({ label, value, sub }) {
  return (
    <div className="rounded-2xl bg-white ring-1 ring-[#EDE1CF] shadow-sm p-4">
      <p className="text-[10px] uppercase tracking-wide text-[#A9805F] font-medium">{label}</p>
      <p className="text-xl font-serif text-[#3B2515] mt-1">{value}</p>
      {sub != null && <p className="text-xs text-[#9C8268] mt-0.5">{sub}</p>}
    </div>
  );
}

function Table({ columns, rows, emptyText = "No data" }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[#EDE1CF] bg-[#FBF6EF]">
            {columns.map((col) => (
              <th key={col.key} className={`text-left px-4 py-3 text-[#A9805F] text-xs uppercase tracking-wide font-medium ${col.align === "right" ? "text-right" : ""}`}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={columns.length} className="text-center py-10 text-[#9C8268] text-sm">{emptyText}</td></tr>
          ) : (
            rows.map((row, i) => (
              <tr key={row._id || row.id || i} className="border-b border-[#EDE1CF]/50 hover:bg-[#FBF6EF]/50 transition-colors">
                {columns.map((col) => (
                  <td key={col.key} className={`px-4 py-3 text-[#3B2515] ${col.align === "right" ? "text-right" : ""}`}>
                    {col.render ? col.render(row) : row[col.key] ?? "—"}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function SalesReport({ period }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetchSalesReport({ period }).then((d) => { if (alive) setData(d); }).catch(() => {}).finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [period]);

  if (loading) return <div className="text-center py-10 text-[#9C8268] text-sm">Loading sales report...</div>;
  if (!data) return <div className="text-center py-10 text-[#9C8268] text-sm">No data available</div>;

  const periods = Array.isArray(data.periods) ? data.periods : [];
  const maxVal = periods.reduce((m, p) => Math.max(m, p.revenue || p.total || 0), 0);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard label="Total Revenue" value={formatCurrency(data.total)} sub={data.comparison ? `${data.comparison > 0 ? "+" : ""}${data.comparison.toFixed(1)}% vs prev` : undefined} />
      </div>
      <div className="rounded-2xl bg-white ring-1 ring-[#EDE1CF] shadow-sm p-5 space-y-3">
        <p className="text-xs text-[#A9805F] uppercase tracking-wide font-medium">Revenue by Period</p>
        {periods.map((p, i) => (
          <Bar key={i} value={p.revenue || p.total || 0} max={maxVal} label={p.label || p.period || p.date || `Period ${i + 1}`} />
        ))}
        {periods.length === 0 && <p className="text-center py-6 text-[#9C8268] text-sm">No period data</p>}
      </div>
    </div>
  );
}

function OrdersReport({ period }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetchOrdersReport({ period }).then((d) => { if (alive) setData(d); }).catch(() => {}).finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [period]);

  if (loading) return <div className="text-center py-10 text-[#9C8268] text-sm">Loading orders report...</div>;
  if (!data) return <div className="text-center py-10 text-[#9C8268] text-sm">No data available</div>;

  const byStatus = data.byStatus || {};
  const statusEntries = Object.entries(byStatus);
  const maxStatus = statusEntries.reduce((m, [, v]) => Math.max(m, v), 0);
  const peakHours = Array.isArray(data.peakHours) ? data.peakHours : [];
  const maxHour = peakHours.reduce((m, h) => Math.max(m, h.count || h.orders || 0), 0);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <SummaryCard label="Total Orders" value={data.total ?? "—"} />
      </div>
      <div className="rounded-2xl bg-white ring-1 ring-[#EDE1CF] shadow-sm p-5 space-y-3">
        <p className="text-xs text-[#A9805F] uppercase tracking-wide font-medium">Orders by Status</p>
        {statusEntries.map(([status, count]) => (
          <Bar key={status} value={count} max={maxStatus} label={status} color="bg-emerald-500" />
        ))}
        {statusEntries.length === 0 && <p className="text-center py-6 text-[#9C8268] text-sm">No status data</p>}
      </div>
      <div className="rounded-2xl bg-white ring-1 ring-[#EDE1CF] shadow-sm p-5 space-y-3">
        <p className="text-xs text-[#A9805F] uppercase tracking-wide font-medium">Peak Hours</p>
        {peakHours.map((h, i) => (
          <Bar key={i} value={h.count || h.orders || 0} max={maxHour} label={`${h.hour || h.label || `Hour ${i}`}:00`} color="bg-amber-500" />
        ))}
        {peakHours.length === 0 && <p className="text-center py-6 text-[#9C8268] text-sm">No peak hour data</p>}
      </div>
    </div>
  );
}

function ProductsReport({ period }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetchProductsReport({ period }).then((d) => { if (alive) setData(d); }).catch(() => {}).finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [period]);

  if (loading) return <div className="text-center py-10 text-[#9C8268] text-sm">Loading products report...</div>;
  if (!data) return <div className="text-center py-10 text-[#9C8268] text-sm">No data available</div>;

  const topSellers = Array.isArray(data.topSellers) ? data.topSellers : [];
  const maxSold = topSellers.reduce((m, p) => Math.max(m, p.sold || p.quantity || p.count || 0), 0);
  const byCategory = data.byCategory || {};

  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-white ring-1 ring-[#EDE1CF] shadow-sm p-5 space-y-3">
        <p className="text-xs text-[#A9805F] uppercase tracking-wide font-medium">Top Selling Products</p>
        {topSellers.map((p, i) => (
          <Bar key={i} value={p.sold || p.quantity || p.count || 0} max={maxSold} label={p.name || p.productName || p.product || `Item ${i + 1}`} color="bg-[#B07B4F]" />
        ))}
        {topSellers.length === 0 && <p className="text-center py-6 text-[#9C8268] text-sm">No product data</p>}
      </div>
      <div className="rounded-2xl bg-white ring-1 ring-[#EDE1CF] shadow-sm p-5">
        <p className="text-xs text-[#A9805F] uppercase tracking-wide font-medium mb-3">By Category</p>
        <Table
          columns={[
            { key: "category", label: "Category" },
            { key: "count", label: "Items Sold", align: "right" },
            { key: "revenue", label: "Revenue", align: "right", render: (r) => formatCurrency(r.revenue || r.total || 0) },
          ]}
          rows={Object.entries(byCategory).map(([cat, val]) => ({
            category: cat,
            count: typeof val === "object" ? (val.count || val.sold || val.items || 0) : val,
            revenue: typeof val === "object" ? (val.revenue || val.total || 0) : 0,
          }))}
          emptyText="No category data"
        />
      </div>
    </div>
  );
}

function InventoryReport({ period }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetchInventoryReport({ period }).then((d) => { if (alive) setData(d); }).catch(() => {}).finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [period]);

  if (loading) return <div className="text-center py-10 text-[#9C8268] text-sm">Loading inventory report...</div>;
  if (!data) return <div className="text-center py-10 text-[#9C8268] text-sm">No data available</div>;

  const lowStock = Array.isArray(data.lowStock) ? data.lowStock : [];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SummaryCard label="Total Value" value={formatCurrency(data.totalValue)} />
        <SummaryCard label="Turnover Rate" value={data.turnoverRate ? `${Number(data.turnoverRate).toFixed(1)}x` : "—"} />
        <SummaryCard label="Low Stock Items" value={lowStock.length} />
      </div>
      <div className="rounded-2xl bg-white ring-1 ring-[#EDE1CF] shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-[#EDE1CF]">
          <p className="text-xs text-[#A9805F] uppercase tracking-wide font-medium">Low Stock Items</p>
        </div>
        <Table
          columns={[
            { key: "name", label: "Item" },
            { key: "current", label: "Current Stock", align: "right" },
            { key: "minimum", label: "Minimum Level", align: "right" },
            { key: "unit", label: "Unit" },
          ]}
          rows={lowStock.map((item) => ({
            name: item.name || item.itemName || item.product || "—",
            current: item.currentStock ?? item.current ?? item.quantity ?? 0,
            minimum: item.minimumStock ?? item.minimum ?? item.threshold ?? 0,
            unit: item.unit || "pcs",
          }))}
          emptyText="No low stock items"
        />
      </div>
    </div>
  );
}

function CustomerReport({ period }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetchCustomerReport({ period }).then((d) => { if (alive) setData(d); }).catch(() => {}).finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [period]);

  if (loading) return <div className="text-center py-10 text-[#9C8268] text-sm">Loading customer report...</div>;
  if (!data) return <div className="text-center py-10 text-[#9C8268] text-sm">No data available</div>;

  const topCustomers = Array.isArray(data.topCustomers) ? data.topCustomers : [];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <SummaryCard label="New Customers" value={data.newCustomers ?? "—"} />
        <SummaryCard label="Returning Customers" value={data.returningCustomers ?? "—"} />
      </div>
      <div className="rounded-2xl bg-white ring-1 ring-[#EDE1CF] shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-[#EDE1CF]">
          <p className="text-xs text-[#A9805F] uppercase tracking-wide font-medium">Top Customers</p>
        </div>
        <Table
          columns={[
            { key: "name", label: "Name" },
            { key: "orders", label: "Orders", align: "right" },
            { key: "spent", label: "Total Spent", align: "right", render: (r) => formatCurrency(r.spent || r.total || r.revenue || 0) },
            { key: "visits", label: "Visits", align: "right" },
          ]}
          rows={topCustomers.map((c) => ({
            name: c.name || c.customerName || c.customer || "—",
            orders: c.orders ?? c.orderCount ?? c.totalOrders ?? 0,
            spent: c.spent ?? c.totalSpent ?? c.total ?? 0,
            visits: c.visits ?? c.visitCount ?? c.totalVisits ?? 0,
          }))}
          emptyText="No customer data"
        />
      </div>
    </div>
  );
}

function WaiterReport({ period }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetchWaiterReport({ period }).then((d) => { if (alive) setData(d); }).catch(() => {}).finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [period]);

  if (loading) return <div className="text-center py-10 text-[#9C8268] text-sm">Loading waiter report...</div>;
  if (!data) return <div className="text-center py-10 text-[#9C8268] text-sm">No data available</div>;

  const waiters = Array.isArray(data.waiters) ? data.waiters : [];
  const maxOrders = waiters.reduce((m, w) => Math.max(m, w.orders || w.orderCount || 0), 0);

  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-white ring-1 ring-[#EDE1CF] shadow-sm p-5 space-y-3">
        <p className="text-xs text-[#A9805F] uppercase tracking-wide font-medium">Waiter Performance</p>
        {waiters.map((w, i) => (
          <Bar key={i} value={w.orders || w.orderCount || 0} max={maxOrders} label={w.name || w.waiterName || w.waiter || `Waiter ${i + 1}`} color="bg-indigo-500" />
        ))}
        {waiters.length === 0 && <p className="text-center py-6 text-[#9C8268] text-sm">No waiter data</p>}
      </div>
      <div className="rounded-2xl bg-white ring-1 ring-[#EDE1CF] shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-[#EDE1CF]">
          <p className="text-xs text-[#A9805F] uppercase tracking-wide font-medium">Waiter Details</p>
        </div>
        <Table
          columns={[
            { key: "name", label: "Name" },
            { key: "orders", label: "Orders", align: "right" },
            { key: "revenue", label: "Revenue", align: "right", render: (r) => formatCurrency(r.revenue || r.total || 0) },
            { key: "rating", label: "Rating", align: "right", render: (r) => r.rating != null ? `${Number(r.rating).toFixed(1)}` : "—" },
          ]}
          rows={waiters}
          emptyText="No waiter details"
        />
      </div>
    </div>
  );
}

function TableReport({ period }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetchTableReport({ period }).then((d) => { if (alive) setData(d); }).catch(() => {}).finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [period]);

  if (loading) return <div className="text-center py-10 text-[#9C8268] text-sm">Loading table report...</div>;
  if (!data) return <div className="text-center py-10 text-[#9C8268] text-sm">No data available</div>;

  const tables = Array.isArray(data.tables) ? data.tables : [];
  const bySection = data.bySection || {};
  const maxUtil = tables.reduce((m, t) => Math.max(m, t.utilization || t.usage || 0), 0);

  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-white ring-1 ring-[#EDE1CF] shadow-sm p-5 space-y-3">
        <p className="text-xs text-[#A9805F] uppercase tracking-wide font-medium">Table Utilization</p>
        {tables.map((t, i) => (
          <Bar key={i} value={t.utilization || t.usage || 0} max={maxUtil} label={t.name || t.tableName || t.tableNumber ? `Table ${t.tableNumber}` : `Table ${i + 1}`} color="bg-teal-500" />
        ))}
        {tables.length === 0 && <p className="text-center py-6 text-[#9C8268] text-sm">No table data</p>}
      </div>
      <div className="rounded-2xl bg-white ring-1 ring-[#EDE1CF] shadow-sm p-5">
        <p className="text-xs text-[#A9805F] uppercase tracking-wide font-medium mb-3">By Section</p>
        <Table
          columns={[
            { key: "section", label: "Section" },
            { key: "count", label: "Tables", align: "right" },
            { key: "utilization", label: "Utilization", align: "right", render: (r) => formatPct(r.utilization) },
          ]}
          rows={Object.entries(bySection).map(([sec, val]) => ({
            section: sec,
            count: typeof val === "object" ? (val.count || val.tables || 0) : val,
            utilization: typeof val === "object" ? (val.utilization || val.usage || 0) : 0,
          }))}
          emptyText="No section data"
        />
      </div>
    </div>
  );
}

function PaymentReport({ period }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetchPaymentReport({ period }).then((d) => { if (alive) setData(d); }).catch(() => {}).finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [period]);

  if (loading) return <div className="text-center py-10 text-[#9C8268] text-sm">Loading payment report...</div>;
  if (!data) return <div className="text-center py-10 text-[#9C8268] text-sm">No data available</div>;

  const byMethod = data.byMethod || {};
  const methodEntries = Object.entries(byMethod);
  const maxMethod = methodEntries.reduce((m, [, v]) => Math.max(m, typeof v === "object" ? (v.count || v.total || 0) : v), 0);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <SummaryCard label="Total" value={formatCurrency(data.total)} />
        <SummaryCard label="Success Rate" value={formatPct(data.successRate)} />
      </div>
      <div className="rounded-2xl bg-white ring-1 ring-[#EDE1CF] shadow-sm p-5 space-y-3">
        <p className="text-xs text-[#A9805F] uppercase tracking-wide font-medium">By Payment Method</p>
        {methodEntries.map(([method, val]) => {
          const count = typeof val === "object" ? (val.count || val.total || val.amount || 0) : val;
          return <Bar key={method} value={count} max={maxMethod} label={method} color="bg-sky-500" />;
        })}
        {methodEntries.length === 0 && <p className="text-center py-6 text-[#9C8268] text-sm">No payment method data</p>}
      </div>
      <div className="rounded-2xl bg-white ring-1 ring-[#EDE1CF] shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-[#EDE1CF]">
          <p className="text-xs text-[#A9805F] uppercase tracking-wide font-medium">Payment Methods Breakdown</p>
        </div>
        <Table
          columns={[
            { key: "method", label: "Method" },
            { key: "count", label: "Transactions", align: "right" },
            { key: "amount", label: "Amount", align: "right", render: (r) => formatCurrency(r.amount || r.total || 0) },
          ]}
          rows={methodEntries.map(([method, val]) => ({
            method,
            count: typeof val === "object" ? (val.count || val.transactions || 0) : val,
            amount: typeof val === "object" ? (val.amount || val.total || 0) : 0,
          }))}
          emptyText="No payment data"
        />
      </div>
    </div>
  );
}

const REPORT_COMPONENTS = {
  sales: SalesReport,
  orders: OrdersReport,
  products: ProductsReport,
  inventory: InventoryReport,
  customers: CustomerReport,
  waiters: WaiterReport,
  tables: TableReport,
  payments: PaymentReport,
};

export default function AdvancedReportsPage({ permissions = { _can: () => false } }) {
  const [activeTab, setActiveTab] = useState("sales");
  const [period, setPeriod] = useState("monthly");

  const ActiveComponent = REPORT_COMPONENTS[activeTab] || SalesReport;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-xl text-[#3B2515]">Advanced Reports</h2>
          <p className="text-xs text-[#A9805F] mt-0.5">Comprehensive analytics and reporting</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex overflow-x-auto rounded-2xl bg-white ring-1 ring-[#EDE1CF] shadow-sm">
          {REPORTS.map((r) => (
            <button key={r.key} onClick={() => setActiveTab(r.key)}
              className={`px-4 py-2.5 text-xs font-medium transition-colors whitespace-nowrap ${
                activeTab === r.key
                  ? "bg-[#3B2515] text-[#FFF8F0]"
                  : "text-[#9C8268] hover:text-[#3B2515] hover:bg-[#FBF6EF]"
              } ${REPORTS.indexOf(r) === 0 ? "rounded-l-2xl" : ""} ${REPORTS.indexOf(r) === REPORTS.length - 1 ? "rounded-r-2xl" : ""}`}>
              {r.label}
            </button>
          ))}
        </div>
        <select value={period} onChange={(e) => setPeriod(e.target.value)}
          className="rounded-full bg-white border border-[#EDE1CF] px-4 py-2 text-xs text-[#3B2515] outline-none focus:ring-2 focus:ring-[#B07B4F]/40">
          {PERIODS.map((p) => (
            <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
          ))}
        </select>
      </div>

      <ActiveComponent period={period} />
    </div>
  );
}
