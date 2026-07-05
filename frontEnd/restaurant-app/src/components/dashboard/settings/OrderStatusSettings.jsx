import { useState } from "react"
import { Plus, Trash2, GripVertical } from "lucide-react"

const colorOptions = [
  { value: "bg-amber-100 text-amber-700 ring-amber-300", label: "Amber", dot: "bg-amber-400" },
  { value: "bg-orange-100 text-orange-700 ring-orange-300", label: "Orange", dot: "bg-orange-400" },
  { value: "bg-emerald-100 text-emerald-700 ring-emerald-300", label: "Emerald", dot: "bg-emerald-400" },
  { value: "bg-sky-100 text-sky-700 ring-sky-300", label: "Sky", dot: "bg-sky-400" },
  { value: "bg-indigo-100 text-indigo-700 ring-indigo-300", label: "Indigo", dot: "bg-indigo-400" },
  { value: "bg-rose-100 text-rose-700 ring-rose-300", label: "Rose", dot: "bg-rose-400" },
  { value: "bg-stone-100 text-stone-600 ring-stone-300", label: "Stone", dot: "bg-stone-400" },
  { value: "bg-lime-100 text-lime-700 ring-lime-300", label: "Lime", dot: "bg-lime-400" },
]

export default function OrderStatusSettings({ data, onChange }) {
  const [newStatusName, setNewStatusName] = useState("")
  const [newStatusColor, setNewStatusColor] = useState(colorOptions[0].value)

  const handleAdd = () => {
    if (!newStatusName.trim()) return
    const currentStatuses = data.statuses || []
    if (currentStatuses.some((s) => s.name.toLowerCase() === newStatusName.trim().toLowerCase())) return
    const updated = [...currentStatuses, { name: newStatusName.trim(), color: newStatusColor }]
    onChange("orderStatuses", { ...data, statuses: updated })
    setNewStatusName("")
  }

  const handleDelete = (index) => {
    const currentStatuses = data.statuses || []
    const updated = currentStatuses.filter((_, i) => i !== index)
    onChange("orderStatuses", { ...data, statuses: updated })
  }

  const handleColorChange = (index, color) => {
    const currentStatuses = data.statuses || []
    const updated = [...currentStatuses]
    updated[index] = { ...updated[index], color }
    onChange("orderStatuses", { ...data, statuses: updated })
  }

  const moveStatus = (from, to) => {
    const currentStatuses = data.statuses || []
    if (to < 0 || to >= currentStatuses.length) return
    const updated = [...currentStatuses]
    const [moved] = updated.splice(from, 1)
    updated.splice(to, 0, moved)
    onChange("orderStatuses", { ...data, statuses: updated })
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <input
          value={newStatusName}
          onChange={(e) => setNewStatusName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          placeholder="New status name..."
          className="flex-1 rounded-xl border border-[#EDE1CF] px-3.5 py-2.5 text-sm text-[#3B2515] bg-white focus:outline-none focus:ring-2 focus:ring-[#B07B4F]/40"
        />
        <select
          value={newStatusColor}
          onChange={(e) => setNewStatusColor(e.target.value)}
          className="rounded-xl border border-[#EDE1CF] px-3 py-2.5 text-sm text-[#3B2515] bg-white focus:outline-none focus:ring-2 focus:ring-[#B07B4F]/40"
        >
          {colorOptions.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
        <button
          onClick={handleAdd}
          className="flex items-center gap-1.5 rounded-full bg-[#3B2515] text-[#F3E5D3] px-4 py-2.5 text-sm font-medium hover:bg-[#4A2E18] transition-colors"
        >
          <Plus size={14} /> Add
        </button>
      </div>

      <div className="space-y-2">
        {(data.statuses || []).map((status, i) => (
          <div
            key={`${status.name}-${i}`}
            className="flex items-center gap-3 rounded-xl bg-white ring-1 ring-[#EDE1CF] px-3.5 py-2.5"
          >
            <button
              onClick={() => moveStatus(i, i - 1)}
              disabled={i === 0}
              className="text-[#A9805F] hover:text-[#3B2515] disabled:opacity-20 disabled:cursor-not-allowed"
            >
              <GripVertical size={15} />
            </button>

            <span className="flex-1 text-sm text-[#3B2515] font-medium">{status.name}</span>

            <div className="flex items-center gap-2">
              <select
                value={status.color}
                onChange={(e) => handleColorChange(i, e.target.value)}
                className="rounded-lg border border-[#EDE1CF] px-2 py-1 text-xs text-[#3B2515] bg-white focus:outline-none"
              >
                {colorOptions.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>

              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${status.color}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${colorOptions.find(c => c.value === status.color)?.dot || "bg-current"}`} />
                {status.name}
              </span>
            </div>

            <button
              onClick={() => handleDelete(i)}
              className="text-rose-400 hover:text-rose-600 transition-colors p-1"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>

      {(data.statuses || []).length === 0 && (
        <p className="text-center text-sm text-[#9C8268] py-8">No custom statuses added yet.</p>
      )}
    </div>
  )
}
