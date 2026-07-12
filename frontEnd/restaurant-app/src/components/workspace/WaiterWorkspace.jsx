import { useState, useEffect, useCallback } from "react";
import { Coffee, Bell, ShoppingBag, CheckCircle, Loader, Clock, Users } from "lucide-react";
import { api } from "../../services/api.js";
import { useToast } from "../../hooks/useToast.jsx";

const REQUEST_LABELS = {
  call_waiter: "Call Waiter",
  water: "Water",
  cutlery: "Cutlery",
  napkins: "Napkins",
  sauce: "Sauce",
  assistance: "Assistance",
  bill: "Bill Request",
};

const REQUEST_COLORS = {
  call_waiter: "bg-blue-50 text-blue-700 ring-blue-200",
  water: "bg-sky-50 text-sky-700 ring-sky-200",
  cutlery: "bg-stone-50 text-stone-700 ring-stone-200",
  napkins: "bg-pink-50 text-pink-700 ring-pink-200",
  sauce: "bg-orange-50 text-orange-700 ring-orange-200",
  assistance: "bg-purple-50 text-purple-700 ring-purple-200",
  bill: "bg-amber-50 text-amber-700 ring-amber-200",
};

const STATUS_BADGES = {
  dining: "bg-emerald-100 text-emerald-700 ring-emerald-300",
  bill_requested: "bg-amber-100 text-amber-700 ring-amber-300",
  payment: "bg-blue-100 text-blue-700 ring-blue-300",
};

