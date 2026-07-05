import { api } from "./api.js";

export async function assignDelivery(orderId, waiterId = null) {
  return api.post("/delivery/assign", { orderId, waiterId });
}

export async function acceptDelivery(deliveryId) {
  return api.put(`/delivery/${deliveryId}/accept`);
}

export async function confirmPickup(deliveryId) {
  return api.put(`/delivery/${deliveryId}/pickup`);
}

export async function confirmDelivered(deliveryId) {
  return api.put(`/delivery/${deliveryId}/deliver`);
}

export async function getMyDeliveries(params = {}) {
  const qs = new URLSearchParams(params).toString();
  return api.get(`/delivery/mine${qs ? `?${qs}` : ""}`);
}

export async function getPendingDeliveries() {
  return api.get("/delivery/pending");
}

export async function getDelayedDeliveries() {
  return api.get("/delivery/delayed");
}

export async function getAwaitingAssignment() {
  return api.get("/delivery/awaiting-assignment");
}

export async function checkDelays() {
  return api.post("/delivery/check-delays");
}
