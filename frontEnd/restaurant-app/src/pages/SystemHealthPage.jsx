import { useCallback, useEffect, useState } from "react";
import { fetchSystemHealth, fetchErrorLogs, fetchBackupStatus, fetchSystemInfo } from "../services/data.js";

function StatusDot({ ok }) {
  return (
    <span className={`inline-block w-2.5 h-2.5 rounded-full ${ok ? "bg-emerald-500" : "bg-rose-500"} ring-2 ${ok ? "ring-emerald-200" : "ring-rose-200"} shrink-0`} />
  );
}

function ProgressBar({ value, label, color = "bg-[#B07B4F]" }) {
  const pct = Math.min(Math.max(value || 0), 100);
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-[#A9805F]">{label}</span>
        <span className="text-[#3B2515] font-medium">{pct}%</span>
      </div>
      <div className="w-full h-2 bg-[#EDE1CF] rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function formatUptime(seconds) {
  if (!seconds && seconds !== 0) return "—";
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const parts = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  parts.push(`${m}m`);
  return parts.join(" ");
}

function formatDate(dateStr) {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch {
    return "—";
  }
}

function formatBytes(bytes) {
  if (!bytes && bytes !== 0) return "—";
  const mb = bytes / (1024 * 1024);
  if (mb > 1024) return `${(mb / 1024).toFixed(1)} GB`;
  return `${mb.toFixed(1)} MB`;
}

export default function SystemHealthPage({ permissions = { can: () => false } }) {
  const [health, setHealth] = useState(null);
  const [errorLogs, setErrorLogs] = useState([]);
  const [backup, setBackup] = useState(null);
  const [sysInfo, setSysInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [logsPage, setLogsPage] = useState(1);
  const [logsTotal, setLogsTotal] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const logsPerPage = 10;

  const loadAll = useCallback(async (showRefreshIndicator = false) => {
    if (showRefreshIndicator) setRefreshing(true);
    else setLoading(true);
    setError("");
    try {
      const [h, logs, b, info] = await Promise.all([
        fetchSystemHealth(),
        fetchErrorLogs({ page: logsPage, limit: logsPerPage }),
        fetchBackupStatus(),
        fetchSystemInfo(),
      ]);
      setHealth(h);
      setErrorLogs(Array.isArray(logs?.items) ? logs.items : Array.isArray(logs) ? logs : []);
      setLogsTotal(logs?.total || logs?.meta?.total || 0);
      setBackup(b);
      setSysInfo(info);
    } catch (err) {
      setError(err.message || "Failed to load system health");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [logsPage]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  useEffect(() => {
    const interval = setInterval(() => loadAll(true), 60000);
    return () => clearInterval(interval);
  }, [loadAll]);

  const totalLogPages = Math.max(1, Math.ceil(logsTotal / logsPerPage));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-xl text-[#3B2515]">System Health</h2>
          <p className="text-xs text-[#A9805F] mt-0.5">Monitor server status and performance metrics</p>
        </div>
        <button onClick={() => loadAll(true)} disabled={refreshing}
          className="flex items-center gap-1.5 rounded-full bg-[#B07B4F] text-white px-4 py-2 text-sm font-medium hover:bg-[#C9925F] transition-colors disabled:opacity-50">
          <svg className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {refreshing ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
      )}

      {loading && !health ? (
        <div className="text-center py-12 text-[#9C8268] text-sm">Loading system health...</div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            <div className="rounded-2xl bg-white ring-1 ring-[#EDE1CF] shadow-sm p-5">
              <div className="flex items-center gap-2 mb-1">
                <StatusDot ok={health?.apiStatus === "ok" || health?.apiStatus === "connected"} />
                <p className="text-xs text-[#A9805F] uppercase tracking-wide font-medium">API Status</p>
              </div>
              <p className="font-serif text-lg text-[#3B2515] mt-1 capitalize">{health?.apiStatus || "—"}</p>
            </div>
            <div className="rounded-2xl bg-white ring-1 ring-[#EDE1CF] shadow-sm p-5">
              <div className="flex items-center gap-2 mb-1">
                <StatusDot ok={health?.dbStatus === "connected" || health?.dbStatus === "ok"} />
                <p className="text-xs text-[#A9805F] uppercase tracking-wide font-medium">Database</p>
              </div>
              <p className="font-serif text-lg text-[#3B2515] mt-1 capitalize">{health?.dbStatus || "—"}</p>
            </div>
            <div className="rounded-2xl bg-white ring-1 ring-[#EDE1CF] shadow-sm p-5">
              <p className="text-xs text-[#A9805F] uppercase tracking-wide font-medium">Server Uptime</p>
              <p className="font-serif text-lg text-[#3B2515] mt-1">{formatUptime(health?.uptime)}</p>
            </div>
            <div className="rounded-2xl bg-white ring-1 ring-[#EDE1CF] shadow-sm p-5">
              <p className="text-xs text-[#A9805F] uppercase tracking-wide font-medium">Active Users</p>
              <p className="font-serif text-lg text-[#3B2515] mt-1">{health?.activeUsers ?? "—"}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-2xl bg-white ring-1 ring-[#EDE1CF] shadow-sm p-5 space-y-4">
              <p className="text-xs text-[#A9805F] uppercase tracking-wide font-medium">Memory Usage</p>
              <ProgressBar value={health?.memory?.percentage} label={`${formatBytes(health?.memory?.used)} / ${formatBytes(health?.memory?.total)}`} color="bg-[#B07B4F]" />
            </div>
            <div className="rounded-2xl bg-white ring-1 ring-[#EDE1CF] shadow-sm p-5 space-y-4">
              <p className="text-xs text-[#A9805F] uppercase tracking-wide font-medium">CPU Load</p>
              <ProgressBar value={health?.cpu?.load} label={`${health?.cpu?.load ?? 0}% (${health?.cpu?.cores ?? "?"} cores)`} color="bg-emerald-500" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-2xl bg-white ring-1 ring-[#EDE1CF] shadow-sm p-5">
              <p className="text-xs text-[#A9805F] uppercase tracking-wide font-medium">Active Sessions</p>
              <p className="font-serif text-lg text-[#3B2515] mt-1">{health?.activeSessions ?? "—"}</p>
            </div>
          </div>

          {sysInfo && (
            <div className="rounded-2xl bg-white ring-1 ring-[#EDE1CF] shadow-sm p-5">
              <p className="text-xs text-[#A9805F] uppercase tracking-wide font-medium mb-3">System Information</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-[#9C8268] text-xs">Node Version</span>
                  <p className="text-[#3B2515] font-medium">{sysInfo.nodeVersion || "—"}</p>
                </div>
                <div>
                  <span className="text-[#9C8268] text-xs">Platform</span>
                  <p className="text-[#3B2515] font-medium">{sysInfo.platform || "—"}</p>
                </div>
                <div>
                  <span className="text-[#9C8268] text-xs">Hostname</span>
                  <p className="text-[#3B2515] font-medium">{sysInfo.hostname || "—"}</p>
                </div>
                <div>
                  <span className="text-[#9C8268] text-xs">MongoDB Version</span>
                  <p className="text-[#3B2515] font-medium">{sysInfo.mongoVersion || "—"}</p>
                </div>
              </div>
            </div>
          )}

          <div className="rounded-2xl bg-white ring-1 ring-[#EDE1CF] shadow-sm p-5">
            <p className="text-xs text-[#A9805F] uppercase tracking-wide font-medium mb-3">Backup Status</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-[#9C8268] text-xs">Last Backup</span>
                <p className="text-[#3B2515] font-medium">{formatDate(backup?.lastBackup)}</p>
              </div>
              <div>
                <span className="text-[#9C8268] text-xs">Status</span>
                <p className={`font-medium flex items-center gap-1.5 mt-0.5 ${backup?.status === "ok" || backup?.status === "success" ? "text-emerald-600" : "text-rose-600"}`}>
                  <StatusDot ok={backup?.status === "ok" || backup?.status === "success"} />
                  {backup?.status || "—"}
                </p>
              </div>
              <div>
                <span className="text-[#9C8268] text-xs">Size</span>
                <p className="text-[#3B2515] font-medium">{backup?.size ? formatBytes(backup.size) : "—"}</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-white ring-1 ring-[#EDE1CF] shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-[#EDE1CF]">
              <p className="text-xs text-[#A9805F] uppercase tracking-wide font-medium">Error Logs</p>
            </div>
            {errorLogs.length === 0 ? (
              <div className="text-center py-10 text-[#9C8268] text-sm">No error logs</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#EDE1CF] bg-[#FBF6EF]">
                      <th className="text-left px-4 py-3 text-[#A9805F] text-xs uppercase tracking-wide font-medium">Timestamp</th>
                      <th className="text-left px-4 py-3 text-[#A9805F] text-xs uppercase tracking-wide font-medium">Level</th>
                      <th className="text-left px-4 py-3 text-[#A9805F] text-xs uppercase tracking-wide font-medium">Message</th>
                      <th className="text-left px-4 py-3 text-[#A9805F] text-xs uppercase tracking-wide font-medium">Source</th>
                    </tr>
                  </thead>
                  <tbody>
                    {errorLogs.map((log, i) => (
                      <tr key={log._id || log.id || i} className="border-b border-[#EDE1CF]/50 hover:bg-[#FBF6EF]/50 transition-colors">
                        <td className="px-4 py-3 text-[#9C8268] text-xs whitespace-nowrap">{formatDate(log.timestamp || log.date || log.createdAt)}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${
                            (log.level || "").toLowerCase() === "error"
                              ? "bg-rose-100 text-rose-700"
                              : (log.level || "").toLowerCase() === "warn"
                                ? "bg-amber-100 text-amber-700"
                                : "bg-stone-100 text-stone-600"
                          }`}>
                            {log.level || "info"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-[#3B2515] max-w-xs truncate">{log.message || log.msg || "—"}</td>
                        <td className="px-4 py-3 text-[#9C8268] text-xs">{log.source || log.service || log.module || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {totalLogPages > 1 && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-[#EDE1CF] bg-[#FBF6EF]">
                <span className="text-xs text-[#9C8268]">Page {logsPage} of {totalLogPages} ({logsTotal} total)</span>
                <div className="flex items-center gap-2">
                  <button disabled={logsPage <= 1} onClick={() => setLogsPage((p) => Math.max(1, p - 1))}
                    className="rounded-full border border-[#EDE1CF] px-3 py-1.5 text-xs text-[#7B4B2A] hover:bg-white disabled:opacity-40 transition-colors">
                    Previous
                  </button>
                  <button disabled={logsPage >= totalLogPages} onClick={() => setLogsPage((p) => Math.min(totalLogPages, p + 1))}
                    className="rounded-full border border-[#EDE1CF] px-3 py-1.5 text-xs text-[#7B4B2A] hover:bg-white disabled:opacity-40 transition-colors">
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
