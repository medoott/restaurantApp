import { useCallback, useEffect, useState } from "react";
import { Bell, BellRing, CheckCheck, Trash2, Package, Users, Calendar, AlertTriangle, Clock, Coffee } from "lucide-react";

const NOTIFICATION_TEMPLATES = [
  { icon: Clock, iconBg: "bg-sky-100 text-sky-600", title: "Order #1042 is ready for pickup", message: "Customer order has been prepared and is waiting at the counter." },
  { icon: Calendar, iconBg: "bg-purple-100 text-purple-600", title: "New reservation for table 7 at 7:30 PM", message: "Johnson party of 4 booked for dinner service." },
  { icon: AlertTriangle, iconBg: "bg-amber-100 text-amber-600", title: "Low stock alert: Olive Oil is below minimum", message: "Current stock: 2 units. Minimum threshold: 5 units." },
  { icon: Coffee, iconBg: "bg-orange-100 text-orange-600", title: "Table 3 needs cleaning", message: "Customers have left table 3. Please clean and reset." },
  { icon: Package, iconBg: "bg-emerald-100 text-emerald-600", title: "Inventory delivery arriving tomorrow", message: "Weekly produce delivery scheduled for 8:00 AM." },
  { icon: Users, iconBg: "bg-rose-100 text-rose-600", title: "Staff shift change: Ahmed covers lunch", message: "Ahmed will cover the lunch shift (12-4 PM) for Sara." },
  { icon: Bell, iconBg: "bg-indigo-100 text-indigo-600", title: "System update completed", message: "POS system updated to v2.4.1. New features available." },
  { icon: AlertTriangle, iconBg: "bg-rose-100 text-rose-600", title: "Table 12 reservation conflict", message: "Double booking detected for 8:00 PM slot. Please resolve." },
];

const NOTIFICATION_TYPES = [
  { key: "all", label: "All" },
  { key: "unread", label: "Unread" },
  { key: "read", label: "Read" },
];

function getTimeAgo(date) {
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function generateInitialNotifications() {
  return NOTIFICATION_TEMPLATES.map((template, i) => {
    const hoursAgo = Math.floor(Math.random() * 72);
    const timestamp = new Date(Date.now() - hoursAgo * 3600000);
    return {
      id: `notif-${i}-${Date.now()}`,
      ...template,
      timestamp,
      read: hoursAgo > 24,
      type: i % 3 === 0 ? "order" : i % 3 === 1 ? "reservation" : "alert",
    };
  }).sort((a, b) => b.timestamp - a.timestamp);
}

export default function NotificationCenterPage({ _permissions = { can: () => false } }) {
  const [notifications, setNotifications] = useState([]);
  const [activeTab, setActiveTab] = useState("all");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("brune_notifications");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setNotifications(parsed.map((n) => ({ ...n, timestamp: new Date(n.timestamp), icon: NOTIFICATION_TEMPLATES.find((t) => t.title === n.title)?.icon || Bell })));
      } catch {
        setNotifications(generateInitialNotifications());
      }
    } else {
      setNotifications(generateInitialNotifications());
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) {
      const toStore = notifications.map((n) => ({ ...n, icon: undefined }));
      localStorage.setItem("brune_notifications", JSON.stringify(toStore));
    }
  }, [notifications, loaded]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const filteredNotifications = activeTab === "all"
    ? notifications
    : activeTab === "unread"
      ? notifications.filter((n) => !n.read)
      : notifications.filter((n) => n.read);

  const markAsRead = useCallback((id) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-xl text-[#3B2515] flex items-center gap-2">
            <BellRing size={18} /> Notifications
            {unreadCount > 0 && (
              <span className="text-[10px] font-medium bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full">{unreadCount} new</span>
            )}
          </h2>
          <p className="text-xs text-[#A9805F] mt-0.5">Stay updated with restaurant alerts and activities</p>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="flex items-center gap-1.5 rounded-full bg-[#FBF6EF] ring-1 ring-[#EDE1CF] px-4 py-2 text-xs text-[#3B2515] hover:bg-white transition-colors"
            >
              <CheckCheck size={14} />
              Mark all read
            </button>
          )}
          {notifications.length > 0 && (
            <button
              onClick={clearAll}
              className="flex items-center gap-1.5 rounded-full bg-rose-50 ring-1 ring-rose-200 px-4 py-2 text-xs text-rose-700 hover:bg-rose-100 transition-colors"
            >
              <Trash2 size={14} />
              Clear all
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-2">
        {NOTIFICATION_TYPES.map(({ key, label }) => {
          const count = key === "all"
            ? notifications.length
            : key === "unread"
              ? unreadCount
              : notifications.length - unreadCount;
          return (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`rounded-full px-4 py-2 text-xs font-medium transition-colors ${
                activeTab === key
                  ? "bg-[#3B2515] text-[#F3E5D3]"
                  : "bg-white text-[#7B4B2A] ring-1 ring-[#EDE1CF] hover:bg-[#FBF6EF]"
              }`}
            >
              {label}
              {count > 0 && (
                <span className={`ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full ${
                  activeTab === key ? "bg-[#B07B4F]/30 text-[#F3E5D3]" : "bg-[#EDE1CF] text-[#7B4B2A]"
                }`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {!loaded ? (
        <div className="text-center py-16 text-[#9C8268] text-sm">
          <div className="animate-pulse">Loading notifications...</div>
        </div>
      ) : filteredNotifications.length === 0 ? (
        <div className="text-center py-16 text-[#9C8268] text-sm">
          <Bell size={40} className="mx-auto mb-3 opacity-20" />
          <p className="font-medium text-[#3B2515]">
            {activeTab === "all"
              ? "No notifications yet"
              : activeTab === "unread"
                ? "No unread notifications"
                : "No read notifications"}
          </p>
          <p className="text-xs mt-1">
            {activeTab === "all"
              ? "Notifications about orders, reservations, and system alerts will appear here"
              : activeTab === "unread"
                ? "You've caught up on everything!"
                : "Marked notifications will appear here"}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredNotifications.map((notif) => {
            const Icon = notif.icon;
            return (
              <div
                key={notif.id}
                className={`rounded-2xl bg-white ring-1 ring-[#EDE1CF] shadow-sm p-4 transition-all hover:shadow-md ${
                  !notif.read ? "border-l-4 border-l-[#B07B4F]" : "opacity-75"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-xl shrink-0 ${notif.iconBg || "bg-stone-100 text-stone-600"}`}>
                    <Icon size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className={`text-sm ${notif.read ? "text-[#9C8268]" : "text-[#3B2515] font-medium"}`}>
                          {notif.title}
                        </p>
                        <p className="text-xs text-[#A9805F] mt-0.5">{notif.message}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] text-[#A9805F] whitespace-nowrap">{getTimeAgo(notif.timestamp)}</span>
                        {!notif.read && (
                          <button
                            onClick={() => markAsRead(notif.id)}
                            className="text-[#A9805F] hover:text-[#3B2515] transition-colors"
                            title="Mark as read"
                          >
                            <CheckCheck size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
