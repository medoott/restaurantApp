import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Search, X, Clock, Users, Phone, CalendarDays,
  ChevronLeft, ChevronRight, AlertCircle, CheckCircle,
  MapPin, Mail, MessageSquare, History, ArrowUpDown,
  User, Timer, Edit3,
} from "lucide-react";
import * as dataService from "../services/data.js";

const RESERVATION_STATUS = ["Pending", "Confirmed", "Arrived", "Seated", "Completed", "Cancelled", "No_Show"];

const STATUS_BADGE = {
  Pending: "bg-amber-100 text-amber-700 ring-1 ring-amber-300",
  Confirmed: "bg-sky-100 text-sky-700 ring-1 ring-sky-300",
  Arrived: "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-300",
  Seated: "bg-indigo-100 text-indigo-700 ring-1 ring-indigo-300",
  Completed: "bg-green-100 text-green-700 ring-1 ring-green-300",
  Cancelled: "bg-rose-100 text-rose-700 ring-1 ring-rose-300",
  No_Show: "bg-stone-100 text-stone-600 ring-1 ring-stone-300",
};

const TIMESLOTS = [
  "11:00 AM", "11:30 AM", "12:00 PM", "12:30 PM",
  "1:00 PM", "1:30 PM", "2:00 PM", "2:30 PM",
  "3:00 PM", "3:30 PM", "4:00 PM", "4:30 PM",
  "5:00 PM", "5:30 PM", "6:00 PM", "6:30 PM",
  "7:00 PM", "7:30 PM", "8:00 PM", "8:30 PM",
  "9:00 PM", "9:30 PM", "10:00 PM",
];

const SECTIONS = ["Main Hall", "Terrace", "VIP Room", "Garden", "Bar"];

function _formatTime(dateStr, timeStr) {
  if (timeStr) return timeStr;
  if (!dateStr) return "";
  try {
    return new Date(dateStr).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  } catch {
    return "";
  }
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  try {
    return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return "";
  }
}

function _to12h(time) {
  if (!time) return "";
  try {
    const [h, m] = time.includes(":") ? time.split(":").map(Number) : [0, 0];
    const period = h >= 12 ? "PM" : "AM";
    const hour = h % 12 || 12;
    return `${hour}:${String(m).padStart(2, "0")} ${period}`;
  } catch {
    return time;
  }
}

function parseTimeToMinutes(t) {
  const match = t?.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!match) return 9999;
  let h = Number(match[1]);
  const m = Number(match[2]);
  const p = match[3].toUpperCase();
  if (p === "PM" && h !== 12) h += 12;
  if (p === "AM" && h === 12) h = 0;
  return h * 60 + m;
}

