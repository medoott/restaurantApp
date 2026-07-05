export default function KPICard({ label, value, trend, icon }) {
  return (
    <div className="rounded-2xl bg-white ring-1 ring-[#EDE1CF] shadow-sm shadow-[#3B2515]/5 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-[#9C8268] uppercase tracking-wide">
            {label}
          </p>
          <p className="text-2xl font-serif text-[#3B2515] mt-2">{value}</p>
        </div>
        <span className="text-3xl" aria-hidden="true">{icon}</span>
      </div>
      <p className="mt-3 text-xs font-medium text-emerald-600">{trend}</p>
    </div>
  );
}
