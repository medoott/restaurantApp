import { useCallback, useEffect, useState } from "react";
import { fetchErrorLogs, fetchBackupStatus } from "../services/data.js";
import { Search, Filter, ChevronDown, ChevronUp, Calendar, Clock, Shield, Users, Activity, Database } from "lucide-react";

function formatDate(dateStr) {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" });
  } catch {
    return "—";
  }
}

function formatDateShort(dateStr) {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch {
    return "—";
  }
}

const MODULES = ["All", "Orders", "Products", "Tables", "Inventory", "Customers", "Suppliers", "Reservations", "Employees", "System", "Auth"];
const ACTION_TYPES = ["All", "create", "update", "delete", "login", "logout", "error", "export", "import", "backup"];

export default function AuditLogPage({ permissi_ons = { can: () => false } }) {
  const [logs, setLogs] = useState([]);
  const [backup, setBackup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [expandedRow, setExpandedRow] = useState(null);
  const perPage = 15;

  const [moduleFilter, setModuleFilter] = useState("All");
  const [actionFilter, setActionFilter] = useState("All");
  const [userFilter, setUserFilter] = useState("");
  const [detailSearch, setDetailSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const todayStr = new Date().toISOString().slice(0, 10);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = { page, limit: perPage };
      if (moduleFilter !== "All") params.module = moduleFilter.toLowerCase();
      if (actionFilter !== "All") params.level = actionFilter;
      if (userFilter.trim()) params.user = userFilter.trim();
      if (detailSearch.trim()) params.search = detailSearch.trim();

      const [logsData, backupData] = await Promise.all([
        fetchErrorLogs(params),
        fetchBackupStatus(),
      ]);

      const items = Array.isArray(logsData?.items) ? logsData.items : Array.isArray(logsData) ? logsData : [];
      setLogs(items || []);
      setTotal(logsData?.total || logsData?.meta?.total || items.length || 0);
      setBackup(backupData);
    } catch (err) {
      setError(err.message || "Failed to load audit logs");
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [page, moduleFilter, actionFilter, userFilter, detailSearch]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  useEffect(() => {
    setPage(1);
  }, [moduleFilter, actionFilter, userFilter, detailSearch]);

  const totalPages = Math.max(1, Math.ceil(total / perPage));

  const todayLogs = logs.filter((log) => {
    const ts = log.timestamp || log.date || log.createdAt;
    return ts && String(ts).startsWith(todayStr);
  });

  const moduleBreakdown = logs.reduce((acc, log) => {
    const mod = log.module || log.source || "Unknown";
    acc[mod] = (acc[mod] || 0) + 1;
    return acc;
  }, {});

  const toggleRow = (id) => {
    setExpandedRow((prev) => (prev === id ? null : id));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-xl text-[#3B2515] flex items-center gap-2">
            <Shield size={18} /> Audit Log
          </h2>
          <p className="text-xs text-[#A9805F] mt-0.5">Track system activity and changes</p>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl bg-white ring-1 ring-[#EDE1CF] shadow-sm p-5">
          <div className="flex items-center gap-2 mb-1">
            <Calendar size={14} className="text-[#B07B4F]" />
            <p className="text-xs text-[#A9805F] uppercase tracking-wide font-medium">Today</p>
          </div>
          <p className="font-serif text-lg text-[#3B2515] mt-1">{todayLogs.length}</p>
        </div>
        <div className="rounded-2xl bg-white ring-1 ring-[#EDE1CF] shadow-sm p-5">
          <div className="flex items-center gap-2 mb-1">
            <Activity size={14} className="text-[#B07B4F]" />
            <p className="text-xs text-[#A9805F] uppercase tracking-wide font-medium">Total Entries</p>
          </div>
          <p className="font-serif text-lg text-[#3B2515] mt-1">{total}</p>
        </div>
        <div className="rounded-2xl bg-white ring-1 ring-[#EDE1CF] shadow-sm p-5">
          <div className="flex items-center gap-2 mb-1">
            <Database size={14} className="text-[#B07B4F]" />
            <p className="text-xs text-[#A9805F] uppercase tracking-wide font-medium">Last Backup</p>
          </div>
          <p className="font-serif text-lg text-[#3B2515] mt-1">{backup?.lastBackup ? formatDateShort(backup.lastBackup) : "—"}</p>
        </div>
        <div className="rounded-2xl bg-white ring-1 ring-[#EDE1CF] shadow-sm p-5">
          <div className="flex items-center gap-2 mb-1">
            <Users size={14} className="text-[#B07B4F]" />
            <p className="text-xs text-[#A9805F] uppercase tracking-wide font-medium">Active Modules</p>
          </div>
          <p className="font-serif text-lg text-[#3B2515] mt-1">{Object.keys(moduleBreakdown).length}</p>
        </div>
      </div>

      <div className="rounded-2xl bg-white ring-1 ring-[#EDE1CF] shadow-sm p-5">
        <p className="text-xs text-[#A9805F] uppercase tracking-wide font-medium mb-3">Module Breakdown</p>
        <div className="flex flex-wrap gap-2">
          {Object.entries(moduleBreakdown).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([mod, count]) => (
            <span key={mod} className="inline-flex items-center gap-1.5 rounded-full bg-[#FBF6EF] ring-1 ring-[#EDE1CF] px-3 py-1.5 text-xs text-[#3B2515]">
              {mod}
              <span className="font-medium text-[#B07B4F]">{count}</span>
            </span>
          ))}
        </div>
      </div>

      <div className="rounded-2xl bg-white ring-1 ring-[#EDE1CF] shadow-sm p-5">
        <div className="flex items-center gap-2 mb-4">
          <Filter size={14} className="text-[#A9805F]" />
          <p className="text-xs text-[#A9805F] uppercase tracking-wide font-medium">Filters</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <select
            value={moduleFilter}
            onChange={(e) => setModuleFilter(e.target.value)}
            className="rounded-xl border border-[#EDE1CF] bg-white px-3 py-2 text-xs text-[#3B2515] outline-none"
            aria-label="Module filter"
          >
            {MODULES.map((m) => (
              <option key={m} value={m}>{m === "All" ? "All Modules" : m}</option>
            ))}
          </select>
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="rounded-xl border border-[#EDE1CF] bg-white px-3 py-2 text-xs text-[#3B2515] outline-none"
            aria-label="Action type filter"
          >
            {ACTION_TYPES.map((a) => (
              <option key={a} value={a}>{a === "All" ? "All Actions" : a}</option>
            ))}
          </select>
          <div className="flex items-center gap-2 rounded-xl border border-[#EDE1CF] bg-white px-3 py-2">
            <Search size={12} className="text-[#A9805F]" />
            <input
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
              placeholder="User..."
              className="w-full bg-transparent text-xs text-[#3B2515] placeholder:text-[#A9805F] outline-none"
              aria-label="Filter by user"
            />
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-[#EDE1CF] bg-white px-3 py-2">
            <Search size={12} className="text-[#A9805F]" />
            <input
              value={detailSearch}
              onChange={(e) => setDetailSearch(e.target.value)}
              placeholder="Search details..."
              className="w-full bg-transparent text-xs text-[#3B2515] placeholder:text-[#A9805F] outline-none"
              aria-label="Search within details"
            />
          </div>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="rounded-xl border border-[#EDE1CF] bg-white px-3 py-2 text-xs text-[#3B2515] outline-none"
            aria-label="Date from"
          />
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="rounded-xl border border-[#EDE1CF] bg-white px-3 py-2 text-xs text-[#3B2515] outline-none"
            aria-label="Date to"
          />
        </div>
      </div>

      <div className="rounded-2xl bg-white ring-1 ring-[#EDE1CF] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="text-center py-16 text-[#9C8268] text-sm">
              <div className="animate-pulse">Loading audit logs...</div>
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-16 text-[#9C8268] text-sm">
              <Shield size={32} className="mx-auto mb-3 opacity-30" />
              <p>No audit log entries found</p>
              <p className="text-xs mt-1">Try adjusting your filters</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#EDE1CF] bg-[#FBF6EF]">
                  <th className="text-left px-4 py-3 text-[#A9805F] text-xs uppercase tracking-wide font-medium">
                    <Clock size={12} className="inline mr-1" /> Timestamp
                  </th>
                  <th className="text-left px-4 py-3 text-[#A9805F] text-xs uppercase tracking-wide font-medium">User</th>
                  <th className="text-left px-4 py-3 text-[#A9805F] text-xs uppercase tracking-wide font-medium">Role</th>
                  <th className="text-left px-4 py-3 text-[#A9805F] text-xs uppercase tracking-wide font-medium">Module</th>
                  <th className="text-left px-4 py-3 text-[#A9805F] text-xs uppercase tracking-wide font-medium">Action</th>
                  <th className="text-left px-4 py-3 text-[#A9805F] text-xs uppercase tracking-wide font-medium">Details</th>
                  <th className="text-left px-4 py-3 text-[#A9805F] text-xs uppercase tracking-wide font-medium">IP Address</th>
                  <th className="text-left px-4 py-3 text-[#A9805F] text-xs uppercase tracking-wide font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log, i) => {
                  const id = log._id || log.id || i;
                  const isExpanded = expandedRow === id;
                  const actionText = (log.level || log.action || "info").toLowerCase();
                  const actionBadge = actionText === "error"
                    ? "bg-rose-100 text-rose-700"
                    : actionText === "warn" || actionText === "warning"
                      ? "bg-amber-100 text-amber-700"
                      : actionText === "info"
                        ? "bg-sky-100 text-sky-700"
                        : "bg-stone-100 text-stone-600";

                  return (
                    <>
                      <tr
                        key={id}
                        onClick={() => toggleRow(id)}
                        className="border-b border-[#EDE1CF]/50 hover:bg-[#FBF6EF]/50 transition-colors cursor-pointer"
                      >
                        <td className="px-4 py-3 text-[#9C8268] text-xs whitespace-nowrap">{formatDate(log.timestamp || log.date || log.createdAt)}</td>
                        <td className="px-4 py-3 text-[#3B2515] text-sm font-medium">{log.user || log.createdBy || "—"}</td>
                        <td className="px-4 py-3 text-[#9C8268] text-xs">{log.role || "—"}</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center rounded-full bg-[#FBF6EF] ring-1 ring-[#EDE1CF] px-2 py-0.5 text-[10px] text-[#3B2515]">
                            {log.module || log.source || "System"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${actionBadge}`}>
                            {actionText}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-[#9C8268] text-xs max-w-[200px] truncate">{log.message || log.msg || log.details || "—"}</td>
                        <td className="px-4 py-3 text-[#9C8268] text-xs font-mono">{log.ip || log.ipAddress || "—"}</td>
                        <td className="px-4 py-3 text-[#A9805F]">
                          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr key={`${id}-detail`} className="bg-[#FBF6EF] border-b border-[#EDE1CF]">
                          <td colSpan={8} className="px-6 py-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                              <div>
                                <span className="text-[#9C8268] text-xs">Full Message</span>
                                <p className="text-[#3B2515] mt-0.5">{log.message || log.msg || "—"}</p>
                              </div>
                              <div>
                                <span className="text-[#9C8268] text-xs">Stack Trace</span>
                                <p className="text-[#3B2515] mt-0.5 font-mono text-xs break-words max-h-24 overflow-y-auto">
                                  {log.stack || log.stackTrace || "N/A"}
                                </p>
                              </div>
                              <div>
                                <span className="text-[#9C8268] text-xs">Metadata</span>
                                <pre className="text-[#3B2515] mt-0.5 font-mono text-xs break-words max-h-24 overflow-y-auto">
                                  {log.metadata || log.meta ? JSON.stringify(log.metadata || log.meta, null, 2) : "N/A"}
                                </pre>
                              </div>
                              <div>
                                <span className="text-[#9C8268] text-xs">Before</span>
                                <pre className="text-[#3B2515] mt-0.5 font-mono text-xs break-words max-h-24 overflow-y-auto">
                                  {log.before ? JSON.stringify(log.before, null, 2) : "N/A"}
                                </pre>
                              </div>
                              <div>
                                <span className="text-[#9C8268] text-xs">After</span>
                                <pre className="text-[#3B2515] mt-0.5 font-mono text-xs break-words max-h-24 overflow-y-auto">
                                  {log.after ? JSON.stringify(log.after, null, 2) : "N/A"}
                                </pre>
                              </div>
                              <div>
                                <span className="text-[#9C8268] text-xs">Request Info</span>
                                <p className="text-[#3B2515] mt-0.5 text-xs">
                                  {log.method ? `${log.method} ${log.path || ""}` : "—"}
                                  {log.statusCode ? ` (${log.statusCode})` : ""}
                                </p>
                                <p className="text-[#3B2515] text-xs">{log.userAgent || ""}</p>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-[#EDE1CF] bg-[#FBF6EF]">
            <span className="text-xs text-[#9C8268]">Page {page} of {totalPages} ({total} total)</span>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-full border border-[#EDE1CF] px-3 py-1.5 text-xs text-[#7B4B2A] hover:bg-white disabled:opacity-40 transition-colors"
              >
                Previous
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="rounded-full border border-[#EDE1CF] px-3 py-1.5 text-xs text-[#7B4B2A] hover:bg-white disabled:opacity-40 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
