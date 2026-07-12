import { useState, useEffect, useCallback, useRef } from "react";
import { Clock, Users, Check, X, Bell, ArrowRight, UserPlus } from "lucide-react";
import { api } from "../../services/api.js";

export default function GuestQueuePanel({ _access = {} }) {
  const [queue, setQueue] = useState({ waiting: [], called: [], seatedToday: [], waitingCount: 0, availableTables: 0, avgEstimatedWaitMinutes: 0 });
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ guestName: "", guestPhone: "", partySize: 2, notes: "" });
  const [error, setError] = useState("");
  const [notif, setNotif] = useState("");
  const notifTimerRef = useRef(null);

  useEffect(() => {
    return () => { if (notifTimerRef.current) clearTimeout(notifTimerRef.current); };
  }, []);

  const loadQueue = useCallback(async () => {
    try {
      const res = await api.get("/queue/status");
      setQueue(res?.data || res || { waiting: [], called: [], seatedToday: [], waitingCount: 0, availableTables: 0, avgEstimatedWaitMinutes: 0 });
    } catch (err) {
      setError(err.message || "Could not load queue");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadQueue(); const iv = setInterval(loadQueue, 15000); return () => clearInterval(iv); }, [loadQueue]);

  const showNotif = (msg) => {
    if (notifTimerRef.current) clearTimeout(notifTimerRef.current);
    setNotif(msg);
    notifTimerRef.current = setTimeout(() => setNotif(""), 3000);
  };

  const handleAddToQueue = async () => {
    if (!form.guestName.trim()) return;
    try {
      await api.post("/queue", form);
      setForm({ guestName: "", guestPhone: "", partySize: 2, notes: "" });
      setShowAdd(false);
      showNotif("Added to queue");
      loadQueue();
    } catch (err) { setError(err.message); }
  };

  const handleCall = async (id) => {
    try { await api.put(`/queue/${id}/call`); loadQueue(); showNotif("Guest called"); } catch (err) { setError(err.message); }
  };

  const handleCancel = async (id) => {
    try { await api.put(`/queue/${id}/cancel`, { reason: "Cancelled by host" }); loadQueue(); } catch (err) { setError(err.message); }
  };

  const handleSeat = async (id) => {
    try {
      const availableRes = await api.get("/tables?status=available&isLocked=false");
      const availableTables = Array.isArray(availableRes?.data?.items) ? availableRes.data.items : Array.isArray(availableRes?.items) ? availableRes.items : [];
      if (availableTables.length === 0) {
        setError("No available tables right now.");
        return;
      }
      await api.put(`/queue/${id}/seat`, { tableId: availableTables[0]._id || availableTables[0].id });
      loadQueue();
      showNotif("Guest seated");
    } catch (err) { setError(err.message); }
  };

  return (
    <div className="space-y-6">
      {notif && (
        <div className="fixed top-20 right-4 z-50 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2 text-xs text-emerald-700 shadow-lg">{notif}</div>
      )}
      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl bg-white ring-1 ring-[#EDE1CF] p-4">
          <div className="text-[10px] uppercase tracking-wider text-[#A9805F]">Waiting</div>
          <div className="text-2xl font-serif text-[#3B2515] mt-1">{queue.waitingCount}</div>
        </div>
        <div className="rounded-2xl bg-white ring-1 ring-[#EDE1CF] p-4">
          <div className="text-[10px] uppercase tracking-wider text-[#A9805F]">Called</div>
          <div className="text-2xl font-serif text-[#3B2515] mt-1">{queue.called?.length || 0}</div>
        </div>
        <div className="rounded-2xl bg-white ring-1 ring-[#EDE1CF] p-4">
          <div className="text-[10px] uppercase tracking-wider text-[#A9805F]">Available Tables</div>
          <div className="text-2xl font-serif text-emerald-600 mt-1">{queue.availableTables}</div>
        </div>
        <div className="rounded-2xl bg-white ring-1 ring-[#EDE1CF] p-4">
          <div className="text-[10px] uppercase tracking-wider text-[#A9805F]">Avg Wait</div>
          <div className="text-2xl font-serif text-[#B07B4F] mt-1">{queue.avgEstimatedWaitMinutes} min</div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <h2 className="font-serif text-lg text-[#3B2515]">Waiting List</h2>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 rounded-xl bg-[#B07B4F] text-white px-4 py-2 text-xs font-medium hover:bg-[#8E653D] transition-colors">
          <UserPlus size={14} /> Add Guest
        </button>
      </div>

      {showAdd && (
        <div className="rounded-2xl bg-white ring-1 ring-[#EDE1CF] p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <input value={form.guestName} onChange={e => setForm(p => ({ ...p, guestName: e.target.value }))} placeholder="Guest name" className="rounded-xl bg-[#FBF6EF] px-3 py-2 text-xs outline-none ring-1 ring-[#EDE1CF] focus:ring-[#B07B4F]" />
            <input value={form.guestPhone} onChange={e => setForm(p => ({ ...p, guestPhone: e.target.value }))} placeholder="Phone (optional)" className="rounded-xl bg-[#FBF6EF] px-3 py-2 text-xs outline-none ring-1 ring-[#EDE1CF] focus:ring-[#B07B4F]" />
            <input value={form.partySize} onChange={e => setForm(p => ({ ...p, partySize: Number(e.target.value) }))} type="number" min="1" placeholder="Party size" className="rounded-xl bg-[#FBF6EF] px-3 py-2 text-xs outline-none ring-1 ring-[#EDE1CF] focus:ring-[#B07B4F]" />
            <input value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Notes" className="rounded-xl bg-[#FBF6EF] px-3 py-2 text-xs outline-none ring-1 ring-[#EDE1CF] focus:ring-[#B07B4F]" />
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowAdd(false)} className="rounded-xl px-4 py-2 text-xs text-[#7B4B2A] hover:bg-[#FBF6EF]">Cancel</button>
            <button onClick={handleAddToQueue} className="rounded-xl bg-[#B07B4F] text-white px-4 py-2 text-xs font-medium hover:bg-[#8E653D]">Add to Queue</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center text-sm text-[#A9805F] py-8">Loading queue...</div>
      ) : queue.waiting.length === 0 && queue.called.length === 0 ? (
        <div className="text-center text-sm text-[#A9805F] py-8">No guests waiting. All clear!</div>
      ) : (
        <div className="space-y-2">
          {[...queue.called, ...queue.waiting].map((entry) => (
            <div key={entry._id} className="flex items-center justify-between rounded-2xl bg-white ring-1 ring-[#EDE1CF] px-4 py-3">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${entry.status === "called" ? "bg-amber-100 text-amber-700" : "bg-[#FBF6EF] text-[#7B4B2A]"}`}>
                  #{entry.queueNumber}
                </div>
                <div>
                  <div className="text-sm font-medium text-[#3B2515]">{entry.guestName}</div>
                  <div className="text-[10px] text-[#A9805F] flex items-center gap-2">
                    <Users size={10} /> {entry.partySize} {entry.estimatedWaitMinutes > 0 ? <><Clock size={10} /> ~{entry.estimatedWaitMinutes} min</> : ""}
                    {entry.guestPhone ? <> &middot; {entry.guestPhone}</> : ""}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {entry.status === "waiting" && (
                  <>
                    <button onClick={() => handleCall(entry._id)} className="flex items-center gap-1 rounded-xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 px-3 py-1.5 text-[10px] font-medium hover:bg-emerald-100">
                      <Bell size={12} /> Call
                    </button>
                    {queue.availableTables > 0 && (
                      <button onClick={() => handleSeat(entry._id)} className="flex items-center gap-1 rounded-xl bg-[#B07B4F] text-white px-3 py-1.5 text-[10px] font-medium hover:bg-[#8E653D]">
                        <ArrowRight size={12} /> Seat
                      </button>
                    )}
                    <button onClick={() => handleCancel(entry._id)} className="flex items-center gap-1 rounded-xl bg-rose-50 text-rose-600 ring-1 ring-rose-200 px-2 py-1.5 text-[10px] hover:bg-rose-100">
                      <X size={12} />
                    </button>
                  </>
                )}
                {entry.status === "called" && (
                  <>
                    <span className="text-[10px] text-amber-600 font-medium bg-amber-50 px-2 py-1 rounded-xl">Called</span>
                    {queue.availableTables > 0 && (
                      <button onClick={() => handleSeat(entry._id)} className="flex items-center gap-1 rounded-xl bg-[#B07B4F] text-white px-3 py-1.5 text-[10px] font-medium">
                        <ArrowRight size={12} /> Seat Now
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
