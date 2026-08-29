# Transitions v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace 4 inconsistent, partly-dead, partly-broken transition UIs with one real sidebar control panel offering type + duration + direction per boundary, and fix 5 ffmpeg transition types that were silently faked.

**Architecture:** A shared `TRANSITION_CATALOG` + `normalizeTransition()` (duplicated once in backend, once in frontend — no cross-package sharing exists in this repo) becomes the single source of truth for valid transition types and legacy-value migration. The backend's `applyTransition()` in `render.js` is rewritten to key off `(type, direction)` pairs resolved through this catalog instead of a flat switch statement. The frontend's `TransitionsPanel.jsx` becomes the one real control surface (replacing a disconnected drag tray), triggered by clicking the existing transition pip on the timeline (`SequencerPanel.jsx`), and the redundant right-click `ClipContextMenu` transition block and two fully-dead components (`SceneStrip.jsx`, `TransitionMenu.jsx`) are deleted.

**Tech Stack:** React (frontend), Express + ffmpeg (backend), no build step changes, no new dependencies, no DB migration (rides on existing `scenes.timeline` JSON, same as `transitionToNext`/`transitionDuration` already do).

**Spec:** `docs/transitions-v2-design.md` (in the backend repo at `/srv/onyx/backend/docs/transitions-v2-design.md`)

## Global Constraints

- Final transition catalog (12 entries, exact type strings): `cut`, `fade`, `dissolve`, `slide`, `wipe`, `zoom`, `blur`, `circle`, `fadeblack`, `fadewhite`, `pixelize`, `radial`.
- Only `slide` and `wipe` are directional (`transitionDirection`: `"left" | "right" | "up" | "down"`, default `"left"` when unset on a directional type).
- `transitionDuration` range: 0.2s–2s (was 0.1–4s before; the design doc's UI range is 0.2–2, backend still clamps defensively).
- `transitionStrength` and `transitionAxis` fields are deleted entirely — not deprecated-but-kept, actually removed from every read/write site.
- Legacy value migration (old → new `{type, direction}`) is exact per the design doc's table — do not invent new mappings.
- No automated test suite exists for this codebase's rendering path (`package.json`'s `test` script is a stub, no `*.test.js` files exist anywhere). Every task's verification step is a manual `node -e` script (for pure logic) or a live-browser + live-export check (for integration), matching this repo's established convention from the paint-tool work.

---

### Task 1: Backend transition catalog + legacy normalization

**Files:**
- Create: `/srv/onyx/backend/utils/transitions.js`

**Interfaces:**
- Produces: `TRANSITION_CATALOG` (object, keyed by canonical type string), `normalizeTransition(transitionToNext, transitionDirection)` → `{ type: string, direction: string|null }`, `ffmpegPresetFor(type, direction)` → `string|null` (the `xfade` preset name, or `null` for `cut`/unrecognized).

- [ ] **Step 1: Create the catalog and normalization file**

```js
// /srv/onyx/backend/utils/transitions.js
//
// Single source of truth for valid transition types and their ffmpeg
// xfade preset mapping. Mirrored (not imported — no cross-package
// sharing exists between backend and frontend in this repo) by
// src/utils/transitions.js on the frontend. Keep both in sync by hand
// if the catalog ever changes.
//
// See docs/transitions-v2-design.md for why each entry maps where it
// does, and why 5 old names (flash, spin, push, the old fake zoomOut,
// the old fake blur) were fixed or dropped rather than kept.

export const TRANSITION_CATALOG = {
  cut:       { label: "Cut",           directional: false, ffmpeg: null },
  fade:      { label: "Fade",          directional: false, ffmpeg: { default: "fade" } },
  dissolve:  { label: "Dissolve",      directional: false, ffmpeg: { default: "dissolve" } },
  slide:     { label: "Slide",         directional: true,  ffmpeg: { left: "slideleft", right: "slideright", up: "slideup", down: "slidedown" } },
  wipe:      { label: "Wipe",          directional: true,  ffmpeg: { left: "wipeleft", right: "wiperight", up: "wipeup", down: "wipedown" } },
  zoom:      { label: "Zoom",          directional: false, ffmpeg: { default: "zoomin" } },
  blur:      { label: "Blur",          directional: false, ffmpeg: { default: "hblur" } },
  circle:    { label: "Circle",        directional: false, ffmpeg: { default: "circleopen" } },
  fadeblack: { label: "Fade to Black", directional: false, ffmpeg: { default: "fadeblack" } },
  fadewhite: { label: "Fade to White", directional: false, ffmpeg: { default: "fadewhite" } },
  pixelize:  { label: "Pixelize",      directional: false, ffmpeg: { default: "pixelize" } },
  radial:    { label: "Radial",        directional: false, ffmpeg: { default: "radial" } },
};

// Maps every old/legacy transitionToNext value (from before this
// catalog existed) to its {type, direction} equivalent. Exact mapping
// per docs/transitions-v2-design.md's migration table.
const LEGACY_MAP = {
  slideLeft:     { type: "slide", direction: "left" },
  "slide-left":  { type: "slide", direction: "left" },
  slideRight:    { type: "slide", direction: "right" },
  "slide-right": { type: "slide", direction: "right" },
  zoomIn:        { type: "zoom", direction: null },
  "zoom-in":     { type: "zoom", direction: null },
  zoomOut:       { type: "zoom", direction: null },
  "zoom-out":    { type: "zoom", direction: null },
  spin:          { type: "circle", direction: null },
  push:          { type: "slide", direction: "left" },
  flash:         { type: "fade", direction: null },
};

/**
 * Normalizes any transitionToNext value (current catalog value OR a
 * legacy pre-v2 value) plus an optional transitionDirection into a
 * canonical {type, direction} pair. Unrecognized values fall back to
 * "cut" (matches the old switch statement's `default: return null`
 * behavior, which resulted in a hard cut).
 */
export function normalizeTransition(transitionToNext, transitionDirection) {
  const raw = transitionToNext || "cut";
  if (LEGACY_MAP[raw]) return { ...LEGACY_MAP[raw] };
  const entry = TRANSITION_CATALOG[raw];
  if (entry) {
    return {
      type: raw,
      direction: entry.directional ? (transitionDirection || "left") : null,
    };
  }
  return { type: "cut", direction: null };
}

/**
 * Resolves a canonical {type, direction} pair to the ffmpeg xfade
 * preset name, or null if the type has no filter (cut) or is
 * unrecognized.
 */
export function ffmpegPresetFor(type, direction) {
  const entry = TRANSITION_CATALOG[type];
  if (!entry || !entry.ffmpeg) return null;
  if (entry.directional) return entry.ffmpeg[direction] || entry.ffmpeg.left;
  return entry.ffmpeg.default;
}
```

