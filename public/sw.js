// Onyx Reelz PWA service worker -- Phase 0 foundation.
//
// Deliberately conservative caching strategy, written by hand rather than
// via a build-time precache tool (e.g. Workbox/vite-plugin-pwa) -- no new
// build dependency for what the PWA scope doc calls "mostly configuration,
// not new feature work". Runtime caching only; nothing is precached at
// install, so there's no hashed-filename manifest to keep in sync with
// every Vite build.
//
// Correctness rule that matters most here: this app's real data (credit
// balance, reel state, job status, auth) all comes from /api/* and from
// Supabase directly -- NEVER cache either. A stale cached API response
// (e.g. an old credit balance, or a reel that looks "done" when it isn't)
// would be a real, confusing bug, not a performance win. Only same-origin
// static assets and page shells are ever touched here.
const CACHE_VERSION = "onyx-pwa-v1";
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const PAGES_CACHE = `${CACHE_VERSION}-pages`;

self.addEventListener("install", () => {
  // No precaching -- see file header. Take over immediately rather than
  // waiting for all tabs to close, so a fresh deploy's service worker
  // update reaches users on their next navigation, not next full restart.
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names
          .filter((n) => n.startsWith("onyx-pwa-") && !n.startsWith(CACHE_VERSION))
          .map((n) => caches.delete(n))
      );
      await self.clients.claim();
    })()
  );
});

function isApiOrAuthRequest(url) {
  // Never intercept: this app's own backend, and Supabase's real-time
  // auth/data API directly. Both must always hit the network live.
  return url.pathname.startsWith("/api/") || url.hostname.endsWith("supabase.co");
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return; // never intercept writes
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) {
    // Cross-origin (Supabase, R2 media, fal.ai, etc.) -- pass through
    // untouched. Only this app's own same-origin assets/pages are cached.
    if (isApiOrAuthRequest(url)) return;
    return;
  }
  if (isApiOrAuthRequest(url)) return;

  // Vite's hashed build output (/assets/*.js, *.css, etc.) -- content-hashed
  // filenames mean a cached response is always correct for that exact URL,
  // so cache-first is safe and fast, with network as a fallback for a
  // cold cache.
  if (url.pathname.startsWith("/assets/")) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        const response = await fetch(request);
        if (response.ok) {
          const cache = await caches.open(STATIC_CACHE);
          cache.put(request, response.clone());
        }
        return response;
      })()
    );
    return;
  }

  // Page navigations (the HTML shell) -- network-first, so a user online
  // always gets the latest deployed version; falls back to the last cached
  // shell only when genuinely offline, for basic offline resilience rather
  // than a hard failure.
  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(request);
          if (response.ok) {
            const cache = await caches.open(PAGES_CACHE);
            cache.put(request, response.clone());
          }
          return response;
        } catch {
          const cached = await caches.match(request);
          return cached || caches.match("/");
        }
      })()
    );
  }
});
