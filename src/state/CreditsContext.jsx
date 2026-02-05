import React, { createContext, useContext, useEffect, useState } from "react";

const CreditsContext = createContext(null);
const STORAGE_KEY = "credits_balance";
const DEFAULT_CREDITS = 120;

export function CreditsProvider({ children }) {
  const [credits, setCredits] = useState(DEFAULT_CREDITS);

  useEffect(() => {
    const stored = Number(localStorage.getItem(STORAGE_KEY));
    if (Number.isFinite(stored)) {
      setCredits(stored);
    } else {
      localStorage.setItem(STORAGE_KEY, String(DEFAULT_CREDITS));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(credits));
  }, [credits]);

  return (
    <CreditsContext.Provider value={{ credits, setCredits }}>
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
