export const STATUS_STYLES = {
  Pending: "bg-amber-100 text-amber-700 ring-1 ring-amber-300",
  Preparing: "bg-orange-100 text-orange-700 ring-1 ring-orange-300",
  Ready: "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-300",
  Served: "bg-teal-100 text-teal-700 ring-1 ring-teal-300",
  Paid: "bg-green-100 text-green-700 ring-1 ring-green-300",
  Cancelled: "bg-rose-100 text-rose-700 ring-1 ring-rose-300",
  Rejected: "bg-red-100 text-red-700 ring-1 ring-red-300",
};

export const PAYMENT_STATUS_STYLES = {
  unpaid: "bg-amber-100 text-amber-700 ring-1 ring-amber-300",
  paid: "bg-green-100 text-green-700 ring-1 ring-green-300",
  refunded: "bg-purple-100 text-purple-700 ring-1 ring-purple-300",
  partially_paid: "bg-yellow-100 text-yellow-700 ring-1 ring-yellow-300",
};

export const TAX_RATE = 0.08;

const fallbackApiBase = typeof window !== "undefined"
  ? ((window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1" || window.location.hostname === "0.0.0.0")
    ? `${window.location.protocol}//${window.location.hostname}:3000`
    : window.location.origin)
  : "http://localhost:3000";

export const API_BASE =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") || fallbackApiBase;

export const ORDER_STATUSES = [
  "Pending",
  "Preparing",
  "Ready",
  "Served",
  "Paid",
  "Cancelled",
  "Rejected",
];

export const ORDER_STATUS_FLOW = [
  "Pending",
  "Preparing",
  "Ready",
  "Served",
  "Paid",
];

export const VALID_TRANSITIONS = {
  Pending: ["Preparing", "Cancelled", "Rejected"],
  Preparing: ["Ready", "Cancelled"],
  Ready: ["Served"],
  Served: ["Paid"],
  Paid: [],
  Cancelled: [],
  Rejected: [],
};


