import useSettingsSection from "../../../hooks/useSettingsSection.js"
import SettingsToggle from "../../ui/SettingsToggle.jsx"
import {
  AlertTriangle, RefreshCw, ClipboardList, Bell,
} from "lucide-react"

export default function InventorySettings({ data, onChange }) {
  const { handleChange, handleToggle } = useSettingsSection("inventory", data, onChange)

  const toggles = [
    { key: "lowStockAlert", label: "Low Stock Alert", icon: AlertTriangle },
    { key: "automaticStockUpdate", label: "Automatic Stock Update", icon: RefreshCw },
    { key: "ingredientTracking", label: "Ingredient Tracking", icon: ClipboardList },
    { key: "purchaseAlerts", label: "Purchase Alerts", icon: Bell },
  ]

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {toggles.map(({ key, label, icon }) => (
          <SettingsToggle
            key={key}
            icon={icon}
            label={label}
            enabled={data[key]}
            onChange={() => handleToggle(key)}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <label className="text-xs text-[#A9805F] uppercase tracking-wide font-medium mb-1.5 block">
            Stock Threshold
          </label>
          <div className="flex items-center gap-3">
            <input
              type="number"
              min="1"
              max="9999"
              value={data.stockThreshold}
              onChange={(e) => handleChange("stockThreshold", e.target.value)}
              className="w-32 rounded-xl border border-[#EDE1CF] px-3.5 py-2.5 text-sm text-[#3B2515] bg-white focus:outline-none focus:ring-2 focus:ring-[#B07B4F]/40"
            />
            <span className="text-sm text-[#9C8268]">units</span>
          </div>
          <p className="text-xs text-[#9C8268] mt-1">Alert when stock falls below this threshold</p>
        </div>
      </div>
    </div>
  )
}
