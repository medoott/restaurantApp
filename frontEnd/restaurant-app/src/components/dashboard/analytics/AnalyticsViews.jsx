

import { motion } from "framer-motion";
import {
  Award,
  Star,
} from "lucide-react";
import {
  LineChartCard,
  BarChartCard,
  PieChartCard,
  AreaChartCard,
  COLORS,
} from "./AnalyticsCharts.jsx";
import { useDarkMode } from "../../../hooks/useDarkMode.js";

const fmtCurrency = (v) =>
  v != null ? `$${Number(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "$0";

const fmtNumber = (v) =>
  v != null ? Number(v).toLocaleString() : "0";

export function DailyAnalytics({ data }) {
  const isDark = useDarkMode();

  const hourlyRevenue = data.hourly || [];
  const hourlyOrders = data.hourly || [];
  const today = data.today || {};
  const yesterday = data.yesterday || {};

  const comparisonItems = [
    { label: "Revenue", current: today.revenue, previous: yesterday.revenue, fmt: fmtCurrency },
    { label: "Orders", current: today.orders, previous: yesterday.orders, fmt: fmtNumber },
    { label: "Customers", current: today.customers, previous: yesterday.customers, fmt: fmtNumber },
  ];

  const topProductsToday = (data.topProducts || []).slice(0, 5);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {comparisonItems.map((item) => {
          const change = item.previous
            ? (((item.current - item.previous) / item.previous) * 100).toFixed(1)
            : 0;
          const isUp = change >= 0;
          return (
            <div
              key={item.label}
              className={`rounded-2xl ${isDark ? "bg-gray-800 ring-gray-700" : "bg-white ring-[#EDE1CF]"} ring-1 shadow-sm p-5`}
            >
              <p className={`text-[10px] uppercase tracking-[0.2em] ${isDark ? "text-gray-400" : "text-[#A9805F]"}`}>
                {item.label}
              </p>
              <p className={`font-serif text-2xl mt-1 ${isDark ? "text-gray-100" : "text-[#3B2515]"}`}>
                {item.fmt(item.current)}
              </p>
              <div className="flex items-center gap-1.5 mt-2">
                <span className={`text-xs font-medium ${isUp ? "text-emerald-600" : "text-rose-500"}`}>
                  {isUp ? "▲" : "▼"} {Math.abs(change)}%
                </span>
                <span className={`text-xs ${isDark ? "text-gray-400" : "text-[#9C8268]"}`}>vs yesterday</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <BarChartCard
          title="Revenue by Hour"
          subtitle="Today's revenue distribution across operating hours"
          data={hourlyRevenue}
          xKey="hour"
          bars={[{ dataKey: "revenue", name: "Revenue", color: COLORS.primary }]}
          formatter={(v) => fmtCurrency(v)}
        />
        <BarChartCard
          title="Orders by Hour"
          subtitle="Number of orders placed each hour today"
          data={hourlyOrders}
          xKey="hour"
          bars={[{ dataKey: "orders", name: "Orders", color: COLORS.accent1 }]}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className={`rounded-2xl ${isDark ? "bg-gray-800 ring-gray-700" : "bg-white ring-[#EDE1CF]"} ring-1 shadow-sm p-5`}>
          <h3 className={`font-serif text-lg mb-4 ${isDark ? "text-gray-100" : "text-[#3B2515]"}`}>
            Top Products Today
          </h3>
          <div className="space-y-3">
            {topProductsToday.map((product, idx) => (
              <div key={product.name} className="flex items-center gap-3">
                <span className={`w-6 text-xs font-bold ${isDark ? "text-gray-400" : "text-[#A9805F]"}`}>
                  #{idx + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate ${isDark ? "text-gray-200" : "text-[#3B2515]"}`}>
                    {product.name}
                  </p>
                  <p className={`text-xs ${isDark ? "text-gray-400" : "text-[#9C8268]"}`}>
                    {product.category} · {product.quantity} sold
                  </p>
                </div>
                <p className={`text-sm font-semibold ${isDark ? "text-gray-200" : "text-[#3B2515]"}`}>
                  {fmtCurrency(product.revenue)}
                </p>
              </div>
            ))}
          </div>
        </div>

        <PieChartCard
          title="Payment Methods"
          subtitle="Today's payment distribution"
          data={data.paymentMethods?.map((p) => ({
            name: p.method,
            value: p.revenue,
          })) || []}
          dataKey="value"
          donut
          formatter={(v) => fmtCurrency(v)}
        />
      </div>
    </motion.div>
  );
}

