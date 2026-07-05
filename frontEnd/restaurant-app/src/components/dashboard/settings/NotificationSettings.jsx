import SettingsToggle from "../../ui/SettingsToggle.jsx"
import {
  Bell, XCircle, Wallet, CheckCircle, FileText,
  CalendarDays, CalendarRange, Volume2, Volume, Volume1,
  Globe, Mail, MessageSquare, Smartphone, Send,
} from "lucide-react"

const notificationEvents = [
  { key: "newOrder", label: "New Order", icon: Bell },
  { key: "cancelledOrder", label: "Cancelled Order", icon: XCircle },
  { key: "paymentReceived", label: "Payment Received", icon: Wallet },
  { key: "readyOrder", label: "Ready Order", icon: CheckCircle },
  { key: "dailyReport", label: "Daily Report", icon: FileText },
  { key: "weeklyReport", label: "Weekly Report", icon: CalendarDays },
  { key: "monthlyReport", label: "Monthly Report", icon: CalendarRange },
]

const channels = [
  { key: "browser", label: "Browser Notifications", icon: Globe },
  { key: "email", label: "Email", icon: Mail },
  { key: "sms", label: "SMS", icon: MessageSquare },
  { key: "whatsapp", label: "WhatsApp", icon: Smartphone },
  { key: "telegram", label: "Telegram", icon: Send },
]

const sounds = [
  { value: "chime", label: "Chime" },
  { value: "bell", label: "Bell" },
  { value: "ping", label: "Ping" },
  { value: "digital", label: "Digital" },
  { value: "pop", label: "Pop" },
  { value: "none", label: "None" },
]

export default function NotificationSettings({ data, onChange }) {
  const handleToggleEvent = (key) => {
    const currentEvents = data.events || []
    const updated = currentEvents.map((e) =>
      e.key === key ? { ...e, enabled: !e.enabled } : e
    )
    onChange("notifications", { ...data, events: updated })
  }

  const handleToggleChannel = (key) => {
    const currentChannels = data.channels || []
    const updated = currentChannels.map((c) =>
      c.key === key ? { ...c, enabled: !c.enabled } : c
    )
    onChange("notifications", { ...data, channels: updated })
  }

  const handleChange = (field, value) => {
    onChange("notifications", { ...data, [field]: value })
  }

  const VolumeIcon = data.volume === 0 ? Volume : data.volume < 50 ? Volume1 : Volume2

  return (
    <div className="space-y-6">
      <div>
        <h4 className="text-xs text-[#A9805F] uppercase tracking-wide font-medium mb-3">Events</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {(data.events || []).map((ev) => {
            const meta = notificationEvents.find((n) => n.key === ev.key)
            if (!meta) return null
            return (
              <SettingsToggle
                key={ev.key}
                icon={meta.icon}
                label={meta.label}
                enabled={ev.enabled}
                onChange={() => handleToggleEvent(ev.key)}
              />
            )
          })}
        </div>
      </div>

      <div>
        <h4 className="text-xs text-[#A9805F] uppercase tracking-wide font-medium mb-3">Channels</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {(data.channels || []).map((ch) => {
            const meta = channels.find((c) => c.key === ch.key)
            if (!meta) return null
            return (
              <SettingsToggle
                key={ch.key}
                icon={meta.icon}
                label={meta.label}
                enabled={ch.enabled}
                onChange={() => handleToggleChannel(ch.key)}
              />
            )
          })}
        </div>
      </div>

      <div>
        <h4 className="text-xs text-[#A9805F] uppercase tracking-wide font-medium mb-3">Notification Sound</h4>
        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2.5 cursor-pointer">
            <div
              onClick={() => handleChange("soundEnabled", !data.soundEnabled)}
              className={`relative w-10 h-5.5 rounded-full transition-colors cursor-pointer ${data.soundEnabled ? "bg-[#B07B4F]" : "bg-[#EDE1CF]"}`}
            >
              <div
                className={`absolute top-0.5 left-0.5 w-4.5 h-4.5 rounded-full bg-white shadow-sm transition-transform ${data.soundEnabled ? "translate-x-4.5" : ""}`}
              />
            </div>
            <span className="text-sm text-[#3B2515]">Enable Sound</span>
          </label>

          {data.soundEnabled && (
            <>
              <div className="flex items-center gap-2">
                <VolumeIcon size={16} className="text-[#A9805F]" />
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={data.volume}
                  onChange={(e) => handleChange("volume", Number(e.target.value))}
                  className="w-24 accent-[#B07B4F]"
                />
                <span className="text-xs text-[#9C8268] w-8">{data.volume}%</span>
              </div>

              <select
                value={data.sound}
                onChange={(e) => handleChange("sound", e.target.value)}
                className="rounded-xl border border-[#EDE1CF] px-3.5 py-2 text-sm text-[#3B2515] bg-white focus:outline-none focus:ring-2 focus:ring-[#B07B4F]/40"
              >
                {sounds.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
