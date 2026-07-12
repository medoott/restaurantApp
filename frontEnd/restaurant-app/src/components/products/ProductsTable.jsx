import { useMemo } from "react";
import { useSettings } from "../../context/useSettings.js";

export default function ProductsTable({ products, onAddClick, showEdit, loading }) {
  const settings = useSettings()?.settings;

  const density = settings?.appearance?.tableDensity || "default";

  const paddingClass = useMemo(() => {
    if (density === "compact") return "px-3 py-1.5";
    if (density === "spacious") return "px-6 py-4.5";
    return "px-5 py-3";
  }, [density]);

  if (loading) {
    return (
      <div className="overflow-hidden rounded-[1.5rem] border border-[#EDE1CF] bg-white shadow-sm shadow-[#3B2515]/5">
        <div className="border-b border-[#EDE1CF] px-5 py-4">
          <div className="h-5 w-32 animate-pulse rounded bg-gray-200" />
        </div>
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[#A9805F] text-xs uppercase tracking-wide">
                <th className={`${paddingClass} font-medium`}>Product</th>
                <th className={`${paddingClass} font-medium`}>Category</th>
                <th className={`${paddingClass} font-medium`}>Price</th>
                <th className={`${paddingClass} font-medium`}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {[1, 2, 3, 4, 5].map((i) => (
                <tr key={i} className="border-b border-[#F3EBDC] animate-pulse">
                  <td className={paddingClass}>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-gray-200" />
                      <div className="h-4 w-32 bg-gray-200 rounded" />
                    </div>
                  </td>
                  <td className={paddingClass}><div className="h-4 w-20 bg-gray-200 rounded" /></td>
                  <td className={paddingClass}><div className="h-4 w-16 bg-gray-200 rounded" /></td>
                  <td className={paddingClass}><div className="h-4 w-10 bg-gray-200 rounded" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (!products.length) {
    return (
      <div className="rounded-[1.5rem] border border-[#EDE1CF] bg-white p-8 text-center text-sm text-[#A9805F] shadow-sm shadow-[#3B2515]/5">
        No products found.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[1.5rem] border border-[#EDE1CF] bg-white shadow-sm shadow-[#3B2515]/5">
      <div className="flex flex-col gap-3 border-b border-[#EDE1CF] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="font-serif text-lg text-[#3B2515]">All Products</h2>
        {typeof onAddClick === "function" && (
          <button
            onClick={() => onAddClick()}
            className="text-xs font-medium px-3.5 py-2 rounded-full bg-[#3B2515] text-[#F3E5D3] hover:bg-[#4A2E18] transition-colors"
          >
            + Add Product
          </button>
        )}
      </div>

      <div className="sm:hidden space-y-3 px-4 py-4">
        {products.map((p) => (
          <div
            key={p.id}
            className="rounded-[1.25rem] bg-[#FBF6EF] p-4 ring-1 ring-[#EDE1CF] shadow-sm"
          >
            <div className="flex items-center gap-3">
              <img
                src={p.img}
                alt={p.name}
                className="w-16 h-16 rounded-2xl object-cover"
                loading="lazy"
                decoding="async"
              />
              <div className="min-w-0">
                <p className="font-medium text-[#3B2515] truncate">{p.name}</p>
                <p className="text-xs text-[#9C8268] truncate">{p.category}</p>
                <p className="mt-2 text-sm font-semibold text-[#B07B4F]">
                  ${p.price.toFixed(2)}
                </p>
              </div>
            </div>
            {showEdit && (
              <button
                onClick={() => {}}
                className="mt-4 w-full rounded-full bg-[#3B2515] px-3 py-2 text-sm font-medium text-[#F3E5D3] transition-colors hover:bg-[#4A2E18]"
              >
                Edit
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[#A9805F] text-xs uppercase tracking-wide">
              <th className={`${paddingClass} font-medium`}>Product</th>
              <th className={`${paddingClass} font-medium`}>Category</th>
              <th className={`${paddingClass} font-medium`}>Price</th>
              <th className={`${paddingClass} font-medium`}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p, idx) => (
              <tr
                key={p.id}
                className={`${idx !== products.length - 1 ? "border-b border-[#F3EBDC]" : ""} hover:bg-[#FBF6EF] transition-colors`}
              >
                <td className={paddingClass}>
                  <div className="flex items-center gap-3">
                    <img
                      src={p.img}
                      alt={p.name}
                      className="w-9 h-9 rounded-lg object-cover"
                      loading="lazy"
                      decoding="async"
                    />
                    <span className="font-medium text-[#3B2515]">{p.name}</span>
                  </div>
                </td>
                <td className={`${paddingClass} text-[#9C8268]`}>{p.category}</td>
                <td className={`${paddingClass} font-medium text-[#B07B4F]`}>
                  ${p.price.toFixed(2)}
                </td>
                <td className={paddingClass}>
                  {showEdit ? (
                    <button
                      onClick={() => {}}
                      className="text-xs font-medium text-[#3B2515] underline decoration-[#D8B68B] underline-offset-2 transition-colors hover:text-[#7B4B2A]"
                    >
                      Edit
                    </button>
                  ) : (
                    <span className="text-xs text-[#9C8268]">Restricted</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
