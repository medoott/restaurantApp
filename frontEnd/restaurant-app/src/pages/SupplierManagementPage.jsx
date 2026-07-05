import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Search, X, Building2, Phone, Mail, Star, DollarSign,
  MapPin, Tag, CreditCard, FileText, BarChart3, RefreshCw,
  Loader2, AlertCircle, CheckCircle, ChevronRight, Trash2,
  Edit3, TrendingUp, ShieldCheck, Wallet, Package, ChevronDown,
  User
} from "lucide-react";
import {
  fetchAllSuppliers, fetchSupplier, createSupplier, updateSupplier,
  deleteSupplier, fetchSupplierPerformance, fetchSupplierAnalytics,
  fetchOutstandingBalances
} from "../services/data.js";

const CATEGORIES = ["Produce", "Dairy", "Meat", "Beverages", "Dry Goods"];

const CATEGORY_COLORS = {
  Produce: "bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200",
  Dairy: "bg-sky-50 text-sky-600 ring-1 ring-sky-200",
  Meat: "bg-rose-50 text-rose-600 ring-1 ring-rose-200",
  Beverages: "bg-indigo-50 text-indigo-600 ring-1 ring-indigo-200",
  "Dry Goods": "bg-amber-50 text-amber-600 ring-1 ring-amber-200",
};

const INITIAL_FORM = {
  companyName: "",
  contactPerson: "",
  phone: "",
  email: "",
  address: "",
  category: "",
  paymentTerms: "",
  taxId: "",
  notes: "",
};

const ANALYTICS_VIEWS = [
  { key: "topVolume", label: "Top by Volume", icon: TrendingUp },
  { key: "topReliability", label: "Top by Reliability", icon: ShieldCheck },
  { key: "outstandingBalances", label: "Outstanding Balances", icon: Wallet },
];

const DETAIL_TABS = ["Info", "Purchase History", "Performance"];

