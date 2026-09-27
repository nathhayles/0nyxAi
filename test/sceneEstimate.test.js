// Run with: npm test (node --test test/)
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { estimateSceneCount, estimateScenes, splitByMarkers, presenterCreditsFor } from "../src/utils/sceneEstimate.js";

const filler = (n) => Array.from({ length: n }, (_, i) => `word${i}`).join(" ");

describe("estimateSceneCount", () => {
  test("a 2-marker script is 2 scenes, however long", () => {
    const script = `Scene 1: ${filler(70)}\n\nScene 2: ${filler(70)}`;
    assert.equal(script.split(/\s+/).length, 144);
    assert.equal(estimateSceneCount(script), 2);
  });

  test("marker styles: case, headings, bold, dashes", () => {
    const script = "## Scene 1 - Opening\nHello.\nSCENE 2: More.\n**Scene 3:** Still more.\nscene 4) End.";
    assert.equal(estimateSceneCount(script), 4);
    assert.deepEqual(splitByMarkers("Scene 1: Hi there.\nScene 2: Bye."), ["Hi there.", "Bye."]);
  });

  test("'scene' mid-sentence is not a marker", () => {
    assert.equal(estimateSceneCount(`The scene 1 more time. ${filler(10)}`), 1);
  });

  test("no markers: one scene per 22 words", () => {
    assert.equal(estimateSceneCount(filler(148)), 7);
    assert.equal(estimateSceneCount(""), 1);
  });
});

describe("estimateScenes", () => {
  test("presenter off: every scene at the model's price", () => {
    const plan = estimateScenes(`Scene 1: @Opal: ${filler(10)}\nScene 2: ${filler(10)}`, { videoCredits: 224 });
    assert.deepEqual(plan.map((s) => [s.mode, s.credits]), [["video", 224], ["video", 224]]);
  });

  test("presenter on: a one-character scene is priced per second + start frame", () => {
    const script = `Scene 1: @Opal: ${filler(20)}\nScene 2: The city at night. ${filler(10)}\nScene 3: @Opal and @Max ${filler(5)}`;
    const plan = estimateScenes(script, { videoCredits: 224, presenter: true, presenterResolution: "768P", startFrameCredits: 6 });
    // 20 words at 130 wpm = 9.23s -> billed 10s -> 107 credits at 768P
    assert.deepEqual(plan.map((s) => s.mode), ["presenter", "video", "video"]);
    assert.equal(plan[0].credits, 107 + 6);
  });

  test("presenter on: over 15s of narration falls back to the video model", () => {
    const plan = estimateScenes(`Scene 1: @Opal: ${filler(40)}`, { videoCredits: 224, presenter: true, startFrameCredits: 6 });
    assert.equal(plan[0].mode, "video");
  });

  test("presenter prices match the backend (lib/presenter.js)", () => {
    assert.equal(presenterCreditsFor("768P", 3), 54);
    assert.equal(presenterCreditsFor("768P", 10), 107);
    assert.equal(presenterCreditsFor("768P", 15), 160);
    assert.equal(presenterCreditsFor("480P", 5), 34);
    assert.equal(presenterCreditsFor("480P", 9.4), 67);
    assert.equal(presenterCreditsFor("480P", 15), 100);
  });
});
