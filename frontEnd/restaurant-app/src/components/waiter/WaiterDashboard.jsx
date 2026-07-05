import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell, CheckCircle, Package, MapPin,
  Clock, ArrowRight, AlertTriangle, TrendingUp,
} from "lucide-react";
import * as deliveryService from "../../services/delivery.js";
import useSocket from "../../hooks/useSocket.js";
import { useAuth } from "../../hooks/useAuth.js";

const PRIORITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3 };

export default function WaiterDashboard() {
  const { user } = useAuth();
  const [deliveries, setDeliveries] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("deliveries");

  const loadData = useCallback(async () => {
    try {
      const [delData, taskData] = await Promise.all([
        deliveryService.getMyDeliveries({ limit: "50" }).catch(() => ({ deliveries: [] })),
        fetch("/api/tasks/mine").then(r => r.json()).catch(() => ({ tasks: [] })),
      ]);
      setDeliveries(delData?.deliveries || []);
      setTasks(taskData?.tasks || []);
    } catch { } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  useSocket({
    "delivery:assigned": (data) => {
      if (data.waiterId === user?._id) {
        loadData();
      }
    },
    "delivery:accepted": (data) => {
      loadData();
    },
    "delivery:pickedUp": (data) => {
      loadData();
    },
    "delivery:completed": (data) => {
      loadData();
    },
    "task:created": () => loadData(),
    "task:updated": () => loadData(),
  });

  const activeDeliveries = useMemo(() =>
    deliveries.filter(d => ["assigned", "accepted", "picked_up"].includes(d.status)),
    [deliveries],
  );

  const completedDeliveries = useMemo(() =>
    deliveries.filter(d => d.status === "delivered").slice(0, 10),
    [deliveries],
  );

  const sortedTasks = useMemo(() =>
    [...tasks].sort((a, b) => {
      const pa = PRIORITY_ORDER[a.priority] ?? 99;
      const pb = PRIORITY_ORDER[b.priority] ?? 99;
      return pa - pb;
    }),
    [tasks],
  );

  const handleAccept = async (deliveryId) => {
    await deliveryService.acceptDelivery(deliveryId);
    loadData();
  };

  const handlePickup = async (deliveryId) => {
    await deliveryService.confirmPickup(deliveryId);
    loadData();
  };

  const handleDeliver = async (deliveryId) => {
    await deliveryService.confirmDelivered(deliveryId);
    loadData();
  };

  const getNextAction = (delivery) => {
    if (delivery.status === "assigned") return { label: "Accept", action: () => handleAccept(delivery._id), color: "bg-emerald-500" };
    if (delivery.status === "accepted") return { label: "Pick Up", action: () => handlePickup(delivery._id), color: "bg-amber-500" };
    if (delivery.status === "picked_up") return { label: "Deliver", action: () => handleDeliver(delivery._id), color: "bg-blue-500" };
    return null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Clock size={20} className="animate-spin text-[#A9805F]" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-1 bg-[#FBF6EF] rounded-xl p-1 ring-1 ring-[#EDE1CF]">
        <button
          onClick={() => setActiveTab("deliveries")}
          className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${activeTab === "deliveries" ? "bg-white shadow-sm text-[#3B2515]" : "text-[#A9805F] hover:text-[#7B4B2A]"}`}
        >
          Deliveries {activeDeliveries.length > 0 && `(${activeDeliveries.length})`}
        </button>
        <button
          onClick={() => setActiveTab("tasks")}
          className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${activeTab === "tasks" ? "bg-white shadow-sm text-[#3B2515]" : "text-[#A9805F] hover:text-[#7B4B2A]"}`}
        >
          Tasks {sortedTasks.length > 0 && `(${sortedTasks.length})`}
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${activeTab === "history" ? "bg-white shadow-sm text-[#3B2515]" : "text-[#A9805F] hover:text-[#7B4B2A]"}`}
        >
          History
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === "deliveries" && (
          <motion.div key="deliveries" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2">
            {activeDeliveries.length === 0 ? (
              <div className="text-center py-8 text-sm text-[#9C8268]">No active deliveries</div>
            ) : (
              activeDeliveries.map((d) => {
                const nextAction = getNextAction(d);
                return (
                  <motion.div
                    key={d._id}
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    className="rounded-xl bg-white ring-1 ring-[#EDE1CF] p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Package size={14} className="text-[#A9805F]" />
                          <span className="text-sm font-semibold text-[#3B2515]">Order {d.orderId?.slice(-8)}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                            d.status === "assigned" ? "bg-amber-50 text-amber-700" :
                            d.status === "accepted" ? "bg-blue-50 text-blue-700" :
                            "bg-emerald-50 text-emerald-700"
                          }`}>
                            {d.status.replace("_", " ")}
                          </span>
                        </div>
                        {d.tableNumber && (
                          <div className="flex items-center gap-1.5 text-xs text-[#7B4B2A]">
                            <MapPin size={12} />
                            Table {d.tableNumber}
                          </div>
                        )}
                        <div className="flex items-center gap-3 mt-1.5 text-[10px] text-[#9C8268]">
                          {d.assignedAt && (
                            <span className="flex items-center gap-1">
                              <Clock size={10} /> Assigned {new Date(d.assignedAt).toLocaleTimeString()}
                            </span>
                          )}
                        </div>
                      </div>
                      {nextAction && (
                        <button
                          onClick={nextAction.action}
                          className={`shrink-0 rounded-lg ${nextAction.color} text-white px-4 py-2 text-xs font-semibold hover:opacity-90 transition-opacity`}
                        >
                          {nextAction.label}
                        </button>
                      )}
                    </div>
                  </motion.div>
                );
              })
            )}
          </motion.div>
        )}

        {activeTab === "tasks" && (
          <motion.div key="tasks" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2">
            {sortedTasks.length === 0 ? (
              <div className="text-center py-8 text-sm text-[#9C8268]">No pending tasks</div>
            ) : (
              sortedTasks.map((t, i) => (
                <motion.div
                  key={t._id}
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: i * 0.05 }}
                  className="rounded-xl bg-white ring-1 ring-[#EDE1CF] p-4"
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${
                      t.priority === "critical" ? "bg-red-500" :
                      t.priority === "high" ? "bg-amber-500" :
                      t.priority === "medium" ? "bg-blue-500" : "bg-gray-400"
                    }`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-[#3B2515]">{t.title}</span>
                        {t.priority === "high" || t.priority === "critical" ? (
                          <AlertTriangle size={12} className="text-amber-500" />
                        ) : null}
                      </div>
                      {t.description && (
                        <p className="text-xs text-[#9C8268] mt-0.5">{t.description}</p>
                      )}
                      <div className="flex items-center gap-3 mt-1.5 text-[10px] text-[#9C8268]">
                        {t.tableNumber && <span>Table {t.tableNumber}</span>}
                        <span className="capitalize">{t.category?.replace("_", " ")}</span>
                        <span className="capitalize">{t.priority}</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </motion.div>
        )}

        {activeTab === "history" && (
          <motion.div key="history" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2">
            {completedDeliveries.length === 0 ? (
              <div className="text-center py-8 text-sm text-[#9C8268]">No completed deliveries</div>
            ) : (
              completedDeliveries.map((d) => (
                <div key={d._id} className="rounded-xl bg-white/50 ring-1 ring-[#EDE1CF] p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle size={14} className="text-emerald-500" />
                      <span className="text-sm text-[#3B2515]">Order {d.orderId?.slice(-8)}</span>
                      {d.tableNumber && (
                        <span className="text-xs text-[#9C8268]">Table {d.tableNumber}</span>
                      )}
                    </div>
                    {d.deliveredAt && (
                      <span className="text-[10px] text-[#9C8268]">{new Date(d.deliveredAt).toLocaleTimeString()}</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
