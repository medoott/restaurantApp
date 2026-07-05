import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar,
  Printer,
  FileText,
  FileSpreadsheet,
  TrendingUp,
  TrendingDown,
  Lightbulb,
  AlertCircle,
  X,
  ChevronDown,
  DollarSign,
  ShoppingCart,
  Users,
  Clock,
  CheckCircle2,
  Star,
  Coffee,
} from "lucide-react";
import { getFilterOptions } from "../../../utils/analyticsMockData.js";
import { COLORS, StatCard } from "./AnalyticsCharts.jsx";
import { useDarkMode } from "../../../hooks/useDarkMode.js";

function LoadingSkeletonCard({ className = "" }) {
  return (
    <div className={`rounded-2xl bg-white/60 ring-1 ring-[#EDE1CF] shadow-sm p-5 animate-pulse ${className}`}>
      <div className="h-3 w-20 bg-[#EDE1CF] rounded mb-3" />
      <div className="h-8 w-32 bg-[#EDE1CF] rounded mb-2" />
      <div className="h-3 w-24 bg-[#EDE1CF] rounded" />
    </div>
  );
}

function LoadingSkeletonChart({ className = "" }) {
  return (
    <div className={`rounded-2xl bg-white/60 ring-1 ring-[#EDE1CF] shadow-sm p-5 animate-pulse ${className}`}>
      <div className="h-4 w-40 bg-[#EDE1CF] rounded mb-4" />
      <div className="h-48 bg-[#F3E5D3] rounded-lg" />
    </div>
  );
}

export function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <LoadingSkeletonCard key={i} />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <LoadingSkeletonChart />
        <LoadingSkeletonChart />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <LoadingSkeletonChart />
        <LoadingSkeletonChart />
        <LoadingSkeletonChart />
      </div>
    </div>
  );
}

export function EmptyState({ title = "No data available", message = "Try adjusting your filters or date range." }) {
  const isDark = useDarkMode();
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`rounded-2xl ${isDark ? "bg-gray-800/50 ring-gray-700" : "bg-white/50 ring-[#EDE1CF]"} ring-1 shadow-sm p-12 text-center`}
    >
      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#F3E5D3] flex items-center justify-center">
        <AlertCircle size={28} className="text-[#A9805F]" />
      </div>
      <h3 className={`font-serif text-lg ${isDark ? "text-gray-200" : "text-[#3B2515]"}`}>
        {title}
      </h3>
      <p className={`text-sm mt-1 ${isDark ? "text-gray-400" : "text-[#9C8268]"}`}>
        {message}
      </p>
    </motion.div>
  );
}

export function FilterBar({ period, onPeriodChange, onCustomRange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const isDark = useDarkMode();
  const options = getFilterOptions();
  const current = options.find((o) => o.value === period);

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative" ref={ref}>
        <button
          onClick={() => setOpen(!open)}
          className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
            isDark
              ? "bg-gray-800 text-gray-200 ring-1 ring-gray-700 hover:bg-gray-700"
              : "bg-white text-[#3B2515] ring-1 ring-[#EDE1CF] hover:bg-[#FBF6EF]"
          }`}
        >
          <Calendar size={14} />
          {current?.label || "Select Period"}
          <ChevronDown size={14} className={`transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className={`absolute z-50 mt-2 w-48 rounded-xl shadow-lg ring-1 overflow-hidden ${
                isDark ? "bg-gray-800 ring-gray-700" : "bg-white ring-[#EDE1CF]"
              }`}
            >
              {options.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => {
                    onPeriodChange(opt.value);
                    setOpen(false);
                  }}
                  className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                    period === opt.value
                      ? isDark
                        ? "bg-gray-700 text-gray-100"
                        : "bg-[#FBF6EF] text-[#3B2515] font-medium"
                      : isDark
                        ? "text-gray-300 hover:bg-gray-700"
                        : "text-[#5C4033] hover:bg-[#FBF6EF]"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      {period === "custom" && onCustomRange && (
        <div className="flex items-center gap-2">
          <input
            type="date"
            onChange={(e) => onCustomRange("start", e.target.value)}
            className={`rounded-lg px-3 py-2 text-sm ring-1 ${
              isDark
                ? "bg-gray-800 text-gray-200 ring-gray-700"
                : "bg-white text-[#3B2515] ring-[#EDE1CF]"
            }`}
          />
          <span className={`text-xs ${isDark ? "text-gray-400" : "text-[#9C8268]"}`}>to</span>
          <input
            type="date"
            onChange={(e) => onCustomRange("end", e.target.value)}
            className={`rounded-lg px-3 py-2 text-sm ring-1 ${
              isDark
                ? "bg-gray-800 text-gray-200 ring-gray-700"
                : "bg-white text-[#3B2515] ring-[#EDE1CF]"
            }`}
          />
        </div>
      )}
    </div>
  );
}

