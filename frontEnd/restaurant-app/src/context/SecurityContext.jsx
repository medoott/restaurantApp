import { createContext, useContext, useMemo } from "react";
import { useSettings } from "./useSettings.js";
import {
  getEffectivePermissions,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  getDashboardSections,
  getTopPages,
} from "../utils/permissions.js";

export const SecurityContext = createContext(null);

export function SecurityProvider({ user, children }) {
  const settingsContext = useSettings();
  const settings = settingsContext?.settings;

  const effectivePermissions = useMemo(() => {
    return getEffectivePermissions(user, settings);
  }, [user, settings]);

  const securityValue = useMemo(() => {
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
      user,
    };
  }, [effectivePermissions, user]);

  return (
    <SecurityContext.Provider value={securityValue}>
      {children}
    </SecurityContext.Provider>
  );
}

export function useSecurity() {
  const ctx = useContext(SecurityContext);
  if (!ctx) {
    return {
      permissions: [],
      can: () => false,
      canAny: () => false,
      canAll: () => false,
      dashboardSections: [],
      topPages: [],
      pages: [],
      user: null,
    };
  }
  return ctx;
}