- [ ] **Step 2: Verify manually with a node script**

Run:
```bash
node --input-type=module -e '
import { normalizeTransition, ffmpegPresetFor } from "/srv/onyx/backend/utils/transitions.js";

const cases = [
  ["slideLeft", undefined, "slide", "left", "slideleft"],
  ["slide-right", undefined, "slide", "right", "slideright"],
  ["zoomOut", undefined, "zoom", null, "zoomin"],
  ["spin", undefined, "circle", null, "circleopen"],
  ["push", undefined, "slide", "left", "slideleft"],
  ["flash", undefined, "fade", null, "fade"],
  ["blur", undefined, "blur", null, "hblur"],
  ["wipe", "up", "wipe", "up", "wipeup"],
  ["slide", undefined, "slide", "left", "slideleft"],
  ["cut", undefined, "cut", null, null],
  ["totally-unknown-value", undefined, "cut", null, null],
  ["fadeblack", undefined, "fadeblack", null, "fadeblack"],
];

let failed = 0;
for (const [input, dir, expType, expDir, expPreset] of cases) {
  const { type, direction } = normalizeTransition(input, dir);
  const preset = ffmpegPresetFor(type, direction);
  const ok = type === expType && direction === expDir && preset === expPreset;
  if (!ok) {
    failed++;
    console.log(`FAIL: normalizeTransition(${JSON.stringify(input)}, ${JSON.stringify(dir)}) -> {type:${type}, direction:${direction}}, preset:${preset} -- expected {type:${expType}, direction:${expDir}}, preset:${expPreset}`);
  }
}
console.log(failed === 0 ? "ALL PASS" : `${failed} FAILED`);
'
```
Expected: `ALL PASS`

- [ ] **Step 3: Commit**

```bash
cd /srv/onyx/backend
git add utils/transitions.js
git commit -m "feat: add transition catalog + legacy value normalization"
```

---

### Task 2: Backend render.js integration

**Files:**
- Modify: `/srv/onyx/backend/routes/render.js:775-865` (`applyTransition()`)
- Modify: `/srv/onyx/backend/routes/render.js:1890-1902` (`prevTransition` lookback)
- Modify: `/srv/onyx/backend/routes/render.js:2388` (segment push)
- Modify: `/srv/onyx/backend/routes/render.js:2391-2419` (transition-application loop)

**Interfaces:**
- Consumes: `TRANSITION_CATALOG`, `normalizeTransition(transitionToNext, transitionDirection)`, `ffmpegPresetFor(type, direction)` from Task 1's `../utils/transitions.js`.

- [ ] **Step 1: Add the import near the top of render.js**

Find the existing import block (alongside `import express from "express";` etc.) and add:

```js
import { normalizeTransition, ffmpegPresetFor } from "../utils/transitions.js";
```

- [ ] **Step 2: Rewrite `applyTransition()` (currently lines 775-865)**

Replace the entire function with:

```js
async function applyTransition(segA, segB, transitionToNext, transitionDirection, output, transitionDurationArg) {
  const { type, direction } = normalizeTransition(transitionToNext, transitionDirection);
  if (type === "cut") {
    return null;
  }
  const preset = ffmpegPresetFor(type, direction);
  if (!preset) {
    return null;
  }

  try {
    // Guarantee both inputs have audio streams before acrossfade
    const segAFixed = segA.replace(/\.mp4$/, "_au.mp4");
    const segBFixed = segB.replace(/\.mp4$/, "_au.mp4");
    segA = await ensureAudio(segA, segAFixed);
    segB = await ensureAudio(segB, segBFixed);

    const { stdout } = await new Promise((resolve, reject) => {
      const proc = spawn("ffprobe", [
        "-v", "error", "-show_entries", "format=duration",
        "-of", "default=noprint_wrappers=1:nokey=1", segA
      ]);
      let stdout = "", stderr = "";
      proc.stdout.on("data", d => stdout += d);
      proc.stderr.on("data", d => stderr += d);
      proc.on("close", code => code === 0 ? resolve({ stdout }) : reject(new Error(stderr)));
    });

    const durA = parseFloat(stdout.trim());
    const transitionDur = Math.min(Math.max(transitionDurationArg || 0.5, 0.2), 2);
    const offset = Math.max(0, durA - transitionDur);

    const filterComplex = `[0:v][1:v]xfade=transition=${preset}:duration=${transitionDur}:offset=${offset}[v];[0:a][1:a]acrossfade=d=${transitionDur}[a]`;

    await run("ffmpeg", [
      "-y",
      "-i", segA,
      "-i", segB,
      "-filter_complex", filterComplex,
      "-map", "[v]",
      "-map", "[a]",
      "-c:v", VIDEO_CODEC,
      "-preset", PRESET,
      "-crf", CRF,
      "-pix_fmt", PIX_FMT,
      "-c:a", AUDIO_CODEC,
      "-ar", "44100",
      "-ac", "2",
      "-movflags", "+faststart",
      output,
    ]);

    return output;
  } catch (err) {
    console.error("Transition failed, falling back to cut:", err.message);
    return null;
  }
}
```

Note what changed: the parameter list drops `transitionStrengthArg` and adds `transitionDirection`; the `strengthMult` line is gone entirely; the duration clamp range changed from `≤4` to the new `0.2–2` range (Global Constraints); the 12-branch `switch` is replaced by one `ffmpegPresetFor()` call driven by the catalog.

- [ ] **Step 3: Update the `prevTransition` lookback (currently lines 1890-1902)**

Find:
```js
      if (scene.needsBleedFade) {
        const prevTransition = i > 0 ? (validScenes[i - 1].transitionToNext || "cut") : "cut";
        if (prevTransition === "cut") {
```

Replace with:
```js
      if (scene.needsBleedFade) {
        const prevType = i > 0
          ? normalizeTransition(validScenes[i - 1].transitionToNext, validScenes[i - 1].transitionDirection).type
          : "cut";
        if (prevType === "cut") {
```

(The rest of that `if` block, including its comment, is unchanged — only the variable computation and the name used in the condition change, from `prevTransition` to `prevType`.)

- [ ] **Step 4: Update the segment push (currently line 2388)**

Find:
```js
      segments.push({ file: segOutput, transition: scene.transitionToNext || "cut", transitionDuration: scene.transitionDuration || 0.5, transitionStrength: scene.transitionStrength ?? 50 });
```

Replace with:
```js
      segments.push({ file: segOutput, transition: scene.transitionToNext || "cut", transitionDirection: scene.transitionDirection || null, transitionDuration: scene.transitionDuration || 0.5 });
```

- [ ] **Step 5: Update the transition-application loop (currently lines 2391-2419)**

