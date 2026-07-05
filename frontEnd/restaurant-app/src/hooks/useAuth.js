import { useState, useEffect, useCallback, useMemo } from "react";
import * as authService from "../services/auth.js";
import { setApiToken } from "../services/api.js";

export default function useAuth() {
  const [token, setToken] = useState(() => {
    const t = authService.getStoredToken();
    if (t) setApiToken(t);
    return t;
  });
  const [user, setUser] = useState(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState("login");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const [profileError, setProfileError] = useState("");

  useEffect(() => {
    if (token) setApiToken(token);
    if (!token) {
      setUser(null);
      setApiToken("");
      setProfileError("");
      return;
    }
    let alive = true;
    setProfileError("");
    authService
      .fetchProfile()
      .then((u) => {
        if (alive) setUser(u);
      })
      .catch((err) => {
        if (alive) {
          if (err?.status === 401) {
            authService.clearToken();
            setToken("");
            setUser(null);
          } else {
            setProfileError(err?.message || "Failed to load profile");
          }
        }
      });
    return () => {
      alive = false;
    };
  }, [token]);

  useEffect(() => {
    function handleUnauthorized() {
      authService.clearToken();
      setToken("");
      setUser(null);
      setAuthOpen(true);
      setAuthMode("login");
    }
    window.addEventListener("auth:unauthorized", handleUnauthorized);
    return () => window.removeEventListener("auth:unauthorized", handleUnauthorized);
  }, []);

  const login = useCallback(async (email, password) => {
    setAuthLoading(true);
    setAuthError("");
    setProfileError("");
    try {
      const t = await authService.login(email, password);
      authService.storeToken(t);
      setToken(t);
      setAuthOpen(false);
      return true;
    } catch (err) {
      setAuthError(err.message || "Authentication failed");
      return false;
    } finally {
      setAuthLoading(false);
    }
  }, []);

  const signupThenLogin = useCallback(async (formData) => {
    setAuthLoading(true);
    setAuthError("");
    setProfileError("");
    try {
      await authService.signup(formData);
      setAuthMode("login");
      setAuthError("");
      setProfileError("Signup successful. Please login.");
      return true;
    } catch (err) {
      setAuthError(err.message || "Registration failed");
      return false;
    } finally {
      setAuthLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    authService.logout().catch(() => {});
    authService.clearToken();
    setToken("");
    setUser(null);
  }, []);

  const role = user?.role || "User";

  return useMemo(() => ({
    token, user, role,
    authOpen, setAuthOpen, authMode, setAuthMode,
    authLoading, authError, setAuthError, profileError,
    login, signupThenLogin, logout,
  }), [token, user, role, authOpen, authMode, authLoading, authError, setAuthError, profileError, login, signupThenLogin, logout]);
}
