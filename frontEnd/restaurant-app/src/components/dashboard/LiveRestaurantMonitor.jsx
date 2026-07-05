import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Clock, ChefHat, ShoppingBag, Truck,
  Utensils, Receipt, CreditCard, CheckCircle,
  AlertTriangle, TrendingUp, Users, DollarSign,
} from "lucide-react";
import useSocket from "../../hooks/useSocket.js";
import { apiRequest } from "../../services/api.js";

const STATUS_SECTIONS = [
  { key: "Pending", label: "Waiting for Kitchen", icon: Clock, color: "text-amber-600", bg: "bg-amber-50" },
  { key: "Preparing", label: "Preparing", icon: ChefHat, color: "text-blue-600", bg: "bg-blue-50" },
  { key: "ReadyForPickup", label: "Ready for Pickup", icon: ShoppingBag, color: "text-emerald-600", bg: "bg-emerald-50" },
  { key: "BeingDelivered", label: "Being Delivered", icon: Truck, color: "text-purple-600", bg: "bg-purple-50" },
  { key: "Served", label: "Served", icon: Utensils, color: "text-teal-600", bg: "bg-teal-50" },
  { key: "Dining", label: "Dining", icon: Utensils, color: "text-indigo-600", bg: "bg-indigo-50" },
  { key: "BillRequested", label: "Waiting for Bill", icon: Receipt, color: "text-orange-600", bg: "bg-orange-50" },
  { key: "PaymentInProgress", label: "Payment Pending", icon: CreditCard, color: "text-rose-600", bg: "bg-rose-50" },
  { key: "Paid", label: "Paid", icon: CheckCircle, color: "text-emerald-600", bg: "bg-emerald-50" },
];

function StatusCard({ status, count, icon: Icon, color, bg }) {
  return (
    <div className={`rounded-xl ${bg} ring-1 ring-[#EDE1CF] p-4 min-w-[140px]`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon size={16} className={color} />
        <span className="text-xs font-medium text-[#7B4B2A]">{status}</span>
      </div>
      <p className={`text-2xl font-bold ${color}`}>{count ?? 0}</p>
    </div>
  );
}

export default function LiveRestaurantMonitor() {
  const [data, setData] = useState({
    statusSummary: {},
    delayedDeliveries: 0,
    totalRevenue: 0,
    onlineStaff: 0,
  });
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const [overview, orderData] = await Promise.all([
        apiRequest("/performance/overview"),
        apiRequest("/orders?limit=200"),
      ]);
      if (overview) setData(overview);
      if (orderData?.orders) setOrders(orderData.orders);
    } catch { } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  useSocket({
    "order:statusChanged": () => loadData(),
    "delivery:assigned": () => loadData(),
    "delivery:completed": () => loadData(),
    "payment:completed": () => loadData(),
    "table:statusChanged": () => loadData(),
  });

  const waitingTooLong = orders.filter(
    (o) => o.status === "Preparing" && o.preparedAt &&
      Date.now() - new Date(o.preparedAt).getTime() > 15 * 60 * 1000
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Clock size={24} className="animate-spin text-[#A9805F]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-xl text-[#3B2515]">Live Restaurant Monitor</h2>
        <button
          onClick={loadData}
          className="text-xs text-[#A9805F] hover:text-[#7B4B2A] underline"
        >
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
        <div className="rounded-xl bg-white ring-1 ring-[#EDE1CF] p-3">
          <div className="flex items-center gap-1.5 text-xs text-[#9C8268] mb-1">
            <Users size={12} /> Online Staff
          </div>
          <p className="text-lg font-bold text-[#3B2515]">{data.onlineStaff || 0}</p>
        </div>
        <div className="rounded-xl bg-white ring-1 ring-[#EDE1CF] p-3">
          <div className="flex items-center gap-1.5 text-xs text-[#9C8268] mb-1">
            <DollarSign size={12} /> Today Revenue
          </div>
          <p className="text-lg font-bold text-[#3B2515]">${Number(data.totalRevenue || 0).toFixed(2)}</p>
        </div>
        <div className="rounded-xl bg-rose-50 ring-1 ring-rose-200 p-3">
          <div className="flex items-center gap-1.5 text-xs text-rose-600 mb-1">
            <AlertTriangle size={12} /> Delayed
          </div>
          <p className="text-lg font-bold text-rose-600">{data.delayedDeliveries || 0}</p>
        </div>
        <div className="rounded-xl bg-amber-50 ring-1 ring-amber-200 p-3">
          <div className="flex items-center gap-1.5 text-xs text-amber-600 mb-1">
            <Clock size={12} /> Waiting Too Long
          </div>
          <p className="text-lg font-bold text-amber-600">{waitingTooLong.length}</p>
        </div>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2">
        {STATUS_SECTIONS.map((s) => (
          <StatusCard
            key={s.key}
            status={s.label}
            count={data.statusSummary?.[s.key] || 0}
            icon={s.icon}
            color={s.color}
            bg={s.bg}
          />
        ))}
      </div>

      {waitingTooLong.length > 0 && (
        <div className="rounded-xl bg-rose-50 border border-rose-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={16} className="text-rose-600" />
            <h3 className="text-sm font-semibold text-rose-700">Orders Waiting Too Long in Kitchen</h3>
          </div>
          <div className="space-y-1">
            {waitingTooLong.map((o) => (
              <div key={o.id} className="flex items-center justify-between text-xs text-rose-600">
                <span>Order {o.id?.slice(-8)}</span>
                <span>{o.customer || "Guest"} - Table {o.tableNumber || "—"}</span>
                <span>{Math.round((Date.now() - new Date(o.preparedAt).getTime()) / 60000)} min</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.delayedDeliveries > 0 && (
        <div className="rounded-xl bg-rose-50 border border-rose-200 p-4">
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} className="text-rose-600" />
            <h3 className="text-sm font-semibold text-rose-700">{data.delayedDeliveries} Delayed Deliveries</h3>
          </div>
        </div>
      )}
    </div>
  );
}
