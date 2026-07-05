import { api } from "./api.js";

export async function login(email, password) {
  const data = await api.post("/auth/login", { email, password });
  const token = data?.data?.token || data?.token;
  if (!token) throw new Error("Login response did not include a token");
  storeToken(token);
  return token;
}

export async function signup(fields) {
  const data = await api.post("/auth/signup", {
    name: fields.name,
    email: fields.email,
    password: fields.password,
    phone: fields.phone,
  });
  return data;
}

export async function logout() {
  try {
    await api.post("/auth/logout");
  } catch {
  } finally {
    clearToken();
  }
}

export function getStoredToken() {
  try {
    return sessionStorage.getItem("coffe_token") || "";
  } catch {
    return "";
  }
}

export function storeToken(token) {
  try {
    sessionStorage.setItem("coffe_token", token);
  } catch {}
}

export function clearToken() {
  try {
    sessionStorage.removeItem("coffe_token");
  } catch {}
}

export async function fetchProfile() {
  const data = await api.get("/user/profile");
  return data?.data?.user || data?.user || null;
}
