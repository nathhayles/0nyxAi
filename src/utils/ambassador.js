// Ambassador accounts (backend: lib/ambassadorPolicy.js, migration 087).
//
// This file only decides what the UI SHOWS. Every rule is enforced by the
// server, which answers a blocked feature with 403 AMBASSADOR_NOT_ALLOWED --
// hiding a control here is about not offering something that will be
// refused, never about security.
//
// Pure functions (no React, no fetch) so they can be unit-tested with node --test.

// Keep in step with the backend's AMBASSADOR_PRO_VIDEO_MODELS / AD_ASPECT_RATIOS.
export const AMBASSADOR_PRO_VIDEO_MODELS = Object.freeze(["seedance-1-pro", "wan-2.5", "vidu-q3-turbo"]);
export const AMBASSADOR_RATIOS = Object.freeze(["9:16", "16:9", "1:1", "4:5"]);

// `amb` is the GET /api/ambassador/me body when ambassador === true, else null.
export const isAmbassador = (amb) => !!amb && amb.ambassador === true;
export const isPro = (amb) => isAmbassador(amb) && amb.tier === "pro";

// Feature switches. One place, so a page never has to know the tier rules.
// true = show the feature.
export function ambassadorFeatures(amb) {
  if (!isAmbassador(amb)) {
    return {
      aiVideo: true, autoModel: true, presenter: true, avatars: true, regenerate: true, reshoot: true,
      upscale: true, lipSync: true, fadr: true, musicGeneration: true, trim: true, premiumVoices: true,
      startFrames: true, motionRef: true, compare: true,
    };
  }
  const pro = amb.tier === "pro";
  return {
    aiVideo: pro, autoModel: false, presenter: false, avatars: false, regenerate: pro, reshoot: false,
    upscale: false, lipSync: false, fadr: false, musicGeneration: false, trim: false, premiumVoices: false,
    startFrames: false, motionRef: false, compare: false,
  };
}

// Video model options a picker may offer. `options` are { value|id, ... }.
export function filterVideoModels(options, amb, key = "value") {
  if (!isAmbassador(amb)) return options;
  if (!isPro(amb)) return [];
  return (options || []).filter((o) => AMBASSADOR_PRO_VIDEO_MODELS.includes(o?.[key]));
}

export function isAllowedVideoModel(model, amb) {
  if (!isAmbassador(amb)) return true;
  return isPro(amb) && AMBASSADOR_PRO_VIDEO_MODELS.includes(model);
}

// The model a picker should land on: the current one if allowed, else the
// first allowed option (Pro), else null (Limited -- no AI video).
export function defaultVideoModel(current, amb, options = null, key = "value") {
  if (isAllowedVideoModel(current, amb)) return current;
  if (!isPro(amb)) return null;
  const allowed = options ? filterVideoModels(options, amb, key).map((o) => o[key]) : AMBASSADOR_PRO_VIDEO_MODELS;
  return allowed[0] ?? AMBASSADOR_PRO_VIDEO_MODELS[0];
}

// Aspect ratio choices. Accepts strings or { value|id } objects.
export function filterRatios(ratios, amb, key = "value") {
  if (!isAmbassador(amb)) return ratios;
  return (ratios || []).filter((r) => AMBASSADOR_RATIOS.includes(typeof r === "string" ? r : r?.[key]));
}

export function defaultRatio(current, amb) {
  if (!isAmbassador(amb) || AMBASSADOR_RATIOS.includes(current)) return current;
  return "9:16";
}

// Same rule as the backend's lib/ttsCharge.js isPremiumVoice: free only when
// positively a standard voice (OpenAI, or Google Standard/WaveNet by name).
const STANDARD_GOOGLE_VOICE = /^[a-z]{2,3}-[A-Z]{2}-(Standard|Wavenet)-[A-Z]$/i;
export function isPremiumVoice(provider, voice) {
  const p = String(provider ?? "").trim().toLowerCase();
  if (p === "openai") return false;
  if (p === "google") {
    if (voice == null || voice === "") return false;
    return !(typeof voice === "string" && STANDARD_GOOGLE_VOICE.test(voice));
  }
  return true;
}

// User-facing text for the backend's ambassador refusals, or null when the
// response isn't one (the caller keeps its own message then).
export function ambassadorErrorMessage(data) {
  switch (data?.code) {
    case "AMBASSADOR_NOT_ALLOWED":
      return "This feature isn't included in your ambassador account.";
    case "AMBASSADOR_CAP_REACHED": {
      const cap = Number(data?.cap);
      return `You've reached this month's ambassador limit${Number.isFinite(cap) && cap > 0 ? ` of ${cap} credits` : ""}. It resets on the 1st (UTC).`;
    }
    case "AMBASSADOR_VO_MINUTES_REACHED":
      return "You've used this month's ambassador voiceover minutes. They reset on the 1st (UTC).";
    case "AMBASSADOR_RATIO_NOT_SUPPORTED":
      return "Ambassador exports support 9:16, 16:9, 1:1 and 4:5. Switch the aspect ratio and try again.";
    case "AMBASSADOR_AD_UNAVAILABLE":
      return "Export is temporarily unavailable. Please try again shortly.";
    default:
      return null;
  }
}

// "120 / 200" style usage numbers for the badge and panels.
export function ambassadorUsageSummary(amb) {
  if (!isAmbassador(amb)) return null;
  const n = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
  return {
    tierLabel: amb.tier === "pro" ? "Pro" : "Limited",
    spent: n(amb.spent_this_month),
    cap: n(amb.monthly_cap),
    capRemaining: n(amb.cap_remaining),
    voUsed: Math.round(n(amb.vo_minutes_used) * 10) / 10,
    voQuota: n(amb.vo_minutes_quota),
    voRemaining: Math.round(n(amb.vo_minutes_remaining) * 10) / 10,
  };
}
