// PWA Phase 0 wiring: service worker registration + install-prompt capture.
// Kept as its own small module (not inline in main.jsx) so it's easy to
// find/extend in later phases (push notification subscription, etc.)
// without touching the app's entry point again.

export function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return; // unsupported browser -- no-op, never throws
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((err) => {
      // Never let a registration failure affect the app itself -- this is
      // pure enhancement, not a requirement to function.
      console.warn("[pwa] service worker registration failed:", err.message);
    });
  });
}

// The "Add to Home Screen" prompt Chrome/Android fires is NOT something the
// browser shows automatically -- the app must capture the event, suppress
// the browser's own default mini-infobar, and trigger prompt() later from a
// real user gesture (e.g. a button click). iOS Safari never fires this
// event at all (no beforeinstallprompt support) -- install there is via
// Safari's own Share -> Add to Home Screen, which can't be triggered
// programmatically; that's a real platform limitation, not a bug to chase
// here.
//
// deferredInstallPrompt is exported so any component can check "is an
// install actually available right now" (null until the browser fires the
// event, and only ever on a supporting browser) before showing install UI --
// the actual banner/button UI is deliberately left for Phase 1, this is
// just the underlying capture mechanism Phase 0 needs to have in place.
export let deferredInstallPrompt = null;

export function captureInstallPrompt(onAvailable) {
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
    onAvailable?.(event);
  });
  window.addEventListener("appinstalled", () => {
    deferredInstallPrompt = null;
  });
}

export async function promptInstall() {
  if (!deferredInstallPrompt) return { outcome: "unavailable" };
  deferredInstallPrompt.prompt();
  const choice = await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null;
  return choice; // { outcome: "accepted" | "dismissed" }
}
