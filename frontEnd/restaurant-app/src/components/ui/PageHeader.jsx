export default function PageHeader({ title, description, actions, className = "" }) {
  return (
    <div className={`flex flex-col gap-4 rounded-[1.5rem] border border-[#EDE1CF] bg-white/80 px-5 py-4 shadow-sm shadow-[#3B2515]/5 sm:flex-row sm:items-center sm:justify-between ${className}`}>
      <div>
        <h1 className="font-serif text-2xl text-[#3B2515]">{title}</h1>
        {description && <p className="mt-1 text-sm text-[#A9805F]">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}
