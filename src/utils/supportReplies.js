// What the support ChatBot says after an escalation request. The backend
// (routes/support.js) answers a refusal, such as the per-IP limit (429),
// with a `reply` meant for the user; any other failure gets the fallback.
// Previously any response, even a 429 or 500, showed "sent".
export const ESCALATE_SENT = "✅ I've sent your conversation to our support team. We'll get back to you at your account email within 24 hours.";
export const ESCALATE_FAILED = "Sorry, couldn't send the escalation. Please email support@onyx-reelz.com directly.";

export function escalateResultMessage(ok, data) {
  if (ok) return ESCALATE_SENT;
  return typeof data?.reply === "string" && data.reply.trim() ? data.reply : ESCALATE_FAILED;
}
