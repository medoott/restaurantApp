import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  SquareStack, Users, Coffee, Clock, DollarSign, X, Search, Phone, Hash,
} from "lucide-react";
import * as dataService from "../services/data.js";
import StatusBadge from "../components/ui/StatusBadge.jsx";
import { TableGridSkeleton } from "../components/ui/Skeleton.jsx";

const STATUS_META = {
  Available: { label: "Available", dot: "bg-emerald-400", bg: "bg-emerald-50 border-emerald-200", text: "text-emerald-700" },
  Occupied: { label: "Occupied", dot: "bg-amber-400", bg: "bg-amber-50 border-amber-200", text: "text-amber-700" },
  Reserved: { label: "Reserved", dot: "bg-sky-400", bg: "bg-sky-50 border-sky-200", text: "text-sky-700" },
};

export default function TablesDashboardPage({ orders, initialTableNumber }) {
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTable, setSelectedTable] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  const loadTables = useCallback(async () => {
    setLoading(true);
    try {
      const data = await dataService.fetchAllTables();
      setTables(data);
    } catch { } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadTables(); }, [loadTables]);

  const tableOrders = useMemo(() => {
    const map = {};
    for (const o of orders) {
      if (o.tableNumber != null) {
        if (!map[o.tableNumber]) map[o.tableNumber] = [];
        map[o.tableNumber].push(o);
      }
    }
    return map;
  }, [orders]);

  const enriched = useMemo(() => {
    return tables.map((t) => {
      const tOrders = tableOrders[t.tableNumber] || [];
      const activeOrders = tOrders.filter((o) => o.status !== "Cancelled" && o.status !== "Rejected");
      const computedStatus = activeOrders.length > 0 ? "Occupied" : t.status;
      return { ...t, computedStatus, activeOrders, orderHistory: tOrders };
    });
  }, [tables, tableOrders]);

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return enriched;
    const q = searchQuery.toLowerCase();
    return enriched.filter((t) =>
      String(t.tableNumber).includes(q) ||
      t.status?.toLowerCase().includes(q) ||
      t.computedStatus?.toLowerCase().includes(q) ||
      t.notes?.toLowerCase().includes(q)
    );
  }, [enriched, searchQuery]);

  // Auto-select table when initialTableNumber is provided
  useEffect(() => {
    if (initialTableNumber && enriched.length > 0) {
      const found = enriched.find((t) => t.tableNumber === Number(initialTableNumber));
      if (found) setSelectedTable(found);
    }
  }, [initialTableNumber, enriched]);

  const selectedEnriched = selectedTable
    ? enriched.find((t) => t._id === selectedTable._id)
    : null;

  const handleStatusClick = async (table, newStatus) => {
    try {
      await dataService.updateTableById(table._id, { status: newStatus });
      loadTables();
    } catch { }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-xl text-[#3B2515] flex items-center gap-2">
            <SquareStack size={18} /> Tables
          </h2>
          <p className="text-xs text-[#A9805F] mt-0.5">Real-time table overview</p>
        </div>
        <div className="relative w-full sm:w-56">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A9805F]" />
          <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tables..."
            className="w-full rounded-full border border-[#EDE1CF] bg-white pl-9 pr-4 py-2 text-sm text-[#3B2515] outline-none focus:ring-2 focus:ring-[#B07B4F]/40" />
        </div>
      </div>

      {loading ? (
        <TableGridSkeleton count={8} />
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-[#9C8268] text-sm">
          {searchQuery ? "No tables match your search" : "No tables created yet"}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((table) => {
            const meta = STATUS_META[table.computedStatus] || STATUS_META.Available;
            const totalItems = table.activeOrders.reduce((sum, o) =>
              sum + (o.itemsDetail || []).reduce((s, i) => s + i.qty, 0), 0);
            return (
              <motion.button key={table._id} layout
                onClick={() => setSelectedTable(table)}
                className={`text-left rounded-2xl ring-1 ring-[#EDE1CF] shadow-sm shadow-[#3B2515]/5 p-5 hover:shadow-md transition-all bg-white`}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-serif text-lg text-[#3B2515]">Table {table.tableNumber}</h3>
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <span className={`w-2.5 h-2.5 rounded-full ${meta.dot}`} />
                      <span className="text-xs font-medium text-[#7B4B2A]">{meta.label}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-[#9C8268] bg-[#FBF6EF] rounded-full px-2.5 py-1">
                    <Users size={12} /> {table.capacity}
                  </div>
                </div>
                {table.activeOrders.length > 0 ? (
                  <div className="mt-3 pt-3 border-t border-[#EDE1CF] space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#A9805F] flex items-center gap-1">
                        <Coffee size={12} /> {table.activeOrders.length} active order{table.activeOrders.length > 1 ? "s" : ""}
                      </span>
                      <span className="text-[#9C8268]">{totalItems} total items</span>
                    </div>
                    {table.activeOrders.slice(0, 2).map((ao) => (
                      <div key={ao.id} className="flex items-center justify-between gap-2 text-[11px]">
                        <span className="truncate text-[#7B4B2A]">
                          {ao.guestLabel || ao.customer || "Guest"}
                        </span>
                        <StatusBadge status={ao.status} />
                      </div>
                    ))}
                    {table.activeOrders.length > 2 && (
                      <p className="text-[10px] text-[#9C8268]">+{table.activeOrders.length - 2} more</p>
                    )}
                  </div>
                ) : table.orderHistory.length > 0 ? (
                  <div className="mt-3 pt-3 border-t border-[#EDE1CF]">
                    <p className="text-xs text-[#9C8268]">{table.orderHistory.length} previous orders</p>
                  </div>
                ) : (
                  <div className="mt-3 pt-3 border-t border-[#EDE1CF]">
                    <p className="text-xs text-[#9C8268]">No orders yet</p>
                  </div>
                )}
              </motion.button>
            );
          })}
        </div>
      )}

      <AnimatePresence>
        {selectedEnriched && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
            onClick={() => setSelectedTable(null)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[80vh] overflow-y-auto">
              <div className="sticky top-0 bg-white z-10 flex items-center justify-between px-6 py-4 border-b border-[#EDE1CF]">
                <div>
                  <h3 className="font-serif text-lg text-[#3B2515]">Table {selectedEnriched.tableNumber}</h3>
                  <p className="text-xs text-[#A9805F]">Capacity: {selectedEnriched.capacity} guests</p>
                </div>
                <button onClick={() => setSelectedTable(null)} className="text-[#9C8268] hover:text-[#3B2515]">
                  <X size={18} />
                </button>
              </div>
              <div className="p-6 space-y-6">
                <div>
                  <h4 className="text-xs text-[#A9805F] uppercase tracking-wide font-medium mb-2">Status</h4>
                  <div className="flex gap-2">
                    {["Available", "Occupied", "Reserved"].map((s) => {
                      const m = STATUS_META[s];
                      const isActive = selectedEnriched.computedStatus === s;
                      return (
                        <button key={s} onClick={() => handleStatusClick(selectedEnriched, s)}
                          className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition-all ${
                            isActive ? `${m.bg} ${m.text} ring-1 ring-current` : "bg-[#FBF6EF] text-[#9C8268] hover:bg-[#EDE1CF]"
                          }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${m.dot}`} />
                          {m.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {selectedEnriched.activeOrders.length > 0 && (
                  <div>
                    <h4 className="text-xs text-[#A9805F] uppercase tracking-wide font-medium mb-2">
                      Active Orders ({selectedEnriched.activeOrders.length})
                    </h4>
                    <div className="space-y-3">
                      {selectedEnriched.activeOrders.map((ao) => (
                        <div key={ao.id} className="rounded-xl bg-[#FBF6EF] ring-1 ring-[#EDE1CF] p-4 space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-[#3B2515]">{ao.id}</span>
                              {ao.guestLabel && (
                                <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-medium text-[#7B4B2A] ring-1 ring-[#EDE1CF]">
                                  {ao.guestLabel}
                                </span>
                              )}
                            </div>
                            <StatusBadge status={ao.status} />
                          </div>
                          <div className="text-xs text-[#9C8268] space-y-1">
                            <p className="flex items-center gap-1"><Users size={12} /> {ao.customer || "Guest"}</p>
                            <p className="flex items-center gap-1"><DollarSign size={12} /> ${Number(ao.total || 0).toFixed(2)}</p>
                            {ao.createdAt && <p className="flex items-center gap-1"><Clock size={12} /> {new Date(ao.createdAt).toLocaleString()}</p>}
                          </div>
                          <div className="pt-2 border-t border-[#EDE1CF]">
                            <p className="text-xs font-medium text-[#3B2515] mb-1.5">Items</p>
                            {(ao.itemsDetail || []).map((item, i) => (
                              <div key={i} className="flex items-center justify-between text-xs text-[#7B4B2A] py-1">
                                <span>{item.name} &times; {item.qty}</span>
                                <span>${(item.price * item.qty).toFixed(2)}</span>
                              </div>
                            ))}
                          </div>
                          <div className="flex items-center gap-1.5 pt-2 text-xs text-[#9C8268]">
                            <Phone size={12} /> Payment: {ao.payment}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedEnriched.orderHistory.length > 0 && (
                  <div>
                    <h4 className="text-xs text-[#A9805F] uppercase tracking-wide font-medium mb-2">Order History</h4>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {selectedEnriched.orderHistory.map((o) => (
                        <div key={o._id || o.id}
                          className="flex items-center justify-between rounded-xl bg-white ring-1 ring-[#EDE1CF] px-4 py-2">
                          <div className="flex items-center gap-2 text-xs">
                            <Hash size={12} className="text-[#9C8268]" />
                            <span className="text-[#3B2515] font-medium">{o.id}</span>
                            <span className="text-[#9C8268]">${Number(o.total || 0).toFixed(2)}</span>
                          </div>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${STATUS_META[o.status]?.bg || "bg-stone-100"} ${STATUS_META[o.status]?.text || "text-stone-600"}`}>
                            {o.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedEnriched.notes && (
                  <div>
                    <h4 className="text-xs text-[#A9805F] uppercase tracking-wide font-medium mb-1">Notes</h4>
                    <p className="text-sm text-[#7B4B2A] bg-[#FBF6EF] rounded-xl px-4 py-2">{selectedEnriched.notes}</p>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
