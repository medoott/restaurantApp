import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  ArrowLeft,
  Clock,
  CheckCircle2,
  ChefHat,
  Utensils,
  Plus,
} from "lucide-react";
import useSocket from "../hooks/useSocket.js";
import { apiRequest } from "../services/api.js";
import { normalizeOrder } from "../utils/normalize.js";
import { getSessionToken } from "../services/table.js";
import StatusBadge from "../components/ui/StatusBadge.jsx";
import PrimaryButton from "../components/ui/PrimaryButton.jsx";

const STEPS = [
  { key: "Pending", icon: Clock, label: "Order Placed" },
  { key: "Preparing", icon: ChefHat, label: "Preparing" },
  { key: "Ready", icon: Utensils, label: "Ready" },
  { key: "Served", icon: Utensils, label: "Served" },
  { key: "Paid", icon: CheckCircle2, label: "Paid" },
];

export default function TrackOrderPage({ onBackHome, initialOrderId = "", onAddItems, onNewOrder }) {


  const [inputValue, setInputValue] = useState(initialOrderId);
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const onStatusChange = useCallback((data) => {
    setOrder((prev) =>
      prev && String(prev.id) === String(data.id) ? normalizeOrder(data) : prev
    );
  }, []);

  const { trackOrder } = useSocket({
    "order:statusChanged": onStatusChange,
  });

  const fetchOrder = useCallback(async (id) => {
    setLoading(true);
    setError("");
    try {
      const sessionToken = getSessionToken();
      const url = sessionToken
        ? `/orders/${encodeURIComponent(id)}/track?sessionToken=${encodeURIComponent(sessionToken)}`
        : `/orders/${encodeURIComponent(id)}/track`;
      const data = await apiRequest(url);
      const found = data?.order;
      if (!found) {
        setError("Order not found. Please check the order ID.");
        return null;
      }
      return normalizeOrder(found);
    } catch (err) {
      const message = err?.message || "We couldn’t load your order status right now.";
      setError(
        err?.status === 404 || message === "Request failed: 404"
          ? "Order not found. Please check the order ID."
          : message === "We couldn’t reach the server. Please try again."
            ? message
            : message || "We couldn’t load your order status right now.",
      );
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!initialOrderId) return;
    let alive = true;
    setInputValue(initialOrderId);
    fetchOrder(initialOrderId).then((found) => {
      if (!alive) return;
      if (found) setOrder(found);
    });
    return () => { alive = false; };
  }, [initialOrderId, fetchOrder]);

  useEffect(() => {
    if (order?.id) {
      trackOrder(order.id);
    }
  }, [order?.id, trackOrder]);

  const handleTrack = async (e) => {
    e.preventDefault();
    const id = inputValue.trim();
    if (!id) return;
    const found = await fetchOrder(id);
    if (found) {
      setOrder(found);
    }
  };

  const terminalStatuses = ["Paid", "Cancelled", "Rejected"];
  const canAddItems = order && !["Preparing", "Ready", "Served", "Paid", "Cancelled", "Rejected"].includes(order.status);
  const currentStepIndex = order
    ? STEPS.findIndex((s) => s.key === order.status)
    : -1;
  const isTerminal = order && terminalStatuses.includes(order.status);
  const isCancelled = order?.status === "Cancelled" || order?.status === "Rejected";
  const activeStep = isTerminal && !isCancelled ? STEPS.length : isCancelled ? -2 : currentStepIndex;

  return (
    <div className="min-h-screen bg-[#FBF6EF] pt-14">
      <header className="px-5 sm:px-10 pt-6 sm:pt-8 flex items-center justify-between">
        <PrimaryButton onClick={onBackHome} className="!bg-transparent !text-[#3B2515] !shadow-none !px-0 hover:!underline">
          <ArrowLeft size={16} /> Back
        </PrimaryButton>
      </header>

      <div className="max-w-lg mx-auto px-5 sm:px-8 py-10">
        <div className="text-center mb-8">
          <h1 className="font-serif text-3xl text-[#3B2515]">Track Your Order</h1>
          <p className="text-sm text-[#9C8268] mt-2">
            {initialOrderId ? "Your order status is being tracked live." : "Enter your order ID to see the current status."}
          </p>
        </div>

        {!initialOrderId && (
          <form onSubmit={handleTrack} className="flex gap-2">
            <div className="flex-1 flex items-center gap-2 rounded-full bg-white px-4 py-3 ring-1 ring-[#EDE1CF] shadow-sm">
              <Search size={16} className="text-[#A9805F]" />
              <input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="e.g. ORD-174872928..."
                className="w-full bg-transparent text-sm text-[#3B2515] placeholder:text-[#A9805F] outline-none"
                aria-label="Order ID"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !inputValue.trim()}
              className="rounded-full bg-[#3B2515] text-[#F3E5D3] px-6 py-3 text-sm font-medium hover:bg-[#4A2E18] disabled:opacity-50 transition-colors"
            >
              {loading ? "..." : "Track"}
            </button>
          </form>
        )}

        {loading && initialOrderId && (
          <div className="mt-8 text-center text-sm text-[#9C8268]">
            Loading order...
          </div>
        )}

        {error && !loading && (
          <div className="mt-6 rounded-2xl bg-rose-50 border border-rose-200 px-5 py-4 text-sm text-rose-700" role="alert">
            {error}
          </div>
        )}

        <AnimatePresence>
          {order && !loading && (
            <motion.div
              key={order.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="mt-8 space-y-6"
            >
              <div className="rounded-2xl bg-white ring-1 ring-[#EDE1CF] shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-[#A9805F]">
                      Order ID
                    </p>
                    <p className="font-serif text-xl text-[#3B2515] mt-1">
                      {order.id}
                    </p>
                  </div>
                  <StatusBadge status={order.status} />
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-[#A9805F]">Customer</p>
                    <p className="text-[#3B2515] font-medium mt-0.5">{order.customer || "Guest"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-[#A9805F]">Code</p>
                    <p className="text-[#3B2515] font-medium mt-0.5">{order.code}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-[#A9805F]">Payment</p>
                    <p className="text-[#3B2515] font-medium mt-0.5">{order.payment}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-[#A9805F]">Total</p>
                    <p className="text-[#3B2515] font-medium mt-0.5">${Number(order.total).toFixed(2)}</p>
                  </div>
                </div>

                {order.createdAt && (
                  <div className="mt-4 flex items-center gap-1.5 text-xs text-[#9C8268]">
                    <Clock size={12} />
                    Ordered {new Date(order.createdAt).toLocaleString()}
                  </div>
                )}
              </div>

              {Array.isArray(order.itemsDetail) && order.itemsDetail.length > 0 && (
                <div className="rounded-2xl bg-white ring-1 ring-[#EDE1CF] shadow-sm p-6">
                  <h2 className="font-serif text-lg text-[#3B2515] mb-3">Order Items</h2>
                  <div className="space-y-2">
                    {order.itemsDetail.map((item, idx) => (
                      <div key={item.id || idx} className="flex items-center justify-between rounded-xl bg-[#FBF6EF] px-4 py-3">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-medium text-[#B07B4F]">{item.qty}x</span>
                          <span className="text-sm text-[#3B2515]">{item.name}</span>
                        </div>
                        <span className="text-sm text-[#9C8268]">${(Number(item.price) * Number(item.qty)).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="rounded-2xl bg-white ring-1 ring-[#EDE1CF] shadow-sm p-6">
                <h2 className="font-serif text-lg text-[#3B2515] mb-6">Order Progress</h2>

                {isCancelled ? (
                  <div className="rounded-2xl bg-rose-50 border border-rose-200 px-5 py-6 text-center">
                    <p className="font-semibold text-rose-700 text-lg">Order Cancelled</p>
                    <p className="text-sm text-rose-600 mt-1">This order has been cancelled.</p>
                  </div>
                ) : (
                  <div className="relative">
                    {STEPS.map((step, idx) => {
                      const isActive = idx <= activeStep;
                      const isLast = idx === STEPS.length - 1;
                      const Icon = step.icon;

                      return (
                        <div key={step.key} className="flex items-start gap-4 pb-8 last:pb-0 relative">
                          {!isLast && (
                            <div className={`absolute left-[15px] top-8 w-0.5 h-8 -translate-x-1/2 ${idx < activeStep ? "bg-emerald-400" : "bg-[#EDE1CF]"}`} />
                          )}
                          <div className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isActive ? "bg-emerald-100 text-emerald-600 ring-2 ring-emerald-400" : "bg-[#FBF6EF] text-[#C9B496] ring-1 ring-[#EDE1CF]"}`}>
                            {idx < activeStep ? <CheckCircle2 size={16} /> : <Icon size={16} />}
                          </div>
                          <div className="pt-1">
                            <p className={`text-sm font-medium ${isActive ? "text-[#3B2515]" : "text-[#C9B496]"}`}>{step.label}</p>
                            <p className="text-xs text-[#A9805F] mt-0.5">
                              {isActive && idx === currentStepIndex ? "Current" : idx < currentStepIndex ? "Completed" : "Pending"}
                            </p>
                          </div>
                        </div>
                      );
                    })}

                    {isTerminal && order?.status === "Paid" && (
                      <div className="flex items-start gap-4 pt-2">
                        <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 ring-2 ring-emerald-400 flex items-center justify-center shrink-0">
                          <CheckCircle2 size={16} />
                        </div>
                        <div className="pt-1">
                          <p className="text-sm font-medium text-emerald-700">Paid</p>
                          <p className="text-xs text-emerald-600 mt-0.5">Completed</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                {canAddItems && onAddItems && (
                  <PrimaryButton
                    onClick={() => onAddItems(order)}
                    className="flex-1 !bg-[#B07B4F] hover:!bg-[#9A6A42]"
                  >
                    <Plus size={16} /> Add Items
                  </PrimaryButton>
                )}
                {onNewOrder && (
                  <PrimaryButton
                    onClick={onNewOrder}
                    className="flex-1 !bg-[#3B2515] hover:!bg-[#4A2E18]"
                  >
                    <Plus size={16} /> New Order
                  </PrimaryButton>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
