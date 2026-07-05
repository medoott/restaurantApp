import { useState, useEffect, useCallback, useMemo, useRef, lazy, Suspense } from "react";
import { MotionConfig } from "framer-motion";
import { ShoppingBag, Wrench } from "lucide-react";
import * as dataService from "./services/data.js";
import * as tableService from "./services/table.js";
import useAuth from "./hooks/useAuth.js";
import useCart from "./hooks/useCart.js";
import useDataLoader from "./hooks/useDataLoader.js";
import useTableSession from "./hooks/useTableSession.js";
import useRequestLock from "./hooks/useRequestLock.js";
import useSocket from "./hooks/useSocket.js";
import usePermissions from "./hooks/usePermissions.js";
import { normalizeOrder } from "./utils/normalize.js";
import { SettingsProvider } from "./context/SettingsContext.jsx";
import { SecurityProvider, useSecurity } from "./context/SecurityContext.jsx";
import { useSettings } from "./context/useSettings.js";
import { playNotificationSound } from "./utils/audio.js";
import AppNav from "./components/ui/AppNav.jsx";
import ErrorBoundary from "./components/ui/ErrorBoundary.jsx";
import CartPanel from "./components/cart/CartPanel.jsx";
import AddProductModal from "./components/products/AddProductModal.jsx";
import AuthModal from "./components/auth/AuthModal.jsx";
import WaiterAssistance from "./components/waiter/WaiterAssistance.jsx";
import ScannerModal from "./components/qr/ScannerModal.jsx";
import { apiRequest as apiRequestWithToken } from "./services/api.js";

const HomePage = lazy(() => import("./pages/HomePage.jsx"));
const MenuPage = lazy(() => import("./pages/MenuPage.jsx"));
const DeveloperDashboard = lazy(() => import("./pages/DeveloperDashboard.jsx"));
const TrackOrderPage = lazy(() => import("./pages/TrackOrderPage.jsx"));
const DashboardPage = lazy(() => import("./pages/DashboardPage.jsx"));
const QrScanPage = lazy(() => import("./pages/QrScanPage.jsx"));
const TableManagementPage = lazy(() => import("./pages/TableManagementPage.jsx"));
const TablesDashboardPage = lazy(() => import("./pages/TablesDashboardPage.jsx"));
const HostDashboardPage = lazy(() => import("./pages/HostDashboardPage.jsx"));
const CleaningWorkflowPage = lazy(() => import("./pages/CleaningWorkflowPage.jsx"));
const WaiterPage = lazy(() => import("./pages/WaiterPage.jsx"));
const RbacManagementPage = lazy(() => import("./pages/RbacManagementPage.jsx"));
const WaiterWorkspace = lazy(() => import("./components/workspace/WaiterWorkspace.jsx"));
const CashierWorkspace = lazy(() => import("./components/workspace/CashierWorkspace.jsx"));
const HostWorkspace = lazy(() => import("./components/workspace/HostWorkspace.jsx"));
const KitchenWorkspace = lazy(() => import("./components/workspace/KitchenWorkspace.jsx"));

export default function App() {
  const auth = useAuth();

  return (
    <SettingsProvider authToken={auth.token}>
      <AppContent auth={auth} />
    </SettingsProvider>
  );
}

function AppContent({ auth }) {
  return (
    <SecurityProvider user={auth.user}>
      <AppCore auth={auth} />
    </SecurityProvider>
  );
}

