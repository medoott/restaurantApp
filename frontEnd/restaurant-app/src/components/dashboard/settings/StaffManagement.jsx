import { useState, useMemo, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Shield, Users, ClipboardList, Lock, Building2, Search, Plus, Trash2, Copy,
  CheckCircle2, XCircle, AlertTriangle, UserCheck, UserX,
  Key, History, Monitor, Smartphone, Timer, FileText, LogOut,
  Eye, EyeOff, Mail, Phone, Calendar, Clock, Ban, CheckCircle,
  Square, CheckSquare, RotateCcw,
} from "lucide-react"
import {
  DEFAULT_ROLES, MOCK_USERS, AUDIT_LOGS, BRANCHES, PERMISSION_GROUPS,
} from "./rbac/permissionData.js"
import {
  computeEffectivePermissions,
  getPermissionKeysForRole,
} from "../../../utils/permissions.js"
import PermissionMatrix from "./rbac/PermissionMatrix.jsx"
import RolePreview from "./rbac/RolePreview.jsx"

const TABS = [
  { key: "roles", label: "Roles", icon: Shield },
  { key: "users", label: "Users", icon: Users },
  { key: "audit", label: "Audit Logs", icon: ClipboardList },
  { key: "security", label: "Security", icon: Lock },
  { key: "branches", label: "Branches", icon: Building2 },
]

const STATUS_OPTIONS = ["active", "inactive", "locked"]
const MODULE_OPTIONS = ["All", ...new Set(AUDIT_LOGS.map((l) => l.module))]
const STATUS_LOG_OPTIONS = ["All", "success", "failed", "denied"]

