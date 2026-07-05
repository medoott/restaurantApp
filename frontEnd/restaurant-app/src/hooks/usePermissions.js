import { useMemo } from "react";
import { useSettings } from "../context/useSettings.js";
import {
  getEffectivePermissions,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  getDashboardSections,
  getTopPages,
} from "../utils/permissions.js";

export default function usePermissions(user) {
  const settingsContext = useSettings();
  const settings = settingsContext?.settings;

  const effectivePermissions = useMemo(() => {
    return getEffectivePermissions(user, settings);
  }, [user, settings]);

  const permissionUtils = useMemo(() => {
    const can = (key) => hasPermission(effectivePermissions, key);
    const canAny = (keys) => hasAnyPermission(effectivePermissions, keys);
    const canAll = (keys) => hasAllPermissions(effectivePermissions, keys);

    const dashboardSections = getDashboardSections(effectivePermissions);
    const topPages = getTopPages(effectivePermissions);

    const pages = topPages.map((p) => p.key);
    if (dashboardSections.length > 0 && !pages.includes("dashboard")) {
      pages.unshift("dashboard");
    }

    return {
      permissions: effectivePermissions,
      can,
      canAny,
      canAll,
      dashboardSections,
      topPages,
      pages,
    };
  }, [effectivePermissions]);

  return permissionUtils;
}
