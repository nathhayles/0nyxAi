import React from "react";
import { makeClip } from "../reducers/timelineReducer.js";
import { FONTS } from "../data/fonts.js";

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

export default function TextPanel({ dispatch, playhead, selectedClip, brand }) {
  function addText() {
    if (!dispatch) return;
    const clip = makeClip({
      trackKey:     "fx",
      type:         "fx",
      startTime:    playhead || 0,
      duration:     3,
      trimStart:    0,
      trimEnd:      3,
      elementType:  "text",
      content:      "Text here",
      xPct:         50,
      yPct:         50,
      sizePct:      8,
      color:        brand?.primary_color || "#ffffff",
      fontWeight:   "bold",
      font:         "sans-serif",
      textAlign:    "center",
      bgStyle:      "none",
      shadow:       false,
      outlineColor: "",
      animation:    "none",
      label:        "Text",
    });
    dispatch({ type: "ADD_CLIP", clip });
  }

  function update(changes) {
    if (!dispatch || !selectedClip) return;
    dispatch({ type: "UPDATE_CLIP", clipId: selectedClip.id, changes });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflowY: "auto" }}>
      <div style={{ padding: "12px 12px 8px", borderBottom: "0.5px solid var(--onyx-hairline)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "1.5px" }}>Text Overlays</div>
        <button onClick={addText} style={{ ...btn, background: "var(--btn-primary-grad)", border: "none", color: "var(--btn-primary-text)" }}>+ Add Text</button>
      </div>

      {selectedClip ? (
        <div style={{ padding: "14px 14px", display: "flex", flexDirection: "column", gap: 14 }}>

          {/* Content */}
          <div>
            <div style={label}>Content</div>
            <textarea
              value={selectedClip.content || ""}
              onChange={e => update({ content: e.target.value })}
              rows={3}
              style={{ width: "100%", resize: "none", boxSizing: "border-box", background: "var(--input-bg)", border: "0.5px solid var(--onyx-hairline-strong)", borderRadius: 7, padding: "8px 10px", color: "var(--onyx-text)", fontSize: 12, lineHeight: 1.5, fontFamily: "inherit", outline: "none" }}
            />
          </div>

          {/* Font family */}
          <div>
            <div style={label}>Font</div>
            <select
              value={selectedClip.font || "sans-serif"}
              onChange={e => update({ font: e.target.value })}
              style={{ width: "100%", background: "var(--input-bg)", border: "0.5px solid var(--onyx-hairline-strong)", borderRadius: 7, padding: "7px 10px", color: "var(--onyx-text)", fontSize: 12, outline: "none", cursor: "pointer" }}
            >
              {FONTS.map(f => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
          </div>

          {/* Color + Outline colour */}
          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={label}>Color</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input
                  type="color"
                  value={selectedClip.color || "#ffffff"}
                  onChange={e => update({ color: e.target.value })}
                  style={{ width: 32, height: 26, border: "none", background: "none", cursor: "pointer", padding: 0 }}
                />
                <span style={{ fontSize: 11, fontFamily: "monospace", color: "#94a3b8" }}>{selectedClip.color || "#ffffff"}</span>
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={label}>Outline</div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <input
                  type="color"
                  value={selectedClip.outlineColor || "#000000"}
                  onChange={e => update({ outlineColor: e.target.value })}
                  style={{ width: 32, height: 26, border: "none", background: "none", cursor: "pointer", padding: 0 }}
                />
                <button
                  onClick={() => update({ outlineColor: selectedClip.outlineColor ? "" : "#000000" })}
                  style={{ ...activeBtn(!!selectedClip.outlineColor), fontSize: 10, padding: "4px 8px" }}
                >
                  {selectedClip.outlineColor ? "On" : "Off"}
                </button>
              </div>
            </div>
          </div>

          {/* Font size */}
          <div>
            <div style={{ ...label, marginBottom: 6 }}>
              Font Size <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0, color: "#64748b" }}>({Math.round(selectedClip.sizePct ?? 8)}%)</span>
            </div>
            <input
              type="range"
              min={2} max={40} step={0.5}
              value={selectedClip.sizePct ?? 8}
              onChange={e => update({ sizePct: parseFloat(e.target.value) })}
              style={{ width: "100%", accentColor: "var(--onyx-cyan)" }}
            />
          </div>

          {/* Font weight + Alignment */}
          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={label}>Weight</div>
              <div style={{ display: "flex", gap: 6 }}>
                {["bold", "normal"].map(w => {
                  const active = (selectedClip.fontWeight || "bold") === w;
                  return (
                    <button key={w} onClick={() => update({ fontWeight: w })} style={{ ...activeBtn(active), flex: 1, fontWeight: w, textTransform: "capitalize" }}>
                      {w}
                    </button>
                  );
                })}
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={label}>Align</div>
              <div style={{ display: "flex", gap: 6 }}>
                {[{ value: "left", icon: "Left" }, { value: "center", icon: "Ctr" }, { value: "right", icon: "Right" }].map(({ value, icon }) => {
                  const active = (selectedClip.textAlign || "center") === value;
                  return (
                    <button key={value} onClick={() => update({ textAlign: value })} style={{ ...activeBtn(active), flex: 1, padding: "6px 4px" }}>
                      {icon}
                    </button>
                  );
                })}
              </div>
            </div>
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
              onChange={e => update({ xPct: parseFloat(e.target.value) })}
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
              onChange={e => update({ yPct: parseFloat(e.target.value) })}
              style={{ width: "100%", accentColor: "var(--onyx-cyan)" }}
            />
          </div>

          {/* Background */}
          <div>
            <div style={label}>Background</div>
            <div style={{ display: "flex", gap: 6 }}>
              {[{ value: "none", label: "None" }, { value: "dark", label: "Dark" }, { value: "light", label: "Light" }].map(opt => {
                const active = (selectedClip.bgStyle || "none") === opt.value;
                return (
                  <button key={opt.value} onClick={() => update({ bgStyle: opt.value })} style={{ ...activeBtn(active), flex: 1 }}>
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Shadow */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ ...label, marginBottom: 0 }}>Text Shadow</div>
            <button
              onClick={() => update({ shadow: !selectedClip.shadow })}
              style={{ ...activeBtn(!!selectedClip.shadow), padding: "5px 16px" }}
            >
              {selectedClip.shadow ? "On" : "Off"}
            </button>
          </div>

          {/* Animation */}
          <div>
            <div style={label}>Animation</div>
            <select
              value={selectedClip.animation || "none"}
              onChange={e => update({ animation: e.target.value })}
              style={{ width: "100%", background: "var(--input-bg)", border: "0.5px solid var(--onyx-hairline-strong)", borderRadius: 7, padding: "7px 10px", color: "var(--onyx-text)", fontSize: 12, outline: "none", cursor: "pointer" }}
            >
              <option value="none">None</option>
              <option value="fade-in">Fade In</option>
              <option value="fade-out">Fade Out</option>
              <option value="fade-in-out">Fade In + Out</option>
              <option value="scroll-down">Scroll Down</option>
              <option value="scroll-up">Scroll Up</option>
              <option value="scroll-left">Scroll Left (→)</option>
              <option value="scroll-right">Scroll Right (←)</option>
              <option value="zoom-in">Zoom In</option>
              <option value="zoom-out">Zoom Out</option>
              <option value="typewriter">Typewriter</option>
            </select>
          </div>

        </div>
      ) : (
        <div style={{ padding: "24px 16px", textAlign: "center", color: "var(--onyx-text-mute)", fontSize: 12 }}>
          Click <strong style={{ color: "#a78bfa" }}>+ Add Text</strong> to place a text overlay on the FX track at the current playhead.<br /><br />
          Click a text clip on the preview to edit it here.
        </div>
      )}
    </div>
  );
}
