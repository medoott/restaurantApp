import { useMemo, useState, useEffect } from "react";
import { ShoppingBag, Trash2, Banknote, CreditCard, X } from "lucide-react";
import { useSettings } from "../../context/useSettings.js";
import PrimaryButton from "../ui/PrimaryButton.jsx";
import { getCurrencySymbol } from "../../utils/currency.js";

export default function CartContents({
  cart,
  removeFromCart,
  payment,
  setPayment,
  onConfirm,
  editingOrder = null,
  error = "",
  onClearError = () => {},
  user = null,
  onOpenLogin = () => {},
}) {
  const settings = useSettings()?.settings;

  const generalSettings = settings?.general || {};
  const orderingSettings = settings?.ordering || {};
  const paymentSettings = settings?.payment || {};
  const integrationsSettings = settings?.integrations || {};

  const currency = getCurrencySymbol(generalSettings.currency);
  const taxPercent = parseFloat(generalSettings.taxPercentage ?? 8);
  const servicePercent = parseFloat(generalSettings.serviceCharge ?? 0);

  const { subtotal, tax, serviceCharge, total } = useMemo(() => {
    const computedSubtotal = cart.reduce((s, i) => s + Number(i.price || 0) * Number(i.qty || 0), 0);
    const computedTax = computedSubtotal * (taxPercent / 100);
    const computedServiceCharge = computedSubtotal * (servicePercent / 100);
    return {
      subtotal: computedSubtotal,
      tax: computedTax,
      serviceCharge: computedServiceCharge,
      total: computedSubtotal + computedTax + computedServiceCharge,
    };
  }, [cart, servicePercent, taxPercent]);

  // Ordering constraints
  const minAmount = parseFloat(orderingSettings.minOrderAmount || 0);
  const maxAmount = parseFloat(orderingSettings.maxOrderAmount || 9999);
  const requireName = !!orderingSettings.requireCustomerName;
  const requirePhone = !!orderingSettings.requirePhoneNumber;
  const enableGuest = orderingSettings.enableGuestOrders !== false;
  const autoOrderNum = orderingSettings.autoGenerateOrderNumber !== false;

  // Checkout inputs
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [manualOrderId, setManualOrderId] = useState("");
  const [validationError, setValidationError] = useState("");

  const stripeMethod = paymentSettings.methods?.find(m => m.key === "stripe");
  const isStripeEnabled = stripeMethod?.enabled && integrationsSettings.integrations?.find(i => i.key === "stripe" && i.enabled);

  const cashEnabled = orderingSettings.enableCashOrders !== false && paymentSettings.methods?.find(m => m.key === "cash")?.enabled !== false;
  const onlineEnabled = orderingSettings.enableOnlineOrdering !== false && paymentSettings.methods?.some(m => m.key !== "cash" && m.enabled);

  // Set default payment if current selected is disabled
  useEffect(() => {
    if (payment === "Cash" && !cashEnabled && onlineEnabled) {
      setPayment("Online");
    } else if (payment === "Online" && !onlineEnabled && cashEnabled) {
      setPayment("Cash");
    }
  }, [cashEnabled, onlineEnabled, payment, setPayment]);

  const handleCheckoutClick = () => {
    setValidationError("");

    if (total < minAmount) {
      setValidationError(`Minimum order amount is ${currency}${minAmount.toFixed(2)}`);
      return;
    }
    if (total > maxAmount) {
      setValidationError(`Maximum order amount is ${currency}${maxAmount.toFixed(2)}`);
      return;
    }

    if (!user && !enableGuest) {
      setValidationError("Guest ordering is disabled. Please log in first.");
      onOpenLogin();
      return;
    }

    if (!user) {
      if (requireName && !guestName.trim()) {
        setValidationError("Name is required for guest checkout.");
        return;
      }
      if (requirePhone && !guestPhone.trim()) {
        setValidationError("Phone number is required for guest checkout.");
        return;
      }
    }

    if (!autoOrderNum && !manualOrderId.trim()) {
      setValidationError("Please enter an Order ID/Number manually.");
      return;
    }

    if (payment === "Online" && isStripeEnabled) {
      onConfirm({
        guestName: user ? "" : guestName,
        guestPhone: user ? "" : guestPhone,
        manualOrderId: autoOrderNum ? "" : manualOrderId,
      });
      return;
    }

    onConfirm({
      guestName: user ? "" : guestName,
      guestPhone: user ? "" : guestPhone,
      manualOrderId: autoOrderNum ? "" : manualOrderId,
    });
  };

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden">
      <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4 space-y-3">
        {cart.length === 0 && (
          <div className="text-center py-16">
            <ShoppingBag className="mx-auto text-[#D8C5A8]" size={36} />
            <p className="mt-3 text-sm text-[#A9805F]">Your cart is empty</p>
          </div>
        )}
        {cart.map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-3 bg-[#FBF6EF] rounded-2xl p-2.5 ring-1 ring-[#EDE1CF]"
          >
            {item.img && settings?.menu?.enableProductImages !== false && (
              <img
                src={item.img}
                alt={item.name}
                className="w-14 h-14 rounded-xl object-cover"
                loading="lazy"
                decoding="async"
              />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[#3B2515] truncate">
                {item.name}
              </p>
              <p className="text-xs text-[#A9805F]">Qty {item.qty}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-[#B07B4F]">
                {currency}{(item.price * item.qty).toFixed(2)}
              </p>
              <button
                onClick={() => removeFromCart(item.id)}
                className="mt-1 text-[#C9572F] hover:text-[#a8441f] transition-colors"
                aria-label={`Remove ${item.name} from cart`}
                type="button"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}

        {cart.length > 0 && !user && !enableGuest && (
          <div className="rounded-2xl bg-amber-50 p-4 border border-amber-200 text-center space-y-2">
            <p className="text-xs text-amber-800">You must be logged in to order.</p>
            <button
              onClick={onOpenLogin}
              className="text-xs font-semibold text-[#3B2515] underline"
            >
              Click here to Log In
            </button>
          </div>
        )}

        {cart.length > 0 && !user && enableGuest && (requireName || requirePhone) && (
          <div className="rounded-2xl bg-[#FBF6EF] p-4 border border-[#EDE1CF] space-y-3">
            <h4 className="text-xs font-semibold text-[#3B2515] uppercase tracking-wider">Guest Checkout Info</h4>
            {requireName && (
              <input
                type="text"
                placeholder="Your Name *"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                className="w-full rounded-xl border border-[#EDE1CF] px-3 py-2 text-xs bg-white focus:outline-none"
              />
            )}
            {requirePhone && (
              <input
                type="tel"
                placeholder="Phone Number *"
                value={guestPhone}
                onChange={(e) => setGuestPhone(e.target.value)}
                className="w-full rounded-xl border border-[#EDE1CF] px-3 py-2 text-xs bg-white focus:outline-none"
              />
            )}
          </div>
        )}

        {cart.length > 0 && !autoOrderNum && (
          <div className="rounded-2xl bg-[#FBF6EF] p-4 border border-[#EDE1CF] space-y-2">
            <h4 className="text-xs font-semibold text-[#3B2515] uppercase tracking-wider">Manual Order Number</h4>
            <input
              type="text"
              placeholder="Enter Custom Order ID *"
              value={manualOrderId}
              onChange={(e) => setManualOrderId(e.target.value)}
              className="w-full rounded-xl border border-[#EDE1CF] px-3 py-2 text-xs bg-white focus:outline-none font-mono"
            />
          </div>
        )}
      </div>

      {cart.length > 0 && (
        <div className="border-t border-[#EDE1CF] px-5 py-4 space-y-3 bg-white">
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between text-[#7B4B2A]">
              <span>Subtotal</span>
              <span>{currency}{subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-[#7B4B2A]">
              <span>Tax ({taxPercent}%)</span>
              <span>{currency}{tax.toFixed(2)}</span>
            </div>
            {servicePercent > 0 && (
              <div className="flex justify-between text-[#7B4B2A]">
                <span>Service Charge ({servicePercent}%)</span>
                <span>{currency}{serviceCharge.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-[#3B2515] font-semibold text-base pt-1.5 border-t border-dashed border-[#EDE1CF]">
              <span>Total</span>
              <span>{currency}{total.toFixed(2)}</span>
            </div>
          </div>

          {(error || validationError) && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl px-3 py-2.5 flex items-start gap-2">
              <span className="text-rose-600 text-xs flex-1">{error || validationError}</span>
              <button
                onClick={() => {
                  onClearError();
                  setValidationError("");
                }}
                className="text-rose-400 hover:text-rose-600"
              >
                <X size={14} />
              </button>
            </div>
          )}

          {(!cashEnabled && !onlineEnabled) ? (
            <p className="text-center text-xs text-rose-500 font-semibold py-2">
              Ordering is currently unavailable (no payment methods enabled).
            </p>
          ) : (
            <>
              <div>
                <p className="text-xs font-medium text-[#A9805F] mb-2 uppercase tracking-wide">
                  Payment method
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {cashEnabled && (
                    <button
                      onClick={() => setPayment("Cash")}
                      className={`flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-medium transition-all ${
                        payment === "Cash"
                          ? "bg-[#3B2515] text-[#F3E5D3]"
                          : "bg-[#FBF6EF] text-[#7B4B2A] ring-1 ring-[#EDE1CF]"
                      }`}
                    >
                      <Banknote size={15} /> Cash
                    </button>
                  )}
                  {onlineEnabled && (
                    <button
                      onClick={() => setPayment("Online")}
                      className={`flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-medium transition-all ${
                        payment === "Online"
                          ? "bg-[#3B2515] text-[#F3E5D3]"
                          : "bg-[#FBF6EF] text-[#7B4B2A] ring-1 ring-[#EDE1CF]"
                      }`}
                    >
                      <CreditCard size={15} /> Online
                    </button>
                  )}
                </div>
              </div>

              <PrimaryButton
                onClick={handleCheckoutClick}
                className="w-full"
                disabled={!user && !enableGuest}
              >
                {editingOrder
                  ? `Update Order \u00b7 ${currency}${total.toFixed(2)}`
                  : `Confirm Order \u00b7 ${currency}${total.toFixed(2)}`}
              </PrimaryButton>
            </>
          )}
        </div>
      )}
    </div>
  );
}
