import React from "react";
import { getAuthHeaders } from "../utils/auth.js";
import { renderStroke } from "../utils/paintBrush.js";

const DEFAULT_COVER_COLOR = "#ff3b30";
const DEFAULT_CUTOUT_COLOR = "#000000";

export default function PaintMaskPanel({
  paintMode, setPaintMode,
  paintBrushSize, setPaintBrushSize,
  paintColor, setPaintColor,
  paintBrushType, setPaintBrushType,
  paintOpacity, setPaintOpacity,
  paintErasing, setPaintErasing,
  paintStrokes, setPaintStrokes,
  paintCanvasRef,
  activeScene, scenes, timelineState, playhead, dispatch,
}) {
  const [saving, setSaving] = React.useState(false);

  function undo() {
    setPaintStrokes(prev => prev.slice(0, -1));
  }
  function clearAll() {
    setPaintStrokes([]);
  }

  // Resolves the SAME clip the live preview (syncPaintMask in EditorV2) and
  // export (buildV2RenderRequest, one entry per clip) resolve: the video-track
  // clip active at the current playhead, not just any clip matching the
  // active scene's id. A scene can be Split into multiple clips, and the
  // first-clip-matching-sceneId lookup used here previously could target the
  // wrong half. Matches the findAt("video") pattern in EditorV2's own scrub
  // sync effect exactly.
  function getActiveClip() {
    const videoTrack = timelineState.tracks.find(t => t.key === "video");
    return videoTrack?.clips.find(
      c => playhead >= c.startTime && playhead < c.startTime + (c.trimEnd - c.trimStart)
    ) || null;
  }

  const activeClip = getActiveClip();

  // Flattens paintStrokes to a PNG. Cover mode crops tight to the strokes'
  // bounding box (unchanged). Cutout mode -- a full-frame vignette that
  // hides everything OUTSIDE the painted strokes -- must cover the ENTIRE
  // preview frame, not just a tight box around the strokes: a bbox-sized
  // cutout PNG only ever hides a thin margin around the paint, not the rest
  // of the frame. See docs/paint-mask-editing-tool-design.md and the final
  // whole-branch review, Critical #1.
  //
  // Both modes scale by devicePixelRatio, matching the dpr pattern already
  // used by the live drawing canvas's own redraw effect in EditorV2.jsx --
  // otherwise the flattened PNG is sized at CSS-pixel resolution (~280-400px)
  // and gets blurrily upscaled at export.
  async function flattenToBlob() {
    const canvas = paintCanvasRef.current;
    if (!canvas || !paintStrokes.length) return null;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();

    if (paintMode === "cutout") {
      const outW = Math.max(1, Math.round(rect.width * dpr));
      const outH = Math.max(1, Math.round(rect.height * dpr));

      // Step 1: composite the strokes normally (paint adds to the revealed
      // shape, erase removes from it -- same renderStroke() semantics the
      // live drawing canvas uses) onto a temp canvas. This is the
      // "revealed" shape, independent of brush type/opacity/erase mix.
      const temp = document.createElement("canvas");
      temp.width = outW; temp.height = outH;
      const tctx = temp.getContext("2d");
      for (const s of paintStrokes) renderStroke(tctx, s, dpr);

      // Step 2: fill the hidden-area color across the whole frame, then cut
      // out exactly the revealed shape using it as a destination-out mask
      // -- reveals only the painted region on export, hides everything else.
      const out = document.createElement("canvas");
      out.width = outW; out.height = outH;
      const ctx = out.getContext("2d");
      ctx.fillStyle = paintColor;
      ctx.fillRect(0, 0, outW, outH);
      ctx.globalCompositeOperation = "destination-out";
      ctx.drawImage(temp, 0, 0);

      const blob = await new Promise(resolve => out.toBlob(resolve, "image/png"));
      // Full-frame mask -- 0/0/100/100 covers the whole clip. render.js
      // needs no changes: it just overlays whatever PNG/box it's given.
      return { blob, xPct: 0, yPct: 0, widthPct: 100, heightPct: 100 };
    }

    // Cover mode: tight-cropped bounding box around the strokes, in the
    // SAME pixel space the strokes were recorded in (canvas.getBoundingClientRect()
    // space), then scaled to the backing-store devicePixelRatio space.
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const s of paintStrokes) {
      for (const [x, y] of s.points) {
        minX = Math.min(minX, x - s.size); maxX = Math.max(maxX, x + s.size);
        minY = Math.min(minY, y - s.size); maxY = Math.max(maxY, y + s.size);
      }
    }
    minX = Math.max(0, minX); minY = Math.max(0, minY);
    maxX = Math.min(rect.width, maxX); maxY = Math.min(rect.height, maxY);
    const boxW = Math.max(1, Math.round((maxX - minX) * dpr));
    const boxH = Math.max(1, Math.round((maxY - minY) * dpr));

    const out = document.createElement("canvas");
    out.width = boxW; out.height = boxH;
    const ctx = out.getContext("2d");

    for (const s of paintStrokes) renderStroke(ctx, s, dpr, minX, minY);

    const blob = await new Promise(resolve => out.toBlob(resolve, "image/png"));
    return { blob, xPct: (minX / rect.width) * 100, yPct: (minY / rect.height) * 100,
             widthPct: ((maxX - minX) / rect.width) * 100, heightPct: ((maxY - minY) / rect.height) * 100 };
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

      const clip = getActiveClip();
      if (!clip) throw new Error("No A-roll clip found at the current playhead");

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

  function handleRemoveMask() {
    const clip = getActiveClip();
    if (!clip?.paintMaskUrl) return;
    dispatch({
      type: "UPDATE_CLIP",
      clipId: clip.id,
      changes: {
        paintMaskUrl: null,
        paintMaskMode: null,
        paintMaskXPct: null,
        paintMaskYPct: null,
        paintMaskWidthPct: null,
        paintMaskHeightPct: null,
      },
    });
    // No stale drawing should linger once the saved mask it would have
    // produced is gone.
    setPaintStrokes([]);
  }

  return (
    <div style={{ padding: 12 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", marginBottom: 12, textTransform: "uppercase", letterSpacing: "1.5px" }}>
        Paint
      </div>
      <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
        <button onClick={() => setPaintMode("cover")} style={{ flex: 1, padding: "6px 8px", borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: "pointer", background: paintMode === "cover" ? "var(--chip-bg-strong)" : "var(--chip-bg)", border: paintMode === "cover" ? "1px solid var(--onyx-cyan)" : "0.5px solid var(--onyx-hairline-strong)", color: "var(--onyx-text)" }}>Cover</button>
        <button onClick={() => {
          setPaintMode("cutout");
          // Cutout's default hidden-area color is black, not cover mode's
          // red -- only swap it if the user hasn't already customized it
          // for a mode switch or drawn anything yet.
          if (paintColor === DEFAULT_COVER_COLOR && !paintStrokes.length) setPaintColor(DEFAULT_CUTOUT_COLOR);
        }} style={{ flex: 1, padding: "6px 8px", borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: "pointer", background: paintMode === "cutout" ? "var(--chip-bg-strong)" : "var(--chip-bg)", border: paintMode === "cutout" ? "1px solid var(--onyx-cyan)" : "0.5px solid var(--onyx-hairline-strong)", color: "var(--onyx-text)" }}>Mask (cutout)</button>
      </div>
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 11, color: "#64748b", marginBottom: 4 }}>Brush type</div>
        <div style={{ display: "flex", gap: 6 }}>
          {[["hard", "Hard"], ["soft", "Soft"], ["square", "Square"]].map(([id, label]) => (
            <button key={id} onClick={() => setPaintBrushType(id)} style={{ flex: 1, padding: "6px 4px", borderRadius: 4, fontSize: 11, fontWeight: 700, cursor: "pointer", background: paintBrushType === id ? "var(--chip-bg-strong)" : "var(--chip-bg)", border: paintBrushType === id ? "1px solid var(--onyx-cyan)" : "0.5px solid var(--onyx-hairline-strong)", color: "var(--onyx-text)" }}>{label}</button>
          ))}
        </div>
      </div>
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 11, color: "#64748b", marginBottom: 4 }}>Brush size — {paintBrushSize}px</div>
        <input type="range" min={4} max={80} step={2} value={paintBrushSize} onChange={e => setPaintBrushSize(Number(e.target.value))} style={{ width: "100%", accentColor: "var(--onyx-cyan)" }}/>
      </div>
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 11, color: "#64748b", marginBottom: 4 }}>Opacity — {Math.round(paintOpacity * 100)}%</div>
        <input type="range" min={0.1} max={1} step={0.05} value={paintOpacity} onChange={e => setPaintOpacity(Number(e.target.value))} disabled={paintErasing} style={{ width: "100%", accentColor: "var(--onyx-cyan)", opacity: paintErasing ? 0.4 : 1 }}/>
      </div>
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 11, color: "#64748b", marginBottom: 4 }}>{paintMode === "cutout" ? "Hidden-area color" : "Fill color"}</div>
        <input type="color" value={paintColor} onChange={e => setPaintColor(e.target.value)} disabled={paintErasing} style={{ width: 48, height: 28, borderRadius: 4, border: "1px solid #2b3442", background: "none", cursor: paintErasing ? "not-allowed" : "pointer", padding: 2, opacity: paintErasing ? 0.4 : 1 }}/>
      </div>
      <button onClick={() => setPaintErasing(p => !p)} style={{ width: "100%", padding: "7px 0", borderRadius: 4, fontSize: 11, fontWeight: 700, marginBottom: 10, cursor: "pointer", background: paintErasing ? "var(--chip-bg-strong)" : "var(--chip-bg)", border: paintErasing ? "1px solid var(--onyx-cyan)" : "0.5px solid var(--onyx-hairline-strong)", color: paintErasing ? "var(--onyx-cyan)" : "var(--onyx-text)" }}>
        {paintErasing ? "✓ Eraser active" : "Eraser"}
      </button>
      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <button onClick={undo} disabled={!paintStrokes.length} style={{ flex: 1, padding: "7px 0", borderRadius: 4, fontSize: 11, fontWeight: 700, background: "var(--chip-bg)", border: "0.5px solid var(--onyx-hairline-strong)", color: "var(--onyx-text)", cursor: paintStrokes.length ? "pointer" : "not-allowed", opacity: paintStrokes.length ? 1 : 0.4 }}>Undo</button>
        <button onClick={clearAll} disabled={!paintStrokes.length} style={{ flex: 1, padding: "7px 0", borderRadius: 4, fontSize: 11, fontWeight: 700, background: "var(--chip-bg)", border: "0.5px solid var(--onyx-hairline-strong)", color: "var(--onyx-text)", cursor: paintStrokes.length ? "pointer" : "not-allowed", opacity: paintStrokes.length ? 1 : 0.4 }}>Clear</button>
      </div>
      <button onClick={handleSave} disabled={saving || !paintStrokes.length} style={{ width: "100%", padding: "9px 0", borderRadius: 6, fontSize: 12, fontWeight: 700, background: "var(--btn-primary-grad)", border: "none", color: "var(--btn-primary-text)", cursor: (saving || !paintStrokes.length) ? "not-allowed" : "pointer", opacity: (saving || !paintStrokes.length) ? 0.5 : 1 }}>
        {saving ? "Saving…" : "Save"}
      </button>
      {activeClip?.paintMaskUrl && (
        <button onClick={handleRemoveMask} style={{ width: "100%", padding: "9px 0", borderRadius: 6, fontSize: 12, fontWeight: 700, marginTop: 8, background: "var(--chip-bg)", border: "0.5px solid var(--onyx-hairline-strong)", color: "#f87171", cursor: "pointer" }}>
          Remove mask
        </button>
      )}
    </div>
  );
}
