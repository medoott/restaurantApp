import { api } from "./api.js";

export async function createPaymentSession(orderId, paymentMethod = "Cash") {
  return api.post("/payments/create", { orderId, paymentMethod });
}

export async function processPayment(paymentSessionId, opts = {}) {
  return api.put(`/payments/${paymentSessionId}/process`, opts);
}

export async function getPendingPayments() {
  return api.get("/payments/pending");
}

export async function getPaymentHistory() {
  return api.get("/payments/history");
}

export async function closeTable(orderId) {
  return api.post("/payments/close-table", { orderId });
}
