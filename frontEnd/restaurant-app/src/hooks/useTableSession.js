import { useState, useCallback, useEffect } from "react";
import * as tableService from "../services/table.js";

export default function useTableSession() {
  const [sessionToken, setSession] = useState(() => tableService.getSessionToken());
  const [tableNumber, setNumber] = useState(() => tableService.getTableNumber());
  const [sessionLoading, setSessionLoading] = useState(false);
  const [sessionError, setSessionError] = useState("");

  useEffect(() => {
    const urlTable = tableService.getTableFromUrl();
    if (urlTable && !tableService.getSessionToken()) {
      tableService.clearSession();
      setSession(null);
      setNumber(urlTable);
    }
  }, []);

  const startSession = useCallback(async (tableNum, options = {}) => {
    setSessionLoading(true);
    setSessionError("");
    try {
      const session = await tableService.startTableSession(tableNum, options);
      if (session?.sessionToken) {
        setSession(session.sessionToken);
        setNumber(tableNum);
      }
      return session;
    } catch (err) {
      setSessionError(err.message || "Failed to create table session");
      throw err;
    } finally {
      setSessionLoading(false);
    }
  }, []);

  const endSession = useCallback(async () => {
    if (sessionToken) {
      try {
        await tableService.endTableSession(sessionToken);
      } catch { }
    }
    setSession(null);
    setNumber(null);
  }, [sessionToken]);

  const clearSession = useCallback(() => {
    tableService.clearSession();
    setSession(null);
    setNumber(null);
    setSessionError("");
  }, []);

  const refreshSession = useCallback(async () => {
    if (!sessionToken) return null;
    try {
      const session = await tableService.verifySession(sessionToken);
      setNumber(tableService.getTableNumber());
      return session;
    } catch (err) {
      if (err.status === 401) clearSession();
      return null;
    }
  }, [sessionToken, clearSession]);

  const isVerified = !!sessionToken && !!tableNumber;

  return {
    sessionToken,
    tableNumber,
    isVerified,
    sessionLoading,
    sessionError,
    startSession,
    endSession,
    clearSession,
    refreshSession,
  };
}
