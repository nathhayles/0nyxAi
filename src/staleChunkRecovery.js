// Recovery for a tab left open across a deploy. `vite build` empties
// dist/assets, so an already-loaded page that later lazy-loads a route
// (React.lazy) or calls import() asks for a chunk hash that no longer
// exists -- nginx 404s it, the import rejects, and with nothing to catch it
// React unmounts the whole tree: a blank black page until a manual refresh.
// A reload fetches the new index.html (served no-store, and network-first
// in public/sw.js), which references the new chunks.
//
// The reload is guarded so it can never loop: one automatic reload per
// RELOAD_GUARD_MS, tracked in sessionStorage so it survives the reload
// itself. If the chunk is still missing after that one reload (a genuinely
// broken deploy, not a stale tab), the error surfaces to AppErrorBoundary's
// "Something went wrong" screen instead. index.html's inline guard, which
// handles the entry chunk itself failing, shares the same key and window.

const RELOAD_GUARD_KEY = "onyx-chunk-reload-at";
const RELOAD_GUARD_MS = 60000;

let reloading = false;

// Chromium, Firefox and Safari word a failed dynamic import differently;
// "Unable to preload CSS" is Vite's own error for a missing CSS chunk.
const CHUNK_ERROR_RE = /Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed|Unable to preload CSS/i;

export function isChunkLoadError(error) {
  return CHUNK_ERROR_RE.test(String(error?.message || error || ""));
}

export function isReloadingForStaleChunk() {
  return reloading;
}

// Reloads the page unless one automatic reload already happened within the
// guard window. Returns true when a reload is under way (including one
// started by an earlier call), false when the caller must show an error.
export function reloadOnceForStaleChunk() {
  if (reloading) return true;
  try {
    const last = Number(sessionStorage.getItem(RELOAD_GUARD_KEY));
    if (last && Date.now() - last < RELOAD_GUARD_MS) return false;
    sessionStorage.setItem(RELOAD_GUARD_KEY, String(Date.now()));
  } catch {
    // No storage (private mode, blocked site data): the reload can't be
    // guarded, so don't auto-reload at all -- the error screen offers one.
    return false;
  }
  reloading = true;
  window.location.reload();
  return true;
}

// Vite wraps every import() in the build (React.lazy routes and the plain
// `await import("./supabaseClient")` calls alike) and dispatches
// vite:preloadError when the chunk or its CSS fails to load. Deliberately
// not preventDefault()-ed: the rejection still propagates, so a lazy route
// renders AppErrorBoundary's placeholder while the reload is under way,
// rather than resolving to undefined and crashing somewhere less clear.
export function installStaleChunkRecovery() {
  // Tells index.html's inline entry-chunk guard the app booted; from here
  // on, failed chunks are handled below and by AppErrorBoundary.
  window.__onyxBooted = true;
  window.addEventListener("vite:preloadError", (event) => {
    console.warn("[stale-chunk] failed to load a build chunk, reloading once:", event.payload?.message || event.payload);
    reloadOnceForStaleChunk();
  });
}
