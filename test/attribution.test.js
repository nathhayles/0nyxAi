// Run with: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseAttribution, selfReportedPayload, SOURCE_OPTIONS } from "../src/utils/attribution.js";

test("captures all five UTMs and the external referrer", () => {
  const a = parseAttribution(
    "?utm_source=instagram&utm_medium=social&utm_campaign=onyx_reel_demo&utm_content=v1&utm_term=ai+video",
    "https://l.instagram.com/?u=x", "onyxreelz.com");
  assert.deepEqual(a, {
    utm_source: "instagram", utm_medium: "social", utm_campaign: "onyx_reel_demo",
    utm_content: "v1", utm_term: "ai video", referrer: "https://l.instagram.com/?u=x",
  });
});

test("nothing to record -> null; same-site referrer is dropped", () => {
  assert.equal(parseAttribution("", "", "onyxreelz.com"), null);
  assert.equal(parseAttribution("", "https://onyxreelz.com/pricing", "onyxreelz.com"), null);
});

test("junk referrer and oversized values are handled", () => {
  const a = parseAttribution("?utm_source=" + "x".repeat(500), "not a url", "h");
  assert.equal(a.utm_source.length, 200);
  assert.equal(a.referrer, null);
});

test("selfReportedPayload: allow-listed value only, free text only for 'other', max 100", () => {
  assert.deepEqual(selfReportedPayload("", ""), {});
  assert.deepEqual(selfReportedPayload("bogus", "x"), {});
  assert.deepEqual(selfReportedPayload("tiktok", "ignored"), { self_reported_source: "tiktok" });
  assert.deepEqual(selfReportedPayload("other", "  a podcast "), { self_reported_source: "other", self_reported_other: "a podcast" });
  assert.equal(selfReportedPayload("other", "y".repeat(300)).self_reported_other.length, 100);
  assert.equal(SOURCE_OPTIONS.length, 10);
});