function formatCurrency(val) {
  if (val == null) return "$0.00";
  const num = Number(val);
  if (isNaN(num)) return "$0.00";
  return `$${num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function RatingStars({ rating = 0, size = 14 }) {
  const r = Math.round(rating);
  return (
    <span className="inline-flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} size={size} className={i < r ? "fill-amber-400 text-amber-400" : "text-[#EDE1CF]"} />
      ))}
      <span className="ml-1 text-xs text-[#9C8268]">{rating ? Number(rating).toFixed(1) : "—"}</span>
    </span>
  );
}

export default function SupplierManagementPage({ permissions = { can: () => false } }) {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [ratingFilter, setRatingFilter] = useState("");
  const [notif, setNotif] = useState(null);

  const [selectedId, setSelectedId] = useState(null);
  const [detailTab, setDetailTab] = useState("Info");
  const [detailLoading, setDetailLoading] = useState(false);
  const [supplierDetail, setSupplierDetail] = useState(null);
  const [supplierPerformance, setSupplierPerformance] = useState(null);

  const [editModal, setEditModal] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);

  const [deleteModal, setDeleteModal] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const [showAnalytics, setShowAnalytics] = useState(false);
  const [analyticsView, setAnalyticsView] = useState("topVolume");
  const [analyticsData, setAnalyticsData] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  const showNotif = useCallback((msg, type = "success") => {
    setNotif({ msg, type });
    setTimeout(() => setNotif(null), 3500);
  }, []);

  const loadSuppliers = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      const q = searchQuery.trim().toLowerCase();
      if (q) params.search = q;
      if (categoryFilter) params.category = categoryFilter;
      const data = await fetchAllSuppliers(params);
      setSuppliers(Array.isArray(data) ? data : []);
    } catch (err) {
      showNotif(err.message, "error");
      setSuppliers([]);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, categoryFilter, showNotif]);

  useEffect(() => {
    loadSuppliers();
  }, [loadSuppliers]);

  const handleToggleAnalytics = useCallback(async () => {
    if (showAnalytics) {
      setShowAnalytics(false);
      return;
    }
    setAnalyticsLoading(true);
    setShowAnalytics(true);
    try {
      const [analytics, balances] = await Promise.all([
        fetchSupplierAnalytics(),
        fetchOutstandingBalances(),
      ]);
      setAnalyticsData({ analytics, balances });
    } catch (err) {
      showNotif(err.message, "error");
      setShowAnalytics(false);
    } finally {
      setAnalyticsLoading(false);
    }
  }, [showAnalytics, showNotif]);

  const openCreate = () => {
    setEditingId(null);
    setForm(INITIAL_FORM);
    setEditModal(true);
  };

  const openEdit = (supplier) => {
    setEditingId(supplier.id || supplier._id);
    setForm({
      companyName: supplier.companyName || "",
      contactPerson: supplier.contactPerson || "",
      phone: supplier.phone || "",
      email: supplier.email || "",
      address: supplier.address || "",
      category: supplier.category || "",
      paymentTerms: supplier.paymentTerms || "",
      taxId: supplier.taxId || "",
      notes: supplier.notes || "",
    });
    setEditModal(true);
  };

  const handleSave = async () => {
    if (!form.companyName.trim()) { showNotif("Company name is required", "error"); return; }
    setSaving(true);
    try {
      if (editingId) {
        await updateSupplier(editingId, form);
        showNotif("Supplier updated");
      } else {
        await createSupplier(form);
        showNotif("Supplier created");
      }
      setEditModal(false);
      loadSuppliers();
    } catch (err) {
      showNotif(err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const openDeleteConfirm = (id) => {
    setDeleteTargetId(id);
    setDeleteModal(true);
  };

  const handleDelete = async () => {
    if (!deleteTargetId) return;
    setDeleting(true);
    try {
      await deleteSupplier(deleteTargetId);
      showNotif("Supplier deleted");
      setDeleteModal(false);
      setDeleteTargetId(null);
      if (selectedId === deleteTargetId) {
        setSelectedId(null);
        setSupplierDetail(null);
      }
      loadSuppliers();
    } catch (err) {
      showNotif(err.message, "error");
    } finally {
      setDeleting(false);
    }
  };

  const handleSelectSupplier = useCallback(async (id) => {
    if (selectedId === id) {
      setSelectedId(null);
      setSupplierDetail(null);
      setSupplierPerformance(null);
      return;
    }
    setSelectedId(id);
    setDetailTab("Info");
    setDetailLoading(true);
    setSupplierDetail(null);
    setSupplierPerformance(null);
    try {
      const detail = await fetchSupplier(id);
      setSupplierDetail(detail);
    } catch (err) {
      showNotif(err.message, "error");
    } finally {
      setDetailLoading(false);
    }
  }, [selectedId, showNotif]);

  const handleLoadPerformance = useCallback(async () => {
    if (!selectedId || supplierPerformance) return;
    try {
      const perf = await fetchSupplierPerformance(selectedId);
      setSupplierPerformance(perf);
    } catch (err) {
      showNotif(err.message, "error");
    }
  }, [selectedId, supplierPerformance, showNotif]);

  useEffect(() => {
    if (detailTab === "Performance" && selectedId && !supplierPerformance) {
      handleLoadPerformance();
    }
  }, [detailTab, selectedId, supplierPerformance, handleLoadPerformance]);

  const filtered = suppliers.filter((s) => {
    if (ratingFilter) {
      const r = Number(s.rating) || 0;
      const [min, max] = ratingFilter.split("-").map(Number);
      if (max) { if (r < min || r > max) return false; }
      else { if (r < min) return false; }
    }
    return true;
  });

  const stats = {
    total: suppliers.length,
    outstandingBalance: suppliers.reduce((sum, s) => sum + (Number(s.outstandingBalance) || 0), 0),
    avgRating: suppliers.length ? (suppliers.reduce((sum, s) => sum + (Number(s.rating) || 0), 0) / suppliers.length) : 0,
  };

  const detailS = supplierDetail;
  const detailId = selectedId;

  const analyticsContent = (() => {
    if (!analyticsData) return null;
    const { analytics, balances } = analyticsData;
    if (analyticsView === "outstandingBalances") {
      const items = Array.isArray(balances) ? balances : (balances?.items || balances?.data || []);
      return items.length > 0 ? items : (Array.isArray(analytics?.outstandingBalances) ? analytics.outstandingBalances : null);
    }
    if (analyticsView === "topVolume") {
      return analytics?.topByVolume || analytics?.topVolume || null;
    }
    if (analyticsView === "topReliability") {
      return analytics?.topByReliability || analytics?.topReliability || null;
    }
    return null;
  })();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-xl text-[#3B2515] flex items-center gap-2">
            <Building2 size={18} /> Supplier Management
          </h2>
          <p className="text-xs text-[#A9805F] mt-0.5">Manage suppliers, purchases, and performance</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button onClick={loadSuppliers}
            className="flex items-center gap-1.5 rounded-full border border-[#EDE1CF] text-[#7B4B2A] px-4 py-2 text-sm hover:bg-[#FBF6EF] transition-colors">
            <RefreshCw size={15} /> Refresh
          </button>
          <button onClick={handleToggleAnalytics}
            className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              showAnalytics
                ? "bg-[#3B2515] text-[#F3E5D3]"
                : "border border-[#EDE1CF] text-[#7B4B2A] hover:bg-[#FBF6EF]"
            }`}>
            <BarChart3 size={15} /> Analytics
          </button>
          {permissions.can("suppliers.create") && (
            <button onClick={openCreate}
              className="flex items-center gap-1.5 rounded-full bg-[#B07B4F] text-white px-4 py-2 text-sm font-medium hover:bg-[#C9925F] transition-colors">
              <Plus size={15} /> Add Supplier
            </button>
          )}
        </div>
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

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl bg-white ring-1 ring-[#EDE1CF] shadow-sm shadow-[#3B2515]/5 p-4">
          <p className="text-[10px] uppercase tracking-wide text-[#A9805F] font-medium">Total Suppliers</p>
          <p className="text-2xl font-serif text-[#3B2515] mt-1">{stats.total}</p>
        </div>
        <div className="rounded-2xl bg-white ring-1 ring-[#EDE1CF] shadow-sm shadow-[#3B2515]/5 p-4">
          <p className="text-[10px] uppercase tracking-wide text-[#A9805F] font-medium">Outstanding Balance</p>
          <p className="text-2xl font-serif text-[#3B2515] mt-1">{formatCurrency(stats.outstandingBalance)}</p>
        </div>
        <div className="rounded-2xl bg-white ring-1 ring-[#EDE1CF] shadow-sm shadow-[#3B2515]/5 p-4">
          <p className="text-[10px] uppercase tracking-wide text-[#A9805F] font-medium">Avg Rating</p>
          <p className="text-2xl font-serif text-[#3B2515] mt-1 flex items-center gap-1.5">
            {stats.avgRating ? Number(stats.avgRating).toFixed(1) : "—"}
            <Star size={14} className="fill-amber-400 text-amber-400" />
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A9805F]" />
          <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by company name, contact, or email..."
            className="w-full rounded-full border border-[#EDE1CF] bg-white pl-9 pr-4 py-2 text-sm text-[#3B2515] outline-none focus:ring-2 focus:ring-[#B07B4F]/40"
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-full border border-[#EDE1CF] bg-white px-3.5 py-2 text-sm text-[#3B2515] outline-none focus:ring-2 focus:ring-[#B07B4F]/40 appearance-none cursor-pointer">
            <option value="">All Categories</option>
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          <select value={ratingFilter} onChange={(e) => setRatingFilter(e.target.value)}
            className="rounded-full border border-[#EDE1CF] bg-white px-3.5 py-2 text-sm text-[#3B2515] outline-none focus:ring-2 focus:ring-[#B07B4F]/40 appearance-none cursor-pointer">
            <option value="">All Ratings</option>
            <option value="4-5">4 - 5 Stars</option>
            <option value="3-5">3 - 5 Stars</option>
            <option value="0-2">0 - 2 Stars</option>
          </select>
        </div>
      </div>

      {showAnalytics && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
          className="rounded-2xl bg-white ring-1 ring-[#EDE1CF] shadow-sm shadow-[#3B2515]/5 p-5 overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-serif text-base text-[#3B2515] flex items-center gap-2">
              <BarChart3 size={16} /> Supplier Analytics
            </h3>
            <div className="flex items-center gap-2">
              {ANALYTICS_VIEWS.map((v) => {
                const Icon = v.icon;
                return (
                  <button key={v.key} onClick={() => setAnalyticsView(v.key)}
                    className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                      analyticsView === v.key
                        ? "bg-[#B07B4F] text-white"
                        : "bg-[#FBF6EF] text-[#7B4B2A] hover:bg-[#EDE1CF]"
                    }`}>
                    <Icon size={12} /> {v.label}
                  </button>
                );
              })}
            </div>
          </div>
          {analyticsLoading ? (
            <div className="flex items-center justify-center py-8 text-[#9C8268] text-sm">
              <Loader2 size={18} className="animate-spin mr-2" /> Loading analytics...
            </div>
          ) : analyticsContent && Array.isArray(analyticsContent) && analyticsContent.length > 0 ? (
            <div className="space-y-2">
              {analyticsContent.map((item, idx) => (
                <div key={item.id || item._id || idx}
                  className="flex items-center justify-between rounded-xl bg-[#FBF6EF] px-4 py-3 ring-1 ring-[#EDE1CF]">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-[#B07B4F]/10 flex items-center justify-center text-xs font-medium text-[#B07B4F]">
                      {idx + 1}
                    </span>
                    <div>
                      <p className="text-sm text-[#3B2515] font-medium">{item.companyName || item.name || "Supplier"}</p>
                      {item.category && (
                        <span className="text-[10px] text-[#A9805F]">{item.category}</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    {analyticsView === "outstandingBalances" ? (
                      <span className="text-sm font-medium text-[#3B2515]">{formatCurrency(item.amount || item.outstandingBalance || item.balance)}</span>
                    ) : analyticsView === "topVolume" ? (
                      <span className="text-sm font-medium text-[#3B2515]">{formatCurrency(item.volume || item.totalVolume || item.totalSpent)}</span>
                    ) : (
                      <RatingStars rating={item.rating || item.reliability} size={12} />
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-[#9C8268] py-8 text-center">
              No analytics data available
            </div>
          )}
        </motion.div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16 text-[#9C8268] text-sm">
          <Loader2 size={20} className="animate-spin mr-2" /> Loading suppliers...
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-[#9C8268] text-sm">
          {searchQuery || categoryFilter || ratingFilter ? "No suppliers match your filters" : "No suppliers available. Add your first supplier to get started."}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((supplier) => {
            const isSelected = selectedId === (supplier.id || supplier._id);
            return (
              <motion.div key={supplier.id || supplier._id} layout
                onClick={() => handleSelectSupplier(supplier.id || supplier._id)}
                className={`rounded-2xl bg-white ring-1 shadow-sm shadow-[#3B2515]/5 p-5 cursor-pointer transition-all ${
                  isSelected ? "ring-[#B07B4F] ring-2" : "ring-[#EDE1CF] hover:shadow-md"
                }`}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#B07B4F] to-[#C9925F] flex items-center justify-center text-white text-xs font-bold shrink-0">
                        {(supplier.companyName || "S")[0].toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-serif text-base text-[#3B2515] truncate">{supplier.companyName || "Unnamed Supplier"}</h3>
                        {supplier.category && (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${CATEGORY_COLORS[supplier.category] || "bg-gray-50 text-gray-600 ring-1 ring-gray-200"}`}>
                            {supplier.category}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <ChevronRight size={16} className={`text-[#9C8268] transition-transform shrink-0 ${isSelected ? "rotate-90" : ""}`} />
                </div>

                <div className="space-y-2 mb-3">
                  {supplier.contactPerson && (
                    <p className="text-xs text-[#9C8268] flex items-center gap-1.5">
                      <User size={12} className="shrink-0" /> {supplier.contactPerson}
                    </p>
                  )}
                  {supplier.phone && (
                    <p className="text-xs text-[#9C8268] flex items-center gap-1.5">
                      <Phone size={12} className="shrink-0" /> {supplier.phone}
                    </p>
                  )}
                  {supplier.email && (
                    <p className="text-xs text-[#9C8268] flex items-center gap-1.5 truncate">
                      <Mail size={12} className="shrink-0" /> {supplier.email}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-[#EDE1CF]">
                  <RatingStars rating={supplier.rating} size={12} />
                  {supplier.outstandingBalance != null && Number(supplier.outstandingBalance) > 0 && (
                    <span className="text-xs font-medium text-[#3B2515]">{formatCurrency(supplier.outstandingBalance)}</span>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      <AnimatePresence>
        {selectedId && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            className="rounded-2xl bg-white ring-1 ring-[#EDE1CF] shadow-sm shadow-[#3B2515]/5 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#EDE1CF]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#B07B4F] to-[#C9925F] flex items-center justify-center text-white text-sm font-bold">
                  {(supplierDetail?.companyName || "S")[0].toUpperCase()}
                </div>
                <div>
                  <h3 className="font-serif text-base text-[#3B2515]">{supplierDetail?.companyName || "Supplier"}</h3>
                  <p className="text-xs text-[#A9805F]">{supplierDetail?.category || "Supplier"} &middot; Details</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {permissions.can("suppliers.edit") && (
                  <button onClick={() => openEdit(supplierDetail || suppliers.find(s => (s.id || s._id) === selectedId))}
                    className="rounded-full bg-[#FBF6EF] p-2 text-[#7B4B2A] hover:bg-[#EDE1CF] transition-colors">
                    <Edit3 size={14} />
                  </button>
                )}
                {permissions.can("suppliers.delete") && (
                  <button onClick={() => openDeleteConfirm(selectedId)}
                    className="rounded-full bg-rose-50 p-2 text-rose-500 hover:bg-rose-100 transition-colors">
                    <Trash2 size={14} />
                  </button>
                )}
                <button onClick={() => { setSelectedId(null); setSupplierDetail(null); setSupplierPerformance(null); }}
                  className="text-[#9C8268] hover:text-[#3B2515] p-1 rounded-full hover:bg-[#FBF6EF]">
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="flex border-b border-[#EDE1CF] overflow-x-auto">
              {DETAIL_TABS.map((tab) => (
                <button key={tab} onClick={() => setDetailTab(tab)}
                  className={`px-5 py-3 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${
                    detailTab === tab
                      ? "text-[#B07B4F] border-[#B07B4F]"
                      : "text-[#9C8268] border-transparent hover:text-[#3B2515]"
                  }`}>
                  {tab}
                </button>
              ))}
            </div>

            <div className="p-5">
              {detailLoading ? (
                <div className="flex items-center justify-center py-10 text-[#9C8268] text-sm">
                  <Loader2 size={18} className="animate-spin mr-2" /> Loading...
                </div>
              ) : (
                <>
                  {detailTab === "Info" && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] uppercase tracking-wide text-[#A9805F] font-medium flex items-center gap-1"><Building2 size={11} /> Company Name</label>
                        <p className="text-sm text-[#3B2515] font-medium mt-0.5">{supplierDetail?.companyName || "—"}</p>
                      </div>
                      <div>
                        <label className="text-[10px] uppercase tracking-wide text-[#A9805F] font-medium flex items-center gap-1"><User size={11} /> Contact Person</label>
                        <p className="text-sm text-[#3B2515] mt-0.5">{supplierDetail?.contactPerson || "—"}</p>
                      </div>
                      <div>
                        <label className="text-[10px] uppercase tracking-wide text-[#A9805F] font-medium flex items-center gap-1"><Phone size={11} /> Phone</label>
                        <p className="text-sm text-[#3B2515] mt-0.5">{supplierDetail?.phone || "—"}</p>
                      </div>
                      <div>
                        <label className="text-[10px] uppercase tracking-wide text-[#A9805F] font-medium flex items-center gap-1"><Mail size={11} /> Email</label>
                        <p className="text-sm text-[#3B2515] mt-0.5">{supplierDetail?.email || "—"}</p>
                      </div>
                      <div>
                        <label className="text-[10px] uppercase tracking-wide text-[#A9805F] font-medium flex items-center gap-1"><MapPin size={11} /> Address</label>
                        <p className="text-sm text-[#3B2515] mt-0.5">{supplierDetail?.address || "—"}</p>
                      </div>
                      <div>
                        <label className="text-[10px] uppercase tracking-wide text-[#A9805F] font-medium flex items-center gap-1"><Tag size={11} /> Category</label>
                        <p className="text-sm text-[#3B2515] mt-0.5">
                          {supplierDetail?.category ? (
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${CATEGORY_COLORS[supplierDetail.category] || "bg-gray-50 text-gray-600 ring-1 ring-gray-200"}`}>
                              {supplierDetail.category}
                            </span>
                          ) : "—"}
                        </p>
                      </div>
                      <div>
                        <label className="text-[10px] uppercase tracking-wide text-[#A9805F] font-medium flex items-center gap-1"><CreditCard size={11} /> Payment Terms</label>
                        <p className="text-sm text-[#3B2515] mt-0.5">{supplierDetail?.paymentTerms || "—"}</p>
                      </div>
                      <div>
                        <label className="text-[10px] uppercase tracking-wide text-[#A9805F] font-medium flex items-center gap-1"><FileText size={11} /> Tax ID</label>
                        <p className="text-sm text-[#3B2515] mt-0.5">{supplierDetail?.taxId || "—"}</p>
                      </div>
                      <div>
                        <label className="text-[10px] uppercase tracking-wide text-[#A9805F] font-medium flex items-center gap-1"><DollarSign size={11} /> Outstanding Balance</label>
                        <p className="text-sm text-[#3B2515] mt-0.5">{formatCurrency(supplierDetail?.outstandingBalance)}</p>
                      </div>
                      <div>
                        <label className="text-[10px] uppercase tracking-wide text-[#A9805F] font-medium flex items-center gap-1"><Star size={11} /> Rating</label>
                        <p className="text-sm text-[#3B2515] mt-0.5"><RatingStars rating={supplierDetail?.rating} size={13} /></p>
                      </div>
                      {supplierDetail?.notes && (
                        <div className="sm:col-span-2">
                          <label className="text-[10px] uppercase tracking-wide text-[#A9805F] font-medium flex items-center gap-1"><FileText size={11} /> Notes</label>
                          <p className="text-sm text-[#3B2515] mt-0.5 whitespace-pre-wrap">{supplierDetail.notes}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {detailTab === "Purchase History" && (
                    <div>
                      <h4 className="text-sm font-medium text-[#3B2515] mb-3">Purchase Orders</h4>
                      {supplierDetail?.purchaseOrders && supplierDetail.purchaseOrders.length > 0 ? (
                        <div className="space-y-2">
                          {supplierDetail.purchaseOrders.map((po, i) => (
                            <div key={po._id || po.id || i}
                              className="flex items-center justify-between rounded-xl bg-[#FBF6EF] px-4 py-3 ring-1 ring-[#EDE1CF]">
                              <div className="flex items-center gap-3">
                                <Package size={15} className="text-[#B07B4F]" />
                                <div>
                                  <p className="text-sm text-[#3B2515] font-medium">{po.orderNumber || po.poNumber || `Order #${i + 1}`}</p>
                                  <p className="text-xs text-[#A9805F]">
                                    {po.date ? new Date(po.date).toLocaleDateString() : ""}
                                    {po.itemsCount ? ` - ${po.itemsCount} items` : ""}
                                    {po.totalAmount ? ` - ${formatCurrency(po.totalAmount)}` : ""}
                                  </p>
                                </div>
                              </div>
                              <span className={`text-xs rounded-full px-2.5 py-0.5 font-medium ${
                                po.status === "delivered" || po.status === "received"
                                  ? "bg-emerald-50 text-emerald-600"
                                  : po.status === "pending" || po.status === "ordered"
                                    ? "bg-amber-50 text-amber-600"
                                    : po.status === "cancelled"
                                      ? "bg-rose-50 text-rose-600"
                                      : "bg-sky-50 text-sky-600"
                              }`}>
                                {po.status || "pending"}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-[#9C8268] text-sm">
                          {supplierDetail ? "No purchase history found for this supplier" : "Loading purchase history..."}
                        </div>
                      )}
                    </div>
                  )}

                  {detailTab === "Performance" && (
                    <div>
                      <h4 className="text-sm font-medium text-[#3B2515] mb-3">Performance Metrics</h4>
                      {supplierPerformance ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                          <div className="rounded-xl bg-[#FBF6EF] p-4 text-center ring-1 ring-[#EDE1CF]">
                            <p className="text-xl font-serif text-[#3B2515]"><RatingStars rating={supplierPerformance.rating || supplierDetail?.rating} size={14} /></p>
                            <p className="text-[10px] text-[#A9805F] uppercase tracking-wide mt-1">Rating</p>
                          </div>
                          <div className="rounded-xl bg-[#FBF6EF] p-4 text-center ring-1 ring-[#EDE1CF]">
                            <p className="text-2xl font-serif text-[#3B2515]">
                              {supplierPerformance.onTimeDeliveryRate != null
                                ? `${(Number(supplierPerformance.onTimeDeliveryRate) * 100).toFixed(0)}%`
                                : supplierPerformance.deliveryReliability
                                  ? `${(Number(supplierPerformance.deliveryReliability) * 100).toFixed(0)}%`
                                  : "—"}
                            </p>
                            <p className="text-[10px] text-[#A9805F] uppercase tracking-wide mt-1">On-Time Delivery</p>
                          </div>
                          <div className="rounded-xl bg-[#FBF6EF] p-4 text-center ring-1 ring-[#EDE1CF]">
                            <p className="text-2xl font-serif text-[#3B2515">{supplierPerformance.totalOrders || supplierPerformance.orderCount || 0}</p>
                            <p className="text-[10px] text-[#A9805F] uppercase tracking-wide mt-1">Total Orders</p>
                          </div>
                          {supplierPerformance.avgDeliveryTime != null && (
                            <div className="rounded-xl bg-[#FBF6EF] p-4 text-center ring-1 ring-[#EDE1CF]">
                              <p className="text-2xl font-serif text-[#3B2515]">{supplierPerformance.avgDeliveryTime}h</p>
                              <p className="text-[10px] text-[#A9805F] uppercase tracking-wide mt-1">Avg Delivery Time</p>
                            </div>
                          )}
                          {supplierPerformance.qualityScore != null && (
                            <div className="rounded-xl bg-[#FBF6EF] p-4 text-center ring-1 ring-[#EDE1CF]">
                              <p className="text-2xl font-serif text-[#3B2515]">{(Number(supplierPerformance.qualityScore) * 100).toFixed(0)}%</p>
                              <p className="text-[10px] text-[#A9805F] uppercase tracking-wide mt-1">Quality Score</p>
                            </div>
                          )}
                          {supplierPerformance.communicationScore != null && (
                            <div className="rounded-xl bg-[#FBF6EF] p-4 text-center ring-1 ring-[#EDE1CF]">
                              <p className="text-2xl font-serif text-[#3B2515]">{(Number(supplierPerformance.communicationScore) * 100).toFixed(0)}%</p>
                              <p className="text-[10px] text-[#A9805F] uppercase tracking-wide mt-1">Communication</p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center justify-center py-10 text-[#9C8268] text-sm">
                          <Loader2 size={18} className="animate-spin mr-2" /> Loading performance data...
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {editModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
            onClick={() => { if (!saving) setEditModal(false); }}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 max-h-[85vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-serif text-lg text-[#3B2515]">
                  {editingId ? "Edit Supplier" : "Create Supplier"}
                </h3>
                <button onClick={() => { if (!saving) setEditModal(false); }} className="text-[#9C8268] hover:text-[#3B2515]"><X size={18} /></button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs text-[#A9805F] uppercase tracking-wide font-medium mb-1.5 block">
                    Company Name <span className="text-rose-500">*</span>
                  </label>
                  <input value={form.companyName} onChange={(e) => setForm((f) => ({ ...f, companyName: e.target.value }))}
                    placeholder="Supplier company name"
                    className="w-full rounded-xl border border-[#EDE1CF] px-3.5 py-2.5 text-sm text-[#3B2515] bg-white focus:outline-none focus:ring-2 focus:ring-[#B07B4F]/40" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-[#A9805F] uppercase tracking-wide font-medium mb-1.5 block">Contact Person</label>
                    <input value={form.contactPerson} onChange={(e) => setForm((f) => ({ ...f, contactPerson: e.target.value }))}
                      placeholder="Full name"
                      className="w-full rounded-xl border border-[#EDE1CF] px-3.5 py-2.5 text-sm text-[#3B2515] bg-white focus:outline-none focus:ring-2 focus:ring-[#B07B4F]/40" />
                  </div>
                  <div>
                    <label className="text-xs text-[#A9805F] uppercase tracking-wide font-medium mb-1.5 block">Phone</label>
                    <input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                      placeholder="+1 (555) 000-0000"
                      className="w-full rounded-xl border border-[#EDE1CF] px-3.5 py-2.5 text-sm text-[#3B2515] bg-white focus:outline-none focus:ring-2 focus:ring-[#B07B4F]/40" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-[#A9805F] uppercase tracking-wide font-medium mb-1.5 block">Email</label>
                    <input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                      placeholder="supplier@example.com"
                      className="w-full rounded-xl border border-[#EDE1CF] px-3.5 py-2.5 text-sm text-[#3B2515] bg-white focus:outline-none focus:ring-2 focus:ring-[#B07B4F]/40" />
                  </div>
                  <div>
                    <label className="text-xs text-[#A9805F] uppercase tracking-wide font-medium mb-1.5 block">Category</label>
                    <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                      className="w-full rounded-xl border border-[#EDE1CF] px-3.5 py-2.5 text-sm text-[#3B2515] bg-white focus:outline-none focus:ring-2 focus:ring-[#B07B4F]/40 appearance-none cursor-pointer">
                      <option value="">Select category</option>
                      {CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs text-[#A9805F] uppercase tracking-wide font-medium mb-1.5 block">Address</label>
                  <input value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                    placeholder="Street, city, zip"
                    className="w-full rounded-xl border border-[#EDE1CF] px-3.5 py-2.5 text-sm text-[#3B2515] bg-white focus:outline-none focus:ring-2 focus:ring-[#B07B4F]/40" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-[#A9805F] uppercase tracking-wide font-medium mb-1.5 block">Payment Terms</label>
                    <input value={form.paymentTerms} onChange={(e) => setForm((f) => ({ ...f, paymentTerms: e.target.value }))}
                      placeholder="e.g. Net 30"
                      className="w-full rounded-xl border border-[#EDE1CF] px-3.5 py-2.5 text-sm text-[#3B2515] bg-white focus:outline-none focus:ring-2 focus:ring-[#B07B4F]/40" />
                  </div>
                  <div>
                    <label className="text-xs text-[#A9805F] uppercase tracking-wide font-medium mb-1.5 block">Tax ID</label>
                    <input value={form.taxId} onChange={(e) => setForm((f) => ({ ...f, taxId: e.target.value }))}
                      placeholder="Tax identification number"
                      className="w-full rounded-xl border border-[#EDE1CF] px-3.5 py-2.5 text-sm text-[#3B2515] bg-white focus:outline-none focus:ring-2 focus:ring-[#B07B4F]/40" />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-[#A9805F] uppercase tracking-wide font-medium mb-1.5 block">Notes</label>
                  <textarea value={form.notes} rows={2} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                    placeholder="Internal notes about this supplier"
                    className="w-full rounded-xl border border-[#EDE1CF] px-3.5 py-2.5 text-sm text-[#3B2515] bg-white focus:outline-none focus:ring-2 focus:ring-[#B07B4F]/40 resize-none" />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button onClick={() => setEditModal(false)} disabled={saving}
                    className="rounded-full border border-[#EDE1CF] px-4 py-2 text-sm text-[#7B4B2A] hover:bg-[#FBF6EF] transition-colors disabled:opacity-50">
                    Cancel
                  </button>
                  <button onClick={handleSave} disabled={saving}
                    className="flex items-center gap-1.5 rounded-full bg-[#B07B4F] text-white px-4 py-2 text-sm font-medium hover:bg-[#C9925F] transition-colors disabled:opacity-50">
                    {saving && <Loader2 size={14} className="animate-spin" />}
                    {editingId ? "Save Changes" : "Create Supplier"}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deleteModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
            onClick={() => { if (!deleting) setDeleteModal(false); }}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-serif text-lg text-[#3B2515]">Delete Supplier</h3>
                <button onClick={() => setDeleteModal(false)} disabled={deleting}
                  className="text-[#9C8268] hover:text-[#3B2515]">
                  <X size={18} />
                </button>
              </div>
              <p className="text-sm text-[#9C8268] mb-6">
                Are you sure you want to delete this supplier? This action cannot be undone.
              </p>
              <div className="flex justify-end gap-3">
                <button onClick={() => setDeleteModal(false)} disabled={deleting}
                  className="rounded-full border border-[#EDE1CF] px-4 py-2 text-sm text-[#7B4B2A] hover:bg-[#FBF6EF] transition-colors disabled:opacity-50">
                  Cancel
                </button>
                <button onClick={handleDelete} disabled={deleting}
                  className="flex items-center gap-1.5 rounded-full bg-rose-500 text-white px-4 py-2 text-sm font-medium hover:bg-rose-600 transition-colors disabled:opacity-50">
                  {deleting && <Loader2 size={14} className="animate-spin" />}
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