export function WeeklyAnalytics({ data }) {
  const isDark = useDarkMode();

  const weekDays = data.thisWeek || [];
  const lastWeek = data.lastWeek || [];

  const currentTotal = weekDays.reduce((s, d) => s + d.revenue, 0);
  const lastTotal = lastWeek.reduce((s, d) => s + d.revenue, 0);
  const weekOverWeek = {
    current: currentTotal,
    previous: lastTotal,
    change: lastTotal ? ((currentTotal - lastTotal) / lastTotal) * 100 : 0,
  };

  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const dayMetrics = days.map((day) => {
    const entries = weekDays.filter((d) => d.dayName === day);
    const avgRev = entries.length
      ? entries.reduce((s, e) => s + e.revenue, 0) / entries.length
      : 0;
    return { day, avgRevenue: avgRev };
  });

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className={`rounded-2xl ${isDark ? "bg-gray-800 ring-gray-700" : "bg-white ring-[#EDE1CF]"} ring-1 shadow-sm p-5`}>
        <div className="flex items-center justify-between mb-1">
          <p className={`text-[10px] uppercase tracking-[0.2em] ${isDark ? "text-gray-400" : "text-[#A9805F]"}`}>
            Week over Week
          </p>
          <span className={`text-xs font-medium ${weekOverWeek.change >= 0 ? "text-emerald-600" : "text-rose-500"}`}>
            {weekOverWeek.change >= 0 ? "▲" : "▼"} {Math.abs(weekOverWeek.change).toFixed(1)}%
          </span>
        </div>
        <p className={`font-serif text-2xl ${isDark ? "text-gray-100" : "text-[#3B2515]"}`}>
          {fmtCurrency(weekOverWeek.current)}
        </p>
        <p className={`text-xs mt-1 ${isDark ? "text-gray-400" : "text-[#9C8268]"}`}>
          vs {fmtCurrency(weekOverWeek.previous)} last week
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <BarChartCard
          title="Daily Revenue"
          subtitle="Revenue breakdown by day of week"
          data={dayMetrics}
          xKey="day"
          bars={[{ dataKey: "avgRevenue", name: "Avg Revenue", color: COLORS.primary }]}
          formatter={(v) => fmtCurrency(v)}
        />
        <LineChartCard
          title="Orders Trend"
          subtitle="Daily order count this week"
          data={weekDays}
          xKey="dayName"
          lines={[{ dataKey: "orders", name: "Orders", color: COLORS.accent1 }]}
        />
      </div>

      <PieChartCard
        title="Category Mix"
        subtitle="Revenue by category this week"
        data={data.categories?.map((c) => ({ name: c.name, value: c.revenue })) || []}
        dataKey="value"
        donut
        formatter={(v) => fmtCurrency(v)}
      />
    </motion.div>
  );
}

export function MonthlyAnalytics({ data }) {
  const daily = data.daily || [];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AreaChartCard
          title="Daily Revenue Trend"
          subtitle="Revenue per day over the selected month"
          data={daily}
          xKey="dayName"
          areas={[{ dataKey: "revenue", name: "Revenue", color: COLORS.primary }]}
          formatter={(v) => fmtCurrency(v)}
        />
        <LineChartCard
          title="Daily Orders"
          subtitle="Orders per day"
          data={daily}
          xKey="dayName"
          lines={[{ dataKey: "orders", name: "Orders", color: COLORS.accent1 }]}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PieChartCard
          title="Revenue by Category"
          subtitle="Category contribution this month"
          data={data.categories?.map((c) => ({ name: c.name, value: c.revenue })) || []}
          dataKey="value"
          donut
          formatter={(v) => fmtCurrency(v)}
        />
        <PieChartCard
          title="Payment Methods"
          subtitle="Transaction volume by method"
          data={data.paymentMethods?.map((p) => ({
            name: p.method,
            value: p.transactions,
          })) || []}
          dataKey="value"
          formatter={(v) => fmtNumber(v)}
        />
      </div>
    </motion.div>
  );
}

