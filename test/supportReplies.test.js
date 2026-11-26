// Run with: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { escalateResultMessage, ESCALATE_SENT, ESCALATE_FAILED } from "../src/utils/supportReplies.js";

test("escalation sent: confirmation", () => {
  assert.equal(escalateResultMessage(true, { ok: true }), ESCALATE_SENT);
});

test("rate-limited escalation: shows the server's reply, not 'sent'", () => {
  const reply = "You've already sent several requests to our support team recently, and we've got them: we'll reply to your account email within 24 hours. If it's urgent, email support@onyx-reelz.com directly.";
  assert.equal(escalateResultMessage(false, { error: "RATE_LIMITED", reply, retryAfterSeconds: 3000 }), reply);
});

test("other failures (500, no JSON): fallback, not 'sent'", () => {
  assert.equal(escalateResultMessage(false, { error: "Failed to send escalation email" }), ESCALATE_FAILED);
  assert.equal(escalateResultMessage(false, null), ESCALATE_FAILED);
  assert.equal(escalateResultMessage(false, { reply: "  " }), ESCALATE_FAILED);
});
