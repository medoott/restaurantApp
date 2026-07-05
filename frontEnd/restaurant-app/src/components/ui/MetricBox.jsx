export default function MetricBox({ title, value, subtitle, icon, color }) {
  return (
    <div
      className={`rounded-xl ${color} ring-1 ring-[#EDE1CF]/30 p-4 hover:shadow-md transition-shadow`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-[#9C8268] uppercase tracking-wide font-semibold">
            {title}
          </p>
          <p className="text-xl font-serif text-[#3B2515] mt-2">{value}</p>
          <p className="text-xs text-[#A9805F] mt-1">{subtitle}</p>
        </div>
        <span className="text-3xl" aria-hidden="true">{icon}</span>
      </div>
    </div>
  );
}
