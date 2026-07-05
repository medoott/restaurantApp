import { api } from "./api.js";

const DEV_TOKEN_KEY = "coffe_dev_token";

export function getStoredDevToken() {
  return localStorage.getItem(DEV_TOKEN_KEY) || "";
}

export function storeDevToken(token) {
  localStorage.setItem(DEV_TOKEN_KEY, token);
}

export function clearDevToken() {
  localStorage.removeItem(DEV_TOKEN_KEY);
}

export async function developerLogin(email, password) {
  const data = await api.post("/developer/login", { email, password });
  const token = data?.data?.token;
  if (!token) throw new Error("Developer login failed");
  return token;
}

export async function verifyDeveloper(token) {
  const data = await api.get("/developer/verify", {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data?.isDeveloper === true;
}

export async function getDeveloperSettings(token) {
  const data = await api.get("/developer/settings", {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data?.data || [];
}

export async function getDeveloperSetting(token, key) {
  const data = await api.get(`/developer/settings/${key}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data?.data;
}

export async function updateDeveloperSetting(token, key, body) {
  const data = await api.put(`/developer/settings/${key}`, body, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
}

export async function deleteDeveloperSetting(token, key) {
  const data = await api.delete(`/developer/settings/${key}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
}

export async function getDeveloperLogs(token, params = {}) {
  const qs = new URLSearchParams(params).toString();
  const data = await api.get(`/developer/logs${qs ? `?${qs}` : ""}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
}

export async function getDeveloperLogActions(token) {
  const data = await api.get("/developer/logs/actions", {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data?.data || [];
}

export async function getSystemCache(token) {
  const data = await api.get("/developer/system/cache", {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data?.data;
}

export async function getSystemEnv(token) {
  const data = await api.get("/developer/system/env", {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data?.data;
}

export async function getSystemDiagnostics(token) {
  const data = await api.get("/developer/system/diagnostics", {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data?.data;
}
