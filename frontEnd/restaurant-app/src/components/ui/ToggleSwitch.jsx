export default function ToggleSwitch({ enabled, onChange, size = "md", disabled = false }) {
  const sizes = {
    sm: { track: "w-9 h-5", thumb: "w-4 h-4", translate: "translate-x-4" },
    md: { track: "w-10 h-5.5", thumb: "w-4.5 h-4.5", translate: "translate-x-4.5" },
  };
  const s = sizes[size] || sizes.md;

  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      disabled={disabled}
      onClick={() => !disabled && onChange(!enabled)}
      className={`relative inline-flex shrink-0 rounded-full transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${s.track} ${
        enabled ? "bg-[#B07B4F]" : "bg-[#EDE1CF]"
      }`}
    >
      <span
        className={`pointer-events-none inline-block rounded-full bg-white shadow-sm ring-0 transition-transform ${s.thumb} ${
          enabled ? `${s.translate}` : "translate-x-0.5"
        } mt-0.5 ml-0.5`}
      />
    </button>
  );
}
