import { API_BASE } from "../utils/constants.js";

class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

const tokenRef = { current: "" };

export function setApiToken(token) {
  tokenRef.current = token;
}

export function getApiToken() {
  return tokenRef.current;
}

export async function apiRequest(path, options = {}) {
  const headers = {
    ...(options.headers || {}),
    ...(options.body ? { "Content-Type": "application/json" } : {}),
  };

  const explicitToken = options.authToken;
  const bearerToken = explicitToken || tokenRef.current;
  if (bearerToken) {
    headers.Authorization = `Bearer ${bearerToken}`;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
      signal: options.signal || controller.signal,
    });

    let data = null;
    try {
      data = await response.json();
    } catch {
      data = null;
    }

    if (!response.ok) {
      if (response.status === 401 && tokenRef.current) {
        window.dispatchEvent(new CustomEvent("auth:unauthorized"));
      }
      throw new ApiError(
        data?.message || `Request failed: ${response.status}`,
        response.status,
        data,
      );
    }

    return data;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    if (err.name === "AbortError") {
      throw new ApiError("Request timed out", 0, null);
    }
    throw new ApiError(err.message || "Network error", 0, null);
  } finally {
    clearTimeout(timeout);
  }
}

export const api = {
  get: (path, opts) => apiRequest(path, { ...opts, method: "GET" }),
  post: (path, body, opts) =>
    apiRequest(path, { ...opts, method: "POST", body: JSON.stringify(body) }),
  put: (path, body, opts) =>
    apiRequest(path, { ...opts, method: "PUT", body: JSON.stringify(body) }),
  delete: (path, opts) =>
    apiRequest(path, { ...opts, method: "DELETE" }),
};

export { ApiError };
