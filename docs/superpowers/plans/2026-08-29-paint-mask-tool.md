# Paint / Mask Editing Tool Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a user paint a static solid-color patch over part of an A-roll clip (to cover an unwanted "slop" region) or paint a static cutout mask (to reveal only that region, hiding the rest) — both persisted per-clip and correctly baked into the real ffmpeg export, not just the live preview.

**Architecture:** A new "Paint" sidebar tab drives a drawing canvas overlaid on the existing preview frame (reusing the app's existing chroma-key canvas technique). On Save, the drawn strokes flatten to one PNG (auto-inverted for cutout mode), upload via the existing generic upload endpoint, and the resulting URL + percent-based bounding box are written onto the active A-roll timeline clip (same storage convention B-Roll's `xPct`/`yPct` already use — no new database table). Live preview overlays that PNG on the video at the stored position. Export adds one new conditional ffmpeg `overlay` stage to the existing per-scene compositing pipeline, gated on the clip having a `paintMaskUrl`, positioned identically to the preview.

**Tech Stack:** React (frontend, no new dependencies — plain HTML5 `<canvas>` 2D context, same as the existing avatar chroma-key preview), Express + ffmpeg (backend, `routes/render.js`).

**Spec:** `docs/paint-mask-editing-tool-design.md` (backend repo) — the plan argues from this spec; read both.

## Global Constraints

- **A-roll only.** No B-Roll/Avatar integration in this plan.
- **Static shapes only.** One fixed position/size for the clip's entire duration — no keyframing, no interpolation, no per-frame tracking.
- **Solid color fill only.** No blur/pixelate option.
- **Cover and cutout share one export mechanism.** The cutout PNG is auto-inverted client-side at save time (opaque everywhere except the painted strokes); the export-side ffmpeg step is identical for both modes — never build two ffmpeg code paths.
- **No new database table or migration.** New fields ride on the existing `scenes.timeline` JSON blob, on the A-roll clip object, exactly like B-Roll's existing `brollXPct`/`brollYPct`/`brollSizePct` fields.
- **No new backend upload route.** Reuse the existing `POST /api/media/upload` endpoint (multipart `files` field + `assetType`), same as `StoryboardPanel.jsx`'s Start Image upload.
- **No automated test suite exists for either repo's frontend or this rendering path** (`backend/package.json`'s `test` script is a stub). Every task's verification step is manual: build, then live-verify in a real browser against the deployed app with a disposable test account, per this session's established discipline. Delete the disposable account when a task's verification is done, unless the next task needs the same account/reel (note this explicitly when it applies).
- **Live site**: `https://onyx-reelz.com`. Frontend build: `npm run build` in `/srv/onyx/frontend/onyx-frontend/frontend` (nginx serves `dist/` directly, no separate deploy step). Backend changes to `render.js` take effect on the next `POST /render` call — check whether the backend process needs a restart (`pm2 list` / `pm2 restart <name>`) as part of verifying Task 5.
- **Disposable test accounts**: signup via `/signup` with an email like `paint-tool-verify-<step>@onyx-test.local`, password `TempVerify6chars`; delete afterward via Supabase Admin API (`DELETE {SUPABASE_URL}/auth/v1/admin/users/{userId}` with the service-role key from `backend/.env`) — never touch Nathan's real account.

---

### Task 1: Icon + sidebar tab entry

**Files:**
- Modify: `src/pages/EditorV2.jsx:149-162` (`EDITOR_ICONS` map)
- Modify: `src/pages/EditorV2.jsx:134-147` (`SIDEBAR_TABS` array)

**Interfaces:**
- Consumes: nothing new.
- Produces: a `"paint"` key reachable via `activeMenu === "paint"` and `EditorIcon name="paint"` — later tasks route on this key and render this icon.

- [ ] **Step 1: Add the paint icon**

In `EDITOR_ICONS` (currently ends at line 161 with `avatar:`), add one more entry before the closing `};`:

```js
  paint:       `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="M2 2l7.586 7.586"/><circle cx="11" cy="11" r="2"/></svg>`,
```

- [ ] **Step 2: Add the sidebar tab**

In `SIDEBAR_TABS` (currently ends at line 146 with the `avatar` entry), add one more entry before the closing `];`:

```js
  { key: "paint",       label: "Paint",        icon: "paint"       },
```

- [ ] **Step 3: Build and verify no errors**

```bash
cd /srv/onyx/frontend/onyx-frontend/frontend && npm run build
```
Expected: build completes cleanly (same as every other successful build this session — ends with "Done: 25 static routes prerendered.").

