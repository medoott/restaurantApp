import { useState, useEffect } from "react";
import { Check, Play, RotateCcw, Clock, Sparkles, AlertTriangle } from "lucide-react";

export default function CleaningWorkflowPage({ apiRequest }) {
  const [cleaningTables, setCleaningTables] = useState([]);
  const [stats, setStats] = useState(null);
  const [history, setHistory] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [tablesRes, statsRes, historyRes] = await Promise.all([
        apiRequest("/cleaning/pending", { method: "GET" }),
        apiRequest("/cleaning/stats", { method: "GET" }),
        apiRequest("/cleaning/history", { method: "GET" }),
      ]);
      setCleaningTables(tablesRes?.data || tablesRes || []);
      setStats(statsRes?.data || statsRes);
      setHistory(historyRes?.data || historyRes);
    } catch { }
  };

  const handleStartCleaning = async (tableNumber) => {
    try {
      await apiRequest(`/cleaning/start`, {
        method: "POST",
        body: JSON.stringify({ tableNumber }),
        headers: { "Content-Type": "application/json" },
      });
      loadData();
    } catch { }
  };

  const handleCompleteCleaning = async (tableNumber) => {
    try {
      await apiRequest(`/cleaning/complete`, {
        method: "POST",
        body: JSON.stringify({ tableNumber }),
        headers: { "Content-Type": "application/json" },
      });
      loadData();
    } catch { }
  };

  const needsCleaning = cleaningTables.filter((t) => t.status === "needs_cleaning");
  const inProgress = cleaningTables.filter((t) => t.status === "cleaning_in_progress");

  return (
    <div className="min-h-screen bg-[#FBF6EF] pb-20">
      <div className="sticky top-0 z-30 bg-[#FBF6EF]/90 backdrop-blur-md border-b border-[#EDE1CF] px-4 sm:px-8 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Sparkles className="text-[#B07B4F]" size={24} />
            <h1 className="font-serif text-xl text-[#3B2515]">Cleaning Workflow</h1>
          </div>
          <button onClick={loadData}
            className="flex items-center gap-2 text-sm text-[#A9805F] hover:text-[#3B2515] transition-colors">
            <RotateCcw size={14} /> Refresh
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-6">
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <StatCard label="Needs Cleaning" value={stats.tablesNeedingCleaning} color="text-rose-600" bg="bg-rose-50" />
            <StatCard label="In Progress" value={stats.cleaningInProgress} color="text-purple-600" bg="bg-purple-50" />
            <StatCard label="Available" value={stats.availableTables} color="text-emerald-600" bg="bg-emerald-50" />
            <StatCard label="Cleaned Today" value={stats.cleanedToday} color="text-blue-600" bg="bg-blue-50" />
            <StatCard label="Avg Time" value={`${stats.avgCleaningTimeMinutes || 0}m`} color="text-amber-600" bg="bg-amber-50" />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl ring-1 ring-[#EDE1CF] p-5">
            <h2 className="font-serif text-lg text-[#3B2515] mb-4 flex items-center gap-2">
              <AlertTriangle size={16} className="text-rose-500" />
              Needs Cleaning ({needsCleaning.length})
            </h2>
            {needsCleaning.length === 0 ? (
              <p className="text-sm text-[#A9805F] text-center py-8">All tables are clean</p>
            ) : (
              <div className="space-y-3">
                {needsCleaning.map((t) => (
                  <div key={t._id} className="flex items-center justify-between p-4 rounded-xl bg-rose-50/50 ring-1 ring-rose-100">
                    <div>
                      <p className="font-semibold text-[#3B2515]">Table {t.tableNumber}</p>
                      <p className="text-xs text-[#A9805F]">{t.section} · {t.capacity} seats</p>
                    </div>
                    <button onClick={() => handleStartCleaning(t.tableNumber)}
                      className="flex items-center gap-2 bg-[#B07B4F] text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-[#8E623F] transition-colors">
                      <Play size={14} /> Start
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl ring-1 ring-[#EDE1CF] p-5">
            <h2 className="font-serif text-lg text-[#3B2515] mb-4 flex items-center gap-2">
              <Clock size={16} className="text-purple-500" />
              In Progress ({inProgress.length})
            </h2>
            {inProgress.length === 0 ? (
              <p className="text-sm text-[#A9805F] text-center py-8">No cleaning in progress</p>
            ) : (
              <div className="space-y-3">
                {inProgress.map((t) => (
                  <div key={t._id} className="flex items-center justify-between p-4 rounded-xl bg-purple-50/50 ring-1 ring-purple-100">
                    <div>
                      <p className="font-semibold text-[#3B2515]">Table {t.tableNumber}</p>
                      <p className="text-xs text-[#A9805F]">{t.section} </p>
                    </div>
                    <button onClick={() => handleCompleteCleaning(t.tableNumber)}
                      className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-emerald-700 transition-colors">
                      <Check size={14} /> Complete
                    </button>
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

function StatCard({ label, value, color, bg }) {
  return (
    <div className="bg-white rounded-2xl p-4 ring-1 ring-[#EDE1CF]">
      <p className="text-xs text-[#A9805F]">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
    </div>
  );
}
