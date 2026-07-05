import { useState, useMemo } from "react"
import { Search, ChevronDown, ChevronRight, CheckSquare, Square, X } from "lucide-react"
import { PERMISSION_GROUPS, ACTIONS, ACTION_LABELS, getAllPermissionKeys } from "./permissionData.js"

export default function PermissionMatrix({ selectedPermissions, onPermissionsChange }) {
  const [searchQuery, setSearchQuery] = useState("")
  const [collapsedGroups, setCollapsedGroups] = useState(new Set())

  const allKeys = useMemo(() => getAllPermissionKeys(), [])

  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim()) return PERMISSION_GROUPS
    const q = searchQuery.toLowerCase()
    return PERMISSION_GROUPS.filter((g) => {
      if (g.label.toLowerCase().includes(q)) return true
      return g.permissions.some((p) => p.label.toLowerCase().includes(q) || p.key.toLowerCase().includes(q))
    })
  }, [searchQuery])

  const toggleCollapse = (groupKey) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(groupKey)) next.delete(groupKey)
      else next.add(groupKey)
      return next
    })
  }

  const isGroupFullySelected = (group) =>
    group.permissions.every((p) => selectedPermissions.includes(p.key))

  const toggleGroup = (group) => {
    const allSelected = isGroupFullySelected(group)
    const updated = allSelected
      ? selectedPermissions.filter((k) => !group.permissions.some((p) => p.key === k))
      : [...new Set([...selectedPermissions, ...group.permissions.map((p) => p.key)])]
    onPermissionsChange(updated)
  }

  const togglePermission = (permKey) => {
    const updated = selectedPermissions.includes(permKey)
      ? selectedPermissions.filter((k) => k !== permKey)
      : [...selectedPermissions, permKey]
    onPermissionsChange(updated)
  }

  const selectAll = () => onPermissionsChange([...allKeys])
  const deselectAll = () => onPermissionsChange([])

  const selectedCount = selectedPermissions.length
  const totalCount = allKeys.length

  const getActionPermissions = (group, action) =>
    group.permissions.filter((p) => p.action === action)

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A9805F]" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search permissions..."
            className="w-full rounded-lg border border-[#EDE1CF] bg-white pl-8 pr-3 py-2 text-xs text-[#3B2515] outline-none focus:ring-2 focus:ring-[#B07B4F]/40"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#A9805F] hover:text-[#3B2515]">
              <X size={12} />
            </button>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-[#9C8268]">{selectedCount} of {totalCount} selected</span>
          <button onClick={selectAll} className="text-[#7B4B2A] hover:text-[#3B2515] font-medium transition-colors">Select All</button>
          <span className="text-[#EDE1CF]">|</span>
          <button onClick={deselectAll} className="text-[#7B4B2A] hover:text-[#3B2515] font-medium transition-colors">Clear</button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[600px]">
          <div className="grid grid-cols-[200px_repeat(5,1fr)] gap-px bg-[#EDE1CF] rounded-xl overflow-hidden">
            <div className="bg-[#FBF6EF] px-3.5 py-2.5 text-xs text-[#A9805F] uppercase tracking-wide font-medium">
              Permission Group
            </div>
            {ACTIONS.map((action) => (
              <div
                key={action}
                className="bg-[#FBF6EF] px-3.5 py-2.5 text-xs text-[#A9805F] uppercase tracking-wide font-medium text-center"
              >
                {ACTION_LABELS[action]}
              </div>
            ))}

            {filteredGroups.map((group) => {
              const fullySelected = isGroupFullySelected(group)
              const collapsed = collapsedGroups.has(group.key)

              return (
                <div key={group.key} className="contents">
                  <div
                    className="bg-white px-3.5 py-2.5 flex items-center gap-2 cursor-pointer hover:bg-[#FBF6EF]/50 transition-colors"
                    onClick={() => toggleCollapse(group.key)}
                  >
                    {collapsed ? <ChevronRight size={13} className="text-[#A9805F]" /> : <ChevronDown size={13} className="text-[#A9805F]" />}
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleGroup(group) }}
                      className="text-[#A9805F] hover:text-[#3B2515] transition-colors"
                    >
                      {fullySelected ? <CheckSquare size={14} className="text-[#B07B4F]" /> : <Square size={14} />}
                    </button>
                    <span className="text-sm text-[#3B2515] font-medium">{group.label}</span>
                    <span className="text-xs text-[#9C8268] ml-auto">
                      {group.permissions.filter((p) => selectedPermissions.includes(p.key)).length}/{group.permissions.length}
                    </span>
                  </div>

                  {ACTIONS.map((action) => {
                    const actionPerms = getActionPermissions(group, action)
                    return (
                      <div key={`${group.key}-${action}`} className="bg-white px-3.5 py-2.5 flex items-center justify-center gap-1.5">
                        {actionPerms.length > 0 ? (
                          collapsed ? (
                            <button
                              onClick={() => {
                                const allSelected = actionPerms.every((p) => selectedPermissions.includes(p.key))
                                const keys = actionPerms.map((p) => p.key)
                                const updated = allSelected
                                  ? selectedPermissions.filter((k) => !keys.includes(k))
                                  : [...new Set([...selectedPermissions, ...keys])]
                                onPermissionsChange(updated)
                              }}
                              className={`text-[#A9805F] hover:text-[#3B2515] ${actionPerms.length > 1 ? "relative" : ""}`}
                            >
                              {actionPerms.every((p) => selectedPermissions.includes(p.key)) ? (
                                <CheckSquare size={14} className="text-[#B07B4F]" />
                              ) : actionPerms.some((p) => selectedPermissions.includes(p.key)) ? (
                                <div className="w-3.5 h-3.5 rounded bg-[#B07B4F]/30 border border-[#B07B4F]" />
                              ) : (
                                <Square size={14} />
                              )}
                            </button>
                          ) : (
                            <div className="flex flex-col gap-1 items-center">
                              {actionPerms.map((perm) => (
                                <button
                                  key={perm.key}
                                  onClick={() => togglePermission(perm.key)}
                                  className="flex items-center gap-1.5 text-[11px] text-[#3B2515] hover:text-[#B07B4F] transition-colors whitespace-nowrap"
                                >
                                  {selectedPermissions.includes(perm.key) ? (
                                    <CheckSquare size={11} className="text-[#B07B4F]" />
                                  ) : (
                                    <Square size={11} />
                                  )}
                                  {perm.label}
                                </button>
                              ))}
                            </div>
                          )
                        ) : (
                          <span className="text-[#EDE1CF] text-xs">&mdash;</span>
                        )}
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {filteredGroups.length === 0 && (
        <div className="text-center py-8 text-sm text-[#9C8268]">
          No permissions match "{searchQuery}"
        </div>
      )}
    </div>
  )
}
