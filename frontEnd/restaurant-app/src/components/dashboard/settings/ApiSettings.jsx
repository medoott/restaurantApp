import { useState } from "react"
import {
  Key, RefreshCw, Webhook, Globe, Gauge, Eye, EyeOff, Copy, Check,
} from "lucide-react"

export default function ApiSettings({ data, onChange }) {
  const [showKey, setShowKey] = useState(false)
  const [copied, setCopied] = useState(false)
  const [regenerating, setRegenerating] = useState(false)

  const handleChange = (field, value) => {
    onChange("api", { ...data, [field]: value })
  }

  const handleRegenerate = () => {
    setRegenerating(true)
    setTimeout(() => {
      const newKey = "sk_live_" + Array.from({ length: 40 }, () =>
        "abcdefghijklmnopqrstuvwxyz0123456789".charAt(Math.floor(Math.random() * 36))
      ).join("")
      handleChange("apiKey", newKey)
      setRegenerating(false)
    }, 1500)
  }

  const handleCopy = () => {
    navigator.clipboard?.writeText(data.apiKey)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-6">
      <div>
        <label className="text-xs text-[#A9805F] uppercase tracking-wide font-medium flex items-center gap-1.5 mb-1.5">
          <Key size={13} /> API Key
        </label>
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <input
              type={showKey ? "text" : "password"}
              value={data.apiKey}
              readOnly
              className="w-full rounded-xl border border-[#EDE1CF] px-3.5 py-2.5 pr-20 text-sm text-[#3B2515] bg-[#FBF6EF] font-mono focus:outline-none"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              <button
                onClick={() => setShowKey(!showKey)}
                className="p-1.5 text-[#A9805F] hover:text-[#3B2515] transition-colors"
              >
                {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
              <button
                onClick={handleCopy}
                className="p-1.5 text-[#A9805F] hover:text-[#3B2515] transition-colors"
              >
                {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
              </button>
            </div>
          </div>
          <button
            onClick={handleRegenerate}
            disabled={regenerating}
            className="flex items-center gap-1.5 rounded-full border border-[#EDE1CF] px-4 py-2.5 text-sm text-[#7B4B2A] hover:bg-[#FBF6EF] transition-colors disabled:opacity-50"
          >
            <RefreshCw size={14} className={regenerating ? "animate-spin" : ""} />
            Regenerate
          </button>
        </div>
        <p className="text-xs text-[#9C8268] mt-1">Keep this key secret. Regenerate if compromised.</p>
      </div>

      <div>
        <label className="text-xs text-[#A9805F] uppercase tracking-wide font-medium flex items-center gap-1.5 mb-1.5">
          <Webhook size={13} /> Webhook URL
        </label>
        <input
          value={data.webhookUrl}
          onChange={(e) => handleChange("webhookUrl", e.target.value)}
          className="w-full rounded-xl border border-[#EDE1CF] px-3.5 py-2.5 text-sm text-[#3B2515] bg-white focus:outline-none focus:ring-2 focus:ring-[#B07B4F]/40"
          placeholder="https://api.yourdomain.com/webhooks"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <label className="text-xs text-[#A9805F] uppercase tracking-wide font-medium flex items-center gap-1.5 mb-1.5">
            <Globe size={13} /> CORS Origins
          </label>
          <textarea
            value={data.corsOrigins}
            onChange={(e) => handleChange("corsOrigins", e.target.value)}
            rows={3}
            className="w-full rounded-xl border border-[#EDE1CF] px-3.5 py-2.5 text-sm text-[#3B2515] bg-white focus:outline-none focus:ring-2 focus:ring-[#B07B4F]/40 resize-none"
            placeholder="https://yourdomain.com&#10;https://admin.yourdomain.com"
          />
          <p className="text-xs text-[#9C8268] mt-1">One origin per line</p>
        </div>

        <div>
          <label className="text-xs text-[#A9805F] uppercase tracking-wide font-medium flex items-center gap-1.5 mb-1.5">
            <Gauge size={13} /> Rate Limit (requests/minute)
          </label>
          <input
            type="number"
            min="10"
            max="10000"
            step="10"
            value={data.rateLimit}
            onChange={(e) => handleChange("rateLimit", e.target.value)}
            className="w-full rounded-xl border border-[#EDE1CF] px-3.5 py-2.5 text-sm text-[#3B2515] bg-white focus:outline-none focus:ring-2 focus:ring-[#B07B4F]/40"
          />
        </div>
      </div>
    </div>
  )
}
