// Signup-time marketing attribution. Nothing here is stored on the visitor's
// device: no localStorage, sessionStorage, IndexedDB or cookies. On app load the
// UTM parameters and document.referrer are read into a module variable, sent
// with the signup request (POST /api/auth/signup) and forgotten. A reload or
// closing the tab loses them, by design.
//
// Consent: the site has no consent banner. The UTM/referrer fields are skipped
// when the browser signals Global Privacy Control or Do Not Track, or when
// localStorage "onyx_analytics_consent" = "denied" (read-only here). The
// self-reported "How did you hear about us?" answer is typed by the user and is
// sent regardless (see Signup.jsx).

const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"];

// Keys written by the earlier localStorage-based version of this feature.
// Removed on load so visitors who got that version are cleaned up.
const LEGACY_KEYS = ["onyx_attribution", "onyx_anonymous_id", "onyx_visit_sent"];

let captured = null;

const clip = (v, n) => (typeof v === "string" && v.trim() ? v.trim().slice(0, n) : null);

// Pure: builds the attribution record for a landing. Same-site referrers are
// dropped (internal navigation is not a source). Returns null when there is
// nothing to record.
export function parseAttribution(search, referrer, host) {
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
  return Object.values(out).some(Boolean) ? out : null;
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

// Call once at app start. In-memory only.
export function initAttribution() {
  if (typeof window === "undefined") return;
  try {
    for (const k of LEGACY_KEYS) localStorage.removeItem(k);
  } catch {
    /* storage unavailable: nothing to clean up */
  }
  captured = analyticsAllowed()
    ? parseAttribution(window.location.search, document.referrer, window.location.host)
    : null;
}

export function getAttribution() {
  return captured;
}

// Dropdown for the optional "How did you hear about us?" question.
export const SOURCE_OPTIONS = [
  { value: "instagram", label: "Instagram" },
  { value: "tiktok", label: "TikTok" },
  { value: "youtube", label: "YouTube" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "facebook_meta", label: "Facebook/Meta" },
  { value: "google_search", label: "Google search" },
  { value: "ai_assistant", label: "ChatGPT or another AI assistant" },
  { value: "friend_colleague", label: "A friend or colleague" },
  { value: "blog_learn", label: "A blog or Learn guide" },
  { value: "other", label: "Other" },
];
export const SOURCE_OTHER_MAX = 100;

// Fields to merge into the signup request body; empty when tracking is off.
export function signupAttributionPayload() {
  return captured ? { attribution: captured } : {};
}

// The self-reported answer, sent even when GPC/DNT is set because the user typed it.
export function selfReportedPayload(source, other) {
  if (!SOURCE_OPTIONS.some((o) => o.value === source)) return {};
  const out = { self_reported_source: source };
  if (source === "other" && other && other.trim()) out.self_reported_other = other.trim().slice(0, SOURCE_OTHER_MAX);
  return out;
}
