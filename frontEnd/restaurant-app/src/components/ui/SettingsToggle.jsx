import ToggleSwitch from "./ToggleSwitch.jsx";

export default function SettingsToggle({ icon: Icon, label, enabled, onChange, description }) {
  return (
    <label className="flex items-center justify-between rounded-xl border border-[#EDE1CF] bg-white px-4 py-3 hover:bg-[#FBF6EF] transition-colors cursor-pointer">
      <span className="flex items-center gap-2.5 text-sm text-[#3B2515]">
        {Icon && <Icon size={15} className="text-[#A9805F]" />}
        <span>{label}</span>
        {description && <span className="text-[10px] text-[#9C8268] ml-1">{description}</span>}
      </span>
      <ToggleSwitch enabled={enabled} onChange={onChange} size="sm" />
    </label>
  );
}
