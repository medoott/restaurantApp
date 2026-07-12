import { useState, useMemo } from "react";
import { LayoutGrid, ClipboardList, Package, Users, Coffee, SquareStack, CalendarDays, ChefHat, Receipt, Bell }react";
import GuestQueuePanel from "../host/GuestQueuePanel.jsx";

const ROLE_CONFIGS = {
  Admin: {
    label: "Owner Dashboard",
    sections: [
      { key: "overview", label: "Overview", icon: LayoutGrid },
      { key: "queue", label: "Queue", icon: Users },
      { key: "orders", label: "Orders", icon: ClipboardList },
      { key: "tables", label: "Tables", icon: SquareStack },
      { key: "menu", label: "Menu", icon: Package },
    ],
  },
  "Order Taker": {
    label: "Waiter Dashboard",
    sections: [
      { key: "tables", label: "My Tables", icon: Coffee },
      { key: "requests", label: "Requests", icon: Bell },
      { key: "deliveries", label: "Deliveries", icon: ClipboardList },
      { key: "orders", label: "Orders", icon: ClipboardList },
    ],
  },
  Cook: {
    label: "Kitchen Dashboard",
    sections: [
      { key: "kds", label: "Orders", icon: ChefHat },
      { key: "prep", label: "In Prep", icon: Coffee },
      { key: "ready", label: "Ready", icon: Coffee },
    ],
  },
  "General Manager": {
    label: "Manager Dashboard",
    sections: [
      { key: "overview", label: "Overview", icon: LayoutGrid },
      { key: "queue", label: "Queue", icon: Users },
      { key: "tables", label: "Floor", icon: SquareStack },
      { key: "staff", label: "Staff", icon: Users },
      { key: "reports", label: "Reports", icon: LayoutGrid },
    ],
  },
  Cashier: {
    label: "Cashier Panel",
    sections: [
      { key: "bills", label: "Bills", icon: Receipt },
      { key: "payments", label: "Payments", icon: Receipt },
      { key: "tables", label: "Tables", icon: SquareStack },
    ],
  },
};

export default function RoleDashboard({ user, access = {} }) {
  const role = user?.role || "User";
  const config = ROLE_CONFIGS[role] || ROLE_CONFIGS.OrderTaker;
  const [active, setActive] = useState(config.sections[0]?.key || "overview");

  const sections = useMemo(() => config.sections, [config]);

  return (
    <div className="min-h-screen bg-[#FBF6EF] p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-serif text-2xl text-[#3B2515]">{config.label}</h1>
            <p className="text-xs text-[#A9805F] mt-0.5">Welcome, {user?.name || user?.email}</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-[#A9805F]">
            <span className="bg-white rounded-full px-3 py-1.5 ring-1 ring-[#EDE1CF]">{role}</span>
          </div>
        </div>

        <div className="flex gap-1 mb-6 overflow-x-auto pb-2">
          {sections.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActive(key)}
              className={`flex items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-2 text-xs font-medium transition-colors ${
                active === key
                  ? "bg-[#3B2515] text-[#F3E5D3]"
                  : "bg-white text-[#7B4B2A] ring-1 ring-[#EDE1CF] hover:bg-[#EDE1CF]"
              }`}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>

        <div>
          {active === "queue" && <GuestQueuePanel access={access} />}
          {active === "overview" && (
            <div className="rounded-2xl bg-white ring-1 ring-[#EDE1CF] p-8 text-center">
              <p className="text-sm text-[#A9805F]">Role overview dashboard. Navigate sections above.</p>
            </div>
          )}
          {active !== "queue" && active !== "overview" && (
            <div className="rounded-2xl bg-white ring-1 ring-[#EDE1CF] p-8 text-center">
              <p className="text-sm text-[#A9805F]">Section: {active} — Use the main sidebar for full features.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
