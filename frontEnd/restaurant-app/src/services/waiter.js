import { api } from "./api.js";
import { getSessionToken } from "./table.js";

export async function callWaiter(message = "") {
  const sessionToken = getSessionToken();
  if (!sessionToken) throw new Error("Please scan the table QR code first.");
  return api.post("/waiter/call", { sessionToken, message });
}

export async function requestBill(message = "") {
  const sessionToken = getSessionToken();
  if (!sessionToken) throw new Error("Please scan the table QR code first.");
  return api.post("/waiter/bill", { sessionToken, message });
}

export async function requestWater(message = "") {
  const sessionToken = getSessionToken();
  if (!sessionToken) throw new Error("Please scan the table QR code first.");
  return api.post("/waiter/water", { sessionToken, message });
}

export async function requestCutlery(message = "") {
  const sessionToken = getSessionToken();
  if (!sessionToken) throw new Error("Please scan the table QR code first.");
  return api.post("/waiter/cutlery", { sessionToken, message });
}

export async function requestNapkins(message = "") {
  const sessionToken = getSessionToken();
  if (!sessionToken) throw new Error("Please scan the table QR code first.");
  return api.post("/waiter/napkins", { sessionToken, message });
}

export async function requestSauce(message = "") {
  const sessionToken = getSessionToken();
  if (!sessionToken) throw new Error("Please scan the table QR code first.");
  return api.post("/waiter/sauce", { sessionToken, message });
}

export async function requestAssistance(message = "") {
  const sessionToken = getSessionToken();
  if (!sessionToken) throw new Error("Please scan the table QR code first.");
  return api.post("/waiter/assistance", { sessionToken, message });
}

export async function requestCustom(message = "") {
  const sessionToken = getSessionToken();
  if (!sessionToken) throw new Error("Please scan the table QR code first.");
  return api.post("/waiter/custom", { sessionToken, message });
}

export async function getPendingCounts() {
  return api.get("/waiter/pending-counts");
}

export async function acknowledgeRequest(id) {
  return api.put(`/waiter/requests/${id}/acknowledge`);
}

export async function resolveRequest(id) {
  return api.put(`/waiter/requests/${id}/resolve`);
}
