// Run with: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseAttribution } from "../src/utils/attribution.js";

const NOW = new Date("2026-09-29T10:00:00Z");

test("captures all five UTMs and the external referrer", () => {
  const a = parseAttribution(
    "?utm_source=instagram&utm_medium=social&utm_campaign=onyx_reel_demo&utm_content=v1&utm_term=ai+video",
    "https://l.instagram.com/?u=x", "onyxreelz.com", NOW);
  assert.equal(a.utm_source, "instagram");
  assert.equal(a.utm_medium, "social");
  assert.equal(a.utm_campaign, "onyx_reel_demo");
  assert.equal(a.utm_content, "v1");
  assert.equal(a.utm_term, "ai video");
  assert.equal(a.referrer, "https://l.instagram.com/?u=x");
  assert.equal(a.first_seen_at, "2026-09-29T10:00:00.000Z");
});

test("direct visit has null everything; same-site referrer is dropped", () => {
  const a = parseAttribution("", "https://onyxreelz.com/pricing", "onyxreelz.com", NOW);
  assert.equal(a.utm_source, null);
  assert.equal(a.referrer, null);
});

test("junk referrer and oversized values are handled", () => {
  const a = parseAttribution("?utm_source=" + "x".repeat(500), "not a url", "h", NOW);
  assert.equal(a.utm_source.length, 200);
  assert.equal(a.referrer, null);
});
