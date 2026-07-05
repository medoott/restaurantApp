import { useMemo } from "react"
import { CheckCircle2, XCircle, Eye, EyeOff } from "lucide-react"
import { PERMISSION_GROUPS, getAllPermissionKeys } from "./permissionData.js"

export default function RolePreview({ role }) {
  const stats = useMemo(() => {
    if (!role || !role.permissions) {
      return { total: 0, granted: 0, groups: [] }
    }
    const allKeys = getAllPermissionKeys()
    const granted = role.permissions.length
    return {
      total: allKeys.length,
      granted,
      denied: allKeys.length - granted,
      groups: PERMISSION_GROUPS.map((group) => ({
        ...group,
        grantedCount: group.permissions.filter((p) => role.permissions.includes(p.key)).length,
        totalCount: group.permissions.length,
        permissions: group.permissions.map((p) => ({
          ...p,
          enabled: role.permissions.includes(p.key),
        })),
      })),
    }
  }, [role])

  if (!role) {
    return (
      <div className="text-center py-8 text-sm text-[#9C8268]">
        Select a role to preview its permissions
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-4">
        <div className={`px-3 py-1 rounded-full text-xs font-medium ${role.color || "bg-stone-100 text-stone-600"}`}>
          {role.name}
        </div>
        <div className="flex gap-3 text-xs text-[#9C8268]">
          <span className="flex items-center gap-1">
            <CheckCircle2 size={12} className="text-emerald-500" />
            {stats.granted} allowed
          </span>
          <span className="flex items-center gap-1">
            <XCircle size={12} className="text-rose-400" />
            {stats.denied} restricted
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {stats.groups.map((group) => (
          <div
            key={group.key}
            className="rounded-xl border border-[#EDE1CF] bg-white overflow-hidden"
          >
            <div className="flex items-center justify-between px-3.5 py-2 bg-[#FBF6EF] border-b border-[#EDE1CF]">
              <span className="text-xs font-medium text-[#3B2515]">{group.label}</span>
              <span className="text-[10px] text-[#9C8268]">
                {group.grantedCount}/{group.totalCount}
              </span>
            </div>
            <div className="px-3.5 py-2 space-y-1">
              {group.permissions.map((perm) => (
                <div
                  key={perm.key}
                  className={`flex items-center gap-1.5 text-[11px] ${
                    perm.enabled ? "text-[#3B2515]" : "text-[#C9B496]"
                  }`}
                >
                  {perm.enabled ? (
                    <Eye size={10} className="text-emerald-500 shrink-0" />
                  ) : (
                    <EyeOff size={10} className="text-rose-300 shrink-0" />
                  )}
                  {perm.label}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