export function YearlyAnalytics({ data }) {
  const yearly = data.yearly || [];
  const monthly = data.monthly || [];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {yearly.map((year) => (
          <div
            key={year.year}
            className="rounded-2xl bg-white ring-1 ring-[#EDE1CF] shadow-sm p-5"
          >
            <p className="text-[10px] uppercase tracking-[0.2em] text-[#A9805F]">
              {year.year}
            </p>
            <p className="font-serif text-2xl text-[#3B2515] mt-1">
              {fmtCurrency(year.revenue)}
            </p>
            <div className="flex items-center gap-3 mt-2 text-xs text-[#9C8268]">
              <span>{fmtNumber(year.orders)} orders</span>
              <span>·</span>
              <span>{fmtNumber(year.customers)} customers</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <BarChartCard
          title="Monthly Revenue"
          subtitle="Revenue trend across months"
          data={monthly}
          xKey="month"
          bars={[{ dataKey: "revenue", name: "Revenue", color: COLORS.primary }]}
          formatter={(v) => fmtCurrency(v)}
        />
        <LineChartCard
          title="Monthly Orders"
          subtitle="Order volume trend"
          data={monthly}
          xKey="month"
          lines={[{ dataKey: "orders", name: "Orders", color: COLORS.accent1 }]}
        />
      </div>

      <PieChartCard
        title="Annual Category Breakdown"
        subtitle="Full year category revenue share"
        data={data.categories?.map((c) => ({ name: c.name, value: c.revenue })) || []}
        dataKey="value"
        donut
        formatter={(v) => fmtCurrency(v)}
      />
    </motion.div>
  );
}

export function CustomerAnalytics({ data }) {
  const isDark = useDarkMode();
  const customers = data.customers || {};
  const acquisitionTrend = customers.acquisitionTrend || [];

  const newVsReturning = [
    { name: "New", value: customers.newCustomers || 0 },
    { name: "Returning", value: customers.returningCustomers || 0 },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className={`rounded-2xl ${isDark ? "bg-gray-800 ring-gray-700" : "bg-white ring-[#EDE1CF]"} ring-1 shadow-sm p-5`}>
          <p className={`text-[10px] uppercase tracking-[0.2em] ${isDark ? "text-gray-400" : "text-[#A9805F]"}`}>
            Total Customers
          </p>
          <p className={`font-serif text-2xl mt-1 ${isDark ? "text-gray-100" : "text-[#3B2515]"}`}>
            {fmtNumber(customers.totalCustomers)}
          </p>
        </div>
        <div className={`rounded-2xl ${isDark ? "bg-gray-800 ring-gray-700" : "bg-white ring-[#EDE1CF]"} ring-1 shadow-sm p-5`}>
          <p className={`text-[10px] uppercase tracking-[0.2em] ${isDark ? "text-gray-400" : "text-[#A9805F]"}`}>
            Avg Visits
          </p>
          <p className={`font-serif text-2xl mt-1 ${isDark ? "text-gray-100" : "text-[#3B2515]"}`}>
            {customers.avgVisitsPerCustomer?.toFixed(1) || "0"}
          </p>
        </div>
        <div className={`rounded-2xl ${isDark ? "bg-gray-800 ring-gray-700" : "bg-white ring-[#EDE1CF]"} ring-1 shadow-sm p-5`}>
          <p className={`text-[10px] uppercase tracking-[0.2em] ${isDark ? "text-gray-400" : "text-[#A9805F]"}`}>
            Satisfaction
          </p>
          <p className={`font-serif text-2xl mt-1 ${isDark ? "text-gray-100" : "text-[#3B2515]"}`}>
            ★ {customers.satisfaction?.toFixed(1) || "0"}
          </p>
        </div>
        <div className={`rounded-2xl ${isDark ? "bg-gray-800 ring-gray-700" : "bg-white ring-[#EDE1CF]"} ring-1 shadow-sm p-5`}>
          <p className={`text-[10px] uppercase tracking-[0.2em] ${isDark ? "text-gray-400" : "text-[#A9805F]"}`}>
            New Customers
          </p>
          <p className={`font-serif text-2xl mt-1 ${isDark ? "text-gray-100" : "text-[#3B2515]"}`}>
            {fmtNumber(customers.newCustomers)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PieChartCard
          title="New vs Returning"
          subtitle="Customer acquisition mix"
          data={newVsReturning}
          dataKey="value"
          donut
        />
        <LineChartCard
          title="Acquisition Trend"
          subtitle="New vs returning customers over time"
          data={acquisitionTrend}
          xKey="month"
          lines={[
            { dataKey: "newCustomers", name: "New", color: COLORS.blue },
            { dataKey: "returningCustomers", name: "Returning", color: COLORS.primary },
          ]}
        />
      </div>

      <div className={`rounded-2xl ${isDark ? "bg-gray-800 ring-gray-700" : "bg-white ring-[#EDE1CF]"} ring-1 shadow-sm p-5`}>
        <h3 className={`font-serif text-lg mb-4 ${isDark ? "text-gray-100" : "text-[#3B2515]"}`}>
          Top Customers
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className={`text-left text-[10px] uppercase tracking-[0.2em] ${isDark ? "text-gray-400" : "text-[#A9805F]"}`}>
                <th className="pb-3 pr-4">#</th>
                <th className="pb-3 pr-4">Name</th>
                <th className="pb-3 pr-4">Visits</th>
                <th className="pb-3 pr-4">Total Spent</th>
                <th className="pb-3 pr-4">Avg Order</th>
                <th className="pb-3">Last Visit</th>
              </tr>
            </thead>
            <tbody>
              {(customers.topCustomers || []).map((c, idx) => (
                <tr
                  key={c.name}
                  className={`border-t ${isDark ? "border-gray-700" : "border-[#EDE1CF]"}`}
                >
                  <td className={`py-3 pr-4 text-xs ${isDark ? "text-gray-400" : "text-[#A9805F]"}`}>
                    #{idx + 1}
                  </td>
                  <td className={`py-3 pr-4 font-medium ${isDark ? "text-gray-200" : "text-[#3B2515]"}`}>
                    {c.name}
                  </td>
                  <td className={`py-3 pr-4 ${isDark ? "text-gray-300" : "text-[#5C4033]"}`}>
                    {c.visits}
                  </td>
                  <td className={`py-3 pr-4 font-medium ${isDark ? "text-gray-200" : "text-[#3B2515]"}`}>
                    {fmtCurrency(c.totalSpent)}
                  </td>
                  <td className={`py-3 pr-4 ${isDark ? "text-gray-300" : "text-[#5C4033]"}`}>
                    {fmtCurrency(c.avgOrderValue)}
                  </td>
                  <td className={`py-3 ${isDark ? "text-gray-400" : "text-[#9C8268]"}`}>
                    {c.lastVisit}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
}

export function ProductAnalytics({ data }) {
  const isDark = useDarkMode();
  const topProducts = (data.topProducts || []).slice(0, 8);
  const bottomProducts = data.bottomProducts || [];

  const categoryData = data.categories?.map((c) => ({
    name: c.name,
    value: c.revenue,
  })) || [];

  const topForChart = topProducts.map((p) => ({
    name: p.name.length > 12 ? p.name.slice(0, 12) + "..." : p.name,
    revenue: p.revenue,
    quantity: p.quantity,
  }));

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <BarChartCard
          title="Top Selling Products"
          subtitle="Revenue by product"
          data={topForChart}
          xKey="name"
          bars={[{ dataKey: "revenue", name: "Revenue", color: COLORS.primary }]}
          formatter={(v) => fmtCurrency(v)}
        />
        <PieChartCard
          title="Category Performance"
          subtitle="Revenue share by category"
          data={categoryData}
          dataKey="value"
          donut
          formatter={(v) => fmtCurrency(v)}
        />
      </div>

      <div className={`rounded-2xl ${isDark ? "bg-gray-800 ring-gray-700" : "bg-white ring-[#EDE1CF]"} ring-1 shadow-sm p-5`}>
        <h3 className={`font-serif text-lg mb-4 ${isDark ? "text-gray-100" : "text-[#3B2515]"}`}>
          Product Performance
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className={`text-left text-[10px] uppercase tracking-[0.2em] ${isDark ? "text-gray-400" : "text-[#A9805F]"}`}>
                <th className="pb-3 pr-4">Product</th>
                <th className="pb-3 pr-4">Category</th>
                <th className="pb-3 pr-4">Price</th>
                <th className="pb-3 pr-4">Sold</th>
                <th className="pb-3 pr-4">Revenue</th>
                <th className="pb-3">Rating</th>
              </tr>
            </thead>
            <tbody>
              {topProducts.map((product, idx) => (
                <tr
                  key={product.name}
                  className={`border-t ${isDark ? "border-gray-700" : "border-[#EDE1CF]"}`}
                >
                  <td className={`py-3 pr-4 font-medium ${isDark ? "text-gray-200" : "text-[#3B2515]"}`}>
                    <span className="flex items-center gap-2">
                      {idx === 0 && <Award size={14} className="text-amber-500" />}
                      {product.name}
                    </span>
                  </td>
                  <td className={`py-3 pr-4 ${isDark ? "text-gray-400" : "text-[#9C8268]"}`}>
                    {product.category}
                  </td>
                  <td className={`py-3 pr-4 ${isDark ? "text-gray-300" : "text-[#5C4033]"}`}>
                    {fmtCurrency(product.price)}
                  </td>
                  <td className={`py-3 pr-4 ${isDark ? "text-gray-300" : "text-[#5C4033]"}`}>
                    {fmtNumber(product.quantity)}
                  </td>
                  <td className={`py-3 pr-4 font-medium ${isDark ? "text-gray-200" : "text-[#3B2515]"}`}>
                    {fmtCurrency(product.revenue)}
                  </td>
                  <td className="py-3">
                    <span className="flex items-center gap-1 text-amber-500">
                      <Star size={12} fill="currentColor" /> {product.rating?.toFixed(1)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {bottomProducts.length > 0 && (
        <div className={`rounded-2xl ${isDark ? "bg-gray-800 ring-gray-700" : "bg-white ring-[#EDE1CF]"} ring-1 shadow-sm p-5`}>
          <h3 className={`font-serif text-lg mb-2 ${isDark ? "text-gray-100" : "text-[#3B2515]"}`}>
            Needs Attention
          </h3>
          <p className={`text-xs mb-4 ${isDark ? "text-gray-400" : "text-[#9C8268]"}`}>
            Lowest performing products — consider reviewing pricing or recipes
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {bottomProducts.map((product) => (
              <div
                key={product.name}
                className={`rounded-xl ${isDark ? "bg-gray-700/50" : "bg-[#FBF6EF]"} p-3`}
              >
                <p className={`text-xs font-medium truncate ${isDark ? "text-gray-200" : "text-[#3B2515]"}`}>
                  {product.name}
                </p>
                <p className={`text-xs mt-0.5 ${isDark ? "text-gray-400" : "text-[#9C8268]"}`}>
                  {fmtNumber(product.quantity)} sold · {fmtCurrency(product.revenue)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}

export function PaymentAnalytics({ data }) {
  const isDark = useDarkMode();
  const methods = data.paymentMethods || [];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PieChartCard
          title="Payment Method Distribution"
          subtitle="Revenue by payment method"
          data={methods.map((m) => ({ name: m.method, value: m.revenue }))}
          dataKey="value"
          donut
          formatter={(v) => fmtCurrency(v)}
        />
        <PieChartCard
          title="Transaction Volume"
          subtitle="Number of transactions by method"
          data={methods.map((m) => ({ name: m.method, value: m.transactions }))}
          dataKey="value"
          formatter={(v) => fmtNumber(v)}
        />
      </div>

      <div className={`rounded-2xl ${isDark ? "bg-gray-800 ring-gray-700" : "bg-white ring-[#EDE1CF]"} ring-1 shadow-sm p-5`}>
        <h3 className={`font-serif text-lg mb-4 ${isDark ? "text-gray-100" : "text-[#3B2515]"}`}>
          Payment Method Details
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className={`text-left text-[10px] uppercase tracking-[0.2em] ${isDark ? "text-gray-400" : "text-[#A9805F]"}`}>
                <th className="pb-3 pr-4">Method</th>
                <th className="pb-3 pr-4">Revenue</th>
                <th className="pb-3 pr-4">Transactions</th>
                <th className="pb-3 pr-4">Avg Value</th>
                <th className="pb-3">Share</th>
              </tr>
            </thead>
            <tbody>
              {methods.map((m) => {
                const totalRev = methods.reduce((s, x) => s + x.revenue, 0);
                const share = totalRev ? ((m.revenue / totalRev) * 100).toFixed(1) : 0;
                return (
                  <tr
                    key={m.method}
                    className={`border-t ${isDark ? "border-gray-700" : "border-[#EDE1CF]"}`}
                  >
                    <td className={`py-3 pr-4 font-medium ${isDark ? "text-gray-200" : "text-[#3B2515]"}`}>
                      {m.method}
                    </td>
                    <td className={`py-3 pr-4 ${isDark ? "text-gray-200" : "text-[#3B2515]"}`}>
                      {fmtCurrency(m.revenue)}
                    </td>
                    <td className={`py-3 pr-4 ${isDark ? "text-gray-300" : "text-[#5C4033]"}`}>
                      {fmtNumber(m.transactions)}
                    </td>
                    <td className={`py-3 pr-4 ${isDark ? "text-gray-300" : "text-[#5C4033]"}`}>
                      {fmtCurrency(m.avgValue)}
                    </td>
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-2 rounded-full bg-[#EDE1CF] overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${share}%`,
                              backgroundColor: COLORS.primary,
                            }}
                          />
                        </div>
                        <span className={`text-xs ${isDark ? "text-gray-400" : "text-[#9C8268]"}`}>
                          {share}%
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
}

export function OperationalAnalytics({ data }) {
  const isDark = useDarkMode();
  const ops = data.operational || {};
  const hourly = ops.hourlyData || [];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className={`rounded-2xl ${isDark ? "bg-gray-800 ring-gray-700" : "bg-white ring-[#EDE1CF]"} ring-1 shadow-sm p-5`}>
          <p className={`text-[10px] uppercase tracking-[0.2em] ${isDark ? "text-gray-400" : "text-[#A9805F]"}`}>
            Avg Prep Time
          </p>
          <p className={`font-serif text-2xl mt-1 ${isDark ? "text-gray-100" : "text-[#3B2515]"}`}>
            {ops.avgPrepTime?.toFixed(1) || "0"} min
          </p>
        </div>
        <div className={`rounded-2xl ${isDark ? "bg-gray-800 ring-gray-700" : "bg-white ring-[#EDE1CF]"} ring-1 shadow-sm p-5`}>
          <p className={`text-[10px] uppercase tracking-[0.2em] ${isDark ? "text-gray-400" : "text-[#A9805F]"}`}>
            Table Turnover
          </p>
          <p className={`font-serif text-2xl mt-1 ${isDark ? "text-gray-100" : "text-[#3B2515]"}`}>
            {ops.tableTurnoverRate?.toFixed(1) || "0"}x
          </p>
        </div>
        <div className={`rounded-2xl ${isDark ? "bg-gray-800 ring-gray-700" : "bg-white ring-[#EDE1CF]"} ring-1 shadow-sm p-5`}>
          <p className={`text-[10px] uppercase tracking-[0.2em] ${isDark ? "text-gray-400" : "text-[#A9805F]"}`}>
            Tables Occupied
          </p>
          <p className={`font-serif text-2xl mt-1 ${isDark ? "text-gray-100" : "text-[#3B2515]"}`}>
            {ops.avgTablesOccupied || 0} / {ops.totalTables || 20}
          </p>
        </div>
        <div className={`rounded-2xl ${isDark ? "bg-gray-800 ring-gray-700" : "bg-white ring-[#EDE1CF]"} ring-1 shadow-sm p-5`}>
          <p className={`text-[10px] uppercase tracking-[0.2em] ${isDark ? "text-gray-400" : "text-[#A9805F]"}`}>
            Completion Rate
          </p>
          <p className={`font-serif text-2xl mt-1 ${isDark ? "text-gray-100" : "text-[#3B2515]"}`}>
            {(ops.completionRate * 100).toFixed(0)}%
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <BarChartCard
          title="Orders by Hour"
          subtitle="Hourly order volume"
          data={hourly}
          xKey="hour"
          bars={[{ dataKey: "orders", name: "Orders", color: COLORS.secondary }]}
        />
        <LineChartCard
          title="Avg Preparation Time"
          subtitle="Minutes per order by hour"
          data={hourly}
          xKey="hour"
          lines={[{ dataKey: "avgTicket", name: "Avg Ticket", color: COLORS.teal }]}
        />
      </div>

      <div className={`rounded-2xl ${isDark ? "bg-gray-800 ring-gray-700" : "bg-white ring-[#EDE1CF]"} ring-1 shadow-sm p-5`}>
        <h3 className={`font-serif text-lg mb-3 ${isDark ? "text-gray-100" : "text-[#3B2515]"}`}>
          Peak Hours
        </h3>
        <div className="flex flex-wrap gap-2">
          {(ops.peakHours || []).length > 0 ? (
            ops.peakHours.map((hour) => (
              <span
                key={hour}
                className="rounded-full bg-[#B07B4F] text-white px-3 py-1 text-xs font-medium"
              >
                {hour}
              </span>
            ))
          ) : (
            <p className={`text-sm ${isDark ? "text-gray-400" : "text-[#9C8268]"}`}>
              No peak hours identified for this period.
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
}