function timeElapsed(dateString) {
  if (!dateString) return "";
  const diff = Date.now() - new Date(dateString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ${mins % 60}m`;
}

export default function WaiterWorkspace({ user, _access = {} }) {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState("tables");
  const [tables, setTables] = useState([]);
  const [requests, setRequests] = useState([]);
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedTable, setExpandedTable] = useState(null);
  const [tableOrders, setTableOrders] = useState({});
  const [loadingOrders, setLoadingOrders] = useState({});

  const userId = user?._id;

  const loadData = useCallback(async () => {
    try {
      const [tablesRes, requestsRes, deliveriesRes] = await Promise.all([
        api.get(`/waiter-management/${userId}/tables`).catch(() => ({ data: { items: [] } })),
        api.get("/waiter/requests?status=pending").catch(() => ({ data: { items: [] } })),
        api.get("/delivery/mine").catch(() => ({ data: [] })),
      ]);

      const normalizeList = (value) => {
        if (Array.isArray(value)) return value;
        if (Array.isArray(value?.items)) return value.items;
        if (Array.isArray(value?.data)) return value.data;
        if (Array.isArray(value?.data?.items)) return value.data.items;
        return [];
      };

      setTables(normalizeList(tablesRes?.data || tablesRes));
      setRequests(normalizeList(requestsRes?.data || requestsRes));
      setDeliveries(normalizeList(deliveriesRes?.data || deliveriesRes));
    } catch {
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    loadData();
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, [loadData, userId]);

  const loadTableOrders = async (tableId) => {
    if (tableOrders[tableId]) return;
    setLoadingOrders((prev) => ({ ...prev, [tableId]: true }));
    try {
      const res = await api.get(`/tables/${tableId}/orders`).catch(() => []);
      const normalizeList = (value) => {
        if (Array.isArray(value)) return value;
        if (Array.isArray(value?.items)) return value.items;
        if (Array.isArray(value?.data)) return value.data;
        if (Array.isArray(value?.data?.items)) return value.data.items;
        return [];
      };
      const orders = normalizeList(res?.data || res);
      setTableOrders((prev) => ({ ...prev, [tableId]: orders }));
    } catch {
    } finally {
      setLoadingOrders((prev) => ({ ...prev, [tableId]: false }));
    }
  };

  const toggleTableExpand = (tableId) => {
    if (expandedTable === tableId) {
      setExpandedTable(null);
    } else {
      setExpandedTable(tableId);
      loadTableOrders(tableId);
    }
  };

  const handleAcknowledge = async (id) => {
    try {
      await api.put(`/waiter/requests/${id}/acknowledge`);
      toast.success("Request acknowledged");
      loadData();
    } catch {
      toast.error("Failed to acknowledge request");
    }
  };

  const handleResolve = async (id) => {
    try {
      await api.put(`/waiter/requests/${id}/resolve`);
      toast.success("Request resolved");
      loadData();
    } catch {
      toast.error("Failed to resolve request");
    }
  };

  const handleDeliveryAction = async (deliveryId, action) => {
    const actions = {
      accept: `/delivery/${deliveryId}/accept`,
      pickup: `/delivery/${deliveryId}/pickup`,
      deliver: `/delivery/${deliveryId}/deliver`,
    };
    const labels = { accept: "accepted", pickup: "picked up", deliver: "delivered" };
    try {
      await api.put(actions[action]);
      toast.success(`Delivery ${labels[action]}`);
      loadData();
    } catch {
      toast.error(`Failed to ${action} delivery`);
    }
  };

  const pendingRequests = requests.filter((r) => r.status === "pending");
  const activeDeliveries = deliveries.filter((d) => d.status !== "delivered" && d.status !== "cancelled");

  if (!userId) {
    return (
      <div className="flex items-center justify-center h-32 text-sm text-[#9C8268]">
        No waiter assigned
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader size={20} className="animate-spin text-[#B07B4F]" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl bg-[#3B2515] text-[#FFF8F0] p-3">
          <p className="text-[10px] uppercase tracking-wider opacity-70">My Tables</p>
          <p className="text-xl font-bold mt-1">{tables.length}</p>
        </div>
        <div className="rounded-xl bg-[#B07B4F] text-[#FFF8F0] p-3">
          <p className="text-[10px] uppercase tracking-wider opacity-70">Pending Requests</p>
          <p className="text-xl font-bold mt-1">{pendingRequests.length}</p>
        </div>
        <div className="rounded-xl bg-[#3B2515] text-[#FFF8F0] p-3">
          <p className="text-[10px] uppercase tracking-wider opacity-70">Deliveries</p>
          <p className="text-xl font-bold mt-1">{activeDeliveries.length}</p>
        </div>
      </div>

      <div className="flex gap-1 bg-[#FFF8F0] rounded-xl p-1 ring-1 ring-[#EDE1CF]">
        {[
          { key: "tables", label: "My Tables", icon: Coffee },
          { key: "requests", label: "Requests", icon: Bell },
          { key: "deliveries", label: "Deliveries", icon: ShoppingBag },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center justify-center gap-1.5 flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
              activeTab === key
                ? "bg-white shadow-sm text-[#3B2515]"
                : "text-[#B07B4F] hover:text-[#3B2515]"
            }`}
          >
            <Icon size={14} />
            {label}
            {(key === "requests" && pendingRequests.length > 0) && ` (${pendingRequests.length})`}
            {(key === "deliveries" && activeDeliveries.length > 0) && ` (${activeDeliveries.length})`}
          </button>
        ))}
      </div>

      {activeTab === "tables" && (
        <div className="space-y-3">
          {tables.length === 0 ? (
            <div className="text-center py-12">
              <Users size={36} className="mx-auto text-[#EDE1CF] mb-3" />
              <p className="text-sm text-[#9C8268]">No tables assigned</p>
            </div>
          ) : (
            tables.map((table) => {
              const tableNum = table.tableNumber || table.number;
              const guestName = table.guestName || table.customerName || table.visit?.customerName || "Guest";
              const guestCount = table.guestCount || table.capacity || 1;
              const status = table.status || "dining";
              const seatedAt = table.seatedAt || table.createdAt || table.visit?.createdAt;
              const orderCount = table.orderCount || table.orders?.length || 0;
              const isExpanded = expandedTable === (table._id || table.id);

              return (
                <div key={table._id || table.id} className="rounded-xl bg-white ring-1 ring-[#EDE1CF] overflow-hidden">
                  <button
                    onClick={() => toggleTableExpand(table._id || table.id)}
                    className="w-full text-left p-4 hover:bg-[#FFF8F0] transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#3B2515] text-[#FFF8F0] flex items-center justify-center text-sm font-bold">
                          {tableNum || "?"}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-[#3B2515]">Table {tableNum || "—"}</p>
                          <p className="text-xs text-[#9C8268]">{guestName}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${STATUS_BADGES[status] || "bg-stone-100 text-stone-600"}`}>
                          {status.replace("_", " ")}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-[10px] text-[#9C8268]">
                      <span className="flex items-center gap-1">
                        <Users size={12} /> {guestCount}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock size={12} /> {timeElapsed(seatedAt)}
                      </span>
                      <span className="flex items-center gap-1">
                        <ShoppingBag size={12} /> {orderCount} orders
                      </span>
                    </div>
                  </button>
                  {isExpanded && (
                    <div className="border-t border-[#EDE1CF] px-4 py-3 bg-[#FFF8F0]">
                      {loadingOrders[table._id || table.id] ? (
                        <div className="flex items-center justify-center py-4">
                          <Loader size={14} className="animate-spin text-[#B07B4F]" />
                        </div>
                      ) : (tableOrders[table._id || table.id]?.length > 0 ? (
                        <div className="space-y-2">
                          {tableOrders[table._id || table.id].map((order) => (
                            <div key={order._id || order.id} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 ring-1 ring-[#EDE1CF]">
                              <div>
                                <p className="text-xs font-medium text-[#3B2515]">Order {(order._id || order.id || "").slice(-8)}</p>
                                <p className="text-[10px] text-[#9C8268]">{order.items?.length || 0} items · {timeElapsed(order.createdAt)}</p>
                              </div>
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                                order.status === "Ready" ? "bg-emerald-100 text-emerald-700" :
                                order.status === "Preparing" ? "bg-orange-100 text-orange-700" :
                                "bg-stone-100 text-stone-600"
                              }`}>
                                {order.status}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-[#9C8268] text-center py-2">No active orders</p>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {activeTab === "requests" && (
        <div className="space-y-2">
          {pendingRequests.length === 0 ? (
            <div className="text-center py-12">
              <Bell size={36} className="mx-auto text-[#EDE1CF] mb-3" />
              <p className="text-sm text-[#9C8268]">No pending requests</p>
            </div>
          ) : (
            pendingRequests.map((req) => (
              <div
                key={req._id}
                className="rounded-xl bg-white ring-1 ring-[#EDE1CF] p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-medium ring-1 shrink-0 ${REQUEST_COLORS[req.type] || "bg-stone-50 text-stone-700 ring-stone-200"}`}>
                      {REQUEST_LABELS[req.type] || req.type?.replace("_", " ") || "Request"}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[#3B2515]">Table {req.tableNumber}</p>
                      {req.message && (
                        <p className="text-xs text-[#9C8268] truncate">{req.message}</p>
                      )}
                      <p className="text-[10px] text-[#9C8268] mt-0.5 flex items-center gap-1">
                        <Clock size={10} /> {timeElapsed(req.createdAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {req.status === "pending" && (
                      <>
                        <button
                          onClick={() => handleAcknowledge(req._id)}
                          className="p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                          title="Acknowledge"
                        >
                          <Bell size={14} />
                        </button>
                        <button
                          onClick={() => handleResolve(req._id)}
                          className="p-2 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors"
                          title="Resolve"
                        >
                          <CheckCircle size={14} />
                        </button>
                      </>
                    )}
                    {req.status === "acknowledged" && (
                      <button
                        onClick={() => handleResolve(req._id)}
                        className="p-2 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors"
                        title="Resolve"
                      >
                        <CheckCircle size={14} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === "deliveries" && (
        <div className="space-y-2">
          {activeDeliveries.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingBag size={36} className="mx-auto text-[#EDE1CF] mb-3" />
              <p className="text-sm text-[#9C8268]">No active deliveries</p>
            </div>
          ) : (
            activeDeliveries.map((del) => {
              const orderId = del.orderId || del.order?._id || del._id;
              const items = del.items || del.order?.items || [];

              return (
                <div
                  key={del._id}
                  className="rounded-xl bg-white ring-1 ring-[#EDE1CF] p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <ShoppingBag size={14} className="text-[#B07B4F]" />
                        <span className="text-sm font-semibold text-[#3B2515]">
                          Order {(orderId || "").slice(-8)}
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                          del.status === "assigned" ? "bg-blue-50 text-blue-700 ring-1 ring-blue-200" :
                          del.status === "accepted" ? "bg-amber-50 text-amber-700 ring-1 ring-amber-200" :
                          del.status === "picked_up" ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200" :
                          "bg-stone-50 text-stone-600 ring-1 ring-stone-200"
                        }`}>
                          {del.status.replace("_", " ")}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-[#9C8268]">
                        <span>Table {del.tableNumber}</span>
                      </div>
                      {items.length > 0 && (
                        <p className="text-[10px] text-[#9C8268] mt-1 truncate">
                          {items.map((i) => i.name || i.productName || i.itemName || "Item").join(", ")}
                        </p>
                      )}
                      <p className="text-[10px] text-[#9C8268] mt-1 flex items-center gap-1">
                        <Clock size={10} /> {timeElapsed(del.readyAt || del.createdAt || del.assignedAt)}
                      </p>
                    </div>
                    <div className="flex flex-col gap-1.5 shrink-0">
                      {del.status === "assigned" && (
                        <button
                          onClick={() => handleDeliveryAction(del._id, "accept")}
                          className="px-3 py-1.5 rounded-lg bg-blue-100 text-blue-700 text-xs font-medium hover:bg-blue-200 transition-colors"
                        >
                          Pick Up
                        </button>
                      )}
                      {del.status === "accepted" && (
                        <button
                          onClick={() => handleDeliveryAction(del._id, "pickup")}
                          className="px-3 py-1.5 rounded-lg bg-amber-100 text-amber-700 text-xs font-medium hover:bg-amber-200 transition-colors"
                        >
                          Pick Up
                        </button>
                      )}
                      {del.status === "picked_up" && (
                        <button
                          onClick={() => handleDeliveryAction(del._id, "deliver")}
                          className="px-3 py-1.5 rounded-lg bg-emerald-100 text-emerald-700 text-xs font-medium hover:bg-emerald-200 transition-colors"
                        >
                          Confirm Delivered
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
