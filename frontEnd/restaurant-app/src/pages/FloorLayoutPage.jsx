import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, X, Users, Hash, MapPin, Lock, Unlock, Merge, Split,
  MoveRight, RotateCcw, QrCode, AlertCircle, CheckCircle, Download, Wifi, WifiOff,
} from "lucide-react";
import * as dataService from "../services/data.js";
import useSocket from "../hooks/useSocket.js";
import { TableGridSkeleton } from "../components/ui/Skeleton.jsx";

const SECTIONS = ["All", "Indoor", "Outdoor", "VIP", "Family", "Bar", "Terrace"];

const STATUS_COLORS = {
  available: "bg-emerald-400 border-emerald-300",
  reserved: "bg-sky-400 border-sky-300",
  occupied: "bg-amber-400 border-amber-300",
  ordering: "bg-orange-400 border-orange-300",
  preparing: "bg-yellow-400 border-yellow-300",
  serving: "bg-teal-400 border-teal-300",
  dining: "bg-blue-400 border-blue-300",
  waiting_for_bill: "bg-purple-400 border-purple-300",
  payment: "bg-violet-400 border-violet-300",
  needs_cleaning: "bg-slate-400 border-slate-300",
  out_of_service: "bg-red-400 border-red-300",
};

const STATUS_LABELS = {
  available: "Available",
  reserved: "Reserved",
  occupied: "Occupied",
  ordering: "Ordering",
  preparing: "Preparing",
  serving: "Serving",
  dining: "Dining",
  waiting_for_bill: "Waiting for Bill",
  payment: "Payment",
  needs_cleaning: "Needs Cleaning",
  out_of_service: "Out of Service",
};

const STATUS_BG = {
  available: "bg-emerald-50 text-emerald-700 border-emerald-200",
  reserved: "bg-sky-50 text-sky-700 border-sky-200",
  occupied: "bg-amber-50 text-amber-700 border-amber-200",
  ordering: "bg-orange-50 text-orange-700 border-orange-200",
  preparing: "bg-yellow-50 text-yellow-700 border-yellow-200",
  serving: "bg-teal-50 text-teal-700 border-teal-200",
  dining: "bg-blue-50 text-blue-700 border-blue-200",
  waiting_for_bill: "bg-purple-50 text-purple-700 border-purple-200",
  payment: "bg-violet-50 text-violet-700 border-violet-200",
  needs_cleaning: "bg-slate-50 text-slate-700 border-slate-200",
  out_of_service: "bg-red-50 text-red-700 border-red-200",
};

const _MOCK_TABLES = [
  { _id: "mock1", tableNumber: 1, capacity: 2, status: "available", section: "Indoor", x: 5, y: 8, guestCount: 0, notes: "Near window", isLocked: false },
  { _id: "mock2", tableNumber: 2, capacity: 4, status: "occupied", section: "Indoor", x: 22, y: 8, guestCount: 3, notes: "", isLocked: false },
  { _id: "mock3", tableNumber: 3, capacity: 4, status: "dining", section: "Indoor", x: 39, y: 8, guestCount: 4, notes: "Birthday celebration", isLocked: false },
  { _id: "mock4", tableNumber: 4, capacity: 6, status: "reserved", section: "Indoor", x: 56, y: 8, guestCount: 0, notes: "", isLocked: false },
  { _id: "mock5", tableNumber: 5, capacity: 2, status: "available", section: "Indoor", x: 73, y: 8, guestCount: 0, notes: "", isLocked: false },
  { _id: "mock6", tableNumber: 6, capacity: 4, status: "preparing", section: "Outdoor", x: 5, y: 40, guestCount: 2, notes: "", isLocked: false },
  { _id: "mock7", tableNumber: 7, capacity: 8, status: "occupied", section: "VIP", x: 22, y: 40, guestCount: 6, notes: "VIP guests", isLocked: false },
  { _id: "mock8", tableNumber: 8, capacity: 4, status: "serving", section: "Outdoor", x: 39, y: 40, guestCount: 3, notes: "", isLocked: false },
  { _id: "mock9", tableNumber: 9, capacity: 2, status: "ordering", section: "Bar", x: 56, y: 40, guestCount: 1, notes: "", isLocked: false },
  { _id: "mock10", tableNumber: 10, capacity: 6, status: "waiting_for_bill", section: "Family", x: 73, y: 40, guestCount: 5, notes: "Allergy: nuts", isLocked: false },
  { _id: "mock11", tableNumber: 11, capacity: 4, status: "needs_cleaning", section: "Indoor", x: 12, y: 68, guestCount: 0, notes: "", isLocked: false },
  { _id: "mock12", tableNumber: 12, capacity: 2, status: "out_of_service", section: "Terrace", x: 29, y: 68, guestCount: 0, notes: "Broken leg", isLocked: true },
  { _id: "mock13", tableNumber: 13, capacity: 4, status: "payment", section: "Bar", x: 46, y: 68, guestCount: 2, notes: "", isLocked: false },
  { _id: "mock14", tableNumber: 14, capacity: 6, status: "available", section: "Family", x: 63, y: 68, guestCount: 0, notes: "", isLocked: false },
  { _id: "mock15", tableNumber: 15, capacity: 4, status: "available", section: "Terrace", x: 78, y: 68, guestCount: 0, notes: "Best view", isLocked: false },
];