Find:
```js
      let i = 0;
      while (i < segments.length - 1) {
        const segA = segments[i].file;
        const segB = segments[i + 1].file;
        const transition = segments[i].transition;

        if (transition && transition !== "cut") {
          const transOut = path.join(workDir, `trans_${i}_${i+1}.mp4`);
          const result = await applyTransition(segA, segB, transition, transOut, segments[i].transitionDuration, segments[i].transitionStrength);
          if (result) {
            processedSegments.push(result);
            i += 2;
            continue;
          }
        }

        processedSegments.push(segA);
        i++;
      }
```

Replace with:
```js
      let i = 0;
      while (i < segments.length - 1) {
        const segA = segments[i].file;
        const segB = segments[i + 1].file;
        const { type: normType } = normalizeTransition(segments[i].transition, segments[i].transitionDirection);

        if (normType !== "cut") {
          const transOut = path.join(workDir, `trans_${i}_${i+1}.mp4`);
          const result = await applyTransition(segA, segB, segments[i].transition, segments[i].transitionDirection, transOut, segments[i].transitionDuration);
          if (result) {
            processedSegments.push(result);
            i += 2;
            continue;
          }
        }

        processedSegments.push(segA);
        i++;
      }
```

- [ ] **Step 6: Verify manually**

There's no automated harness for this file's render path. Confirm the file still parses and the server boots:

```bash
cd /srv/onyx/backend
node --check routes/render.js
echo "syntax OK"
pm2 restart api --update-env 2>&1 | tail -5 || node server.js &
sleep 2
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/api/health || echo "adjust health check URL/port to match this project's actual convention"
```
Expected: `syntax OK`, server restarts without crashing. Full live-export verification of all 12 catalog types happens in Task 7 once the frontend can actually set `transitionDirection` and the new duration range.

- [ ] **Step 7: Commit**

```bash
cd /srv/onyx/backend
git add routes/render.js
git commit -m "fix: rewrite transition rendering to use catalog, drop dead strength math"
```

---

### Task 3: Frontend transition catalog + normalization (mirrors Task 1)

**Files:**
- Create: `/srv/onyx/frontend/scheduler-dashboard-v3_STABLE_RECOVERY_1343/frontend/src/utils/transitions.js`

