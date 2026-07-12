import { useCallback, useEffect, useState } from "react";
import { globalSearch } from "../services/data.js";
import { Search, Clock, Package, Grid3X3, Users, Truck, Warehouse, Calendar, Briefcase, X, ArrowRight } from "lucide-react";

const GROUP_CONFIG = {
  orders: { label: "Orders", icon: Clock, color: "bg-sky-100 text-sky-700 ring-sky-200" },
  products: { label: "Products", icon: Package, color: "bg-emerald-100 text-emerald-700 ring-emerald-200" },
  tables: { label: "Tables", icon: Grid3X3, color: "bg-amber-100 text-amber-700 ring-amber-200" },
  customers: { label: "Customers", icon: Users, color: "bg-purple-100 text-purple-700 ring-purple-200" },
  suppliers: { label: "Suppliers", icon: Truck, color: "bg-rose-100 text-rose-700 ring-rose-200" },
  inventoryItems: { label: "Inventory Items", icon: Warehouse, color: "bg-indigo-100 text-indigo-700 ring-indigo-200" },
  reservations: { label: "Reservations", icon: Calendar, color: "bg-orange-100 text-orange-700 ring-orange-200" },
  employees: { label: "Employees", icon: Briefcase, color: "bg-teal-100 text-teal-700 ring-teal-200" },
};

function ResultItem({ item, groupKey }) {
  const getPrimary = () => {
    if (groupKey === "orders") return `Order #${item.code || item.id}`;
    if (groupKey === "products") return item.name || item.title || `Product #${item.id}`;
    if (groupKey === "tables") return `Table ${item.number || item.name || item.id}`;
    if (groupKey === "customers") return item.name || item.email || `Customer #${item.id}`;
    if (groupKey === "suppliers") return item.name || item.company || `Supplier #${item.id}`;
    if (groupKey === "inventoryItems") return item.name || item.sku || `Item #${item.id}`;
    if (groupKey === "reservations") return `Reservation #${item.code || item.id}`;
    if (groupKey === "employees") return item.name || item.email || `Employee #${item.id}`;
    return `Item #${item.id}`;
  };

  const getDetail = () => {
    if (groupKey === "orders") return `${item.items || 0} items · ${item.status || "—"} · $${Number(item.total || 0).toFixed(2)}`;
    if (groupKey === "products") return `${item.category || "Misc"} · $${Number(item.price || 0).toFixed(2)}`;
    if (groupKey === "tables") return `Seats: ${item.seats || item.capacity || "—"} · ${item.status || "Available"}`;
    if (groupKey === "customers") return `${item.phone || "—"} · ${item.orders || 0} orders`;
    if (groupKey === "suppliers") return `${item.contact || "—"} · ${item.email || ""}`;
    if (groupKey === "inventoryItems") return `Qty: ${item.quantity ?? item.stock ?? 0} · ${item.unit || "units"}`;
    if (groupKey === "reservations") return `${item.date ? new Date(item.date).toLocaleDateString() : "—"} · ${item.guests || 0} guests · ${item.status || "Pending"}`;
    if (groupKey === "employees") return `${item.role || "—"} · ${item.email || ""}`;
    return "";
  };

  return (
    <button className="w-full flex items-center justify-between px-4 py-3 rounded-xl hover:bg-[#FBF6EF] transition-colors group text-left">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-[#3B2515] truncate">{getPrimary()}</p>
        <p className="text-xs text-[#A9805F] mt-0.5 truncate">{getDetail()}</p>
      </div>
      <ArrowRight size={14} className="text-[#A9805F] opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-3" />
    </button>
  );
}

export default function GlobalSearchPage({ permissions = { can: (_) => false } }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const debouncedSearch = useCallback(() => {
    if (!query.trim()) {
      setResults(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    const timer = setTimeout(async () => {
      try {
        const data = await globalSearch(query.trim(), 10);
        setResults(data);
      } catch (err) {
        setError(err.message || "Search failed");
        setResults(null);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const cleanup = debouncedSearch();
    return cleanup;
  }, [debouncedSearch]);

  const nonEmptyGroups = results
    ? Object.entries(GROUP_CONFIG).filter(([key]) => {
        const items = Array.isArray(results[key]) ? results[key] : Array.isArray(results[key + "s"]) ? results[key + "s"] : [];
        return items.length > 0;
      })
    : [];

  const totalResults = nonEmptyGroups.reduce((sum, [key]) => {
    const items = Array.isArray(results[key]) ? results[key] : [];
    return sum + items.length;
  }, 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif text-xl text-[#3B2515]">Global Search</h2>
        <p className="text-xs text-[#A9805F] mt-0.5">Search across all restaurant modules</p>
      </div>

      <div className="flex items-center gap-2 rounded-2xl bg-white px-5 py-4 ring-1 ring-[#EDE1CF] shadow-sm">
        <Search size={18} className="text-[#A9805F] shrink-0" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search orders, products, tables, customers..."
          className="w-full bg-transparent text-sm text-[#3B2515] placeholder:text-[#A9805F] outline-none"
          aria-label="Global search"
          autoFocus
        />
        {query && (
          <button onClick={() => setQuery("")} className="text-[#A9805F] hover:text-[#3B2515] transition-colors">
            <X size={16} />
          </button>
        )}
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
      )}

      {loading && (
        <div className="text-center py-16 text-[#9C8268] text-sm">
          <div className="animate-pulse">Searching...</div>
        </div>
      )}

      {!loading && query.trim() && results && nonEmptyGroups.length === 0 && (
        <div className="text-center py-16 text-[#9C8268] text-sm">
          <Search size={32} className="mx-auto mb-3 opacity-30" />
          <p>No results found for "{query}"</p>
          <p className="text-xs mt-1">Try different keywords or check spelling</p>
        </div>
      )}

      {!loading && !query.trim() && (
        <div className="text-center py-16 text-[#9C8268] text-sm">
          <Search size={32} className="mx-auto mb-3 opacity-30" />
          <p>Type to search across all modules</p>
          <p className="text-xs mt-1">Orders, products, tables, customers, suppliers, inventory, reservations, employees</p>
        </div>
      )}

      {!loading && results && nonEmptyGroups.length > 0 && (
        <div className="space-y-4">
          <p className="text-xs text-[#A9805F]">{totalResults} result{totalResults !== 1 ? "s" : ""} found</p>
          {nonEmptyGroups.map(([key, config]) => {
            const items = Array.isArray(results[key]) ? results[key] : [];
            const Icon = config.icon;
            return (
              <div key={key} className="rounded-2xl bg-white ring-1 ring-[#EDE1CF] shadow-sm overflow-hidden">
                <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-[#EDE1CF] bg-[#FBF6EF]">
                  <Icon size={16} className="text-[#3B2515]" />
                  <span className="font-medium text-sm text-[#3B2515]">{config.label}</span>
                  <span className={`ml-auto text-[10px] font-medium px-2 py-0.5 rounded-full ${config.color}`}>
                    {items.length}
                  </span>
                </div>
                <div className="divide-y divide-[#EDE1CF]/50">
                  {items.map((item, i) => (
                    <ResultItem key={item._id || item.id || i} item={item} groupKey={key} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
