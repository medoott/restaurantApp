import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Search, X, Users, Phone, Mail, Star, Clock, DollarSign, MapPin, MessageSquare, Heart, Award, Edit3, Trash2, AlertCircle, CheckCircle, ChevronLeft, ChevronRight, ArrowUpDown, User } from "lucide-react";
import { fetchAllCustomers, fetchCustomer, fetchCustomerByPhone, createCustomer, updateCustomer, deleteCustomer, addStaffNote, recordVisit, addFavoriteProduct, removeFavoriteProduct, updateLoyaltyPoints, fetchCustomerAnalytics, fetchTopCustomers, fetchCustomerStats }Silver", "Gold", "Platinum", "VIP"];

const LOYALTY_BADGE = {
  Bronze: "bg-amber-100 text-amber-700 ring-1 ring-amber-300",
  Silver: "bg-stone-100 text-stone-600 ring-1 ring-stone-300",
  Gold: "bg-yellow-100 text-yellow-700 ring-1 ring-yellow-300",
  Platinum: "bg-indigo-100 text-indigo-700 ring-1 ring-indigo-300",
  VIP: "bg-purple-100 text-purple-700 ring-1 ring-purple-300",
};

const INITIAL_FORM = {
  name: "",
  phone: "",
  email: "",
  address: "",
  notes: "",
};

const SECTION_TABS = ["Info", "Visits", "Favorites", "Notes", "Loyalty"];

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

