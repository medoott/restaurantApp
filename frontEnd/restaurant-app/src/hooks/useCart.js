import { useState, useCallback, useRef } from "react";
import { useSettings } from "../context/useSettings.js";
import { TAX_RATE } from "../utils/constants.js";

const CART_KEY = "coffe_cart";
const PAYMENT_KEY = "coffe_payment";

function loadCart() {
  try {
    const saved = sessionStorage.getItem(CART_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch { return []; }
}

function loadPayment() {
  try {
    return sessionStorage.getItem(PAYMENT_KEY) || "Cash";
  } catch { return "Cash"; }
}

function saveCart(items) {
  try { sessionStorage.setItem(CART_KEY, JSON.stringify(items)); } catch {}
}

function savePayment(method) {
  try { sessionStorage.setItem(PAYMENT_KEY, method); } catch {}
}

export default function useCart() {
  const [cart, setCart] = useState(loadCart);
  const [cartOpen, setCartOpen] = useState(false);
  const [payment, setPayment] = useState(loadPayment);
  const [editingOrder, setEditingOrder] = useState(null);

  const settings = useSettings()?.settings;
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  const addToCart = useCallback((product, qty) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === product.id);
      const next = existing
        ? prev.map((i) =>
            i.id === product.id ? { ...i, qty: i.qty + qty } : i,
          )
        : [...prev, { ...product, qty }];
      saveCart(next);
      return next;
    });
  }, []);

  const removeFromCart = useCallback(
    (id) => setCart((prev) => {
      const next = prev.filter((i) => i.id !== id);
      saveCart(next);
      return next;
    }),
    [],
  );

  const clearCart = useCallback(() => {
    setCart([]);
    setEditingOrder(null);
    try { sessionStorage.removeItem(CART_KEY); } catch {}
  }, []);

  const setCartWithPersist = useCallback((fn) => {
    setCart((prev) => {
      const next = typeof fn === "function" ? fn(prev) : fn;
      saveCart(next);
      return next;
    });
  }, []);

  const setPaymentWithPersist = useCallback((method) => {
    setPayment(method);
    savePayment(method);
  }, []);

  const cartItemCount = cart.reduce((s, i) => s + i.qty, 0);

  const buildOrderPayload = useCallback(() => {
    const s = settingsRef.current;
    const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
    const taxPercent = parseFloat(s?.general?.taxPercentage ?? (TAX_RATE * 100));
    const tax = subtotal * (taxPercent / 100);
    const servicePercent = parseFloat(s?.general?.serviceCharge ?? 0);
    const serviceCharge = subtotal * (servicePercent / 100);
    const total = subtotal + tax + serviceCharge;

    const itemsDetail = cart.map((item) => ({
      id: item.id,
      name: item.name,
      qty: item.qty,
      price: item.price,
    }));
    return { subtotal, tax, serviceCharge, total, itemsDetail };
  }, [cart]);

  return {
    cart, setCart: setCartWithPersist, cartOpen, setCartOpen,
    payment, setPayment: setPaymentWithPersist,
    editingOrder, setEditingOrder, addToCart, removeFromCart,
    clearCart, cartItemCount, buildOrderPayload,
  };
}
