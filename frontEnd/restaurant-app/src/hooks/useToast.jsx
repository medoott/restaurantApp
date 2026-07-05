import { createContext, useContext, useState, useCallback, useRef, useEffect } from "react";
import { X, CheckCircle2, AlertCircle, AlertTriangle, Info } from "lucide-react";

const ToastContext = createContext(null);

const ICONS = {
  success: CheckCircle2,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

const STYLES = {
  success: "border-l-emerald-500 bg-emerald-50",
  error: "border-l-rose-500 bg-rose-50",
  warning: "border-l-amber-500 bg-amber-50",
  info: "border-l-sky-500 bg-sky-50",
};

const ICON_COLORS = {
  success: "text-emerald-500",
  error: "text-rose-500",
  warning: "text-amber-500",
  info: "text-sky-500",
};

let toastId = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef({});

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    delete timers.current[id];
  }, []);

  const addToast = useCallback((message, type = "info", duration = 4000) => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, message, type }]);
    timers.current[id] = setTimeout(() => removeToast(id), duration);
    return id;
  }, [removeToast]);

  useEffect(() => {
    return () => {
      Object.values(timers.current).forEach(clearTimeout);
    };
  }, []);

  return (
    <ToastContext.Provider value={addToast}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col-reverse gap-2 max-w-sm">
        {toasts.map((toast) => {
          const Icon = ICONS[toast.type];
          const IconColor = ICON_COLORS[toast.type];
          return (
            <div
              key={toast.id}
              className={`flex items-start gap-2.5 px-4 py-3 rounded-lg shadow-lg border border-[#EDE1CF] border-l-4 ${STYLES[toast.type]} animate-slide-up`}
            >
              <Icon size={16} className={`mt-0.5 shrink-0 ${IconColor}`} />
              <p className="text-xs text-[#3B2515] flex-1 min-w-0">{toast.message}</p>
              <button
                onClick={() => removeToast(toast.id)}
                className="p-0.5 rounded hover:bg-black/5 text-[#9C8268] shrink-0"
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return {
    success: (msg, dur) => ctx(msg, "success", dur),
    error: (msg, dur) => ctx(msg, "error", dur),
    warning: (msg, dur) => ctx(msg, "warning", dur),
    info: (msg, dur) => ctx(msg, "info", dur),
  };
}
