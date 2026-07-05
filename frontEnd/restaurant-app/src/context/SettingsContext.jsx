import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { initialSettings } from "../components/dashboard/settings/initialSettings.js";
import { apiRequest } from "../services/api.js";
import { SettingsContext } from "./settingsContext.js";

function deepEqual(a, b) {
  if (a === b) return true;
  if (!a || !b || typeof a !== "object" || typeof b !== "object") return false;
  const ka = Object.keys(a);
  const kb = Object.keys(b);
  if (ka.length !== kb.length) return false;
  for (const k of ka) {
    if (!kb.includes(k)) return false;
    if (!deepEqual(a[k], b[k])) return false;
  }
  return true;
}

function deepClone(obj) {
  if (obj === undefined || obj === null) return obj;
  return JSON.parse(JSON.stringify(obj));
}

function validateSettings(settings) {
  const errs = {};
  const gen = settings.general;
  if (!gen?.name?.trim()) errs.name = "Restaurant name is required";
  if (gen?.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(gen.email)) {
    errs.email = "Invalid email format";
  }
  return errs;
}

export function SettingsProvider({ children, authToken }) {
  const [loaded, setLoaded] = useState(false);
  const [settings, setSettings] = useState(() => deepClone(initialSettings));
  const [savedSettings, setSavedSettings] = useState(() => deepClone(initialSettings));
  const [defaultSettings] = useState(() => deepClone(initialSettings));
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState(null);
  const [errors, setErrors] = useState({});

  const notifTimer = useRef(null);

  const showNotification = useCallback((n) => {
    if (notifTimer.current) clearTimeout(notifTimer.current);
    setNotification(n);
    notifTimer.current = setTimeout(() => setNotification(null), 3000);
  }, []);

  const loadFromApi = useCallback(async () => {
    try {
      const res = await apiRequest("/settings", { authToken });
      if (res?.data) {
        const merged = { ...deepClone(initialSettings) };
        for (const key of Object.keys(res.data)) {
          if (key === "staff") {
            merged.staff = { ...merged.staff, ...res.data.staff };
            if (res.data.staff?.roles?.length) merged.staff.roles = res.data.staff.roles;
            if (res.data.staff?.users?.length) merged.staff.users = res.data.staff.users;
            if (res.data.staff?.auditLogs?.length) merged.staff.auditLogs = res.data.staff.auditLogs;
          } else {
            merged[key] = res.data[key];
          }
        }
        setSettings(merged);
        setSavedSettings(deepClone(merged));
      }
    } catch (err) {
      console.error("Failed to load settings from API:", err);
    } finally {
      setLoaded(true);
    }
  }, [authToken]);

  useEffect(() => {
    loadFromApi();
  }, [loadFromApi]);

  const debounceTimer = useRef(null);

  useEffect(() => {
    if (!settings) return;
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      if (settings.general?.name) {
        document.title = settings.general.name;
      }

      if (settings.branding?.favicon) {
        let link = document.querySelector("link[rel*='icon']");
        if (!link) {
          link = document.createElement("link");
          link.rel = "shortcut icon";
          document.head.appendChild(link);
        }
        link.href = settings.branding.favicon;
      }

      if (settings.branding?.fontFamily) {
        const fontId = "dynamic-google-font";
        let link = document.getElementById(fontId);
        if (!link) {
          link = document.createElement("link");
          link.id = fontId;
          link.rel = "stylesheet";
          document.head.appendChild(link);
        }
        link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(settings.branding.fontFamily)}:wght@300;400;500;600;700&display=swap`;
        document.documentElement.style.fontFamily = `'${settings.branding.fontFamily}', sans-serif`;
      }

      if (settings.branding?.mode === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }

      const colorsId = "dynamic-color-variables";
      let styleTag = document.getElementById(colorsId);
      if (!styleTag) {
        styleTag = document.createElement("style");
        styleTag.id = colorsId;
        document.head.appendChild(styleTag);
      }

      const primary = settings.branding?.primaryColor || "#3B2515";
      const secondary = settings.branding?.secondaryColor || "#B07B4F";
      const accent = settings.branding?.accentColor || "#C9925F";

      const hexToRgb = (hex) => {
        const clean = String(hex).replace(/[^a-fA-F0-9]/g, "").slice(0, 6);
        if (clean.length < 6) return "0, 0, 0";
        return `${parseInt(clean.slice(0, 2), 16)}, ${parseInt(clean.slice(2, 4), 16)}, ${parseInt(clean.slice(4, 6), 16)}`;
      };

      styleTag.textContent = `
        :root {
          --primary-color: ${primary};
          --primary-rgb: ${hexToRgb(primary)};
          --secondary-color: ${secondary};
          --secondary-rgb: ${hexToRgb(secondary)};
          --accent-color: ${accent};
          --accent-rgb: ${hexToRgb(accent)};
        }
      `;
    }, 500);
    return () => { if (debounceTimer.current) clearTimeout(debounceTimer.current); };
  }, [settings]);

  useEffect(() => {
    return () => {
      if (notifTimer.current) clearTimeout(notifTimer.current);
    };
  }, []);

  const changedSections = useMemo(() => {
    const changed = new Set();
    for (const key of Object.keys(settings)) {
      if (!deepEqual(settings[key], savedSettings[key])) {
        changed.add(key);
      }
    }
    return changed;
  }, [settings, savedSettings]);

  const hasChanges = changedSections.size > 0;

  const updateSection = useCallback((sectionKey, newData) => {
    setSettings((prev) => ({ ...prev, [sectionKey]: newData }));
    setErrors({});
  }, []);

  const handleSave = useCallback(async () => {
    const newErrors = validateSettings(settings);
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return false;

    setSaving(true);
    try {
      const res = await apiRequest("/settings", {
        method: "PUT",
        body: JSON.stringify(settings),
        authToken,
      });
      setSavedSettings(deepClone(settings));
      showNotification({ type: "success", message: res?.message || "All settings saved successfully!" });
      return true;
    } catch (err) {
      showNotification({ type: "error", message: err.message || "Failed to save settings" });
      return false;
    } finally {
      setSaving(false);
    }
  }, [settings, authToken, showNotification]);

  const handleReset = useCallback(() => {
    setSettings(deepClone(savedSettings));
    setErrors({});
    showNotification({ type: "info", message: "Changes have been reset" });
  }, [savedSettings, showNotification]);

  const handleRestoreDefaults = useCallback(() => {
    setSettings(deepClone(defaultSettings));
    setErrors({});
    showNotification({ type: "info", message: "Default settings restored. Save to apply changes." });
  }, [defaultSettings, showNotification]);

  const unsavedCount = changedSections.size;

  const value = useMemo(() => ({
    loaded,
    settings,
    savedSettings,
    defaultSettings,
    saving,
    notification,
    errors,
    hasChanges,
    changedSections,
    unsavedCount,
    updateSection,
    handleSave,
    handleReset,
    handleRestoreDefaults,
    showNotification,
    setErrors,
  }), [
    loaded, settings, savedSettings, defaultSettings, saving, notification,
    errors, hasChanges, changedSections, unsavedCount,
    updateSection, handleSave, handleReset, handleRestoreDefaults, showNotification,
  ]);

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}