export default function StaffManagement({ data, onChange }) {
  const [activeTab, setActiveTab] = useState("roles")

  const [roles, setRoles] = useState(() => data?.roles || DEFAULT_ROLES)
  const [users, setUsers] = useState(() => data?.users || MOCK_USERS)
  const [auditLogs] = useState(() => data?.auditLogs || AUDIT_LOGS)

  const syncData = (newRoles, newUsers) => {
    const payload = { roles: newRoles || roles, users: newUsers || users, auditLogs }
    onChange("staff", payload)
  }

  return (
    <div className="space-y-5">
      <div className="flex gap-1 bg-[#FBF6EF] rounded-xl p-1 ring-1 ring-[#EDE1CF] overflow-x-auto">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
              activeTab === key
                ? "bg-white text-[#3B2515] shadow-sm ring-1 ring-[#EDE1CF]"
                : "text-[#9C8268] hover:text-[#7B4B2A]"
            }`}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.12 }}
        >
          {activeTab === "roles" && (
            <RolesTab roles={roles} setRoles={(r) => { setRoles(r); syncData(r, users) }} />
          )}
          {activeTab === "users" && (
            <UsersTab
              users={users}
              roles={roles}
              setUsers={(u) => { setUsers(u); syncData(roles, u) }}
            />
          )}
          {activeTab === "audit" && <AuditTab logs={auditLogs} />}
          {activeTab === "security" && <SecurityTab />}
          {activeTab === "branches" && <BranchesTab />}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

function RolesTab({ roles, setRoles }) {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedRoleId, setSelectedRoleId] = useState(roles[0]?.id || null)
  const [showMatrix, setShowMatrix] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newRole, setNewRole] = useState({ name: "", description: "", color: "bg-sky-100 text-sky-700 ring-sky-300" })

  const selectedRole = useMemo(() => roles.find((r) => r.id === selectedRoleId), [roles, selectedRoleId])

  const filteredRoles = useMemo(() => {
    if (!searchQuery.trim()) return roles
    const q = searchQuery.toLowerCase()
    return roles.filter((r) => r.name.toLowerCase().includes(q) || r.description.toLowerCase().includes(q))
  }, [roles, searchQuery])

  const handleCreateRole = () => {
    if (!newRole.name.trim()) return
    const id = `role-${Date.now()}`
    const created = { id, ...newRole, isSystem: false, permissions: [], branchAccess: "assigned", branchIds: [] }
    setRoles([...roles, created])
    setNewRole({ name: "", description: "", color: "bg-sky-100 text-sky-700 ring-sky-300" })
    setShowCreateForm(false)
    setSelectedRoleId(id)
  }

  const handleDeleteRole = (e, roleId) => {
    e.stopPropagation()
    if (!window.confirm("Delete this role? Users with this role will lose their permissions.")) return
    setRoles(roles.filter((r) => r.id !== roleId))
    if (selectedRoleId === roleId) setSelectedRoleId(roles[0]?.id || null)
  }

  const handleDuplicateRole = (e, role) => {
    e.stopPropagation()
    const id = `role-${Date.now()}`
    const dup = { ...role, id, name: `${role.name} (Copy)`, isSystem: false }
    setRoles([...roles, dup])
    setSelectedRoleId(id)
  }

  const handlePermissionsChange = (permissions) => {
    const updated = roles.map((r) => r.id === selectedRoleId ? { ...r, permissions } : r)
    setRoles(updated)
  }

  const handleRoleNameEdit = (roleId, field, value) => {
    setRoles(roles.map((r) => r.id === roleId ? { ...r, [field]: value } : r))
  }

  const colorOptions = [
    { value: "bg-sky-100 text-sky-700 ring-sky-300", label: "Sky" },
    { value: "bg-indigo-100 text-indigo-700 ring-indigo-300", label: "Indigo" },
    { value: "bg-emerald-100 text-emerald-700 ring-emerald-300", label: "Emerald" },
    { value: "bg-amber-100 text-amber-700 ring-amber-300", label: "Amber" },
    { value: "bg-orange-100 text-orange-700 ring-orange-300", label: "Orange" },
    { value: "bg-rose-100 text-rose-700 ring-rose-300", label: "Rose" },
    { value: "bg-lime-100 text-lime-700 ring-lime-300", label: "Lime" },
    { value: "bg-stone-100 text-stone-600 ring-stone-300", label: "Stone" },
    { value: "bg-teal-100 text-teal-700 ring-teal-300", label: "Teal" },
    { value: "bg-violet-100 text-violet-700 ring-violet-300", label: "Violet" },
  ]

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="relative flex-1 max-w-xs">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A9805F]" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search roles..."
            className="w-full rounded-lg border border-[#EDE1CF] bg-white pl-8 pr-3 py-2 text-xs text-[#3B2515] outline-none focus:ring-2 focus:ring-[#B07B4F]/40"
          />
        </div>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="flex items-center gap-1.5 rounded-full bg-[#3B2515] text-[#F3E5D3] px-4 py-2 text-xs font-medium hover:bg-[#4A2E18] transition-colors"
        >
          <Plus size={13} /> Create Role
        </button>
      </div>

      <AnimatePresence>
        {showCreateForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="rounded-xl border border-[#EDE1CF] bg-white p-4 space-y-3 overflow-hidden"
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[10px] text-[#A9805F] uppercase tracking-wide font-medium mb-1 block">Role Name</label>
                <input value={newRole.name} onChange={(e) => setNewRole({ ...newRole, name: e.target.value })} placeholder="e.g. Shift Supervisor" className="w-full rounded-lg border border-[#EDE1CF] px-3 py-2 text-xs text-[#3B2515] bg-white focus:outline-none focus:ring-2 focus:ring-[#B07B4F]/40" />
              </div>
              <div>
                <label className="text-[10px] text-[#A9805F] uppercase tracking-wide font-medium mb-1 block">Description</label>
                <input value={newRole.description} onChange={(e) => setNewRole({ ...newRole, description: e.target.value })} placeholder="Brief description" className="w-full rounded-lg border border-[#EDE1CF] px-3 py-2 text-xs text-[#3B2515] bg-white focus:outline-none focus:ring-2 focus:ring-[#B07B4F]/40" />
              </div>
              <div>
                <label className="text-[10px] text-[#A9805F] uppercase tracking-wide font-medium mb-1 block">Color</label>
                <select value={newRole.color} onChange={(e) => setNewRole({ ...newRole, color: e.target.value })} className="w-full rounded-lg border border-[#EDE1CF] px-3 py-2 text-xs text-[#3B2515] bg-white focus:outline-none focus:ring-2 focus:ring-[#B07B4F]/40">
                  {colorOptions.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={handleCreateRole} disabled={!newRole.name.trim()} className="rounded-full bg-[#3B2515] text-[#F3E5D3] px-4 py-2 text-xs font-medium hover:bg-[#4A2E18] disabled:opacity-40 transition-colors">Create Role</button>
              <button onClick={() => setShowCreateForm(false)} className="rounded-full border border-[#EDE1CF] px-4 py-2 text-xs text-[#7B4B2A] hover:bg-[#FBF6EF] transition-colors">Cancel</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {filteredRoles.length === 0 ? (
        <div className="text-center py-8 text-sm text-[#9C8268]">No roles found</div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="xl:col-span-1 space-y-1">
            {filteredRoles.map((role) => {
              const isSelected = role.id === selectedRoleId
              return (
                <div
                  key={role.id}
                  onClick={() => setSelectedRoleId(role.id)}
                  className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 cursor-pointer transition-all ${
                    isSelected ? "bg-[#3B2515] text-[#F3E5D3] ring-1 ring-[#3B2515]" : "bg-white text-[#3B2515] ring-1 ring-[#EDE1CF] hover:bg-[#FBF6EF]"
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${role.color}`}>{role.name}</span>
                      {role.isSystem && <span className={`text-[9px] uppercase tracking-wider ${isSelected ? "text-[#C9B496]" : "text-[#9C8268]"}`}>System</span>}
                    </div>
                    <p className={`text-[10px] mt-0.5 truncate ${isSelected ? "text-[#C9B496]" : "text-[#9C8268]"}`}>{role.description}</p>
                    <p className={`text-[9px] mt-0.5 ${isSelected ? "text-[#C9B496]" : "text-[#9C8268]"}`}>{role.permissions.length} permissions</p>
                  </div>
                  <div className="flex items-center gap-0.5">
                    <button onClick={(e) => handleDuplicateRole(e, role)} className={`p-1 rounded transition-colors ${isSelected ? "hover:bg-[#4A2E18] text-[#C9B496]" : "hover:bg-[#EDE1CF] text-[#9C8268]"}`} title="Duplicate role"><Copy size={12} /></button>
                    {!role.isSystem && <button onClick={(e) => handleDeleteRole(e, role.id)} className={`p-1 rounded transition-colors ${isSelected ? "hover:bg-[#4A2E18] text-rose-300" : "hover:bg-[#EDE1CF] text-rose-400"}`} title="Delete role"><Trash2 size={12} /></button>}
                  </div>
                </div>
              )
            })}
          </div>

          <div className="xl:col-span-2 space-y-4">
            {selectedRole && (
              <>
                <div className="rounded-xl border border-[#EDE1CF] bg-white overflow-hidden">
                  <div className="px-4 py-3 border-b border-[#EDE1CF] flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${selectedRole.color}`}>{selectedRole.name}</span>
                          {selectedRole.isSystem && <span className="text-[9px] text-[#9C8268] uppercase tracking-wider">System Role</span>}
                        </div>
                        <p className="text-xs text-[#9C8268] mt-0.5">{selectedRole.description}</p>
                      </div>
                    </div>
                    <button onClick={() => setShowMatrix(!showMatrix)} className="flex items-center gap-1 text-xs text-[#7B4B2A] hover:text-[#3B2515] font-medium transition-colors">
                      {showMatrix ? <EyeOff size={13} /> : <Eye size={13} />}
                      {showMatrix ? "Hide Matrix" : "Show Matrix"}
                    </button>
                  </div>

                  {!selectedRole.isSystem && (
                    <div className="px-4 py-2 border-b border-[#EDE1CF] bg-[#FBF6EF]/50 flex items-center gap-2">
                      <label className="text-[10px] text-[#A9805F] uppercase tracking-wide font-medium">Name:</label>
                      <input value={selectedRole.name} onChange={(e) => handleRoleNameEdit(selectedRole.id, "name", e.target.value)} className="rounded border border-[#EDE1CF] px-2 py-1 text-xs text-[#3B2515] bg-white focus:outline-none focus:ring-1 focus:ring-[#B07B4F]/40" />
                      <label className="text-[10px] text-[#A9805F] uppercase tracking-wide font-medium ml-2">Color:</label>
                      <select value={selectedRole.color} onChange={(e) => handleRoleNameEdit(selectedRole.id, "color", e.target.value)} className="rounded border border-[#EDE1CF] px-2 py-1 text-xs text-[#3B2515] bg-white focus:outline-none text-[10px]">
                        {colorOptions.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                      </select>
                    </div>
                  )}

                  <AnimatePresence>
                    {showMatrix && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                        <div className="p-4">
                          <PermissionMatrix selectedPermissions={selectedRole.permissions} onPermissionsChange={handlePermissionsChange} />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="rounded-xl border border-[#EDE1CF] bg-white p-4">
                  <h4 className="text-xs text-[#A9805F] uppercase tracking-wide font-medium mb-3">Role Preview</h4>
                  <RolePreview role={selectedRole} />
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function UsersTab({ users, roles, setUsers }) {
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [roleFilter, setRoleFilter] = useState("all")
  const [selectedUserId, setSelectedUserId] = useState(null)
  const [showUserForm, setShowUserForm] = useState(false)
  const [showPermissionEditor, setShowPermissionEditor] = useState(false)
  const [userForm, setUserForm] = useState({
    name: "", username: "", email: "", phone: "", roleId: roles[0]?.id || "",
    status: "active", branchAccess: "assigned", branchIds: [],
  })

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        if (!String(u.name).toLowerCase().includes(q) && !String(u.email).toLowerCase().includes(q) && !String(u.username).toLowerCase().includes(q)) return false
      }
      if (statusFilter !== "all" && u.status !== statusFilter) return false
      if (roleFilter !== "all" && u.roleId !== roleFilter) return false
      return true
    })
  }, [users, searchQuery, statusFilter, roleFilter])

  const selectedUser = useMemo(() => users.find((u) => u.id === selectedUserId), [users, selectedUserId])

  const selectedUserEffectivePermissions = useMemo(() => {
    if (!selectedUser) return []
    const rolePerms = getPermissionKeysForRole(selectedUser.roleId, { staff: { roles } })
    return computeEffectivePermissions(rolePerms, selectedUser.extraPermissions, selectedUser.revokedPermissions)
  }, [selectedUser, roles])

  const handleCreateUser = () => {
    if (!userForm.name.trim() || !userForm.email.trim()) return
    const id = `usr-${Date.now()}`
    const created = {
      id, ...userForm, avatar: "", lastLogin: "-", createdAt: new Date().toISOString(),
      twoFactorEnabled: false, failedLoginAttempts: 0, locked: false,
      extraPermissions: [], revokedPermissions: [],
    }
    setUsers([...users, created])
    setUserForm({ name: "", username: "", email: "", phone: "", roleId: roles[0]?.id || "", status: "active", branchAccess: "assigned", branchIds: [] })
    setShowUserForm(false)
    setSelectedUserId(id)
  }

  const updateUser = useCallback((userId, updates) => {
    setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, ...updates } : u))
  }, [setUsers])

  const updateUserStatus = (userId, status) => {
    updateUser(userId, { status, locked: status === "locked" })
  }

  const handleDeleteUser = (userId) => {
    if (!window.confirm("Delete this user? This action cannot be undone.")) return
    setUsers(users.filter((u) => u.id !== userId))
    if (selectedUserId === userId) setSelectedUserId(null)
  }

  const handleAddExtraPermission = (permKey) => {
    if (!selectedUser) return
    const current = selectedUser.extraPermissions || []
    if (current.includes(permKey)) return
    updateUser(selectedUser.id, {
      extraPermissions: [...current, permKey],
      revokedPermissions: (selectedUser.revokedPermissions || []).filter((p) => p !== permKey),
    })
  }

  const handleRemovePermission = (permKey) => {
    if (!selectedUser) return
    const rolePerms = getPermissionKeysForRole(selectedUser.roleId, { staff: { roles } })
    if (rolePerms.includes(permKey)) {
      const current = selectedUser.revokedPermissions || []
      if (!current.includes(permKey)) {
        updateUser(selectedUser.id, { revokedPermissions: [...current, permKey] })
      }
    } else {
      updateUser(selectedUser.id, {
        extraPermissions: (selectedUser.extraPermissions || []).filter((p) => p !== permKey),
      })
    }
  }

  const handleDuplicatePermissions = () => {
    if (!selectedUser) return
    const sourceRole = roles.find((r) => r.id === selectedUser.roleId)
    if (!sourceRole) return
    updateUser(selectedUser.id, {
      extraPermissions: [...sourceRole.permissions],
      revokedPermissions: [],
    })
  }

  const handleResetToRoleDefaults = () => {
    if (!selectedUser) return
    updateUser(selectedUser.id, { extraPermissions: [], revokedPermissions: [] })
  }

  const getUserRole = (roleId) => roles.find((r) => r.id === roleId)

  const statusColors = { active: "bg-emerald-100 text-emerald-700", inactive: "bg-stone-100 text-stone-500", locked: "bg-rose-100 text-rose-700" }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-2 flex-1 max-w-lg">
          <div className="relative flex-1">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A9805F]" />
            <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search users..." className="w-full rounded-lg border border-[#EDE1CF] bg-white pl-8 pr-3 py-2 text-xs text-[#3B2515] outline-none focus:ring-2 focus:ring-[#B07B4F]/40" />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-lg border border-[#EDE1CF] bg-white px-2.5 py-2 text-xs text-[#3B2515] focus:outline-none">
            <option value="all">All Status</option>
            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="rounded-lg border border-[#EDE1CF] bg-white px-2.5 py-2 text-xs text-[#3B2515] focus:outline-none">
            <option value="all">All Roles</option>
            {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </div>
        <button onClick={() => setShowUserForm(!showUserForm)} className="flex items-center gap-1.5 rounded-full bg-[#3B2515] text-[#F3E5D3] px-4 py-2 text-xs font-medium hover:bg-[#4A2E18] transition-colors">
          <Plus size={13} /> Add User
        </button>
      </div>

      <AnimatePresence>
        {showUserForm && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="rounded-xl border border-[#EDE1CF] bg-white p-4 space-y-3 overflow-hidden">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div>
                <label className="text-[10px] text-[#A9805F] uppercase tracking-wide font-medium mb-1 block">Full Name</label>
                <input value={userForm.name} onChange={(e) => setUserForm({ ...userForm, name: e.target.value })} placeholder="Full name" className="w-full rounded-lg border border-[#EDE1CF] px-3 py-2 text-xs text-[#3B2515] bg-white focus:outline-none focus:ring-2 focus:ring-[#B07B4F]/40" />
              </div>
              <div>
                <label className="text-[10px] text-[#A9805F] uppercase tracking-wide font-medium mb-1 block">Username</label>
                <input value={userForm.username} onChange={(e) => setUserForm({ ...userForm, username: e.target.value })} placeholder="username" className="w-full rounded-lg border border-[#EDE1CF] px-3 py-2 text-xs text-[#3B2515] bg-white focus:outline-none focus:ring-2 focus:ring-[#B07B4F]/40" />
              </div>
              <div>
                <label className="text-[10px] text-[#A9805F] uppercase tracking-wide font-medium mb-1 block">Email</label>
                <input value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} placeholder="email@example.com" className="w-full rounded-lg border border-[#EDE1CF] px-3 py-2 text-xs text-[#3B2515] bg-white focus:outline-none focus:ring-2 focus:ring-[#B07B4F]/40" />
              </div>
              <div>
                <label className="text-[10px] text-[#A9805F] uppercase tracking-wide font-medium mb-1 block">Phone</label>
                <input value={userForm.phone} onChange={(e) => setUserForm({ ...userForm, phone: e.target.value })} placeholder="+1 234 567 890" className="w-full rounded-lg border border-[#EDE1CF] px-3 py-2 text-xs text-[#3B2515] bg-white focus:outline-none focus:ring-2 focus:ring-[#B07B4F]/40" />
              </div>
              <div>
                <label className="text-[10px] text-[#A9805F] uppercase tracking-wide font-medium mb-1 block">Role</label>
                <select value={userForm.roleId} onChange={(e) => setUserForm({ ...userForm, roleId: e.target.value })} className="w-full rounded-lg border border-[#EDE1CF] px-3 py-2 text-xs text-[#3B2515] bg-white focus:outline-none focus:ring-2 focus:ring-[#B07B4F]/40">
                  {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] text-[#A9805F] uppercase tracking-wide font-medium mb-1 block">Status</label>
                <select value={userForm.status} onChange={(e) => setUserForm({ ...userForm, status: e.target.value })} className="w-full rounded-lg border border-[#EDE1CF] px-3 py-2 text-xs text-[#3B2515] bg-white focus:outline-none focus:ring-2 focus:ring-[#B07B4F]/40">
                  {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={handleCreateUser} disabled={!userForm.name.trim() || !userForm.email.trim()} className="rounded-full bg-[#3B2515] text-[#F3E5D3] px-4 py-2 text-xs font-medium hover:bg-[#4A2E18] disabled:opacity-40 transition-colors">Create User</button>
              <button onClick={() => setShowUserForm(false)} className="rounded-full border border-[#EDE1CF] px-4 py-2 text-xs text-[#7B4B2A] hover:bg-[#FBF6EF] transition-colors">Cancel</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {filteredUsers.length === 0 ? (
        <div className="text-center py-8 text-sm text-[#9C8268]">No users found</div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="xl:col-span-1 space-y-1 max-h-[500px] overflow-y-auto pr-1">
            {filteredUsers.map((user) => {
              const isSelected = user.id === selectedUserId
              const role = getUserRole(user.roleId)
              const hasOverrides = (user.extraPermissions?.length > 0 || user.revokedPermissions?.length > 0)
              return (
                <div
                  key={user.id}
                  onClick={() => { setSelectedUserId(user.id); setShowPermissionEditor(false) }}
                  className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 cursor-pointer transition-all ${
                    isSelected ? "bg-[#3B2515] text-[#F3E5D3] ring-1 ring-[#3B2515]" : "bg-white text-[#3B2515] ring-1 ring-[#EDE1CF] hover:bg-[#FBF6EF]"
                  }`}
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#7B4B2A] to-[#C9925F] flex items-center justify-center text-xs font-bold text-white shrink-0">
                    {user.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-medium truncate ${isSelected ? "text-[#F3E5D3]" : "text-[#3B2515]"}`}>{user.name}</p>
                    <p className={`text-[10px] truncate ${isSelected ? "text-[#C9B496]" : "text-[#9C8268]"}`}>{user.email}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {role && <span className={`px-1.5 py-0.5 rounded text-[8px] font-medium ${role.color}`}>{role.name}</span>}
                      <span className={`px-1.5 py-0.5 rounded text-[8px] font-medium ${statusColors[user.status] || "bg-stone-100 text-stone-500"}`}>{user.status}</span>
                      {hasOverrides && <span className="text-[8px] text-amber-500 font-medium">*Overrides</span>}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="xl:col-span-2">
            {selectedUser ? (
              <div className="rounded-xl border border-[#EDE1CF] bg-white p-4 space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#7B4B2A] to-[#C9925F] flex items-center justify-center text-base font-bold text-white">
                      {selectedUser.name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-[#3B2515]">{selectedUser.name}</h4>
                      <p className="text-xs text-[#9C8268]">@{selectedUser.username}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => updateUserStatus(selectedUser.id, selectedUser.status === "active" ? "inactive" : "active")}
                      className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[10px] font-medium transition-colors ${
                        selectedUser.status === "active" ? "bg-amber-50 text-amber-700 hover:bg-amber-100" : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                      }`}>
                      {selectedUser.status === "active" ? <UserX size={11} /> : <UserCheck size={11} />}
                      {selectedUser.status === "active" ? "Deactivate" : "Activate"}
                    </button>
                    {selectedUser.locked && (
                      <button onClick={() => updateUserStatus(selectedUser.id, "active")}
                        className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[10px] font-medium bg-sky-50 text-sky-700 hover:bg-sky-100 transition-colors">
                        <CheckCircle size={11} /> Unlock
                      </button>
                    )}
                    <button onClick={() => handleDeleteUser(selectedUser.id)}
                      className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[10px] font-medium bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors">
                      <Trash2 size={11} /> Delete
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="flex items-center gap-2 text-[#9C8268]"><Mail size={12} /> {selectedUser.email}</div>
                  <div className="flex items-center gap-2 text-[#9C8268]"><Phone size={12} /> {selectedUser.phone}</div>
                  <div className="flex items-center gap-2 text-[#9C8268]"><Calendar size={12} /> Created: {new Date(selectedUser.createdAt).toLocaleDateString()}</div>
                  <div className="flex items-center gap-2 text-[#9C8268]"><Clock size={12} /> Last login: {selectedUser.lastLogin !== "-" ? new Date(selectedUser.lastLogin).toLocaleString() : "Never"}</div>
                </div>

                <div className="flex items-center gap-3 text-xs flex-wrap">
                  {getUserRole(selectedUser.roleId) && (
                    <div className="flex items-center gap-1.5">
                      <Shield size={12} className="text-[#A9805F]" />
                      <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${getUserRole(selectedUser.roleId).color}`}>{getUserRole(selectedUser.roleId).name}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5">
                    {selectedUser.twoFactorEnabled ? (
                      <span className="flex items-center gap-1 text-emerald-600"><CheckCircle2 size={11} /> 2FA Enabled</span>
                    ) : (
                      <span className="flex items-center gap-1 text-[#9C8268]"><XCircle size={11} /> 2FA Disabled</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[#9C8268]">Failed logins: {selectedUser.failedLoginAttempts}</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1 text-xs text-[#9C8268]">
                    <span>Effective: <strong className="text-[#3B2515]">{selectedUserEffectivePermissions.length}</strong> permissions</span>
                  </div>
                  {(selectedUser.extraPermissions?.length > 0 || selectedUser.revokedPermissions?.length > 0) && (
                    <span className="text-[10px] bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full font-medium">Custom Overrides Active</span>
                  )}
                </div>

                <div className="flex flex-wrap gap-2 pt-2 border-t border-[#EDE1CF]">
                  <button onClick={() => setShowPermissionEditor(!showPermissionEditor)}
                    className="flex items-center gap-1 rounded-lg border border-[#EDE1CF] px-3 py-1.5 text-[10px] text-[#7B4B2A] hover:bg-[#FBF6EF] transition-colors">
                    <Shield size={11} /> {showPermissionEditor ? "Hide Permissions" : "Edit Permissions"}
                  </button>
                  <button onClick={handleDuplicatePermissions}
                    className="flex items-center gap-1 rounded-lg border border-[#EDE1CF] px-3 py-1.5 text-[10px] text-[#7B4B2A] hover:bg-[#FBF6EF] transition-colors">
                    <Copy size={11} /> Duplicate Role Permissions
                  </button>
                  <button onClick={handleResetToRoleDefaults}
                    className="flex items-center gap-1 rounded-lg border border-[#EDE1CF] px-3 py-1.5 text-[10px] text-[#7B4B2A] hover:bg-[#FBF6EF] transition-colors">
                    <RotateCcw size={11} /> Reset to Role Defaults
                  </button>
                </div>

                <AnimatePresence>
                  {showPermissionEditor && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden border-t border-[#EDE1CF] pt-4">
                      <UserPermissionEditor
                        user={selectedUser}
                        roles={roles}
                        onUpdate={updateUser}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>

                {selectedUser.locked && (
                  <div className="flex items-center gap-2 rounded-lg bg-rose-50 border border-rose-200 px-3 py-2 text-xs text-rose-700">
                    <Ban size={12} /> Account locked due to {selectedUser.failedLoginAttempts} failed login attempts
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center h-48 text-sm text-[#9C8268]">Select a user to view details</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function UserPermissionEditor({ user, roles, onUpdate }) {
  const [searchQuery, setSearchQuery] = useState("")

  const role = roles.find((r) => r.id === user.roleId)
  const rolePermissions = role ? role.permissions : []

  const extraPermissions = user.extraPermissions || []
  const revokedPermissions = user.revokedPermissions || []

  const effectivePermissions = computeEffectivePermissions(rolePermissions, extraPermissions, revokedPermissions)

  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim()) return PERMISSION_GROUPS
    const q = searchQuery.toLowerCase()
    return PERMISSION_GROUPS.filter((g) => {
      if (g.label.toLowerCase().includes(q)) return true
      return g.permissions.some((p) => p.label.toLowerCase().includes(q) || p.key.toLowerCase().includes(q))
    })
  }, [searchQuery])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-xs text-[#A9805F] uppercase tracking-wide font-medium">
          Individual Permission Overrides
        </h4>
        <div className="text-xs text-[#9C8268]">
          <span className="text-emerald-600 font-medium">+{extraPermissions.length} extra</span>
          {revokedPermissions.length > 0 && (
            <span className="text-rose-500 font-medium ml-2">&minus;{revokedPermissions.length} revoked</span>
          )}
        </div>
      </div>

      <div className="relative max-w-xs">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A9805F]" />
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search permissions..."
          className="w-full rounded-lg border border-[#EDE1CF] bg-white pl-8 pr-3 py-2 text-xs text-[#3B2515] outline-none focus:ring-2 focus:ring-[#B07B4F]/40"
        />
      </div>

      <div className="max-h-[400px] overflow-y-auto space-y-2 pr-1">
        {filteredGroups.map((group) => {
          const groupEffective = group.permissions.filter((p) => effectivePermissions.includes(p.key))
          const groupRevoked = group.permissions.filter((p) => revokedPermissions.includes(p.key))
          const groupExtra = group.permissions.filter((p) => extraPermissions.includes(p.key))

          if (group.permissions.every((p) => !p.key.toLowerCase().includes(searchQuery.toLowerCase()) && !p.label.toLowerCase().includes(searchQuery.toLowerCase()) && !group.label.toLowerCase().includes(searchQuery.toLowerCase()))) {
            if (searchQuery.trim()) return null
          }

          return (
            <div key={group.key} className="rounded-lg border border-[#EDE1CF] overflow-hidden">
              <div className="bg-[#FBF6EF] px-3 py-2 text-xs font-medium text-[#3B2515] flex items-center justify-between">
                <span>{group.label}</span>
                <span className="text-[10px] text-[#9C8268]">{groupEffective.length}/{group.permissions.length}</span>
              </div>
              <div className="divide-y divide-[#EDE1CF]">
                {group.permissions.map((perm) => {
                  const isInRole = rolePermissions.includes(perm.key)
                  const isExtra = extraPermissions.includes(perm.key)
                  const isRevoked = revokedPermissions.includes(perm.key)
                  const isActive = effectivePermissions.includes(perm.key)

                  return (
                    <div
                      key={perm.key}
                      className={`flex items-center justify-between px-3 py-1.5 text-xs ${
                        isRevoked ? "bg-rose-50/50" : isExtra ? "bg-emerald-50/50" : ""
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {isInRole && !isRevoked && (
                          <CheckSquare size={12} className="text-emerald-600 shrink-0" />
                        )}
                        {isExtra && (
                          <Plus size={12} className="text-blue-500 shrink-0" />
                        )}
                        {isRevoked && (
                          <XCircle size={12} className="text-rose-400 shrink-0" />
                        )}
                        {!isActive && (
                          <Square size={12} className="text-[#EDE1CF] shrink-0" />
                        )}
                        <span className={isRevoked ? "text-[#9C8268] line-through" : "text-[#3B2515]"}>
                          {perm.label}
                        </span>
                        <span className="text-[9px] text-[#9C8268]">({perm.key})</span>
                      </div>
                      <div className="flex items-center gap-1">
                        {isRevoked ? (
                          <button
                            onClick={() => onUpdate(user.id, {
                              revokedPermissions: revokedPermissions.filter((p) => p !== perm.key),
                            })}
                            className="text-[10px] text-emerald-600 hover:text-emerald-700 font-medium px-1.5 py-0.5 rounded hover:bg-emerald-50"
                            title="Restore permission"
                          >
                            Restore
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              if (isExtra) {
                                onUpdate(user.id, {
                                  extraPermissions: extraPermissions.filter((p) => p !== perm.key),
                                })
                              } else {
                                onUpdate(user.id, {
                                  revokedPermissions: [...revokedPermissions, perm.key],
                                })
                              }
                            }}
                            className="text-[10px] text-rose-500 hover:text-rose-600 font-medium px-1.5 py-0.5 rounded hover:bg-rose-50"
                            title={isExtra ? "Remove extra permission" : "Revoke permission"}
                          >
                            {isExtra ? "Remove" : "Revoke"}
                          </button>
                        )}
                        {!isInRole && !isExtra && (
                          <button
                            onClick={() => {
                              onUpdate(user.id, {
                                extraPermissions: [...extraPermissions, perm.key],
                              })
                            }}
                            className="text-[10px] text-blue-500 hover:text-blue-600 font-medium px-1.5 py-0.5 rounded hover:bg-blue-50"
                            title="Grant permission"
                          >
                            Grant
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function AuditTab({ logs }) {
  const [searchQuery, setSearchQuery] = useState("")
  const [moduleFilter, setModuleFilter] = useState("All")
  const [statusFilter, setStatusFilter] = useState("All")
  const [expandedLog, setExpandedLog] = useState(null)

  const filtered = useMemo(() => {
    return logs.filter((l) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        if (!l.action.toLowerCase().includes(q) && !l.userName.toLowerCase().includes(q)) return false
      }
      if (moduleFilter !== "All" && l.module !== moduleFilter) return false
      if (statusFilter !== "All" && l.status !== statusFilter) return false
      return true
    })
  }, [logs, searchQuery, moduleFilter, statusFilter])

  const statusStyles = {
    success: "bg-emerald-100 text-emerald-700",
    failed: "bg-rose-100 text-rose-700",
    denied: "bg-amber-100 text-amber-700",
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A9805F]" />
          <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search logs..." className="w-full rounded-lg border border-[#EDE1CF] bg-white pl-8 pr-3 py-2 text-xs text-[#3B2515] outline-none focus:ring-2 focus:ring-[#B07B4F]/40" />
        </div>
        <select value={moduleFilter} onChange={(e) => setModuleFilter(e.target.value)} className="rounded-lg border border-[#EDE1CF] bg-white px-2.5 py-2 text-xs text-[#3B2515] focus:outline-none">
          {MODULE_OPTIONS.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-lg border border-[#EDE1CF] bg-white px-2.5 py-2 text-xs text-[#3B2515] focus:outline-none">
          {STATUS_LOG_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="rounded-xl border border-[#EDE1CF] overflow-hidden">
        <div className="grid grid-cols-[auto,1fr,auto,auto,auto] gap-2 px-4 py-2.5 bg-[#FBF6EF] border-b border-[#EDE1CF] text-[10px] text-[#A9805F] uppercase tracking-wide font-medium">
          <span>User</span>
          <span>Action</span>
          <span>Module</span>
          <span>Date</span>
          <span>Status</span>
        </div>
        <div className="divide-y divide-[#EDE1CF]">
          {filtered.map((log) => (
            <div key={log.id} onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
              className="grid grid-cols-[auto,1fr,auto,auto,auto] gap-2 px-4 py-2.5 text-xs text-[#3B2515] hover:bg-[#FBF6EF]/50 cursor-pointer transition-colors items-center">
              <span className="flex items-center gap-1.5 shrink-0">
                <div className="w-5 h-5 rounded-full bg-gradient-to-br from-[#7B4B2A] to-[#C9925F] flex items-center justify-center text-[7px] font-bold text-white">{log.userName.charAt(0)}</div>
                <span className="hidden sm:inline text-[10px]">{log.userName}</span>
              </span>
              <span className="truncate">{log.action}</span>
              <span className="text-[10px] text-[#9C8268] shrink-0">{log.module}</span>
              <span className="text-[10px] text-[#9C8268] shrink-0 whitespace-nowrap">{new Date(log.date).toLocaleDateString()} {new Date(log.date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
              <span className={`px-2 py-0.5 rounded text-[9px] font-medium shrink-0 ${statusStyles[log.status] || "bg-stone-100 text-stone-500"}`}>{log.status}</span>
              {expandedLog === log.id && (
                <div className="col-span-full grid grid-cols-3 gap-3 pt-2 pb-1 text-[10px] text-[#9C8268] bg-[#FBF6EF]/50 rounded-lg px-3 py-2 -mx-2">
                  <span className="flex items-center gap-1"><Monitor size={10} /> {log.device}</span>
                  <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[#A9805F]" /> IP: {log.ip}</span>
                  <span className="flex items-center gap-1"><Clock size={10} /> {new Date(log.date).toLocaleString()}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {filtered.length === 0 && <div className="text-center py-8 text-sm text-[#9C8268]">No audit logs found</div>}
    </div>
  )
}

function SecurityTab() {
  const [passwordPolicy, setPasswordPolicy] = useState("high")
  const [autoLogout, setAutoLogout] = useState("30")
  const [maxAttempts, setMaxAttempts] = useState("5")
  const [lockoutDuration, setLockoutDuration] = useState("15")
  const [twoFactorRequired, setTwoFactorRequired] = useState(false)
  const [passwordExpiry, setPasswordExpiry] = useState("90")

  const sessions = [
    { device: "Chrome on macOS", ip: "192.168.1.10", lastActive: "2 mins ago", current: true },
    { device: "Safari on iPhone", ip: "192.168.1.20", lastActive: "1 hour ago", current: false },
    { device: "Chrome on Windows", ip: "192.168.1.30", lastActive: "5 hours ago", current: false },
  ]

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="rounded-xl border border-[#EDE1CF] bg-white p-4 space-y-3">
        <h4 className="text-sm font-medium text-[#3B2515] flex items-center gap-2"><FileText size={15} /> Password Policy</h4>
        <div>
          <label className="text-[10px] text-[#A9805F] uppercase tracking-wide font-medium mb-1 block">Strength Requirement</label>
          <select value={passwordPolicy} onChange={(e) => setPasswordPolicy(e.target.value)} className="w-full rounded-lg border border-[#EDE1CF] px-3 py-2 text-xs text-[#3B2515] bg-white focus:outline-none focus:ring-2 focus:ring-[#B07B4F]/40">
            <option value="low">Low (6+ characters)</option>
            <option value="medium">Medium (8+ chars, 1 number)</option>
            <option value="high">High (10+ chars, upper, lower, number, symbol)</option>
          </select>
        </div>
        <div>
          <label className="text-[10px] text-[#A9805F] uppercase tracking-wide font-medium mb-1 block">Password Expiry (days)</label>
          <input type="number" min="0" max="365" value={passwordExpiry} onChange={(e) => setPasswordExpiry(e.target.value)} className="w-full rounded-lg border border-[#EDE1CF] px-3 py-2 text-xs text-[#3B2515] bg-white focus:outline-none focus:ring-2 focus:ring-[#B07B4F]/40" />
        </div>
        <div>
          <label className="text-[10px] text-[#A9805F] uppercase tracking-wide font-medium mb-1 block">Max Failed Attempts</label>
          <input type="number" min="1" max="20" value={maxAttempts} onChange={(e) => setMaxAttempts(e.target.value)} className="w-full rounded-lg border border-[#EDE1CF] px-3 py-2 text-xs text-[#3B2515] bg-white focus:outline-none focus:ring-2 focus:ring-[#B07B4F]/40" />
        </div>
        <div>
          <label className="text-[10px] text-[#A9805F] uppercase tracking-wide font-medium mb-1 block">Lockout Duration (minutes)</label>
          <input type="number" min="1" max="1440" value={lockoutDuration} onChange={(e) => setLockoutDuration(e.target.value)} className="w-full rounded-lg border border-[#EDE1CF] px-3 py-2 text-xs text-[#3B2515] bg-white focus:outline-none focus:ring-2 focus:ring-[#B07B4F]/40" />
        </div>
      </div>

      <div className="rounded-xl border border-[#EDE1CF] bg-white p-4 space-y-3">
        <h4 className="text-sm font-medium text-[#3B2515] flex items-center gap-2"><Shield size={15} /> Authentication</h4>
        <label className="flex items-center justify-between cursor-pointer">
          <span className="flex items-center gap-2 text-xs text-[#3B2515]"><Smartphone size={13} className="text-[#A9805F]" /> Require Two-Factor Authentication</span>
          <div onClick={() => setTwoFactorRequired(!twoFactorRequired)} className={`relative w-9 h-5 rounded-full transition-colors cursor-pointer ${twoFactorRequired ? "bg-[#B07B4F]" : "bg-[#EDE1CF]"}`}>
            <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${twoFactorRequired ? "translate-x-4" : ""}`} />
          </div>
        </label>
        <div>
          <label className="text-[10px] text-[#A9805F] uppercase tracking-wide font-medium mb-1 block"><Timer size={11} className="inline mr-1" /> Auto Logout Timer (minutes)</label>
          <input type="number" min="1" max="1440" value={autoLogout} onChange={(e) => setAutoLogout(e.target.value)} className="w-full rounded-lg border border-[#EDE1CF] px-3 py-2 text-xs text-[#3B2515] bg-white focus:outline-none focus:ring-2 focus:ring-[#B07B4F]/40" />
        </div>
      </div>

      <div className="lg:col-span-2 rounded-xl border border-[#EDE1CF] bg-white p-4">
        <h4 className="text-sm font-medium text-[#3B2515] flex items-center gap-2 mb-3"><Monitor size={15} /> Active Sessions</h4>
        <div className="space-y-2">
          {sessions.map((s, i) => (
            <div key={i} className="flex items-center justify-between py-2 border-b border-[#EDE1CF] last:border-0">
              <div className="flex items-center gap-3">
                {s.current && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
                <div>
                  <p className="text-xs text-[#3B2515]">{s.device}</p>
                  <p className="text-[10px] text-[#9C8268]">IP: {s.ip} &middot; {s.lastActive}</p>
                </div>
              </div>
              {s.current ? <span className="text-[10px] text-emerald-600 font-medium">Current Session</span> : <button className="text-[10px] text-rose-500 hover:text-rose-700 font-medium transition-colors">Force Logout</button>}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function BranchesTab() {
  const [selectedBranch, setSelectedBranch] = useState(BRANCHES[0]?.id || null)
  const [branchMode, setBranchMode] = useState("all")

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-[#EDE1CF] bg-white p-4 space-y-3">
        <h4 className="text-sm font-medium text-[#3B2515] flex items-center gap-2"><Building2 size={15} /> Branch Access Configuration</h4>
        <p className="text-xs text-[#9C8268]">Configure which branches each role and user can access. This allows managing multiple restaurant locations.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="space-y-1">
          <h5 className="text-xs text-[#A9805F] uppercase tracking-wide font-medium mb-2">Branches</h5>
          {BRANCHES.map((b) => (
            <button key={b.id} onClick={() => setSelectedBranch(b.id)}
              className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs transition-all ${selectedBranch === b.id ? "bg-[#3B2515] text-[#F3E5D3]" : "bg-white text-[#3B2515] ring-1 ring-[#EDE1CF] hover:bg-[#FBF6EF]"}`}>
              {b.name}
            </button>
          ))}
        </div>

        <div className="lg:col-span-2">
          <div className="rounded-xl border border-[#EDE1CF] bg-white p-4 space-y-4">
            <h5 className="text-xs text-[#A9805F] uppercase tracking-wide font-medium">Access Mode</h5>
            <div className="space-y-2">
              {[
                { value: "all", label: "All Branches", desc: "Users can access every branch" },
                { value: "assigned", label: "Assigned Branch Only", desc: "Users are restricted to their assigned branch" },
                { value: "multiple", label: "Multiple Selected Branches", desc: "Users can access specific selected branches" },
              ].map((mode) => (
                <label key={mode.value} onClick={() => setBranchMode(mode.value)}
                  className={`flex items-start gap-3 rounded-xl border px-4 py-3 cursor-pointer transition-all ${branchMode === mode.value ? "border-[#B07B4F] bg-[#B07B4F]/5" : "border-[#EDE1CF] hover:bg-[#FBF6EF]"}`}>
                  <div className={`mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${branchMode === mode.value ? "border-[#B07B4F]" : "border-[#EDE1CF]"}`}>
                    {branchMode === mode.value && <div className="w-2 h-2 rounded-full bg-[#B07B4F]" />}
                  </div>
                  <div>
                    <p className="text-xs font-medium text-[#3B2515]">{mode.label}</p>
                    <p className="text-[10px] text-[#9C8268]">{mode.desc}</p>
                  </div>
                </label>
              ))}
            </div>

            {branchMode === "multiple" && (
              <div className="space-y-2">
                <h5 className="text-xs text-[#A9805F] uppercase tracking-wide font-medium">Select Branches</h5>
                {BRANCHES.map((b) => (
                  <label key={b.id} className="flex items-center gap-2.5 cursor-pointer">
                    <div className="w-4 h-4 rounded border border-[#EDE1CF] bg-white cursor-pointer" />
                    <span className="text-xs text-[#3B2515]">{b.name}</span>
                  </label>
                ))}
              </div>
            )}

            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-700 flex items-start gap-2">
              <AlertTriangle size={14} className="shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Backend Integration Required</p>
                <p className="text-[10px] mt-0.5">Branch-level permissions are configured. The backend should enforce these restrictions on all API endpoints.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
