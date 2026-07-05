import { useRef, useState, useCallback } from "react";

export default function useRequestLock() {
  const locked = useRef(false);
  const [isLocked, setIsLocked] = useState(false);

  const acquire = useCallback(() => {
    if (locked.current) return false;
    locked.current = true;
    setIsLocked(true);
    return true;
  }, []);

  const release = useCallback(() => {
    locked.current = false;
    setIsLocked(false);
  }, []);

  const withLock = useCallback(async (fn) => {
    if (locked.current) return;
    locked.current = true;
    setIsLocked(true);
    try {
      return await fn();
    } finally {
      locked.current = false;
      setIsLocked(false);
    }
  }, []);

  return { isLocked, acquire, release, withLock };
}
