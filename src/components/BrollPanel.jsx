import React from "react";

const btn = { padding: "6px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer", border: "0.5px solid var(--onyx-hairline-strong)", background: "var(--chip-bg)", color: "var(--onyx-text-dim)" };
const label = { fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "1.2px", marginBottom: 4 };

function activeBtn(active) {
  return {
    ...btn,
    background: active ? "rgba(77,208,255,0.12)" : "var(--chip-bg)",
    border: active ? "1px solid rgba(77,208,255,0.4)" : "1px solid #2b3442",
    color: active ? "#4dd0ff" : "var(--onyx-text-dim)",
  };
}

// B-roll Stage 3: UI for the position/size (Stage 1) and enter/exit
// animation (Stage 2) fields that were, until now, only settable via
// direct canvas drag (position/size) or raw API calls (animation). This
// panel only WRITES fields when the user actually interacts with a
// control — an untouched clip keeps its fields undefined (full-frame,
// no animation), same safety guarantee as Stages 1 and 2.
export default function BrollPanel({ dispatch, selectedClip }) {
  function update(changes) {
    if (!dispatch || !selectedClip) return;
    dispatch({ type: "UPDATE_CLIP", clipId: selectedClip.id, changes });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflowY: "auto" }}>
      <div style={{ padding: "12px 12px 8px", borderBottom: "0.5px solid var(--onyx-hairline)" }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "1.5px" }}>B-Roll</div>
      </div>

      {selectedClip ? (
        <div style={{ padding: "14px 14px", display: "flex", flexDirection: "column", gap: 14 }}>

          <div style={{ fontSize: 11, color: "var(--onyx-text-faint)", lineHeight: 1.5 }}>
            Drag the B-roll box directly in the preview canvas, or use the
            sliders below. Leave a slider untouched and this clip keeps
            rendering full-frame, exactly as before.
          </div>

          {/* Position X */}
          <div>
            <div style={{ ...label, marginBottom: 6 }}>
              Position X <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0, color: "#64748b" }}>({Math.round(selectedClip.xPct ?? 50)}%)</span>
            </div>
            <input
              type="range"
              min={0} max={100} step={1}
              value={selectedClip.xPct ?? 50}
              onChange={e => update({ xPct: parseFloat(e.target.value), yPct: selectedClip.yPct ?? 50, sizePct: selectedClip.sizePct ?? 100 })}
              style={{ width: "100%", accentColor: "var(--onyx-cyan)" }}
            />
          </div>

          {/* Position Y */}
          <div>
            <div style={{ ...label, marginBottom: 6 }}>
              Position Y <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0, color: "#64748b" }}>({Math.round(selectedClip.yPct ?? 50)}%)</span>
            </div>
            <input
              type="range"
              min={0} max={100} step={1}
              value={selectedClip.yPct ?? 50}
              onChange={e => update({ xPct: selectedClip.xPct ?? 50, yPct: parseFloat(e.target.value), sizePct: selectedClip.sizePct ?? 100 })}
              style={{ width: "100%", accentColor: "var(--onyx-cyan)" }}
            />
          </div>

          {/* Size */}
          <div>
            <div style={{ ...label, marginBottom: 6 }}>
              Size <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0, color: "#64748b" }}>({Math.round(selectedClip.sizePct ?? 100)}%)</span>
            </div>
            <input
              type="range"
              min={10} max={100} step={1}
              value={selectedClip.sizePct ?? 100}
              onChange={e => update({ xPct: selectedClip.xPct ?? 50, yPct: selectedClip.yPct ?? 50, sizePct: parseFloat(e.target.value) })}
              style={{ width: "100%", accentColor: "var(--onyx-cyan)" }}
            />
          </div>

          {(selectedClip.xPct == null) && (
            <div style={{ fontSize: 11, color: "#f59e0b", background: "rgba(245,158,11,0.08)", border: "0.5px solid rgba(245,158,11,0.25)", borderRadius: 6, padding: "8px 10px" }}>
              Not yet resized — this clip is currently full-frame. Move any
              slider above (or drag it in the preview) to switch it to a
              positioned box.
            </div>
          )}

          <div style={{ borderTop: "0.5px solid var(--onyx-hairline)", paddingTop: 12, display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "1.2px" }}>Animation</div>
            <div style={{ fontSize: 11, color: "var(--onyx-text-faint)", lineHeight: 1.5 }}>
              Only takes effect once this clip has been resized/positioned
              above (or via canvas drag) — animation needs a resting
              position to animate toward.
            </div>

            {/* Enter animation */}
            <div>
              <div style={label}>Enter</div>
              <select
                value={selectedClip.enterAnim || "none"}
                onChange={e => update({ enterAnim: e.target.value === "none" ? undefined : e.target.value })}
                style={{ width: "100%", background: "var(--input-bg)", border: "0.5px solid var(--onyx-hairline-strong)", borderRadius: 7, padding: "7px 10px", color: "var(--onyx-text)", fontSize: 12, outline: "none", cursor: "pointer" }}
              >
                <option value="none">None</option>
                <option value="slide">Slide in</option>
                <option value="fade">Fade in</option>
              </select>
            </div>

            {/* Exit animation */}
            <div>
              <div style={label}>Exit</div>
              <select
                value={selectedClip.exitAnim || "none"}
                onChange={e => update({ exitAnim: e.target.value === "none" ? undefined : e.target.value })}
                style={{ width: "100%", background: "var(--input-bg)", border: "0.5px solid var(--onyx-hairline-strong)", borderRadius: 7, padding: "7px 10px", color: "var(--onyx-text)", fontSize: 12, outline: "none", cursor: "pointer" }}
              >
                <option value="none">None</option>
                <option value="slide">Slide out</option>
                <option value="fade">Fade out</option>
              </select>
            </div>
          </div>

        </div>
      ) : (
        <div style={{ padding: "24px 16px", textAlign: "center", color: "var(--onyx-text-mute)", fontSize: 12 }}>
          Click a B-roll clip in the preview canvas (during its active time
          window) to edit its position, size, and animation here.
        </div>
      )}
    </div>
  );
}
