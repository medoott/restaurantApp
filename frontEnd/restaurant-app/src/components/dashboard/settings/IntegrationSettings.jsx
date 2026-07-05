import { useState } from "react"
import {
  Zap, CircleDollarSign, Map, Cloud, Flame, Mail, MessageSquare, Smartphone,
  Eye, EyeOff,
} from "lucide-react"

const integrations = [
  {
    key: "stripe", label: "Stripe", icon: Zap, desc: "Payment processing",
    fields: [{ key: "publishableKey", label: "Publishable Key", type: "text" }, { key: "secretKey", label: "Secret Key", type: "password" }],
  },
  {
    key: "paypal", label: "PayPal", icon: CircleDollarSign, desc: "Payment gateway",
    fields: [{ key: "clientId", label: "Client ID", type: "text" }, { key: "clientSecret", label: "Client Secret", type: "password" }],
  },
  {
    key: "googleMaps", label: "Google Maps", icon: Map, desc: "Location & directions",
    fields: [{ key: "apiKey", label: "API Key", type: "password" }],
  },
  {
    key: "cloudinary", label: "Cloudinary", icon: Cloud, desc: "Image hosting",
    fields: [{ key: "cloudName", label: "Cloud Name", type: "text" }, { key: "apiKey", label: "API Key", type: "password" }, { key: "apiSecret", label: "API Secret", type: "password" }],
  },
  {
    key: "firebase", label: "Firebase", icon: Flame, desc: "Real-time data & notifications",
    fields: [{ key: "projectId", label: "Project ID", type: "text" }, { key: "apiKey", label: "API Key", type: "password" }],
  },
  {
    key: "smtp", label: "SMTP Email", icon: Mail, desc: "Email sending",
    fields: [{ key: "host", label: "SMTP Host", type: "text" }, { key: "port", label: "Port", type: "text" }, { key: "username", label: "Username", type: "text" }, { key: "password", label: "Password", type: "password" }],
  },
  {
    key: "smsGateway", label: "SMS Gateway", icon: MessageSquare, desc: "SMS notifications",
    fields: [{ key: "provider", label: "Provider", type: "text" }, { key: "apiKey", label: "API Key", type: "password" }],
  },
  {
    key: "whatsapp", label: "WhatsApp Business API", icon: Smartphone, desc: "WhatsApp messaging",
    fields: [{ key: "phoneNumberId", label: "Phone Number ID", type: "text" }, { key: "accessToken", label: "Access Token", type: "password" }],
  },
]

export default function IntegrationSettings({ data, onChange }) {
  const [visibleFields, setVisibleFields] = useState({})

  const toggleVisibility = (integrationKey, fieldKey) => {
    setVisibleFields((prev) => ({
      ...prev,
      [`${integrationKey}-${fieldKey}`]: !prev[`${integrationKey}-${fieldKey}`],
    }))
  }

  const handleToggle = (key) => {
    const currentIntegrations = data.integrations || []
    const updated = currentIntegrations.map((i) =>
      i.key === key ? { ...i, enabled: !i.enabled } : i
    )
    onChange("integrations", { ...data, integrations: updated })
  }

  const handleFieldChange = (integrationKey, fieldKey, value) => {
    const currentIntegrations = data.integrations || []
    const updated = currentIntegrations.map((i) => {
      if (i.key !== integrationKey) return i
      return {
        ...i,
        fields: (i.fields || []).map((f) =>
          f.key === fieldKey ? { ...f, value } : f
        ),
      }
    })
    onChange("integrations", { ...data, integrations: updated })
  }

  return (
    <div className="space-y-4">
      {(data.integrations || []).map((integration) => {
        const meta = integrations.find((m) => m.key === integration.key)
        if (!meta) return null
        const Icon = meta.icon
        return (
          <div
            key={integration.key}
            className="rounded-xl border border-[#EDE1CF] bg-white overflow-hidden"
          >
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-[#FBF6EF] ring-1 ring-[#EDE1CF] flex items-center justify-center">
                  <Icon size={16} className="text-[#7B4B2A]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-[#3B2515]">{meta.label}</p>
                    {integration.enabled ? (
                      <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full font-medium">Connected</span>
                    ) : (
                      <span className="text-xs text-[#9C8268] bg-[#FBF6EF] px-2 py-0.5 rounded-full">Disconnected</span>
                    )}
                  </div>
                  <p className="text-xs text-[#9C8268]">{meta.desc}</p>
                </div>
              </div>
              <div
                onClick={() => handleToggle(integration.key)}
                className={`relative w-10 h-5.5 rounded-full transition-colors cursor-pointer ${integration.enabled ? "bg-emerald-400" : "bg-[#EDE1CF]"}`}
              >
                <div
                  className={`absolute top-0.5 left-0.5 w-4.5 h-4.5 rounded-full bg-white shadow-sm transition-transform ${integration.enabled ? "translate-x-4.5" : ""}`}
                />
              </div>
            </div>

            {integration.enabled && (
              <div className="border-t border-[#EDE1CF] px-4 py-3 space-y-3 bg-[#FBF6EF]/50">
                {integration.fields.map((field) => {
                  const fieldMeta = meta.fields?.find((m) => m.key === field.key)
                  const fieldLabel = fieldMeta?.label || field.label || field.key
                  return <div key={field.key}>
                    <label className="text-xs text-[#A9805F] uppercase tracking-wide font-medium mb-1 block">{fieldLabel}</label>
                    <div className="relative">
                      <input
                        type={field.type === "password" && !visibleFields[`${integration.key}-${field.key}`] ? "password" : "text"}
                        value={field.value || ""}
                        onChange={(e) => handleFieldChange(integration.key, field.key, e.target.value)}
                        className="w-full rounded-xl border border-[#EDE1CF] px-3.5 py-2 pr-10 text-sm text-[#3B2515] bg-white focus:outline-none focus:ring-2 focus:ring-[#B07B4F]/40"
                        placeholder={`Enter ${fieldLabel.toLowerCase()}`}
                      />
                      {field.type === "password" && (
                        <button
                          onClick={() => toggleVisibility(integration.key, field.key)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A9805F] hover:text-[#3B2515]"
                        >
                          {visibleFields[`${integration.key}-${field.key}`] ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      )}
                    </div>
                  </div>
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
