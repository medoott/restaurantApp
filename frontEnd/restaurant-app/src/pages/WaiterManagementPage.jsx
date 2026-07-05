import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users, UserCheck, ClipboardList, ShoppingBag, BarChart3,
  Search, X, RefreshCw, UserPlus, ArrowRight, Loader2,
  ChevronRight, ChevronLeft, AlertCircle, CheckCircle,
} from "lucide-react";
import { fetchAllWaiters, fetchWaiterDetails, fetchAssignedTables, fetchActiveTasks, fetchPendingRequests, fetchDeliveryQueue, fetchWaiterStats, reassignWaiterRequest, fetchWorkloadBalancing, autoAssignWaiter } from "../services/data.js";
import { CardSkeleton } from "../components/ui/Skeleton.jsx";

const TABS = ["Tables", "Tasks", "Requests", "Deliveries", "Stats"];

export default function WaiterManagementPage({ permissions = { can: () => false } }) {
  const [waiters, setWaiters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [notif, setNotif] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [detailTab, setDetailTab] = useState("Tables");
  const [detailLoading, setDetailLoading] = useState(false);
  const [waiterDetails, setWaiterDetails] = useState(null);
  const [assignedTables, setAssignedTables] = useState([]);
  const [activeTasks, setActiveTasks] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [deliveryQueue, setDeliveryQueue] = useState([]);
  const [waiterStats, setWaiterStats] = useState(null);
  const [showWorkload, setShowWorkload] = useState(false);
  const [workloadData, setWorkloadData] = useState(null);
  const [workloadLoading, setWorkloadLoading] = useState(false);
  const [reassignModal, setReassignModal] = useState(false);
  const [reassignRequestId, setReassignRequestId] = useState("");
  const [reassignTargetId, setReassignTargetId] = useState("");
  const [reassignLoading, setReassignLoading] = useState(false);
  const [autoAssignOrderId, setAutoAssignOrderId] = useState("");
  const [autoAssignLoading, setAutoAssignLoading] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);

  const showNotif = useCallback((msg, type = "success") => {
    setNotif({ msg, type });
    setTimeout(() => setNotif(null), 3000);
  }, []);

  const loadWaiters = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchAllWaiters();
      setWaiters(Array.isArray(data) ? data : []);
    } catch (err) {
      showNotif(err.message, "error");
    } finally {
      setLoading(false);
    }
  }, [showNotif]);

  useEffect(() => { loadWaiters(); }, [loadWaiters]);

  const filtered = waiters.filter((w) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (w.name || "").toLowerCase().includes(q) || (w.role || "").toLowerCase().includes(q);
  });

  const handleSelectWaiter = useCallback(async (id) => {
    if (selectedId === id) {
      setSelectedId(null);
      setWaiterDetails(null);
      return;
    }
    setSelectedId(id);
    setDetailTab("Tables");
    setDetailLoading(true);
    setWaiterDetails(null);
    setAssignedTables([]);
    setActiveTasks([]);
    setPendingRequests([]);
    setDeliveryQueue([]);
    setWaiterStats(null);
    try {
      const [details, tables, tasks, requests, deliveries, stats] = await Promise.all([
        fetchWaiterDetails(id),
        fetchAssignedTables(id),
        fetchActiveTasks(id),
        fetchPendingRequests(id),
        fetchDeliveryQueue(id),
        fetchWaiterStats(id),
      ]);
      setWaiterDetails(details);
      setAssignedTables(Array.isArray(tables) ? tables : []);
      setActiveTasks(Array.isArray(tasks) ? tasks : []);
      setPendingRequests(Array.isArray(requests) ? requests : []);
      setDeliveryQueue(Array.isArray(deliveries) ? deliveries : []);
      setWaiterStats(stats);
    } catch (err) {
      showNotif(err.message, "error");
    } finally {
      setDetailLoading(false);
    }
  }, [selectedId, showNotif]);

  const handleReassign = async () => {
    if (!reassignRequestId || !reassignTargetId) {
      showNotif("Select a request and a target waiter", "error");
      return;
    }
    setReassignLoading(true);
    try {
      await reassignWaiterRequest({
        requestId: reassignRequestId,
        fromWaiterId: selectedId,
        toWaiterId: reassignTargetId,
      });
      showNotif("Request reassigned successfully");
      setReassignModal(false);
      setReassignRequestId("");
      setReassignTargetId("");
      if (selectedId) {
        const updated = await fetchPendingRequests(selectedId);
        setPendingRequests(Array.isArray(updated) ? updated : []);
      }
    } catch (err) {
      showNotif(err.message, "error");
    } finally {
      setReassignLoading(false);
    }
  };

  const handleAutoAssign = async () => {
    if (!autoAssignOrderId.trim()) {
      showNotif("Enter an order ID", "error");
      return;
    }
    setAutoAssignLoading(true);
    try {
      await autoAssignWaiter(autoAssignOrderId.trim());
      showNotif("Auto-assignment completed");
      setAutoAssignOrderId("");
      loadWaiters();
    } catch (err) {
      showNotif(err.message, "error");
    } finally {
      setAutoAssignLoading(false);
    }
  };

  const handleToggleWorkload = async () => {
    if (showWorkload) {
      setShowWorkload(false);
      return;
    }
    setWorkloadLoading(true);
    setShowWorkload(true);
    try {
      const data = await fetchWorkloadBalancing();
      setWorkloadData(data);
    } catch (err) {
      showNotif(err.message, "error");
      setShowWorkload(false);
    } finally {
      setWorkloadLoading(false);
    }
  };

  const workloadPercent = (score) => {
    const n = Number(score) || 0;
    return Math.min(Math.max(n, 0), 100);
  };

  const workloadColor = (pct) => {
    if (pct < 33) return "bg-emerald-400";
    if (pct < 66) return "bg-amber-400";
    return "bg-rose-400";
  };

  const waiterName = (id) => waiters.find((w) => w.id === id || w._id === id)?.name || "Unknown";

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-xl text-[#3B2515] flex items-center gap-2">
            <UserCheck size={18} /> Waiter Management
          </h2>
          <p className="text-xs text-[#A9805F] mt-0.5">Manage waiters, requests, and workload</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-initial">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A9805F]" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              placeholder="Search waiters..."
              className="w-full sm:w-48 rounded-full border border-[#EDE1CF] bg-white pl-9 pr-4 py-2 text-sm text-[#3B2515] outline-none focus:ring-2 focus:ring-[#B07B4F]/40"
            />
          </div>
          <button onClick={loadWaiters}
            className="flex items-center gap-1.5 rounded-full border border-[#EDE1CF] text-[#7B4B2A] px-4 py-2 text-sm hover:bg-[#FBF6EF] transition-colors">
            <RefreshCw size={15} /> Refresh
          </button>
          {permissions.can("waiter.manage") !== false && (
            <div className="relative">
              <div className="flex items-center gap-1.5">
                <input
                  value={autoAssignOrderId}
                  onChange={(e) => setAutoAssignOrderId(e.target.value)}
                  placeholder="Order ID"
                  className="w-28 rounded-full border border-[#EDE1CF] bg-white px-3.5 py-2 text-sm text-[#3B2515] outline-none focus:ring-2 focus:ring-[#B07B4F]/40"
                />
                <button onClick={handleAutoAssign} disabled={autoAssignLoading}
                  className="flex items-center gap-1.5 rounded-full bg-[#B07B4F] text-white px-4 py-2 text-sm font-medium hover:bg-[#C9925F] transition-colors disabled:opacity-50">
                  {autoAssignLoading ? <Loader2 size={15} className="animate-spin" /> : <UserPlus size={15} />}
                  Auto-Assign
                </button>
              </div>
            </div>
          )}
          <button onClick={handleToggleWorkload}
            className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              showWorkload
                ? "bg-[#3B2515] text-[#F3E5D3]"
                : "border border-[#EDE1CF] text-[#7B4B2A] hover:bg-[#FBF6EF]"
            }`}>
            <BarChart3 size={15} /> Workload
          </button>
        </div>
      </div>

      {notif && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className={`rounded-xl px-4 py-3 text-sm flex items-center gap-2 ${
            notif.type === "error"
              ? "bg-rose-50 border border-rose-200 text-rose-700"
              : "bg-emerald-50 border border-emerald-200 text-emerald-700"
          }`}>
          {notif.type === "error" ? <AlertCircle size={15} /> : <CheckCircle size={15} />}
          {notif.msg}
        </motion.div>
      )}

      {showWorkload && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
          className="rounded-2xl bg-white ring-1 ring-[#EDE1CF] shadow-sm shadow-[#3B2515]/5 p-5 overflow-hidden">
          <h3 className="font-serif text-base text-[#3B2515] mb-4 flex items-center gap-2">
            <BarChart3 size={16} /> Workload Balancing
          </h3>
          {workloadLoading ? (
            <div className="flex items-center justify-center py-8 text-[#9C8268] text-sm">
              <Loader2 size={18} className="animate-spin mr-2" /> Loading workload...
            </div>
          ) : workloadData ? (
            <div className="space-y-4">
              {Array.isArray(workloadData.items || workloadData)
                ? (workloadData.items || workloadData).map((item, idx) => (
                    <div key={item.waiterId || idx} className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-[#3B2515] font-medium">{item.name || item.waiterName || "Waiter"}</span>
                        <span className="text-[#9C8268] text-xs">{item.score || item.workload || 0}%</span>
                      </div>
                      <div className="w-full h-2 bg-[#EDE1CF] rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${workloadColor(item.score || item.workload || 0)}`}
                          style={{ width: `${workloadPercent(item.score || item.workload)}%` }}
                        />
                      </div>
                      {item.breakdown && (
                        <div className="flex gap-4 text-xs text-[#A9805F] pt-1">
                          <span>Tables: {item.breakdown.tables || 0}</span>
                          <span>Tasks: {item.breakdown.tasks || 0}</span>
                          <span>Requests: {item.breakdown.requests || 0}</span>
                          <span>Deliveries: {item.breakdown.deliveries || 0}</span>
                        </div>
                      )}
                    </div>
                  ))
                : (
                  <div className="text-sm text-[#9C8268] py-4 text-center">
                    Workload data could not be loaded
                  </div>
                )}
            </div>
          ) : (
            <div className="text-sm text-[#9C8268] py-4 text-center">
              No workload data available
            </div>
          )}
        </motion.div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <CardSkeleton key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-[#9C8268] text-sm">
          {searchQuery ? "No waiters match your search" : "No waiters available."}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {filtered.map((waiter) => {
            const pct = workloadPercent(waiter.workloadScore);
            const isSelected = selectedId === (waiter.id || waiter._id);
            return (
              <motion.div key={waiter.id || waiter._id} layout
                onClick={() => handleSelectWaiter(waiter.id || waiter._id)}
                className={`rounded-2xl bg-white ring-1 shadow-sm shadow-[#3B2515]/5 p-5 cursor-pointer transition-all ${
                  isSelected
                    ? "ring-[#B07B4F] ring-2"
                    : "ring-[#EDE1CF] hover:shadow-md"
                }`}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#B07B4F] to-[#C9925F] flex items-center justify-center text-white text-xs font-bold">
                        {(waiter.name || "W")[0].toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-serif text-base text-[#3B2515]">{waiter.name || "Unnamed"}</h3>
                        <span className="text-xs text-[#A9805F]">{waiter.role || "Waiter"}</span>
                      </div>
                    </div>
                  </div>
                  <ChevronRight size={16} className={`text-[#9C8268] transition-transform ${isSelected ? "rotate-90" : ""}`} />
                </div>

                <div className="grid grid-cols-3 gap-3 mb-3">
                  <div className="text-center">
                    <p className="text-lg font-serif text-[#3B2515]">{waiter.activeTables || 0}</p>
                    <p className="text-[10px] text-[#A9805F] uppercase tracking-wide">Tables</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-serif text-[#3B2515]">{waiter.pendingRequests || 0}</p>
                    <p className="text-[10px] text-[#A9805F] uppercase tracking-wide">Requests</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-serif text-[#3B2515]">{waiter.deliveryQueueSize || 0}</p>
                    <p className="text-[10px] text-[#A9805F] uppercase tracking-wide">Deliveries</p>
                  </div>
                </div>

                <div className="space-y-1 pt-3 border-t border-[#EDE1CF]">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#9C8268]">Workload</span>
                    <span className="text-[#3B2515] font-medium">{pct}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-[#EDE1CF] rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${workloadColor(pct)}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      <AnimatePresence>
        {selectedId && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            className="rounded-2xl bg-white ring-1 ring-[#EDE1CF] shadow-sm shadow-[#3B2515]/5 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#EDE1CF]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#B07B4F] to-[#C9925F] flex items-center justify-center text-white text-sm font-bold">
                  {(waiterDetails?.name || waiterName(selectedId) || "W")[0].toUpperCase()}
                </div>
                <div>
                  <h3 className="font-serif text-base text-[#3B2515]">{waiterDetails?.name || waiterName(selectedId) || "Waiter"}</h3>
                  <p className="text-xs text-[#A9805F]">{waiterDetails?.role || "Waiter"} &middot; Details</p>
                </div>
              </div>
              <button onClick={() => { setSelectedId(null); setWaiterDetails(null); }}
                className="text-[#9C8268] hover:text-[#3B2515] p-1 rounded-full hover:bg-[#FBF6EF]">
                <X size={18} />
              </button>
            </div>

            <div className="flex border-b border-[#EDE1CF] overflow-x-auto">
              {TABS.map((tab) => (
                <button key={tab} onClick={() => setDetailTab(tab)}
                  className={`px-5 py-3 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${
                    detailTab === tab
                      ? "text-[#B07B4F] border-[#B07B4F]"
                      : "text-[#9C8268] border-transparent hover:text-[#3B2515]"
                  }`}>
                  {tab}
                </button>
              ))}
            </div>

            <div className="p-5">
              {detailLoading ? (
                <div className="flex items-center justify-center py-10 text-[#9C8268] text-sm">
                  <Loader2 size={18} className="animate-spin mr-2" /> Loading...
                </div>
              ) : (
                <>
                  {detailTab === "Tables" && (
                    <div>
                      <h4 className="text-sm font-medium text-[#3B2515] mb-3">Assigned Tables ({assignedTables.length})</h4>
                      {assignedTables.length === 0 ? (
                        <p className="text-sm text-[#9C8268] py-4 text-center">No tables assigned</p>
                      ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                          {assignedTables.map((t, i) => (
                            <div key={t._id || t.id || i}
                              className="rounded-xl bg-[#FBF6EF] px-4 py-3 text-center ring-1 ring-[#EDE1CF]">
                              <p className="font-serif text-base text-[#3B2515]">Table {t.tableNumber || t.number || "?"}</p>
                              <p className="text-[10px] text-[#A9805F] uppercase mt-0.5">{t.status || "Active"}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {detailTab === "Tasks" && (
                    <div>
                      <h4 className="text-sm font-medium text-[#3B2515] mb-3">Active Tasks ({activeTasks.length})</h4>
                      {activeTasks.length === 0 ? (
                        <p className="text-sm text-[#9C8268] py-4 text-center">No active tasks</p>
                      ) : (
                        <div className="space-y-2">
                          {activeTasks.map((t, i) => (
                            <div key={t._id || t.id || i}
                              className="flex items-center justify-between rounded-xl bg-[#FBF6EF] px-4 py-3 ring-1 ring-[#EDE1CF]">
                              <div className="flex items-center gap-3">
                                <ClipboardList size={15} className="text-[#B07B4F]" />
                                <div>
                                  <p className="text-sm text-[#3B2515]">{t.description || t.title || `Task #${i + 1}`}</p>
                                  <p className="text-xs text-[#A9805F]">{t.type || "General"} {t.tableNumber ? `- Table ${t.tableNumber}` : ""}</p>
                                </div>
                              </div>
                              <span className={`text-xs rounded-full px-2.5 py-0.5 font-medium ${
                                t.status === "completed" || t.status === "done"
                                  ? "bg-emerald-50 text-emerald-600"
                                  : t.status === "in_progress" || t.status === "active"
                                    ? "bg-amber-50 text-amber-600"
                                    : "bg-sky-50 text-sky-600"
                              }`}>
                                {t.status || "pending"}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {detailTab === "Requests" && (
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-medium text-[#3B2515]">Pending Requests ({pendingRequests.length})</h4>
                        {pendingRequests.length > 0 && (
                          <button onClick={() => { setReassignModal(true); setReassignRequestId(""); setReassignTargetId(""); }}
                            className="flex items-center gap-1 rounded-full bg-[#FBF6EF] px-3 py-1.5 text-xs text-[#7B4B2A] hover:bg-[#EDE1CF] transition-colors">
                            <ArrowRight size={12} /> Reassign
                          </button>
                        )}
                      </div>
                      {pendingRequests.length === 0 ? (
                        <p className="text-sm text-[#9C8268] py-4 text-center">No pending requests</p>
                      ) : (
                        <div className="space-y-2">
                          {pendingRequests.map((r, i) => (
                            <div key={r._id || r.id || i}
                              className="flex items-center justify-between rounded-xl bg-[#FBF6EF] px-4 py-3 ring-1 ring-[#EDE1CF]">
                              <div className="flex items-center gap-3">
                                <AlertCircle size={15} className="text-amber-400" />
                                <div>
                                  <p className="text-sm text-[#3B2515]">{r.description || r.title || `Request #${i + 1}`}</p>
                                  <p className="text-xs text-[#A9805F]">{r.type || "General"} {r.tableNumber ? `- Table ${r.tableNumber}` : ""}</p>
                                </div>
                              </div>
                              <span className="text-xs text-[#9C8268]">{r.priority || "normal"}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {detailTab === "Deliveries" && (
                    <div>
                      <h4 className="text-sm font-medium text-[#3B2515] mb-3">Delivery Queue ({deliveryQueue.length})</h4>
                      {deliveryQueue.length === 0 ? (
                        <p className="text-sm text-[#9C8268] py-4 text-center">No deliveries in queue</p>
                      ) : (
                        <div className="space-y-2">
                          {deliveryQueue.map((d, i) => (
                            <div key={d._id || d.id || i}
                              className="flex items-center justify-between rounded-xl bg-[#FBF6EF] px-4 py-3 ring-1 ring-[#EDE1CF]">
                              <div className="flex items-center gap-3">
                                <ShoppingBag size={15} className="text-[#B07B4F]" />
                                <div>
                                  <p className="text-sm text-[#3B2515]">{d.orderId || d.orderNumber || `Delivery #${i + 1}`}</p>
                                  <p className="text-xs text-[#A9805F]">
                                    {d.tableNumber ? `Table ${d.tableNumber}` : ""}
                                    {d.items ? ` - ${d.items} items` : ""}
                                    {d.eta ? ` - ETA: ${d.eta}` : ""}
                                  </p>
                                </div>
                              </div>
                              <span className={`text-xs rounded-full px-2.5 py-0.5 font-medium ${
                                d.status === "delivered"
                                  ? "bg-emerald-50 text-emerald-600"
                                  : d.status === "in_transit"
                                    ? "bg-amber-50 text-amber-600"
                                    : "bg-sky-50 text-sky-600"
                              }`}>
                                {d.status || "pending"}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {detailTab === "Stats" && (
                    <div>
                      <h4 className="text-sm font-medium text-[#3B2515] mb-3">Performance Stats</h4>
                      {waiterStats ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                          <div className="rounded-xl bg-[#FBF6EF] p-4 text-center ring-1 ring-[#EDE1CF]">
                            <p className="text-2xl font-serif text-[#3B2515]">{waiterStats.ordersDeliveredToday || 0}</p>
                            <p className="text-[10px] text-[#A9805F] uppercase tracking-wide mt-1">Delivered Today</p>
                          </div>
                          <div className="rounded-xl bg-[#FBF6EF] p-4 text-center ring-1 ring-[#EDE1CF]">
                            <p className="text-2xl font-serif text-[#3B2515]">
                              {waiterStats.avgDeliveryTime
                                ? `${(waiterStats.avgDeliveryTime / 60).toFixed(1)}m`
                                : "—"}
                            </p>
                            <p className="text-[10px] text-[#A9805F] uppercase tracking-wide mt-1">Avg Delivery Time</p>
                          </div>
                          <div className="rounded-xl bg-[#FBF6EF] p-4 text-center ring-1 ring-[#EDE1CF]">
                            <p className="text-2xl font-serif text-[#3B2515]">
                              {waiterStats.rating ? `${waiterStats.rating.toFixed(1)}` : "—"}
                            </p>
                            <p className="text-[10px] text-[#A9805F] uppercase tracking-wide mt-1">Rating</p>
                          </div>
                          {waiterStats.totalOrders !== undefined && (
                            <div className="rounded-xl bg-[#FBF6EF] p-4 text-center ring-1 ring-[#EDE1CF]">
                              <p className="text-2xl font-serif text-[#3B2515]">{waiterStats.totalOrders}</p>
                              <p className="text-[10px] text-[#A9805F] uppercase tracking-wide mt-1">Total Orders</p>
                            </div>
                          )}
                          {waiterStats.currentShift !== undefined && (
                            <div className="rounded-xl bg-[#FBF6EF] p-4 text-center ring-1 ring-[#EDE1CF]">
                              <p className="text-2xl font-serif text-[#3B2515]">{waiterStats.currentShift}</p>
                              <p className="text-[10px] text-[#A9805F] uppercase tracking-wide mt-1">Current Shift (h)</p>
                            </div>
                          )}
                          {waiterStats.tablesServed !== undefined && (
                            <div className="rounded-xl bg-[#FBF6EF] p-4 text-center ring-1 ring-[#EDE1CF]">
                              <p className="text-2xl font-serif text-[#3B2515]">{waiterStats.tablesServed}</p>
                              <p className="text-[10px] text-[#A9805F] uppercase tracking-wide mt-1">Tables Served</p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-sm text-[#9C8268] py-4 text-center">No stats available</p>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {reassignModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
            onClick={() => { if (!reassignLoading) setReassignModal(false); }}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-serif text-lg text-[#3B2515]">Reassign Request</h3>
                <button onClick={() => setReassignModal(false)} disabled={reassignLoading}
                  className="text-[#9C8268] hover:text-[#3B2515]">
                  <X size={18} />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-[#A9805F] uppercase tracking-wide font-medium mb-1.5 block">
                    Select Request
                  </label>
                  <select value={reassignRequestId} onChange={(e) => setReassignRequestId(e.target.value)}
                    className="w-full rounded-xl border border-[#EDE1CF] px-3.5 py-2.5 text-sm text-[#3B2515] bg-white focus:outline-none focus:ring-2 focus:ring-[#B07B4F]/40">
                    <option value="">— Choose a request —</option>
                    {pendingRequests.map((r, i) => (
                      <option key={r._id || r.id || i} value={r._id || r.id}>
                        {r.description || r.title || `Request #${i + 1}`} {r.tableNumber ? `(Table ${r.tableNumber})` : ""}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-[#A9805F] uppercase tracking-wide font-medium mb-1.5 block">
                    Assign To
                  </label>
                  <select value={reassignTargetId} onChange={(e) => setReassignTargetId(e.target.value)}
                    className="w-full rounded-xl border border-[#EDE1CF] px-3.5 py-2.5 text-sm text-[#3B2515] bg-white focus:outline-none focus:ring-2 focus:ring-[#B07B4F]/40">
                    <option value="">— Choose a waiter —</option>
                    {waiters
                      .filter((w) => (w.id || w._id) !== selectedId)
                      .map((w) => (
                        <option key={w.id || w._id} value={w.id || w._id}>
                          {w.name} ({w.role || "Waiter"})
                        </option>
                      ))}
                  </select>
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button onClick={() => setReassignModal(false)} disabled={reassignLoading}
                    className="rounded-full border border-[#EDE1CF] px-4 py-2 text-sm text-[#7B4B2A] hover:bg-[#FBF6EF] transition-colors">
                    Cancel
                  </button>
                  <button onClick={handleReassign} disabled={reassignLoading}
                    className="flex items-center gap-1.5 rounded-full bg-[#B07B4F] text-white px-4 py-2 text-sm font-medium hover:bg-[#C9925F] transition-colors disabled:opacity-50">
                    {reassignLoading && <Loader2 size={14} className="animate-spin" />}
                    Reassign
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
