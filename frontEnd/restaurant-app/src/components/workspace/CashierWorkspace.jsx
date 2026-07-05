import { useState, useEffect, useCallback } from "react";
import { Receipt, DollarSign, CheckCircle, Loader, Clock, CreditCard, Banknote, Smartphone, X } from "lucide-react";
import { api } from "../../services/api.js";

const PAYMENT_ICONS = { Cash: Banknote, Card: CreditCard, Online: Smartphone };

function formatTime(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ${mins % 60}m ago`;
}

export default function CashierWorkspace({ user, access = {} }) {
  const [tab, setTab] = useState("pending");
  const [pendingBills, setPendingBills] = useState([]);
  const [payments, setPayments] = useState([]);
  const [cleaningCount, setCleaningCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedVisit, setSelectedVisit] = useState(null);
  const [bill, setBill] = useState(null);
  const [billLoading, setBillLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [amountReceived, setAmountReceived] = useState("");
  const [toasts, setToasts] = useState([]);

  const notify = useCallback((message, type = "info") => {
    const id = Date.now() + Math.random();
    setToasts((p) => [...p, { id, message, type }]);
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 4000);
  }, []);

  const loadPending = useCallback(async () => {
    try {
      const data = await api.get("/visits/active?status=bill_requested");
      setPendingBills(Array.isArray(data) ? data : data?.visits || []);
    } catch {
      setPendingBills([]);
    }
  }, []);

  const loadPayments = useCallback(async () => {
    try {
      const data = await api.get("/visits/history?limit=20");
      const list = Array.isArray(data) ? data : data?.visits || [];
      setPayments(list.filter((v) => v.status === "closed" || v.payment));
    } catch {
      setPayments([]);
    }
  }, []);

  const loadCleaningCount = useCallback(async () => {
    try {
      const data = await api.get("/visits/active?status=cleaning");
      const list = Array.isArray(data) ? data : data?.visits || [];
      setCleaningCount(list.length);
    } catch {
      setCleaningCount(0);
    }
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([loadPending(), loadPayments(), loadCleaningCount()]);
    setLoading(false);
  }, [loadPending, loadPayments, loadCleaningCount]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const loadBill = useCallback(async (visitId) => {
    setBillLoading(true);
    setBill(null);
    try {
      const data = await api.get(`/bills/visit/${visitId}`);
      setBill(data);
    } catch (err) {
      notify(err.message || "Failed to load bill", "error");
    } finally {
      setBillLoading(false);
    }
  }, [notify]);

  const openBillDetail = async (visit) => {
    setSelectedVisit(visit);
    setPaymentMethod("Cash");
    setAmountReceived("");
    await loadBill(visit._id || visit.id);
  };

  const closeBillDetail = () => {
    setSelectedVisit(null);
    setBill(null);
    setPaymentMethod("Cash");
    setAmountReceived("");
    setProcessing(false);
  };

  const handleProcessPayment = async () => {
    const visitId = selectedVisit._id || selectedVisit.id;
    const amount = parseFloat(amountReceived);
    if (!amount || amount < 0) {
      notify("Enter a valid amount received", "error");
      return;
    }
    if (bill && amount < bill.total) {
      notify("Amount received is less than total", "error");
      return;
    }
    setProcessing(true);
    try {
      const session = await api.post(`/bills/visit/${visitId}/payment-session`, { paymentMethod });
      const sessionId = session._id || session.session?._id || session.sessionId;
      await api.put(`/bills/payment-session/${sessionId}/process`, { amountPaid: amount, paymentMethod });
      await api.put(`/visits/${visitId}/close`);
      notify("Payment processed successfully", "success");
      closeBillDetail();
      await loadAll();
    } catch (err) {
      notify(err.message || "Payment failed", "error");
    } finally {
      setProcessing(false);
    }
  };

  const todayTotal = payments.reduce((sum, v) => {
    const p = v.payment || {};
    return sum + parseFloat(p.amount || p.total || v.total || 0);
  }, 0);

  const changeDue = bill && amountReceived
    ? Math.max(0, parseFloat(amountReceived || 0) - bill.total)
    : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader size={22} className="animate-spin text-[#B07B4F]" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {toasts.length > 0 && (
        <div className="fixed bottom-4 right-4 z-[100] flex flex-col-reverse gap-2 max-w-sm">
          {toasts.map((t) => (
            <div
              key={t.id}
              className={`flex items-start gap-2.5 px-4 py-3 rounded-lg shadow-lg border border-[#EDE1CF] border-l-4 animate-slide-up ${
                t.type === "success"
                  ? "border-l-emerald-500 bg-emerald-50"
                  : t.type === "error"
                  ? "border-l-rose-500 bg-rose-50"
                  : "border-l-sky-500 bg-sky-50"
              }`}
            >
              <p className="text-xs text-[#3B2515] flex-1 min-w-0">{t.message}</p>
              <button
                onClick={() => setToasts((p) => p.filter((x) => x.id !== t.id))}
                className="p-0.5 rounded hover:bg-black/5 text-[#9C8268] shrink-0"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl bg-[#FFF8F0] ring-1 ring-[#EDE1CF] p-4 text-center">
          <p className="text-2xl font-bold text-[#3B2515]">{pendingBills.length}</p>
          <p className="text-[10px] uppercase tracking-wider text-[#B07B4F] font-medium mt-1">Pending Bills</p>
        </div>
        <div className="rounded-xl bg-[#FFF8F0] ring-1 ring-[#EDE1CF] p-4 text-center">
          <p className="text-2xl font-bold text-[#3B2515]">${todayTotal.toFixed(2)}</p>
          <p className="text-[10px] uppercase tracking-wider text-[#B07B4F] font-medium mt-1">Today's Payments</p>
        </div>
        <div className="rounded-xl bg-[#FFF8F0] ring-1 ring-[#EDE1CF] p-4 text-center">
          <p className="text-2xl font-bold text-[#3B2515]">{cleaningCount}</p>
          <p className="text-[10px] uppercase tracking-wider text-[#B07B4F] font-medium mt-1">Need Cleaning</p>
        </div>
      </div>

      <div className="flex gap-1 bg-[#FBF6EF] rounded-xl p-1 ring-1 ring-[#EDE1CF]">
        {["pending", "payments"].map((key) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
              tab === key
                ? "bg-white shadow-sm text-[#3B2515]"
                : "text-[#B07B4F] hover:text-[#7B4B2A]"
            }`}
          >
            {key === "pending" ? "Pending Bills" : "Today's Payments"}
          </button>
        ))}
      </div>

      {tab === "pending" && (
        <div className="space-y-2">
          {pendingBills.length === 0 ? (
            <div className="text-center py-10 text-sm text-[#B07B4F]">No pending bill requests</div>
          ) : (
            pendingBills.map((visit) => {
              const vid = visit._id || visit.id;
              return (
                <button
                  key={vid}
                  onClick={() => openBillDetail(visit)}
                  className="w-full text-left rounded-xl bg-white ring-1 ring-[#EDE1CF] p-4 hover:ring-[#B07B4F] transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-[#FFF8F0] ring-1 ring-[#EDE1CF] flex items-center justify-center text-[#3B2515] font-bold text-sm">
                        {visit.tableNumber || visit.table?.number || "?"}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-[#3B2515]">
                          {visit.guestName || visit.customerName || visit.customer?.name || `Table ${visit.tableNumber}`}
                        </p>
                        <p className="text-[10px] text-[#B07B4F] mt-0.5">
                          Total: ${(visit.total || visit.billTotal || 0).toFixed(2)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] text-[#B07B4F]">
                      <Clock size={12} />
                      <span>{formatTime(visit.billRequestedAt || visit.updatedAt || visit.createdAt)}</span>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      )}

      {tab === "payments" && (
        <div className="space-y-2">
          {payments.length === 0 ? (
            <div className="text-center py-10 text-sm text-[#B07B4F]">No payments today</div>
          ) : (
            payments.map((visit) => {
              const p = visit.payment || {};
              return (
                <div
                  key={visit._id || visit.id}
                  className="rounded-xl bg-white ring-1 ring-[#EDE1CF] p-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-emerald-50 ring-1 ring-emerald-200 flex items-center justify-center">
                        <CheckCircle size={18} className="text-emerald-600" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-[#3B2515]">
                          Table {visit.tableNumber || visit.table?.number || "?"}
                        </p>
                        <div className="flex items-center gap-2 text-[10px] text-[#B07B4F] mt-0.5">
                          <span>{p.paymentMethod || "—"}</span>
                          <span>•</span>
                          <span>{new Date(visit.closedAt || visit.updatedAt || visit.createdAt).toLocaleTimeString()}</span>
                        </div>
                      </div>
                    </div>
                    <p className="text-sm font-bold text-[#3B2515]">
                      ${(p.amount || p.total || visit.total || 0).toFixed(2)}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {selectedVisit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-[#EDE1CF] px-5 py-3 flex items-center justify-between">
              <h2 className="font-serif text-lg text-[#3B2515]">Bill Detail</h2>
              <button onClick={closeBillDetail} className="p-1 hover:bg-[#FBF6EF] rounded-lg">
                <X size={18} className="text-[#B07B4F]" />
              </button>
            </div>

            {billLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader size={22} className="animate-spin text-[#B07B4F]" />
              </div>
            ) : bill ? (
              <div className="p-5 space-y-5">
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-[#B07B4F] uppercase tracking-wider font-medium">
                    <span>Item</span>
                    <span>Amount</span>
                  </div>
                  {(bill.items || []).length === 0 ? (
                    <p className="text-sm text-[#B07B4F] text-center py-4">No items</p>
                  ) : (
                    (bill.items || []).map((item, i) => (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <span className="text-[#3B2515] truncate">
                            {item.name || item.menuItemName || item.itemName || item.item?.name || `Item ${i + 1}`}
                          </span>
                          {item.quantity > 1 && (
                            <span className="text-[10px] text-[#B07B4F] shrink-0">x{item.quantity}</span>
                          )}
                        </div>
                        <span className="text-[#3B2515] font-medium shrink-0 ml-4">
                          ${((item.price || item.unitPrice || 0) * (item.quantity || 1)).toFixed(2)}
                        </span>
                      </div>
                    ))
                  )}
                </div>

                <div className="border-t border-[#EDE1CF] pt-3 space-y-1.5 text-sm">
                  <div className="flex justify-between text-[#B07B4F]">
                    <span>Subtotal</span>
                    <span>${(bill.subtotal || 0).toFixed(2)}</span>
                  </div>
                  {(bill.tax || 0) > 0 && (
                    <div className="flex justify-between text-[#B07B4F]">
                      <span>Tax</span>
                      <span>${(bill.tax || 0).toFixed(2)}</span>
                    </div>
                  )}
                  {(bill.serviceCharge || 0) > 0 && (
                    <div className="flex justify-between text-[#B07B4F]">
                      <span>Service Charge</span>
                      <span>${(bill.serviceCharge || 0).toFixed(2)}</span>
                    </div>
                  )}
                  {(bill.discount || 0) > 0 && (
                    <div className="flex justify-between text-emerald-600">
                      <span>Discount</span>
                      <span>-${(bill.discount || 0).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="border-t border-[#EDE1CF] pt-1.5 flex justify-between text-base font-bold text-[#3B2515]">
                    <span>Total</span>
                    <span>${(bill.total || 0).toFixed(2)}</span>
                  </div>
                </div>

                <div className="border-t border-[#EDE1CF] pt-4 space-y-4">
                  <div>
                    <label className="text-xs text-[#B07B4F] uppercase tracking-wide font-medium mb-2 block">
                      Payment Method
                    </label>
                    <div className="flex gap-2">
                      {["Cash", "Card", "Online"].map((m) => {
                        const Icon = PAYMENT_ICONS[m];
                        return (
                          <button
                            key={m}
                            onClick={() => setPaymentMethod(m)}
                            className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-medium transition-colors ${
                              paymentMethod === m
                                ? "bg-[#3B2515] text-[#FFF8F0]"
                                : "bg-[#FBF6EF] text-[#7B4B2A] ring-1 ring-[#EDE1CF] hover:bg-[#EDE1CF]"
                            }`}
                          >
                            <Icon size={14} />
                            {m}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-[#B07B4F] uppercase tracking-wide font-medium mb-2 block">
                      Amount Received
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#B07B4F] text-sm">$</span>
                      <input
                        type="number"
                        value={amountReceived}
                        onChange={(e) => setAmountReceived(e.target.value)}
                        className="w-full rounded-xl border border-[#EDE1CF] pl-7 pr-3.5 py-2.5 text-sm text-[#3B2515] bg-white focus:outline-none focus:ring-2 focus:ring-[#B07B4F]/30"
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                      />
                    </div>
                  </div>

                  {parseFloat(amountReceived || 0) >= bill.total && (
                    <div className="rounded-xl bg-blue-50 border border-blue-200 px-4 py-3 flex items-center justify-between">
                      <span className="text-sm text-blue-700 font-medium">Change Due</span>
                      <span className="text-lg font-bold text-blue-700">${changeDue.toFixed(2)}</span>
                    </div>
                  )}

                  {parseFloat(amountReceived || 0) > 0 && parseFloat(amountReceived) < bill.total && (
                    <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-2.5 text-xs text-amber-700 text-center">
                      Amount received (${parseFloat(amountReceived).toFixed(2)}) is less than total (${bill.total.toFixed(2)})
                    </div>
                  )}

                  <button
                    onClick={handleProcessPayment}
                    disabled={processing}
                    className="w-full rounded-xl bg-emerald-600 text-white py-3 text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                  >
                    {processing ? (
                      <>
                        <Loader size={16} className="animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <DollarSign size={16} />
                        Confirm Payment — ${(bill.total || 0).toFixed(2)}
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-sm text-[#B07B4F]">Failed to load bill</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
