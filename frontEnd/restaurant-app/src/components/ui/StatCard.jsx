export default function StatCard({ label, value, accent }) {
  return (
    <div className="rounded-2xl bg-white ring-1 ring-[#EDE1CF] shadow-sm shadow-[#3B2515]/5 p-5 flex items-center justify-between hover:shadow-md transition-shadow">
      <div>
        <p className="text-xs text-[#A9805F] uppercase tracking-wide">
          {label}
        </p>
        <p className="font-serif text-2xl text-[#3B2515] mt-1">{value}</p>
      </div>
      <div className={`w-2.5 h-10 rounded-full ${accent}`} />
    </div>
  );
}