- [ ] **Step 4: Live-verify the tab renders**

Sign up a disposable test account, open the editor (`/studio` → Blank Editor), and confirm a 13th "Paint" entry now appears in the icon rail with a visible label, matching the other 12. Clicking it can safely do nothing yet (no panel wired up until Task 3) — that's expected at this point.

- [ ] **Step 5: Commit**

```bash
cd /srv/onyx/frontend/onyx-frontend/frontend
git add src/pages/EditorV2.jsx
git commit -m "feat(paint-tool): add Paint icon + sidebar tab entry"
```

---

### Task 2: Drawing canvas overlay inside PreviewCanvas

**Files:**
- Modify: `src/pages/EditorV2.jsx` — the `PreviewCanvas` function (starts at line 441) and its props signature.
- Modify: `src/pages/EditorV2.jsx` — the call site that renders `<PreviewCanvas .../>` (search for `<PreviewCanvas` — it's inside the main `EditorV2` component body, passed the existing prop list like `uploadImgRef`, `brollImgRef`, etc.).

**Interfaces:**
- Consumes: nothing from earlier tasks except the `"paint"` `activeMenu` key from Task 1.
- Produces: five new pieces of state lifted into `EditorV2` (`paintActive: boolean`, `paintMode: "cover"|"cutout"`, `paintBrushSize: number`, `paintColor: string`, `paintStrokes: Array<{points: [number,number][], size: number, color: string}>`, `setPaintStrokes`) and a `paintCanvasRef` — Task 3's save handler reads `paintStrokes`/`paintCanvasRef` to flatten to a PNG; Task 3's controls panel reads/writes `paintMode`/`paintBrushSize`/`paintColor`/`paintStrokes`.

Why lifted to `EditorV2` rather than local to either component: the drawing surface must live inside `PreviewCanvas` (it needs `frameRef`'s real on-screen rect to position correctly, matching how B-Roll's own resize-drag logic already works inline inside `PreviewCanvas`), but the controls (mode/color/size/undo/save) belong in a sidebar panel — a sibling, not a child, of `PreviewCanvas`. Lifting state to their common parent (`EditorV2`) is the same pattern already used for `activeMenu`, `selectedClipId`, etc.

- [ ] **Step 1: Add lifted state to `EditorV2`**

Near the other sidebar-adjacent state (e.g. next to `const [activeMenu, setActiveMenu] = useState("storyboard");` at line 1743), add:

```js
  const [paintMode,       setPaintMode]       = useState("cover"); // "cover" | "cutout"
  const [paintBrushSize,  setPaintBrushSize]  = useState(24);
  const [paintColor,      setPaintColor]      = useState("#ff3b30");
  const [paintStrokes,    setPaintStrokes]    = useState([]); // [{points:[[x,y],...], size, color}]
  const paintCanvasRef = useRef(null);
```

`points` are stored as `[x, y]` pairs in the canvas's own pixel space (not percent) — Task 3's flatten step converts to percent only once, at Save.

- [ ] **Step 2: Add `paintActive` to the `<PreviewCanvas>` call site and its prop signature**

At the `<PreviewCanvas` call site, add:
```js
              paintActive={activeMenu === "paint"}
              paintMode={paintMode}
              paintBrushSize={paintBrushSize}
              paintColor={paintColor}
              paintStrokes={paintStrokes}
              setPaintStrokes={setPaintStrokes}
              paintCanvasRef={paintCanvasRef}
```

In `PreviewCanvas`'s own function signature (line 441), add the same names to the destructured props list.

- [ ] **Step 3: Render the drawing canvas and wire pointer events**

Inside `PreviewCanvas`'s JSX, in the same absolutely-positioned frame wrapper that already holds `uploadImgRef`'s `<img>` (around line 760), add — this must render *above* every other layer (`zIndex: 40`, higher than B-Roll's resize-handle `zIndex: 21`) and only capture pointer events while the Paint tab is actually active:

```jsx
                {paintActive && (
                  <canvas
                    ref={paintCanvasRef}
                    style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: 40, cursor: 'crosshair', touchAction: 'none' }}
                    onPointerDown={e => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const x = e.clientX - rect.left, y = e.clientY - rect.top;
                      e.currentTarget.setPointerCapture(e.pointerId);
                      setPaintStrokes(prev => [...prev, { points: [[x, y]], size: paintBrushSize, color: paintColor }]);
                    }}
                    onPointerMove={e => {
                      if (e.buttons !== 1) return;
                      const rect = e.currentTarget.getBoundingClientRect();
                      const x = e.clientX - rect.left, y = e.clientY - rect.top;
                      setPaintStrokes(prev => {
                        if (!prev.length) return prev;
                        const next = prev.slice();
                        const last = next[next.length - 1];
                        next[next.length - 1] = { ...last, points: [...last.points, [x, y]] };
                        return next;
                      });
                    }}
                  />
                )}
```

- [ ] **Step 4: Redraw the canvas whenever strokes or the active-tab state change**

Immediately after `PreviewCanvas`'s existing `useEffect`s (there are several already, e.g. the avatar draw loop), add:

```js
  useEffect(() => {
    if (!paintActive) return;
    const canvas = paintCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const cw = Math.max(1, Math.round(rect.width * dpr));
    const ch = Math.max(1, Math.round(rect.height * dpr));
    if (canvas.width !== cw || canvas.height !== ch) { canvas.width = cw; canvas.height = ch; }
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (const stroke of paintStrokes) {
      if (stroke.points.length < 2) continue;
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.size * dpr;
      ctx.beginPath();
      ctx.moveTo(stroke.points[0][0] * dpr, stroke.points[0][1] * dpr);
      for (const [x, y] of stroke.points.slice(1)) ctx.lineTo(x * dpr, y * dpr);
      ctx.stroke();
    }
  }, [paintActive, paintStrokes]);
```

- [ ] **Step 5: Build and manually verify drawing works**

```bash
cd /srv/onyx/frontend/onyx-frontend/frontend && npm run build
```

Sign up a disposable test account, open the editor, add a scene with real video content (a direct-URL paste is fastest — reuse `https://pub-31e667ae894f4cddbf03ae6a7578eff1.r2.dev/reframe360/53bdb062-790f-4289-85be-d9ef39a3a67d_scene0.mp4` if a fresh test video isn't otherwise available), click the new Paint tab, and drag across the preview frame with the mouse. Confirm a red freehand stroke follows the cursor in real time. No save/persistence exists yet — refreshing the page is expected to lose the drawing at this point in the plan.

- [ ] **Step 6: Commit**

```bash
cd /srv/onyx/frontend/onyx-frontend/frontend
git add src/pages/EditorV2.jsx
git commit -m "feat(paint-tool): add live drawing canvas overlay on preview"
```

---

### Task 3: PaintMaskPanel sidebar controls + save/flatten/upload

**Files:**
- Create: `src/components/PaintMaskPanel.jsx`
- Modify: `src/pages/EditorV2.jsx` — the `activeMenu` panel-switch block (search for `activeMenu==="avatar"` — add a sibling `activeMenu==="paint"` branch right after it, following the exact same `<Safe name="...">` wrapping pattern every other panel already uses).

**Interfaces:**
- Consumes: `paintMode`/`setPaintMode`, `paintBrushSize`/`setPaintBrushSize`, `paintColor`/`setPaintColor`, `paintStrokes`/`setPaintStrokes`, `paintCanvasRef` (all from Task 2), `activeScene`, `scenes`, `timelineState`, `dispatch` (all already available in `EditorV2` and already threaded to sibling panels the same way — e.g. `StoryboardPanel` already receives `timelineState`/`dispatch`).
- Produces: nothing further tasks depend on directly — this task's Save button is the end of the editing flow; Task 4 reads the *result* (`clip.paintMaskUrl` etc.) independently via the timeline state, not via this component.

- [ ] **Step 1: Create the panel component**

```jsx
import React from "react";
import { getAuthHeaders } from "../utils/auth.js";

export default function PaintMaskPanel({
  paintMode, setPaintMode,
  paintBrushSize, setPaintBrushSize,
  paintColor, setPaintColor,
  paintStrokes, setPaintStrokes,
  paintCanvasRef,
  activeScene, scenes, timelineState, dispatch,
}) {
  const [saving, setSaving] = React.useState(false);

  function undo() {
    setPaintStrokes(prev => prev.slice(0, -1));
  }
  function clearAll() {
    setPaintStrokes([]);
  }

  // Flattens paintStrokes to a tightly-cropped PNG. For "cutout" mode the
  // fill is inverted here (opaque everywhere EXCEPT the painted strokes)
  // -- this is the one place the mode difference is handled; export
  // (render.js) treats both modes identically once the PNG exists, per
  // docs/paint-mask-editing-tool-design.md.
  async function flattenToBlob() {
    const canvas = paintCanvasRef.current;
    if (!canvas || !paintStrokes.length) return null;

    // Bounding box of all stroke points, in the SAME pixel space the
    // strokes were recorded in (canvas.getBoundingClientRect() space,
    // not the backing-store devicePixelRatio space) -- matches how the
    // draw effect in Task 2 scales points by dpr only at draw time.
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const s of paintStrokes) {
      for (const [x, y] of s.points) {
        minX = Math.min(minX, x - s.size); maxX = Math.max(maxX, x + s.size);
        minY = Math.min(minY, y - s.size); maxY = Math.max(maxY, y + s.size);
      }
    }
    const rect = canvas.getBoundingClientRect();
    minX = Math.max(0, minX); minY = Math.max(0, minY);
    maxX = Math.min(rect.width, maxX); maxY = Math.min(rect.height, maxY);
    const boxW = Math.max(1, Math.round(maxX - minX));
    const boxH = Math.max(1, Math.round(maxY - minY));

    const out = document.createElement("canvas");
    out.width = boxW; out.height = boxH;
    const ctx = out.getContext("2d");

    if (paintMode === "cutout") {
      // Opaque fill color everywhere, EXCEPT the painted strokes (cut out
      // via destination-out) -- reveals only the painted region on export.
      ctx.fillStyle = paintColor;
      ctx.fillRect(0, 0, boxW, boxH);
      ctx.globalCompositeOperation = "destination-out";
    }
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (const s of paintStrokes) {
      if (s.points.length < 2) continue;
      ctx.strokeStyle = paintMode === "cutout" ? "#000000" : s.color;
      ctx.lineWidth = s.size;
      ctx.beginPath();
      ctx.moveTo(s.points[0][0] - minX, s.points[0][1] - minY);
      for (const [x, y] of s.points.slice(1)) ctx.lineTo(x - minX, y - minY);
      ctx.stroke();
    }

    const blob = await new Promise(resolve => out.toBlob(resolve, "image/png"));
    return { blob, xPct: (minX / rect.width) * 100, yPct: (minY / rect.height) * 100,
             widthPct: (boxW / rect.width) * 100, heightPct: (boxH / rect.height) * 100 };
  }

  async function handleSave() {
    if (!activeScene || !paintStrokes.length) return;
    setSaving(true);
    try {
      const flattened = await flattenToBlob();
      if (!flattened) return;
      const headers = await getAuthHeaders();
      const form = new FormData();
      form.append("files", flattened.blob, "paint-mask.png");
      form.append("assetType", "image");
      const res = await fetch("/api/media/upload", { method: "POST", headers, body: form });
      const data = await res.json();
      const uploaded = data?.files?.[0];
      if (!uploaded?.url) throw new Error("Upload returned no URL");

      const videoTrack = timelineState.tracks.find(t => t.key === "video");
      const clip = videoTrack?.clips.find(c => c.sceneId === activeScene);
      if (!clip) throw new Error("No A-roll clip found for the active scene");

      dispatch({
        type: "UPDATE_CLIP",
        clipId: clip.id,
        changes: {
          paintMaskUrl: uploaded.url,
          paintMaskMode: paintMode,
          paintMaskXPct: flattened.xPct,
          paintMaskYPct: flattened.yPct,
          paintMaskWidthPct: flattened.widthPct,
          paintMaskHeightPct: flattened.heightPct,
        },
      });
      setPaintStrokes([]);
    } catch (err) {
      console.error("[PaintMaskPanel] save failed:", err);
      alert("Failed to save paint mask: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ padding: 12 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", marginBottom: 12, textTransform: "uppercase", letterSpacing: "1.5px" }}>
        Paint
      </div>
      <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
        <button onClick={() => setPaintMode("cover")} style={{ flex: 1, padding: "6px 8px", borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: "pointer", background: paintMode === "cover" ? "var(--chip-bg-strong)" : "var(--chip-bg)", border: paintMode === "cover" ? "1px solid var(--onyx-cyan)" : "0.5px solid var(--onyx-hairline-strong)", color: "var(--onyx-text)" }}>Cover</button>
        <button onClick={() => setPaintMode("cutout")} style={{ flex: 1, padding: "6px 8px", borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: "pointer", background: paintMode === "cutout" ? "var(--chip-bg-strong)" : "var(--chip-bg)", border: paintMode === "cutout" ? "1px solid var(--onyx-cyan)" : "0.5px solid var(--onyx-hairline-strong)", color: "var(--onyx-text)" }}>Mask (cutout)</button>
      </div>
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 11, color: "#64748b", marginBottom: 4 }}>Brush size — {paintBrushSize}px</div>
        <input type="range" min={4} max={80} step={2} value={paintBrushSize} onChange={e => setPaintBrushSize(Number(e.target.value))} style={{ width: "100%", accentColor: "var(--onyx-cyan)" }}/>
      </div>
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 11, color: "#64748b", marginBottom: 4 }}>{paintMode === "cutout" ? "Hidden-area color" : "Fill color"}</div>
        <input type="color" value={paintColor} onChange={e => setPaintColor(e.target.value)} style={{ width: 48, height: 28, borderRadius: 4, border: "1px solid #2b3442", background: "none", cursor: "pointer", padding: 2 }}/>
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <button onClick={undo} disabled={!paintStrokes.length} style={{ flex: 1, padding: "7px 0", borderRadius: 4, fontSize: 11, fontWeight: 700, background: "var(--chip-bg)", border: "0.5px solid var(--onyx-hairline-strong)", color: "var(--onyx-text)", cursor: paintStrokes.length ? "pointer" : "not-allowed", opacity: paintStrokes.length ? 1 : 0.4 }}>Undo</button>
        <button onClick={clearAll} disabled={!paintStrokes.length} style={{ flex: 1, padding: "7px 0", borderRadius: 4, fontSize: 11, fontWeight: 700, background: "var(--chip-bg)", border: "0.5px solid var(--onyx-hairline-strong)", color: "var(--onyx-text)", cursor: paintStrokes.length ? "pointer" : "not-allowed", opacity: paintStrokes.length ? 1 : 0.4 }}>Clear</button>
      </div>
      <button onClick={handleSave} disabled={saving || !paintStrokes.length} style={{ width: "100%", padding: "9px 0", borderRadius: 6, fontSize: 12, fontWeight: 700, background: "var(--btn-primary-grad)", border: "none", color: "var(--btn-primary-text)", cursor: (saving || !paintStrokes.length) ? "not-allowed" : "pointer", opacity: (saving || !paintStrokes.length) ? 0.5 : 1 }}>
        {saving ? "Saving…" : "Save"}
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Import and wire the panel into `EditorV2`'s activeMenu switch**

Add the import near the other panel imports (e.g. next to `import StylesPanel from "../components/StylesPanel.jsx";`):
```js
import PaintMaskPanel from "../components/PaintMaskPanel.jsx";
```

In the `activeMenu` switch block, immediately after the `activeMenu==="avatar"` branch, add:
```jsx
            {activeMenu==="paint" && <Safe name="PaintMaskPanel"><PaintMaskPanel
              paintMode={paintMode} setPaintMode={setPaintMode}
              paintBrushSize={paintBrushSize} setPaintBrushSize={setPaintBrushSize}
              paintColor={paintColor} setPaintColor={setPaintColor}
              paintStrokes={paintStrokes} setPaintStrokes={setPaintStrokes}
              paintCanvasRef={paintCanvasRef}
              activeScene={activeScene} scenes={scenes} timelineState={timelineState} dispatch={dispatchWithHistory}
            /></Safe>}
```

(`dispatchWithHistory` is confirmed correct — it's what `StoryboardPanel`, `TextPanel`, `BrollPanel`, and `AvatarPanel` all pass in this same switch block, so paint-mask edits participate in undo/redo the same way every other clip edit does. `ElementsPanel` is the one outlier using plain `dispatch` — do not copy that one.)

- [ ] **Step 3: Build and verify no errors**

```bash
cd /srv/onyx/frontend/onyx-frontend/frontend && npm run build
```

- [ ] **Step 4: Live-verify save persists**

Disposable test account, real video scene (same setup as Task 2's verification). Open Paint tab, draw a cover-mode patch, click Save. Confirm:
- the Save button shows "Saving…" then returns to normal
- fetching the reel via the API afterward (`GET /api/reels/:id` with the account's bearer token, same technique used earlier this session for the thumbnail-bug verification) shows the A-roll clip in `scenes[].timeline` (or wherever the clip object surfaces in the response) now has a real `paintMaskUrl`, `paintMaskMode: "cover"`, and non-null percent fields.
- Switch mode to "cutout", draw a second patch on the same or a different scene, Save, confirm via the API again that `paintMaskMode` is `"cutout"` this time.

Delete the test account after — this task's own verification is self-contained and doesn't feed into Task 4/5's verification.

- [ ] **Step 5: Commit**

```bash
cd /srv/onyx/frontend/onyx-frontend/frontend
git add src/components/PaintMaskPanel.jsx src/pages/EditorV2.jsx
git commit -m "feat(paint-tool): add PaintMaskPanel controls, flatten+upload+save"
```

---

### Task 4: Playback preview overlay

**Files:**
- Modify: `src/pages/EditorV2.jsx` — new ref creation (near `const brollImgRef = useRef(null);` at line 2416), the `<PreviewCanvas>` call site and prop signature (add `paintMaskImgRef`), the JSX inside `PreviewCanvas` (near the existing `uploadImgRef`'s `<img>` at line 760), and the scrub-sync effect (`syncOverlay`, starting at line 2569) plus the play-loop (`tick()`, containing `syncOrHideAroll` around line 2805).

**Interfaces:**
- Consumes: `clip.paintMaskUrl`/`paintMaskMode`/`paintMaskXPct`/`paintMaskYPct`/`paintMaskWidthPct`/`paintMaskHeightPct` written by Task 3's Save handler.
- Produces: nothing further tasks depend on — this is the live-preview leaf of the feature; Task 5 (export) is independent and reads the same clip fields directly from the render request, not from anything this task produces.

- [ ] **Step 1: Add the ref and thread it to `PreviewCanvas`**

Near `const brollImgRef = useRef(null);` (line 2416):
```js
  const paintMaskImgRef = useRef(null);
```

At the `<PreviewCanvas>` call site, add `paintMaskImgRef={paintMaskImgRef}`; in `PreviewCanvas`'s prop signature, add `paintMaskImgRef` to the destructured list.

- [ ] **Step 2: Render the overlay image**

Inside `PreviewCanvas`'s JSX, add this near the other overlay elements (after the B-Roll overlay block, so paint mask visually sits on top of B-Roll too — consistent with "paint covers whatever's in the frame," matching the z-index ordering already established: video slots at 2, upload overlays at 10, B-Roll above that):

```jsx
                <img
                  ref={paintMaskImgRef}
                  className="v2-preview-paint-mask"
                  style={{ position: 'absolute', display: 'none', zIndex: 35, pointerEvents: 'none', objectFit: 'fill' }}
                  alt=""
                />
```

(`display`/`left`/`top`/`width`/`height` are all set imperatively by the sync helper in Step 3 below, not via React state — same pattern the existing `uploadImgRef`/`brollImgRef` elements already use, since this needs to update from both the paused-scrub effect and the imperative `tick()` play loop without triggering a React re-render on every frame.)

- [ ] **Step 3: Add the imperative sync helper**

Immediately after the existing `syncOverlay` function definition (starts at line 2569, ends a few lines later), add a new, much simpler helper — no video loading/`oncanplay` handling needed since this is always a static image, not a video:

```js
    // Paint mask overlay -- always-on for the clip's whole duration (unlike
    // B-Roll's overlay, which is time-bound to a sub-range). Static
    // position/size only (v1 scope, see docs/paint-mask-editing-tool-design.md)
    // so this never needs per-frame updates -- only when the ACTIVE clip
    // changes does anything here need to run again.
    function syncPaintMask(imgEl, clip) {
      if (!imgEl) return;
      if (!clip?.paintMaskUrl) {
        imgEl.style.display = 'none';
        imgEl.removeAttribute('data-clip-id');
        return;
      }
      if (imgEl.getAttribute('data-clip-id') === clip.id) return; // already showing this clip's mask
      imgEl.src = clip.paintMaskUrl;
      imgEl.setAttribute('data-clip-id', clip.id);
      imgEl.style.left = `${clip.paintMaskXPct}%`;
      imgEl.style.top = `${clip.paintMaskYPct}%`;
      imgEl.style.width = `${clip.paintMaskWidthPct}%`;
      imgEl.style.height = `${clip.paintMaskHeightPct}%`;
      imgEl.style.display = 'block';
    }
```

- [ ] **Step 4: Call it from the paused/scrub effect**

At line 2528, `const videoClipScrub = findAt("video");` already resolves the active A-roll clip unconditionally (regardless of whether B-Roll is also active) — this is deliberately the general-purpose variable, not one of the branch-specific ones a few lines further down (`clip`, `arollScene`, etc.), so paint mask visibility depends only on which A-roll clip is active, matching its actual semantics (unrelated to B-Roll). Immediately after line 2528-2529 (`const videoClipScrub = findAt("video"); const isBrollScrub = !!brollClipScrub;`), and before the `if (!targetSrc) return;` guard at line 2531 (so it's never skipped by that early exit), add:

```js
    syncPaintMask(paintMaskImgRef.current, videoClipScrub);
```

- [ ] **Step 5: Call it from the play-loop `tick()`**

At line 2794-2795, `const brollClip = findActive("broll"); const videoClip = findActive("video");` already resolves both unconditionally, before any branching. Immediately after line 2795, add:

```js
      syncPaintMask(paintMaskImgRef.current, videoClip);
```

- [ ] **Step 6: Build and verify no errors**

```bash
cd /srv/onyx/frontend/onyx-frontend/frontend && npm run build
```

- [ ] **Step 7: Live-verify preview playback**

Disposable test account, real 2-scene reel: scene 1 with a cover-mode paint mask saved (reuse Task 3's save flow), scene 2 with no mask. Confirm:
- Paused/scrubbed to scene 1: the colored patch renders at the correct position over the video.
- Play through scene 1 into scene 2: the patch stays visible and correctly positioned throughout scene 1's playback (not just at the moment of pausing), then correctly disappears the instant scene 2 becomes active.
- Scrub back into scene 1 from scene 2: the patch reappears correctly.
- Repeat with the reel's aspect ratio set to both `9:16` and `16:9` (switch via the ratio dropdown) to confirm the percent-based positioning holds in both — this is exactly the same aspect-ratio cross-check the earlier fitMode bug fix this session required.

Delete the test account after.

- [ ] **Step 8: Commit**

```bash
cd /srv/onyx/frontend/onyx-frontend/frontend
git add src/pages/EditorV2.jsx
git commit -m "feat(paint-tool): add live playback preview for saved paint masks"
```

---

### Task 5: Export compositing

**Files:**
- Modify: `src/pages/EditorV2.jsx` — `buildV2RenderRequest`'s `renderable` map (starts at line 1307, the per-clip object built at line 1342 onward).
- Modify: `backend/routes/render.js` — insert a new conditional compositing stage right after the existing B-Roll stage closes (after `segOutput = brollSeg;` and its enclosing `}`, at line 2201, before the `// Step 2: Add voiceover` comment at line 2209).

**Interfaces:**
- Consumes: `clip.paintMaskUrl`/`paintMaskMode`/`paintMaskXPct`/`paintMaskYPct`/`paintMaskWidthPct`/`paintMaskHeightPct` (written by Task 3), `WIDTH`/`HEIGHT`/`segOutput`/`baseDurRaw`/`workDir`/`ensureLocalFile`/`run` (all already in scope in `render.js` at the insertion point, used identically by the existing B-Roll stage immediately above).
- Produces: nothing further tasks depend on — this is the terminal, export-side half of the feature.

- [ ] **Step 1: Forward the paint mask fields into the render request**

In `buildV2RenderRequest`'s `renderable` map (`src/pages/EditorV2.jsx:1307`), inside the returned per-clip object (the block starting at line 1342 with `type:`, `url:`, etc.), add — right after the existing `fitMode:` field (line 1373) reads naturally, since both are per-clip visual-treatment fields:

```js
      paintMaskUrl:         clip.paintMaskUrl || null,
      paintMaskMode:        clip.paintMaskMode || null,
      paintMaskXPct:        clip.paintMaskXPct,
      paintMaskYPct:        clip.paintMaskYPct,
      paintMaskWidthPct:    clip.paintMaskWidthPct,
      paintMaskHeightPct:   clip.paintMaskHeightPct,
```

- [ ] **Step 2: Add the export-side compositing stage**

In `backend/routes/render.js`, right after line 2201 (`}` closing the B-Roll `if (isBrollVideo) {...} else {...}` block) and its own log line at 2202, before the blank line + `// Step 2: Add voiceover` comment at 2209, insert:

```js
      // Step 1b: Paint mask overlay (cover or cutout -- both use the same
      // static overlay mechanism; the mode difference was already resolved
      // client-side into the PNG's own alpha at save time, see
      // docs/paint-mask-editing-tool-design.md). Gated on scene.paintMaskUrl
      // the same way B-Roll above is gated on its own URL field -- undefined
      // for every existing reel and any scene the user never painted on, so
      // this is purely additive.
      if (scene.paintMaskUrl) {
        try {
          const paintMaskPath = await ensureLocalFile(scene.paintMaskUrl, workDir);
          const paintMaskSeg = path.join(workDir, `seg_${i}_paintmask.mp4`);
          const pmX = Math.round((scene.paintMaskXPct / 100) * WIDTH);
          const pmY = Math.round((scene.paintMaskYPct / 100) * HEIGHT);
          const pmW = Math.round((scene.paintMaskWidthPct / 100) * WIDTH);
          const pmH = Math.round((scene.paintMaskHeightPct / 100) * HEIGHT);
          await run("ffmpeg", [
            "-y",
            "-i", segOutput,
            "-i", paintMaskPath,
            "-filter_complex",
            `[1:v]scale=${pmW}:${pmH}[pmask];[0:v][pmask]overlay=x=${pmX}:y=${pmY}[v]`,
            "-map", "[v]", "-map", "0:a?",
            "-c:v", VIDEO_CODEC, "-preset", PRESET, "-crf", CRF, "-pix_fmt", PIX_FMT,
            "-c:a", "copy", "-t", String(baseDurRaw), "-movflags", "+faststart",
            paintMaskSeg,
          ]);
          segOutput = paintMaskSeg;
          console.log(`[render] scene ${i} after paint mask: segOutput=${segOutput}`);
        } catch (err) {
          console.error(`Paint mask composite failed for scene ${i}: [${err.constructor.name}] ${err.message}`);
        }
      }

```

- [ ] **Step 3: Build the frontend, restart the backend if needed**

```bash
cd /srv/onyx/frontend/onyx-frontend/frontend && npm run build
```

Check how the backend process is actually run (`pm2 list`, or check for a running `node`/`nodemon` process against `backend/`) and restart it so the `render.js` change takes effect — do not assume a bare edit is picked up live without checking.

- [ ] **Step 4: Live-verify the real export**

Disposable test account, a real scene with real video content and a saved cover-mode paint mask (reuse the Task 4 setup/flow). This step needs real generation/export credits — if the disposable account has 0 credits (the default for a fresh signup, per this session's established pattern), either note this limitation explicitly and stop short of a full render verification, or ask Nathan for a way to grant test credits before proceeding; do not skip this step silently or claim it passed without actually running it.

If credits are available:
- Trigger a real export (`Export` button in the toolbar → `POST /render`, poll `GET /render/status/:jobId`).
- Download the resulting file and confirm the composited patch is visibly present in the *rendered output*, not just the live preview — at the same relative position/size the preview showed.
- Repeat once for a cutout-mode mask, confirming the exported video shows only the painted region with the rest covered in the chosen hidden-area color.

Delete the test account after.

- [ ] **Step 5: Commit**

```bash
cd /srv/onyx/frontend/onyx-frontend/frontend
git add src/pages/EditorV2.jsx
git commit -m "feat(paint-tool): forward paint mask fields into the render request"

cd /srv/onyx/backend
git add routes/render.js
git commit -m "feat(paint-tool): composite paint mask overlay into ffmpeg export"
```

---

### Task 6: Ship to the frontend divergence branch + close out TASKS.md

**Files:**
- No new file changes — this task cherry-picks Tasks 1-5's frontend commits onto `frontend-divergence-cleanup-20260710` (per this session's standing lockstep rule) and updates `backend/TASKS.md`.

**Interfaces:**
- Consumes: the commits from Tasks 1-5.
- Produces: nothing further — terminal task.

- [ ] **Step 1: Push `main`, then cherry-pick onto the divergence branch**

```bash
cd /srv/onyx/frontend/onyx-frontend/frontend
git push origin main
git fetch origin frontend-divergence-cleanup-20260710
git checkout -B frontend-divergence-cleanup-20260710 origin/frontend-divergence-cleanup-20260710
```

Cherry-pick each of Task 1-5's frontend commits, in order, checking for conflicts at each step (do not batch them into a single cherry-pick range unless each one applied cleanly individually first):

```bash
git cherry-pick <task1-commit-sha>
git cherry-pick <task2-commit-sha>
git cherry-pick <task3-commit-sha>
git cherry-pick <task4-commit-sha>
git cherry-pick <task5-frontend-commit-sha>
git push origin frontend-divergence-cleanup-20260710
git checkout main
```

If any cherry-pick conflicts, resolve it by reading the conflicting hunk directly (same discipline as every other cherry-pick this session) — never blindly take "ours" or "theirs".

- [ ] **Step 2: Update `backend/TASKS.md`**

Add an entry documenting what shipped, its scope boundaries (A-roll only, static only, solid-color only — so a future reader doesn't assume full parity), and the commit SHAs on both branches — follow the exact style of every other "SHIPPED"/"FIXED" entry already in that file (see the entries logged earlier this same session for the AI Studio leak fix, the dashboard thumbnail fix, and the chrome-polish pass, as the format to match).

```bash
cd /srv/onyx/backend
git add TASKS.md
git commit -m "docs: log paint/mask editing tool shipping"
```
