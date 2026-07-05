import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Trash2, Edit3, QrCode, Download, Printer, X, Search,
  Users, Hash, AlertCircle, CheckCircle, SquareStack,
} from "lucide-react";
import * as dataService from "../services/data.js";

const INITIAL_FORM = { tableNumber: "", capacity: "4", notes: "" };

function toCanvas(url) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = img.width;
      c.height = img.height;
      c.getContext("2d").drawImage(img, 0, 0);
      resolve(c);
    };
    img.src = url;
  });
}

export default function TableManagementPage() {
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(INITIAL_FORM);
  const [qrData, setQrData] = useState(null);
  const [notif, setNotif] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  const showNotif = useCallback((msg, type = "success") => {
    setNotif({ msg, type });
    setTimeout(() => setNotif(null), 3000);
  }, []);

  const loadTables = useCallback(async () => {
    setLoading(true);
    try {
      const data = await dataService.fetchAllTables();
      setTables(data);
    } catch (err) {
      showNotif(err.message, "error");
    } finally {
      setLoading(false);
    }
  }, [showNotif]);

  useEffect(() => { loadTables(); }, [loadTables]);

  const openCreate = () => {
    setEditing(null);
    setForm(INITIAL_FORM);
    setQrData(null);
    setShowModal(true);
  };

  const openEdit = (table) => {
    setEditing(table);
    setForm({
      tableNumber: String(table.tableNumber),
      capacity: String(table.capacity),
      notes: table.notes || "",
    });
    setQrData(null);
    setShowModal(true);
  };

  const handleSave = async () => {
    const num = Number(form.tableNumber);
    if (!num || num < 1) { showNotif("Table number must be positive", "error"); return; }
    const cap = Math.max(Number(form.capacity) || 4, 1);
    try {
      if (editing) {
        await dataService.updateTableById(editing._id, {
          tableNumber: num,
          capacity: cap,
          notes: form.notes,
        });
        showNotif(`Table ${num} updated`);
      } else {
        await dataService.createTable({
          tableNumber: num,
          capacity: cap,
          notes: form.notes,
        });
        showNotif(`Table ${num} created`);
      }
      setShowModal(false);
      loadTables();
    } catch (err) {
      showNotif(err.message, "error");
    }
  };

  const handleDelete = async (table) => {
    if (!window.confirm(`Delete Table ${table.tableNumber}?`)) return;
    try {
      await dataService.deleteTableById(table._id);
      showNotif(`Table ${table.tableNumber} deleted`);
      loadTables();
    } catch (err) {
      showNotif(err.message, "error");
    }
  };

  const handleQR = async (table) => {
    try {
      const data = await dataService.fetchTableQRCode(table._id);
      setQrData(data);
      setForm({ tableNumber: String(table.tableNumber), capacity: String(table.capacity), notes: table.notes || "" });
      setEditing(table);
      setShowModal(true);
    } catch (err) {
      showNotif(err.message, "error");
    }
  };

  const downloadQR = async () => {
    if (!qrData?.qrCode) return;
    const canvas = await toCanvas(qrData.qrCode);
    const link = document.createElement("a");
    link.download = `table-${form.tableNumber}-qr.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  const printQR = async () => {
    if (!qrData?.qrCode) return;
    const win = window.open("", "_blank");
    win.document.write(`
      <html><head><title>Table ${form.tableNumber} QR</title>
      <style>body{display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;margin:0;padding:20px;text-align:center}
      img{max-width:400px} h2{margin-top:20px;color:#3B2515} p{color:#9C8268;font-size:14px}
      @media print{body{break-after:page}}</style></head>
      <body><img src="${qrData.qrCode}" alt="QR"/><h2>Table ${form.tableNumber}</h2><p>Scan to order</p></body></html>
    `);
    win.document.close();
    setTimeout(() => { win.print(); }, 500);
  };

  const filtered = tables.filter((t) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      String(t.tableNumber).includes(q) ||
      t.status?.toLowerCase().includes(q) ||
      t.notes?.toLowerCase().includes(q)
    );
  });

  const statusDot = (s) => {
    if (s === "Available") return "bg-emerald-400";
    if (s === "Occupied") return "bg-amber-400";
    return "bg-sky-400";
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-xl text-[#3B2515] flex items-center gap-2">
            <SquareStack size={18} /> Table Management
          </h2>
          <p className="text-xs text-[#A9805F] mt-0.5">Create and manage QR code tables</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-initial">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A9805F]" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tables..."
              className="w-full sm:w-48 rounded-full border border-[#EDE1CF] bg-white pl-9 pr-4 py-2 text-sm text-[#3B2515] outline-none focus:ring-2 focus:ring-[#B07B4F]/40"
            />
          </div>
          <button onClick={openCreate}
            className="flex items-center gap-1.5 rounded-full bg-[#B07B4F] text-white px-4 py-2 text-sm font-medium hover:bg-[#C9925F] transition-colors">
            <Plus size={15} /> Add Table
          </button>
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

      {loading ? (
        <div className="text-center py-12 text-[#9C8268] text-sm">Loading tables...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-[#9C8268] text-sm">
          {searchQuery ? "No tables match your search" : "No tables yet. Click 'Add Table' to create one."}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((table) => (
            <motion.div key={table._id} layout
              className="rounded-2xl bg-white ring-1 ring-[#EDE1CF] shadow-sm shadow-[#3B2515]/5 p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-serif text-lg text-[#3B2515]">Table {table.tableNumber}</h3>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className={`w-2 h-2 rounded-full ${statusDot(table.status)}`} />
                    <span className="text-xs text-[#9C8268]">{table.status}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-[#9C8268] bg-[#FBF6EF] rounded-full px-2.5 py-1">
                  <Users size={12} /> {table.capacity}
                </div>
              </div>
              {table.notes && (
                <p className="text-xs text-[#A9805F] mb-3 line-clamp-2">{table.notes}</p>
              )}
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[#EDE1CF]">
                <button onClick={() => openEdit(table)}
                  className="flex items-center gap-1 rounded-full bg-[#FBF6EF] px-3 py-1.5 text-xs text-[#7B4B2A] hover:bg-[#EDE1CF] transition-colors">
                  <Edit3 size={12} /> Edit
                </button>
                <button onClick={() => handleQR(table)}
                  className="flex items-center gap-1 rounded-full bg-[#FBF6EF] px-3 py-1.5 text-xs text-[#7B4B2A] hover:bg-[#EDE1CF] transition-colors">
                  <QrCode size={12} /> QR
                </button>
                <button onClick={() => handleDelete(table)}
                  className="flex items-center gap-1 rounded-full bg-rose-50 px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-100 transition-colors ml-auto">
                  <Trash2 size={12} /> Delete
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {showModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
            onClick={() => { if (!qrData) setShowModal(false); }}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-serif text-lg text-[#3B2515]">
                  {qrData ? `Table ${form.tableNumber} QR Code` : editing ? "Edit Table" : "Create Table"}
                </h3>
                <button onClick={() => { setShowModal(false); setQrData(null); }}
                  className="text-[#9C8268] hover:text-[#3B2515]">
                  <X size={18} />
                </button>
              </div>

              {qrData ? (
                <div className="text-center space-y-4">
                  <img src={qrData.qrCode} alt="QR Code" className="mx-auto w-56 h-56 rounded-xl ring-1 ring-[#EDE1CF]" />
                  <p className="text-xs text-[#9C8268] break-all">{qrData.url}</p>
                  <div className="flex items-center justify-center gap-3">
                    <button onClick={downloadQR}
                      className="flex items-center gap-1.5 rounded-full bg-[#B07B4F] text-white px-4 py-2 text-sm hover:bg-[#C9925F] transition-colors">
                      <Download size={14} /> Download
                    </button>
                    <button onClick={printQR}
                      className="flex items-center gap-1.5 rounded-full border border-[#EDE1CF] text-[#7B4B2A] px-4 py-2 text-sm hover:bg-[#FBF6EF] transition-colors">
                      <Printer size={14} /> Print
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-[#A9805F] uppercase tracking-wide font-medium flex items-center gap-1.5 mb-1.5">
                      <Hash size={13} /> Table Number
                    </label>
                    <input type="number" min="1" value={form.tableNumber}
                      onChange={(e) => setForm((f) => ({ ...f, tableNumber: e.target.value }))}
                      className="w-full rounded-xl border border-[#EDE1CF] px-3.5 py-2.5 text-sm text-[#3B2515] bg-white focus:outline-none focus:ring-2 focus:ring-[#B07B4F]/40" />
                  </div>
                  <div>
                    <label className="text-xs text-[#A9805F] uppercase tracking-wide font-medium flex items-center gap-1.5 mb-1.5">
                      <Users size={13} /> Capacity
                    </label>
                    <input type="number" min="1" value={form.capacity}
                      onChange={(e) => setForm((f) => ({ ...f, capacity: e.target.value }))}
                      className="w-full rounded-xl border border-[#EDE1CF] px-3.5 py-2.5 text-sm text-[#3B2515] bg-white focus:outline-none focus:ring-2 focus:ring-[#B07B4F]/40" />
                  </div>
                  <div>
                    <label className="text-xs text-[#A9805F] uppercase tracking-wide font-medium mb-1.5 block">Notes</label>
                    <textarea value={form.notes} rows={2}
                      onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                      className="w-full rounded-xl border border-[#EDE1CF] px-3.5 py-2.5 text-sm text-[#3B2515] bg-white focus:outline-none focus:ring-2 focus:ring-[#B07B4F]/40 resize-none" />
                  </div>
                  <div className="flex justify-end gap-3 pt-2">
                    <button onClick={() => setShowModal(false)}
                      className="rounded-full border border-[#EDE1CF] px-4 py-2 text-sm text-[#7B4B2A] hover:bg-[#FBF6EF] transition-colors">
                      Cancel
                    </button>
                    <button onClick={handleSave}
                      className="rounded-full bg-[#B07B4F] text-white px-4 py-2 text-sm font-medium hover:bg-[#C9925F] transition-colors">
                      {editing ? "Save Changes" : "Create Table"}
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
