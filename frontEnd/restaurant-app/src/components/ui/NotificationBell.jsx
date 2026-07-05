import { useState, useEffect, useRef } from "react";
import { Bell, BellRing, CheckCheck, AlertCircle, Clock, User, AlertTriangle } from "lucide-react";
import { getApiToken } from "../../services/api.js";
import { API_BASE } from "../../utils/constants.js";

const PRIORITY_STYLES = {
  critical: "border-l-rose-500 bg-rose-50",
  high: "border-l-orange-500 bg-orange-50",
  medium: "border-l-amber-500 bg-amber-50",
  low: "border-l-stone-300 bg-white",
};

const PRIORITY_ICONS = {
  critical: AlertCircle,
  high: AlertTriangle,
  medium: Clock,
  low: User,
};

const TYPE_LABELS = {
  task_assigned: "Task Assigned",
  waiter_call: "Waiter Call",
  waiter_bill: "Bill Request",
  waiter_assigned: "Waiter Assigned",
  waiter_escalated: "Escalated",
  new_order: "New Order",
  order_ready: "Order Ready",
  inventory_alert: "Inventory Alert",
  manager_alert: "Manager Alert",
};

export default function NotificationBell({ socket }) {
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const panelRef = useRef(null);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const token = getApiToken();
        if (!token) return;
        const res = await fetch(`${API_BASE}/notifications?limit=20`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          const items = data?.data?.items || [];
          setNotifications(items);
          setUnreadCount(data?.data?.unread || items.filter((n) => !n.read).length);
        }
      } catch {}
    };
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!socket) return;
    const handler = (notification) => {
      setNotifications((prev) => [notification, ...prev].slice(0, 50));
      setUnreadCount((c) => c + 1);
    };
    socket.on("notification:new", handler);
    return () => socket.off("notification:new", handler);
  }, [socket]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
    };
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const handleAcknowledge = async (id) => {
    try {
      const token = getApiToken();
      await fetch(`${API_BASE}/notifications/${id}/acknowledge`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, read: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {}
  };

  const handleAcknowledgeAll = async () => {
    try {
      const token = getApiToken();
      await fetch(`${API_BASE}/notifications/acknowledge-all`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch {}
  };

  const timeAgo = (date) => {
    const diff = Date.now() - new Date(date).getTime();
    if (diff < 60000) return "now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
    return `${Math.floor(diff / 86400000)}d`;
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen(!open)}
        className="relative flex items-center gap-1.5 text-[#EDE1CF] hover:text-white bg-[#4A3020] hover:bg-[#5A3A2A] px-2.5 py-1 rounded-md text-xs font-medium transition-colors"
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ""}`}
        aria-expanded={open}
        aria-haspopup="true"
        type="button"
      >
        {unreadCount > 0 ? <BellRing size={14} className="text-amber-300" /> : <Bell size={14} />}
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-xl border border-[#EDE1CF] overflow-hidden z-[60]">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#EDE1CF] bg-[#FBF6EF]">
            <span className="text-sm font-semibold text-[#3B2515]">
              Notifications {unreadCount > 0 && `(${unreadCount})`}
            </span>
            {unreadCount > 0 && (
              <button type="button" onClick={handleAcknowledgeAll} className="flex items-center gap-1 text-xs text-[#B07B4F] hover:text-[#9A6B42] font-medium">
                <CheckCheck size={14} />
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="text-center py-8 text-xs text-[#9C8268]">No notifications</div>
            ) : (
              notifications.map((n) => {
                const Icon = PRIORITY_ICONS[n.priority] || Bell;
                const border = PRIORITY_STYLES[n.priority] || PRIORITY_STYLES.low;
                return (
                  <div
                    key={n._id}
                    className={`border-l-2 ${border} ${n.read ? "opacity-60" : ""} px-4 py-3 border-b border-[#EDE1CF]/50 hover:bg-[#FBF6EF] transition-colors cursor-pointer`}
                    onClick={() => !n.read && handleAcknowledge(n._id)}
                  >
                    <div className="flex items-start gap-2.5">
                      <Icon size={14} className={`mt-0.5 ${
                        n.priority === "critical" ? "text-rose-500" :
                        n.priority === "high" ? "text-orange-500" :
                        n.priority === "medium" ? "text-amber-500" : "text-stone-400"
                      }`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-[#3B2515] truncate">
                          {n.title}
                        </p>
                        {n.message && (
                          <p className="text-[11px] text-[#9C8268] mt-0.5 line-clamp-2">{n.message}</p>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] text-[#A9805F]">{timeAgo(n.createdAt)}</span>
                          <span className={`text-[10px] font-medium uppercase ${
                            n.priority === "critical" ? "text-rose-500" :
                            n.priority === "high" ? "text-orange-500" :
                            n.priority === "medium" ? "text-amber-500" : "text-stone-400"
                          }`}>{n.priority}</span>
                          {n.type && TYPE_LABELS[n.type] && (
                            <span className="text-[10px] text-[#9C8268]">{TYPE_LABELS[n.type]}</span>
                          )}
                        </div>
                      </div>
                      {!n.read && (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleAcknowledge(n._id); }}
                          className="p-1 rounded hover:bg-[#EDE1CF] text-[#9C8268]"
                          aria-label="Mark as read"
                        >
                          <CheckCheck size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
