import { useMemo } from "react";
import { useSettings } from "../../context/useSettings.js";
import { STATUS_STYLES } from "../../utils/constants.js";

export default function StatusBadge({ status }) {
  const settings = useSettings()?.settings;

  const configuredStatus = useMemo(
    () => settings?.orderStatuses?.statuses?.find(
      (s) => String(s.name).toLowerCase() === String(status).toLowerCase()
    ),
    [settings?.orderStatuses?.statuses, status]
  );

  const resolvedStatus = status || "Unknown";
  let style = STATUS_STYLES[resolvedStatus] || "bg-stone-100 text-stone-600 ring-1 ring-stone-300";

  const badgeStyle = useMemo(() => {
    if (!configuredStatus?.color) return {};
    const hex = configuredStatus.color;
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    const rgb = result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : "120, 120, 120";
    return {
      backgroundColor: `rgba(${rgb}, 0.08)`,
      color: hex,
      borderColor: `rgba(${rgb}, 0.25)`,
      borderWidth: "1px",
      borderStyle: "solid",
    };
  }, [configuredStatus?.color]);

  const hasCustomStyle = !!configuredStatus?.color;

  return (
    <span
      style={hasCustomStyle ? badgeStyle : {}}
      className={hasCustomStyle ? "inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold" : `inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${style}`}
    >
      {resolvedStatus}
    </span>
  );
}
