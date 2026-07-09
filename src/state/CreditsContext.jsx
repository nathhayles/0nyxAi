import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { getAuthHeaders } from "../utils/auth.js";

const CreditsContext = createContext(null);
const CHECKOUT_RETURN_FLAG = "returning_from_checkout";

export function CreditsProvider({ children }) {
  const [balance, setBalance] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const hasSessionRef = useRef(false);

  const fetchBalance = useCallback(async () => {
    if (!hasSessionRef.current) return;
    setLoading(true);
    try {
      const headers = await getAuthHeaders();
      if (!headers.Authorization) return;
      const res = await fetch("/api/credits/balance", { headers });
      if (!res.ok) throw new Error(`credits balance ${res.status}`);
      const data = await res.json();
      setBalance(data?.balance ?? data?.credits ?? 0);
      setError(null);
    } catch (e) {
      // keep last known balance on a transient failure rather than zeroing it out
      setError(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let unsubscribed = false;
    let subscription = null;

    import("../supabaseClient.js").then(({ supabase }) => {
      supabase.auth.getSession().then(({ data }) => {
        if (unsubscribed) return;
        hasSessionRef.current = !!data?.session;
        if (data?.session) fetchBalance();
      });

      const { data } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === "SIGNED_OUT") {
          hasSessionRef.current = false;
          setBalance(null);
          return;
        }
        if (session) {
          hasSessionRef.current = true;
          fetchBalance();
        }
      });
      subscription = data?.subscription;
    });

    return () => {
      unsubscribed = true;
      subscription?.unsubscribe();
    };
  }, [fetchBalance]);

  useEffect(() => {
    function onFocus() {
      if (hasSessionRef.current) fetchBalance();
    }
    function onVisibilityChange() {
      if (document.visibilityState === "visible" && hasSessionRef.current) fetchBalance();
    }
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [fetchBalance]);

  useEffect(() => {
    if (sessionStorage.getItem(CHECKOUT_RETURN_FLAG)) {
      sessionStorage.removeItem(CHECKOUT_RETURN_FLAG);
      fetchBalance();
    }
  }, [fetchBalance]);

  return (
    <CreditsContext.Provider value={{ balance, loading, error, refreshCredits: fetchBalance }}>
      {children}
    </CreditsContext.Provider>
  );
}

export function useCredits() {
  const ctx = useContext(CreditsContext);
  if (!ctx) {
    throw new Error("useCredits must be used inside CreditsProvider");
  }
  return ctx;
}
