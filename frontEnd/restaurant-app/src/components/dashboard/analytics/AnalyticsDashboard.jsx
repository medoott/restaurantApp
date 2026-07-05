import { useState, useEffect, useMemo, useCallback } from "react";
import { useSettings } from "../../../context/useSettings.js";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart3,
  TrendingUp,
  Calendar,
  Award,
  Users,
  Coffee,
  CreditCard,
  Settings2,
  ChevronDown,
} from "lucide-react";
import { API_BASE } from "../../../utils/constants.js";
import { getApiToken } from "../../../services/api.js";
import {
  FilterBar,
  ExportBar,
  SummaryKPICards,
  SmartInsights,
  LoadingSkeleton,
  EmptyState,
} from "./AnalyticsComponents.jsx";
import { useDarkMode } from "../../../hooks/useDarkMode.js";
import {
  DailyAnalytics,
  WeeklyAnalytics,
  MonthlyAnalytics,
  YearlyAnalytics,
  CustomerAnalytics,
  ProductAnalytics,
  PaymentAnalytics,
  OperationalAnalytics,
} from "./AnalyticsViews.jsx";

const TABS = [
  { id: "daily", label: "Daily", icon: BarChart3 },
  { id: "weekly", label: "Weekly", icon: Calendar },
  { id: "monthly", label: "Monthly", icon: TrendingUp },
  { id: "yearly", label: "Yearly", icon: Award },
  { id: "customers", label: "Customers", icon: Users },
  { id: "products", label: "Products", icon: Coffee },
  { id: "payments", label: "Payments", icon: CreditCard },
  { id: "operations", label: "Operations", icon: Settings2 },
];

export default function AnalyticsDashboard() {
  const [period, setPeriod] = useState("today");
  const [activeTab, setActiveTab] = useState("daily");
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [mobileTabOpen, setMobileTabOpen] = useState(false);
  const isDark = useDarkMode();
  const settingsCtx = useSettings();
  const settings = settingsCtx?.settings;

  const reportsSettings = settings?.reports || {};

  const filteredTabs = useMemo(() => {
    return TABS.filter(tab => {
      if (tab.id === "daily") return reportsSettings.dailyReports !== false;
      if (tab.id === "weekly") return reportsSettings.weeklyReports !== false;
      if (tab.id === "monthly") return reportsSettings.monthlyReports !== false;
      if (tab.id === "yearly") return !!reportsSettings.yearlyReports;
      return true;
    });
  }, [reportsSettings.dailyReports, reportsSettings.weeklyReports, reportsSettings.monthlyReports, reportsSettings.yearlyReports]);

  useEffect(() => {
    if (filteredTabs.length > 0 && !filteredTabs.some(t => t.id === activeTab)) {
      setActiveTab(filteredTabs[0].id);
    }
  }, [filteredTabs, activeTab]);

  const fetchData = useCallback(async (p) => {
    setLoading(true);
    setError(null);
    try {
      const token = getApiToken();
      const res = await fetch(`${API_BASE}/analytics/metrics?period=${p}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.status === 401) throw new Error("Authentication required. Please log in.");
      if (!res.ok) throw new Error(`Failed to fetch analytics: ${res.status}`);
      const result = await res.json();
      setData(result);
    } catch (err) {
      setError(err.message);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(period);
  }, [period, fetchData]);

  const handlePeriodChange = useCallback((newPeriod) => {
    setPeriod(newPeriod);
  }, []);

  const activeView = useMemo(() => {
    if (!data) return null;
    switch (activeTab) {
      case "daily": return <DailyAnalytics data={data} />;
      case "weekly": return <WeeklyAnalytics data={data} />;
      case "monthly": return <MonthlyAnalytics data={data} />;
      case "yearly": return <YearlyAnalytics data={data} />;
      case "customers": return <CustomerAnalytics data={data} />;
      case "products": return <ProductAnalytics data={data} />;
      case "payments": return <PaymentAnalytics data={data} />;
      case "operations": return <OperationalAnalytics data={data} />;
      default: return <DailyAnalytics data={data} />;
    }
  }, [activeTab, data]);

  const ActiveIcon = filteredTabs.find((t) => t.id === activeTab)?.icon || BarChart3;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className={`font-serif text-2xl ${isDark ? "text-gray-100" : "text-[#3B2515]"}`}>
            Analytics
          </h1>
          <p className={`text-sm mt-0.5 ${isDark ? "text-gray-400" : "text-[#9C8268]"}`}>
            Comprehensive business performance overview
          </p>
        </div>
        <div className="flex items-center gap-3">
          <FilterBar period={period} onPeriodChange={handlePeriodChange} />
          <ExportBar />
        </div>
      </div>

      {error ? (
        <div className={`rounded-2xl p-6 text-center ${isDark ? "bg-gray-800 text-gray-300" : "bg-rose-50 text-rose-700"}`}>
          <p className="text-sm font-medium">{error}</p>
        </div>
      ) : loading ? (
        <LoadingSkeleton />
      ) : !data ? (
        <EmptyState />
      ) : (
        <>
          <SummaryKPICards summary={data.summary} />

          <SmartInsights data={data} />

          <div className="border-b border-[#EDE1CF]">
            <div className="sm:hidden relative">
              <button
                onClick={() => setMobileTabOpen(!mobileTabOpen)}
                className={`w-full flex items-center justify-between rounded-xl px-4 py-3 text-sm font-medium ${
                  isDark ? "bg-gray-800 text-gray-200" : "bg-white text-[#3B2515]"
                } ring-1 ${isDark ? "ring-gray-700" : "ring-[#EDE1CF]"}`}
              >
                <span className="flex items-center gap-2">
                  <ActiveIcon size={16} />
                  {filteredTabs.find((t) => t.id === activeTab)?.label}
                </span>
                <ChevronDown size={16} className={`transition-transform ${mobileTabOpen ? "rotate-180" : ""}`} />
              </button>
              <AnimatePresence>
                {mobileTabOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className={`absolute z-40 mt-1 w-full rounded-xl shadow-lg ring-1 overflow-hidden ${
                      isDark ? "bg-gray-800 ring-gray-700" : "bg-white ring-[#EDE1CF]"
                    }`}
                  >
                    {filteredTabs.map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => {
                          setActiveTab(tab.id);
                          setMobileTabOpen(false);
                        }}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors ${
                          activeTab === tab.id
                            ? isDark
                              ? "bg-gray-700 text-gray-100"
                              : "bg-[#FBF6EF] text-[#3B2515] font-medium"
                            : isDark
                              ? "text-gray-300 hover:bg-gray-700"
                              : "text-[#5C4033] hover:bg-[#FBF6EF]"
                        }`}
                      >
                        <tab.icon size={16} />
                        {tab.label}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="hidden sm:flex gap-1">
              {filteredTabs.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                      isActive
                        ? isDark
                          ? "text-gray-100 border-[#B07B4F]"
                          : "text-[#3B2515] border-[#B07B4F]"
                        : isDark
                          ? "text-gray-400 border-transparent hover:text-gray-300"
                          : "text-[#9C8268] border-transparent hover:text-[#3B2515]"
                    }`}
                  >
                    <tab.icon size={16} />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              {activeView}
            </motion.div>
          </AnimatePresence>
        </>
      )}
    </div>
  );
}
