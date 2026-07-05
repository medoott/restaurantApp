import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Shield, Users, History, Search, Save, RotateCcw, Check, X,
  ChevronDown, ChevronRight, UserPlus, UserMinus, Copy, AlertTriangle,
} from "lucide-react";
import PermissionMatrix from "../components/dashboard/settings/rbac/PermissionMatrix.jsx";
import { PERMISSION_GROUPS } from "../components/dashboard/settings/rbac/permissionData.js";

const TABS = [
  { key: "roles", label: "Roles", icon: Shield },
  { key: "users", label: "User Permissions", icon: Users },
  { key: "audit", label: "Audit Log", icon: History },
];

export default function RbacManagementPage({ apiRequest }) {
  const [activeTab, setActiveTab] = useState("roles");
  const [roles, setRoles] = useState([]);
  const [users, setUsers] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [editingRole, setEditingRole] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notification, setNotification] = useState(null);

  const showNotif = (msg, type = "success") => {
    setNotification({ message: msg, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [rolesRes, usersRes] = await Promise.all([
        apiRequest("/rbac/roles"),
        apiRequest("/rbac/users/permissions?limit=100"),
      ]);
      setRoles(rolesRes?.data || []);
      setUsers(usersRes?.data?.users || []);
    } catch (err) {
      setError(err.message || "Failed to load RBAC data");
    } finally {
      setLoading(false);
    }
  }, [apiRequest]);

  const fetchAuditLogs = useCallback(async () => {
    try {
      const res = await apiRequest("/rbac/audit/permissions?limit=50");
      setAuditLogs(res?.data?.logs || []);
    } catch {}
  }, [apiRequest]);

  useEffect(() => {
    fetchData();
    fetchAuditLogs();
  }, [fetchData, fetchAuditLogs]);

  const handleSaveRole = async (roleData) => {
    try {
      if (roleData._id) {
        await apiRequest(`/rbac/roles/${roleData._id}`, {
          method: "PUT",
          body: JSON.stringify({ permissions: roleData.permissions, label: roleData.label, description: roleData.description }),
        });
        showNotif(`Role "${roleData.label}" updated`);
      } else {
        await apiRequest("/rbac/roles", {
          method: "POST",
          body: JSON.stringify(roleData),
        });
        showNotif(`Role "${roleData.label}" created`);
      }
      setEditingRole(null);
      fetchData();
    } catch (err) {
      showNotif(err.message || "Failed to save role", "error");
    }
  };

  const handleDeleteRole = async (roleId, label) => {
    if (!window.confirm(`Delete role "${label}"? This cannot be undone.`)) return;
    try {
      await apiRequest(`/rbac/roles/${roleId}`, { method: "DELETE" });
      showNotif(`Role "${label}" deleted`);
      fetchData();
    } catch (err) {
      showNotif(err.message || "Failed to delete role", "error");
    }
  };

  const handleUpdateUserPermissions = async (userId, permissions, revokedPermissions) => {
    try {
      await apiRequest(`/rbac/users/${userId}/permissions`, {
        method: "PUT",
        body: JSON.stringify({ permissions, revokedPermissions }),
      });
      showNotif("User permissions updated");
      setEditingUser(null);
      fetchData();
    } catch (err) {
      showNotif(err.message || "Failed to update permissions", "error");
    }
  };

  const handleResetUserPermissions = async (userId) => {
    if (!window.confirm("Reset this user to role defaults?")) return;
    try {
      await apiRequest(`/rbac/users/${userId}/permissions/reset`, { method: "POST" });
      showNotif("Permissions reset to role defaults");
      setEditingUser(null);
      fetchData();
    } catch (err) {
      showNotif(err.message || "Failed to reset permissions", "error");
    }
  };

  const handleChangeUserRole = async (userId, newRole) => {
    try {
      await apiRequest(`/rbac/users/${userId}/role`, {
        method: "PUT",
        body: JSON.stringify({ role: newRole }),
      });
      showNotif("User role updated");
      fetchData();
    } catch (err) {
      showNotif(err.message || "Failed to update role", "error");
    }
  };

  const filteredUsers = useMemo(() => {
    if (!search.trim()) return users;
    const q = search.toLowerCase();
    return users.filter((u) =>
      u.userName?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.role?.toLowerCase().includes(q)
    );
  }, [users, search]);

  return (
    <div className="min-h-screen bg-[#FBF6EF]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-serif text-[#3B2515]">RBAC Management</h1>
            <p className="text-sm text-[#A9805F] mt-1">Role-Based Access Control administration</p>
          </div>
          {loading && <div className="text-xs text-[#A9805F] animate-pulse">Loading...</div>}
        </div>

        {error && (
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-sm text-rose-700 flex items-center gap-2">
            <AlertTriangle size={16} />
            {error}
            <button onClick={fetchData} className="ml-auto underline text-rose-600">Retry</button>
          </div>
        )}

        {notification && (
          <div className={`fixed top-20 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium ${
            notification.type === "error"
              ? "bg-rose-100 text-rose-800 border border-rose-200"
              : "bg-emerald-100 text-emerald-800 border border-emerald-200"
          }`}>
            {notification.message}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 bg-white rounded-xl p-1 ring-1 ring-[#EDE1CF] overflow-x-auto">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === key ? "bg-[#3B2515] text-white shadow-sm" : "text-[#7B4B2A] hover:bg-[#FBF6EF]"
              }`}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </div>

        {/* Roles Tab */}
        {activeTab === "roles" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[#3B2515]">System Roles</h2>
              <button
                onClick={() => setEditingRole({ name: "", label: "", description: "", permissions: [], isSystem: false })}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#3B2515] text-white rounded-lg text-xs font-medium hover:bg-[#4A3020] transition-colors"
              >
                <UserPlus size={14} />
                New Role
              </button>
            </div>

            {loading ? (
              <div className="text-center py-12 text-[#A9805F]">Loading roles...</div>
            ) : (
              <div className="grid gap-3">
                {roles.map((role) => (
                  <div key={role._id} className="bg-white rounded-xl p-4 ring-1 ring-[#EDE1CF] space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-[#3B2515]">{role.label}</span>
                          {role.isSystem && (
                            <span className="text-[9px] uppercase tracking-wider bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium">System</span>
                          )}
                        </div>
                        <p className="text-xs text-[#A9805F] mt-0.5">{role.description || role.name}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-[#A9805F]">{role.permissions?.length || 0} permissions</span>
                        <button
                          onClick={() => setEditingRole({ ...role })}
                          className="p-1.5 text-[#7B4B2A] hover:bg-[#FBF6EF] rounded-lg transition-colors"
                        >
                          <Shield size={14} />
                        </button>
                        {!role.isSystem && (
                          <button
                            onClick={() => handleDeleteRole(role._id, role.label)}
                            className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                          >
                            <UserMinus size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Role Editor Modal */}
            {editingRole && (
              <RoleEditor
                role={editingRole}
                roles={roles}
                onSave={handleSaveRole}
                onClose={() => setEditingRole(null)}
              />
            )}
          </div>
        )}

        {/* Users Tab */}
        {activeTab === "users" && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="relative flex-1 max-w-xs">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A9805F]" />
                <input
                  type="text"
                  placeholder="Search users..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-white rounded-lg ring-1 ring-[#EDE1CF] text-sm text-[#3B2515] placeholder-[#A9805F] focus:outline-none focus:ring-[#B07B4F]"
                />
              </div>
              <span className="text-xs text-[#A9805F]">{filteredUsers.length} users</span>
            </div>

            {loading ? (
              <div className="text-center py-12 text-[#A9805F]">Loading users...</div>
            ) : (
              <div className="grid gap-3">
                {filteredUsers.map((user) => (
                  <div key={user._id} className="bg-white rounded-xl p-4 ring-1 ring-[#EDE1CF] space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-[#3B2515]">{user.userName}</div>
                        <div className="text-xs text-[#A9805F]">{user.email} &middot; Role: {user.role}</div>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-[#A9805F]">
                        <span>{user.effectivePermissions?.length || 0} effective</span>
                        <span>{user.permissions?.length || 0} granted</span>
                        <span>{user.revokedPermissions?.length || 0} revoked</span>
                        <button
                          onClick={() => setEditingUser(user)}
                          className="px-3 py-1.5 bg-[#3B2515] text-white rounded-lg text-xs font-medium hover:bg-[#4A3020] transition-colors"
                        >
                          Edit
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* User Permission Editor Modal */}
            {editingUser && (
              <UserPermissionEditor
                user={editingUser}
                roles={roles}
                onSave={handleUpdateUserPermissions}
                onReset={handleResetUserPermissions}
                onChangeRole={handleChangeUserRole}
                onClose={() => setEditingUser(null)}
              />
            )}
          </div>
        )}

        {/* Audit Tab */}
        {activeTab === "audit" && (
          <AuditLogView auditLogs={auditLogs} />
        )}
      </div>
    </div>
  );
}

function RoleEditor({ role, roles, onSave, onClose }) {
  const [name, setName] = useState(role.name || "");
  const [label, setLabel] = useState(role.label || "");
  const [description, setDescription] = useState(role.description || "");
  const [permissions, setPermissions] = useState(role.permissions || []);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    await onSave({ _id: role._id, name, label, description, permissions });
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[85vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b border-[#EDE1CF] px-6 py-4 flex items-center justify-between z-10">
          <h3 className="font-semibold text-[#3B2515]">{role._id ? `Edit: ${role.label}` : "New Role"}</h3>
          <button onClick={onClose} className="p-1 hover:bg-[#FBF6EF] rounded-lg"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#7B4B2A] mb-1">Name (slug)</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-3 py-2 bg-[#FBF6EF] rounded-lg text-sm text-[#3B2515] ring-1 ring-[#EDE1CF] focus:outline-none focus:ring-[#B07B4F]"
                placeholder="e.g., custom-manager"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#7B4B2A] mb-1">Label</label>
              <input
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                required
                className="w-full px-3 py-2 bg-[#FBF6EF] rounded-lg text-sm text-[#3B2515] ring-1 ring-[#EDE1CF] focus:outline-none focus:ring-[#B07B4F]"
                placeholder="e.g., Custom Manager"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-[#7B4B2A] mb-1">Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 bg-[#FBF6EF] rounded-lg text-sm text-[#3B2515] ring-1 ring-[#EDE1CF] focus:outline-none focus:ring-[#B07B4F]"
              placeholder="Role description"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-[#7B4B2A]">Permissions ({permissions.length} selected)</label>
            </div>
            <PermissionMatrix
              selectedPermissions={permissions}
              onPermissionsChange={setPermissions}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-[#EDE1CF]">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-[#7B4B2A] hover:bg-[#FBF6EF] rounded-lg transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#3B2515] text-white rounded-lg text-sm font-medium hover:bg-[#4A3020] disabled:opacity-50 transition-colors"
            >
              {saving ? "Saving..." : <><Save size={14} /> {role._id ? "Update Role" : "Create Role"}</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function UserPermissionEditor({ user, roles, onSave, onReset, onChangeRole, onClose }) {
  const [grantedPermissions, setGrantedPermissions] = useState(user.permissions || []);
  const [revokedPermissions, setRevokedPermissions] = useState(user.revokedPermissions || []);
  const [selectedRole, setSelectedRole] = useState(user.role || "");
  const [mode, setMode] = useState("grant");
  const [saving, setSaving] = useState(false);

  const roleOptions = useMemo(() => {
    const names = new Set(roles.map((r) => r.name));
    return [...names];
  }, [roles]);

  const handleSave = async () => {
    setSaving(true);
    await onSave(user._id, grantedPermissions, revokedPermissions);
    setSaving(false);
  };

  const handleRoleChange = async () => {
    if (selectedRole !== user.role && window.confirm(`Change role from "${user.role}" to "${selectedRole}"?`)) {
      await onChangeRole(user._id, selectedRole);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[85vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b border-[#EDE1CF] px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h3 className="font-semibold text-[#3B2515]">Permissions: {user.userName}</h3>
            <p className="text-xs text-[#A9805F]">{user.email}</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-[#FBF6EF] rounded-lg"><X size={18} /></button>
        </div>

        <div className="p-6 space-y-4">
          {/* Role Change */}
          <div className="flex items-center gap-3 bg-[#FBF6EF] rounded-xl p-4 ring-1 ring-[#EDE1CF]">
            <span className="text-sm font-medium text-[#3B2515]">Role:</span>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="px-3 py-1.5 bg-white rounded-lg text-sm text-[#3B2515] ring-1 ring-[#EDE1CF] focus:outline-none focus:ring-[#B07B4F]"
            >
              {roleOptions.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
            <button
              onClick={handleRoleChange}
              className="px-3 py-1.5 bg-[#3B2515] text-white rounded-lg text-xs font-medium hover:bg-[#4A3020] transition-colors"
            >
              Change Role
            </button>
            <button
              onClick={() => onReset(user._id)}
              className="flex items-center gap-1 px-3 py-1.5 text-rose-600 hover:bg-rose-50 rounded-lg text-xs font-medium transition-colors"
            >
              <RotateCcw size={12} />
              Reset to Defaults
            </button>
          </div>

          {/* Mode Toggle */}
          <div className="flex gap-2">
            <button
              onClick={() => setMode("grant")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                mode === "grant" ? "bg-[#3B2515] text-white" : "bg-[#FBF6EF] text-[#7B4B2A]"
              }`}
            >
              Grant Extra Permissions
            </button>
            <button
              onClick={() => setMode("revoke")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                mode === "revoke" ? "bg-rose-600 text-white" : "bg-[#FBF6EF] text-[#7B4B2A]"
              }`}
            >
              Revoke Role Permissions
            </button>
          </div>

          {/* Permission Matrix */}
          {mode === "grant" ? (
            <div>
              <p className="text-xs text-[#A9805F] mb-2">Select permissions to grant BEYOND role defaults:</p>
              <PermissionMatrix
                selectedPermissions={grantedPermissions}
                onPermissionsChange={setGrantedPermissions}
              />
            </div>
          ) : (
            <div>
              <p className="text-xs text-[#A9805F] mb-2">Select permissions to REMOVE from role defaults:</p>
              <PermissionMatrix
                selectedPermissions={revokedPermissions}
                onPermissionsChange={setRevokedPermissions}
              />
            </div>
          )}

          {/* Current State */}
          <div className="bg-[#FBF6EF] rounded-xl p-4 ring-1 ring-[#EDE1CF] space-y-2">
            <h4 className="text-xs font-semibold text-[#3B2515] uppercase tracking-wider">Current State</h4>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-[#A9805F]">Role:</span>
                <span className="ml-2 font-medium text-[#3B2515]">{user.role}</span>
              </div>
              <div>
                <span className="text-[#A9805F]">Granted:</span>
                <span className="ml-2 font-medium text-emerald-700">{grantedPermissions.length}</span>
              </div>
              <div>
                <span className="text-[#A9805F]">Revoked:</span>
                <span className="ml-2 font-medium text-rose-700">{revokedPermissions.length}</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-1 mt-2">
              {user.effectivePermissions?.slice(0, 10).map((p) => (
                <span key={p} className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-mono">{p}</span>
              ))}
              {(user.effectivePermissions?.length || 0) > 10 && (
                <span className="text-[10px] text-[#A9805F]">+{user.effectivePermissions.length - 10} more</span>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-[#EDE1CF]">
            <button onClick={onClose} className="px-4 py-2 text-sm text-[#7B4B2A] hover:bg-[#FBF6EF] rounded-lg transition-colors">
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#3B2515] text-white rounded-lg text-sm font-medium hover:bg-[#4A3020] disabled:opacity-50 transition-colors"
            >
              {saving ? "Saving..." : <><Save size={14} /> Save Permissions</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function AuditLogView({ auditLogs }) {
  if (!auditLogs?.length) {
    return <div className="text-center py-12 text-[#A9805F]">No audit logs available yet.</div>;
  }

  return (
    <div className="bg-white rounded-xl ring-1 ring-[#EDE1CF] overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#EDE1CF] bg-[#FBF6EF]">
              <th className="text-left px-4 py-3 text-xs font-medium text-[#7B4B2A] uppercase">Date</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-[#7B4B2A] uppercase">Action</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-[#7B4B2A] uppercase">Details</th>
            </tr>
          </thead>
          <tbody>
            {auditLogs.map((log, i) => (
              <tr key={log._id || i} className="border-b border-[#EDE1CF] last:border-0 hover:bg-[#FBF6EF]/50">
                <td className="px-4 py-3 text-[#A9805F] whitespace-nowrap">
                  {log.createdAt ? new Date(log.createdAt).toLocaleString() : "-"}
                </td>
                <td className="px-4 py-3 font-medium text-[#3B2515]">{log.action}</td>
                <td className="px-4 py-3 text-[#7B4B2A]">
                  {log.details ? JSON.stringify(log.details).slice(0, 80) + "..." : "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
