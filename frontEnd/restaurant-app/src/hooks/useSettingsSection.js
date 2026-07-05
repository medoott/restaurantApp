import { useCallback } from "react";

export default function useSettingsSection(sectionKey, data, onChange) {
  const handleChange = useCallback((field, value) => {
    onChange(sectionKey, { ...data, [field]: value });
  }, [sectionKey, data, onChange]);

  const handleToggle = useCallback((field) => {
    onChange(sectionKey, { ...data, [field]: !data[field] });
  }, [sectionKey, data, onChange]);

  return { handleChange, handleToggle };
}
