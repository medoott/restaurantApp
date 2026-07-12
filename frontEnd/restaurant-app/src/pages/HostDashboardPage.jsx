import { useState, useEffect } from "react";
import { Users, Clock, UserPlus, X, Bell, Check, ClipboardList, Table2, Star } from "lucide-react";

export default function HostDashboardPage({ apiRequest }) {
  const [_activeTab, _setActiveTab] = useState("overview");
  const [queue, setQueue] = useState([]);
  const [hostDashboard, setHostDashboard] = useState(null);
  const [tables, setTables] = useState([]);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [partySize, setPartySize] = useState(2);
  const [showArrivalModal, setShowArrivalModal] = useState(false);

  useEffect(() => {
    loadDashboard();
    loadQueue();
    loadTables();
  }, []);

  const loadDashboard = async () => {
    try {
      const res = await apiRequest("/host/dashboard", { method: "GET" });
      setHostDashboard(res?.data || res);
    } catch { }
  };

  const loadQueue = async () => {
    try {
      const res = await apiRequest("/host/queue", { method: "GET" });
      setQueue(res?.data?.queue || res?.queue || []);
    } catch { }
  };

  const loadTables = async () => {
    try {
      const res = await apiRequest("/tables", { method: "GET" });
      const items = res?.data?.items || res?.items || (Array.isArray(res) ? res : []);
      setTables(Array.isArray(items) ? items : []);
    } catch { }
  };

  const handleArrival = async (e) => {
    e.preventDefault();
    try {
      await apiRequest("/host/arrival", {
        method: "POST",
        body: JSON.stringify({ name: customerName, phone: customerPhone, partySize: parseInt(partySize) }),
        headers: { "Content-Type": "application/json" },
      });
      setCustomerName("");
      setCustomerPhone("");
      setPartySize(2);
      setShowArrivalModal(false);
      loadDashboard();
      loadQueue();
      loadTables();
    } catch (err) {
      alert(err.message || "Failed to process arrival");
    }
  };

  const handleNotify = async (queueId) => {
    try {
      await apiRequest(`/host/queue/${queueId}/notify`, { method: "PUT" });
      loadQueue();
    } catch { }
  };

  const handleCancelQueue = async (queueId) => {
    try {
      await apiRequest(`/host/queue/${queueId}/cancel`, {
        method: "PUT",
        body: JSON.stringify({ reason: "Customer left" }),
        headers: { "Content-Type": "application/json" },
      });
      loadQueue();
    } catch { }
  };

  const getStatusColor = (status) => {
    const colors = {
      available: "text-emerald-600 bg-emerald-50 ring-emerald-200",
      occupied: "text-amber-600 bg-amber-50 ring-amber-200",
      dining: "text-blue-600 bg-blue-50 ring-blue-200",
      needs_cleaning: "text-rose-600 bg-rose-50 ring-rose-200",
      cleaning_in_progress: "text-purple-600 bg-purple-50 ring-purple-200",
      waiting_for_bill: "text-orange-600 bg-orange-50 ring-orange-200",
      out_of_service: "text-stone-500 bg-stone-100 ring-stone-300",
    };
    return colors[status] || "text-stone-600 bg-stone-50 ring-stone-200";
  };

  return (
    <div className="min-h-screen bg-[#FBF6EF] pb-20">
      <div className="sticky top-0 z-30 bg-[#FBF6EF]/90 backdrop-blur-md border-b border-[#EDE1CF] px-4 sm:px-8 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <ClipboardList className="text-[#B07B4F]" size={24} />
            <h1 className="font-serif text-xl text-[#3B2515]">Host Dashboard</h1>
          </div>
          <button onClick={() => setShowArrivalModal(true)}
            className="flex items-center gap-2 bg-[#B07B4F] text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-[#8E623F] transition-colors">
            <UserPlus size={16} /> New Arrival
          </button>
        </div>
      </div>

      {hostDashboard && (
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-2xl p-4 ring-1 ring-[#EDE1CF]">
              <div className="flex items-center gap-3">
                <Table2 className="text-emerald-600" size={20} />
                <div>
                  <p className="text-xs text-[#A9805F]">Available</p>
                  <p className="text-2xl font-bold text-[#3B2515]">{hostDashboard.availableTables}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-2xl p-4 ring-1 ring-[#EDE1CF]">
              <div className="flex items-center gap-3">
                <Users className="text-amber-600" size={20} />
                <div>
                  <p className="text-xs text-[#A9805F]">Occupied</p>
                  <p className="text-2xl font-bold text-[#3B2515]">{hostDashboard.occupiedTables}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-2xl p-4 ring-1 ring-[#EDE1CF]">
              <div className="flex items-center gap-3">
                <Clock className="text-rose-600" size={20} />
                <div>
                  <p className="text-xs text-[#A9805F]">Waiting</p>
                  <p className="text-2xl font-bold text-[#3B2515]">{hostDashboard.waitingCustomers}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-2xl p-4 ring-1 ring-[#EDE1CF]">
              <div className="flex items-center gap-3">
                <Star className="text-amber-500" size={20} />
                <div>
                  <p className="text-xs text-[#A9805F]">Today Visits</p>
                  <p className="text-2xl font-bold text-[#3B2515]">{hostDashboard.todayVisits}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl ring-1 ring-[#EDE1CF] p-5">
              <h2 className="font-serif text-lg text-[#3B2515] mb-4">Waiting Queue</h2>
              {queue.length === 0 ? (
                <p className="text-sm text-[#A9805F] text-center py-8">No customers waiting</p>
              ) : (
                <div className="space-y-3 max-h-[500px] overflow-y-auto">
                  {queue.map((entry, i) => (
                    <div key={entry._id || i}
                      className={`flex items-center justify-between p-3 rounded-xl ring-1 ${entry.customer?.isVIP ? "ring-amber-300 bg-amber-50/50" : "ring-[#EDE1CF]"} ${entry.status === "notified" ? "opacity-60" : ""}`}>
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-[#3B2515] text-[#F3E5D3] flex items-center justify-center text-xs font-bold shrink-0">
                          {entry.position}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-[#3B2515] truncate">
                              {entry.customer?.name}
                            </p>
                            {entry.customer?.isVIP && (
                              <Star size={12} className="text-amber-500 fill-amber-500" />
                            )}
                          </div>
                          <p className="text-xs text-[#A9805F]">
                            {entry.partySize} guests
                            {entry.estimatedWaitMinutes > 0 && ` · ~${entry.estimatedWaitMinutes} min wait`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button onClick={() => handleNotify(entry._id)}
                          className="p-2 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors"
                          title="Table ready — notify customer">
                          <Bell size={14} />
                        </button>
                        <button onClick={() => handleCancelQueue(entry._id)}
                          className="p-2 rounded-lg bg-rose-50 text-rose-500 hover:bg-rose-100 transition-colors"
                          title="Remove from queue">
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl ring-1 ring-[#EDE1CF] p-5">
              <h2 className="font-serif text-lg text-[#3B2515] mb-4">Table Status</h2>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                {tables.map((t) => (
                  <div key={t._id}
                    className={`p-3 rounded-xl ring-1 text-center cursor-pointer hover:ring-2 transition-all ${getStatusColor(t.status)} ${t.isLocked ? "opacity-50" : ""}`}
                    onClick={() => {
                      if (t.status === "available" && !t.isLocked) {
                        setShowArrivalModal(true);
                      }
                    }}>
                    <p className="text-base font-bold">{t.tableNumber}</p>
                    <p className="text-[10px] uppercase tracking-wider mt-0.5">
                      {t.status.replace(/_/g, " ")}
                    </p>
                    <p className="text-[10px] opacity-60">{t.capacity} seats</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {hostDashboard.upcomingReservations?.length > 0 && (
            <div className="mt-6 bg-white rounded-2xl ring-1 ring-[#EDE1CF] p-5">
              <h2 className="font-serif text-lg text-[#3B2515] mb-4">Upcoming Reservations</h2>
              <div className="space-y-2">
                {hostDashboard.upcomingReservations.map((r, i) => (
                  <div key={r._id || i} className="flex items-center justify-between p-3 rounded-xl bg-[#FBF6EF]">
                    <div>
                      <p className="text-sm font-medium text-[#3B2515]">{r.customerName}</p>
                      <p className="text-xs text-[#A9805F]">{r.partySize} guests</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-[#3B2515]">{r.reservationTime}</p>
                      <p className="text-xs text-[#A9805F]">{r.tableNumber ? `Table ${r.tableNumber}` : "No table assigned"}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {showArrivalModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full ring-1 ring-[#EDE1CF] shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-serif text-lg text-[#3B2515]">New Customer Arrival</h3>
              <button onClick={() => setShowArrivalModal(false)} className="text-[#A9805F] hover:text-[#3B2515]">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleArrival} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#A9805F] mb-1.5">Name</label>
                <input value={customerName} onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl ring-1 ring-[#EDE1CF] bg-white text-sm text-[#3B2515] focus:ring-[#B07B4F] focus:outline-none"
                  placeholder="Guest name" required />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#A9805F] mb-1.5">Phone</label>
                <input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl ring-1 ring-[#EDE1CF] bg-white text-sm text-[#3B2515] focus:ring-[#B07B4F] focus:outline-none"
                  placeholder="+1 234 567 890" />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#A9805F] mb-1.5">Party Size</label>
                <input type="number" min={1} max={20} value={partySize}
                  onChange={(e) => setPartySize(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl ring-1 ring-[#EDE1CF] bg-white text-sm text-[#3B2515] focus:ring-[#B07B4F] focus:outline-none" />
              </div>
              <button type="submit"
                className="w-full bg-[#B07B4F] text-white py-3 rounded-xl font-medium hover:bg-[#8E623F] transition-colors">
                <Check size={16} className="inline mr-2" />Confirm Arrival
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
