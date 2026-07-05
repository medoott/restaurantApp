import { api } from "./api.js";

export function getSessionToken() {
  try {
    return sessionStorage.getItem("coffe_table_session") || "";
  } catch {
    return "";
  }
}

export function setSessionToken(token) {
  try {
    if (token) {
      sessionStorage.setItem("coffe_table_session", token);
    } else {
      sessionStorage.removeItem("coffe_table_session");
    }
  } catch { }
}

export function getTableNumber() {
  try {
    const n = sessionStorage.getItem("coffe_table_number");
    return n ? Number(n) : null;
  } catch {
    return null;
  }
}

export function setTableNumber(n) {
  try {
    if (n != null) {
      sessionStorage.setItem("coffe_table_number", String(n));
    } else {
      sessionStorage.removeItem("coffe_table_number");
    }
  } catch { }
}

export async function startTableSession(tableNumber, options = {}) {
  const data = await api.post("/tables/session/start", {
    tableNumber,
    customerName: options.customerName || "",
    customerPhone: options.customerPhone || "",
  });
  if (data?.data?.sessionToken) {
    setSessionToken(data.data.sessionToken);
    setTableNumber(tableNumber);
  }
  return data?.data || null;
}

export async function verifySession(sessionToken) {
  const data = await api.post("/tables/session/verify", { sessionToken });
  return data?.data || null;
}

export async function endTableSession(sessionToken) {
  const data = await api.post("/tables/session/end", { sessionToken });
  setSessionToken(null);
  setTableNumber(null);
  return data || null;
}

export function clearSession() {
  setSessionToken(null);
  setTableNumber(null);
}

export function getTableFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const table = params.get("table");
  return table ? Number(table) : null;
}
