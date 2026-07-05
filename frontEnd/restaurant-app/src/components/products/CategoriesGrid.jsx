import { useMemo } from "react";

export default function CategoriesGrid({ products, loading }) {
  const categories = useMemo(
    () => [...new Set((products || []).map((p) => p.category))],
    [products],
  );

  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-2xl bg-white ring-1 ring-[#EDE1CF] shadow-sm shadow-[#3B2515]/5 p-5 animate-pulse"
          >
            <div className="h-5 w-24 bg-gray-200 rounded mb-2" />
            <div className="h-3 w-16 bg-gray-100 rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (!categories.length) {
    return (
      <div className="rounded-2xl bg-white ring-1 ring-[#EDE1CF] shadow-sm shadow-[#3B2515]/5 p-8 text-center text-sm text-[#A9805F]">
        No categories yet. Add products to see them grouped here.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
      {categories.map((cat) => {
        const count = products.filter((p) => p.category === cat).length;
        return (
          <div
            key={cat}
            className="rounded-2xl bg-white ring-1 ring-[#EDE1CF] shadow-sm shadow-[#3B2515]/5 p-5 hover:shadow-md transition-shadow"
          >
            <p className="font-serif text-lg text-[#3B2515]">{cat}</p>
            <p className="text-xs text-[#A9805F] mt-1">{count} items</p>
          </div>
        );
      })}
    </div>
  );
}
