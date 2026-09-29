// First-touch marketing attribution: UTMs + referrer captured on the visitor's
// first landing, kept in first-party localStorage, sent to the backend at
// signup (POST /api/auth/signup) and once as an anonymous "visit" event
// (POST /api/track/visit). Never overwritten by later visits.
//
// Consent: the site has no cookie/consent banner today. Until one exists this
// honours the browser's own signals (Global Privacy Control, Do Not Track) and
// an explicit opt-out, localStorage "onyx_analytics_consent" = "denied".

const ATTR_KEY = "onyx_attribution";
const ANON_KEY = "onyx_anonymous_id";
const VISIT_SENT_KEY = "onyx_visit_sent";
const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"];

const clip = (v, n) => (typeof v === "string" && v.trim() ? v.trim().slice(0, n) : null);

// Pure: builds the attribution record for a landing. Same-site referrers are
// dropped (internal navigation is not a source).
export function parseAttribution(search, referrer, host, now = new Date()) {
  const p = new URLSearchParams(search || "");
  const out = {};
  for (const k of UTM_KEYS) out[k] = clip(p.get(k), 200);
  let ref = clip(referrer, 500);
  if (ref) {
    try {
      if (new URL(ref).host === host) ref = null;
    } catch {
      ref = null;
    }
  }
  out.referrer = ref;
  out.first_seen_at = now.toISOString();
  return out;
}

export function analyticsAllowed() {
  try {
    if (navigator.globalPrivacyControl === true) return false;
    if (navigator.doNotTrack === "1") return false;
    if (localStorage.getItem("onyx_analytics_consent") === "denied") return false;
  } catch {
    return false;
  }
  return true;
}

export function getAttribution() {
  try {
    const raw = localStorage.getItem(ATTR_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function getAnonymousId() {
  try {
    let id = localStorage.getItem(ANON_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(ANON_KEY, id);
    }
    return id;
  } catch {
    return null;
  }
}

// Call once at app start. Stores first-touch only, then reports the visit once.
export function initAttribution() {
  if (typeof window === "undefined" || !analyticsAllowed()) return;
  try {
    if (!localStorage.getItem(ATTR_KEY)) {
      const rec = parseAttribution(window.location.search, document.referrer, window.location.host);
      rec.landing_path = window.location.pathname.slice(0, 300);
      localStorage.setItem(ATTR_KEY, JSON.stringify(rec));
    }
    if (localStorage.getItem(VISIT_SENT_KEY)) return;
    const anonymous_id = getAnonymousId();
    if (!anonymous_id) return;
    localStorage.setItem(VISIT_SENT_KEY, "1");
    fetch("/api/track/visit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ anonymous_id, attribution: getAttribution() }),
      keepalive: true,
    }).catch(() => localStorage.removeItem(VISIT_SENT_KEY));
  } catch {
    /* storage unavailable: attribution is best-effort */
  }
}

// Fields to merge into the signup request body; empty when tracking is off.
export function signupAttributionPayload() {
  if (!analyticsAllowed()) return {};
  const anonymous_id = getAnonymousId();
  const attribution = getAttribution();
  return { ...(anonymous_id ? { anonymous_id } : {}), ...(attribution ? { attribution } : {}) };
}
