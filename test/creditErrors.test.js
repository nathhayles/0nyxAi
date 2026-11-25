// Run with: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { isCreditError, creditErrorMessage } from "../src/utils/creditErrors.js";

test("standard 402 INSUFFICIENT_CREDITS with required -> says how many are needed", () => {
  const data = { error: "Insufficient credits", code: "INSUFFICIENT_CREDITS", required: 75 };
  assert.equal(creditErrorMessage(402, data), "Not enough credits. This needs 75 credits. Buy more on the Pricing page.");
  assert.equal(creditErrorMessage(402, { ...data, required: 1 }), "Not enough credits. This needs 1 credit. Buy more on the Pricing page.");
});

test("402 without code or required (fadr, heygen, upscale, lipsync) is still a credit error", () => {
  for (const error of ["Insufficient credits", "Insufficient credits. Need 3, have 1", "Credit deduction failed"]) {
    assert.equal(creditErrorMessage(402, { error }), "Not enough credits. Buy more on the Pricing page.");
  }
});

test("402s that are not about credits keep the caller's own handling", () => {
  assert.equal(isCreditError(402, { error: "vo_minutes_exceeded", minutes_used: 400 }), false);
  assert.equal(isCreditError(402, { error: "Stock video limit reached", code: "STOCK_QUOTA_EXCEEDED" }), false);
  assert.equal(creditErrorMessage(402, { error: "vo_minutes_exceeded" }), null);
  assert.equal(creditErrorMessage(402, null), null);
});

test("non-402 failures are not credit errors, unless the body says INSUFFICIENT_CREDITS", () => {
  assert.equal(creditErrorMessage(500, { error: "Insufficient credits" }), null);
  assert.equal(creditErrorMessage(400, { error: "endOffset must be > startOffset" }), null);
  assert.equal(creditErrorMessage(200, { code: "INSUFFICIENT_CREDITS" }), "Not enough credits. Buy more on the Pricing page.");
});

test("junk required values are ignored", () => {
  for (const required of [0, -5, "abc", null, Infinity]) {
    assert.equal(creditErrorMessage(402, { code: "INSUFFICIENT_CREDITS", required }), "Not enough credits. Buy more on the Pricing page.");
  }
});
