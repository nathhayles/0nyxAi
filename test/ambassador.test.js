// Run with: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  AMBASSADOR_PRO_VIDEO_MODELS, AMBASSADOR_RATIOS, isAmbassador, ambassadorFeatures,
  filterVideoModels, isAllowedVideoModel, defaultVideoModel, filterRatios, defaultRatio,
  isPremiumVoice, ambassadorErrorMessage, ambassadorUsageSummary,
} from "../src/utils/ambassador.js";
import { creditErrorMessage } from "../src/utils/creditErrors.js";
import { CREATE_RATIO_OPTIONS } from "../src/data/createRatios.js";

const LIMITED = { ambassador: true, tier: "limited", monthly_cap: 200, spent_this_month: 40, cap_remaining: 160, vo_minutes_quota: 200, vo_minutes_used: 12.34, vo_minutes_remaining: 187.66 };
const PRO = { ...LIMITED, tier: "pro" };
const MODELS = ["wan-2.5", "wan-2.7", "kling-2.6-pro", "veo-3", "seedance-1-pro", "vidu-q3-pro", "vidu-q3-turbo", "seedance-2.5"].map((id) => ({ id }));

test("stays in step with the backend's allowed models and ad ratios", () => {
  assert.deepEqual([...AMBASSADOR_PRO_VIDEO_MODELS], ["seedance-1-pro", "wan-2.5", "vidu-q3-turbo"]);
  assert.deepEqual([...AMBASSADOR_RATIOS], ["9:16", "16:9", "1:1", "4:5"]);
});

test("normal accounts: everything on, nothing filtered", () => {
  assert.equal(isAmbassador(null), false);
  assert.equal(isAmbassador({ ambassador: false }), false);
  assert.ok(Object.values(ambassadorFeatures(null)).every(Boolean));
  assert.equal(filterVideoModels(MODELS, null, "id"), MODELS);
  assert.equal(defaultVideoModel("kling-2.6-pro", null), "kling-2.6-pro");
  assert.deepEqual(filterRatios(["9:16", "4:3", "21:9"], null), ["9:16", "4:3", "21:9"]);
  assert.equal(defaultRatio("4:3", null), "4:3");
});

test("Limited: no AI video at all, the blocked list is off", () => {
  const f = ambassadorFeatures(LIMITED);
  for (const k of ["aiVideo", "autoModel", "presenter", "avatars", "regenerate", "reshoot", "upscale", "lipSync", "fadr", "musicGeneration", "trim", "premiumVoices", "startFrames", "compare"]) {
    assert.equal(f[k], false, k);
  }
  assert.deepEqual(filterVideoModels(MODELS, LIMITED, "id"), []);
  assert.equal(isAllowedVideoModel("wan-2.5", LIMITED), false);
  assert.equal(defaultVideoModel("wan-2.5", LIMITED), null);
});

test("Pro: AI video and regenerate with the three models only; everything else still off", () => {
  const f = ambassadorFeatures(PRO);
  assert.equal(f.aiVideo, true);
  assert.equal(f.regenerate, true);
  for (const k of ["autoModel", "presenter", "avatars", "reshoot", "upscale", "lipSync", "fadr", "musicGeneration", "trim", "premiumVoices"]) assert.equal(f[k], false, k);
  assert.deepEqual(filterVideoModels(MODELS, PRO, "id").map((m) => m.id), ["wan-2.5", "seedance-1-pro", "vidu-q3-turbo"]);
  assert.equal(isAllowedVideoModel("auto", PRO), false);
  assert.equal(defaultVideoModel("kling-2.6-pro", PRO, MODELS, "id"), "wan-2.5");
  assert.equal(defaultVideoModel("seedance-1-pro", PRO, MODELS, "id"), "seedance-1-pro");
});

test("ratios: ambassadors get 9:16, 16:9, 1:1 and 4:5 only", () => {
  const opts = ["9:16", "16:9", "1:1", "4:3", "3:4", "21:9", "4:5"].map((id) => ({ id }));
  assert.deepEqual(filterRatios(opts, LIMITED, "id").map((r) => r.id), ["9:16", "16:9", "1:1", "4:5"]);
  assert.deepEqual(filterRatios(["4:3", "1:1"], PRO), ["1:1"]);
  assert.equal(defaultRatio("21:9", PRO), "9:16");
  assert.equal(defaultRatio("4:5", PRO), "4:5");
});