function timeToMinutes(time) {
  if (!time) return 9999;
  if (/^\d{1,2}:\d{2}\s*(AM|PM)$/i.test(time)) return parseTimeToMinutes(time);
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function normalizeTime(val) {
  if (!val) return "";
  if (/^\d{1,2}:\d{2}\s*(AM|PM)$/i.test(val)) return val;
  const [h, m] = val.split(":").map(Number);
  const p = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, "0")} ${p}`;
}

const INITIAL_FORM = {
  customerName: "",
  phone: "",
  email: "",
  partySize: "2",
  reservationDate: "",
  reservationTime: "",
  preferredSection: "",
  tableId: "",
  notes: "",
  specialRequests: "",
};

export default function ReservationPage() {
  const [activeTab, setActiveTab] = useState("today");
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notif, setNotif] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [detailModal, setDetailModal] = useState(null);
  const [editModal, setEditModal] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);
  const [editingId, setEditingId] = useState(null);
  const [availableTables, setAvailableTables] = useState([]);
  const [loadingTables, setLoadingTables] = useState(false);

  const [sortField, setSortField] = useState("reservationDate");
  const [sortDir, setSortDir] = useState("asc");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const prevFormRef = useRef(null);

  const showNotif = useCallback((msg, type = "success") => {
    setNotif({ msg, type });
    setTimeout(() => setNotif(null), 3500);
  }, []);

  const loadReservations = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (activeTab === "today") {
        const data = await dataService.fetchTodayReservations();
        setReservations(data || []);
      } else if (activeTab === "history") {
        const data = await dataService.fetchReservations({ status: "Completed,Cancelled,No_Show" });
        setReservations(data || []);
      } else {
        const data = await dataService.fetchReservations(params);
        setReservations(data || []);
      }
    } catch (err) {
      showNotif(err.message, "error");
      setReservations([]);
    } finally {
      setLoading(false);
    }
  }, [activeTab, showNotif]);

  useEffect(() => {
    loadReservations();
  }, [loadReservations]);

  useEffect(() => {
    setPage(1);
  }, [activeTab, searchQuery, dateFilter, statusFilter]);

  const fetchAvailTables = useCallback(async (date, time, party) => {
    if (!date || !time || !party) {
      setAvailableTables([]);
      return;
    }
    setLoadingTables(true);
    try {
      const data = await dataService.fetchAvailableTables({ date, time, partySize: party });
      const list = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : Array.isArray(data?.tables) ? data.tables : [];
      setAvailableTables(list);
    } catch (err) {
      setAvailableTables([]);
    } finally {
      setLoadingTables(false);
    }
  }, []);

  useEffect(() => {
    const current = { date: form.reservationDate, time: form.reservationTime, party: form.partySize };
    const prev = prevFormRef.current;
    if (!prev || current.date !== prev.date || current.time !== prev.time || current.party !== prev.party) {
      if (current.date && current.time && current.party) {
        fetchAvailTables(current.date, current.time, current.party);
      } else {
        setAvailableTables([]);
      }
    }
    prevFormRef.current = current;
  }, [form.reservationDate, form.reservationTime, form.partySize, fetchAvailTables]);

  const openCreate = () => {
    setEditingId(null);
    setForm(INITIAL_FORM);
    setAvailableTables([]);
    setEditModal(true);
  };

  const openEdit = (r) => {
    setEditingId(r._id || r.id);
    setForm({
      customerName: r.customerName || "",
      phone: r.phone || r.customerPhone || "",
      email: r.email || "",
      partySize: String(r.partySize || 2),
      reservationDate: r.reservationDate ? r.reservationDate.split("T")[0] : "",
      reservationTime: r.reservationTime || "",
      preferredSection: r.preferredSection || "",
      tableId: r.tableId?._id || r.tableId || "",
      notes: r.notes || "",
      specialRequests: r.specialRequests || "",
    });
    setEditModal(true);
  };

  const handleSave = async () => {
    if (!form.customerName.trim()) { showNotif("Customer name is required", "error"); return; }
    const ps = Number(form.partySize);
    if (!ps || ps < 1) { showNotif("Party size must be at least 1", "error"); return; }
    if (!form.reservationDate) { showNotif("Reservation date is required", "error"); return; }

    const payload = {
      customerName: form.customerName.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      partySize: ps,
      reservationDate: form.reservationDate,
      reservationTime: form.reservationTime,
      preferredSection: form.preferredSection,
      tableId: form.tableId || undefined,
      notes: form.notes,
      specialRequests: form.specialRequests,
    };

    try {
      if (editingId) {
        await dataService.updateReservation(editingId, payload);
        showNotif("Reservation updated");
      } else {
        await dataService.createReservation(payload);
        showNotif("Reservation created");
      }
      setEditModal(false);
      loadReservations();
    } catch (err) {
      showNotif(err.message, "error");
    }
  };

  const handleStatusAction = async (id, action) => {
    try {
      switch (action) {
        case "confirm":
          await dataService.updateReservation(id, { status: "Confirmed" });
          break;
        case "check-in":
          await dataService.checkInReservation(id);
          break;
        case "seat":
          await dataService.seatReservation(id);
          break;
        case "complete":
          await dataService.completeReservation(id);
          break;
        case "cancel":
          await dataService.cancelReservation(id);
          break;
        default:
          return;
      }
      showNotif(`Reservation ${action === "cancel" ? "cancelled" : action + "ed"}`);
      loadReservations();
      if (detailModal) {
        try {
          const updated = await dataService.fetchReservation(detailModal._id || detailModal.id);
          setDetailModal(updated?.data || updated || detailModal);
        } catch {
          setDetailModal(null);
        }
      }
    } catch (err) {
      if (err.message?.toLowerCase().includes("double") || err.message?.toLowerCase().includes("already book")) {
        showNotif("Table is double-booked for this time slot", "error");
      } else {
        showNotif(err.message, "error");
      }
    }
  };

  const handleAssignTable = async (resId, tableId) => {
    try {
      await dataService.assignTableToReservation(resId, tableId);
      showNotif("Table assigned");
      loadReservations();
      if (detailModal) {
        try {
          const updated = await dataService.fetchReservation(detailModal._id || detailModal.id);
          setDetailModal(updated?.data || updated || detailModal);
        } catch {
          setDetailModal(null);
        }
      }
    } catch (err) {
      if (err.message?.toLowerCase().includes("double") || err.message?.toLowerCase().includes("already book")) {
        showNotif("Table is double-booked for this time slot", "error");
      } else {
        showNotif(err.message, "error");
      }
    }
  };

  const openDetail = async (r) => {
    try {
      const data = await dataService.fetchReservation(r._id || r.id);
      setDetailModal(data?.data || data || r);
    } catch {
      setDetailModal(r);
    }
  };

  const toggleSort = (field) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const filtered = reservations.filter((r) => {
    const q = searchQuery.toLowerCase().trim();
    if (q && !r.customerName?.toLowerCase().includes(q) && !r.phone?.includes(q) && !r.email?.toLowerCase().includes(q)) return false;
    if (dateFilter && r.reservationDate && !r.reservationDate.startsWith(dateFilter)) return false;
    if (statusFilter && r.status !== statusFilter) return false;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    let va, vb;
    if (sortField === "reservationDate") {
      va = a.reservationDate || "";
      vb = b.reservationDate || "";
    } else if (sortField === "reservationTime") {
      va = timeToMinutes(a.reservationTime);
      vb = timeToMinutes(b.reservationTime);
    } else if (sortField === "customerName") {
      va = (a.customerName || "").toLowerCase();
      vb = (b.customerName || "").toLowerCase();
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

  const timelineSlots = TIMESLOTS.map((slot) => {
    const slotMinutes = timeToMinutes(slot);
    const nextMinutes = slotMinutes + 30;
    const matches = reservations.filter((r) => {
      const rt = timeToMinutes(r.reservationTime);
      return rt >= slotMinutes && rt < nextMinutes;
    });
    return { label: slot, time: slotMinutes, reservations: matches };
  });

  const actionsForStatus = (status) => {
    switch (status) {
      case "Pending":
        return ["confirm", "cancel"];
      case "Confirmed":
        return ["check-in", "cancel"];
      case "Arrived":
        return ["seat", "cancel"];
      case "Seated":
        return ["complete"];
      default:
        return [];
    }
  };

  const statusColorDot = (s) => {
    if (s === "Pending") return "bg-amber-400";
    if (s === "Confirmed") return "bg-sky-400";
    if (s === "Arrived") return "bg-emerald-400";
    if (s === "Seated") return "bg-indigo-400";
    if (s === "Completed") return "bg-green-400";
    if (s === "Cancelled") return "bg-rose-400";
    if (s === "No_Show") return "bg-stone-400";
    return "bg-gray-400";
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-xl text-[#3B2515] flex items-center gap-2">
            <CalendarDays size={18} /> Reservation Management
          </h2>
          <p className="text-xs text-[#A9805F] mt-0.5">Manage diner reservations and walk-ins</p>
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-1.5 rounded-full bg-[#B07B4F] text-white px-4 py-2 text-sm font-medium hover:bg-[#C9925F] transition-colors">
          <Plus size={15} /> Add Reservation
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

      <div className="flex flex-wrap items-center gap-1 bg-[#FBF6EF] rounded-2xl p-1 ring-1 ring-[#EDE1CF]">
        {["today", "all", "history"].map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              activeTab === tab
                ? "bg-white text-[#3B2515] shadow-sm ring-1 ring-[#EDE1CF]"
                : "text-[#9C8268] hover:text-[#3B2515]"
            }`}>
            {tab === "today" ? "Today's Timeline" : tab === "all" ? "All Reservations" : "History"}
          </button>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A9805F]" />
          <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, phone, or email..."
            className="w-full rounded-full border border-[#EDE1CF] bg-white pl-9 pr-4 py-2 text-sm text-[#3B2515] outline-none focus:ring-2 focus:ring-[#B07B4F]/40"
          />
        </div>
        <input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)}
          className="rounded-full border border-[#EDE1CF] bg-white px-4 py-2 text-sm text-[#3B2515] outline-none focus:ring-2 focus:ring-[#B07B4F]/40"
        />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-full border border-[#EDE1CF] bg-white px-4 py-2 text-sm text-[#3B2515] outline-none focus:ring-2 focus:ring-[#B07B4F]/40">
          <option value="">All Statuses</option>
          {RESERVATION_STATUS.map((s) => (
            <option key={s} value={s}>{s.replace("_", " ")}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="text-center py-12 text-[#9C8268] text-sm">Loading reservations...</div>
      ) : activeTab === "today" ? (
        <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
          {timelineSlots.filter((s) => s.reservations.length > 0 || searchQuery).map((slot) => (
            <div key={slot.label} className="flex gap-3">
              <div className="flex flex-col items-center w-16 shrink-0 pt-1">
                <span className="text-[10px] uppercase tracking-wider text-[#9C8268] font-medium">{slot.label}</span>
                <div className="w-px flex-1 bg-[#EDE1CF] mt-2" />
              </div>
              <div className="flex-1 space-y-2 pb-3">
                {slot.reservations.length === 0 ? (
                  <p className="text-xs text-[#A9805F] italic py-1">No reservations</p>
                ) : (
                  slot.reservations.map((r) => {
                    const isFuture = r.reservationDate && new Date(r.reservationDate + "T" + (r.reservationTime || "00:00")) > new Date();
                    return (
                      <motion.div key={r._id || r.id} layout
                        onClick={() => openDetail(r)}
                        className="rounded-2xl bg-white ring-1 ring-[#EDE1CF] shadow-sm p-4 hover:shadow-md transition-shadow cursor-pointer">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-serif text-[#3B2515] text-sm font-medium truncate">{r.customerName}</h4>
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${STATUS_BADGE[r.status] || "bg-gray-100 text-gray-600"}`}>
                                {r.status?.replace("_", " ")}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 mt-1.5 text-xs text-[#9C8268] flex-wrap">
                              <span className="flex items-center gap-1"><Users size={11} /> {r.partySize}</span>
                              {r.phone && <span className="flex items-center gap-1"><Phone size={11} /> {r.phone}</span>}
                              {r.tableId?.tableNumber && <span className="flex items-center gap-1"><MapPin size={11} /> Table {r.tableId.tableNumber}</span>}
                            </div>
                          </div>
                          {isFuture && (
                            <div className="shrink-0">
                              <CountdownTimer targetDate={r.reservationDate} targetTime={r.reservationTime} />
                            </div>
                          )}
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </div>
            </div>
          ))}
          {timelineSlots.every((s) => s.reservations.length === 0) && (
            <div className="text-center py-12 text-[#9C8268] text-sm">No reservations for today</div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl ring-1 ring-[#EDE1CF] shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#EDE1CF] bg-[#FBF6EF]">
                  <th className="text-left px-4 py-3 text-[#A9805F] text-xs uppercase tracking-wide font-medium cursor-pointer select-none" onClick={() => toggleSort("customerName")}>
                    <span className="flex items-center gap-1">Customer <ArrowUpDown size={11} /></span>
                  </th>
                  <th className="text-left px-4 py-3 text-[#A9805F] text-xs uppercase tracking-wide font-medium">Phone</th>
                  <th className="text-left px-4 py-3 text-[#A9805F] text-xs uppercase tracking-wide font-medium">Party</th>
                  <th className="text-left px-4 py-3 text-[#A9805F] text-xs uppercase tracking-wide font-medium cursor-pointer select-none" onClick={() => toggleSort("reservationDate")}>
                    <span className="flex items-center gap-1">Date <ArrowUpDown size={11} /></span>
                  </th>
                  <th className="text-left px-4 py-3 text-[#A9805F] text-xs uppercase tracking-wide font-medium cursor-pointer select-none" onClick={() => toggleSort("reservationTime")}>
                    <span className="flex items-center gap-1">Time <ArrowUpDown size={11} /></span>
                  </th>
                  <th className="text-left px-4 py-3 text-[#A9805F] text-xs uppercase tracking-wide font-medium">Table</th>
                  <th className="text-left px-4 py-3 text-[#A9805F] text-xs uppercase tracking-wide font-medium">Status</th>
                  <th className="text-right px-4 py-3 text-[#A9805F] text-xs uppercase tracking-wide font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paged.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-12 text-[#9C8268] text-sm">No reservations found</td></tr>
                ) : (
                  paged.map((r) => (
                    <tr key={r._id || r.id} className="border-b border-[#EDE1CF]/50 hover:bg-[#FBF6EF]/50 transition-colors">
                      <td className="px-4 py-3">
                        <button onClick={() => openDetail(r)} className="font-medium text-[#3B2515] hover:text-[#B07B4F] transition-colors text-left">
                          {r.customerName || "—"}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-[#9C8268]">{r.phone || "—"}</td>
                      <td className="px-4 py-3 text-[#9C8268]">{r.partySize || "—"}</td>
                      <td className="px-4 py-3 text-[#3B2515]">{formatDate(r.reservationDate)}</td>
                      <td className="px-4 py-3 text-[#3B2515]">{normalizeTime(r.reservationTime) || "—"}</td>
                      <td className="px-4 py-3 text-[#3B2515]">{r.tableId?.tableNumber ? `Table ${r.tableId.tableNumber}` : "—"}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-medium ${STATUS_BADGE[r.status] || "bg-gray-100 text-gray-600"}`}>
                          {r.status?.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => openDetail(r)}
                          className="rounded-full bg-[#FBF6EF] px-3 py-1.5 text-xs text-[#7B4B2A] hover:bg-[#EDE1CF] transition-colors">
                          View
                        </button>
                      </td>
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
              className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 max-h-[85vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-serif text-lg text-[#3B2515]">Reservation Details</h3>
                <button onClick={() => setDetailModal(null)} className="text-[#9C8268] hover:text-[#3B2515]"><X size={18} /></button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] uppercase tracking-wide text-[#A9805F] font-medium flex items-center gap-1"><User size={11} /> Customer</label>
                    <p className="text-sm text-[#3B2515] font-medium mt-0.5">{detailModal.customerName || "—"}</p>
                  </div>
                  <div>
                    <label className="text-[10px] uppercase tracking-wide text-[#A9805F] font-medium flex items-center gap-1"><Phone size={11} /> Phone</label>
                    <p className="text-sm text-[#3B2515] mt-0.5">{detailModal.phone || "—"}</p>
                  </div>
                  <div>
                    <label className="text-[10px] uppercase tracking-wide text-[#A9805F] font-medium flex items-center gap-1"><Mail size={11} /> Email</label>
                    <p className="text-sm text-[#3B2515] mt-0.5">{detailModal.email || "—"}</p>
                  </div>
                  <div>
                    <label className="text-[10px] uppercase tracking-wide text-[#A9805F] font-medium flex items-center gap-1"><Users size={11} /> Party Size</label>
                    <p className="text-sm text-[#3B2515] mt-0.5">{detailModal.partySize || "—"}</p>
                  </div>
                  <div>
                    <label className="text-[10px] uppercase tracking-wide text-[#A9805F] font-medium flex items-center gap-1"><CalendarDays size={11} /> Date</label>
                    <p className="text-sm text-[#3B2515] mt-0.5">{formatDate(detailModal.reservationDate)}</p>
                  </div>
                  <div>
                    <label className="text-[10px] uppercase tracking-wide text-[#A9805F] font-medium flex items-center gap-1"><Clock size={11} /> Time</label>
                    <p className="text-sm text-[#3B2515] mt-0.5">{normalizeTime(detailModal.reservationTime) || "—"}</p>
                  </div>
                </div>

                <div className="border-t border-[#EDE1CF] pt-4">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] uppercase tracking-wide text-[#A9805F] font-medium flex items-center gap-1"><MapPin size={11} /> Assigned Table</label>
                    {detailModal.status !== "Completed" && detailModal.status !== "Cancelled" && detailModal.status !== "No_Show" && detailModal._id && (
                      <AssignTableDropdown
                        reservationId={detailModal._id || detailModal.id}
                        currentTableId={detailModal.tableId?._id || detailModal.tableId}
                        currentTableNumber={detailModal.tableId?.tableNumber}
                        partySize={detailModal.partySize}
                        date={detailModal.reservationDate}
                        time={detailModal.reservationTime}
                        onAssign={handleAssignTable}
                      />
                    )}
                  </div>
                  <p className="text-sm text-[#3B2515] mt-0.5">
                    {detailModal.tableId?.tableNumber ? `Table ${detailModal.tableId.tableNumber}` : "Not assigned"}
                  </p>
                </div>

                <div className="border-t border-[#EDE1CF] pt-4">
                  <label className="text-[10px] uppercase tracking-wide text-[#A9805F] font-medium flex items-center gap-1 mb-2"><AlertCircle size={11} /> Status</label>
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${statusColorDot(detailModal.status)}`} />
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${STATUS_BADGE[detailModal.status] || "bg-gray-100 text-gray-600"}`}>
                      {detailModal.status?.replace("_", " ")}
                    </span>
                  </div>
                  {actionsForStatus(detailModal.status).length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {actionsForStatus(detailModal.status).map((action) => {
                        const btnLabel = action === "check-in" ? "Check In" : action.charAt(0).toUpperCase() + action.slice(1);
                        const isCancel = action === "cancel";
                        return (
                          <button key={action} onClick={() => handleStatusAction(detailModal._id || detailModal.id, action)}
                            className={`rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
                              isCancel
                                ? "bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200"
                                : "bg-[#B07B4F] text-white hover:bg-[#C9925F]"
                            }`}>
                            {btnLabel}
                          </button>
                        );
                      })}
                    </div>
                  )}
                  {(detailModal.status === "Cancelled" || detailModal.status === "No_Show") && (
                    <div className="mt-2">
                      <button onClick={() => openEdit(detailModal)}
                        className="flex items-center gap-1 rounded-full bg-[#FBF6EF] px-3 py-1.5 text-xs text-[#7B4B2A] hover:bg-[#EDE1CF] transition-colors">
                        <Edit3 size={12} /> Edit Reservation
                      </button>
                    </div>
                  )}
                </div>

                {(detailModal.notes || detailModal.specialRequests) && (
                  <div className="border-t border-[#EDE1CF] pt-4 space-y-2">
                    {detailModal.notes && (
                      <div>
                        <label className="text-[10px] uppercase tracking-wide text-[#A9805F] font-medium flex items-center gap-1"><MessageSquare size={11} /> Notes</label>
                        <p className="text-sm text-[#3B2515] mt-0.5 whitespace-pre-wrap">{detailModal.notes}</p>
                      </div>
                    )}
                    {detailModal.specialRequests && (
                      <div>
                        <label className="text-[10px] uppercase tracking-wide text-[#A9805F] font-medium flex items-center gap-1">Special Requests</label>
                        <p className="text-sm text-[#3B2515] mt-0.5 whitespace-pre-wrap">{detailModal.specialRequests}</p>
                      </div>
                    )}
                  </div>
                )}

                <div className="border-t border-[#EDE1CF] pt-4">
                  <label className="text-[10px] uppercase tracking-wide text-[#A9805F] font-medium flex items-center gap-1 mb-2"><History size={11} /> Timeline</label>
                  <div className="space-y-2">
                    {detailModal.timeline && Array.isArray(detailModal.timeline) ? (
                      detailModal.timeline.map((entry, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs">
                          <div className="w-1.5 h-1.5 rounded-full bg-[#B07B4F] mt-1.5 shrink-0" />
                          <div>
                            <span className="text-[#3B2515] font-medium capitalize">{entry.status?.replace(/_/g, " ")}</span>
                            <span className="text-[#9C8268] ml-2">{formatDate(entry.timestamp)}{entry.timestamp ? " " : ""}{entry.timestamp ? new Date(entry.timestamp).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : ""}</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <>
                        {detailModal.createdAt && (
                          <div className="flex items-start gap-2 text-xs">
                            <div className="w-1.5 h-1.5 rounded-full bg-[#B07B4F] mt-1.5 shrink-0" />
                            <div><span className="text-[#3B2515] font-medium">Created</span><span className="text-[#9C8268] ml-2">{formatDate(detailModal.createdAt)} {new Date(detailModal.createdAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</span></div>
                          </div>
                        )}
                        {detailModal.status === "Confirmed" && (
                          <div className="flex items-start gap-2 text-xs">
                            <div className="w-1.5 h-1.5 rounded-full bg-sky-400 mt-1.5 shrink-0" />
                            <div><span className="text-[#3B2515] font-medium">Confirmed</span></div>
                          </div>
                        )}
                        {detailModal.status === "Arrived" && (
                          <div className="flex items-start gap-2 text-xs">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                            <div><span className="text-[#3B2515] font-medium">Arrived / Checked In</span></div>
                          </div>
                        )}
                        {detailModal.status === "Seated" && (
                          <div className="flex items-start gap-2 text-xs">
                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5 shrink-0" />
                            <div><span className="text-[#3B2515] font-medium">Seated</span></div>
                          </div>
                        )}
                        {detailModal.status === "Completed" && (
                          <div className="flex items-start gap-2 text-xs">
                            <div className="w-1.5 h-1.5 rounded-full bg-green-400 mt-1.5 shrink-0" />
                            <div><span className="text-[#3B2515] font-medium">Completed</span></div>
                          </div>
                        )}
                        {detailModal.status === "Cancelled" && (
                          <div className="flex items-start gap-2 text-xs">
                            <div className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-1.5 shrink-0" />
                            <div><span className="text-[#3B2515] font-medium">Cancelled</span></div>
                          </div>
                        )}
                        {detailModal.status === "No_Show" && (
                          <div className="flex items-start gap-2 text-xs">
                            <div className="w-1.5 h-1.5 rounded-full bg-stone-400 mt-1.5 shrink-0" />
                            <div><span className="text-[#3B2515] font-medium">No Show</span></div>
                          </div>
                        )}
                        {detailModal.updatedAt && detailModal.updatedAt !== detailModal.createdAt && (
                          <div className="flex items-start gap-2 text-xs">
                            <div className="w-1.5 h-1.5 rounded-full bg-[#9C8268] mt-1.5 shrink-0" />
                            <div><span className="text-[#3B2515] font-medium">Updated</span><span className="text-[#9C8268] ml-2">{formatDate(detailModal.updatedAt)} {new Date(detailModal.updatedAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</span></div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
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
                  {editingId ? "Edit Reservation" : "Create Reservation"}
                </h3>
                <button onClick={() => setEditModal(false)} className="text-[#9C8268] hover:text-[#3B2515]"><X size={18} /></button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs text-[#A9805F] uppercase tracking-wide font-medium mb-1.5 block">
                    Customer Name <span className="text-rose-500">*</span>
                  </label>
                  <input value={form.customerName} onChange={(e) => setForm((f) => ({ ...f, customerName: e.target.value }))}
                    placeholder="Full name"
                    className="w-full rounded-xl border border-[#EDE1CF] px-3.5 py-2.5 text-sm text-[#3B2515] bg-white focus:outline-none focus:ring-2 focus:ring-[#B07B4F]/40" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-[#A9805F] uppercase tracking-wide font-medium mb-1.5 block">Phone Number</label>
                    <input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                      placeholder="+1 (555) 000-0000"
                      className="w-full rounded-xl border border-[#EDE1CF] px-3.5 py-2.5 text-sm text-[#3B2515] bg-white focus:outline-none focus:ring-2 focus:ring-[#B07B4F]/40" />
                  </div>
                  <div>
                    <label className="text-xs text-[#A9805F] uppercase tracking-wide font-medium mb-1.5 block">Email</label>
                    <input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                      placeholder="guest@example.com"
                      className="w-full rounded-xl border border-[#EDE1CF] px-3.5 py-2.5 text-sm text-[#3B2515] bg-white focus:outline-none focus:ring-2 focus:ring-[#B07B4F]/40" />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-[#A9805F] uppercase tracking-wide font-medium mb-1.5 block">
                    Party Size <span className="text-rose-500">*</span>
                  </label>
                  <input type="number" min="1" value={form.partySize} onChange={(e) => setForm((f) => ({ ...f, partySize: e.target.value }))}
                    className="w-full rounded-xl border border-[#EDE1CF] px-3.5 py-2.5 text-sm text-[#3B2515] bg-white focus:outline-none focus:ring-2 focus:ring-[#B07B4F]/40" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-[#A9805F] uppercase tracking-wide font-medium mb-1.5 block">Date <span className="text-rose-500">*</span></label>
                    <input type="date" value={form.reservationDate} onChange={(e) => setForm((f) => ({ ...f, reservationDate: e.target.value }))}
                      className="w-full rounded-xl border border-[#EDE1CF] px-3.5 py-2.5 text-sm text-[#3B2515] bg-white focus:outline-none focus:ring-2 focus:ring-[#B07B4F]/40" />
                  </div>
                  <div>
                    <label className="text-xs text-[#A9805F] uppercase tracking-wide font-medium mb-1.5 block">Time</label>
                    <input type="time" value={form.reservationTime} onChange={(e) => setForm((f) => ({ ...f, reservationTime: e.target.value }))}
                      className="w-full rounded-xl border border-[#EDE1CF] px-3.5 py-2.5 text-sm text-[#3B2515] bg-white focus:outline-none focus:ring-2 focus:ring-[#B07B4F]/40" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-[#A9805F] uppercase tracking-wide font-medium mb-1.5 block">Preferred Section</label>
                    <select value={form.preferredSection} onChange={(e) => setForm((f) => ({ ...f, preferredSection: e.target.value }))}
                      className="w-full rounded-xl border border-[#EDE1CF] px-3.5 py-2.5 text-sm text-[#3B2515] bg-white focus:outline-none focus:ring-2 focus:ring-[#B07B4F]/40">
                      <option value="">Any Section</option>
                      {SECTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-[#A9805F] uppercase tracking-wide font-medium mb-1.5 block">Table</label>
                    <select value={form.tableId} onChange={(e) => setForm((f) => ({ ...f, tableId: e.target.value }))}
                      className="w-full rounded-xl border border-[#EDE1CF] px-3.5 py-2.5 text-sm text-[#3B2515] bg-white focus:outline-none focus:ring-2 focus:ring-[#B07B4F]/40">
                      <option value="">Auto assign</option>
                      {loadingTables ? (
                        <option disabled>Loading tables...</option>
                      ) : (
                        availableTables.map((t) => {
                          const tid = t._id || t.id;
                          const tnum = t.tableNumber;
                          const cap = t.capacity ? `(cap: ${t.capacity})` : "";
                          return <option key={tid} value={tid}>Table {tnum} {cap}</option>;
                        })
                      )}
                    </select>
                    {form.reservationDate && form.reservationTime && form.partySize && (
                      <p className="text-[10px] text-[#A9805F] mt-1">
                        {loadingTables ? "Checking available tables..." : `${availableTables.length} table(s) available`}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="text-xs text-[#A9805F] uppercase tracking-wide font-medium mb-1.5 block">Notes</label>
                  <textarea value={form.notes} rows={2} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                    placeholder="Internal notes"
                    className="w-full rounded-xl border border-[#EDE1CF] px-3.5 py-2.5 text-sm text-[#3B2515] bg-white focus:outline-none focus:ring-2 focus:ring-[#B07B4F]/40 resize-none" />
                </div>

                <div>
                  <label className="text-xs text-[#A9805F] uppercase tracking-wide font-medium mb-1.5 block">Special Requests</label>
                  <textarea value={form.specialRequests} rows={2} onChange={(e) => setForm((f) => ({ ...f, specialRequests: e.target.value }))}
                    placeholder="Allergies, celebrations, seating preferences..."
                    className="w-full rounded-xl border border-[#EDE1CF] px-3.5 py-2.5 text-sm text-[#3B2515] bg-white focus:outline-none focus:ring-2 focus:ring-[#B07B4F]/40 resize-none" />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button onClick={() => setEditModal(false)}
                    className="rounded-full border border-[#EDE1CF] px-4 py-2 text-sm text-[#7B4B2A] hover:bg-[#FBF6EF] transition-colors">
                    Cancel
                  </button>
                  <button onClick={handleSave}
                    className="rounded-full bg-[#B07B4F] text-white px-4 py-2 text-sm font-medium hover:bg-[#C9925F] transition-colors">
                    {editingId ? "Save Changes" : "Create Reservation"}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function CountdownTimer({ targetDate, targetTime }) {
  const [remaining, setRemaining] = useState("");

  useEffect(() => {
    if (!targetDate) return;
    const target = new Date(targetDate + "T" + (targetTime || "00:00"));
    const tick = () => {
      const diff = target.getTime() - Date.now();
      if (diff <= 0) { setRemaining("Now"); return; }
      const hours = Math.floor(diff / 3600000);
      const minutes = Math.floor((diff % 3600000) / 60000);
      if (hours > 0) setRemaining(`${hours}h ${minutes}m`);
      else setRemaining(`${minutes}m`);
    };
    tick();
    const id = setInterval(tick, 30000);
    return () => clearInterval(id);
  }, [targetDate, targetTime]);

  if (!remaining) return null;
  return (
    <div className="flex items-center gap-1 text-[10px] text-[#B07B4F] bg-[#FBF6EF] rounded-full px-2.5 py-1 font-medium">
      <Timer size={10} /> {remaining}
    </div>
  );
}

function AssignTableDropdown({ reservationId, currentTableId, currentTableNumber, partySize, date, time, onAssign }) {
  const [open, setOpen] = useState(false);
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    (async () => {
      try {
        const data = await dataService.fetchAvailableTables({ date, time, partySize });
        const list = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : Array.isArray(data?.tables) ? data.tables : [];
        setTables(list);
      } catch {
        setTables([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [open, date, time, partySize]);

  return (
    <div className="relative">
      <button onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 rounded-full bg-[#FBF6EF] px-3 py-1.5 text-xs text-[#7B4B2A] hover:bg-[#EDE1CF] transition-colors">
        <MapPin size={11} /> {currentTableNumber ? `Table ${currentTableNumber}` : "Assign Table"}
      </button>
      {open && (
        <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
          className="absolute right-0 top-full mt-1 z-10 w-52 bg-white rounded-xl shadow-lg ring-1 ring-[#EDE1CF] p-2 max-h-48 overflow-y-auto">
          {loading ? (
            <p className="text-xs text-[#9C8268] p-2">Loading...</p>
          ) : tables.length === 0 ? (
            <p className="text-xs text-[#9C8268] p-2">No tables available</p>
          ) : (
            tables.map((t) => {
              const tid = t._id || t.id;
              const isCurrent = tid === currentTableId;
              return (
                <button key={tid} onClick={() => { onAssign(reservationId, tid); setOpen(false); }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors ${
                    isCurrent ? "bg-[#B07B4F]/10 text-[#B07B4F] font-medium" : "text-[#3B2515] hover:bg-[#FBF6EF]"
                  }`}>
                  Table {t.tableNumber} {t.capacity ? `(cap: ${t.capacity})` : ""}
                  {isCurrent && " (current)"}
                </button>
              );
            })
          )}
        </motion.div>
      )}
    </div>
  );
}