**Interfaces:**
- Produces: `TRANSITION_CATALOG` (same 12 keys as backend, plus a `previewAnim` field per entry naming a CSS keyframe for the sidebar panel's swatch preview and the live-preview simulation), `normalizeTransition(transitionToNext, transitionDirection)` (identical logic to backend Task 1 — duplicated, not imported, since frontend and backend are separate deployables with no shared package in this repo).

- [ ] **Step 1: Create the file**

```js
// /srv/onyx/frontend/scheduler-dashboard-v3_STABLE_RECOVERY_1343/frontend/src/utils/transitions.js
//
// Mirrors /srv/onyx/backend/utils/transitions.js's TRANSITION_CATALOG
// and normalizeTransition() exactly (type strings, directional flags,
// legacy mapping) so a reel's saved transition always resolves to the
// same {type, direction} on both the editor preview and the real
// export. Not imported from the backend -- there's no shared package
// between the two deployables in this repo, so this is a deliberate,
// hand-kept-in-sync duplicate. Adds one frontend-only field per entry,
// `previewAnim`, naming the CSS keyframe used for this type's little
// preview swatch and the live in-editor scrub/playback simulation.

export const TRANSITION_CATALOG = {
  cut:       { label: "Cut",           directional: false, previewAnim: "cut" },
  fade:      { label: "Fade",          directional: false, previewAnim: "fade" },
  dissolve:  { label: "Dissolve",      directional: false, previewAnim: "fade" },
  slide:     { label: "Slide",         directional: true,  previewAnim: "slide" },
  wipe:      { label: "Wipe",          directional: true,  previewAnim: "wipe" },
  zoom:      { label: "Zoom",          directional: false, previewAnim: "zoom" },
  blur:      { label: "Blur",          directional: false, previewAnim: "blur" },
  circle:    { label: "Circle",        directional: false, previewAnim: "circle" },
  fadeblack: { label: "Fade to Black", directional: false, previewAnim: "fadeblack" },
  fadewhite: { label: "Fade to White", directional: false, previewAnim: "fadewhite" },
  pixelize:  { label: "Pixelize",      directional: false, previewAnim: "fade" },
  radial:    { label: "Radial",        directional: false, previewAnim: "fade" },
};

const LEGACY_MAP = {
  slideLeft:     { type: "slide", direction: "left" },
  "slide-left":  { type: "slide", direction: "left" },
  slideRight:    { type: "slide", direction: "right" },
  "slide-right": { type: "slide", direction: "right" },
  zoomIn:        { type: "zoom", direction: null },
  "zoom-in":     { type: "zoom", direction: null },
  zoomOut:       { type: "zoom", direction: null },
  "zoom-out":    { type: "zoom", direction: null },
  spin:          { type: "circle", direction: null },
  push:          { type: "slide", direction: "left" },
  flash:         { type: "fade", direction: null },
};

export function normalizeTransition(transitionToNext, transitionDirection) {
  const raw = transitionToNext || "cut";
  if (LEGACY_MAP[raw]) return { ...LEGACY_MAP[raw] };
  const entry = TRANSITION_CATALOG[raw];
  if (entry) {
    return {
      type: raw,
      direction: entry.directional ? (transitionDirection || "left") : null,
    };
  }
  return { type: "cut", direction: null };
}
```

- [ ] **Step 2: Verify manually in the browser console (or via a scratch Vite dev import)**

Run the dev server if not already running:
```bash
cd /srv/onyx/frontend/scheduler-dashboard-v3_STABLE_RECOVERY_1343/frontend
npm run dev &
```
In the browser devtools console on the running page, paste:
```js
import("/src/utils/transitions.js").then(m => {
  console.log(m.normalizeTransition("slideLeft"));       // {type:"slide", direction:"left"}
  console.log(m.normalizeTransition("spin"));             // {type:"circle", direction:null}
  console.log(m.normalizeTransition("wipe", "up"));        // {type:"wipe", direction:"up"}
  console.log(m.normalizeTransition("unknown-junk"));      // {type:"cut", direction:null}
});
```
Expected: the four `console.log` lines match the comments.

- [ ] **Step 3: Commit**

```bash
cd /srv/onyx/frontend/scheduler-dashboard-v3_STABLE_RECOVERY_1343/frontend
git add src/utils/transitions.js
git commit -m "feat: add frontend transition catalog + legacy normalization"
```

---

### Task 4: EditorV2.jsx — preview simulation, state, and panel wiring

**Files:**
- Modify: `/srv/onyx/frontend/scheduler-dashboard-v3_STABLE_RECOVERY_1343/frontend/src/pages/EditorV2.jsx:357-441` (`applyTransition()` preview function)
- Modify: same file, line 2789 (scrub-path fallback + missing duration/direction args)
- Modify: same file, lines 3151-3153, 3173 (playback-path fallback + missing duration/direction args)
- Modify: same file, near line 1800 (new state)
- Modify: same file, line 4393 (panel props) and line 4595 area (`<SequencerPanel>` props)

**Interfaces:**
- Consumes: `TRANSITION_CATALOG`, `normalizeTransition` from Task 3's `../utils/transitions.js`.
- Produces: `selectedTransitionBoundary` state + `setSelectedTransitionBoundary` (a `sceneId` or `null`), and an `onOpenTransitionPanel(sceneId)` callback, both consumed by Task 5 (`SequencerPanel.jsx`) and Task 6 (`TransitionsPanel.jsx`).

- [ ] **Step 1: Add the import**

Near the existing `import { renderStroke } from "../utils/paintBrush.js";` line, add:
```js
import { TRANSITION_CATALOG, normalizeTransition } from "../utils/transitions.js";
```

- [ ] **Step 2: Add the boundary-selection state**

Find:
```js
  const [activeMenu,       setActiveMenu]       = useState("storyboard");
```
Add immediately after it:
```js
  const [selectedTransitionBoundary, setSelectedTransitionBoundary] = useState(null); // sceneId whose transitionToNext the sidebar Transitions panel is editing
```

- [ ] **Step 3: Rewrite the preview `applyTransition()` function (currently lines 357-441)**

Replace the whole function with:

```js
// ── Preview transition helper ────────────────────────────────────────────────
// Simulates the export-side transition (see backend applyTransition() in
// routes/render.js) using CSS transforms/opacity for the live in-editor
// scrub/playback preview. This is an approximation, not a pixel match --
// several catalog types (pixelize, radial) have no reasonable CSS
// equivalent and fall back to a fade simulation here, while still
// rendering their real, distinct ffmpeg preset in the actual export.
function applyTransition(rawType, rawDirection, duration, cur, nxt, onDone) {
  const { type, direction } = normalizeTransition(rawType, rawDirection);
  const DUR = Math.min(Math.max(duration || 0.5, 0.2), 2);
  nxt.style.visibility = "visible";
  nxt.style.transform = "";
  cur.style.transform = "";

  if (type === "cut") {
    nxt.style.opacity = "1";
    nxt.style.transition = "";
    cur.style.visibility = "hidden";
    cur.style.opacity = "0";
    cur.style.transition = "";
    onDone();
    return;
  }
  if (type === "slide") {
    const axis = (direction === "up" || direction === "down") ? "Y" : "X";
    const sign = (direction === "left" || direction === "up") ? 1 : -1;
    nxt.style.opacity = "1";
    nxt.style.transform = `translate${axis}(${sign * 100}%)`;
    nxt.style.transition = "";
    cur.style.transition = "";
    requestAnimationFrame(() => {
      nxt.style.transition = `transform ${DUR}s ease`;
      nxt.style.transform = `translate${axis}(0)`;
      cur.style.transition = `transform ${DUR}s ease`;
      cur.style.transform = `translate${axis}(${-sign * 100}%)`;
      setTimeout(() => {
        cur.style.visibility = "hidden";
        cur.style.opacity = "0";
        cur.style.transform = "";
        cur.style.transition = "";
        nxt.style.transform = "";
        nxt.style.transition = "";
        onDone();
      }, DUR * 1000 + 30);
    });
    return;
  }
  if (type === "wipe") {
    const clipFrom = { left: "inset(0 100% 0 0)", right: "inset(0 0 0 100%)", up: "inset(100% 0 0 0)", down: "inset(0 0 100% 0)" }[direction] || "inset(0 100% 0 0)";
    nxt.style.opacity = "1";
    nxt.style.clipPath = clipFrom;
    nxt.style.transition = "";
    requestAnimationFrame(() => {
      nxt.style.transition = `clip-path ${DUR}s ease`;
      nxt.style.clipPath = "inset(0 0 0 0)";
      setTimeout(() => {
        cur.style.visibility = "hidden";
        cur.style.opacity = "0";
        nxt.style.clipPath = "";
        nxt.style.transition = "";
        onDone();
      }, DUR * 1000 + 30);
    });
    return;
  }
  if (type === "zoom") {
    nxt.style.opacity = "0";
    nxt.style.transition = "";
    cur.style.transition = "";
    requestAnimationFrame(() => {
      cur.style.transition = `transform ${DUR}s ease, opacity ${DUR}s ease`;
      cur.style.transform = "scale(1.15)";
      cur.style.opacity = "0";
      nxt.style.transition = `opacity ${DUR}s ease`;
      nxt.style.opacity = "1";
      setTimeout(() => {
        cur.style.visibility = "hidden";
        cur.style.opacity = "0";
        cur.style.transform = "";
        cur.style.transition = "";
        nxt.style.transition = "";
        onDone();
      }, DUR * 1000 + 30);
    });
    return;
  }
  if (type === "blur") {
    nxt.style.opacity = "0";
    nxt.style.filter = "blur(24px)";
    cur.style.transition = "";
    requestAnimationFrame(() => {
      cur.style.transition = `opacity ${DUR}s ease, filter ${DUR}s ease`;
      cur.style.filter = "blur(24px)";
      cur.style.opacity = "0";
      nxt.style.transition = `opacity ${DUR}s ease, filter ${DUR}s ease`;
      nxt.style.opacity = "1";
      nxt.style.filter = "blur(0px)";
      setTimeout(() => {
        cur.style.visibility = "hidden";
        cur.style.opacity = "0";
        cur.style.filter = "";
        cur.style.transition = "";
        nxt.style.filter = "";
        nxt.style.transition = "";
        onDone();
      }, DUR * 1000 + 30);
    });
    return;
  }
  if (type === "circle") {
    nxt.style.opacity = "1";
    nxt.style.clipPath = "circle(0% at 50% 50%)";
    nxt.style.transition = "";
    requestAnimationFrame(() => {
      nxt.style.transition = `clip-path ${DUR}s ease`;
      nxt.style.clipPath = "circle(75% at 50% 50%)";
      setTimeout(() => {
        cur.style.visibility = "hidden";
        cur.style.opacity = "0";
        nxt.style.clipPath = "";
        nxt.style.transition = "";
        onDone();
      }, DUR * 1000 + 30);
    });
    return;
  }
  if (type === "fadeblack" || type === "fadewhite") {
    const overlayColor = type === "fadeblack" ? "#000" : "#fff";
    cur.style.transition = "";
    nxt.style.opacity = "0";
    const overlay = document.createElement("div");
    overlay.style.cssText = `position:absolute;inset:0;background:${overlayColor};opacity:0;z-index:5;pointer-events:none;`;
    cur.parentElement.appendChild(overlay);
    requestAnimationFrame(() => {
      overlay.style.transition = `opacity ${DUR / 2}s ease`;
      overlay.style.opacity = "1";
      setTimeout(() => {
        cur.style.visibility = "hidden";
        nxt.style.opacity = "1";
        overlay.style.opacity = "0";
        setTimeout(() => {
          overlay.remove();
          onDone();
        }, DUR * 500 + 30);
      }, DUR * 500 + 30);
    });
    return;
  }
  // fade / dissolve / pixelize / radial (no closer CSS approximation) — plain fade
  nxt.style.opacity = "0";
  requestAnimationFrame(() => {
    nxt.style.transition = `opacity ${DUR}s ease`;
    nxt.style.opacity = "1";
    cur.style.transition = `opacity ${DUR}s ease`;
    cur.style.opacity = "0";
    setTimeout(() => {
      cur.style.visibility = "hidden";
      cur.style.opacity = "0";
      cur.style.transition = "";
      nxt.style.transition = "";
      onDone();
    }, DUR * 1000 + 30);
  });
}
```

- [ ] **Step 4: Update the scrub-path call site (currently around line 2789-2795)**

Find:
```js
    const scrubTransType = outgoingClip
      ? (scenesRef.current.find(s => s.id === outgoingClip.sceneId)?.transitionToNext || "crossfade")
      : "crossfade";

    nxt.oncanplay = () => {
      nxt.oncanplay = null;
      nxt.currentTime = localTime;
      applyTransition(scrubTransType, cur, nxt, () => {
```

Replace with:
```js
    const outgoingSceneForScrub = outgoingClip ? scenesRef.current.find(s => s.id === outgoingClip.sceneId) : null;
    const scrubTransType = outgoingSceneForScrub?.transitionToNext || "fade";
    const scrubTransDirection = outgoingSceneForScrub?.transitionDirection || null;
    const scrubTransDuration = outgoingSceneForScrub?.transitionDuration || 0.5;

    nxt.oncanplay = () => {
      nxt.oncanplay = null;
      nxt.currentTime = localTime;
      applyTransition(scrubTransType, scrubTransDirection, scrubTransDuration, cur, nxt, () => {
```

- [ ] **Step 5: Update the playback-path call site (currently around lines 3151-3173)**

Find:
```js
            const playTransType = outgoingClipForTrans?.transitionToNext
              || outgoingScene?.transitionToNext
              || "fade";
```
Replace with:
```js
            const playTransType = outgoingClipForTrans?.transitionToNext
              || outgoingScene?.transitionToNext
              || "fade";
            const playTransDirection = outgoingClipForTrans?.transitionDirection
              || outgoingScene?.transitionDirection
              || null;
            const playTransDuration = outgoingClipForTrans?.transitionDuration
              || outgoingScene?.transitionDuration
              || 0.5;
```
Then find (a few lines below, unchanged context):
```js
                applyTransition(playTransType, cur, nxt, () => {
```
Replace with:
```js
                applyTransition(playTransType, playTransDirection, playTransDuration, cur, nxt, () => {
```

- [ ] **Step 6: Update the sidebar panel wiring (currently line 4393)**

Find:
```js
            {activeMenu==="transitions" && <Safe name="TransitionsPanel"><TransitionsPanel onUpdateScene={updateScene} /></Safe>}
```
Replace with:
```js
            {activeMenu==="transitions" && <Safe name="TransitionsPanel"><TransitionsPanel
              scenes={scenes}
              selectedBoundarySceneId={selectedTransitionBoundary}
              onUpdateScene={updateScene}
            /></Safe>}
```

- [ ] **Step 7: Thread the boundary-open callback into `<SequencerPanel>` (in the props block starting around line 4595)**

Find the line `updateScene={updateScene}` inside the `<SequencerPanel ...>` props block and add immediately after it:
```js
              onOpenTransitionPanel={(sceneId) => { setSelectedTransitionBoundary(sceneId); setActiveMenu("transitions"); }}
```

- [ ] **Step 8: Verify manually**

```bash
cd /srv/onyx/frontend/scheduler-dashboard-v3_STABLE_RECOVERY_1343/frontend
npm run build
```
Expected: build succeeds with no syntax/type errors (this project has no separate typecheck step beyond the Vite build itself). Full behavioral verification (does clicking a boundary actually open the panel) happens in Task 7 once Tasks 5-6 exist — this task alone only needs to compile clean, since `TransitionsPanel` and `SequencerPanel`'s new props aren't consumed yet.

- [ ] **Step 9: Commit**

```bash
cd /srv/onyx/frontend/scheduler-dashboard-v3_STABLE_RECOVERY_1343/frontend
git add src/pages/EditorV2.jsx
git commit -m "feat: extend preview transition simulation to full catalog, add boundary-selection state"
```

---

### Task 5: SequencerPanel.jsx — pip click-to-open, delete redundant context-menu block

**Files:**
- Modify: `/srv/onyx/frontend/scheduler-dashboard-v3_STABLE_RECOVERY_1343/frontend/src/components/SequencerPanel.jsx:427-472` (`TransitionHandle`)
- Modify: same file, lines 693-727 (clip body drop zone)
- Modify: same file, lines 1073-1206 (`ClipContextMenu`) — delete the transition block
- Modify: same file, lines 134-145 (`TRANSITION_TYPES` — delete, now unused) and the `TRANSITION_PIP` map (update keys to canonical catalog values)
- Modify: same file, wherever `<SequencerPanel>`'s outer function signature and its calls to `TransitionHandle`/`TrackRow`/`ClipContextMenu` are, to thread the new `onOpenTransitionPanel` prop down

**Interfaces:**
- Consumes: `onOpenTransitionPanel(sceneId)` from Task 4 (`EditorV2.jsx`), `TRANSITION_CATALOG` from Task 3.

- [ ] **Step 1: Add the import**

Near the top of the file, add:
```js
import { TRANSITION_CATALOG } from "../utils/transitions.js";
```

- [ ] **Step 2: Update `TRANSITION_PIP` to canonical keys**

Find:
```js
const TRANSITION_PIP = {
  fade:          "#4dd0ff",
  dissolve:      "#a78bfa",
  "slide-left":  "#34d399",
  "slide-right": "#fbbf24",
  "zoom-in":     "#f87171",
  "zoom-out":    "#fb923c",
  wipe:          "#60a5fa",
  slideLeft:     "#22c55e",
  slideRight:    "#22c55e",
  zoomIn:        "#f97316",
  zoomOut:       "#f97316",
  blur:          "#06b6d4",
  flash:         "#fbbf24",
  spin:          "#a855f7",
  push:          "#84cc16",
};
```
Replace with:
```js
// Colors keyed by canonical catalog type (see src/utils/transitions.js).
// Legacy keys (slideLeft, zoomOut, spin, push, flash, hyphenated
// variants) are gone -- normalizeTransition() resolves those to a
// canonical type before this map is ever consulted, so only the 12
// current catalog keys are needed here.
const TRANSITION_PIP = {
  fade:      "#4dd0ff",
  dissolve:  "#a78bfa",
  slide:     "#34d399",
  wipe:      "#60a5fa",
  zoom:      "#f87171",
  blur:      "#06b6d4",
  circle:    "#a855f7",
  fadeblack: "#64748b",
  fadewhite: "#e2e8f0",
  pixelize:  "#f97316",
  radial:    "#fbbf24",
};
```

- [ ] **Step 3: Delete `TRANSITION_TYPES` (currently lines 134-145)**

Find and delete entirely:
```js
const TRANSITION_TYPES = [
  { value: "cut",         label: "Cut" },
  { value: "fade",        label: "Fade" },
  { value: "dissolve",    label: "Dissolve" },
  { value: "slide-left",  label: "Slide Left" },
  { value: "slide-right", label: "Slide Right" },
  { value: "zoom-in",     label: "Zoom In" },
  { value: "zoom-out",    label: "Zoom Out" },
  { value: "wipe",        label: "Wipe" },
  { value: "blur",        label: "Blur" },
  { value: "push",        label: "Push" },
  { value: "spin",        label: "Spin" },
];
```
(It has no remaining consumers after Step 6 deletes `ClipContextMenu`'s transition block — confirm with `grep -n "TRANSITION_TYPES" src/components/SequencerPanel.jsx` after Step 6 returns nothing before considering this task done.)

- [ ] **Step 4: Rewrite `TransitionHandle` (currently lines 427-472) — drop drag-drop, add click**

Find the function signature and its drag-drop handlers:
```js
function TransitionHandle({ x, color, transitionType, duration, onDurationChange, dispatch, updateScene, clipId, sceneId }) {
```
...(the body contains `onDragOver`/`onDrop` handlers reading `window.__onyxDraggedTransition` at the lines noted in Step 1 of Task discovery — lines ~459-472 per the design doc). Replace the function's JSX return so the drop handlers are gone and a click handler is added. Since this function's exact JSX layout wasn't fully captured during planning, the implementer must:

1. Read the current full body of `TransitionHandle` (`sed -n '427,480p' src/components/SequencerPanel.jsx`).
2. Remove the `onDragOver` and `onDrop` props/handlers from its root element (and the `window.__onyxDraggedTransition` read inside `onDrop`).
3. Add `onClick={(e) => { e.stopPropagation(); onOpenTransitionPanel?.(sceneId); }}` to that same root element.
4. Add `onOpenTransitionPanel` to the function's destructured props list.
5. Add `cursor: "pointer"` to that element's inline style if not already present (it's an interactive click target now, not just a visual handle).

- [ ] **Step 5: Update the clip body's drop zone (currently lines 693-727) the same way**

Find the component whose signature includes `onContextMenu, transitionToNext, updateScene` (per the design doc, this is the clip-body component using `TRANSITION_PIP` for its pip color). Same treatment as Step 4:
1. Remove its `onDragOver`/`onDrop` handlers and the `window.__onyxDraggedTransition` read.
2. Add `onOpenTransitionPanel` to its props.
3. Wherever the pip itself is rendered (the small colored dot using `pipColor`), wrap it in an element with `onClick={(e) => { e.stopPropagation(); onOpenTransitionPanel?.(clip.sceneId); }}` and `cursor: "pointer"`.

- [ ] **Step 6: Delete the transition block from `ClipContextMenu` (currently lines 1141-1206, inside the `isVideo && (...)` block)**

Find and delete the entire JSX block from:
```js
      {isVideo && (
        <>
          <div style={sectionLabel}>Transition to next</div>
```
through (inclusive of) the closing:
```js
          <div style={divider}/>
        </>
      )}
```
(everything shown in Task discovery covering the type buttons, duration slider, strength slider, and spin-axis checkboxes). Also delete the now-unused local state above it:
```js
  const currentTransition = clip.transitionToNext || "cut";
  const [duration, setDuration] = useState(clip.transitionDuration ?? 0.5);
  const [strength, setStrength] = useState(clip.transitionStrength ?? 50);
  const [transitionAxis, setTransitionAxis] = useState(clip.transitionAxis || { x: false, y: true, z: false });
```
Leave the `isVideo`/`isBRoll`/`isFX` booleans right above it intact if anything else in the menu still reads them (check with `grep -n "isVideo\|isBRoll\|isFX" -A2` around the rest of the function before deleting those three lines — they were used to gate the transition block AND, per the design doc, gate other menu items like fade in/out, so keep them, only delete the four `useState`/`const currentTransition` lines above the JSX block).

- [ ] **Step 7: Thread `onOpenTransitionPanel` down through the component tree**

`SequencerPanel` (outer, `SequencerPanelBase`) must accept `onOpenTransitionPanel` as a prop (from `EditorV2.jsx`, Task 4 Step 8) and pass it down to every place that renders `TransitionHandle` and the clip-body component from Steps 4-5. `ClipContextMenu` does not need it (its transition block is deleted in Step 6).

- [ ] **Step 8: Verify manually**

```bash
cd /srv/onyx/frontend/scheduler-dashboard-v3_STABLE_RECOVERY_1343/frontend
npm run build
grep -n "TRANSITION_TYPES" src/components/SequencerPanel.jsx  # expect: no output
grep -n "__onyxDraggedTransition" src/components/SequencerPanel.jsx  # expect: no output (all drag-drop consumers removed)
```
Expected: build succeeds, both greps return nothing.

- [ ] **Step 9: Commit**

```bash
cd /srv/onyx/frontend/scheduler-dashboard-v3_STABLE_RECOVERY_1343/frontend
git add src/components/SequencerPanel.jsx
git commit -m "refactor: replace transition drag-drop + right-click menu with click-to-open sidebar panel"
```

---

### Task 6: TransitionsPanel.jsx — rewrite as the real control panel

**Files:**
- Modify: `/srv/onyx/frontend/scheduler-dashboard-v3_STABLE_RECOVERY_1343/frontend/src/components/TransitionsPanel.jsx` (full rewrite, same filename)

**Interfaces:**
- Consumes: `TRANSITION_CATALOG`, `normalizeTransition` from Task 3; `scenes`, `selectedBoundarySceneId`, `onUpdateScene` props from Task 4 (`EditorV2.jsx` Step 7).

- [ ] **Step 1: Replace the entire file**

```jsx
import React from "react";
import { TRANSITION_CATALOG, normalizeTransition } from "../utils/transitions.js";

const ANIM_STYLES = `
@keyframes tp-fade      { 0%,100%{opacity:1} 50%{opacity:0} }
@keyframes tp-slide     { 0%{transform:translateX(0)} 50%{transform:translateX(-100%)} 51%{transform:translateX(100%)} 100%{transform:translateX(0)} }
@keyframes tp-wipe      { 0%{clip-path:inset(0 0 0 0)} 50%{clip-path:inset(0 0 0 100%)} 51%{clip-path:inset(0 100% 0 0)} 100%{clip-path:inset(0 0 0 0)} }
@keyframes tp-zoom      { 0%,100%{transform:scale(1)} 50%{transform:scale(1.5)} }
@keyframes tp-blur      { 0%,100%{filter:blur(0)} 50%{filter:blur(6px)} }
@keyframes tp-circle    { 0%,100%{clip-path:circle(75% at 50% 50%)} 50%{clip-path:circle(10% at 50% 50%)} }
@keyframes tp-fadeblack { 0%,100%{opacity:1;background:#000} 50%{opacity:0.2;background:#000} }
@keyframes tp-fadewhite { 0%,100%{opacity:1;background:#fff} 50%{opacity:0.2;background:#fff} }
`;

const ANIM_MAP = {
  fade: "tp-fade", slide: "tp-slide", wipe: "tp-wipe", zoom: "tp-zoom",
  blur: "tp-blur", circle: "tp-circle", fadeblack: "tp-fadeblack", fadewhite: "tp-fadewhite",
};

const DIRECTIONS = [
  { value: "left",  label: "←" },
  { value: "right", label: "→" },
  { value: "up",    label: "↑" },
  { value: "down",  label: "↓" },
];

function PreviewBox({ type, color }) {
  if (type === "cut") {
    return (
      <div style={{ width: "100%", height: 36, borderRadius: 5, background: color + "22", border: `1px solid ${color}44`, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", left: "50%", top: 4, bottom: 4, width: 2, background: color, transform: "translateX(-50%)", borderRadius: 1 }} />
      </div>
    );
  }
  const anim = ANIM_MAP[TRANSITION_CATALOG[type]?.previewAnim] || "tp-fade";
  return (
    <div style={{ width: "100%", height: 36, borderRadius: 5, background: color + "22", border: `1px solid ${color}44`, overflow: "hidden", position: "relative" }}>
      <div style={{
        position: "absolute", inset: 0,
        background: `linear-gradient(135deg, ${color}99, ${color}44)`,
        animationName: anim, animationDuration: "1.8s",
        animationIterationCount: "infinite", animationTimingFunction: "ease-in-out",
      }} />
    </div>
  );
}

const SWATCH_COLORS = {
  cut: "#64748b", fade: "#4dd0ff", dissolve: "#b48dff", slide: "#22c55e",
  wipe: "#ec4899", zoom: "#f97316", blur: "#06b6d4", circle: "#a855f7",
  fadeblack: "#334155", fadewhite: "#cbd5e1", pixelize: "#eab308", radial: "#f43f5e",
};

export default function TransitionsPanel({ scenes, selectedBoundarySceneId, onUpdateScene }) {
  const scene = scenes?.find(s => s.id === selectedBoundarySceneId);

  if (!scene) {
    return (
      <div style={{ padding: 12 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", marginBottom: 12, textTransform: "uppercase", letterSpacing: "1.5px" }}>
          Transitions
        </div>
        <div style={{ fontSize: 11, color: "#64748b", padding: "16px 0", textAlign: "center" }}>
          Click a transition marker between two scenes on the timeline to edit it here.
        </div>
      </div>
    );
  }

  const { type: currentType, direction: currentDirection } = normalizeTransition(scene.transitionToNext, scene.transitionDirection);
  const currentDuration = Math.min(Math.max(scene.transitionDuration ?? 0.5, 0.2), 2);
  const catalogEntries = Object.entries(TRANSITION_CATALOG);

  return (
    <div style={{ padding: 12 }}>
      <style>{ANIM_STYLES}</style>
      <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", marginBottom: 4, textTransform: "uppercase", letterSpacing: "1.5px" }}>
        Transitions
      </div>
      <div style={{ fontSize: 10, color: "#334155", marginBottom: 12 }}>
        {scene.narration?.slice(0, 24) || scene.action?.slice(0, 24) || "This scene"} → next
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 14 }}>
        {catalogEntries.map(([key, entry]) => (
          <div
            key={key}
            onClick={() => onUpdateScene(scene.id, { transitionToNext: key, transitionDirection: entry.directional ? (currentDirection || "left") : null })}
            title={entry.label}
            style={{
              padding: "8px 6px 6px", borderRadius: 8, cursor: "pointer",
              background: "var(--onyx-surface-2)",
              border: currentType === key ? `1px solid ${SWATCH_COLORS[key]}` : `1px solid ${SWATCH_COLORS[key]}33`,
              boxShadow: currentType === key ? `0 0 0 1px ${SWATCH_COLORS[key]}` : "none",
              display: "flex", flexDirection: "column", gap: 5, userSelect: "none",
            }}
          >
            <PreviewBox type={key} color={SWATCH_COLORS[key]} />
            <div style={{ fontSize: 10, fontWeight: 600, color: SWATCH_COLORS[key], textAlign: "center", letterSpacing: "0.02em" }}>
              {entry.label}
            </div>
          </div>
        ))}
      </div>

      {currentType !== "cut" && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, color: "#64748b", marginBottom: 4 }}>Duration — {currentDuration.toFixed(1)}s</div>
          <input
            type="range" min={0.2} max={2} step={0.1} value={currentDuration}
            onChange={e => onUpdateScene(scene.id, { transitionDuration: Number(e.target.value) })}
            style={{ width: "100%", accentColor: "var(--onyx-cyan)" }}
          />
        </div>
      )}

      {TRANSITION_CATALOG[currentType]?.directional && (
        <div>
          <div style={{ fontSize: 11, color: "#64748b", marginBottom: 4 }}>Direction</div>
          <div style={{ display: "flex", gap: 6 }}>
            {DIRECTIONS.map(d => (
              <button
                key={d.value}
                onClick={() => onUpdateScene(scene.id, { transitionDirection: d.value })}
                style={{
                  flex: 1, padding: "6px 4px", borderRadius: 4, fontSize: 14, fontWeight: 700, cursor: "pointer",
                  background: currentDirection === d.value ? "var(--chip-bg-strong)" : "var(--chip-bg)",
                  border: currentDirection === d.value ? "1px solid var(--onyx-cyan)" : "0.5px solid var(--onyx-hairline-strong)",
                  color: "var(--onyx-text)",
                }}
              >{d.label}</button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify manually — live browser check**

Using a disposable test account (signup via the app, or reuse a scratch reel):
1. Open a reel with 2+ scenes in the editor.
2. Click the transition pip/handle between two scenes on the timeline (wired in Task 5).
3. Confirm the sidebar switches to the Transitions tab and shows the 12-swatch grid with one highlighted (the current type).
4. Click a different type (e.g. `wipe`) — confirm the pip's color on the timeline updates immediately.
5. Confirm the Duration slider appears and dragging it updates the label live.
6. Confirm the Direction row appears only for `slide`/`wipe`, and clicking a direction updates the pip/handle without resetting the type.
7. Click "Cut" — confirm Duration and Direction rows both disappear.

Expected: all 7 checks pass with no console errors.

- [ ] **Step 3: Commit**

```bash
cd /srv/onyx/frontend/scheduler-dashboard-v3_STABLE_RECOVERY_1343/frontend
git add src/components/TransitionsPanel.jsx
git commit -m "feat: rewrite TransitionsPanel as the real per-boundary control panel"
```

---

### Task 7: Cleanup, scene defaults, cross-branch ship, and full live-export verification

**Files:**
- Delete: `/srv/onyx/frontend/scheduler-dashboard-v3_STABLE_RECOVERY_1343/frontend/src/components/SceneStrip.jsx`
- Delete: `/srv/onyx/frontend/scheduler-dashboard-v3_STABLE_RECOVERY_1343/frontend/src/components/TransitionMenu.jsx`
- Modify: `/srv/onyx/frontend/scheduler-dashboard-v3_STABLE_RECOVERY_1343/frontend/src/lib/sceneEngine.js:43,91` (new-scene defaults)
- Modify: `/srv/onyx/backend/TASKS.md` (log the shipped work)

- [ ] **Step 1: Confirm both files are truly unreferenced before deleting**

```bash
cd /srv/onyx/frontend/scheduler-dashboard-v3_STABLE_RECOVERY_1343/frontend
grep -rn "SceneStrip\|TransitionMenu" src/ --include="*.jsx" --include="*.js" | grep -v "src/components/SceneStrip.jsx:" | grep -v "src/components/TransitionMenu.jsx:"
```
Expected: no output (both are confirmed dead per the design doc's investigation; this re-confirms nothing changed that assumption during Tasks 1-6).

- [ ] **Step 2: Delete both files**

```bash
git rm src/components/SceneStrip.jsx src/components/TransitionMenu.jsx
```

- [ ] **Step 3: Update `sceneEngine.js` defaults**

Read the two lines first:
```bash
sed -n '40,46p;88,94p' src/lib/sceneEngine.js
```
At both locations (line 43 and line 91), find `transitionToNext: 'cut',` and add `transitionDirection: null,` immediately after it on its own line, matching the existing formatting/indentation at each site.

- [ ] **Step 4: Verify build + full manual live-export pass**

```bash
npm run build
```
Expected: succeeds.

Then, using a disposable test account and a real 3+ scene reel:
1. For each of the 12 catalog types, set it via the new panel on one boundary, run a real export, and open the exported file. Confirm it visibly shows that transition (not a silent fallback to fade/cut) — this directly re-verifies the "5 names lied about what they did" finding from brainstorming (`blur` must show real horizontal blur, not the old fadeblack; `circle` must show circleopen; `zoom` must show zoomin; `fadeblack`/`fadewhite`/`pixelize`/`radial` must all render distinctly).
2. For `slide` and `wipe`, test all 4 directions and confirm each is visually distinct in the real export.
3. Legacy migration: via a direct authenticated API call (`PATCH` or however this project updates a scene — check `routes/` for the reel-update endpoint pattern used elsewhere in the session, e.g. the paint-mask `UPDATE_CLIP` dispatch precedent), set a scene's `transitionToNext` directly to `"slideLeft"` (bypassing the new UI, simulating a pre-v2 reel), reload the editor, and confirm: (a) the panel shows `slide` selected with `left` direction highlighted, (b) a real export of that scene shows a left slide. Repeat for `"zoomOut"` (expect `zoom`), `"spin"` (expect `circle`), `"push"` (expect `slide`+`left`), `"flash"` (expect `fade`), and the old `"blur"` (expect the NEW real `hblur` output — confirm this looks like an actual blur transition, not the old fadeblack).
4. Duration extremes: set duration to 0.2s and export, then 2.0s and export — confirm both produce a working, correctly-timed transition (not a corrupted/zero-length clip).
5. Confirm no regression: a reel using plain `"cut"` between scenes still exports as a hard cut with no xfade filter applied (check the render logs/output for absence of `xfade` in the ffmpeg command for that boundary, or just confirm visually there's no crossfade artifact).

Delete the disposable test account afterward per this project's established discipline (Supabase Admin API, or report the email for the controller to delete if run from a sandboxed subagent).

- [ ] **Step 5: Ship to both frontend branches**

This repo's convention (established during the AI Rapper and B-Roll work) is to push every frontend commit to both `main` and `frontend-divergence-cleanup-20260710`. From the frontend repo root:
```bash
cd /srv/onyx/frontend/scheduler-dashboard-v3_STABLE_RECOVERY_1343/frontend
git push origin main
git push origin main:frontend-divergence-cleanup-20260710
```
Confirm both pushes succeed and deploy (build + reload) per this project's normal frontend deploy process, then live-verify against production the same way Task 4's Step 4 did locally.

- [ ] **Step 6: Update TASKS.md**

Append an entry to `/srv/onyx/backend/TASKS.md` documenting: what shipped (unified sidebar transitions panel with type/duration/direction control, 5 previously-faked ffmpeg presets fixed, `transitionStrength`/`transitionAxis` fields removed as dead capacity, `SceneStrip.jsx`/`TransitionMenu.jsx` dead code deleted, `ClipContextMenu`'s redundant transition block removed), and the outcome of the Step 4 live-export verification (which of the 12 types + directions were confirmed, and any findings).

- [ ] **Step 7: Final commit**

```bash
cd /srv/onyx/frontend/scheduler-dashboard-v3_STABLE_RECOVERY_1343/frontend
git add src/lib/sceneEngine.js
git commit -m "chore: add transitionDirection default, remove dead SceneStrip/TransitionMenu components"
cd /srv/onyx/backend
git add TASKS.md
git commit -m "docs: log Transitions v2 shipping"
```
