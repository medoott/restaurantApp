import useSettingsSection from "../../../hooks/useSettingsSection.js"
import SettingsToggle from "../../ui/SettingsToggle.jsx"
import {
  Calendar, CalendarDays, CalendarRange, BarChart3, FileText, FileSpreadsheet, FileDown,
} from "lucide-react"

const reportPeriods = [
  { key: "dailyReports", label: "Daily Reports", icon: Calendar },
  { key: "weeklyReports", label: "Weekly Reports", icon: CalendarDays },
  { key: "monthlyReports", label: "Monthly Reports", icon: CalendarRange },
  { key: "yearlyReports", label: "Yearly Reports", icon: BarChart3 },
]

const exportFormats = [
  { key: "pdf", label: "PDF", icon: FileText },
  { key: "excel", label: "Excel", icon: FileSpreadsheet },
  { key: "csv", label: "CSV", icon: FileDown },
]

export default function ReportSettings({ data, onChange }) {
  const { handleToggle } = useSettingsSection("reports", data, onChange)

  return (
    <div className="space-y-6">
      <div>
        <h4 className="text-xs text-[#A9805F] uppercase tracking-wide font-medium mb-3">Enabled Reports</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {reportPeriods.map(({ key, label, icon }) => (
            <SettingsToggle
              key={key}
              icon={icon}
              label={label}
              enabled={data[key]}
              onChange={() => handleToggle(key)}
            />
          ))}
        </div>
      </div>

      <div>
        <h4 className="text-xs text-[#A9805F] uppercase tracking-wide font-medium mb-3">Export Formats</h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {exportFormats.map(({ key, label, icon }) => (
            <SettingsToggle
              key={key}
              icon={icon}
              label={label}
              enabled={data[key]}
              onChange={() => handleToggle(key)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
