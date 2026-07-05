export default function PageHeader({ title, description, actions, className = "" }) {
  return (
    <div className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6 ${className}`}>
      <div>
        <h1 className="text-2xl font-serif text-[#3B2515]">{title}</h1>
        {description && <p className="text-sm text-[#A9805F] mt-1">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}
