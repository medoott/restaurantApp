import useSettingsSection from "../../../hooks/useSettingsSection.js"
import SettingsToggle from "../../ui/SettingsToggle.jsx"
import {
  Hash, Award, Gift, Cake, Users, FileText,
} from "lucide-react"

const codeFormats = [
  { value: "CUST-{NUMBER}", label: "CUST-0001" },
  { value: "{NUMBER}", label: "0001" },
  { value: "GUEST-{NUMBER}", label: "GUEST-0001" },
  { value: "{YEAR}-{NUMBER}", label: "2026-0001" },
]

export default function CustomerSettings({ data, onChange }) {
  const { handleChange, handleToggle } = useSettingsSection("customer", data, onChange)

  const toggles = [
    { key: "loyaltyPoints", label: "Loyalty Points", icon: Award },
    { key: "rewards", label: "Rewards", icon: Gift },
    { key: "birthdayRewards", label: "Birthday Rewards", icon: Cake },
    { key: "referralRewards", label: "Referral Rewards", icon: Users },
    { key: "customerNotes", label: "Customer Notes", icon: FileText },
  ]

  return (
    <div className="space-y-6">
      <div>
        <label className="text-xs text-[#A9805F] uppercase tracking-wide font-medium flex items-center gap-1.5 mb-1.5">
          <Hash size={13} /> Customer Code Format
        </label>
        <select
          value={data.codeFormat}
          onChange={(e) => handleChange("codeFormat", e.target.value)}
          className="w-full max-w-xs rounded-xl border border-[#EDE1CF] px-3.5 py-2.5 text-sm text-[#3B2515] bg-white focus:outline-none focus:ring-2 focus:ring-[#B07B4F]/40"
        >
          {codeFormats.map((f) => (
            <option key={f.value} value={f.value}>{f.label}</option>
          ))}
        </select>
        <p className="text-xs text-[#9C8268] mt-1">
          Preview: {data.codeFormat.replace("{NUMBER}", "0001").replace("{YEAR}", "2026")}
        </p>
      </div>

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

      {data.loyaltyPoints && (
        <div>
          <label className="text-xs text-[#A9805F] uppercase tracking-wide font-medium mb-1.5 block">
            Points Per Dollar
          </label>
          <input
            type="number"
            min="1"
            max="100"
            value={data.pointsPerDollar}
            onChange={(e) => handleChange("pointsPerDollar", e.target.value)}
            className="w-full max-w-xs rounded-xl border border-[#EDE1CF] px-3.5 py-2.5 text-sm text-[#3B2515] bg-white focus:outline-none focus:ring-2 focus:ring-[#B07B4F]/40"
          />
          <p className="text-xs text-[#9C8268] mt-1">Customers earn 1 point per ${data.pointsPerDollar} spent</p>
        </div>
      )}
    </div>
  )
}
