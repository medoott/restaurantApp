import { useState } from "react"
import {
  KeyRound, ShieldCheck, History, Monitor, Smartphone, Timer, FileText,
} from "lucide-react"
import { api } from "../../../services/api.js"
import ToggleSwitch from "../../ui/ToggleSwitch.jsx"

const passwordPolicies = [
  { value: "low", label: "Low (6+ characters)" },
  { value: "medium", label: "Medium (8+ chars, 1 number)" },
  { value: "high", label: "High (10+ chars, upper, lower, number, symbol)" },
]

export default function SecuritySettings({ data, onChange }) {
  const [passwords, setPasswords] = useState({ current: "", new: "", confirm: "" })
  const [_show2FA, _setShow2FA] = useState(false)
  const [passwordError, setPasswordError] = useState("")
  const [passwordSuccess, setPasswordSuccess] = useState("")
  const [changingPassword, setChangingPassword] = useState(false)

  const handleChange = (field, value) => {
    onChange("security", { ...data, [field]: value })
  }

  const handlePasswordChange = async () => {
    setPasswordError("")
    setPasswordSuccess("")
    if (passwords.new !== passwords.confirm) {
      setPasswordError("New passwords do not match")
      return
    }
    if (passwords.new.length < 6) {
      setPasswordError("Password must be at least 6 characters")
      return
    }
    setChangingPassword(true)
    try {
      await api.post("/auth/change-password", {
        currentPassword: passwords.current,
        newPassword: passwords.new,
      })
      setPasswordSuccess("Password updated successfully")
      setPasswords({ current: "", new: "", confirm: "" })
      setTimeout(() => setPasswordSuccess(""), 3000)
    } catch (err) {
      setPasswordError(err.message || "Failed to change password")
    } finally {
      setChangingPassword(false)
    }
  }

  const sessions = [
    { device: "Chrome on macOS", ip: "192.168.1.1", lastActive: "2 mins ago", current: true },
    { device: "Safari on iPhone", ip: "192.168.1.2", lastActive: "1 hour ago", current: false },
    { device: "Chrome on Android", ip: "192.168.1.3", lastActive: "3 days ago", current: false },
  ]

  const devices = [
    { name: "MacBook Pro", type: "laptop", added: "2 months ago", trusted: true },
    { name: "iPhone 15", type: "phone", added: "1 month ago", trusted: true },
  ]

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-[#EDE1CF] bg-white p-4">
        <h4 className="text-sm font-medium text-[#3B2515] flex items-center gap-2 mb-4">
          <KeyRound size={16} /> Change Password
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <input
            type="password"
            placeholder="Current password"
            value={passwords.current}
            onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
            className="rounded-xl border border-[#EDE1CF] px-3.5 py-2.5 text-sm text-[#3B2515] bg-white focus:outline-none focus:ring-2 focus:ring-[#B07B4F]/40"
          />
          <input
            type="password"
            placeholder="New password"
            value={passwords.new}
            onChange={(e) => setPasswords({ ...passwords, new: e.target.value })}
            className="rounded-xl border border-[#EDE1CF] px-3.5 py-2.5 text-sm text-[#3B2515] bg-white focus:outline-none focus:ring-2 focus:ring-[#B07B4F]/40"
          />
          <div className="flex gap-2">
            <input
              type="password"
              placeholder="Confirm new password"
              value={passwords.confirm}
              onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
              className="flex-1 rounded-xl border border-[#EDE1CF] px-3.5 py-2.5 text-sm text-[#3B2515] bg-white focus:outline-none focus:ring-2 focus:ring-[#B07B4F]/40"
            />
            <button
              onClick={handlePasswordChange}
              disabled={changingPassword || !passwords.current || !passwords.new || !passwords.confirm}
              className="rounded-full bg-[#3B2515] text-[#F3E5D3] px-4 py-2.5 text-sm font-medium hover:bg-[#4A2E18] transition-colors disabled:opacity-40"
            >
              {changingPassword ? "Updating..." : "Update"}
            </button>
          </div>
        </div>
        {passwordError && (
          <p className="text-xs text-rose-500 mt-2">{passwordError}</p>
        )}
        {passwordSuccess && (
          <p className="text-xs text-emerald-600 mt-2">{passwordSuccess}</p>
        )}
      </div>

      <div className="rounded-xl border border-[#EDE1CF] bg-white p-4">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-medium text-[#3B2515] flex items-center gap-2">
            <ShieldCheck size={16} /> Two-Factor Authentication
          </h4>
          <ToggleSwitch
            enabled={data.twoFactorEnabled}
            onChange={() => handleChange("twoFactorEnabled", !data.twoFactorEnabled)}
          />
        </div>
        {data.twoFactorEnabled && (
          <div className="bg-[#FBF6EF] rounded-xl p-4 text-sm text-[#7B4B2A]">
            <p>2FA is active. Use an authenticator app to generate verification codes.</p>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-[#EDE1CF] bg-white p-4">
        <h4 className="text-sm font-medium text-[#3B2515] flex items-center gap-2 mb-3">
          <History size={16} /> Login History
        </h4>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between text-xs text-[#A9805F] uppercase tracking-wide pb-1 border-b border-[#EDE1CF]">
            <span>Device</span><span>IP</span><span>Time</span>
          </div>
          {sessions.map((s, i) => (
            <div key={i} className="flex justify-between text-[#3B2515] py-1">
              <span className="flex items-center gap-1.5">
                {s.current && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
                {s.device}
              </span>
              <span className="text-[#9C8268]">{s.ip}</span>
              <span className="text-[#9C8268]">{s.lastActive}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-[#EDE1CF] bg-white p-4">
          <h4 className="text-sm font-medium text-[#3B2515] flex items-center gap-2 mb-3">
            <Monitor size={16} /> Active Sessions
          </h4>
          <p className="text-xs text-[#9C8268] mb-3">You have {sessions.length} active sessions</p>
          <div className="space-y-2">
            {sessions.map((s, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="text-[#3B2515]">{s.device}</span>
                {s.current ? (
                  <span className="text-xs text-emerald-600 font-medium">Current</span>
                ) : (
                  <button className="text-xs text-rose-500 hover:text-rose-700 transition-colors">Revoke</button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-[#EDE1CF] bg-white p-4">
          <h4 className="text-sm font-medium text-[#3B2515] flex items-center gap-2 mb-3">
            <Smartphone size={16} /> Trusted Devices
          </h4>
          <div className="space-y-2">
            {devices.map((d, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="text-[#3B2515]">{d.name}</span>
                <span className="text-xs text-[#9C8268]">{d.added}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <label className="text-xs text-[#A9805F] uppercase tracking-wide font-medium flex items-center gap-1.5 mb-1.5">
            <Timer size={13} /> Auto Logout Timer (minutes)
          </label>
          <input
            type="number"
            min="1"
            max="1440"
            value={data.autoLogoutTimer}
            onChange={(e) => handleChange("autoLogoutTimer", e.target.value)}
            className="w-full rounded-xl border border-[#EDE1CF] px-3.5 py-2.5 text-sm text-[#3B2515] bg-white focus:outline-none focus:ring-2 focus:ring-[#B07B4F]/40"
          />
          <p className="text-xs text-[#9C8268] mt-1">Users will be automatically logged out after inactivity</p>
        </div>

        <div>
          <label className="text-xs text-[#A9805F] uppercase tracking-wide font-medium flex items-center gap-1.5 mb-1.5">
            <FileText size={13} /> Password Policy
          </label>
          <select
            value={data.passwordPolicy}
            onChange={(e) => handleChange("passwordPolicy", e.target.value)}
            className="w-full rounded-xl border border-[#EDE1CF] px-3.5 py-2.5 text-sm text-[#3B2515] bg-white focus:outline-none focus:ring-2 focus:ring-[#B07B4F]/40"
          >
            {passwordPolicies.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  )
}
