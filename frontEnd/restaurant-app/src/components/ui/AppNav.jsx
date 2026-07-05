import { useState } from "react";
import {
  Coffee, Menu, ShoppingBag, Truck, LayoutDashboard, X, LogIn, Scan, SquareStack, Shield,
} from "lucide-react";
import NotificationBell from "./NotificationBell.jsx";

const PAGE_ICONS = {
  home: Coffee,
  menu: ShoppingBag,
  track: Truck,
  dashboard: LayoutDashboard,
  cook: LayoutDashboard,
  tables: SquareStack,
  "tables-dashboard": SquareStack,
  rbac: Shield,
};

export default function AppNav({
  page,
  pages,
  onNavigate,
  user,
  onLogin,
  onLogout,
  currentTable,
  onOpenScanner,
  socket,
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const isLoggedIn = !!user;

  return (
    <nav className="fixed top-0 inset-x-0 z-50 flex items-center justify-between bg-[#3B2515] px-4 md:px-8 h-14 shadow-lg shadow-black/10">
      <button
        onClick={() => { onNavigate("home"); setMobileOpen(false); }}
        className="flex items-center gap-2 text-[#FBF6EF] hover:text-[#EDE1CF] transition-colors"
      >
        <Coffee size={22} />
        <span className="font-serif text-lg font-bold tracking-wide hidden sm:inline">Coffe</span>
      </button>

      <div className="hidden md:flex items-center gap-1">
        {pages.map((p) => {
          const Icon = PAGE_ICONS[p.key];
          const isActive = page === p.key;
          return (
            <button
              key={p.key}
              onClick={() => onNavigate(p.key)}
              aria-current={isActive ? "page" : undefined}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? "bg-[#B07B4F] text-white shadow-sm"
                  : "text-[#EDE1CF] hover:bg-[#4A3020] hover:text-white"
              }`}
            >
              {Icon && <Icon size={15} />}
              {p.label}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden md:flex items-center gap-2 text-sm">
          {currentTable && (
            <button onClick={onOpenScanner}
              className="flex items-center gap-1.5 text-[#E8C9A0] hover:text-[#FBF6EF] bg-[#4A3020] hover:bg-[#5A3A2A] px-2.5 py-1 rounded-md text-xs font-medium transition-colors">
              <SquareStack size={13} /> Table {currentTable}
            </button>
          )}
          {!currentTable && onOpenScanner && (
            <button onClick={onOpenScanner}
              className="flex items-center gap-1.5 text-[#EDE1CF] hover:text-white bg-[#4A3020] hover:bg-[#5A3A2A] px-2.5 py-1 rounded-md text-xs font-medium transition-colors">
              <Scan size={13} /> Scan QR
            </button>
          )}
          {isLoggedIn && <NotificationBell socket={socket} />}
          {isLoggedIn ? (
            <>
              <span className="text-[#EDE1CF] text-xs truncate max-w-[100px]">
                {user?.name || user?.username || user?.email}
              </span>
              <button
                onClick={onLogout}
                className="text-[#EDE1CF] hover:text-white bg-[#4A3020] hover:bg-[#5A3A2A] px-2.5 py-1 rounded-md text-xs font-medium transition-colors"
              >
                Logout
              </button>
            </>
          ) : (
            <button
              onClick={onLogin}
              className="flex items-center gap-1.5 text-[#EDE1CF] hover:text-white bg-[#4A3020] hover:bg-[#5A3A2A] px-2.5 py-1 rounded-md text-xs font-medium transition-colors"
            >
              <LogIn size={13} />
              Login
            </button>
          )}
        </div>

        <button
          onClick={() => setMobileOpen((o) => !o)}
          className="md:hidden text-[#FBF6EF] hover:text-white p-1"
          aria-label="Toggle navigation"
          aria-expanded={mobileOpen}
          type="button"
        >
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {mobileOpen && (
        <div className="md:hidden fixed top-14 inset-x-0 bg-[#3B2515] border-t border-[#5A3A2A] shadow-xl pb-4 pt-2 px-4 z-50">
          {pages.map((p) => {
            const Icon = PAGE_ICONS[p.key];
            const isActive = page === p.key;
            return (
              <button
                key={p.key}
                onClick={() => { onNavigate(p.key); setMobileOpen(false); }}
                className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? "bg-[#B07B4F] text-white"
                    : "text-[#EDE1CF] hover:bg-[#4A3020]"
                }`}
              >
                {Icon && <Icon size={16} />}
                {p.label}
              </button>
            );
          })}
          {currentTable && (
            <button onClick={() => { onOpenScanner(); setMobileOpen(false); }}
              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-[#E8C9A0] hover:bg-[#4A3020]">
              <SquareStack size={16} /> Table {currentTable} &middot; tap to change
            </button>
          )}
          {!currentTable && onOpenScanner && (
            <button onClick={() => { onOpenScanner(); setMobileOpen(false); }}
              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-[#EDE1CF] hover:bg-[#4A3020]">
              <Scan size={16} /> Scan Table QR
            </button>
          )}
          <hr className="my-2 border-[#4A3020]" />
          {isLoggedIn ? (
            <div className="px-3 py-2 text-xs text-[#EDE1CF]">
              <span className="block truncate">{user?.name || user?.username || user?.email}</span>
              <button onClick={() => { onLogout(); setMobileOpen(false); }}
                className="mt-1 text-[#EDE1CF] hover:text-white">
                Logout
              </button>
            </div>
          ) : (
            <button onClick={() => { onLogin(); setMobileOpen(false); }}
              className="flex items-center gap-2 px-3 py-2.5 text-sm text-[#EDE1CF] hover:text-white">
              <LogIn size={16} /> Login
            </button>
          )}
        </div>
      )}
    </nav>
  );
}
