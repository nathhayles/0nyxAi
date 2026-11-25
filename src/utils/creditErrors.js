// One user-facing message for "not enough credits", whatever route said it.
//
// Every paid backend route answers a failed charge with HTTP 402. Most send
// { error: "Insufficient credits", code: "INSUFFICIENT_CREDITS", required },
// a few send only { error } (fadr, heygen, upscale, lipsync). Call sites used
// to show data.error raw, so users saw a bare "Insufficient credits" (or, in
// the native apps, purchase wording from the server).
//
// Web: says how many credits are needed when the server says so.
// Native apps (Apple 3.1.1 / Google Play billing): NO_CREDITS_TEXT only.
import { purchasesAllowed, NO_CREDITS_TEXT } from "./nativeApp.js";
import { ambassadorErrorMessage } from "./ambassador.js";

// 402 is not always about credits: the TTS minutes pool answers 402
// { error: "vo_minutes_exceeded" } and the stock-video quota 402
// { code: "STOCK_QUOTA_EXCEEDED" }. Those keep their own handling, so a
// code-less 402 only counts when its message is about credits.
export function isCreditError(status, data) {
  if (data?.code === "INSUFFICIENT_CREDITS") return true;
  if (status !== 402 || data?.code) return false;
  return /credit/i.test(String(data?.error || ""));
}

// Returns the message to show for a credit failure, or null when the
// response is not a credit failure (the caller keeps its own message then).
// Ambassador refusals (403 AMBASSADOR_NOT_ALLOWED / AMBASSADOR_CAP_REACHED /
// AMBASSADOR_VO_MINUTES_REACHED and the export ones) get their own text, so
// every call site that already shows creditErrorMessage covers them too.
export function creditErrorMessage(status, data) {
  const amb = ambassadorErrorMessage(data);
  if (amb) return amb;
  if (!isCreditError(status, data)) return null;
  if (!purchasesAllowed()) return NO_CREDITS_TEXT;
  const required = Number(data?.required);
  const need = Number.isFinite(required) && required > 0
    ? ` This needs ${required} credit${required === 1 ? "" : "s"}.`
    : "";
  return `Not enough credits.${need} Buy more on the Pricing page.`;
}
