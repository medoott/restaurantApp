import useSettingsSection from "../../../hooks/useSettingsSection.js"
import SettingsToggle from "../../ui/SettingsToggle.jsx"
import {
  ShoppingCart, Banknote, Calendar, User, UserCheck, Phone, ArrowDownNarrowWide,
  ArrowUpWideNarrow, Hash, Type,
} from "lucide-react"

export default function OrderingSettings({ data, onChange }) {
  const { handleChange, handleToggle } = useSettingsSection("ordering", data, onChange)

  const toggles = [
    { key: "enableOnlineOrdering", label: "Enable Online Ordering", icon: ShoppingCart },
    { key: "enableCashOrders", label: "Enable Cash Orders", icon: Banknote },
    { key: "enableScheduledOrders", label: "Enable Scheduled Orders", icon: Calendar },
    { key: "enableGuestOrders", label: "Enable Guest Orders", icon: User },
    { key: "requireCustomerName", label: "Require Customer Name", icon: UserCheck },
    { key: "requirePhoneNumber", label: "Require Phone Number", icon: Phone },
    { key: "autoGenerateOrderNumber", label: "Auto Generate Order Number", icon: Hash },
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div>
          <label className="text-xs text-[#A9805F] uppercase tracking-wide font-medium flex items-center gap-1.5 mb-1.5">
            <ArrowDownNarrowWide size={13} /> Minimum Order Amount
          </label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#A9805F] text-sm">$</span>
            <input
              type="number"
              min="0"
              step="0.5"
              value={data.minOrderAmount}
              onChange={(e) => handleChange("minOrderAmount", e.target.value)}
              className="w-full rounded-xl border border-[#EDE1CF] pl-8 pr-3.5 py-2.5 text-sm text-[#3B2515] bg-white focus:outline-none focus:ring-2 focus:ring-[#B07B4F]/40"
            />
          </div>
        </div>

        <div>
          <label className="text-xs text-[#A9805F] uppercase tracking-wide font-medium flex items-center gap-1.5 mb-1.5">
            <ArrowUpWideNarrow size={13} /> Maximum Order Amount
          </label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#A9805F] text-sm">$</span>
            <input
              type="number"
              min="0"
              step="0.5"
              value={data.maxOrderAmount}
              onChange={(e) => handleChange("maxOrderAmount", e.target.value)}
              className="w-full rounded-xl border border-[#EDE1CF] pl-8 pr-3.5 py-2.5 text-sm text-[#3B2515] bg-white focus:outline-none focus:ring-2 focus:ring-[#B07B4F]/40"
            />
          </div>
        </div>

        <div>
          <label className="text-xs text-[#A9805F] uppercase tracking-wide font-medium flex items-center gap-1.5 mb-1.5">
            <Hash size={13} /> Maximum Quantity Per Item
          </label>
          <input
            type="number"
            min="1"
            max="999"
            value={data.maxQuantityPerItem}
            onChange={(e) => handleChange("maxQuantityPerItem", e.target.value)}
            className="w-full rounded-xl border border-[#EDE1CF] px-3.5 py-2.5 text-sm text-[#3B2515] bg-white focus:outline-none focus:ring-2 focus:ring-[#B07B4F]/40"
          />
        </div>
      </div>

      {data.autoGenerateOrderNumber && (
        <div>
          <label className="text-xs text-[#A9805F] uppercase tracking-wide font-medium flex items-center gap-1.5 mb-1.5">
            <Type size={13} /> Order Prefix
          </label>
          <input
            value={data.orderPrefix}
            onChange={(e) => handleChange("orderPrefix", e.target.value)}
            className="w-full max-w-xs rounded-xl border border-[#EDE1CF] px-3.5 py-2.5 text-sm text-[#3B2515] bg-white focus:outline-none focus:ring-2 focus:ring-[#B07B4F]/40"
            placeholder="ORD-"
          />
          <p className="text-xs text-[#9C8268] mt-1">Orders will be numbered like: {data.orderPrefix}1001</p>
        </div>
      )}
    </div>
  )
}