import { useSettings } from "../../../context/useSettings.js";

export function ExportBar() {
  const isDark = useDarkMode();
  const settings = useSettings()?.settings;

  const reportsSettings = settings?.reports || {};
  const pdfEnabled = reportsSettings.pdf !== false;
  const excelEnabled = reportsSettings.excel !== false;
  const csvEnabled = !!reportsSettings.csv;

  const btnClass = `flex items-center gap-2 rounded-full px-4 py-2 text-xs font-medium transition-colors ${
    isDark
      ? "bg-gray-800 text-gray-200 ring-1 ring-gray-700 hover:bg-gray-700"
      : "bg-white text-[#3B2515] ring-1 ring-[#EDE1CF] hover:bg-[#FBF6EF]"
  }`;

  const handleExport = (type) => {
    if (type === "print") {
      window.print();
    } else {
      alert(`Exporting as ${type.toUpperCase()}...`);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className={`text-[10px] uppercase tracking-[0.2em] ${isDark ? "text-gray-400" : "text-[#A9805F]"}`}>
        Export
      </span>
      {pdfEnabled && (
        <button className={btnClass} onClick={() => handleExport("pdf")}>
          <FileText size={14} />
          PDF
        </button>
      )}
      {excelEnabled && (
        <button className={btnClass} onClick={() => handleExport("excel")}>
          <FileSpreadsheet size={14} />
          Excel
        </button>
      )}
      {csvEnabled && (
        <button className={btnClass} onClick={() => handleExport("csv")}>
          <FileText size={14} />
          CSV
        </button>
      )}
      <button className={btnClass} onClick={() => handleExport("print")}>
        <Printer size={14} />
        Print
      </button>
    </div>
  );
}

export function SummaryKPICards({ summary }) {
  const items = [
    {
      label: "Total Revenue",
      value: `$${summary?.totalRevenue?.toLocaleString() || "0"}`,
      trend: summary?.revenueChange,
      icon: DollarSign,
      color: COLORS.primary,
      subtitle: `Today: $${summary?.todayRevenue?.toLocaleString() || "0"}`,
    },
    {
      label: "Total Orders",
      value: summary?.totalOrders?.toLocaleString() || "0",
      trend: summary?.ordersChange,
      icon: ShoppingCart,
      color: COLORS.accent1,
      subtitle: `Today: ${summary?.todayOrders || "0"}`,
    },
    {
      label: "Avg Order Value",
      value: `$${summary?.avgOrderValue || "0"}`,
      icon: TrendingUp,
      color: COLORS.emerald,
      subtitle: `Top: ${summary?.topProduct || "N/A"}`,
    },
    {
      label: "Total Customers",
      value: summary?.totalCustomers?.toLocaleString() || "0",
      trend: summary?.customersChange,
      icon: Users,
      color: COLORS.blue,
      subtitle: `Avg prep: ${summary?.avgPrepTime || "0"} min`,
    },
    {
      label: "Completion Rate",
      value: `${((summary?.completionRate || 0) * 100).toFixed(0)}%`,
      icon: CheckCircle2,
      color: COLORS.emerald,
      subtitle: `${summary?.activeTables || "0"} active tables`,
    },
    {
      label: "Satisfaction",
      value: `★ ${summary?.satisfaction || "0"}`,
      icon: Star,
      color: COLORS.amber,
      subtitle: "Customer rating",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      {items.map((item) => (
        <StatCard key={item.label} {...item} />
      ))}
    </div>
  );
}

export function SmartInsights({ data }) {
  const [dismissed, setDismissed] = useState(new Set());
  const isDark = useDarkMode();

  const insights = [
    data.peakHourLabels?.length > 0 && {
      type: "peak",
      icon: Clock,
      color: COLORS.amber,
      title: "Peak Hours Identified",
      message: `Your busiest hours are ${data.peakHourLabels.slice(0, 3).join(", ")}. Consider adding extra staff during these times.`,
    },
    data.summary?.revenueChange > 5 && {
      type: "growth",
      icon: TrendingUp,
      color: COLORS.emerald,
      title: "Revenue Growth",
      message: `Revenue is up ${data.summary.revenueChange.toFixed(1)}% compared to the previous period. Great momentum!`,
    },
    data.summary?.revenueChange < -5 && {
      type: "decline",
      icon: TrendingDown,
      color: COLORS.rose,
      title: "Revenue Alert",
      message: `Revenue dropped ${Math.abs(data.summary.revenueChange).toFixed(1)}%. Consider reviewing your pricing or promotions.`,
    },
    data.topProducts?.[0] && {
      type: "top",
      icon: Coffee,
      color: COLORS.primary,
      title: "Top Performer",
      message: `"${data.topProducts[0].name}" is your best-selling item with ${data.topProducts[0].quantity} units sold.`,
    },
    data.operational?.avgPrepTime > 12 && {
      type: "ops",
      icon: Clock,
      color: COLORS.rose,
      title: "Prep Time Warning",
      message: `Average preparation time is ${data.operational.avgPrepTime} min. Aim for under 10 minutes for better efficiency.`,
    },
    data.customers?.newCustomers > data.customers?.returningCustomers && {
      type: "acquisition",
      icon: Users,
      color: COLORS.blue,
      title: "New Customer Surge",
      message: "New customers outnumber returning ones. Focus on loyalty programs to retain them.",
    },
    data.categories?.[0] && {
      type: "category",
      icon: TrendingUp,
      color: COLORS.purple,
      title: "Category Spotlight",
      message: `"${data.categories[0].name}" leads in revenue. Consider expanding this category.`,
    },
  ].filter(Boolean);

  const visible = insights.filter((i) => !dismissed.has(i.type));

  if (!visible.length) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Lightbulb size={16} className="text-[#B07B4F]" />
        <h3 className={`font-serif text-lg ${isDark ? "text-gray-100" : "text-[#3B2515]"}`}>
          Smart Insights
        </h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {visible.map((insight) => (
          <motion.div
            key={insight.type}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className={`rounded-xl p-4 flex gap-3 ring-1 ${
              isDark
                ? "bg-gray-800/80 ring-gray-700"
                : "bg-white ring-[#EDE1CF]"
            } shadow-sm`}
          >
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
              style={{ backgroundColor: `${insight.color}18` }}
            >
              <insight.icon size={18} color={insight.color} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <h4 className={`text-sm font-semibold ${isDark ? "text-gray-200" : "text-[#3B2515]"}`}>
                  {insight.title}
                </h4>
                <button
                  onClick={() => setDismissed((prev) => new Set([...prev, insight.type]))}
                  className={`p-0.5 rounded hover:${isDark ? "bg-gray-700" : "bg-[#F3E5D3]"}`}
                >
                  <X size={14} className={isDark ? "text-gray-400" : "text-[#9C8268]"} />
                </button>
              </div>
              <p className={`text-xs mt-1 leading-relaxed ${isDark ? "text-gray-400" : "text-[#5C4033]"}`}>
                {insight.message}
              </p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
