import { useCallback, useState } from "react";
import { fetchOrderTimeline } from "../services/data.js";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Clock, CheckCircle2, ChefHat, Utensils, Truck, Package, Filter, RotateCcw, AlertCircle } from "lucide-react";

const EVENT_META = {
  created: { label: "Order Created", icon: Clock, color: "text-sky-600", dot: "bg-sky-400", bg: "bg-sky-50 ring-sky-200" },
  accepted: { label: "Accepted", icon: CheckCircle2, color: "text-emerald-600", dot: "bg-emerald-400", bg: "bg-emerald-50 ring-emerald-200" },
  preparing: { label: "Preparing", icon: ChefHat, color: "text-amber-600", dot: "bg-amber-400", bg: "bg-amber-50 ring-amber-200" },
  ready: { label: "Ready", icon: Utensils, color: "text-orange-600", dot: "bg-orange-400", bg: "bg-orange-50 ring-orange-200" },
  picked_up: { label: "Picked Up", icon: Package, color: "text-purple-600", dot: "bg-purple-400", bg: "bg-purple-50 ring-purple-200" },
  delivered: { label: "Delivered", icon: Truck, color: "text-emerald-600", dot: "bg-emerald-400", bg: "bg-emerald-50 ring-emerald-200" },
};

const ALL_EVENT_TYPES = Object.keys(EVENT_META);

export default function ActivityTimelinePage({ _permissions = { can: () => false } }) {
  const [orderId, setOrderId] = useState("");
  const [inputValue, setInputValue] = useState("");
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");

  const loadTimeline = useCallback(async (id) => {
    if (!id) return;
    setLoading(true);
    setError("");
    try {
      const data = await fetchOrderTimeline(id);
      const evts = Array.isArray(data) ? data : Array.isArray(data?.events) ? data.events : [];
      setEvents(evts);
    } catch (err) {
      setError(err.message || "Failed to load timeline");
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    const id = inputValue.trim();
    if (!id) return;
    setOrderId(id);
    loadTimeline(id);
  };

  const filteredEvents = filter === "all"
    ? events
    : events.filter((ev) => (ev.event || ev.type) === filter);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-xl text-[#3B2515] flex items-center gap-2">
            <Clock size={18} /> Activity Timeline
          </h2>
          <p className="text-xs text-[#A9805F] mt-0.5">Track order lifecycle events</p>
        </div>
      </div>

      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="flex-1 flex items-center gap-2 rounded-full bg-white px-4 py-3 ring-1 ring-[#EDE1CF] shadow-sm max-w-md">
          <Search size={16} className="text-[#A9805F]" />
          <input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Search by Order ID..."
            className="w-full bg-transparent text-sm text-[#3B2515] placeholder:text-[#A9805F] outline-none"
            aria-label="Order ID"
          />
        </div>
        <button
          type="submit"
          disabled={loading || !inputValue.trim()}
          className="rounded-full bg-[#3B2515] text-[#F3E5D3] px-6 py-3 text-sm font-medium hover:bg-[#4A2E18] disabled:opacity-50 transition-colors"
        >
          {loading ? "..." : "Search"}
        </button>
      </form>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700" role="alert">
          {error}
        </div>
      )}

      <AnimatePresence>
        {events.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="rounded-2xl bg-white ring-1 ring-[#EDE1CF] shadow-sm p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-serif text-lg text-[#3B2515]">Timeline for {orderId}</h3>
                <p className="text-xs text-[#A9805F] mt-0.5">{events.length} event{events.length !== 1 ? "s" : ""}</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <select
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    className="rounded-full border border-[#EDE1CF] bg-white pl-3 pr-8 py-1.5 text-xs text-[#3B2515] outline-none appearance-none focus:ring-2 focus:ring-[#B07B4F]/40"
                  >
                    <option value="all">All Events</option>
                    {ALL_EVENT_TYPES.map((k) => (
                      <option key={k} value={k}>{EVENT_META[k]?.label || k}</option>
                    ))}
                  </select>
                  <Filter size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#A9805F] pointer-events-none" />
                </div>
                <button
                  onClick={() => { if (orderId) loadTimeline(orderId); }}
                  className="rounded-full bg-[#FBF6EF] text-[#7B4B2A] p-1.5 ring-1 ring-[#EDE1CF] hover:bg-[#EDE1CF] transition-colors"
                >
                  <RotateCcw size={12} />
                </button>
              </div>
            </div>

            <div className="relative">
              {filteredEvents.map((ev, idx) => {
                const eventType = ev.event || ev.type || "";
                const meta = EVENT_META[eventType] || { label: eventType, icon: Clock, color: "text-[#9C8268]", dot: "bg-[#C9B496]", bg: "bg-[#FBF6EF] ring-[#EDE1CF]" };
                const Icon = meta.icon;
                const isLast = idx === filteredEvents.length - 1;

                return (
                  <div key={ev._id || ev.id || idx} className="flex items-start gap-4 pb-8 last:pb-0 relative">
                    {!isLast && (
                      <div className="absolute left-[15px] top-8 w-0.5 h-8 -translate-x-1/2 bg-[#EDE1CF]" />
                    )}
                    <div className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center shrink-0 ring-2 ring-white ${meta.dot}`}>
                      <Icon size={14} className="text-white" />
                    </div>
                    <div className="flex-1 min-w-0 pt-0.5">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className={`text-sm font-medium text-[#3B2515]`}>{meta.label}</span>
                        {ev.details && (
                          <span className="text-[10px] text-[#9C8268] bg-[#FBF6EF] rounded-full px-2 py-0.5 truncate max-w-[200px]">
                            {ev.details}
                          </span>
                        )}
                      </div>
                      {ev.user && (
                        <p className="text-xs text-[#9C8268]">
                          by {ev.user.name || ev.user} {ev.user.role ? `(${ev.user.role})` : ""}
                        </p>
                      )}
                      <p className="text-xs text-[#A9805F] mt-0.5">
                        {ev.timestamp ? new Date(ev.timestamp).toLocaleString() : ""}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!loading && !error && events.length === 0 && !orderId && (
        <div className="rounded-2xl bg-white ring-1 ring-[#EDE1CF] shadow-sm p-12 text-center">
          <div className="w-12 h-12 rounded-full bg-[#FBF6EF] flex items-center justify-center mx-auto mb-4">
            <Search size={20} className="text-[#C9B496]" />
          </div>
          <h3 className="font-serif text-lg text-[#3B2515] mb-2">Search for an Order</h3>
          <p className="text-sm text-[#9C8268] max-w-sm mx-auto">
            Enter an Order ID above to view its activity timeline and track every event in the order lifecycle.
          </p>
        </div>
      )}

      {!loading && !error && events.length === 0 && orderId && (
        <div className="rounded-2xl bg-white ring-1 ring-[#EDE1CF] shadow-sm p-12 text-center">
          <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={20} className="text-amber-500" />
          </div>
          <h3 className="font-serif text-lg text-[#3B2515] mb-2">No Events Found</h3>
          <p className="text-sm text-[#9C8268] max-w-sm mx-auto">
            No timeline events were found for this order. The order may not exist yet.
          </p>
        </div>
      )}

      {loading && (
        <div className="rounded-2xl bg-white ring-1 ring-[#EDE1CF] shadow-sm p-12 text-center">
          <div className="animate-spin w-8 h-8 rounded-full border-2 border-[#EDE1CF] border-t-[#B07B4F] mx-auto mb-4" />
          <p className="text-sm text-[#9C8268]">Loading timeline...</p>
        </div>
      )}
    </div>
  );
}
