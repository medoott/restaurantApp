import { useState, useEffect } from "react";
import MetricBox from "../ui/MetricBox.jsx";
import { API_BASE } from "../../utils/constants.js";

export default function AdvancedMetricsGrid({
  role,
  orders,
  products,
  _revenue,
  totalOrders,
}) {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    const fetchMetrics = async () => {
      try {
        const res = await fetch(`${API_BASE}/analytics/metrics`);
        if (!res.ok) throw new Error("Failed to fetch metrics");
        const data = await res.json();
        if (alive) setMetrics(data.metrics);
      } catch (err) {
        console.error("Metrics fetch error:", err);
      } finally {
        if (alive) setLoading(false);
      }
    };

    fetchMetrics();

    return () => {
      alive = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <h2 className="font-serif text-lg text-[#3B2515] px-1">Loading metrics...</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl bg-white/60 ring-1 ring-[#EDE1CF] p-5 animate-pulse">
              <div className="h-3 w-20 bg-[#EDE1CF] rounded mb-3" />
              <div className="h-8 w-32 bg-[#EDE1CF] rounded mb-2" />
              <div className="h-3 w-24 bg-[#EDE1CF] rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!metrics) return null;

  const getRoleMetrics = () => {
    const baseMetrics = {
      todayOrders: metrics.today.orders,
      todayRevenue: metrics.today.revenue,
      monthOrders: metrics.thisMonth.orders,
      monthRevenue: metrics.thisMonth.revenue,
    };

    if (role === "Admin" || role === "General Manager") {
      return {
        ...baseMetrics,
        title: "Business Metrics",
        show: ["today", "month", "performance"],
      };
    }
    if (role === "Branch Manager") {
      return {
        ...baseMetrics,
        title: "Branch Performance",
        show: ["today", "month", "inventory"],
      };
    }
    if (role === "Cashier") {
      return {
        ...baseMetrics,
        title: "Today's Transactions",
        show: ["today"],
      };
    }
    if (role === "Cook") {
      return {
        todayOrders: metrics.today.orders,
        title: "Kitchen Overview",
        show: ["today", "performance"],
      };
    }

    return baseMetrics;
  };

  const roleMetrics = getRoleMetrics();

  return (
    <div className="space-y-4">
      <h2 className="font-serif text-lg text-[#3B2515] px-1">
        {roleMetrics.title}
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {roleMetrics.show.includes("today") && (
          <MetricBox
            title="Today's Sales"
            value={`${metrics.today.orders} orders`}
            subtitle={`$${metrics.today.revenue}`}
            icon="📅"
            color="bg-blue-50"
          />
        )}
        {roleMetrics.show.includes("month") && (
          <MetricBox
            title="This Month"
            value={`${metrics.thisMonth.orders} orders`}
            subtitle={`$${metrics.thisMonth.revenue}`}
            icon="📊"
            color="bg-emerald-50"
          />
        )}
        {roleMetrics.show.includes("performance") && (
          <MetricBox
            title="Completion Rate"
            value={
              totalOrders > 0
                ? (
                    (orders.filter((o) => o.status === "Delivered").length /
                      totalOrders) *
                    100
                  ).toFixed(1) + "%"
                : "0%"
            }
            subtitle={`${orders.filter((o) => o.status === "Delivered").length} delivered`}
            icon="✅"
            color="bg-amber-50"
          />
        )}
        {roleMetrics.show.includes("inventory") && (
          <MetricBox
            title="Inventory"
            value={`${products.length} items`}
            subtitle={`${metrics.inventory.categories} categories`}
            icon="📦"
            color="bg-purple-50"
          />
        )}
      </div>
    </div>
  );
}
