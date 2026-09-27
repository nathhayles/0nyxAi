// The Create page Estimator's scene count and Talking presenter pricing,
// before the script is analysed. Everything here is a guess: the real split
// comes from POST /api/analyse, and with Talking presenter on the review
// screen shows the exact total before anything is charged.
//
// A script that marks its scenes is counted by those markers, which the
// backend's analyser keeps as exactly one scene each; without markers it
// falls back to the old one-scene-per-22-words guess.

// "Scene N:" at the start of a line (any case, optional leading
// whitespace) -- the same rule the backend's /api/analyse uses to keep one
// scene per marker (lib/sceneMarkers.js). "the scene 2 lighting" inside a
// sentence is not a marker.
const SCENE_MARKER_RE = /^[ \t]*scene[ \t]*\d+[ \t]*:/gim;
const WORDS_PER_SCENE_GUESS = 22;

// Same as the backend's (lib/resolveTaggedEntities.js TAG_RE, speaker labels
// "@Name: ", lib/sceneDefaults.js WORDS_PER_MINUTE).
const TAG_RE = /@([A-Za-z0-9_]+)/g;
const SPEAKER_LABEL_RE = /@[A-Za-z0-9_]+:\s*/g;
const WORDS_PER_MINUTE = 130;

// Mirrors lib/presenter.js: fal's rate x 1.33 markup / $0.01 per credit,
// billed seconds rounded up, 5s minimum, 15s maximum (a longer scene uses
// the video model instead).
const PRESENTER_USD_PER_SECOND = { "768P": 0.08, "480P": 0.05 };
const PRESENTER_MIN_SECONDS = 5;
const PRESENTER_MAX_SECONDS = 15;

function words(text) {
  return String(text || "").trim().split(/\s+/).filter(Boolean);
}

// The scene blocks of a script: the text after each marker, up to the next
// one. [] when the script has no markers.
export function splitByMarkers(script) {
  const text = String(script || "");
  const starts = [...text.matchAll(SCENE_MARKER_RE)].map((m) => ({ at: m.index, end: m.index + m[0].length }));
  return starts.map((s, i) => text.slice(s.end, i + 1 < starts.length ? starts[i + 1].at : text.length).trim());
}

export function estimateSceneCount(script) {
  const marked = splitByMarkers(script).length;
  if (marked) return marked;
  return Math.max(1, Math.ceil(words(script).length / WORDS_PER_SCENE_GUESS));
}

export function presenterCreditsFor(resolution, seconds) {
  const rate = PRESENTER_USD_PER_SECOND[resolution] ?? PRESENTER_USD_PER_SECOND["768P"];
  const billed = Math.max(PRESENTER_MIN_SECONDS, Math.ceil(Math.round(seconds * 1000) / 1000));
  return Math.ceil(+((billed * rate * 1.33) / 0.01).toFixed(6));
}

// Every guessed scene with its cost. A scene is counted as Talking presenter
// when it tags exactly one character and its narration takes 15 seconds or
// less to speak; the backend also needs that character's photos and linked
// voice, which only the review step can check.
export function estimateScenes(script, { videoCredits, presenter = false, presenterResolution = "768P", startFrameCredits = 0 } = {}) {
  const blocks = splitByMarkers(script);
  // Each scene's text, and the text its character tags are read from.
  let scenes;
  if (blocks.length) {
    scenes = blocks.map((text) => ({ text, tagSource: text }));
  } else {
    // No markers: fixed-size chunks, with the whole script's tags applied
    // to each (a guessed chunk can't be trusted to hold its own tag).
    const all = words(script);
    scenes = Array.from({ length: estimateSceneCount(script) }, (_, i) => ({
      text: all.slice(i * WORDS_PER_SCENE_GUESS, (i + 1) * WORDS_PER_SCENE_GUESS).join(" "),
      tagSource: String(script || ""),
    }));
  }
  return scenes.map(({ text, tagSource }) => {
    const characters = new Set([...tagSource.matchAll(TAG_RE)].map((m) => m[1].toLowerCase()));
    const spoken = words(text.replace(SPEAKER_LABEL_RE, " ").replace(TAG_RE, "$1")).length;
    const seconds = +((spoken / WORDS_PER_MINUTE) * 60).toFixed(2);
    if (presenter && characters.size === 1 && seconds > 0 && seconds <= PRESENTER_MAX_SECONDS) {
      return { mode: "presenter", seconds, credits: presenterCreditsFor(presenterResolution, seconds) + startFrameCredits };
    }
    return { mode: "video", seconds, credits: videoCredits };
  });
}
