import { useState, useEffect, useCallback } from "react";
import { UserPlus, Users, Clock, Table2, Star, X, Bell, Check, Search, Loader } from "lucide-react";
import { api } from "../../services/api.js";

export default function HostWorkspace({ _user, _access = {} }) {
  const [tab, setTab] = useState("arrival");
  const [loading, setLoading] = useState(false);
  const [notif, setNotif] = useState("");
  const [error, setError] = useState("");

  const [form, setForm] = useState({ name: "", phone: "", partySize: 2, preferredSection: "", notes: "", isVIP: false });

  const [queue, setQueue] = useState({ waiting: [], called: [], seatedToday: [], waitingCount: 0, availableTables: 0, avgEstimatedWaitMinutes: 0, todayVisits: 0 });

  const [tables, setTables] = useState([]);
  const [tablesLoading, setTablesLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const showNotif = (msg) => { setNotif(msg); setTimeout(() => setNotif(""), 3500); };

  const loadQueue = useCallback(async () => {
    try {
      const res = await api.get("/queue/status");
      setQueue(res?.data || res || { waiting: [], called: [], seatedToday: [], waitingCount: 0, availableTables: 0, avgEstimatedWaitMinutes: 0, todayVisits: 0 });
    } catch {
      // silent
    }
  }, []);

  const loadTables = useCallback(async () => {
    setTablesLoading(true);
    try {
      const res = await api.get("/tables");
      const items = res?.data?.items || res?.items || (Array.isArray(res) ? res : []);
      setTables(Array.isArray(items) ? items : []);
    } catch {
      setTables([]);
    } finally {
      setTablesLoading(false);
    }
  }, []);

  useEffect(() => {
    loadQueue();
    const iv = setInterval(loadQueue, 10000);
    return () => clearInterval(iv);
  }, [loadQueue]);

  const _floorRefreshRef = useCallback(() => {
    if (tab === "floor") loadTables();
  }, [tab, loadTables]);

  useEffect(() => {
    loadTables();
    if (tab === "floor") {
      const iv = setInterval(loadTables, 10000);
      return () => clearInterval(iv);
    }
  }, [tab, loadTables]);

  const clearError = () => { if (error) setError(""); };

  const handleArrival = async () => {
    if (!form.name.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await api.post("/host/arrival", {
        name: form.name.trim(),
        phone: form.phone.trim(),
        partySize: form.partySize,
        preferredSection: form.preferredSection,
        notes: form.notes.trim(),
        isVIP: form.isVIP,
      });
      const data = res?.data || res || {};
      if (data.tableNumber) {
        showNotif(`Seated at Table ${data.tableNumber}`);
      } else {
        const pos = data.position || data.queueNumber || "";
        const wait = data.estimatedWaitMinutes || data.avgEstimatedWaitMinutes || 0;
        showNotif(`Added to queue - Position #${pos} - Est. ${wait} min`);
      }
      setForm({ name: "", phone: "", partySize: 2, preferredSection: "", notes: "", isVIP: false });
      loadQueue();
      loadTables();
    } catch (err) {
      setError(err.message || "Arrival failed");
    } finally {
      setLoading(false);
    }
  };

  const handleCall = async (id) => {
    clearError();
    try {
      await api.put(`/queue/${id}/call`);
      loadQueue();
      showNotif("Guest notified");
    } catch (err) { setError(err.message); }
  };

  const handleCancel = async (id, reason = "Cancelled by host") => {
    clearError();
    try {
      await api.put(`/queue/${id}/cancel`, { reason });
      loadQueue();
      showNotif("Guest removed from queue");
    } catch (err) { setError(err.message); }
  };

  const handleSeat = async (id) => {
    clearError();
    try {
      const avail = tables.filter(t => (t.status || "").toLowerCase() === "available");
      if (avail.length === 0) {
        setError("No available tables");
        return;
      }
      const tn = avail[0].tableNumber || avail[0].number || avail[0]._id;
      await api.put(`/queue/${id}/seat`, { tableNumber: tn });
      loadQueue();
      loadTables();
      showNotif(`Guest seated at Table ${tn}`);
    } catch (err) { setError(err.message); }
  };

  const handleAssignTable = async (tableNumber) => {
    clearError();
    const nextWaiting = queue.waiting?.[0] || queue.called?.[0];
    if (!nextWaiting) { setError("No waiting guests"); return; }
    try {
      const name = nextWaiting.guestName || nextWaiting.name;
      await api.put(`/queue/${nextWaiting._id}/seat`, { tableNumber });
      loadQueue();
      loadTables();
      showNotif(`Table ${tableNumber} assigned to ${name}`);
    } catch (err) { setError(err.message); }
  };

  const elapsed = (entry) => {
    if (!entry?.createdAt) return "0 min";
    const diff = Date.now() - new Date(entry.createdAt).getTime();
    const min = Math.floor(diff / 60000);
    if (min < 1) return "Just now";
    return `${min} min`;
  };

  const tabs = [
    { key: "arrival", label: "Arrival", icon: UserPlus },
    { key: "queue", label: "Queue", icon: Users },
    { key: "floor", label: "Floor", icon: Table2 },
  ];

  const tableStatusColor = (status) => {
    const s = (status || "").toLowerCase();
    if (s === "available") return "bg-emerald-100 border-emerald-400 text-emerald-800";
    if (s === "occupied") return "bg-amber-100 border-amber-400 text-amber-800";
    if (s === "needs_cleaning" || s === "needs cleaning" || s === "dirty") return "bg-rose-100 border-rose-400 text-rose-800";
    if (s === "reserved") return "bg-blue-100 border-blue-400 text-blue-800";
    return "bg-stone-100 border-stone-300 text-stone-600";
  };

  const sections = [...new Set(tables.map(t => t.section || t.area || "Main"))].sort();

  const queueEntries = [...(queue.called || []), ...(queue.waiting || [])];

  const filteredQueue = searchQuery
    ? queueEntries.filter(e => {
        const name = (e.guestName || e.name || "").toLowerCase();
        const phone = (e.guestPhone || e.phone || "");
        return name.includes(searchQuery.toLowerCase()) || phone.includes(searchQuery);
      })
    : queueEntries;

  return (
    <div className="space-y-6">
      {notif && (
        <div className="fixed top-4 right-4 z-50 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2 text-xs text-emerald-700 shadow-lg animate-pulse">
          {notif}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl bg-white ring-1 ring-[#EDE1CF] p-4">
          <div className="text-[10px] uppercase tracking-wider text-[#A9805F]">Available Tables</div>
          <div className="text-2xl font-serif text-emerald-600 mt-1">{queue.availableTables}</div>
        </div>
        <div className="rounded-2xl bg-white ring-1 ring-[#EDE1CF] p-4">
          <div className="text-[10px] uppercase tracking-wider text-[#A9805F]">Waiting</div>
          <div className="text-2xl font-serif text-[#3B2515] mt-1">{queue.waitingCount}</div>
        </div>
        <div className="rounded-2xl bg-white ring-1 ring-[#EDE1CF] p-4">
          <div className="text-[10px] uppercase tracking-wider text-[#A9805F]">Today&#39;s Visits</div>
          <div className="text-2xl font-serif text-[#3B2515] mt-1">{queue.todayVisits || queue.seatedToday?.length || 0}</div>
        </div>
        <div className="rounded-2xl bg-white ring-1 ring-[#EDE1CF] p-4">
          <div className="text-[10px] uppercase tracking-wider text-[#A9805F]">Avg Wait</div>
          <div className="text-2xl font-serif text-[#B07B4F] mt-1">{queue.avgEstimatedWaitMinutes || 0} min</div>
        </div>
      </div>

      <div className="flex gap-1 rounded-2xl bg-[#EDE1CF]/40 p-1 w-fit">
        {tabs.map(t => {
          const Icon = t.icon;
          return (
            <button key={t.key} onClick={() => { setTab(t.key); setError(""); }}
              className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-medium transition-colors ${tab === t.key ? "bg-white text-[#3B2515] shadow-sm" : "text-[#7B4B2A] hover:bg-white/50"}`}
            >
              <Icon size={14} /> {t.label}
            </button>
          );
        })}
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError("")} className="text-rose-400 hover:text-rose-600"><X size={14} /></button>
        </div>
      )}

      {tab === "arrival" && (
        <div className="rounded-2xl bg-white ring-1 ring-[#EDE1CF] p-6 space-y-4">
          <h3 className="font-serif text-lg text-[#3B2515]">Register Arrival</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-[#7B4B2A] mb-1">Guest Name *</label>
              <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. John Smith" className="w-full rounded-xl bg-[#FBF6EF] px-4 py-2.5 text-sm outline-none ring-1 ring-[#EDE1CF] focus:ring-[#B07B4F] transition-shadow" />
            </div>
            <div>
              <label className="block text-xs text-[#7B4B2A] mb-1">Phone</label>
              <input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="e.g. +1 (555) 123-4567" className="w-full rounded-xl bg-[#FBF6EF] px-4 py-2.5 text-sm outline-none ring-1 ring-[#EDE1CF] focus:ring-[#B07B4F] transition-shadow" />
            </div>
            <div className="flex items-center gap-3">
              <label className="text-xs text-[#7B4B2A] whitespace-nowrap">Party Size:</label>
              <button type="button" onClick={() => setForm(p => ({ ...p, partySize: Math.max(1, p.partySize - 1) }))} className="w-8 h-8 rounded-lg bg-[#EDE1CF] text-[#3B2515] flex items-center justify-center text-sm font-medium hover:bg-[#d4c5b0] transition-colors">-</button>
              <span className="text-sm font-medium text-[#3B2515] w-6 text-center">{form.partySize}</span>
              <button type="button" onClick={() => setForm(p => ({ ...p, partySize: p.partySize + 1 }))} className="w-8 h-8 rounded-lg bg-[#EDE1CF] text-[#3B2515] flex items-center justify-center text-sm font-medium hover:bg-[#d4c5b0] transition-colors">+</button>
            </div>
            <div className="flex items-center gap-3">
              <label className="text-xs text-[#7B4B2A] whitespace-nowrap">Section:</label>
              <select value={form.preferredSection} onChange={e => setForm(p => ({ ...p, preferredSection: e.target.value }))} className="rounded-xl bg-[#FBF6EF] px-3 py-2.5 text-sm outline-none ring-1 ring-[#EDE1CF] focus:ring-[#B07B4F] flex-1 transition-shadow">
                <option value="">Any section</option>
                {sections.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input type="checkbox" checked={form.isVIP} onChange={e => setForm(p => ({ ...p, isVIP: e.target.checked }))} className="w-4 h-4 accent-[#B07B4F]" />
              <span className="text-xs text-[#7B4B2A] flex items-center gap-1"><Star size={12} /> VIP Guest</span>
            </label>
          </div>
          <div>
            <label className="block text-xs text-[#7B4B2A] mb-1">Notes / Special Requests</label>
            <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Allergies, celebrations, preferences..." rows={2} className="w-full rounded-xl bg-[#FBF6EF] px-4 py-2.5 text-sm outline-none ring-1 ring-[#EDE1CF] focus:ring-[#B07B4F] resize-none transition-shadow" />
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setForm({ name: "", phone: "", partySize: 2, preferredSection: "", notes: "", isVIP: false })}
              className="rounded-xl px-4 py-2 text-xs text-[#7B4B2A] hover:bg-[#FBF6EF] transition-colors"
            >
              Clear
            </button>
            <button type="button" onClick={handleArrival} disabled={loading || !form.name.trim()}
              className="flex items-center gap-1.5 rounded-xl bg-[#B07B4F] text-white px-5 py-2 text-xs font-medium hover:bg-[#8E653D] disabled:opacity-50 transition-colors"
            >
              {loading ? <Loader size={14} className="animate-spin" /> : <UserPlus size={14} />}
              {loading ? "Registering..." : "Register Arrival"}
            </button>
          </div>
        </div>
      )}

      {tab === "queue" && (
        <div className="space-y-3">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A9805F]" />
            <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search by name or phone..." className="w-full rounded-xl bg-white ring-1 ring-[#EDE1CF] pl-8 pr-4 py-2.5 text-sm outline-none focus:ring-[#B07B4F] transition-shadow" />
          </div>
          {queueEntries.length === 0 ? (
            <div className="rounded-2xl bg-white ring-1 ring-[#EDE1CF] p-8 text-center text-sm text-[#A9805F]">No guests waiting. All clear!</div>
          ) : filteredQueue.length === 0 ? (
            <div className="rounded-2xl bg-white ring-1 ring-[#EDE1CF] p-8 text-center text-sm text-[#A9805F]">No results matching &ldquo;{searchQuery}&rdquo;</div>
          ) : (
            <div className="space-y-2">
              {filteredQueue.map((entry) => {
                const name = entry.guestName || entry.name;
                const phone = entry.guestPhone || entry.phone;
                const partySize = entry.partySize || 1;
                const isVip = entry.isVIP || entry.isVip || entry.vip;
                return (
                  <div key={entry._id} className="flex items-center justify-between rounded-2xl bg-white ring-1 ring-[#EDE1CF] px-4 py-3 hover:shadow-sm transition-shadow">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${entry.status === "called" ? "bg-amber-100 text-amber-700" : "bg-[#FBF6EF] text-[#7B4B2A]"}`}>
                        #{entry.queueNumber || entry.position}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-[#3B2515] flex items-center gap-1.5 truncate">
                          {name}
                          {isVip && <Star size={12} className="text-amber-500 fill-amber-500 shrink-0" />}
                        </div>
                        <div className="text-[10px] text-[#A9805F] flex items-center gap-2 flex-wrap">
                          <span className="flex items-center gap-1"><Users size={10} /> {partySize}</span>
                          <span className="flex items-center gap-1"><Clock size={10} /> {elapsed(entry)}</span>
                          {phone ? <span className="opacity-60">&middot; {phone}</span> : ""}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      {entry.status === "waiting" && (
                        <>
                          <button onClick={() => handleCall(entry._id)} title="Notify guest"
                            className="flex items-center gap-1 rounded-xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 px-3 py-1.5 text-[10px] font-medium hover:bg-emerald-100 transition-colors"
                          >
                            <Bell size={12} /> Notify
                          </button>
                          <button onClick={() => handleCancel(entry._id)} title="Remove from queue"
                            className="flex items-center gap-1 rounded-xl bg-rose-50 text-rose-600 ring-1 ring-rose-200 px-2 py-1.5 text-[10px] hover:bg-rose-100 transition-colors"
                          >
                            <X size={12} />
                          </button>
                        </>
                      )}
                      {entry.status === "called" && (
                        <>
                          <span className="text-[10px] text-amber-600 font-medium bg-amber-50 px-2 py-1 rounded-xl flex items-center gap-1">
                            <Bell size={10} /> Called
                          </span>
                          {queue.availableTables > 0 && (
                            <button onClick={() => handleSeat(entry._id)} title="Seat guest"
                              className="flex items-center gap-1 rounded-xl bg-[#B07B4F] text-white px-3 py-1.5 text-[10px] font-medium hover:bg-[#8E653D] transition-colors"
                            >
                              <Check size={12} /> Seat
                            </button>
                          )}
                          <button onClick={() => handleCancel(entry._id)} title="Cancel"
                            className="flex items-center gap-1 rounded-xl bg-rose-50 text-rose-600 ring-1 ring-rose-200 px-2 py-1.5 text-[10px] hover:bg-rose-100 transition-colors"
                          >
                            <X size={12} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {tab === "floor" && (
        <div className="space-y-6">
          {tablesLoading && tables.length === 0 ? (
            <div className="flex items-center justify-center py-12"><Loader className="animate-spin text-[#B07B4F]" size={24} /></div>
          ) : tables.length === 0 ? (
            <div className="rounded-2xl bg-white ring-1 ring-[#EDE1CF] p-8 text-center text-sm text-[#A9805F]">No tables found</div>
          ) : (
            sections.map(section => (
              <div key={section}>
                <div className="flex items-center gap-2 mb-3">
                  <h4 className="font-serif text-base text-[#3B2515]">{section}</h4>
                  <span className="text-[10px] text-[#A9805F] bg-[#EDE1CF]/50 px-2 py-0.5 rounded-full">
                    {tables.filter(t => (t.section || t.area || "Main") === section).length} tables
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {tables.filter(t => (t.section || t.area || "Main") === section).map(table => {
                    const status = (table.status || "available").toLowerCase();
                    const tNumber = table.tableNumber || table.number || table.name || table._id;
                    const canAssign = status === "available";
                    return (
                      <button key={table._id} onClick={() => canAssign && handleAssignTable(tNumber)}
                        disabled={!canAssign}
                        className={`rounded-2xl border-2 p-3 text-center transition-all ${tableStatusColor(table.status)} ${canAssign ? "cursor-pointer hover:shadow-lg hover:scale-[1.03] active:scale-[0.98]" : "cursor-default opacity-80"}`}
                      >
                        <div className={`text-[9px] font-bold uppercase tracking-wider ${status === "available" ? "text-emerald-600" : ""}`}>{status.replace(/_/g, " ")}</div>
                        <div className="text-xl font-serif mt-1 text-[#3B2515]">T{tNumber}</div>
                        {table.capacity && <div className="text-[10px] text-[#A9805F] mt-0.5"><Users size={10} className="inline" /> {table.capacity}</div>}
                        {canAssign && <div className="mt-1.5 text-[8px] uppercase tracking-widest font-semibold text-emerald-600 bg-emerald-50 rounded-full px-2 py-0.5 inline-block">Click to assign</div>}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
