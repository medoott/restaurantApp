import usePermissions from "../../hooks/usePermissions.js";

export default function RequirePermission({
  permission,
  capability,
  access,
  role,
  user,
  fallback = null,
  children,
}) {
  const resolvedUser = user || { role: role || "User", permissions: [], revokedPermissions: [] };
  const { can } = usePermissions(resolvedUser);

  if (access && capability) {
    if (Object.prototype.hasOwnProperty.call(access, capability)) {
      return access[capability] ? children : fallback;
    }
    return fallback;
  }

  if (permission) {
    return can(permission) ? children : fallback;
  }

  return fallback;
}
