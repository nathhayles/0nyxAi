// The signed-in user's ambassador status (GET /api/ambassador/me), shared by
// every component through one module-level store: fetched once per sign-in,
// refetched on refresh() (e.g. after a charge, to update the usage numbers)
// and cleared on sign-out.
//
// While loading, or if the request fails, `ambassador` is null -- the UI then
// behaves as for a normal account and the server still refuses anything an
// ambassador isn't allowed (403 AMBASSADOR_NOT_ALLOWED), so a failed fetch
// can't unlock anything.
import { useEffect, useSyncExternalStore } from "react";
import { getAuthHeaders } from "../utils/auth.js";

let state = { loading: true, ambassador: null };
let inflight = null;
let subscribedToAuth = false;
const listeners = new Set();

function setState(next) {
  state = next;
  listeners.forEach((l) => l());
}

export function refreshAmbassador() {
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const headers = await getAuthHeaders();
      if (!headers.Authorization) { setState({ loading: false, ambassador: null }); return; }
      const res = await fetch("/api/ambassador/me", { headers });
      const data = res.ok ? await res.json() : null;
      setState({ loading: false, ambassador: data?.ambassador === true ? data : null });
    } catch {
      setState({ loading: false, ambassador: null });
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

async function subscribeToAuth() {
  if (subscribedToAuth) return;
  subscribedToAuth = true;
  try {
    const { supabase } = await import("../supabaseClient.js");
    supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") setState({ loading: false, ambassador: null });
      else if (event === "SIGNED_IN" || event === "USER_UPDATED") refreshAmbassador();
    });
  } catch { /* no auth client (tests) */ }
  // Usage numbers change as the user spends: re-read when the tab comes back
  // into view (ambassadors only -- one small request, no polling).
  if (typeof document !== "undefined") {
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible" && state.ambassador) refreshAmbassador();
    });
  }
}

function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export default function useAmbassador() {
  const snapshot = useSyncExternalStore(subscribe, () => state, () => state);
  useEffect(() => {
    subscribeToAuth();
    if (state.loading && !inflight) refreshAmbassador();
  }, []);
  return { ...snapshot, refresh: refreshAmbassador };
}
