import { test } from "node:test";
import assert from "node:assert/strict";
import { findArollDropTarget, droppedMediaType, sceneMediaReplacement, replacedSceneClipChanges } from "../src/utils/arollDrop.js";
import { timelineReducer, makeInitialState, makeClip } from "../src/reducers/timelineReducer.js";

const clips = [
  { id: "a", sceneId: 1, startTime: 0, trimStart: 0, trimEnd: 5 },
  { id: "b", sceneId: 2, startTime: 5, trimStart: 2, trimEnd: 6 },
];

test("drop target is the clip under the pointer", () => {
  assert.equal(findArollDropTarget(clips, 0).id, "a");
  assert.equal(findArollDropTarget(clips, 4.99).id, "a");
  assert.equal(findArollDropTarget(clips, 5).id, "b");
});

test("past the last scene, or on an empty track, there is no target", () => {
  assert.equal(findArollDropTarget(clips, 9), null);
  assert.equal(findArollDropTarget([], 0), null);
});

test("media type comes from the drag source, then the URL", () => {
  assert.equal(droppedMediaType({ mediaType: "video" }, "https://x/api/stock/proxy?id=1"), "video");
  assert.equal(droppedMediaType({ type: "image" }, "https://x/a.mp4"), "image");
  assert.equal(droppedMediaType({}, "https://x/a.MOV?t=1"), "video");
  assert.equal(droppedMediaType({}, "https://x/a.jpg"), "image");
});

test("replacing a lip-synced visual lets the voiceover be used again", () => {
  const c = sceneMediaReplacement({ lipSynced: true }, { url: "u", mediaType: "video" });
  assert.equal(c.lipSynced, false);
  assert.equal(c.thumbnail, "u");
  assert.equal("sourceAudioMuted" in c, false);
});

test("only a mute that was added automatically is undone", () => {
  const c = sceneMediaReplacement({ voiceoverChangedAfterLipSync: true, autoMutedForVoiceover: true }, { url: "u", mediaType: "video" });
  assert.equal(c.sourceAudioMuted, false);
  assert.equal(c.voiceoverChangedAfterLipSync, false);
});

test("clip keeps its slot, new media starts at zero, speed is respected", () => {
  const [only] = replacedSceneClipChanges([{ ...clips[1], speed: 2 }], 2, { url: "new" });
  assert.deepEqual(
    [only.changes.trimStart, only.changes.trimEnd, only.changes.duration, only.changes.sourceDuration],
    [0, 4, 4, 8],
  );
});

test("a split scene is replaced as a whole and its pieces run on", () => {
  const split = [
    { id: "r", sceneId: 1, startTime: 3, trimStart: 3, trimEnd: 5 },
    { id: "l", sceneId: 1, startTime: 0, trimStart: 0, trimEnd: 3 },
    clips[1],
  ];
  const out = replacedSceneClipChanges(split, 1, { url: "new" });
  assert.deepEqual(out.map((o) => [o.clipId, o.changes.trimStart, o.changes.trimEnd]), [["l", 0, 3], ["r", 3, 5]]);
});

test("applied through the reducer: same number of clips, same positions", () => {
  const state = makeInitialState();
  state.tracks.find((t) => t.key === "video").clips.push(
    makeClip({ trackKey: "video", sceneId: 1, startTime: 0, duration: 5, trimEnd: 5, src: "old" }),
    makeClip({ trackKey: "video", sceneId: 2, startTime: 5, duration: 4, trimEnd: 4, src: "keep" }),
  );
  const next = replacedSceneClipChanges(state.tracks.find((t) => t.key === "video").clips, 1, { url: "new" })
    .reduce((s, { clipId, changes }) => timelineReducer(s, { type: "UPDATE_CLIP", clipId, changes }), state);
  const video = next.tracks.find((t) => t.key === "video").clips;
  assert.deepEqual(video.map((c) => [c.src, c.startTime, c.duration]), [["new", 0, 5], ["keep", 5, 4]]);
});
