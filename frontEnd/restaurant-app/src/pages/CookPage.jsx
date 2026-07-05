import { useState, useEffect } from "react";
import StatusBadge from "../components/ui/StatusBadge.jsx";
import { useSettings } from "../context/useSettings.js";
import { VALID_TRANSITIONS } from "../utils/constants.js";
import { AlertTriangle } from "lucide-react";
import { fetchInventoryItems } from "../services/data.js";

const SHORTAGE_STATUS_STYLES = {
  Pending: "bg-amber-100 text-amber-700 ring-1 ring-amber-300",
  Resolved: "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-300",
  Dismissed: "bg-stone-100 text-stone-600 ring-1 ring-stone-300",
};

export default function CookPage({
  orders,
  shortages,
  updateOrderStatus,
  onReportShortage,
  canUpdateOrderStatus = false,
  canReportShortage = false,
}) {
  const settings = useSettings()?.settings;

  const inventorySettings = settings?.inventory || {};
  const ingredientTracking = inventorySettings.ingredientTracking !== false;
  const lowStockAlert = inventorySettings.lowStockAlert !== false;

  const isReportAllowed = canReportShortage && ingredientTracking;
  const showStockWarning = lowStockAlert && shortages?.some(s => s.status === "Pending");

  const [inventoryItems, setInventoryItems] = useState([]);
  const [showReport, setShowReport] = useState(false);
  const [item, setItem] = useState("");
  const [inventoryItemId, setInventoryItemId] = useState("");
  const [quantityNeeded, setQuantityNeeded] = useState(1);
  const [message, setMessage] = useState("Need restock");

  useEffect(() => {
    fetchInventoryItems({ limit: "200" }).then((res) => {
      setInventoryItems(res?.items || []);
    }).catch(() => {});
  }, []);

  const selectedInvItem = inventoryItems.find(
    (i) => i.id === inventoryItemId || i._id === inventoryItemId
  );

  const handleSelectItem = (id) => {
    setInventoryItemId(id);
    const found = inventoryItems.find((i) => i.id === id || i._id === id);
    if (found) setItem(found.name);
  };

  const submitShortage = async () => {
    if (!item.trim()) return;
    await onReportShortage({ item, inventoryItemId: inventoryItemId || undefined, quantityNeeded, message });
    setItem("");
    setInventoryItemId("");
    setQuantityNeeded(1);
    setMessage("Need restock");
    setShowReport(false);
  };

  const kitchenOrders = (orders || []).filter(
    (o) => o.status !== "Cancelled" && o.status !== "Rejected",
  );

  return (
    <div className="space-y-4">
      {showStockWarning && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-medium text-rose-700 flex items-center gap-2.5 animate-pulse" role="alert">
          <AlertTriangle size={16} />
          <span>Warning: Low stock levels detected! Active shortage requests require restocking.</span>
        </div>
      )}

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="font-serif text-2xl text-[#3B2515]">Kitchen Orders</h2>
          <p className="text-sm text-[#9C8268]">
            Everything for the cook, plus stock requests to admin.
          </p>
        </div>
        {isReportAllowed ? (
          <button
            onClick={() => setShowReport((prev) => !prev)}
            className="self-start rounded-full bg-[#3B2515] px-4 py-2 text-sm font-semibold text-[#F3E5D3] transition hover:bg-[#4A2E18]"
          >
            {showReport ? "Cancel" : "Report Shortage"}
          </button>
        ) : (
          <div className="self-start rounded-full border border-[#EDE1CF] bg-[#FBF6EF] px-4 py-2 text-sm font-medium text-[#9C8268]">
            {!ingredientTracking ? "Shortage requests disabled (Tracking Off)" : "Shortage requests restricted"}
          </div>
        )}
      </div>

      {showReport && (
        <div className="rounded-2xl bg-white p-4 ring-1 ring-[#EDE1CF] shadow-sm space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs text-[#9C8268] font-medium block mb-1">Inventory Item</label>
              <select
                value={inventoryItemId}
                onChange={(e) => handleSelectItem(e.target.value)}
                className="w-full rounded-2xl border border-[#EDE1CF] px-4 py-3 text-[#3B2515] outline-none focus:ring-2 focus:ring-[#B07B4F]"
              >
                <option value="">Select an item or type below...</option>
                {inventoryItems.map((i) => (
                  <option key={i.id || i._id} value={i.id || i._id}>
                    {i.name} ({i.currentStock} {i.unit})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-[#9C8268] font-medium block mb-1">Or type item name</label>
              <input
                value={item}
                onChange={(e) => { setItem(e.target.value); setInventoryItemId(""); }}
                placeholder="Item name"
                className="w-full rounded-2xl border border-[#EDE1CF] px-4 py-3 text-[#3B2515] outline-none focus:ring-2 focus:ring-[#B07B4F]"
                aria-label="Shortage item name"
              />
            </div>
          </div>
          {selectedInvItem && (
            <div className="flex items-center gap-3 text-xs text-[#9C8268] bg-[#FBF6EF] rounded-2xl px-4 py-2">
              <span>Current stock: <strong className="text-[#3B2515]">{selectedInvItem.currentStock} {selectedInvItem.unit}</strong></span>
              <span>Min level: <strong className="text-[#3B2515]">{selectedInvItem.minStockLevel}</strong></span>
              {selectedInvItem.supplier && <span>Supplier: <strong className="text-[#3B2515]">{selectedInvItem.supplier}</strong></span>}
            </div>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs text-[#9C8268] font-medium block mb-1">Quantity Needed</label>
              <input
                value={quantityNeeded}
                onChange={(e) => setQuantityNeeded(Number(e.target.value))}
                type="number"
                min={1}
                placeholder="Quantity"
                className="w-full rounded-2xl border border-[#EDE1CF] px-4 py-3 text-[#3B2515] outline-none focus:ring-2 focus:ring-[#B07B4F]"
                aria-label="Quantity needed"
              />
            </div>
            <div>
              <label className="text-xs text-[#9C8268] font-medium block mb-1">Message</label>
              <input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Message for admin"
                className="w-full rounded-2xl border border-[#EDE1CF] px-4 py-3 text-[#3B2515] outline-none focus:ring-2 focus:ring-[#B07B4F]"
                aria-label="Shortage message"
              />
            </div>
          </div>
          <button
            onClick={submitShortage}
            disabled={!item.trim()}
            className="w-full rounded-full bg-[#3B2515] px-4 py-3 text-sm font-semibold text-[#F3E5D3] hover:bg-[#4A2E18] transition disabled:opacity-50"
          >
            Send request to admin
          </button>
        </div>
      )}

      {shortages?.length > 0 && (
        <div className="rounded-2xl bg-white p-4 ring-1 ring-[#EDE1CF] shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-[#3B2515]">Recent shortages</h3>
            <span className="text-xs text-[#A9805F]">
              {shortages.length} request{shortages.length > 1 ? "s" : ""}
            </span>
          </div>
          <div className="space-y-3">
            {shortages.slice(0, 6).map((shortage) => {
              const statusStyle = SHORTAGE_STATUS_STYLES[shortage.status] || SHORTAGE_STATUS_STYLES.Pending;
              return (
                <div
                  key={shortage._id || shortage.id || `${shortage.item}-${shortage.quantityNeeded}`}
                  className="rounded-2xl bg-[#FBF6EF] p-3"
                >
                  <div className="flex items-center justify-between gap-2 text-sm text-[#5B4632]">
                    <span className="font-semibold">{shortage.item}</span>
                    <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium ${statusStyle}`}>{shortage.status}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-[#9C8268]">
                    <span>Qty: {shortage.quantityNeeded}</span>
                    {shortage.message && <span>{shortage.message}</span>}
                  </div>
                  <p className="mt-2 text-[11px] uppercase tracking-[0.18em] text-[#A9805F]">
                    {shortage.createdAt
                      ? new Date(shortage.createdAt).toLocaleString()
                      : ""}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {kitchenOrders.length === 0 ? (
        <div className="rounded-2xl bg-white p-6 text-center text-sm text-[#A9805F]">
          No active orders for the kitchen.
        </div>
      ) : (
        (() => {
          const grouped = {};
          for (const o of kitchenOrders) {
            const key = o.tableNumber || "counter";
            if (!grouped[key]) grouped[key] = [];
            grouped[key].push(o);
          }
          return Object.entries(grouped).map(([tableKey, tableOrders]) => (
            <div key={tableKey} className="space-y-2">
              <div className="flex items-center gap-2 px-1">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#A9805F]">
                  {tableKey === "counter" ? "Takeaway / Counter" : `Table ${tableKey}`}
                </span>
                <span className="text-[10px] text-[#9C8268]">
                  &middot; {tableOrders.length} order{tableOrders.length > 1 ? "s" : ""}
                </span>
              </div>
              <div className="grid grid-cols-1 gap-3">
                {tableOrders.map((o) => (
                  <div
                    key={o.id}
                    className="rounded-2xl bg-white p-4 flex flex-col gap-4 ring-1 ring-[#EDE1CF] shadow-sm"
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-3 text-sm text-[#5B4632]">
                          <span className="font-semibold text-[#3B2515]">{o.id}</span>
                          {o.guestLabel && (
                            <span className="rounded-full bg-[#FBF6EF] px-2 py-0.5 text-[11px] font-medium text-[#7B4B2A] ring-1 ring-[#EDE1CF]">
                              {o.guestLabel}
                            </span>
                          )}
                          <span>{o.customer}</span>
                          <span className="text-[#A9805F]">Code {o.code}</span>
                        </div>
                        <div className="mt-3 space-y-2 text-sm text-[#5B4632]">
                          {Array.isArray(o.itemsDetail) && o.itemsDetail.length > 0 ? (
                            o.itemsDetail.map((it) => (
                              <div key={it.id || it.name} className="flex items-center gap-2">
                                <span className="font-medium">{it.qty}x</span>
                                <span className="truncate">{it.name}</span>
                              </div>
                            ))
                          ) : (
                            <div>{o.items} items</div>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-start gap-3 sm:items-end">
                        <StatusBadge status={o.status} />
                        <div className="flex flex-wrap gap-2">
                          {canUpdateOrderStatus ? (
                            <>
                              {VALID_TRANSITIONS[o.status]?.includes("Preparing") && (
                                <button
                                  onClick={() => updateOrderStatus(o.id, "Preparing")}
                                  className="rounded-full bg-orange-100 px-3 py-1 text-sm text-orange-700"
                                >
                                  Start Preparing
                                </button>
                              )}
                              {VALID_TRANSITIONS[o.status]?.includes("Ready") && (
                                <button
                                  onClick={() => updateOrderStatus(o.id, "Ready")}
                                  className="rounded-full bg-emerald-100 px-3 py-1 text-sm text-emerald-700"
                                >
                                  Mark Ready
                                </button>
                              )}
                              {VALID_TRANSITIONS[o.status]?.includes("Served") && (
                                <button
                                  onClick={() => updateOrderStatus(o.id, "Served")}
                                  className="rounded-full bg-teal-100 px-3 py-1 text-sm text-teal-700"
                                >
                                  Mark Served
                                </button>
                              )}
                            </>
                          ) : (
                            <span className="text-xs text-[#A9805F]">Update locked</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ));
        })()
      )}
    </div>
  );
}
