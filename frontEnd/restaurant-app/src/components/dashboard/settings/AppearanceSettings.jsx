import {
  PanelLeft, LayoutDashboard, Table, CreditCard, Sparkles, LayoutGrid, Image,
} from "lucide-react"

const sidebarStyles = [
  { value: "default", label: "Default", preview: "bg-[#2A1B12]" },
  { value: "compact", label: "Compact", preview: "bg-[#2A1B12] w-14" },
  { value: "gradient", label: "Gradient", preview: "bg-gradient-to-b from-[#2A1B12] to-[#4A2E18]" },
  { value: "minimal", label: "Minimal", preview: "bg-white ring-1 ring-[#EDE1CF]" },
]

const dashboardLayouts = [
  { value: "grid", label: "Grid", icon: LayoutGrid },
  { value: "list", label: "List", icon: LayoutDashboard },
  { value: "columns", label: "Columns", icon: PanelLeft },
]

const tableDensities = [
  { value: "compact", label: "Compact" },
  { value: "comfortable", label: "Comfortable" },
  { value: "spacious", label: "Spacious" },
]

const cardStyles = [
  { value: "elevated", label: "Elevated" },
  { value: "outlined", label: "Outlined" },
  { value: "flat", label: "Flat" },
  { value: "gradient", label: "Gradient" },
]

const widgets = [
  "Revenue Chart", "Orders Overview", "Top Products", "Recent Orders",
  "Customer Activity", "Inventory Status", "Staff Performance",
]

export default function AppearanceSettings({ data, onChange }) {
  const handleChange = (field, value) => {
    onChange("appearance", { ...data, [field]: value })
  }

  const toggleWidget = (widget) => {
    const updated = data.dashboardWidgets.includes(widget)
      ? data.dashboardWidgets.filter((w) => w !== widget)
      : [...data.dashboardWidgets, widget]
    handleChange("dashboardWidgets", updated)
  }

  return (
    <div className="space-y-6">
      <div>
        <label className="text-xs text-[#A9805F] uppercase tracking-wide font-medium flex items-center gap-1.5 mb-3">
          <PanelLeft size={13} /> Sidebar Style
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {sidebarStyles.map((s) => (
            <button
              key={s.value}
              onClick={() => handleChange("sidebarStyle", s.value)}
              className={`rounded-xl border-2 p-3 transition-all ${
                data.sidebarStyle === s.value
                  ? "border-[#B07B4F] bg-[#B07B4F]/10"
                  : "border-[#EDE1CF] hover:bg-[#FBF6EF]"
              }`}
            >
              <div className={`h-8 rounded-lg mb-2 ${s.preview}`} />
              <p className="text-xs text-[#3B2515] font-medium">{s.label}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <label className="text-xs text-[#A9805F] uppercase tracking-wide font-medium flex items-center gap-1.5 mb-3">
            <LayoutDashboard size={13} /> Dashboard Layout
          </label>
          <div className="flex gap-2">
            {dashboardLayouts.map((l) => {
              const Icon = l.icon
              return (
                <button
                  key={l.value}
                  onClick={() => handleChange("dashboardLayout", l.value)}
                  className={`flex-1 flex flex-col items-center gap-1.5 rounded-xl border-2 px-4 py-3 transition-all ${
                    data.dashboardLayout === l.value
                      ? "border-[#B07B4F] bg-[#B07B4F]/10"
                      : "border-[#EDE1CF] hover:bg-[#FBF6EF]"
                  }`}
                >
                  <Icon size={18} className={data.dashboardLayout === l.value ? "text-[#B07B4F]" : "text-[#A9805F]"} />
                  <span className="text-xs text-[#3B2515] font-medium">{l.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        <div>
          <label className="text-xs text-[#A9805F] uppercase tracking-wide font-medium flex items-center gap-1.5 mb-3">
            <Table size={13} /> Table Density
          </label>
          <div className="flex gap-2">
            {tableDensities.map((d) => (
              <button
                key={d.value}
                onClick={() => handleChange("tableDensity", d.value)}
                className={`flex-1 rounded-xl border-2 px-4 py-3 text-sm transition-all ${
                  data.tableDensity === d.value
                    ? "border-[#B07B4F] bg-[#B07B4F]/10 text-[#3B2515] font-medium"
                    : "border-[#EDE1CF] text-[#9C8268] hover:bg-[#FBF6EF]"
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <label className="text-xs text-[#A9805F] uppercase tracking-wide font-medium flex items-center gap-1.5 mb-3">
            <CreditCard size={13} /> Card Style
          </label>
          <div className="flex gap-2 flex-wrap">
            {cardStyles.map((c) => (
              <button
                key={c.value}
                onClick={() => handleChange("cardStyle", c.value)}
                className={`rounded-xl border-2 px-4 py-2 text-sm transition-all ${
                  data.cardStyle === c.value
                    ? "border-[#B07B4F] bg-[#B07B4F]/10 text-[#3B2515] font-medium"
                    : "border-[#EDE1CF] text-[#9C8268] hover:bg-[#FBF6EF]"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="flex items-center justify-between rounded-xl border border-[#EDE1CF] bg-white px-4 py-3">
            <span className="flex items-center gap-2.5 text-sm text-[#3B2515]">
              <Sparkles size={15} className="text-[#A9805F]" />
              Enable Animations
            </span>
            <div
              onClick={() => handleChange("animations", !data.animations)}
              className={`relative w-10 h-5.5 rounded-full transition-colors cursor-pointer ${data.animations ? "bg-[#B07B4F]" : "bg-[#EDE1CF]"}`}
            >
              <div
                className={`absolute top-0.5 left-0.5 w-4.5 h-4.5 rounded-full bg-white shadow-sm transition-transform ${data.animations ? "translate-x-4.5" : ""}`}
              />
            </div>
          </label>
        </div>
      </div>

      <div>
        <label className="text-xs text-[#A9805F] uppercase tracking-wide font-medium mb-3 block">
          <LayoutGrid size={13} className="inline mr-1.5" /> Dashboard Widgets
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {widgets.map((widget) => (
            <button
              key={widget}
              onClick={() => toggleWidget(widget)}
              className={`text-left rounded-lg border px-3 py-2 text-xs transition-all ${
                data.dashboardWidgets.includes(widget)
                  ? "border-[#B07B4F] bg-[#B07B4F]/10 text-[#3B2515] font-medium"
                  : "border-[#EDE1CF] text-[#9C8268] hover:bg-[#FBF6EF]"
              }`}
            >
              {widget}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-xs text-[#A9805F] uppercase tracking-wide font-medium flex items-center gap-1.5 mb-3">
          <Image size={13} /> Home Page Banner
        </label>
        <div className="flex items-center gap-4">
          <div className="w-32 h-16 rounded-xl bg-[#FBF6EF] ring-1 ring-[#EDE1CF] flex items-center justify-center overflow-hidden">
            {data.bannerUrl ? (
              <img src={data.bannerUrl} alt="Banner" className="w-full h-full object-cover" />
            ) : (
              <Image size={20} className="text-[#A9805F]" />
            )}
          </div>
          <label className="cursor-pointer rounded-full bg-white px-4 py-2 text-xs text-[#7B4B2A] ring-1 ring-[#EDE1CF] hover:bg-[#FBF6EF] transition-colors">
            Upload Banner
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleChange("bannerUrl", URL.createObjectURL(file))
              }}
            />
          </label>
        </div>
      </div>
    </div>
  )
}
