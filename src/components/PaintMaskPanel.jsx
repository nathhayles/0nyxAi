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
