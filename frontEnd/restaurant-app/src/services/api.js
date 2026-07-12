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
  const headers = { ...(options.headers || {}) };
  const explicitToken = options.authToken;
  const bearerToken = explicitToken || tokenRef.current;

  if (bearerToken) {
    headers.Authorization = `Bearer ${bearerToken}`;
  }

  const hasBody = options.body !== undefined && options.body !== null;
  if (hasBody) {
    headers["Content-Type"] = headers["Content-Type"] || "application/json";
  }

  const maxRetries = Math.max(0, Number(options.retries ?? 1));
  const timeoutMs = Number(options.timeoutMs ?? options.timeout ?? 15000);

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers,
        body: hasBody && typeof options.body !== "string" ? JSON.stringify(options.body) : options.body,
        signal: options.signal || controller.signal,
      });

      if (response.status === 204) return null;

      let data = null;
      try {
        data = await response.json();
      } catch {
        data = null;
      }

      if (!response.ok) {
        if (response.status === 401 && bearerToken && !options.skipAuthRedirect) {
          window.dispatchEvent(new CustomEvent("auth:unauthorized"));
        }

        if ((response.status >= 500 || response.status === 429) && attempt < maxRetries) {
          continue;
        }

        throw new ApiError(
          data?.message || `Request failed: ${response.status}`,
          response.status,
          data,
        );
      }

      return data;
    } catch (err) {
      if (err instanceof ApiError) {
        if ((err.status >= 500 || err.status === 429) && attempt < maxRetries) {
          continue;
        }
        throw err;
      }

      if ((err?.name === "AbortError" || err?.message === "Failed to fetch") && attempt < maxRetries) {
        continue;
      }

      if (err?.name === "AbortError") {
        throw new ApiError("Request timed out", 0, null);
      }

      throw new ApiError(err?.message || "Network error", 0, null);
    } finally {
      clearTimeout(timeout);
    }
  }

  throw new ApiError("Request failed", 0, null);
}

export const api = {
  get: (path, opts) => apiRequest(path, { ...opts, method: "GET" }),
  post: (path, body, opts) =>
    apiRequest(path, { ...opts, method: "POST", body }),
  put: (path, body, opts) =>
    apiRequest(path, { ...opts, method: "PUT", body }),
  delete: (path, opts) =>
    apiRequest(path, { ...opts, method: "DELETE" }),
};

export { ApiError };
