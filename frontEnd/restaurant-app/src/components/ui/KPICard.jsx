export default function KPICard({ label, value, trend, icon }) {
  return (
    <div className="rounded-[1.5rem] border border-[#EDE1CF] bg-white p-4 shadow-sm shadow-[#3B2515]/5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.24em] text-[#9C8268]">{label}</p>
          <p className="mt-2 font-serif text-2xl text-[#3B2515]">{value}</p>
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#FBF6EF] text-[#B07B4F]" aria-hidden="true">
          {icon}
        </div>
      </div>
      <p className="mt-3 text-xs font-medium text-emerald-600">{trend}</p>
    </div>
  );
}
