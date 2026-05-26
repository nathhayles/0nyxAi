import React, { useState } from "react";

const FONTS = [
  "sans-serif","serif","monospace","Arial","Arial Black","Arial Narrow",
  "Georgia","Garamond","Palatino","Times New Roman","Trebuchet MS","Verdana",
  "Tahoma","Geneva","Lucida Sans","Lucida Console","Courier New","Impact",
  "Comic Sans MS","Helvetica","Futura","Gill Sans","Century Gothic","Calibri",
  "Candara","Constantia","Corbel","Franklin Gothic Medium","Segoe UI",
  "Inter","Poppins","Montserrat","Raleway","Oswald","Lato","Roboto",
  "Open Sans","Nunito","Ubuntu","Merriweather","Playfair Display","Libre Baskerville",
  "Source Sans Pro","PT Sans","PT Serif","Fira Sans","Noto Sans","Dosis","Exo 2",
];

const ALIGNS = ["left","center","right"];
const POSITIONS = ["top-left","top-center","top-right","middle-left","middle-center","middle-right","bottom-left","bottom-center","bottom-right"];

const inp = {
  width: "100%", background: "#0f141b", border: "1px solid #2b3442",
  color: "#e2e8f0", borderRadius: 6, padding: "7px 10px", fontSize: 12,
  boxSizing: "border-box", outline: "none",
};
const lbl = { fontSize: 10, color: "#94a3b8", display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.8px" };
const btn = { padding: "6px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer", border: "1px solid #2b3442", background: "#1f2937", color: "#94a3b8" };

function makeTextBox() {
  return {
    id: Date.now() + Math.random(),
    text: "Add your text here",
    font: "sans-serif",
    fontSize: 24,
    color: "#ffffff",
    bgColor: "transparent",
    bold: false,
    italic: false,
    align: "center",
    position: "middle-center",
    opacity: 100,
  };
}

export default function TextPanel({ scenes, setScenes, activeScene }) {
  const [fontSearch, setFontSearch] = useState("");
  const [showFontPicker, setShowFontPicker] = useState(null); // textbox id

  function updateScene(updater) {
    setScenes(prev => prev.map(s => s.id === resolvedScene ? { ...s, ...updater(s) } : s));
  }

  function addTextBox() {
    updateScene(s => ({ text_boxes: [...(s.text_boxes || []), makeTextBox()] }));
  }

  function updateTextBox(id, changes) {
    updateScene(s => ({
      text_boxes: (s.text_boxes || []).map(tb => tb.id === id ? { ...tb, ...changes } : tb),
    }));
  }

  function removeTextBox(id) {
    updateScene(s => ({ text_boxes: (s.text_boxes || []).filter(tb => tb.id !== id) }));
  }

  function duplicateTextBox(id) {
    updateScene(s => {
      const tb = (s.text_boxes || []).find(t => t.id === id);
      if (!tb) return {};
      return { text_boxes: [...(s.text_boxes || []), { ...tb, id: Date.now() + Math.random() }] };
    });
  }

  const filteredFonts = FONTS.filter(f => f.toLowerCase().includes(fontSearch.toLowerCase()));

  const resolvedScene = (activeScene !== null && activeScene !== undefined) ? activeScene : (scenes?.[0]?.id ?? 0);
  const scene = scenes?.find(s => s.id === resolvedScene);
  const textBoxes = scene?.text_boxes || [];

  if (!scene) return (
    <div style={{ padding: 16, color: "#475569", fontSize: 12, textAlign: "center" }}>No scenes found. Add a scene first.</div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflowY: "auto" }}>
      <div style={{ padding: "12px 12px 8px", borderBottom: "1px solid #1f2937", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "1.5px" }}>Text Overlays</div>
        <button onClick={addTextBox} style={{ ...btn, background: "#1d4ed8", border: "1px solid #1e40af", color: "#fff", fontSize: 11 }}>+ Add Text</button>
      </div>

      {textBoxes.length === 0 && (
        <div style={{ padding: "24px 16px", textAlign: "center", color: "#475569", fontSize: 12 }}>
          No text overlays on this scene.<br />
          <button onClick={addTextBox} style={{ ...btn, marginTop: 10, color: "#a78bfa", borderColor: "#7c3aed" }}>+ Add Text Box</button>
        </div>
      )}

      <div style={{ flex: 1, overflowY: "auto", padding: "8px 10px", display: "flex", flexDirection: "column", gap: 10 }}>
        {textBoxes.map((tb, idx) => (
          <div key={tb.id} style={{ background: "#0c1016", border: "1px solid #1f2937", borderRadius: 8, padding: 10 }}>

            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b" }}>Text {idx + 1}</div>
              <div style={{ display: "flex", gap: 4 }}>
                <button onClick={() => duplicateTextBox(tb.id)} style={{ ...btn, fontSize: 10, padding: "3px 8px" }}>⧉</button>
                <button onClick={() => removeTextBox(tb.id)} style={{ ...btn, fontSize: 10, padding: "3px 8px", color: "#f87171", borderColor: "rgba(239,68,68,0.3)" }}>✕</button>
              </div>
            </div>

            {/* Text content */}
            <div style={{ marginBottom: 8 }}>
              <label style={lbl}>Text</label>
              <textarea value={tb.text} onChange={e => updateTextBox(tb.id, { text: e.target.value })}
                style={{ ...inp, minHeight: 60, resize: "vertical", fontFamily: tb.font, fontSize: tb.fontSize }} />
            </div>

            {/* Font picker */}
            <div style={{ marginBottom: 8 }}>
              <label style={lbl}>Font</label>
              <div onClick={() => setShowFontPicker(showFontPicker === tb.id ? null : tb.id)}
                style={{ ...inp, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", fontFamily: tb.font }}>
                <span>{tb.font}</span>
                <span style={{ color: "#475569", fontSize: 10 }}>▾</span>
              </div>
              {showFontPicker === tb.id && (
                <div style={{ background: "#0f141b", border: "1px solid #2b3442", borderRadius: 6, marginTop: 4, maxHeight: 200, overflowY: "auto" }}>
                  <input value={fontSearch} onChange={e => setFontSearch(e.target.value)}
                    placeholder="Search fonts..." style={{ ...inp, borderRadius: "6px 6px 0 0", borderBottom: "1px solid #2b3442" }} autoFocus />
                  {filteredFonts.map(f => (
                    <div key={f} onClick={() => { updateTextBox(tb.id, { font: f }); setShowFontPicker(null); setFontSearch(""); }}
                      style={{ padding: "7px 10px", cursor: "pointer", fontFamily: f, fontSize: 13,
                        background: tb.font === f ? "rgba(124,58,237,0.15)" : "transparent",
                        color: tb.font === f ? "#a78bfa" : "#e2e8f0",
                        borderBottom: "1px solid #1f2937" }}>
                      {f}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Size + colour row */}
            <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
              <div style={{ flex: 1 }}>
                <label style={lbl}>Size</label>
                <input type="number" min={8} max={120} value={tb.fontSize}
                  onChange={e => updateTextBox(tb.id, { fontSize: Number(e.target.value) })}
                  style={{ ...inp }} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={lbl}>Text Color</label>
                <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                  <input type="color" value={tb.color}
                    onChange={e => updateTextBox(tb.id, { color: e.target.value })}
                    style={{ width: 32, height: 30, border: "none", borderRadius: 4, cursor: "pointer", background: "none" }} />
                  <input style={{ ...inp, flex: 1 }} value={tb.color}
                    onChange={e => updateTextBox(tb.id, { color: e.target.value })} />
                </div>
              </div>
            </div>

            {/* BG colour + opacity */}
            <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
              <div style={{ flex: 1 }}>
                <label style={lbl}>Background</label>
                <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                  <input type="color" value={tb.bgColor === "transparent" ? "#000000" : tb.bgColor}
                    onChange={e => updateTextBox(tb.id, { bgColor: e.target.value })}
                    style={{ width: 32, height: 30, border: "none", borderRadius: 4, cursor: "pointer", background: "none" }} />
                  <input style={{ ...inp, flex: 1 }} value={tb.bgColor}
                    onChange={e => updateTextBox(tb.id, { bgColor: e.target.value })}
                    placeholder="transparent" />
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <label style={lbl}>Opacity %</label>
                <input type="number" min={0} max={100} value={tb.opacity}
                  onChange={e => updateTextBox(tb.id, { opacity: Number(e.target.value) })}
                  style={{ ...inp }} />
              </div>
            </div>

            {/* Bold / Italic / Align */}
            <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
              <button onClick={() => updateTextBox(tb.id, { bold: !tb.bold })} style={{ ...btn, flex: 1, fontWeight: 800, background: tb.bold ? "rgba(124,58,237,0.2)" : "#1f2937", color: tb.bold ? "#a78bfa" : "#64748b", borderColor: tb.bold ? "#7c3aed" : "#2b3442" }}>B</button>
              <button onClick={() => updateTextBox(tb.id, { italic: !tb.italic })} style={{ ...btn, flex: 1, fontStyle: "italic", background: tb.italic ? "rgba(124,58,237,0.2)" : "#1f2937", color: tb.italic ? "#a78bfa" : "#64748b", borderColor: tb.italic ? "#7c3aed" : "#2b3442" }}>I</button>
              {ALIGNS.map(a => (
                <button key={a} onClick={() => updateTextBox(tb.id, { align: a })}
                  style={{ ...btn, flex: 1, background: tb.align === a ? "rgba(124,58,237,0.2)" : "#1f2937", color: tb.align === a ? "#a78bfa" : "#64748b", borderColor: tb.align === a ? "#7c3aed" : "#2b3442" }}>
                  {a === "left" ? "⬅" : a === "center" ? "↔" : "➡"}
                </button>
              ))}
            </div>

            {/* Position */}
            <div style={{ marginBottom: 6 }}>
              <label style={lbl}>Position on Scene</label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 4 }}>
                {POSITIONS.map(p => (
                  <button key={p} onClick={() => updateTextBox(tb.id, { position: p })}
                    style={{ ...btn, fontSize: 9, padding: "5px 4px", textAlign: "center",
                      background: tb.position === p ? "rgba(124,58,237,0.2)" : "#1f2937",
                      color: tb.position === p ? "#a78bfa" : "#475569",
                      borderColor: tb.position === p ? "#7c3aed" : "#2b3442" }}>
                    {p.replace("-", " ")}
                  </button>
                ))}
              </div>
            </div>

            {/* Live preview */}
            <div style={{ marginTop: 8, height: 50, background: "#111", borderRadius: 6, position: "relative", overflow: "hidden", border: "1px solid #1f2937" }}>
              <div style={{
                position: "absolute",
                top: tb.position?.startsWith("top") ? 4 : tb.position?.startsWith("middle") ? "50%" : "auto",
                bottom: tb.position?.startsWith("bottom") ? 4 : "auto",
                left: tb.position?.endsWith("left") ? 4 : tb.position?.endsWith("center") ? "50%" : "auto",
                right: tb.position?.endsWith("right") ? 4 : "auto",
                transform: tb.position?.includes("center") ? "translate(-50%, -50%)" : tb.position?.includes("middle") ? "translateY(-50%)" : "none",
                fontFamily: tb.font,
                fontSize: Math.min(tb.fontSize, 16),
                color: tb.color,
                background: tb.bgColor,
                fontWeight: tb.bold ? 700 : 400,
                fontStyle: tb.italic ? "italic" : "normal",
                textAlign: tb.align,
                opacity: tb.opacity / 100,
                padding: "1px 4px",
                borderRadius: 2,
                whiteSpace: "nowrap",
                maxWidth: "90%",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}>
                {tb.text}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