function AppCore({ auth }) {
  const data = useDataLoader();
  const cartState = useCart();
  const table = useTableSession();
  const orderLock = useRequestLock();
  const [page, setPage] = useState("home");
  const [trackingId, setTrackingId] = useState(() => {
    try { return sessionStorage.getItem("coffe_tracking_id") || ""; } catch { return ""; }
  });
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [orderError, setOrderError] = useState("");
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerError, setScannerError] = useState("");
  const [selectedTableNumber, setSelectedTableNumber] = useState(null);
  const [logoutNotification, setLogoutNotification] = useState("");
  const [showDeveloper, setShowDeveloper] = useState(false);

  const settingsContext = useSettings();
  const settings = settingsContext?.settings;

  const perm = usePermissions(auth.user);
  const allowedPages = perm.pages;

  const roleWorkspace = useMemo(() => {
    if (!auth.user) return null;
    const role = auth.user.role;
    if (role === "Waiter" || role === "Order Taker") return "waiter-workspace";
    if (role === "Cashier") return "cashier-workspace";
    if (role === "Host") return "host-workspace";
    if (role === "Cook") return "kitchen-workspace";
    return null;
  }, [auth.user]);

  useEffect(() => {
    const validPages = allowedPages.length > 0 ? allowedPages : ["home"];
    if (!validPages.includes(page) && page !== "scan" && page !== "menu" && page !== "track") {
      setPage(validPages[0]);
    }
  }, [allowedPages]);

  useEffect(() => {
    if (roleWorkspace && page !== roleWorkspace && page === "dashboard") {
      setPage(roleWorkspace);
    }
  }, [roleWorkspace]);

  // Handle ?dev=1 URL param (hidden developer console)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("dev") === "1") {
      setShowDeveloper(true);
    }
  }, []);

  // Security: Auto Logout Timer (Inactivity Timer)
  useEffect(() => {
    if (!auth.user) return;
    const timeoutMins = parseFloat(settings?.security?.autoLogoutTimer || 30);
    if (isNaN(timeoutMins) || timeoutMins <= 0) return;

    const timeoutMs = timeoutMins * 60 * 1000;
    let timer;

    const resetTimer = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        auth.logout();
        setLogoutNotification("You have been automatically logged out due to inactivity.");
        setTimeout(() => setLogoutNotification(""), 8000);
      }, timeoutMs);
    };

    const events = ["mousedown", "mousemove", "keypress", "scroll", "touchstart"];
    events.forEach(name => document.addEventListener(name, resetTimer));
    resetTimer();

    return () => {
      if (timer) clearTimeout(timer);
      events.forEach(name => document.removeEventListener(name, resetTimer));
    };
  }, [auth, settings?.security?.autoLogoutTimer]);

  // Request browser Notification permission if enabled
  useEffect(() => {
    if (settings?.notifications?.channels?.find(c => c.key === "browser" && c.enabled)) {
      if (Notification.permission === "default") {
        Notification.requestPermission();
      }
    }
  }, [settings?.notifications?.channels]);

  const { addOrder, updateOrder, updateOrderStatus, addProduct, addShortage, products, orders, shortages, loading, error } = data;
  const {
    cart, addToCart, removeFromCart, clearCart, setCart, payment, setPayment,
    cartOpen, setCartOpen, editingOrder, setEditingOrder, cartItemCount, buildOrderPayload,
  } = cartState;

  // Refs for sound/notification to avoid socket re-registration on settings change
  const playSoundRef = useRef((eventKey, defaultPlay = false) => {
    if (!settings?.notifications?.soundEnabled) return;
    if (defaultPlay) { playNotificationSound(settings?.notifications?.sound, settings?.notifications?.volume); return; }
    const isEnabled = settings?.notifications?.events?.find(e => e.key === eventKey)?.enabled;
    if (isEnabled) playNotificationSound(settings?.notifications?.sound, settings?.notifications?.volume);
  });
  const sendBrowserNotificationRef = useRef((title, body) => {
    if (!settings?.notifications?.channels?.find(c => c.key === "browser" && c.enabled)) return;
    if (Notification.permission === "granted") new Notification(title, { body });
  });

  // Update refs when settings change
  useEffect(() => {
    playSoundRef.current = (eventKey, defaultPlay = false) => {
      if (!settings?.notifications?.soundEnabled) return;
      if (defaultPlay) { playNotificationSound(settings?.notifications?.sound, settings?.notifications?.volume); return; }
      const isEnabled = settings?.notifications?.events?.find(e => e.key === eventKey)?.enabled;
      if (isEnabled) playNotificationSound(settings?.notifications?.sound, settings?.notifications?.volume);
    };
    sendBrowserNotificationRef.current = (title, body) => {
      if (!settings?.notifications?.channels?.find(c => c.key === "browser" && c.enabled)) return;
      if (Notification.permission === "granted") new Notification(title, { body });
    };
  }, [settings]);

  const socketEvents = useMemo(
    () => ({
      "order:statusChanged": (d) => {
        if (!d?.id) return;
        updateOrder(normalizeOrder(d));
        playSoundRef.current("readyOrder", d.status === "Ready" || d.status === "Cancelled");
        sendBrowserNotificationRef.current(`Order ${d.id} Status Updated`, `Status changed to: ${d.status}`);
      },
      "order:created": (d) => {
        if (!d?.id) return;
        addOrder(normalizeOrder(d));
        playSoundRef.current("newOrder");
        sendBrowserNotificationRef.current("New Order Placed", `Order ${d.id} for $${d.total} received.`);
      },
      "order:paymentReceived": (d) => {
        if (d?.id) updateOrder(normalizeOrder(d));
      },
    }),
    [updateOrder, addOrder],
  );

  const { socket: socketRef } = useSocket(socketEvents);

  const confirmOrder = useCallback(async (checkoutData = {}) => {
    const { itemsDetail, total } = buildOrderPayload();
    await orderLock.withLock(async () => {
      try {
        if (editingOrder) {
          await dataService.addItemsToOrder(editingOrder.id, {
            items: itemsDetail,
            sessionToken: table.sessionToken,
          });
          setEditingOrder(null);
          setCart([]);
          setCartOpen(false);
          setTrackingId(editingOrder.id);
          try { sessionStorage.setItem("coffe_tracking_id", editingOrder.id); } catch {}
          setPage("track");
          return;
        }

        const resolvedCustomerName = checkoutData.guestName || auth.user?.name || auth.user?.username || "Guest";

        const created = await dataService.createOrder({
          id: checkoutData.manualOrderId || undefined,
          customer: resolvedCustomerName,
          code: 0,
          items: cartItemCount,
          payment,
          total,
          status: "Pending",
          itemsDetail,
          sessionToken: table.sessionToken,
        });

        addOrder(created);
        const createdId = created.id || `ORD-${Math.floor(1000 + Math.random() * 9000)}`;
        setTrackingId(createdId);
        try { sessionStorage.setItem("coffe_tracking_id", createdId); } catch {}
        clearCart();
        setCartOpen(false);
        setPage("track");
      } catch (err) {
        setOrderError(err.message || "Failed to place order. Please try again.");
      }
    });
  }, [
    buildOrderPayload, orderLock, editingOrder, setEditingOrder, setCart,
    setCartOpen, table.sessionToken, auth.user?.name, auth.user?.username,
    cartItemCount, payment, addOrder, clearCart,
  ]);

  const handleTableVerified = useCallback(async (tableNumber, hasOrderView) => {
    setScannerOpen(false);
    setScannerError("");
    try {
      const session = await table.startSession(tableNumber);
      if (!session) return;

      setTrackingId("");
      try { sessionStorage.removeItem("coffe_tracking_id"); } catch {}

      const tableOrders = orders.filter(
        (o) => o.tableNumber === tableNumber && o.status !== "Cancelled" && o.status !== "Rejected"
      );

      if (tableOrders.length > 0 || hasOrderView) {
        setSelectedTableNumber(tableNumber);
        setPage("tables-dashboard");
      } else {
        setPage("menu");
      }
    } catch (err) {
      setScannerError(err.message || "Could not verify table. Please try again.");
    }
  }, [table, orders]);

  const handleQRScan = useCallback((decodedText) => {
    let tableNum = null;

    if (decodedText.startsWith("table:")) {
      tableNum = Number(decodedText.split(":")[1]);
    } else {
      try {
        const url = new URL(decodedText);
        const t = url.searchParams.get("table");
        if (t) tableNum = Number(t);
      } catch {
        const num = Number(decodedText);
        if (num > 0 && Number.isInteger(num)) tableNum = num;
      }
    }

    if (tableNum && tableNum > 0) {
      handleTableVerified(tableNum, perm.can("orders.view"));
    } else {
      setScannerError("Could not read table number. Please try again or enter it manually.");
    }
  }, [handleTableVerified]);

  const openScanner = useCallback(() => {
    setScannerError("");
    setScannerOpen(true);
  }, []);

  // Handle ?table= URL param on first load (from QR code link)
  useEffect(() => {
    const tableNum = tableService.getTableFromUrl();
    if (tableNum) {
      // Small delay to let settings/auth load
      const timer = setTimeout(() => handleTableVerified(tableNum, perm.can("orders.view")), 500);
      return () => clearTimeout(timer);
    }
  }, [handleTableVerified, perm]);

  const cartProps = useMemo(
    () => ({
      cart, removeFromCart, payment, setPayment,
      onConfirm: confirmOrder, editingOrder,
      error: orderError,
      onClearError: () => setOrderError(""),
      user: auth.user,
      onOpenLogin: () => { auth.setAuthError(""); auth.setAuthMode("login"); auth.setAuthOpen(true); },
      cartCount: cart.reduce((s, i) => s + i.qty, 0),
    }),
    [cart, removeFromCart, payment, setPayment, editingOrder, confirmOrder, orderError, auth.user?.name, auth.user?._id],
  );

  // Hidden developer console takes priority over everything
  if (showDeveloper) {
    return <DeveloperDashboard />;
  }

  // Check Maintenance Mode
  const isMaintenanceActive = settings?.system?.maintenanceMode && !perm.can("settings.view");

  if (isMaintenanceActive) {
    return (
      <div className="fixed inset-0 bg-[#FBF6EF] z-[9999] flex items-center justify-center p-6 text-center">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 ring-1 ring-[#EDE1CF] shadow-xl flex flex-col items-center">
          <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center mb-6 text-amber-600">
            <Wrench size={32} className="animate-pulse" />
          </div>
          <h2 className="font-serif text-2xl text-[#3B2515] mb-2">{settings?.general?.name || "Brúne Coffee"}</h2>
          <p className="text-sm font-semibold text-[#A9805F] uppercase tracking-wider mb-4">Under Maintenance</p>
          <p className="text-sm text-[#7B4B2A] leading-relaxed mb-6">
            {settings?.general?.description || "We are currently performing scheduled maintenance to improve our service. We'll be back online shortly!"}
          </p>
          <div className="text-xs text-[#A9805F] border-t border-[#EDE1CF] pt-4 w-full">
            Contact: {settings?.general?.phones || "+1 234 567 890"}
          </div>
        </div>
      </div>
    );
  }

  const animationsEnabled = settings?.appearance?.animations !== false;

  return (
    <MotionConfig transition={animationsEnabled ? undefined : { duration: 0 }}>
      <ErrorBoundary>
      <div className="font-sans antialiased" style={{ fontFamily: "'Poppins','Segoe UI',sans-serif" }}>
        <style>{`
          .font-serif { font-family: 'Playfair Display', Georgia, serif; }
          .no-scrollbar::-webkit-scrollbar { display: none; }
          .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        `}</style>

        {page !== "scan" && (
          <AppNav
            page={page}
            pages={perm.topPages}
            onNavigate={setPage}
            user={auth.user}
            onLogin={() => { auth.setAuthError(""); auth.setAuthMode("login"); auth.setAuthOpen(true); }}
            onLogout={auth.logout}
            currentTable={table.tableNumber}
            onOpenScanner={openScanner}
            socket={socketRef.current}
          />
        )}

        {loading && (
          <div className="fixed inset-x-0 top-14 z-[60] border-b border-[#EDE1CF] bg-white/90 px-4 py-2 text-center text-xs font-medium text-[#7B4B2A] backdrop-blur">
            Syncing menu and orders from the API...
          </div>
        )}
        {!loading && error && (
          <div className="fixed inset-x-0 top-14 z-[60] border-b border-rose-200 bg-rose-50 px-4 py-2 text-center text-xs font-medium text-rose-700 backdrop-blur" role="alert">
            {error}
          </div>
        )}
        {auth.profileError && (
          <div className="fixed inset-x-0 top-14 z-[60] border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-xs font-medium text-amber-700 backdrop-blur" role="alert">
            {auth.profileError}
          </div>
        )}
        {logoutNotification && (
          <div className="fixed inset-x-0 top-14 z-[60] border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-xs font-medium text-amber-700 backdrop-blur" role="alert">
            {logoutNotification}
          </div>
        )}

        <div className={`${loading || error ? "pt-14" : ""}`} />

        <ErrorBoundary>
          <Suspense fallback={
            <div className="pt-20 flex items-center justify-center min-h-[60vh]">
              <div className="flex flex-col items-center gap-4">
                <div className="w-8 h-8 rounded-full border-2 border-[#B07B4F] border-t-transparent animate-spin" />
                <p className="text-sm text-[#A9805F]">Loading...</p>
              </div>
            </div>
          }>
          {page === "scan" && (
            <QrScanPage
              onTableVerified={handleTableVerified}
            />
          )}

          {page === "home" && (
            <HomePage
              products={products}
              onOrderNow={() => setPage("menu")}
              currentTable={table.tableNumber}
              onOpenScanner={openScanner}
            />
          )}

          {page === "tables" && (
            <div className="pt-20 px-4 sm:px-8 max-w-6xl mx-auto pb-12">
              <TableManagementPage />
            </div>
          )}

          {page === "tables-dashboard" && (
            <div className="pt-20 px-4 sm:px-8 max-w-6xl mx-auto pb-12">
              <TablesDashboardPage orders={orders} initialTableNumber={selectedTableNumber} />
            </div>
          )}

          {page === "menu" && (
            <>
              <div className="pt-14 lg:pr-[380px]">
                {editingOrder && (
                  <div className="fixed top-14 inset-x-0 z-40 bg-[#B07B4F] text-white px-4 py-2.5 text-center text-sm font-medium flex items-center justify-center gap-2">
                    <span>Adding items to order <strong>{editingOrder.id}</strong></span>
                    <button onClick={() => { setEditingOrder(null); setCart([]); }}
                      className="ml-2 underline hover:no-underline text-white/80">
                      Cancel
                    </button>
                  </div>
                )}

                {table.isVerified && (
                  <div className="px-4 sm:px-8 py-3">
                    <div className="flex items-center justify-between max-w-5xl mx-auto">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-[#A9805F]">Table</span>
                        <span className="text-sm font-semibold text-[#3B2515]">{table.tableNumber}</span>
                      </div>
                      <WaiterAssistance />
                    </div>
                  </div>
                )}

                <div>
                  <MenuPage
                    cart={cart}
                    addToCart={addToCart}
                    onOpenCart={() => setCartOpen(true)}
                    products={products}
                  />
                </div>
              </div>
              <CartPanel open={cartOpen} onClose={() => setCartOpen(false)} {...cartProps} />
              {cart.length > 0 && !cartOpen && (
                <button
                  onClick={() => setCartOpen(true)}
                  className="lg:hidden fixed bottom-5 inset-x-5 z-30 rounded-full bg-[#3B2515] text-[#F3E5D3] py-3.5 shadow-xl shadow-[#3B2515]/30 flex items-center justify-center gap-2 text-sm text-sm font-medium"
                >
                  <ShoppingBag size={16} />
                  {editingOrder
                    ? `Update Order - ${cartProps.cartCount} items`
                    : `View Cart - ${cartProps.cartCount} items`}
                </button>
              )}
            </>
          )}

          {page === "track" && (
            <TrackOrderPage
              initialOrderId={trackingId}
              onBackHome={() => setPage("home")}
              onAddItems={(order) => {
                setEditingOrder(order);
                setPage("menu");
              }}
              onNewOrder={() => {
                clearCart();
                setEditingOrder(null);
                setPage("menu");
              }}
            />
          )}

          {(page === "dashboard" || page === "cook") && (
            <DashboardPage
              orders={orders}
              products={products}
              shortages={shortages}
              apiRequest={(path, opts) => apiRequestWithToken(path, opts || {}, auth.token)}
              openAddProduct={() => setShowAddProduct(true)}
              addProduct={addProduct}
              updateOrderStatus={updateOrderStatus}
              onReportShortage={addShortage}
              permissions={perm}
              initialActive={page === "cook" ? "Cook" : undefined}
            />
          )}

          {page === "host" && (
            <div className="pt-16">
              <HostDashboardPage
                apiRequest={(path, opts) => apiRequestWithToken(path, opts || {}, auth.token)}
              />
            </div>
          )}

          {page === "cleaning" && (
            <div className="pt-16">
              <CleaningWorkflowPage
                apiRequest={(path, opts) => apiRequestWithToken(path, opts || {}, auth.token)}
              />
            </div>
          )}

          {page === "waiter" && (
            <div className="pt-16">
              <WaiterPage
                apiRequest={(path, opts) => apiRequestWithToken(path, opts || {}, auth.token)}
                userId={auth.user?._id}
              />
            </div>
          )}

          {page === "waiter-workspace" && (
            <div className="pt-20 px-4 sm:px-8 max-w-6xl mx-auto pb-12">
              <WaiterWorkspace user={auth.user} access={perm} />
            </div>
          )}

          {page === "cashier-workspace" && (
            <div className="pt-20 px-4 sm:px-8 max-w-6xl mx-auto pb-12">
              <CashierWorkspace user={auth.user} access={perm} />
            </div>
          )}

          {page === "host-workspace" && (
            <div className="pt-20 px-4 sm:px-8 max-w-6xl mx-auto pb-12">
              <HostWorkspace user={auth.user} access={perm} />
            </div>
          )}

          {page === "kitchen-workspace" && (
            <div className="pt-20 px-4 sm:px-8 max-w-6xl mx-auto pb-12">
              <KitchenWorkspace user={auth.user} access={perm} />
            </div>
          )}

          {page === "rbac" && (
            <div className="pt-16">
              <RbacManagementPage
                apiRequest={(path, opts) => apiRequestWithToken(path, opts || {}, auth.token)}
              />
            </div>
          )}
          </Suspense>
        </ErrorBoundary>

        <AddProductModal
          open={showAddProduct}
          onClose={() => setShowAddProduct(false)}
          onSubmit={addProduct}
        />

        <AuthModal
          open={auth.authOpen}
          mode={auth.authMode}
          onClose={() => auth.setAuthOpen(false)}
          onSubmit={(form) =>
            auth.authMode === "signup"
              ? auth.signupThenLogin(form)
              : auth.login(form.email, form.password)
          }
          loading={auth.authLoading}
          error={auth.authError}
          onModeChange={auth.setAuthMode}
        />

        <ScannerModal
          open={scannerOpen}
          onClose={() => { setScannerOpen(false); setScannerError(""); }}
          onScan={handleQRScan}
          error={scannerError}
        />

        {import.meta.env.DEV && settings?.system?.debugMode && (
          <div className="fixed bottom-4 left-4 z-[9999] bg-[#3B2515] text-[#F3E5D3] p-4 rounded-2xl shadow-xl border border-[#EDE1CF] text-xs max-w-xs space-y-2">
            <div className="font-bold flex items-center justify-between border-b border-[#EDE1CF]/25 pb-1">
              <span>Debug Console</span>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
            </div>
            <div>Page: <span className="font-mono text-emerald-300 font-bold">{page}</span></div>
            <div>Active Role: <span className="font-mono text-[#E8C9A0]">{auth.user?.role || "Guest"}</span></div>
            <div>Cart Size: <span className="font-mono text-sky-300">{cart.length} items</span></div>
            <div>Table: <span className="font-mono text-amber-300">#{table.tableNumber || "None"}</span></div>
          </div>
        )}
      </div>
      </ErrorBoundary>
    </MotionConfig>
  );
}