export default function FloorLayoutPage() {
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTable, setSelectedTable] = useState(null);
  const [showPositionEditor, setShowPositionEditor] = useState(false);
  const [posForm, setPosForm] = useState({ x: 0, y: 0 });
  const [notif, setNotif] = useState(null);
  const [showDetail, setShowDetail] = useState(null);
  const [qrCodeUrl, setQrCodeUrl] = useState(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const [apiFailed, setApiFailed] = useState(false);
  const loadTablesRef = useRef(null);

  const showNotif = useCallback((msg, type = "success") => {
    setNotif({ msg, type });
    setTimeout(() => setNotif(null), 3000);
  }, []);

  const loadTables = useCallback(async () => {
    setLoading(true);
    setApiFailed(false);
    try {
      const data = await dataService.fetchAllTables();
      const enriched = data.map((t) => {
        const status = (t.status || "available").toLowerCase().replace(/\s+/g, "_");
        return {
          ...t,
          id: t._id || t.id,
          status,
          x: t.x ?? 50,
          y: t.y ?? 50,
          section: t.section || "Indoor",
          guestCount: t.guestCount ?? 0,
          isLocked: t.isLocked ?? false,
          waiter: t.waiter || null,
          currentOrder: t.currentOrder || null,
          requests: t.requests || [],
        };
      });
      setTables(enriched);
    } catch (err) {
      setApiFailed(true);
      showNotif("Could not load table data. Please try again later.", "error");
    } finally {
      setLoading(false);
    }
  }, [showNotif]);

  loadTablesRef.current = loadTables;

  useEffect(() => { loadTables(); }, [loadTables]);

  const filtered = useMemo(() => {
    return tables.filter((t) => {
      if (activeSection !== "All" && t.section !== activeSection) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (!String(t.tableNumber).includes(q)) return false;
      }
      return true;
    });
  }, [tables, activeSection, searchQuery]);

  const handleSocketTableUpdate = useCallback((_data) => {
    loadTablesRef.current?.();
  }, []);

  useSocket({
    "table:statusChanged": handleSocketTableUpdate,
    "table:updated": handleSocketTableUpdate,
    connect: () => setSocketConnected(true),
    disconnect: () => setSocketConnected(false),
    reconnect_attempt: () => setSocketConnected(false),
  });

  const handleTableClick = useCallback(async (table) => {
    try {
      const details = await dataService.fetchTableWithDetails(table._id);
      setShowDetail({ ...table, ...details });
    } catch {
      const mockOrder = table.currentOrder || null;
      setShowDetail({
        ...table,
        currentOrder: mockOrder || (table.status === "occupied" || table.status === "dining" || table.status === "serving" ? {
          id: `ORD-${Date.now()}`,
          items: [
            { name: "Grilled Salmon", qty: 2, price: 22.50 },
            { name: "Caesar Salad", qty: 1, price: 12.00 },
          ],
          total: 57.00,
          createdAt: new Date().toISOString(),
          status: "In Progress",
        } : null),
        waiter: table.waiter || "Sarah",
        requests: table.requests?.length > 0 ? table.requests : ["Extra napkins", "More water"],
      });
    }
  }, []);

  const handleLockToggle = async () => {
    if (!showDetail) return;
    try {
      if (showDetail.isLocked) {
        await dataService.unlockTable(showDetail._id);
        showNotif(`Table ${showDetail.tableNumber} unlocked`);
      } else {
        await dataService.lockTable(showDetail._id);
        showNotif(`Table ${showDetail.tableNumber} locked`);
      }
      loadTables();
      setShowDetail((prev) => ({ ...prev, isLocked: !prev.isLocked }));
    } catch (err) {
      showNotif(err.message, "error");
    }
  };

  const handleChangeNumber = async () => {
    if (!showDetail) return;
    const newNum = window.prompt("New table number:", showDetail.tableNumber);
    if (!newNum || isNaN(newNum)) return;
    try {
      await dataService.changeTableNumber(showDetail._id, Number(newNum));
      showNotif(`Table renamed to ${newNum}`);
      loadTables();
      setShowDetail(null);
    } catch (err) {
      showNotif(err.message, "error");
    }
  };

  const handleMerge = async () => {
    if (!showDetail) return;
    const target = window.prompt("Enter table number to merge with:");
    if (!target) return;
    try {
      const targetTable = tables.find((t) => t.tableNumber === Number(target));
      if (!targetTable) { showNotif("Target table not found", "error"); return; }
      await dataService.mergeTables({ sourceId: showDetail._id, targetId: targetTable._id });
      showNotif(`Table ${showDetail.tableNumber} merged with Table ${target}`);
      loadTables();
      setShowDetail(null);
    } catch (err) {
      showNotif(err.message, "error");
    }
  };

  const handleSplit = async () => {
    if (!showDetail) return;
    try {
      await dataService.splitTables(showDetail._id);
      showNotif(`Table ${showDetail.tableNumber} split`);
      loadTables();
      setShowDetail(null);
    } catch (err) {
      showNotif(err.message, "error");
    }
  };

  const handleMoveOrder = async () => {
    if (!showDetail) return;
    const target = window.prompt("Move order to table number:");
    if (!target) return;
    try {
      const targetTable = tables.find((t) => t.tableNumber === Number(target));
      if (!targetTable) { showNotif("Target table not found", "error"); return; }
      await dataService.moveOrderToTable({ fromTableId: showDetail._id, toTableId: targetTable._id });
      showNotif(`Order moved to Table ${target}`);
      loadTables();
      setShowDetail(null);
    } catch (err) {
      showNotif(err.message, "error");
    }
  };

  const handleReopen = async () => {
    if (!showDetail) return;
    try {
      await dataService.reopenTable(showDetail.tableNumber);
      showNotif(`Table ${showDetail.tableNumber} reopened`);
      loadTables();
      setShowDetail(null);
    } catch (err) {
      showNotif(err.message, "error");
    }
  };

  const handleViewQR = async (table) => {
    if (!table) return;
    try {
      const data = await dataService.fetchTableQRCode(table._id);
      setQrCodeUrl(data.qrCode);
    } catch {
      showNotif("Could not load QR code", "error");
    }
  };

  const openPositionEditor = (table) => {
    setPosForm({ x: table.x, y: table.y });
    setSelectedTable(table);
    setShowPositionEditor(true);
  };

  const savePosition = async () => {
    if (!selectedTable) return;
    try {
      await dataService.updateTableLayout(selectedTable._id, { x: posForm.x, y: posForm.y });
      showNotif(`Table ${selectedTable.tableNumber} position updated`);
      loadTables();
      setShowPositionEditor(false);
      setSelectedTable(null);
    } catch (err) {
      showNotif(err.message, "error");
    }
  };

  const statusColor = (s) => STATUS_COLORS[s] || STATUS_COLORS.available;
  const statusLabel = (s) => STATUS_LABELS[s] || s;
  const statusBg = (s) => STATUS_BG[s] || STATUS_BG.available;

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-xl text-[#3B2515] flex items-center gap-2">
            <MapPin size={18} /> Floor Layout
          </h2>
          <p className="text-xs text-[#A9805F] mt-0.5">Visual table management</p>
        </div>
        <div className="relative w-full sm:w-56">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A9805F]" />
          <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search table number..."
            className="w-full rounded-full border border-[#EDE1CF] bg-white pl-9 pr-4 py-2 text-sm text-[#3B2515] outline-none focus:ring-2 focus:ring-[#B07B4F]/40" />
          {!socketConnected && (
            <span className="inline-flex items-center gap-1 text-xs text-amber-600 bg-amber-50 rounded-full px-2.5 py-1 ml-2">
              <WifiOff size={11} /> Reconnecting...
            </span>
          )}
          {socketConnected && (
            <span className="inline-flex items-center gap-1 text-xs text-emerald-600 bg-emerald-50 rounded-full px-2.5 py-1 ml-2">
              <Wifi size={11} /> Live
            </span>
          )}
        </div>
      </div>

      {apiFailed && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-700 flex items-center gap-2">
          <AlertCircle size={15} />
          Could not load live table data.{' '}
          <button onClick={loadTables} className="underline font-medium hover:text-amber-800">Retry</button>
        </div>
      )}

      {notif && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          role={notif.type === "error" ? "alert" : "status"}
          aria-live={notif.type === "error" ? "assertive" : "polite"}
          aria-atomic="true"
          className={`rounded-xl px-4 py-3 text-sm flex items-center gap-2 ${
            notif.type === "error"
              ? "bg-rose-50 border border-rose-200 text-rose-700"
              : "bg-emerald-50 border border-emerald-200 text-emerald-700"
          }`}>
          {notif.type === "error" ? <AlertCircle size={15} /> : <CheckCircle size={15} />}
          <span>{notif.msg}</span>
          <button onClick={() => setNotif(null)}
            className="ml-auto text-current opacity-60 hover:opacity-100"
            aria-label="Dismiss notification">
            <X size={14} />
          </button>
        </motion.div>
      )}

      <div className="flex gap-2 overflow-x-auto pb-1">
        {SECTIONS.map((s) => (
          <button key={s} onClick={() => setActiveSection(s)}
            className={`whitespace-nowrap rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
              activeSection === s
                ? "bg-[#3B2515] text-[#F3E5D3]"
                : "bg-white text-[#7B4B2A] ring-1 ring-[#EDE1CF] hover:bg-[#FBF6EF]"
            }`}>
            {s}
          </button>
        ))}
      </div>

      {loading ? (
        <TableGridSkeleton count={10} />
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-[#9C8268] text-sm">
          {searchQuery ? "No tables match your search" : "No tables in this section"}
        </div>
      ) : (
        <>
          <div className="relative w-full rounded-2xl bg-[#F3E5D3] ring-1 ring-[#EDE1CF] overflow-hidden"
            style={{ minHeight: 400, height: "60vh", maxHeight: 700 }}>
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMCAwaDQwdjQwSDB6IiBmaWxsPSJub25lIi8+PHBhdGggZD0iTTQwIDBIMHY0MCIgc3Ryb2tlPSIjZThkNmJmIiBzdHJva2Utd2lkdGg9IjAuNSIgc3Ryb2tlLW9wYWNpdHk9IjAuNCIvPjwvc3ZnPg==')] opacity-50" />
            {filtered.map((table) => (
              <motion.button key={table.id || table._id} layout
                onClick={() => handleTableClick(table)}
                onDoubleClick={() => openPositionEditor(table)}
                style={{ left: `${table.x}%`, top: `${table.y}%` }}
                className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer group">
                <div className={`relative rounded-2xl bg-white ring-2 shadow-lg p-3 transition-all hover:shadow-xl hover:scale-105 ${statusColor(table.status).split(" ")[0]} ${statusColor(table.status).split(" ")[1]}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-[#3B2515] font-serif">#{table.tableNumber}</span>
                    <span className={`w-1.5 h-1.5 rounded-full ${statusColor(table.status).split(" ")[0]}`} />
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-[#9C8268]">
                    <Users size={9} />
                    <span>{table.capacity}</span>
                    {table.guestCount > 0 && (
                      <span className="ml-1 text-[#7B4B2A] font-medium">({table.guestCount})</span>
                    )}
                  </div>
                  {table.isLocked && (
                    <Lock size={10} className="absolute -top-1 -right-1 text-rose-500" />
                  )}
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-[9px] bg-[#3B2515] text-white rounded-full px-1.5 py-0.5 whitespace-nowrap">
                      {statusLabel(table.status)}
                    </span>
                  </div>
                </div>
              </motion.button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs text-[#9C8268]">
            <span className="text-[#7B4B2A] font-medium">Legend:</span>
            {Object.entries(STATUS_LABELS).map(([key, label]) => (
              <div key={key} className="flex items-center gap-1">
                <span className={`w-2 h-2 rounded-full ${STATUS_COLORS[key].split(" ")[0]}`} />
                <span>{label}</span>
              </div>
            ))}
          </div>
        </>
      )}

      <AnimatePresence>
        {showDetail && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
            onClick={() => setShowDetail(null)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[85vh] overflow-y-auto">
              <div className="sticky top-0 bg-white z-10 flex items-center justify-between px-6 py-4 border-b border-[#EDE1CF] rounded-t-2xl">
                <div className="flex items-center gap-3">
                  <div>
                    <h3 className="font-serif text-lg text-[#3B2515]">Table {showDetail.tableNumber}</h3>
                    <p className="text-xs text-[#A9805F]">{showDetail.section} &middot; Capacity: {showDetail.capacity}</p>
                  </div>
                </div>
                <button onClick={() => setShowDetail(null)} className="text-[#9C8268] hover:text-[#3B2515]">
                  <X size={18} />
                </button>
              </div>

              <div className="p-6 space-y-5">
                <div className="flex items-center justify-between">
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium ring-1 ${statusBg(showDetail.status)}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${STATUS_COLORS[showDetail.status]?.split(" ")[0] || "bg-emerald-400"}`} />
                    {statusLabel(showDetail.status)}
                  </span>
                  {showDetail.isLocked && (
                    <span className="flex items-center gap-1 text-xs text-rose-600 bg-rose-50 rounded-full px-3 py-1">
                      <Lock size={11} /> Locked
                    </span>
                  )}
                </div>

                {showDetail.waiter && (
                  <div>
                    <h4 className="text-xs text-[#A9805F] uppercase tracking-wide font-medium mb-1">Assigned Waiter</h4>
                    <p className="text-sm text-[#3B2515]">{showDetail.waiter}</p>
                  </div>
                )}

                {showDetail.currentOrder && (
                  <div>
                    <h4 className="text-xs text-[#A9805F] uppercase tracking-wide font-medium mb-2">Current Order</h4>
                    <div className="rounded-xl bg-[#FBF6EF] ring-1 ring-[#EDE1CF] p-4 space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-[#3B2515]">{showDetail.currentOrder.id}</span>
                        <span className={`text-[10px] font-medium rounded-full px-2 py-0.5 bg-amber-50 text-amber-700 ring-1 ring-amber-200`}>
                          {showDetail.currentOrder.status}
                        </span>
                      </div>
                      <div className="space-y-1">
                        {(showDetail.currentOrder.items || []).map((item, i) => (
                          <div key={i} className="flex items-center justify-between text-xs text-[#7B4B2A] py-0.5">
                            <span>{item.name} &times; {item.qty}</span>
                            <span>${(item.price * item.qty).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t border-[#EDE1CF] text-sm">
                        <span className="font-medium text-[#3B2515]">Total</span>
                        <span className="font-medium text-[#3B2515]">${Number(showDetail.currentOrder.total || 0).toFixed(2)}</span>
                      </div>
                      {showDetail.currentOrder.createdAt && (
                        <p className="text-[10px] text-[#9C8268]">{new Date(showDetail.currentOrder.createdAt).toLocaleString()}</p>
                      )}
                    </div>
                  </div>
                )}

                {showDetail.requests?.length > 0 && (
                  <div>
                    <h4 className="text-xs text-[#A9805F] uppercase tracking-wide font-medium mb-2">Active Requests</h4>
                    <div className="space-y-1.5">
                      {showDetail.requests.map((req, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs text-[#7B4B2A] bg-[#FBF6EF] rounded-xl px-3.5 py-2 ring-1 ring-[#EDE1CF]">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                          {req}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {showDetail.notes && (
                  <div>
                    <h4 className="text-xs text-[#A9805F] uppercase tracking-wide font-medium mb-1">Notes</h4>
                    <p className="text-sm text-[#7B4B2A] bg-[#FBF6EF] rounded-xl px-4 py-2">{showDetail.notes}</p>
                  </div>
                )}

                <div>
                  <h4 className="text-xs text-[#A9805F] uppercase tracking-wide font-medium mb-2">Actions</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={handleLockToggle}
                      className="flex items-center gap-1.5 rounded-xl bg-[#FBF6EF] ring-1 ring-[#EDE1CF] px-3 py-2 text-xs text-[#7B4B2A] hover:bg-[#EDE1CF] transition-colors">
                      {showDetail.isLocked ? <Unlock size={13} /> : <Lock size={13} />}
                      {showDetail.isLocked ? "Unlock" : "Lock"}
                    </button>
                    <button onClick={handleChangeNumber}
                      className="flex items-center gap-1.5 rounded-xl bg-[#FBF6EF] ring-1 ring-[#EDE1CF] px-3 py-2 text-xs text-[#7B4B2A] hover:bg-[#EDE1CF] transition-colors">
                      <Hash size={13} /> Change Number
                    </button>
                    <button onClick={handleMerge}
                      className="flex items-center gap-1.5 rounded-xl bg-[#FBF6EF] ring-1 ring-[#EDE1CF] px-3 py-2 text-xs text-[#7B4B2A] hover:bg-[#EDE1CF] transition-colors">
                      <Merge size={13} /> Merge
                    </button>
                    <button onClick={handleSplit}
                      className="flex items-center gap-1.5 rounded-xl bg-[#FBF6EF] ring-1 ring-[#EDE1CF] px-3 py-2 text-xs text-[#7B4B2A] hover:bg-[#EDE1CF] transition-colors">
                      <Split size={13} /> Split
                    </button>
                    <button onClick={handleReopen}
                      className="flex items-center gap-1.5 rounded-xl bg-[#FBF6EF] ring-1 ring-[#EDE1CF] px-3 py-2 text-xs text-[#7B4B2A] hover:bg-[#EDE1CF] transition-colors">
                      <RotateCcw size={13} /> Reopen
                    </button>
                    <button onClick={handleMoveOrder}
                      className="flex items-center gap-1.5 rounded-xl bg-[#FBF6EF] ring-1 ring-[#EDE1CF] px-3 py-2 text-xs text-[#7B4B2A] hover:bg-[#EDE1CF] transition-colors">
                      <MoveRight size={13} /> Move Order
                    </button>
                  </div>
                  <div className="mt-2">
                    <button onClick={() => handleViewQR(showDetail)}
                      className="flex items-center gap-1.5 rounded-xl bg-[#FBF6EF] ring-1 ring-[#EDE1CF] px-3 py-2 text-xs text-[#7B4B2A] hover:bg-[#EDE1CF] transition-colors w-full justify-center">
                      <QrCode size={13} /> View QR Code
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showPositionEditor && selectedTable && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
            onClick={() => { setShowPositionEditor(false); setSelectedTable(null); }}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-serif text-lg text-[#3B2515]">Table {selectedTable.tableNumber} Position</h3>
                <button onClick={() => { setShowPositionEditor(false); setSelectedTable(null); }}
                  className="text-[#9C8268] hover:text-[#3B2515]">
                  <X size={18} />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-[#A9805F] uppercase tracking-wide font-medium flex items-center gap-1.5 mb-1.5">
                    <MapPin size={13} /> X Position (%)
                  </label>
                  <input type="number" min="0" max="100" value={posForm.x}
                    onChange={(e) => setPosForm((f) => ({ ...f, x: Number(e.target.value) }))}
                    className="w-full rounded-xl border border-[#EDE1CF] px-3.5 py-2.5 text-sm text-[#3B2515] bg-white focus:outline-none focus:ring-2 focus:ring-[#B07B4F]/40" />
                </div>
                <div>
                  <label className="text-xs text-[#A9805F] uppercase tracking-wide font-medium flex items-center gap-1.5 mb-1.5">
                    <MapPin size={13} /> Y Position (%)
                  </label>
                  <input type="number" min="0" max="100" value={posForm.y}
                    onChange={(e) => setPosForm((f) => ({ ...f, y: Number(e.target.value) }))}
                    className="w-full rounded-xl border border-[#EDE1CF] px-3.5 py-2.5 text-sm text-[#3B2515] bg-white focus:outline-none focus:ring-2 focus:ring-[#B07B4F]/40" />
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button onClick={() => { setShowPositionEditor(false); setSelectedTable(null); }}
                    className="rounded-full border border-[#EDE1CF] px-4 py-2 text-sm text-[#7B4B2A] hover:bg-[#FBF6EF] transition-colors">
                    Cancel
                  </button>
                  <button onClick={savePosition}
                    className="rounded-full bg-[#B07B4F] text-white px-4 py-2 text-sm font-medium hover:bg-[#C9925F] transition-colors">
                    Save Position
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {qrCodeUrl && showDetail && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
            onClick={() => { setQrCodeUrl(null); }}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 text-center">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-serif text-lg text-[#3B2515]">Table {showDetail.tableNumber} QR Code</h3>
                <button onClick={() => setQrCodeUrl(null)} className="text-[#9C8268] hover:text-[#3B2515]">
                  <X size={18} />
                </button>
              </div>
              <img src={qrCodeUrl} alt={`Table ${showDetail.tableNumber} QR`}
                className="w-64 h-64 mx-auto rounded-xl ring-1 ring-[#EDE1CF] p-2" />
              <p className="text-xs text-[#9C8268] mt-3">Scan to access table menu &amp; order</p>
              <div className="flex gap-2 mt-4 justify-center">
                <button onClick={() => {
                  const link = document.createElement("a");
                  link.download = `table-${showDetail.tableNumber}-qr.png`;
                  link.href = qrCodeUrl;
                  link.click();
                }}
                  className="flex items-center gap-1.5 rounded-full bg-[#FBF6EF] ring-1 ring-[#EDE1CF] px-4 py-2 text-xs text-[#7B4B2A] hover:bg-[#EDE1CF] transition-colors">
                  <Download size={13} /> Download
                </button>
                <button onClick={() => {
                  const win = window.open("", "_blank");
                  win.document.write(`
                    <html><head><title>Table ${showDetail.tableNumber} QR</title>
                    <style>body{display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;margin:0;padding:20px;text-align:center}
                    img{max-width:400px} h2{margin-top:20px;color:#3B2515} p{color:#9C8268;font-size:14px}
                    @media print{body{break-after:page}}</style></head>
                    <body><img src="${qrCodeUrl}" alt="QR"/><h2>Table ${showDetail.tableNumber}</h2><p>Scan to order</p></body></html>
                  `);
                  win.document.close();
                  setTimeout(() => { win.print(); }, 500);
                }}
                  className="flex items-center gap-1.5 rounded-full bg-[#FBF6EF] ring-1 ring-[#EDE1CF] px-4 py-2 text-xs text-[#7B4B2A] hover:bg-[#EDE1CF] transition-colors">
                  <Download size={13} /> Print
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
