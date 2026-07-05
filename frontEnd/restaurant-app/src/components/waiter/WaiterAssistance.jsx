import { useState, useCallback, useRef, useEffect } from "react";
import { Bell, Receipt, Droplets, Utensils, HelpCircle, Flame, Sparkles, CheckCircle, Loader, X } from "lucide-react";
import * as waiterService from "../../services/waiter.js";

const REQUEST_OPTIONS = [
  { key: "call_waiter", label: "Call Waiter", icon: Bell, color: "bg-amber-50 text-amber-700 ring-amber-200 hover:bg-amber-100" },
  { key: "water", label: "Water", icon: Droplets, color: "bg-sky-50 text-sky-700 ring-sky-200 hover:bg-sky-100" },
  { key: "cutlery", label: "Cutlery", icon: Utensils, color: "bg-stone-50 text-stone-700 ring-stone-200 hover:bg-stone-100" },
  { key: "napkins", label: "Napkins", icon: Sparkles, color: "bg-pink-50 text-pink-700 ring-pink-200 hover:bg-pink-100" },
  { key: "sauce", label: "Sauce", icon: Flame, color: "bg-orange-50 text-orange-700 ring-orange-200 hover:bg-orange-100" },
  { key: "assistance", label: "Assistance", icon: HelpCircle, color: "bg-purple-50 text-purple-700 ring-purple-200 hover:bg-purple-100" },
];

export default function WaiterAssistance() {
  const [activeRequest, setActiveRequest] = useState(null);
  const [loading, setLoading] = useState(null);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  const handleRequest = useCallback(async (type) => {
    if (loading) return;
    setLoading(type);
    setError("");
    setSuccess("");
    setActiveRequest(type);
    try {
      const serviceMap = {
        call_waiter: waiterService.callWaiter,
        water: waiterService.requestWater,
        cutlery: waiterService.requestCutlery,
        napkins: waiterService.requestNapkins,
        sauce: waiterService.requestSauce,
        assistance: waiterService.requestAssistance,
      };
      const fn = serviceMap[type];
      if (fn) await fn();
      setSuccess(getSuccessMessage(type));
    } catch (err) {
      setError(err.message || "Could not send request.");
    } finally {
      setLoading(null);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => { setActiveRequest(null); setSuccess(""); }, 3000);
    }
  }, [loading]);

  const handleBillRequest = useCallback(async () => {
    if (loading) return;
    setLoading("bill");
    setError("");
    setSuccess("");
    try {
      await waiterService.requestBill();
      setSuccess("Bill request sent to your server.");
    } catch (err) {
      setError(err.message || "Could not request bill.");
    } finally {
      setLoading(null);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setSuccess(""), 3000);
    }
  }, [loading]);

  const getSuccessMessage = (type) => {
    const map = {
      call_waiter: "A staff member will be right with you.",
      water: "Water request sent.",
      cutlery: "Cutlery request sent.",
      napkins: "Napkins request sent.",
      sauce: "Sauce request sent.",
      assistance: "Assistance request sent.",
    };
    return map[type] || "Request sent.";
  };

  return (
    <div className="relative">
      {!expanded ? (
        <button
          onClick={() => setExpanded(true)}
          className="flex items-center gap-1.5 rounded-xl bg-[#FBF6EF] ring-1 ring-[#EDE1CF] px-3 py-2 text-xs font-medium text-[#7B4B2A] hover:bg-[#EDE1CF] transition-colors"
        >
          <Bell size={14} />
          Service
        </button>
      ) : (
        <div className="absolute right-0 top-0 z-50 w-72 bg-white rounded-2xl shadow-xl ring-1 ring-[#EDE1CF] p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-[#3B2515] uppercase tracking-wider">Table Service</span>
            <button onClick={() => { setExpanded(false); setError(""); }} className="text-[#A9805F] hover:text-[#3B2515]">
              <X size={16} />
            </button>
          </div>

          {success && (
            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 mb-3">
              <CheckCircle size={14} className="text-emerald-600 shrink-0" />
              <p className="text-xs text-emerald-700">{success}</p>
            </div>
          )}
          {error && (
            <p className="text-xs text-rose-600 text-center mb-3">{error}</p>
          )}

          <div className="grid grid-cols-3 gap-2 mb-3">
            {REQUEST_OPTIONS.map(({ key, label, icon: Icon, color }) => (
              <button
                key={key}
                onClick={() => handleRequest(key)}
                disabled={loading === key}
                className={`flex flex-col items-center gap-1 rounded-xl ring-1 p-2.5 transition-colors text-center ${color} ${
                  activeRequest === key && success ? "ring-emerald-400 bg-emerald-50" : ""
                }`}
              >
                {loading === key ? <Loader size={16} className="animate-spin" /> : <Icon size={16} />}
                <span className="text-[10px] font-medium leading-tight">{label}</span>
              </button>
            ))}
          </div>

          <button
            onClick={handleBillRequest}
            disabled={loading === "bill"}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#3B2515] text-white py-2.5 text-xs font-medium hover:bg-[#2A1B12] transition-colors disabled:opacity-50"
          >
            {loading === "bill" ? <Loader size={14} className="animate-spin" /> : <Receipt size={14} />}
            Request Bill
          </button>
        </div>
      )}
    </div>
  );
}