test("premium voices: same rule as the backend", () => {
  assert.equal(isPremiumVoice("openai", "nova"), false);
  assert.equal(isPremiumVoice("google", "en-US-Wavenet-C"), false);
  assert.equal(isPremiumVoice("google", "en-GB-Standard-A"), false);
  assert.equal(isPremiumVoice("google", "en-US-Chirp3-HD-Aoede"), true);
  assert.equal(isPremiumVoice("elevenlabs", "abc"), true);
  assert.equal(isPremiumVoice("something", "x"), true);
});

test("ambassador refusals get their own messages", () => {
  assert.match(ambassadorErrorMessage({ code: "AMBASSADOR_NOT_ALLOWED" }), /isn't included in your ambassador account/);
  assert.equal(ambassadorErrorMessage({ code: "AMBASSADOR_CAP_REACHED", spent: 198, cap: 200 }), "You've reached this month's ambassador limit of 200 credits. It resets on the 1st (UTC).");
  assert.equal(ambassadorErrorMessage({ code: "AMBASSADOR_CAP_REACHED" }), "You've reached this month's ambassador limit. It resets on the 1st (UTC).");
  assert.match(ambassadorErrorMessage({ code: "AMBASSADOR_VO_MINUTES_REACHED" }), /voiceover minutes/);
  assert.match(ambassadorErrorMessage({ code: "AMBASSADOR_RATIO_NOT_SUPPORTED" }), /9:16, 16:9, 1:1 and 4:5/);
  assert.equal(ambassadorErrorMessage({ code: "INSUFFICIENT_CREDITS" }), null);
  assert.equal(ambassadorErrorMessage(null), null);
});

test("creditErrorMessage shows ambassador messages for their 403s", () => {
  assert.match(creditErrorMessage(403, { error: "x", code: "AMBASSADOR_NOT_ALLOWED" }), /ambassador account/);
  assert.match(creditErrorMessage(403, { code: "AMBASSADOR_CAP_REACHED", cap: 200 }), /limit of 200 credits/);
  assert.match(creditErrorMessage(403, { code: "AMBASSADOR_VO_MINUTES_REACHED" }), /voiceover minutes/);
  // Other 403s are still not credit errors.
  assert.equal(creditErrorMessage(403, { error: "Forbidden" }), null);
});

test("usage summary for the badge", () => {
  assert.equal(ambassadorUsageSummary(null), null);
  assert.deepEqual(ambassadorUsageSummary(PRO), { tierLabel: "Pro", spent: 40, cap: 200, capRemaining: 160, voUsed: 12.3, voQuota: 200, voRemaining: 187.7 });
});

test("Create's aspect-ratio picker: ambassadors only see exportable ratios", () => {
  // Normal accounts: the full list, unchanged.
  assert.equal(filterRatios(CREATE_RATIO_OPTIONS, null), CREATE_RATIO_OPTIONS);
  for (const amb of [LIMITED, PRO]) {
    const shown = filterRatios(CREATE_RATIO_OPTIONS, amb).map((o) => o.value);
    assert.ok(shown.length > 0);
    assert.ok(shown.every((r) => AMBASSADOR_RATIOS.includes(r)), shown.join(","));
    assert.deepEqual(shown, CREATE_RATIO_OPTIONS.map((o) => o.value).filter((r) => AMBASSADOR_RATIOS.includes(r)));
  }
  // If a non-exportable ratio is ever added to Create, ambassadors don't get it.
  const extended = [...CREATE_RATIO_OPTIONS, { value: "21:9", label: "21:9" }, { value: "4:3", label: "4:3" }];
  assert.deepEqual(filterRatios(extended, PRO).map((o) => o.value), ["16:9", "9:16", "1:1"]);
  assert.equal(filterRatios(extended, null).length, 5);
});
