import useSettingsSection from "../../../hooks/useSettingsSection.js"
import SettingsToggle from "../../ui/SettingsToggle.jsx"
import { ListOrdered, Search, Star, Image, Flame, ClipboardList, Eye, Sparkles, ArrowUpDown } from "lucide-react"

const sortOptions = [
  { value: "name-asc", label: "Name (A-Z)" },
  { value: "name-desc", label: "Name (Z-A)" },
  { value: "price-asc", label: "Price (Low to High)" },
  { value: "price-desc", label: "Price (High to Low)" },
  { value: "category", label: "Category" },
  { value: "popularity", label: "Popularity" },
  { value: "newest", label: "Newest First" },
]

export default function MenuSettings({ data, onChange }) {
  const { handleToggle } = useSettingsSection("menu", data, onChange)

  const toggles = [
    { key: "enableCategories", label: "Enable Categories", icon: ListOrdered },
    { key: "enableProductSearch", label: "Enable Product Search", icon: Search },
    { key: "enableProductRatings", label: "Enable Product Ratings", icon: Star },
    { key: "enableProductImages", label: "Enable Product Images", icon: Image },
    { key: "showCalories", label: "Show Calories", icon: Flame },
    { key: "showIngredients", label: "Show Ingredients", icon: ClipboardList },
    { key: "markAvailable", label: "Mark Products as Available/Unavailable", icon: Eye },
    { key: "featuredProducts", label: "Featured Products", icon: Sparkles },
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
          <label className="text-xs text-[#A9805F] uppercase tracking-wide font-medium flex items-center gap-1.5 mb-1.5">
            <ArrowUpDown size={13} /> Product Sorting
          </label>
          <select
            value={data.productSorting}
            onChange={(e) => onChange("menu", { ...data, productSorting: e.target.value })}
            className="w-full rounded-xl border border-[#EDE1CF] px-3.5 py-2.5 text-sm text-[#3B2515] bg-white focus:outline-none focus:ring-2 focus:ring-[#B07B4F]/40"
          >
            {sortOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  )
}
