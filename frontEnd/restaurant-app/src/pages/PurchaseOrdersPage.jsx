import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Search, X, DollarSign, Eye, Edit3, CheckCircle, XCircle, Truck, ChevronLeft, ChevronRight, AlertCircle, Hash, Building2 } from "lucide-react";
import { fetchAllPurchaseOrders, fetchPurchaseOrder, createPurchaseOrder, updatePurchaseOrder, deletePurchaseOrder, approvePurchaseOrder, receivePurchaseOrder, cancelPurchaseOrder, updatePaymentStatus, fetchAllSuppliers, fetchInventoryItems } from "../services/data.js";

const STATUS_META = {
  draft: { label: "Draft", dot: "bg-gray-400", bg: "bg-gray-100 border-gray-200", text: "text-gray-600" },
  ordered: { label: "Ordered", dot: "bg-blue-400", bg: "bg-blue-50 border-blue-200", text: "text-blue-700" },
  received: { label: "Received", dot: "bg-green-400", bg: "bg-green-50 border-green-200", text: "text-green-700" },
  cancelled: { label: "Cancelled", dot: "bg-red-400", bg: "bg-red-50 border-red-200", text: "text-red-700" },
};

const PAYMENT_META = {
  pending: { label: "Pending", bg: "bg-amber-50 text-amber-700 ring-1 ring-amber-200" },
  paid: { label: "Paid", bg: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200" },
  overdue: { label: "Overdue", bg: "bg-red-50 text-red-700 ring-1 ring-red-200" },
};

function formatDate(dateStr) {
  if (!dateStr) return "";
  try {
    return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return "";
  }
}

function formatCurrency(val) {
  if (val == null) return "$0.00";
  return `$${Number(val).toFixed(2)}`;
}

const INITIAL_LINE = { itemId: "", itemName: "", quantity: 1, unitPrice: 0 };

export default function PurchaseOrdersPage({ _permissions = { can: () => false } }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notif, setNotif] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const [suppliers, setSuppliers] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);

  const [createModal, setCreateModal] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [editingPo, setEditingPo] = useState(null);
  const [form, setForm] = useState({ supplierId: "", notes: "", lineItems: [{ ...INITIAL_LINE }] });

  const [detailPo, setDetailPo] = useState(null);

  const [receiveModal, setReceiveModal] = useState(false);
  const [receivePo, setReceivePo] = useState(null);
  const [receiveItems, setReceiveItems] = useState([]);

  const [cancelModal, setCancelModal] = useState(false);
  const [cancelPoId, setCancelPoId] = useState(null);
  const [cancelReason, setCancelReason] = useState("");

  const [paymentModal, setPaymentModal] = useState(false);
  const [paymentPoId, setPaymentPoId] = useState(null);

  const showNotif = useCallback((msg, type = "success") => {
    setNotif({ msg, type });
    setTimeout(() => setNotif(null), 3500);
  }, []);

  const loadSuppliers = useCallback(async () => {
    try {
      const data = await fetchAllSuppliers();
      setSuppliers(Array.isArray(data) ? data : []);
    } catch { }
  }, []);

  const loadInventory = useCallback(async () => {
    try {
      const data = await fetchInventoryItems();
      setInventoryItems(Array.isArray(data) ? data : []);
    } catch { }
  }, []);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      const q = searchQuery.trim().toLowerCase();
      if (q) params.search = q;
      if (statusFilter !== "all") params.status = statusFilter;
      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo) params.dateTo = dateTo;
      const data = await fetchAllPurchaseOrders(params);
      setOrders(Array.isArray(data) ? data : []);
    } catch (err) {
      showNotif(err.message, "error");
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, statusFilter, dateFrom, dateTo, showNotif]);

  useEffect(() => {
    loadOrders();
    loadSuppliers();
    loadInventory();
  }, [loadOrders, loadSuppliers, loadInventory]);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, statusFilter, dateFrom, dateTo]);

  const filtered = orders.filter((po) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    const poNum = (po.poNumber || po.id || "").toLowerCase();
    const sup = (po.supplierName || po.supplier?.name || "").toLowerCase();
    return poNum.includes(q) || sup.includes(q);
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

  const stats = {
    total: orders.length,
    pendingApproval: orders.filter((o) => o.status === "draft").length,
    awaitingReceipt: orders.filter((o) => o.status === "ordered").length,
    totalValue: orders.reduce((sum, o) => sum + (o.totalAmount || o.total || 0), 0),
  };

  const openCreate = () => {
    setForm({ supplierId: "", notes: "", lineItems: [{ ...INITIAL_LINE }] });
    setCreateModal(true);
  };

  const openEdit = (po) => {
    setEditingPo(po);
    setForm({
      supplierId: po.supplierId || po.supplier?._id || po.supplier?.id || "",
      notes: po.notes || "",
      lineItems: (po.items || []).length > 0
        ? po.items.map((i) => ({
            itemId: i.itemId || i._id || i.id || "",
            itemName: i.itemName || i.name || "",
            quantity: i.quantity || i.qty || 1,
            unitPrice: i.unitPrice || i.price || 0,
          }))
        : [{ ...INITIAL_LINE }],
    });
    setEditModal(true);
  };

  const handleSave = async () => {
    if (!form.supplierId) { showNotif("Please select a supplier", "error"); return; }
    const validItems = form.lineItems.filter((li) => li.itemId && li.quantity > 0);
    if (validItems.length === 0) { showNotif("Add at least one line item", "error"); return; }
    const payload = {
      supplierId: form.supplierId,
      notes: form.notes,
      items: validItems.map((li) => ({
        itemId: li.itemId,
        quantity: Number(li.quantity),
        unitPrice: Number(li.unitPrice),
      })),
    };
    try {
      if (editingPo) {
        await updatePurchaseOrder(editingPo.id || editingPo._id, payload);
        showNotif("Purchase order updated");
      } else {
        await createPurchaseOrder(payload);
        showNotif("Purchase order created");
      }
      setCreateModal(false);
      setEditModal(false);
      setEditingPo(null);
      loadOrders();
    } catch (err) {
      showNotif(err.message, "error");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this purchase order? This cannot be undone.")) return;
    try {
      await deletePurchaseOrder(id);
      showNotif("Purchase order deleted");
      setDetailPo(null);
      loadOrders();
    } catch (err) {
      showNotif(err.message, "error");
    }
  };

  const handleApprove = async (id) => {
    try {
      await approvePurchaseOrder(id);
      showNotif("Purchase order approved");
      loadOrders();
      if (detailPo && (detailPo.id === id || detailPo._id === id)) {
        const updated = await fetchPurchaseOrder(id);
        setDetailPo(updated || { ...detailPo, status: "ordered" });
      }
    } catch (err) {
      showNotif(err.message, "error");
    }
  };

  const openReceive = async (po) => {
    const fullPo = await fetchPurchaseOrder(po.id || po._id).catch(() => po);
    setReceivePo(fullPo);
    const items = (fullPo.items || []).map((i) => ({
      itemId: i.itemId || i._id || i.id,
      itemName: i.itemName || i.name || "",
      orderedQuantity: i.quantity || i.qty || 0,
      receivedQuantity: i.receivedQuantity ?? i.receivedQty ?? 0,
      unitPrice: i.unitPrice || i.price || 0,
      receiveNow: Math.max(0, (i.quantity || i.qty || 0) - (i.receivedQuantity ?? i.receivedQty ?? 0)),
    }));
    setReceiveItems(items);
    setReceiveModal(true);
  };

  const handleReceive = async () => {
    if (!receivePo) return;
    const id = receivePo.id || receivePo._id;
    const payload = {
      items: receiveItems.map((i) => ({
        itemId: i.itemId,
        receivedQuantity: Number(i.receiveNow) || 0,
      })),
    };
    try {
      await receivePurchaseOrder(id, payload);
      showNotif("Receiving recorded");
      setReceiveModal(false);
      setReceivePo(null);
      loadOrders();
      if (detailPo && (detailPo.id === id || detailPo._id === id)) {
        const updated = await fetchPurchaseOrder(id);
        setDetailPo(updated);
      }
    } catch (err) {
      showNotif(err.message, "error");
    }
  };

  const openCancel = (id) => {
    setCancelPoId(id);
    setCancelReason("");
    setCancelModal(true);
  };

  const handleCancel = async () => {
    if (!cancelPoId) return;
    try {
      await cancelPurchaseOrder(cancelPoId, cancelReason.trim());
      showNotif("Purchase order cancelled");
      setCancelModal(false);
      setCancelPoId(null);
      loadOrders();
      if (detailPo && (detailPo.id === cancelPoId || detailPo._id === cancelPoId)) {
        setDetailPo((prev) => prev ? { ...prev, status: "cancelled", cancelReason: cancelReason.trim() } : null);
      }
    } catch (err) {
      showNotif(err.message, "error");
    }
  };

  const openPayment = (id) => {
    setPaymentPoId(id);
    setPaymentModal(true);
  };

  const handlePaymentStatus = async (status) => {
    if (!paymentPoId) return;
    try {
      await updatePaymentStatus(paymentPoId, status);
      showNotif(`Payment status updated to ${status}`);
      setPaymentModal(false);
      setPaymentPoId(null);
      loadOrders();
    } catch (err) {
      showNotif(err.message, "error");
    }
  };

  const openDetail = async (po) => {
    try {
      const data = await fetchPurchaseOrder(po.id || po._id);
      setDetailPo(data || po);
    } catch {
      setDetailPo(po);
    }
  };

  const addLineItem = () => {
    setForm((f) => ({ ...f, lineItems: [...f.lineItems, { ...INITIAL_LINE }] }));
  };

  const removeLineItem = (idx) => {
    setForm((f) => {
      const items = f.lineItems.filter((_, i) => i !== idx);
      return { ...f, lineItems: items.length === 0 ? [{ ...INITIAL_LINE }] : items };
    });
  };

  const updateLineItem = (idx, field, value) => {
    setForm((f) => {
      const items = [...f.lineItems];
      items[idx] = { ...items[idx], [field]: value };
      if (field === "itemId") {
        const inv = inventoryItems.find((inv) => inv._id === value || inv.id === value);
        if (inv) items[idx].itemName = inv.name || inv.itemName || "";
      }
      return { ...f, lineItems: items };
    });
  };

  const getStatusBadge = (status) => {
    const meta = STATUS_META[status] || STATUS_META.draft;
    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${meta.bg} ${meta.text}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
        {meta.label}
      </span>
    );
  };

  const getPaymentBadge = (status) => {
    const meta = PAYMENT_META[status];
    if (!meta) return <span className="text-xs text-[#9C8268]">—</span>;
    return (
      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-medium ${meta.bg}`}>
        {meta.label}
      </span>
    );
  };

  const timelineEntries = detailPo ? [
    ...(detailPo.status === "draft" || ["ordered", "received", "cancelled"].includes(detailPo.status)
      ? [{ status: "draft", label: "Draft Created", date: detailPo.createdAt || detailPo.orderDate, icon: Edit3 }] : []),
    ...(detailPo.status === "ordered" || detailPo.status === "received"
      ? [{ status: "ordered", label: "Approved & Ordered", date: detailPo.approvedAt || detailPo.orderedAt, icon: CheckCircle }] : []),
    ...(detailPo.status === "received"
      ? [{ status: "received", label: "Received", date: detailPo.receivedAt, icon: Truck }] : []),
    ...(detailPo.status === "cancelled"
      ? [{ status: "cancelled", label: "Cancelled", date: detailPo.cancelledAt, icon: XCircle }] : []),
  ] : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-xl text-[#3B2515] flex items-center gap-2">
            <Hash size={18} /> Purchase Orders
          </h2>
          <p className="text-xs text-[#A9805F] mt-0.5">Manage supplier orders and inventory procurement</p>
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-1.5 rounded-full bg-[#B07B4F] text-white px-4 py-2 text-sm font-medium hover:bg-[#C9925F] transition-colors">
          <Plus size={15} /> Create PO
        </button>
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

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl bg-white ring-1 ring-[#EDE1CF] shadow-sm p-4">
          <p className="text-[10px] uppercase tracking-wide text-[#A9805F] font-medium">Total POs</p>
          <p className="text-2xl font-serif text-[#3B2515] mt-1">{stats.total}</p>
        </div>
        <div className="rounded-2xl bg-white ring-1 ring-[#EDE1CF] shadow-sm p-4">
          <p className="text-[10px] uppercase tracking-wide text-[#A9805F] font-medium">Pending Approval</p>
          <p className="text-2xl font-serif text-[#3B2515] mt-1">{stats.pendingApproval}</p>
        </div>
        <div className="rounded-2xl bg-white ring-1 ring-[#EDE1CF] shadow-sm p-4">
          <p className="text-[10px] uppercase tracking-wide text-[#A9805F] font-medium">Awaiting Receipt</p>
          <p className="text-2xl font-serif text-[#3B2515] mt-1">{stats.awaitingReceipt}</p>
        </div>
        <div className="rounded-2xl bg-white ring-1 ring-[#EDE1CF] shadow-sm p-4">
          <p className="text-[10px] uppercase tracking-wide text-[#A9805F] font-medium">Total Value</p>
          <p className="text-2xl font-serif text-[#3B2515] mt-1">{formatCurrency(stats.totalValue)}</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A9805F]" />
          <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by PO number or supplier..."
            className="w-full rounded-full border border-[#EDE1CF] bg-white pl-9 pr-4 py-2 text-sm text-[#3B2515] outline-none focus:ring-2 focus:ring-[#B07B4F]/40" />
        </div>
        <div className="flex gap-2 flex-wrap">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-full border border-[#EDE1CF] bg-white px-3.5 py-2 text-xs text-[#7B4B2A] outline-none focus:ring-2 focus:ring-[#B07B4F]/40">
            <option value="all">All Status</option>
            <option value="draft">Draft</option>
            <option value="ordered">Ordered</option>
            <option value="received">Received</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
            className="rounded-full border border-[#EDE1CF] bg-white px-3.5 py-2 text-xs text-[#7B4B2A] outline-none focus:ring-2 focus:ring-[#B07B4F]/40" />
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
            className="rounded-full border border-[#EDE1CF] bg-white px-3.5 py-2 text-xs text-[#7B4B2A] outline-none focus:ring-2 focus:ring-[#B07B4F]/40" />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-[#9C8268] text-sm">Loading purchase orders...</div>
      ) : (
        <div className="bg-white rounded-2xl ring-1 ring-[#EDE1CF] shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#EDE1CF] bg-[#FBF6EF]">
                  <th className="text-left px-4 py-3 text-[#A9805F] text-xs uppercase tracking-wide font-medium">PO Number</th>
                  <th className="text-left px-4 py-3 text-[#A9805F] text-xs uppercase tracking-wide font-medium">Supplier</th>
                  <th className="text-left px-4 py-3 text-[#A9805F] text-xs uppercase tracking-wide font-medium">Status</th>
                  <th className="text-left px-4 py-3 text-[#A9805F] text-xs uppercase tracking-wide font-medium">Order Date</th>
                  <th className="text-left px-4 py-3 text-[#A9805F] text-xs uppercase tracking-wide font-medium">Total</th>
                  <th className="text-left px-4 py-3 text-[#A9805F] text-xs uppercase tracking-wide font-medium">Payment</th>
                  <th className="text-left px-4 py-3 text-[#A9805F] text-xs uppercase tracking-wide font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paged.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-12 text-[#9C8268] text-sm">No purchase orders found</td></tr>
                ) : (
                  paged.map((po) => {
                    const poId = po.id || po._id;
                    return (
                      <tr key={poId} className="border-b border-[#EDE1CF]/50 hover:bg-[#FBF6EF]/50 transition-colors">
                        <td className="px-4 py-3">
                          <button onClick={() => openDetail(po)}
                            className="font-medium text-[#B07B4F] hover:underline text-left">
                            {po.poNumber || poId}
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <span className="flex items-center gap-1.5 text-[#3B2515]">
                            <Building2 size={13} className="text-[#9C8268]" />
                            {po.supplierName || po.supplier?.name || "—"}
                          </span>
                        </td>
                        <td className="px-4 py-3">{getStatusBadge(po.status)}</td>
                        <td className="px-4 py-3 text-[#9C8268] text-xs">{formatDate(po.orderDate || po.createdAt)}</td>
                        <td className="px-4 py-3 text-[#3B2515] font-medium">{formatCurrency(po.totalAmount || po.total)}</td>
                        <td className="px-4 py-3">{getPaymentBadge(po.paymentStatus)}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <button onClick={() => openDetail(po)}
                              className="rounded-full p-1.5 text-[#9C8268] hover:bg-[#FBF6EF] hover:text-[#3B2515] transition-colors" title="View details">
                              <Eye size={14} />
                            </button>
                            {po.status === "draft" && (
                              <>
                                <button onClick={() => openEdit(po)}
                                  className="rounded-full p-1.5 text-[#9C8268] hover:bg-[#FBF6EF] hover:text-[#3B2515] transition-colors" title="Edit">
                                  <Edit3 size={14} />
                                </button>
                                <button onClick={() => handleApprove(poId)}
                                  className="rounded-full p-1.5 text-blue-500 hover:bg-blue-50 transition-colors" title="Approve">
                                  <CheckCircle size={14} />
                                </button>
                                <button onClick={() => openCancel(poId)}
                                  className="rounded-full p-1.5 text-red-400 hover:bg-red-50 transition-colors" title="Cancel">
                                  <XCircle size={14} />
                                </button>
                              </>
                            )}
                            {po.status === "ordered" && (
                              <>
                                <button onClick={() => openReceive(po)}
                                  className="rounded-full p-1.5 text-green-500 hover:bg-green-50 transition-colors" title="Receive">
                                  <Truck size={14} />
                                </button>
                                <button onClick={() => openCancel(poId)}
                                  className="rounded-full p-1.5 text-red-400 hover:bg-red-50 transition-colors" title="Cancel">
                                  <XCircle size={14} />
                                </button>
                              </>
                            )}
                            {po.status === "received" && (
                              <button onClick={() => openPayment(poId)}
                                className="rounded-full p-1.5 text-[#B07B4F] hover:bg-[#FBF6EF] transition-colors" title="Update Payment">
                                <DollarSign size={14} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-[#EDE1CF] bg-[#FBF6EF]">
              <span className="text-xs text-[#9C8268]">
                Page {page} of {totalPages} ({filtered.length} total)
              </span>
              <div className="flex items-center gap-2">
                <button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="rounded-full border border-[#EDE1CF] px-3 py-1.5 text-xs text-[#7B4B2A] hover:bg-white disabled:opacity-40 transition-colors">
                  <ChevronLeft size={14} />
                </button>
                <button disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="rounded-full border border-[#EDE1CF] px-3 py-1.5 text-xs text-[#7B4B2A] hover:bg-white disabled:opacity-40 transition-colors">
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <AnimatePresence>
        {(createModal || editModal) && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
            onClick={() => { setCreateModal(false); setEditModal(false); setEditingPo(null); }}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-serif text-lg text-[#3B2515]">
                  {editingPo ? "Edit Purchase Order" : "Create Purchase Order"}
                </h3>
                <button onClick={() => { setCreateModal(false); setEditModal(false); setEditingPo(null); }}
                  className="text-[#9C8268] hover:text-[#3B2515]"><X size={18} /></button>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="text-xs text-[#A9805F] uppercase tracking-wide font-medium mb-1.5 block">
                    Supplier <span className="text-rose-500">*</span>
                  </label>
                  <select value={form.supplierId}
                    onChange={(e) => setForm((f) => ({ ...f, supplierId: e.target.value }))}
                    className="w-full rounded-xl border border-[#EDE1CF] px-3.5 py-2.5 text-sm text-[#3B2515] bg-white focus:outline-none focus:ring-2 focus:ring-[#B07B4F]/40">
                    <option value="">Select a supplier...</option>
                    {suppliers.map((s) => (
                      <option key={s._id || s.id} value={s._id || s.id}>
                        {s.name || s.supplierName || s.company}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs text-[#A9805F] uppercase tracking-wide font-medium">
                      Line Items <span className="text-rose-500">*</span>
                    </label>
                    <button onClick={addLineItem}
                      className="flex items-center gap-1 rounded-full bg-[#B07B4F] text-white px-3 py-1 text-xs font-medium hover:bg-[#C9925F] transition-colors">
                      <Plus size={11} /> Add Item
                    </button>
                  </div>
                  <div className="space-y-3">
                    {form.lineItems.map((li, idx) => (
                      <div key={idx} className="flex items-start gap-2 bg-[#FBF6EF] rounded-xl p-3">
                        <div className="flex-1">
                          <select value={li.itemId}
                            onChange={(e) => updateLineItem(idx, "itemId", e.target.value)}
                            className="w-full rounded-lg border border-[#EDE1CF] px-3 py-2 text-xs text-[#3B2515] bg-white focus:outline-none focus:ring-2 focus:ring-[#B07B4F]/40">
                            <option value="">Select item...</option>
                            {inventoryItems.map((inv) => (
                              <option key={inv._id || inv.id} value={inv._id || inv.id}>
                                {inv.name || inv.itemName}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="w-20">
                          <input type="number" min="1" value={li.quantity}
                            onChange={(e) => updateLineItem(idx, "quantity", e.target.value)}
                            placeholder="Qty"
                            className="w-full rounded-lg border border-[#EDE1CF] px-3 py-2 text-xs text-[#3B2515] bg-white focus:outline-none focus:ring-2 focus:ring-[#B07B4F]/40" />
                        </div>
                        <div className="w-24">
                          <input type="number" min="0" step="0.01" value={li.unitPrice}
                            onChange={(e) => updateLineItem(idx, "unitPrice", e.target.value)}
                            placeholder="Price"
                            className="w-full rounded-lg border border-[#EDE1CF] px-3 py-2 text-xs text-[#3B2515] bg-white focus:outline-none focus:ring-2 focus:ring-[#B07B4F]/40" />
                        </div>
                        <button onClick={() => removeLineItem(idx)}
                          className="rounded-full p-1.5 text-rose-400 hover:bg-rose-50 transition-colors mt-0.5">
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs text-[#A9805F] uppercase tracking-wide font-medium mb-1.5 block">Notes</label>
                  <textarea value={form.notes} rows={3}
                    onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                    placeholder="Additional notes for this purchase order..."
                    className="w-full rounded-xl border border-[#EDE1CF] px-3.5 py-2.5 text-sm text-[#3B2515] bg-white focus:outline-none focus:ring-2 focus:ring-[#B07B4F]/40 resize-none" />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button onClick={() => { setCreateModal(false); setEditModal(false); setEditingPo(null); }}
                    className="rounded-full border border-[#EDE1CF] px-4 py-2 text-sm text-[#7B4B2A] hover:bg-[#FBF6EF] transition-colors">
                    Cancel
                  </button>
                  <button onClick={handleSave}
                    className="rounded-full bg-[#B07B4F] text-white px-4 py-2 text-sm font-medium hover:bg-[#C9925F] transition-colors">
                    {editingPo ? "Save Changes" : "Create PO"}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {detailPo && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
            onClick={() => setDetailPo(null)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white z-10 flex items-center justify-between p-6 pb-4 border-b border-[#EDE1CF]">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-serif text-lg text-[#3B2515]">
                      PO {detailPo.poNumber || detailPo.id || detailPo._id}
                    </h3>
                    {getStatusBadge(detailPo.status)}
                  </div>
                  <p className="text-xs text-[#A9805F] mt-1">
                    <Building2 size={12} className="inline mr-1" />
                    {detailPo.supplierName || detailPo.supplier?.name || "Unknown supplier"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {detailPo.status === "draft" && (
                    <>
                      <button onClick={() => { setDetailPo(null); openEdit(detailPo); }}
                        className="rounded-full bg-[#FBF6EF] p-2 text-[#7B4B2A] hover:bg-[#EDE1CF] transition-colors" title="Edit">
                        <Edit3 size={14} />
                      </button>
                      <button onClick={() => { const id = detailPo.id || detailPo._id; setDetailPo(null); handleApprove(id); }}
                        className="rounded-full bg-blue-50 p-2 text-blue-600 hover:bg-blue-100 transition-colors" title="Approve">
                        <CheckCircle size={14} />
                      </button>
                    </>
                  )}
                  {detailPo.status === "ordered" && (
                    <button onClick={() => { const po = detailPo; setDetailPo(null); openReceive(po); }}
                      className="rounded-full bg-green-50 p-2 text-green-600 hover:bg-green-100 transition-colors" title="Receive">
                      <Truck size={14} />
                    </button>
                  )}
                  {(detailPo.status === "draft" || detailPo.status === "ordered") && (
                    <button onClick={() => { const id = detailPo.id || detailPo._id; setDetailPo(null); openCancel(id); }}
                      className="rounded-full bg-rose-50 p-2 text-rose-500 hover:bg-rose-100 transition-colors" title="Cancel">
                      <XCircle size={14} />
                    </button>
                  )}
                  {detailPo.status === "received" && (
                    <button onClick={() => { const id = detailPo.id || detailPo._id; setDetailPo(null); openPayment(id); }}
                      className="rounded-full bg-amber-50 p-2 text-amber-600 hover:bg-amber-100 transition-colors" title="Payment">
                      <DollarSign size={14} />
                    </button>
                  )}
                  <button onClick={() => handleDelete(detailPo.id || detailPo._id)}
                    className="rounded-full bg-rose-50 p-2 text-rose-500 hover:bg-rose-100 transition-colors" title="Delete">
                    <TrashIcon size={14} />
                  </button>
                  <button onClick={() => setDetailPo(null)} className="text-[#9C8268] hover:text-[#3B2515] p-1">
                    <X size={18} />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-6">
                <div>
                  <h4 className="text-xs text-[#A9805F] uppercase tracking-wide font-medium mb-3">Line Items</h4>
                  <div className="bg-[#FBF6EF] rounded-xl overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-[#EDE1CF]">
                          <th className="text-left px-4 py-2.5 text-[10px] uppercase tracking-wide text-[#A9805F] font-medium">Item</th>
                          <th className="text-center px-4 py-2.5 text-[10px] uppercase tracking-wide text-[#A9805F] font-medium">Ordered</th>
                          <th className="text-center px-4 py-2.5 text-[10px] uppercase tracking-wide text-[#A9805F] font-medium">Received</th>
                          <th className="text-right px-4 py-2.5 text-[10px] uppercase tracking-wide text-[#A9805F] font-medium">Unit Price</th>
                          <th className="text-right px-4 py-2.5 text-[10px] uppercase tracking-wide text-[#A9805F] font-medium">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(detailPo.items || []).map((item, i) => {
                          const qty = item.quantity || item.qty || 0;
                          const recv = item.receivedQuantity ?? item.receivedQty ?? 0;
                          const price = item.unitPrice || item.price || 0;
                          return (
                            <tr key={i} className="border-b border-[#EDE1CF]/50">
                              <td className="px-4 py-3 text-[#3B2515] font-medium">{item.itemName || item.name || "Item"}</td>
                              <td className="px-4 py-3 text-center text-[#3B2515]">{qty}</td>
                              <td className="px-4 py-3 text-center">
                                <span className={recv >= qty ? "text-green-600 font-medium" : "text-amber-600"}>
                                  {recv}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right text-[#9C8268]">{formatCurrency(price)}</td>
                              <td className="px-4 py-3 text-right text-[#3B2515] font-medium">{formatCurrency(price * qty)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="bg-white">
                          <td colSpan={4} className="px-4 py-3 text-right text-xs text-[#A9805F] uppercase tracking-wide font-medium">Total</td>
                          <td className="px-4 py-3 text-right font-serif text-lg text-[#3B2515]">
                            {formatCurrency(detailPo.totalAmount || detailPo.total)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] uppercase tracking-wide text-[#A9805F] font-medium block mb-1">Payment Status</label>
                    <div>{getPaymentBadge(detailPo.paymentStatus)}</div>
                  </div>
                  {detailPo.orderDate && (
                    <div>
                      <label className="text-[10px] uppercase tracking-wide text-[#A9805F] font-medium block mb-1">Order Date</label>
                      <p className="text-sm text-[#3B2515]">{formatDate(detailPo.orderDate)}</p>
                    </div>
                  )}
                  {detailPo.expectedDelivery && (
                    <div>
                      <label className="text-[10px] uppercase tracking-wide text-[#A9805F] font-medium block mb-1">Expected Delivery</label>
                      <p className="text-sm text-[#3B2515]">{formatDate(detailPo.expectedDelivery)}</p>
                    </div>
                  )}
                  {detailPo.cancelReason && detailPo.status === "cancelled" && (
                    <div className="sm:col-span-2">
                      <label className="text-[10px] uppercase tracking-wide text-[#A9805F] font-medium block mb-1">Cancel Reason</label>
                      <p className="text-sm text-rose-600 bg-rose-50 rounded-xl px-4 py-2">{detailPo.cancelReason}</p>
                    </div>
                  )}
                </div>

                {detailPo.notes && (
                  <div>
                    <label className="text-[10px] uppercase tracking-wide text-[#A9805F] font-medium block mb-1">Notes</label>
                    <p className="text-sm text-[#7B4B2A] bg-[#FBF6EF] rounded-xl px-4 py-2 whitespace-pre-wrap">{detailPo.notes}</p>
                  </div>
                )}

                {timelineEntries.length > 0 && (
                  <div>
                    <h4 className="text-xs text-[#A9805F] uppercase tracking-wide font-medium mb-3">Status Timeline</h4>
                    <div className="space-y-0">
                      {timelineEntries.map((entry, i) => (
                        <div key={i} className="flex items-start gap-3">
                          <div className="flex flex-col items-center">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                              entry.status === detailPo.status
                                ? "bg-[#B07B4F] text-white"
                                : "bg-[#EDE1CF] text-[#9C8268]"
                            }`}>
                              <entry.icon size={14} />
                            </div>
                            {i < timelineEntries.length - 1 && <div className="w-0.5 flex-1 bg-[#EDE1CF] my-1" />}
                          </div>
                          <div className="pb-6">
                            <p className={`text-sm font-medium ${
                              entry.status === detailPo.status ? "text-[#3B2515]" : "text-[#9C8268]"
                            }`}>
                              {entry.label}
                            </p>
                            {entry.date && (
                              <p className="text-xs text-[#A9805F] mt-0.5">{formatDate(entry.date)}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {receiveModal && receivePo && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
            onClick={() => { setReceiveModal(false); setReceivePo(null); }}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 max-h-[85vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-serif text-lg text-[#3B2515]">Receive Purchase Order</h3>
                <button onClick={() => { setReceiveModal(false); setReceivePo(null); }}
                  className="text-[#9C8268] hover:text-[#3B2515]"><X size={18} /></button>
              </div>
              <p className="text-xs text-[#A9805F] mb-4">
                PO {receivePo.poNumber || receivePo.id || receivePo._id} &middot; {receivePo.supplierName || receivePo.supplier?.name}
              </p>
              <div className="space-y-4">
                {receiveItems.map((item, idx) => {
                  const maxReceive = item.orderedQuantity - item.receivedQuantity;
                  return (
                    <div key={idx} className="bg-[#FBF6EF] rounded-xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-[#3B2515]">{item.itemName}</span>
                        <span className="text-xs text-[#9C8268]">
                          Ordered: {item.orderedQuantity} | Already received: {item.receivedQuantity}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <label className="text-xs text-[#A9805F]">Receive now:</label>
                        <input type="number" min="0" max={maxReceive} value={item.receiveNow}
                          onChange={(e) => {
                            const val = Math.min(maxReceive, Math.max(0, Number(e.target.value) || 0));
                            setReceiveItems((prev) => {
                              const updated = [...prev];
                              updated[idx] = { ...updated[idx], receiveNow: val };
                              return updated;
                            });
                          }}
                          className="w-24 rounded-lg border border-[#EDE1CF] px-3 py-2 text-sm text-[#3B2515] bg-white focus:outline-none focus:ring-2 focus:ring-[#B07B4F]/40" />
                        <span className="text-xs text-[#9C8268]">max {maxReceive}</span>
                      </div>
                    </div>
                  );
                })}
                <div className="flex justify-end gap-3 pt-2">
                  <button onClick={() => { setReceiveModal(false); setReceivePo(null); }}
                    className="rounded-full border border-[#EDE1CF] px-4 py-2 text-sm text-[#7B4B2A] hover:bg-[#FBF6EF] transition-colors">
                    Cancel
                  </button>
                  <button onClick={handleReceive}
                    className="rounded-full bg-green-600 text-white px-4 py-2 text-sm font-medium hover:bg-green-700 transition-colors">
                    Record Receiving
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {cancelModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
            onClick={() => { setCancelModal(false); setCancelPoId(null); }}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-serif text-lg text-[#3B2515]">Cancel Purchase Order</h3>
                <button onClick={() => { setCancelModal(false); setCancelPoId(null); }}
                  className="text-[#9C8268] hover:text-[#3B2515]"><X size={18} /></button>
              </div>
              <p className="text-sm text-[#9C8268] mb-4">Are you sure you want to cancel this purchase order? This action cannot be undone.</p>
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-[#A9805F] uppercase tracking-wide font-medium mb-1.5 block">Reason for cancellation</label>
                  <textarea value={cancelReason} rows={3}
                    onChange={(e) => setCancelReason(e.target.value)}
                    placeholder="Enter reason..."
                    className="w-full rounded-xl border border-[#EDE1CF] px-3.5 py-2.5 text-sm text-[#3B2515] bg-white focus:outline-none focus:ring-2 focus:ring-[#B07B4F]/40 resize-none" />
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button onClick={() => { setCancelModal(false); setCancelPoId(null); }}
                    className="rounded-full border border-[#EDE1CF] px-4 py-2 text-sm text-[#7B4B2A] hover:bg-[#FBF6EF] transition-colors">
                    Keep
                  </button>
                  <button onClick={handleCancel}
                    className="rounded-full bg-red-600 text-white px-4 py-2 text-sm font-medium hover:bg-red-700 transition-colors">
                    Cancel PO
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {paymentModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
            onClick={() => { setPaymentModal(false); setPaymentPoId(null); }}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-serif text-lg text-[#3B2515]">Update Payment Status</h3>
                <button onClick={() => { setPaymentModal(false); setPaymentPoId(null); }}
                  className="text-[#9C8268] hover:text-[#3B2515]"><X size={18} /></button>
              </div>
              <div className="space-y-3">
                {["pending", "paid", "overdue"].map((status) => (
                  <button key={status} onClick={() => handlePaymentStatus(status)}
                    className="w-full rounded-xl border border-[#EDE1CF] px-4 py-3 text-sm text-[#3B2515] hover:bg-[#FBF6EF] transition-colors text-left flex items-center gap-3">
                    <span className={`w-2.5 h-2.5 rounded-full ${
                      status === "paid" ? "bg-emerald-400" : status === "overdue" ? "bg-red-400" : "bg-amber-400"
                    }`} />
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function TrashIcon({ size }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}
