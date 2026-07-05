import { useState } from "react"
import {
  Download, Upload, Calendar, CalendarDays, CalendarRange, RefreshCw, FileArchive,
} from "lucide-react"

import { API_BASE } from "../../../utils/constants.js"

export default function BackupSettings({ data, onChange }) {
  const [backingUp, setBackingUp] = useState(false)
  const [restoring, setRestoring] = useState(false)

  const handleChange = (field, value) => {
    onChange("backup", { ...data, [field]: value })
  }

  const handleCreateBackup = async () => {
    setBackingUp(true)
    try {
      const token = localStorage.getItem("coffe_token")
      const response = await fetch(`${API_BASE}/settings/backup`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      if (!response.ok) throw new Error("Failed to generate backup file on server")
      const backupJson = await response.json()
      
      const blob = new Blob([JSON.stringify(backupJson, null, 2)], { type: "application/json" })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `backup-${new Date().toISOString().split("T")[0]}.json`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      alert("Backup failed: " + err.message)
    } finally {
      setBackingUp(false)
    }
  }

  const handleRestore = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!confirm("Are you sure? This will delete all current products, orders, shortages, and override system settings!")) {
      return
    }

    setRestoring(true)
    try {
      const reader = new FileReader()
      reader.onload = async (event) => {
        try {
          const backupData = JSON.parse(event.target.result)
          const token = localStorage.getItem("coffe_token")
          const response = await fetch(`${API_BASE}/settings/restore`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(backupData),
          })
          if (!response.ok) {
            const errBody = await response.json().catch(() => ({}))
            throw new Error(errBody.message || "Failed to restore backup")
          }
          alert("Backup restored successfully! The page will now reload.")
          window.location.reload()
        } catch (err) {
          alert("Restore failed: " + err.message)
          setRestoring(false)
        }
      }
      reader.readAsText(file)
    } catch (err) {
      alert("Failed to read file: " + err.message)
      setRestoring(false)
    }
  }

  const backups = [
    { name: "backup-2026-06-30.json", date: "Jun 30, 2026", size: "12.4 MB" },
    { name: "backup-2026-06-23.json", date: "Jun 23, 2026", size: "11.8 MB" },
    { name: "backup-2026-06-16.json", date: "Jun 16, 2026", size: "11.2 MB" },
    { name: "backup-2026-06-09.json", date: "Jun 09, 2026", size: "10.9 MB" },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-4">
        <button
          onClick={handleCreateBackup}
          disabled={backingUp}
          className="flex items-center gap-2 rounded-full bg-[#3B2515] text-[#F3E5D3] px-5 py-2.5 text-sm font-medium hover:bg-[#4A2E18] transition-colors disabled:opacity-60"
        >
          {backingUp ? (
            <RefreshCw size={15} className="animate-spin" />
          ) : (
            <Download size={15} />
          )}
          {backingUp ? "Creating Backup..." : "Create Backup"}
        </button>

        <label className="flex items-center gap-2 rounded-full border border-[#EDE1CF] px-5 py-2.5 text-sm text-[#7B4B2A] hover:bg-[#FBF6EF] cursor-pointer transition-colors">
          <Upload size={15} /> Restore Backup
          <input type="file" accept=".json,.sql,.gz" className="hidden" onChange={handleRestore} />
        </label>
      </div>

      {restoring && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-700 flex items-center gap-2">
          <RefreshCw size={15} className="animate-spin" />
          Restoring from backup...
        </div>
      )}

      <div>
        <h4 className="text-xs text-[#A9805F] uppercase tracking-wide font-medium mb-3">Automatic Backup Schedule</h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { key: "dailyBackup", label: "Daily Backup", icon: Calendar },
            { key: "weeklyBackup", label: "Weekly Backup", icon: CalendarDays },
            { key: "monthlyBackup", label: "Monthly Backup", icon: CalendarRange },
          ].map(({ key, label, icon: Icon }) => (
            <label
              key={key}
              className="flex items-center justify-between rounded-xl border border-[#EDE1CF] bg-white px-4 py-3 cursor-pointer hover:bg-[#FBF6EF] transition-colors"
            >
              <span className="flex items-center gap-2.5 text-sm text-[#3B2515]">
                <Icon size={15} className="text-[#A9805F]" />
                {label}
              </span>
              <div
                onClick={() => handleChange(key, !data[key])}
                className={`relative w-10 h-5.5 rounded-full transition-colors cursor-pointer ${data[key] ? "bg-[#B07B4F]" : "bg-[#EDE1CF]"}`}
              >
                <div
                  className={`absolute top-0.5 left-0.5 w-4.5 h-4.5 rounded-full bg-white shadow-sm transition-transform ${data[key] ? "translate-x-4.5" : ""}`}
                />
              </div>
            </label>
          ))}
        </div>
      </div>

      <div>
        <h4 className="text-xs text-[#A9805F] uppercase tracking-wide font-medium mb-3">Recent Backups</h4>
        <div className="space-y-2">
          {backups.map((b, i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-xl bg-white ring-1 ring-[#EDE1CF] px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <FileArchive size={16} className="text-[#A9805F]" />
                <div>
                  <p className="text-sm text-[#3B2515]">{b.name}</p>
                  <p className="text-xs text-[#9C8268]">{b.date} &middot; {b.size}</p>
                </div>
              </div>
              <button className="flex items-center gap-1.5 text-xs text-[#7B4B2A] hover:text-[#3B2515] font-medium transition-colors">
                <Download size={13} /> Download
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
