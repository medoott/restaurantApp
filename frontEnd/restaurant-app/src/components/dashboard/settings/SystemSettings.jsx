import { useState } from "react"
import {
  Wrench, Bug, Database, Trash2, FileText, AlertTriangle, RefreshCw, CheckCircle,
} from "lucide-react"

export default function SystemSettings({ data, onChange }) {
  const [clearing, setClearing] = useState(false)
  const [cleared, setCleared] = useState(false)

  const handleChange = (field, value) => {
    onChange("system", { ...data, [field]: value })
  }

  const handleClearCache = () => {
    setClearing(true)
    setTimeout(() => {
      setClearing(false)
      setCleared(true)
      setTimeout(() => setCleared(false), 3000)
    }, 1500)
  }

  const logs = [
    { type: "info", message: "System started successfully", time: "2 hours ago" },
    { type: "info", message: "Backup completed", time: "6 hours ago" },
    { type: "warning", message: "High memory usage detected", time: "1 day ago" },
    { type: "error", message: "Failed to send email notification", time: "2 days ago" },
    { type: "info", message: "Database optimization completed", time: "3 days ago" },
  ]

  const errorLogs = [
    { message: "Uncaught TypeError: Cannot read property 'id' of undefined", count: 12, lastSeen: "1 hour ago" },
    { message: "API timeout after 30000ms on /api/orders", count: 5, lastSeen: "3 hours ago" },
    { message: "Database connection pool exhausted", count: 3, lastSeen: "1 day ago" },
  ]

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <label className="flex items-center justify-between rounded-xl border border-[#EDE1CF] bg-white px-4 py-3 cursor-pointer hover:bg-[#FBF6EF] transition-colors">
          <span className="flex items-center gap-2.5 text-sm text-[#3B2515]">
            <Wrench size={15} className="text-[#A9805F]" />
            Maintenance Mode
          </span>
          <div
            onClick={() => handleChange("maintenanceMode", !data.maintenanceMode)}
            className={`relative w-10 h-5.5 rounded-full transition-colors cursor-pointer ${data.maintenanceMode ? "bg-amber-400" : "bg-[#EDE1CF]"}`}
          >
            <div
              className={`absolute top-0.5 left-0.5 w-4.5 h-4.5 rounded-full bg-white shadow-sm transition-transform ${data.maintenanceMode ? "translate-x-4.5" : ""}`}
            />
          </div>
        </label>

        <label className="flex items-center justify-between rounded-xl border border-[#EDE1CF] bg-white px-4 py-3 cursor-pointer hover:bg-[#FBF6EF] transition-colors">
          <span className="flex items-center gap-2.5 text-sm text-[#3B2515]">
            <Bug size={15} className="text-[#A9805F]" />
            Debug Mode
          </span>
          <div
            onClick={() => handleChange("debugMode", !data.debugMode)}
            className={`relative w-10 h-5.5 rounded-full transition-colors cursor-pointer ${data.debugMode ? "bg-rose-400" : "bg-[#EDE1CF]"}`}
          >
            <div
              className={`absolute top-0.5 left-0.5 w-4.5 h-4.5 rounded-full bg-white shadow-sm transition-transform ${data.debugMode ? "translate-x-4.5" : ""}`}
            />
          </div>
        </label>
      </div>

      <div className="rounded-xl border border-[#EDE1CF] bg-white p-4">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-medium text-[#3B2515] flex items-center gap-2">
            <Database size={16} /> Cache Management
          </h4>
          <button
            onClick={handleClearCache}
            disabled={clearing}
            className="flex items-center gap-1.5 rounded-full bg-[#3B2515] text-[#F3E5D3] px-4 py-2 text-sm font-medium hover:bg-[#4A2E18] transition-colors disabled:opacity-60"
          >
            {clearing ? (
              <RefreshCw size={14} className="animate-spin" />
            ) : (
              <Trash2 size={14} />
            )}
            {clearing ? "Clearing..." : "Clear Cache"}
          </button>
        </div>
        {cleared && (
          <div className="flex items-center gap-2 text-sm text-emerald-600 bg-emerald-50 rounded-xl px-4 py-2.5">
            <CheckCircle size={15} /> Cache cleared successfully
          </div>
        )}
        <p className="text-xs text-[#9C8268] mt-2">
          Clears cached data including product listings, order history, and analytics data. This may slow down the system temporarily as caches rebuild.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-[#EDE1CF] bg-white p-4">
          <h4 className="text-sm font-medium text-[#3B2515] flex items-center gap-2 mb-3">
            <FileText size={16} /> System Logs
          </h4>
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {logs.map((log, i) => (
              <div key={i} className="flex items-start gap-2 text-xs py-1">
                <span className={`shrink-0 w-1.5 h-1.5 rounded-full mt-1.5 ${
                  log.type === "error" ? "bg-rose-400" : log.type === "warning" ? "bg-amber-400" : "bg-sky-400"
                }`} />
                <span className="text-[#3B2515] flex-1">{log.message}</span>
                <span className="text-[#9C8268] shrink-0">{log.time}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-[#EDE1CF] bg-white p-4">
          <h4 className="text-sm font-medium text-[#3B2515] flex items-center gap-2 mb-3">
            <AlertTriangle size={16} /> Error Logs
          </h4>
          <div className="space-y-2">
            {errorLogs.map((log, i) => (
              <div key={i} className="flex items-start gap-2 text-xs py-1 border-b border-[#EDE1CF] last:border-0">
                <AlertTriangle size={12} className="text-rose-400 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[#3B2515] truncate">{log.message}</p>
                  <p className="text-[#9C8268] mt-0.5">{log.count} occurrences &middot; Last: {log.lastSeen}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
