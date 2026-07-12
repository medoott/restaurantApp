import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Clock, AlertTriangle, CheckCircle, ChevronRight,
  Users, Utensils, ChefHat, RefreshCw
} from "lucide-react";
import { api } from "../../services/api.js";

const calcElapsed = (createdAt) => {
  if (!createdAt) return 0;
  return Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000);
};

const formatTime = (minutes) => {
  if (minutes < 60) return `${minutes}m`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
};

export default function KitchenWorkspace({ user, _access = {} }) {
  const [orders, setOrders] = useState({ pending: [], preparing: [], ready: [] });
  const [stats, setStats] = useState({ new: 0, preparing: 0, ready: 0, delayed: 0, todayCompleted: 0, avgPrepTimeMin: 0 });
  const [loading, setLoading] = useState(true);
  const [notif, setNotif] = useState(null);
  const [delayedIds, setDelayedIds] = useState(new Set());

  const showNotif = useCallback((msg, type = "success") => {
    setNotif({ msg, type });
    setTimeout(() => setNotif(null), 3000);
  }, []);

  const loadData = useCallback(async () => {
    try {
      const [kdsOrders, kdsStats, delayed] = await Promise.all([
        api.get("/kds/orders"),
        api.get("/kds/stats"),
        api.get("/kds/delayed"),
      ]);
      const all = kdsOrders?.data || kdsOrders || [];
      const pending = all.filter((o) => (o.status || "").toLowerCase() === "pending");
      const preparing = all.filter((o) => (o.status || "").toLowerCase() === "preparing");
      const ready = all.filter((o) => (o.status || "").toLowerCase() === "ready");
      setOrders({ pending, preparing, ready });
      const s = kdsStats?.data || kdsStats || {};
      setStats({
        new: s.new || 0, preparing: s.preparing || 0,
        ready: s.ready || 0, delayed: s.delayed || 0,
        todayCompleted: s.todayCompleted || 0, avgPrepTimeMin: s.avgPrepTimeMin || 0,
      });
      const delayedArr = delayed?.data || delayed || [];
      setDelayedIds(new Set(delayedArr.map((d) => d.id || d._id)));
    } catch (err) {
      showNotif(err.message, "error");
    } finally {
      setLoading(false);
    }
  }, [showNotif]);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 15000);
    return () => clearInterval(interval);
  }, [loadData]);

  const handleAccept = async (id) => {
    try {
      await api.put(`/kds/orders/${id}/accept`);
      showNotif("Order accepted");
      loadData();
    } catch (err) {
      showNotif(err.message, "error");
    }
  };

  const handleComplete = async (id) => {
    try {
      await api.put(`/kds/orders/${id}/complete`);
      showNotif("Order completed — delivery assigned");
      loadData();
    } catch (err) {
      showNotif(err.message, "error");
    }
  };

  const isDelayed = (order) => {
    const id = order?.id || order?._id;
    if (delayedIds.has(id)) return true;
    return calcElapsed(order?.createdAt) > 15;
  };

  const renderOrderCard = (order, column) => {
    const delayed = isDelayed(order);
    const elapsed = calcElapsed(order.createdAt);
    return (
      <motion.div
        key={order.id || order._id}
        layout
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className={`rounded-2xl bg-white ring-1 p-4 shadow-sm transition-shadow ${
          delayed ? "ring-red-400 animate-pulse" : "ring-[#EDE1CF]"
        }`}
      >
        <div className="flex items-start justify-between mb-2">
          <div>
            <h3 className="font-serif text-sm text-[#3B2515]">
              Order #{order.orderId || (order.id ? order.id.toString().slice(-6) : "—")}
            </h3>
            <div className="flex items-center gap-1.5 mt-0.5 text-xs text-[#9C8268]">
              <Users size={12} />
              <span>Table {order.tableNumber || order.table?.tableNumber || "—"}</span>
            </div>
          </div>
          <div className="flex items-center gap-1 text-xs text-[#9C8268] bg-[#FBF6EF] rounded-full px-2 py-1">
            <Clock size={11} />
            {formatTime(elapsed)}
          </div>
        </div>

        <div className="space-y-1 mb-3">
          {(order.items || []).map((item, i) => (
            <div key={i} className="flex items-center justify-between text-xs">
              <span className="text-[#7B4B2A] truncate">
                <Utensils size={10} className="inline mr-1 text-[#B07B4F]" />
                {item.name || item.product?.name || "Item"}
              </span>
              <span className="text-[#9C8268] ml-2 shrink-0">x{item.quantity || 1}</span>
            </div>
          ))}
          {(!order.items || order.items.length === 0) && (
            <p className="text-xs text-[#9C8268] italic">No items</p>
          )}
        </div>

        {delayed && (
          <div className="flex items-center gap-1 mb-2 text-xs text-red-600 bg-red-50 rounded-lg px-2 py-1">
            <AlertTriangle size={12} />
            <span>Delayed ({formatTime(elapsed)})</span>
          </div>
        )}

        <div className="flex gap-2">
          {column === "pending" && (
            <button onClick={() => handleAccept(order.id || order._id)}
              className="flex-1 flex items-center justify-center gap-1 rounded-full bg-[#B07B4F] text-white px-3 py-1.5 text-xs font-medium hover:bg-[#C9925F] transition-colors"
            >
              Accept <ChevronRight size={12} />
            </button>
          )}
          {column === "preparing" && (
            <button onClick={() => handleComplete(order.id || order._id)}
              className="flex-1 flex items-center justify-center gap-1 rounded-full bg-emerald-500 text-white px-3 py-1.5 text-xs font-medium hover:bg-emerald-600 transition-colors"
            >
              <CheckCircle size={12} /> Complete
            </button>
          )}
        </div>
      </motion.div>
    );
  };

  const columnConfig = [
    { key: "pending", label: "Pending", empty: "No pending orders", color: "bg-amber-400" },
    { key: "preparing", label: "Preparing", empty: "No orders in preparation", color: "bg-sky-400" },
    { key: "ready", label: "Ready", empty: "No ready orders", color: "bg-emerald-400" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-xl text-[#3B2515] flex items-center gap-2">
            <ChefHat size={18} /> Kitchen Workspace
          </h2>
          <p className="text-xs text-[#A9805F] mt-0.5">
            {user?.name ? `Cook: ${user.name}` : "Real-time kitchen display"}
          </p>
        </div>
        <button onClick={loadData}
          className="flex items-center gap-1.5 rounded-full bg-[#FBF6EF] ring-1 ring-[#EDE1CF] px-4 py-2 text-xs text-[#7B4B2A] font-medium hover:bg-[#EDE1CF] transition-colors"
        >
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {notif && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className={`rounded-xl px-4 py-3 text-sm flex items-center gap-2 ${
            notif.type === "error"
              ? "bg-rose-50 border border-rose-200 text-rose-700"
              : "bg-emerald-50 border border-emerald-200 text-emerald-700"
          }`}
        >
          {notif.type === "error" ? <AlertTriangle size={15} /> : <CheckCircle size={15} />}
          {notif.msg}
        </motion.div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-2xl bg-white ring-1 ring-[#EDE1CF] p-4">
          <p className="text-xs text-[#9C8268] uppercase tracking-wide">New</p>
          <p className="text-2xl font-serif text-[#3B2515] mt-1">{stats.new}</p>
        </div>
        <div className="rounded-2xl bg-white ring-1 ring-[#EDE1CF] p-4">
          <p className="text-xs text-[#9C8268] uppercase tracking-wide">Preparing</p>
          <p className="text-2xl font-serif text-[#3B2515] mt-1">{stats.preparing}</p>
        </div>
        <div className="rounded-2xl bg-white ring-1 ring-[#EDE1CF] p-4">
          <p className="text-xs text-[#9C8268] uppercase tracking-wide">Ready</p>
          <p className="text-2xl font-serif text-[#3B2515] mt-1">{stats.ready}</p>
        </div>
        <div className="rounded-2xl bg-white ring-1 ring-red-300 p-4">
          <p className="text-xs text-red-600 uppercase tracking-wide flex items-center gap-1">
            <AlertTriangle size={12} /> Delayed
          </p>
          <p className="text-2xl font-serif text-red-600 mt-1">{stats.delayed}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-2xl bg-emerald-50 ring-1 ring-emerald-200 p-4">
          <p className="text-xs text-emerald-700 uppercase tracking-wide">Completed Today</p>
          <p className="text-2xl font-serif text-emerald-800 mt-1">{stats.todayCompleted}</p>
        </div>
        <div className="rounded-2xl bg-sky-50 ring-1 ring-sky-200 p-4">
          <p className="text-xs text-sky-700 uppercase tracking-wide">Avg Prep Time</p>
          <p className="text-2xl font-serif text-sky-800 mt-1">{stats.avgPrepTimeMin}m</p>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {["pending", "preparing", "ready"].map((col) => (
            <div key={col}>
              <div className="flex items-center gap-2 mb-3">
                <span className="w-2.5 h-2.5 rounded-full bg-[#EDE1CF]" />
                <div className="h-3 w-20 bg-[#EDE1CF]/60 animate-pulse rounded" />
              </div>
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="rounded-2xl bg-white ring-1 ring-[#EDE1CF] p-4 animate-pulse">
                    <div className="h-3 w-24 bg-[#EDE1CF]/60 rounded mb-3" />
                    <div className="h-2 w-16 bg-[#EDE1CF]/60 rounded mb-2" />
                    <div className="h-2 w-32 bg-[#EDE1CF]/60 rounded" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {columnConfig.map((col) => (
            <div key={col.key}>
              <div className="flex items-center gap-2 mb-3">
                <span className={`w-2.5 h-2.5 rounded-full ${col.color}`} />
                <h3 className="font-serif text-sm text-[#3B2515] uppercase tracking-wide">{col.label}</h3>
                <span className="text-xs text-[#9C8268] bg-[#FBF6EF] rounded-full px-2 py-0.5">
                  {orders[col.key]?.length || 0}
                </span>
              </div>
              {(!orders[col.key] || orders[col.key].length === 0) ? (
                <div className="rounded-2xl bg-white ring-1 ring-[#EDE1CF] p-6 text-center">
                  <p className="text-xs text-[#9C8268]">{col.empty}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <AnimatePresence>
                    {orders[col.key].map((order) => renderOrderCard(order, col.key))}
                  </AnimatePresence>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}