export default function CustomerCRMpage({ _permissions = { can: () => false } }) {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notif, setNotif] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [stats, setStats] = useState({ totalCustomers: 0, newThisMonth: 0, vipCount: 0, avgSpend: 0 });

  const [detailModal, setDetailModal] = useState(null);
  const [detailTab, setDetailTab] = useState("Info");
  const [editModal, setEditModal] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);
  const [editingId, setEditingId] = useState(null);

  const [sortField, setSortField] = useState("name");
  const [sortDir, setSortDir] = useState("asc");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const [visitModal, setVisitModal] = useState(false);
  const [visitForm, setVisitForm] = useState({ date: new Date().toISOString().split("T")[0], totalSpent: "", items: "" });

  const [noteModal, setNoteModal] = useState(false);
  const [noteText, setNoteText] = useState("");

  const [loyaltyModal, setLoyaltyModal] = useState(false);
  const [loyaltyForm, setLoyaltyForm] = useState({ points: "", reason: "" });

  const [favoriteProductId, setFavoriteProductId] = useState("");

  const showNotif = useCallback((msg, type = "success") => {
    setNotif({ msg, type });
    setTimeout(() => setNotif(null), 3500);
  }, []);

  const loadStats = useCallback(async () => {
    try {
      const data = await fetchCustomerStats();
      if (data) {
        setStats({
          totalCustomers: data.totalCustomers ?? data.total ?? 0,
          newThisMonth: data.newThisMonth ?? data.new30Days ?? 0,
          vipCount: data.vipCount ?? data.vip ?? 0,
          avgSpend: data.avgSpend ?? data.averageSpend ?? 0,
        });
      }
    } catch {
      // stats non-critical
    }
  }, []);

  const loadCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      const q = searchQuery.trim().toLowerCase();
      if (q) params.search = q;
      const data = await fetchAllCustomers(params);
      setCustomers(Array.isArray(data) ? data : []);
    } catch (err) {
      showNotif(err.message, "error");
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, showNotif]);

  useEffect(() => {
    loadCustomers();
    loadStats();
  }, [loadCustomers, loadStats]);

  useEffect(() => {
    setPage(1);
  }, [searchQuery]);

  const openCreate = () => {
    setEditingId(null);
    setForm(INITIAL_FORM);
    setEditModal(true);
  };

  const openEdit = (c) => {
    setEditingId(c.id || c._id);
    setForm({
      name: c.name || c.customerName || "",
      phone: c.phone || "",
      email: c.email || "",
      address: c.address || "",
      notes: c.notes || "",
    });
    setEditModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { showNotif("Customer name is required", "error"); return; }
    const payload = {
      name: form.name.trim(),
      customerName: form.name.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      address: form.address.trim(),
      notes: form.notes.trim(),
    };
    try {
      if (editingId) {
        await updateCustomer(editingId, payload);
        showNotif("Customer updated");
      } else {
        await createCustomer(payload);
        showNotif("Customer created");
      }
      setEditModal(false);
      loadCustomers();
      loadStats();
    } catch (err) {
      showNotif(err.message, "error");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this customer? This cannot be undone.")) return;
    try {
      await deleteCustomer(id);
      showNotif("Customer deleted");
      setDetailModal(null);
      loadCustomers();
      loadStats();
    } catch (err) {
      showNotif(err.message, "error");
    }
  };

  const handleRecordVisit = async () => {
    if (!detailModal) return;
    const id = detailModal.id || detailModal._id;
    const payload = {
      date: visitForm.date,
      totalSpent: visitForm.totalSpent ? Number(visitForm.totalSpent) : 0,
      items: visitForm.items ? visitForm.items.split(",").map(s => s.trim()).filter(Boolean) : [],
    };
    try {
      const _result = await recordVisit(id, payload);
      showNotif("Visit recorded");
      setVisitModal(false);
      setVisitForm({ date: new Date().toISOString().split("T")[0], totalSpent: "", items: "" });
      const updated = await fetchCustomer(id);
      setDetailModal(updated || { ...detailModal, totalVisits: (detailModal.totalVisits || 0) + 1, lastVisit: payload.date });
      loadCustomers();
      loadStats();
    } catch (err) {
      showNotif(err.message, "error");
    }
  };

  const handleAddNote = async () => {
    if (!detailModal || !noteText.trim()) return;
    const id = detailModal.id || detailModal._id;
    try {
      const _result = await addStaffNote(id, { note: noteText.trim(), addedBy: "Staff" });
      showNotif("Note added");
      setNoteModal(false);
      setNoteText("");
      const updated = await fetchCustomer(id);
      setDetailModal(updated || detailModal);
    } catch (err) {
      showNotif(err.message, "error");
    }
  };

  const handleAddFavorite = async () => {
    if (!detailModal || !favoriteProductId.trim()) return;
    const id = detailModal.id || detailModal._id;
    try {
      await addFavoriteProduct(id, favoriteProductId.trim());
      showNotif("Favorite product added");
      setFavoriteProductId("");
      const updated = await fetchCustomer(id);
      setDetailModal(updated || detailModal);
    } catch (err) {
      showNotif(err.message, "error");
    }
  };

  const handleRemoveFavorite = async (productId) => {
    if (!detailModal) return;
    const id = detailModal.id || detailModal._id;
    try {
      await removeFavoriteProduct(id, productId);
      showNotif("Favorite product removed");
      const updated = await fetchCustomer(id);
      setDetailModal(updated || detailModal);
    } catch (err) {
      showNotif(err.message, "error");
    }
  };

  const handleUpdateLoyalty = async () => {
    if (!detailModal) return;
    const id = detailModal.id || detailModal._id;
    if (!loyaltyForm.points && !loyaltyForm.reason) { showNotif("Enter points or reason", "error"); return; }
    try {
      const _result = await updateLoyaltyPoints(id, { points: Number(loyaltyForm.points) || 0, reason: loyaltyForm.reason.trim() });
      showNotif("Loyalty points updated");
      setLoyaltyModal(false);
      setLoyaltyForm({ points: "", reason: "" });
      const updated = await fetchCustomer(id);
      setDetailModal(updated || detailModal);
      loadCustomers();
    } catch (err) {
      showNotif(err.message, "error");
    }
  };

  const openDetail = async (c) => {
    try {
      const data = await fetchCustomer(c.id || c._id);
      setDetailModal(data || c);
    } catch {
      setDetailModal(c);
    }
    setDetailTab("Info");
  };

  const toggleSort = (field) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const filtered = customers.filter((c) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    const name = (c.name || c.customerName || "").toLowerCase();
    const phone = (c.phone || "");
    const email = (c.email || "").toLowerCase();
    return name.includes(q) || phone.includes(q) || email.includes(q);
  });

  const sorted = [...filtered].sort((a, b) => {
    let va, vb;
    if (sortField === "name") {
      va = (a.name || a.customerName || "").toLowerCase();
      vb = (b.name || b.customerName || "").toLowerCase();
    } else if (sortField === "totalVisits") {
      va = a.totalVisits || 0;
      vb = b.totalVisits || 0;
    } else if (sortField === "totalSpent") {
      va = a.totalSpent || 0;
      vb = b.totalSpent || 0;
    } else if (sortField === "lastVisit") {
      va = a.lastVisit || "";
      vb = b.lastVisit || "";
    } else if (sortField === "loyaltyTier") {
      const tierOrder = { Bronze: 1, Silver: 2, Gold: 3, Platinum: 4, VIP: 5 };
      va = tierOrder[a.loyaltyTier] || 0;
      vb = tierOrder[b.loyaltyTier] || 0;
    } else {
      va = a[sortField] || "";
      vb = b[sortField] || "";
    }
    if (va < vb) return sortDir === "asc" ? -1 : 1;
    if (va > vb) return sortDir === "asc" ? 1 : -1;
    return 0;
  });

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const paged = sorted.slice((page - 1) * pageSize, page * pageSize);

  const detailC = detailModal;
  const detailId = detailC ? (detailC.id || detailC._id) : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-xl text-[#3B2515] flex items-center gap-2">
            <Users size={18} /> Customer CRM
          </h2>
          <p className="text-xs text-[#A9805F] mt-0.5">Manage customer relationships and loyalty</p>
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-1.5 rounded-full bg-[#B07B4F] text-white px-4 py-2 text-sm font-medium hover:bg-[#C9925F] transition-colors">
          <Plus size={15} /> Add Customer
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
          <p className="text-[10px] uppercase tracking-wide text-[#A9805F] font-medium">Total Customers</p>
          <p className="text-2xl font-serif text-[#3B2515] mt-1">{stats.totalCustomers}</p>
        </div>
        <div className="rounded-2xl bg-white ring-1 ring-[#EDE1CF] shadow-sm p-4">
          <p className="text-[10px] uppercase tracking-wide text-[#A9805F] font-medium">New This Month</p>
          <p className="text-2xl font-serif text-[#3B2515] mt-1">{stats.newThisMonth}</p>
        </div>
        <div className="rounded-2xl bg-white ring-1 ring-[#EDE1CF] shadow-sm p-4">
          <p className="text-[10px] uppercase tracking-wide text-[#A9805F] font-medium">VIP Count</p>
          <p className="text-2xl font-serif text-[#3B2515] mt-1">{stats.vipCount}</p>
        </div>
        <div className="rounded-2xl bg-white ring-1 ring-[#EDE1CF] shadow-sm p-4">
          <p className="text-[10px] uppercase tracking-wide text-[#A9805F] font-medium">Avg Spend</p>
          <p className="text-2xl font-serif text-[#3B2515] mt-1">{formatCurrency(stats.avgSpend)}</p>
        </div>
      </div>

      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A9805F]" />
        <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by name, phone, or email..."
          className="w-full rounded-full border border-[#EDE1CF] bg-white pl-9 pr-4 py-2 text-sm text-[#3B2515] outline-none focus:ring-2 focus:ring-[#B07B4F]/40"
        />
      </div>

      {loading ? (
        <div className="text-center py-12 text-[#9C8268] text-sm">Loading customers...</div>
      ) : (
        <div className="bg-white rounded-2xl ring-1 ring-[#EDE1CF] shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#EDE1CF] bg-[#FBF6EF]">
                  <th className="text-left px-4 py-3 text-[#A9805F] text-xs uppercase tracking-wide font-medium cursor-pointer select-none" onClick={() => toggleSort("name")}>
                    <span className="flex items-center gap-1">Name <ArrowUpDown size={11} /></span>
                  </th>
                  <th className="text-left px-4 py-3 text-[#A9805F] text-xs uppercase tracking-wide font-medium">Phone</th>
                  <th className="text-left px-4 py-3 text-[#A9805F] text-xs uppercase tracking-wide font-medium">Email</th>
                  <th className="text-left px-4 py-3 text-[#A9805F] text-xs uppercase tracking-wide font-medium cursor-pointer select-none" onClick={() => toggleSort("loyaltyTier")}>
                    <span className="flex items-center gap-1">Tier <ArrowUpDown size={11} /></span>
                  </th>
                  <th className="text-left px-4 py-3 text-[#A9805F] text-xs uppercase tracking-wide font-medium cursor-pointer select-none" onClick={() => toggleSort("totalVisits")}>
                    <span className="flex items-center gap-1">Visits <ArrowUpDown size={11} /></span>
                  </th>
                  <th className="text-left px-4 py-3 text-[#A9805F] text-xs uppercase tracking-wide font-medium cursor-pointer select-none" onClick={() => toggleSort("totalSpent")}>
                    <span className="flex items-center gap-1">Spent <ArrowUpDown size={11} /></span>
                  </th>
                  <th className="text-left px-4 py-3 text-[#A9805F] text-xs uppercase tracking-wide font-medium cursor-pointer select-none" onClick={() => toggleSort("lastVisit")}>
                    <span className="flex items-center gap-1">Last Visit <ArrowUpDown size={11} /></span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {paged.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-12 text-[#9C8268] text-sm">No customers found</td></tr>
                ) : (
                  paged.map((c) => (
                    <tr key={c.id || c._id} className="border-b border-[#EDE1CF]/50 hover:bg-[#FBF6EF]/50 transition-colors cursor-pointer"
                      onClick={() => openDetail(c)}>
                      <td className="px-4 py-3">
                        <span className="font-medium text-[#3B2515]">{c.name || c.customerName || "—"}</span>
                      </td>
                      <td className="px-4 py-3 text-[#9C8268]">{c.phone || "—"}</td>
                      <td className="px-4 py-3 text-[#9C8268]">{c.email || "—"}</td>
                      <td className="px-4 py-3">
                        {c.loyaltyTier ? (
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-medium ${LOYALTY_BADGE[c.loyaltyTier] || "bg-gray-100 text-gray-600"}`}>
                            {c.loyaltyTier}
                          </span>
                        ) : "—"}
                      </td>
                      <td className="px-4 py-3 text-[#3B2515]">{c.totalVisits ?? "—"}</td>
                      <td className="px-4 py-3 text-[#3B2515]">{formatCurrency(c.totalSpent)}</td>
                      <td className="px-4 py-3 text-[#9C8268] text-xs">{formatDate(c.lastVisit) || "—"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-[#EDE1CF] bg-[#FBF6EF]">
              <span className="text-xs text-[#9C8268]">
                Page {page} of {totalPages} ({sorted.length} total)
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
        {detailModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
            onClick={() => setDetailModal(null)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white z-10 flex items-center justify-between p-6 pb-4 border-b border-[#EDE1CF]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#B07B4F]/10 flex items-center justify-center">
                    <User size={18} className="text-[#B07B4F]" />
                  </div>
                  <div>
                    <h3 className="font-serif text-lg text-[#3B2515]">{detailC.name || detailC.customerName || "Customer"}</h3>
                    {detailC.loyaltyTier && (
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${LOYALTY_BADGE[detailC.loyaltyTier]}`}>
                        {detailC.loyaltyTier}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => openEdit(detailC)}
                    className="rounded-full bg-[#FBF6EF] p-2 text-[#7B4B2A] hover:bg-[#EDE1CF] transition-colors">
                    <Edit3 size={14} />
                  </button>
                  <button onClick={() => handleDelete(detailId)}
                    className="rounded-full bg-rose-50 p-2 text-rose-500 hover:bg-rose-100 transition-colors">
                    <Trash2 size={14} />
                  </button>
                  <button onClick={() => setDetailModal(null)} className="text-[#9C8268] hover:text-[#3B2515] p-1">
                    <X size={18} />
                  </button>
                </div>
              </div>

              <div className="flex border-b border-[#EDE1CF] bg-[#FBF6EF] px-6 overflow-x-auto">
                {SECTION_TABS.map((tab) => (
                  <button key={tab} onClick={() => setDetailTab(tab)}
                    className={`px-4 py-2.5 text-xs font-medium transition-colors whitespace-nowrap ${
                      detailTab === tab
                        ? "text-[#B07B4F] border-b-2 border-[#B07B4F]"
                        : "text-[#9C8268] hover:text-[#3B2515]"
                    }`}>
                    {tab}
                  </button>
                ))}
              </div>

              <div className="p-6 space-y-5">
                {detailTab === "Info" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] uppercase tracking-wide text-[#A9805F] font-medium flex items-center gap-1"><User size={11} /> Name</label>
                      <p className="text-sm text-[#3B2515] font-medium mt-0.5">{detailC.name || detailC.customerName || "—"}</p>
                    </div>
                    <div>
                      <label className="text-[10px] uppercase tracking-wide text-[#A9805F] font-medium flex items-center gap-1"><Phone size={11} /> Phone</label>
                      <p className="text-sm text-[#3B2515] mt-0.5">{detailC.phone || "—"}</p>
                    </div>
                    <div>
                      <label className="text-[10px] uppercase tracking-wide text-[#A9805F] font-medium flex items-center gap-1"><Mail size={11} /> Email</label>
                      <p className="text-sm text-[#3B2515] mt-0.5">{detailC.email || "—"}</p>
                    </div>
                    <div>
                      <label className="text-[10px] uppercase tracking-wide text-[#A9805F] font-medium flex items-center gap-1"><MapPin size={11} /> Address</label>
                      <p className="text-sm text-[#3B2515] mt-0.5">{detailC.address || "—"}</p>
                    </div>
                    <div>
                      <label className="text-[10px] uppercase tracking-wide text-[#A9805F] font-medium flex items-center gap-1"><Award size={11} /> Loyalty Points</label>
                      <p className="text-sm text-[#3B2515] mt-0.5">{detailC.loyaltyPoints ?? 0}</p>
                    </div>
                    <div>
                      <label className="text-[10px] uppercase tracking-wide text-[#A9805F] font-medium flex items-center gap-1"><Star size={11} /> Tier</label>
                      <p className="text-sm text-[#3B2515] mt-0.5">{detailC.loyaltyTier || "Bronze"}</p>
                    </div>
                    <div>
                      <label className="text-[10px] uppercase tracking-wide text-[#A9805F] font-medium flex items-center gap-1"><Users size={11} /> Total Visits</label>
                      <p className="text-sm text-[#3B2515] mt-0.5">{detailC.totalVisits ?? 0}</p>
                    </div>
                    <div>
                      <label className="text-[10px] uppercase tracking-wide text-[#A9805F] font-medium flex items-center gap-1"><DollarSign size={11} /> Total Spent</label>
                      <p className="text-sm text-[#3B2515] mt-0.5">{formatCurrency(detailC.totalSpent)}</p>
                    </div>
                    <div>
                      <label className="text-[10px] uppercase tracking-wide text-[#A9805F] font-medium flex items-center gap-1"><Clock size={11} /> Last Visit</label>
                      <p className="text-sm text-[#3B2515] mt-0.5">{formatDate(detailC.lastVisit) || "Never"}</p>
                    </div>
                    <div>
                      <label className="text-[10px] uppercase tracking-wide text-[#A9805F] font-medium flex items-center gap-1"><Clock size={11} /> Customer Since</label>
                      <p className="text-sm text-[#3B2515] mt-0.5">{formatDate(detailC.createdAt) || "—"}</p>
                    </div>
                    {detailC.notes && (
                      <div className="sm:col-span-2">
                        <label className="text-[10px] uppercase tracking-wide text-[#A9805F] font-medium flex items-center gap-1"><MessageSquare size={11} /> Notes</label>
                        <p className="text-sm text-[#3B2515] mt-0.5 whitespace-pre-wrap">{detailC.notes}</p>
                      </div>
                    )}
                  </div>
                )}

                {detailTab === "Visits" && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <p className="text-xs text-[#A9805F] uppercase tracking-wide font-medium">Visit History</p>
                      <button onClick={() => { setVisitForm({ date: new Date().toISOString().split("T")[0], totalSpent: "", items: "" }); setVisitModal(true); }}
                        className="flex items-center gap-1 rounded-full bg-[#B07B4F] text-white px-3 py-1.5 text-xs font-medium hover:bg-[#C9925F] transition-colors">
                        <Plus size={12} /> Record Visit
                      </button>
                    </div>
                    {detailC.visits && detailC.visits.length > 0 ? (
                      <div className="space-y-2">
                        {detailC.visits.map((v, i) => (
                          <div key={i} className="flex items-center justify-between bg-[#FBF6EF] rounded-xl px-4 py-3">
                            <div>
                              <p className="text-sm text-[#3B2515] font-medium">{formatDate(v.date)}</p>
                              {v.items && v.items.length > 0 && (
                                <p className="text-xs text-[#9C8268] mt-0.5">{v.items.join(", ")}</p>
                              )}
                            </div>
                            <span className="text-sm font-medium text-[#3B2515]">{formatCurrency(v.totalSpent)}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-[#9C8268] text-sm">No visits recorded yet</div>
                    )}
                  </div>
                )}

                {detailTab === "Favorites" && (
                  <div className="space-y-4">
                    <div className="flex gap-2">
                      <input value={favoriteProductId} onChange={(e) => setFavoriteProductId(e.target.value)}
                        placeholder="Enter product ID..."
                        className="flex-1 rounded-xl border border-[#EDE1CF] px-3.5 py-2 text-sm text-[#3B2515] bg-white focus:outline-none focus:ring-2 focus:ring-[#B07B4F]/40"
                      />
                      <button onClick={handleAddFavorite}
                        className="rounded-full bg-[#B07B4F] text-white px-4 py-2 text-sm font-medium hover:bg-[#C9925F] transition-colors">
                        Add
                      </button>
                    </div>
                    {detailC.favoriteProducts && detailC.favoriteProducts.length > 0 ? (
                      <div className="space-y-2">
                        {detailC.favoriteProducts.map((fp, i) => {
                          const fpId = typeof fp === "string" ? fp : (fp._id || fp.id || "");
                          const fpName = typeof fp === "string" ? fp : (fp.name || fp.productName || fpId);
                          return (
                            <div key={i} className="flex items-center justify-between bg-[#FBF6EF] rounded-xl px-4 py-3">
                              <div className="flex items-center gap-2">
                                <Heart size={14} className="text-rose-400" />
                                <span className="text-sm text-[#3B2515]">{fpName}</span>
                              </div>
                              <button onClick={() => handleRemoveFavorite(fpId)}
                                className="text-rose-400 hover:text-rose-600 transition-colors">
                                <X size={14} />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-[#9C8268] text-sm">No favorite products yet</div>
                    )}
                  </div>
                )}

                {detailTab === "Notes" && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <p className="text-xs text-[#A9805F] uppercase tracking-wide font-medium">Staff Notes</p>
                      <button onClick={() => { setNoteText(""); setNoteModal(true); }}
                        className="flex items-center gap-1 rounded-full bg-[#B07B4F] text-white px-3 py-1.5 text-xs font-medium hover:bg-[#C9925F] transition-colors">
                        <Plus size={12} /> Add Note
                      </button>
                    </div>
                    {detailC.staffNotes && detailC.staffNotes.length > 0 ? (
                      <div className="space-y-2">
                        {detailC.staffNotes.map((n, i) => (
                          <div key={i} className="bg-[#FBF6EF] rounded-xl px-4 py-3">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-medium text-[#B07B4F]">{n.addedBy || "Staff"}</span>
                              <span className="text-[10px] text-[#9C8268]">{formatDate(n.createdAt || n.date)}</span>
                            </div>
                            <p className="text-sm text-[#3B2515] whitespace-pre-wrap">{n.note || n.text || n.message}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-[#9C8268] text-sm">No staff notes yet</div>
                    )}
                  </div>
                )}

                {detailTab === "Loyalty" && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-[#FBF6EF] rounded-xl p-4 text-center">
                        <p className="text-[10px] uppercase tracking-wide text-[#A9805F] font-medium">Loyalty Points</p>
                        <p className="text-3xl font-serif text-[#3B2515] mt-1">{detailC.loyaltyPoints ?? 0}</p>
                      </div>
                      <div className="bg-[#FBF6EF] rounded-xl p-4 text-center">
                        <p className="text-[10px] uppercase tracking-wide text-[#A9805F] font-medium">Tier</p>
                        <p className="text-3xl font-serif text-[#3B2515] mt-1">{detailC.loyaltyTier || "Bronze"}</p>
                      </div>
                    </div>
                    <button onClick={() => { setLoyaltyForm({ points: "", reason: "" }); setLoyaltyModal(true); }}
                      className="w-full rounded-full bg-[#B07B4F] text-white px-4 py-2.5 text-sm font-medium hover:bg-[#C9925F] transition-colors">
                      Adjust Loyalty Points
                    </button>
                    {detailC.loyaltyHistory && detailC.loyaltyHistory.length > 0 && (
                      <div className="space-y-2 mt-4">
                        <p className="text-xs text-[#A9805F] uppercase tracking-wide font-medium">Points History</p>
                        {detailC.loyaltyHistory.map((lh, i) => (
                          <div key={i} className="flex items-center justify-between bg-[#FBF6EF] rounded-xl px-4 py-3">
                            <div>
                              <p className="text-sm text-[#3B2515] font-medium">{lh.reason || "Adjustment"}</p>
                              <p className="text-xs text-[#9C8268]">{formatDate(lh.date || lh.createdAt)}</p>
                            </div>
                            <span className={`text-sm font-medium ${(lh.points || 0) >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                              {(lh.points || 0) >= 0 ? "+" : ""}{lh.points}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {editModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
            onClick={() => setEditModal(false)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 max-h-[85vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-serif text-lg text-[#3B2515]">
                  {editingId ? "Edit Customer" : "Create Customer"}
                </h3>
                <button onClick={() => setEditModal(false)} className="text-[#9C8268] hover:text-[#3B2515]"><X size={18} /></button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs text-[#A9805F] uppercase tracking-wide font-medium mb-1.5 block">
                    Name <span className="text-rose-500">*</span>
                  </label>
                  <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="Full name"
                    className="w-full rounded-xl border border-[#EDE1CF] px-3.5 py-2.5 text-sm text-[#3B2515] bg-white focus:outline-none focus:ring-2 focus:ring-[#B07B4F]/40" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-[#A9805F] uppercase tracking-wide font-medium mb-1.5 block">Phone</label>
                    <input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                      placeholder="+1 (555) 000-0000"
                      className="w-full rounded-xl border border-[#EDE1CF] px-3.5 py-2.5 text-sm text-[#3B2515] bg-white focus:outline-none focus:ring-2 focus:ring-[#B07B4F]/40" />
                  </div>
                  <div>
                    <label className="text-xs text-[#A9805F] uppercase tracking-wide font-medium mb-1.5 block">Email</label>
                    <input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                      placeholder="customer@example.com"
                      className="w-full rounded-xl border border-[#EDE1CF] px-3.5 py-2.5 text-sm text-[#3B2515] bg-white focus:outline-none focus:ring-2 focus:ring-[#B07B4F]/40" />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-[#A9805F] uppercase tracking-wide font-medium mb-1.5 block">Address</label>
                  <input value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                    placeholder="Street, city, zip"
                    className="w-full rounded-xl border border-[#EDE1CF] px-3.5 py-2.5 text-sm text-[#3B2515] bg-white focus:outline-none focus:ring-2 focus:ring-[#B07B4F]/40" />
                </div>

                <div>
                  <label className="text-xs text-[#A9805F] uppercase tracking-wide font-medium mb-1.5 block">Notes</label>
                  <textarea value={form.notes} rows={2} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                    placeholder="Internal notes about this customer"
                    className="w-full rounded-xl border border-[#EDE1CF] px-3.5 py-2.5 text-sm text-[#3B2515] bg-white focus:outline-none focus:ring-2 focus:ring-[#B07B4F]/40 resize-none" />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button onClick={() => setEditModal(false)}
                    className="rounded-full border border-[#EDE1CF] px-4 py-2 text-sm text-[#7B4B2A] hover:bg-[#FBF6EF] transition-colors">
                    Cancel
                  </button>
                  <button onClick={handleSave}
                    className="rounded-full bg-[#B07B4F] text-white px-4 py-2 text-sm font-medium hover:bg-[#C9925F] transition-colors">
                    {editingId ? "Save Changes" : "Create Customer"}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {visitModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
            onClick={() => setVisitModal(false)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-serif text-lg text-[#3B2515]">Record Visit</h3>
                <button onClick={() => setVisitModal(false)} className="text-[#9C8268] hover:text-[#3B2515]"><X size={18} /></button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-[#A9805F] uppercase tracking-wide font-medium mb-1.5 block">Date</label>
                  <input type="date" value={visitForm.date} onChange={(e) => setVisitForm((f) => ({ ...f, date: e.target.value }))}
                    className="w-full rounded-xl border border-[#EDE1CF] px-3.5 py-2.5 text-sm text-[#3B2515] bg-white focus:outline-none focus:ring-2 focus:ring-[#B07B4F]/40" />
                </div>
                <div>
                  <label className="text-xs text-[#A9805F] uppercase tracking-wide font-medium mb-1.5 block">Total Spent ($)</label>
                  <input type="number" min="0" step="0.01" value={visitForm.totalSpent} onChange={(e) => setVisitForm((f) => ({ ...f, totalSpent: e.target.value }))}
                    placeholder="0.00"
                    className="w-full rounded-xl border border-[#EDE1CF] px-3.5 py-2.5 text-sm text-[#3B2515] bg-white focus:outline-none focus:ring-2 focus:ring-[#B07B4F]/40" />
                </div>
                <div>
                  <label className="text-xs text-[#A9805F] uppercase tracking-wide font-medium mb-1.5 block">Items Ordered</label>
                  <input value={visitForm.items} onChange={(e) => setVisitForm((f) => ({ ...f, items: e.target.value }))}
                    placeholder="Comma-separated item names"
                    className="w-full rounded-xl border border-[#EDE1CF] px-3.5 py-2.5 text-sm text-[#3B2515] bg-white focus:outline-none focus:ring-2 focus:ring-[#B07B4F]/40" />
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button onClick={() => setVisitModal(false)}
                    className="rounded-full border border-[#EDE1CF] px-4 py-2 text-sm text-[#7B4B2A] hover:bg-[#FBF6EF] transition-colors">Cancel</button>
                  <button onClick={handleRecordVisit}
                    className="rounded-full bg-[#B07B4F] text-white px-4 py-2 text-sm font-medium hover:bg-[#C9925F] transition-colors">Record</button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {noteModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
            onClick={() => setNoteModal(false)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-serif text-lg text-[#3B2515]">Add Staff Note</h3>
                <button onClick={() => setNoteModal(false)} className="text-[#9C8268] hover:text-[#3B2515]"><X size={18} /></button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-[#A9805F] uppercase tracking-wide font-medium mb-1.5 block">Note</label>
                  <textarea value={noteText} rows={4} onChange={(e) => setNoteText(e.target.value)}
                    placeholder="Write a note about this customer..."
                    className="w-full rounded-xl border border-[#EDE1CF] px-3.5 py-2.5 text-sm text-[#3B2515] bg-white focus:outline-none focus:ring-2 focus:ring-[#B07B4F]/40 resize-none" />
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button onClick={() => setNoteModal(false)}
                    className="rounded-full border border-[#EDE1CF] px-4 py-2 text-sm text-[#7B4B2A] hover:bg-[#FBF6EF] transition-colors">Cancel</button>
                  <button onClick={handleAddNote}
                    className="rounded-full bg-[#B07B4F] text-white px-4 py-2 text-sm font-medium hover:bg-[#C9925F] transition-colors">Add Note</button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {loyaltyModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
            onClick={() => setLoyaltyModal(false)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-serif text-lg text-[#3B2515]">Adjust Loyalty Points</h3>
                <button onClick={() => setLoyaltyModal(false)} className="text-[#9C8268] hover:text-[#3B2515]"><X size={18} /></button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-[#A9805F] uppercase tracking-wide font-medium mb-1.5 block">Points (use negative to deduct)</label>
                  <input type="number" value={loyaltyForm.points} onChange={(e) => setLoyaltyForm((f) => ({ ...f, points: e.target.value }))}
                    placeholder="0"
                    className="w-full rounded-xl border border-[#EDE1CF] px-3.5 py-2.5 text-sm text-[#3B2515] bg-white focus:outline-none focus:ring-2 focus:ring-[#B07B4F]/40" />
                </div>
                <div>
                  <label className="text-xs text-[#A9805F] uppercase tracking-wide font-medium mb-1.5 block">Reason</label>
                  <input value={loyaltyForm.reason} onChange={(e) => setLoyaltyForm((f) => ({ ...f, reason: e.target.value }))}
                    placeholder="e.g. Bonus, correction, promo"
                    className="w-full rounded-xl border border-[#EDE1CF] px-3.5 py-2.5 text-sm text-[#3B2515] bg-white focus:outline-none focus:ring-2 focus:ring-[#B07B4F]/40" />
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button onClick={() => setLoyaltyModal(false)}
                    className="rounded-full border border-[#EDE1CF] px-4 py-2 text-sm text-[#7B4B2A] hover:bg-[#FBF6EF] transition-colors">Cancel</button>
                  <button onClick={handleUpdateLoyalty}
                    className="rounded-full bg-[#B07B4F] text-white px-4 py-2 text-sm font-medium hover:bg-[#C9925F] transition-colors">Update Points</button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
