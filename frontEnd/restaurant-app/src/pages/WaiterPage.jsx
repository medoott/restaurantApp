import { useState, useEffect } from "react";
import { Bell, Check, Clock, MapPin, Package, AlertTriangle, User } from "lucide-react";

export default function WaiterPage({ apiRequest, userId }) {
  const [activeTab, setActiveTab] = useState("requests");
  const [requests, setRequests] = useState([]);
  const [deliveries, setDeliveries] = useState([]);
  const [pendingCounts, setPendingCounts] = useState({});
  const [tables, setTables] = useState([]);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const [requestsRes, deliveriesRes, countsRes] = await Promise.all([
        apiRequest("/waiter/requests?status=pending", { method: "GET" }),
        apiRequest("/delivery/mine", { method: "GET" }),
        apiRequest("/waiter/pending-counts", { method: "GET" }),
      ]);
      setRequests(requestsRes?.data?.items || requestsRes?.items || []);
      setDeliveries(deliveriesRes?.data || deliveriesRes || []);
      setPendingCounts(countsRes?.data || countsRes || {});
    } catch { }
  };

  const handleAcknowledge = async (requestId) => {
    try {
      await apiRequest(`/waiter/requests/${requestId}/acknowledge`, { method: "PUT" });
      loadData();
    } catch { }
  };

  const handleResolve = async (requestId) => {
    try {
      await apiRequest(`/waiter/requests/${requestId}/resolve`, { method: "PUT" });
      loadData();
    } catch { }
  };

  const handleDeliveryAction = async (deliveryId, action) => {
    try {
      const actions = {
        accept: `/delivery/${deliveryId}/accept`,
        pickup: `/delivery/${deliveryId}/pickup`,
        deliver: `/delivery/${deliveryId}/deliver`,
      };
      await apiRequest(actions[action], { method: "PUT" });
      loadData();
    } catch { }
  };

  const requestTypeLabels = {
    call_waiter: "Waiter Call",
    request_bill: "Bill Request",
    need_water: "Water",
    need_cutlery: "Cutlery",
    need_napkins: "Napkins",
    need_sauce: "Sauce",
    need_assistance: "Assistance",
    request_water_refill: "Water Refill",
    order_issue: "Order Issue",
    complaint: "Complaint",
    request_manager: "Manager Request",
  };

  const requestTypeColors = {
    call_waiter: "bg-blue-50 text-blue-700 ring-blue-200",
    request_bill: "bg-amber-50 text-amber-700 ring-amber-200",
    need_water: "bg-sky-50 text-sky-700 ring-sky-200",
    need_cutlery: "bg-stone-50 text-stone-700 ring-stone-200",
    need_napkins: "bg-stone-50 text-stone-700 ring-stone-200",
    need_sauce: "bg-orange-50 text-orange-700 ring-orange-200",
    need_assistance: "bg-rose-50 text-rose-700 ring-rose-200",
    complaint: "bg-red-50 text-red-700 ring-red-200",
  };

  const pendingRequests = requests.filter((r) => r.status === "pending");
  const activeDeliveries = deliveries.filter((d) => d.status !== "delivered" && d.status !== "cancelled");

  return (
    <div className="min-h-screen bg-[#FBF6EF] pb-20">
      <div className="sticky top-0 z-30 bg-[#FBF6EF]/90 backdrop-blur-md border-b border-[#EDE1CF] px-4 sm:px-8 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <User className="text-[#B07B4F]" size={24} />
            <h1 className="font-serif text-xl text-[#3B2515]">Waiter Panel</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm">
              <div className={`w-2.5 h-2.5 rounded-full ${pendingRequests.length > 0 ? "bg-red-500 animate-pulse" : "bg-emerald-500"}`} />
              <span className="text-[#A9805F]">{pendingRequests.length} pending</span>
            </div>
            <div className="flex rounded-xl bg-[#EDE1CF] p-1 gap-1">
              {["requests", "deliveries"].map((tab) => (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${activeTab === tab ? "bg-white text-[#3B2515] shadow-sm" : "text-[#A9805F] hover:text-[#3B2515]"}`}>
                  {tab === "requests" ? "Requests" : "Deliveries"}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-6">
        {activeTab === "requests" && (
          <>
            {pendingRequests.length === 0 ? (
              <div className="text-center py-16">
                <Bell size={40} className="mx-auto text-[#EDE1CF] mb-4" />
                <p className="text-[#A9805F] text-sm">No pending requests</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingRequests.map((req) => (
                  <div key={req._id}
                    className="bg-white rounded-2xl ring-1 ring-[#EDE1CF] p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`px-3 py-1.5 rounded-xl text-xs font-medium ring-1 ${requestTypeColors[req.type] || "bg-stone-50 text-stone-700 ring-stone-200"}`}>
                        {requestTypeLabels[req.type] || req.type}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-[#3B2515]">Table {req.tableNumber}</p>
                        {req.message && <p className="text-xs text-[#A9805F]">{req.message}</p>}
                        <p className="text-[10px] text-[#A9805F] mt-0.5">
                          {new Date(req.createdAt).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleAcknowledge(req._id)}
                        className="p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors" title="Acknowledge">
                        <Bell size={14} />
                      </button>
                      <button onClick={() => handleResolve(req._id)}
                        className="p-2 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors" title="Resolve">
                        <Check size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === "deliveries" && (
          <>
            {activeDeliveries.length === 0 ? (
              <div className="text-center py-16">
                <Package size={40} className="mx-auto text-[#EDE1CF] mb-4" />
                <p className="text-[#A9805F] text-sm">No active deliveries</p>
              </div>
            ) : (
              <div className="space-y-3">
                {activeDeliveries.map((del) => (
                  <div key={del._id}
                    className="bg-white rounded-2xl ring-1 ring-[#EDE1CF] p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <MapPin size={20} className="text-[#B07B4F]" />
                      <div>
                        <p className="text-sm font-semibold text-[#3B2515]">Order {del.orderId?.slice(-8)}</p>
                        <p className="text-xs text-[#A9805F]">Table {del.tableNumber}</p>
                        <p className="text-[10px] text-[#A9805F]">
                          Status: {del.status.replace(/_/g, " ")}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {del.status === "assigned" && (
                        <button onClick={() => handleDeliveryAction(del._id, "accept")}
                          className="px-3 py-1.5 rounded-xl bg-blue-100 text-blue-700 text-xs font-medium hover:bg-blue-200 transition-colors">
                          Accept
                        </button>
                      )}
                      {del.status === "accepted" && (
                        <button onClick={() => handleDeliveryAction(del._id, "pickup")}
                          className="px-3 py-1.5 rounded-xl bg-amber-100 text-amber-700 text-xs font-medium hover:bg-amber-200 transition-colors">
                          Pick Up
                        </button>
                      )}
                      {del.status === "picked_up" && (
                        <button onClick={() => handleDeliveryAction(del._id, "deliver")}
                          className="px-3 py-1.5 rounded-xl bg-emerald-100 text-emerald-700 text-xs font-medium hover:bg-emerald-200 transition-colors">
                          Delivered
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
