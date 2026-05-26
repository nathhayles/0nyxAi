import { useState } from "react";
import { TEMPLATES } from "../data/templates.js";
import TemplateSelector from "./TemplateSelector.jsx";

export default function TemplateSelectorPill({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const selected = TEMPLATES.find(t => t.id === value) || null;

  function handleChange(id) {
    onChange(id);
    if (id) setOpen(false);
  }

  function handleClear(e) {
    e.stopPropagation();
    onChange(null);
  }

  return (
    <>
      {/* Pill trigger */}
      <div style={{ marginBottom: 4 }}>
        <button
          onClick={() => setOpen(true)}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 7,
            padding: "6px 14px",
            borderRadius: 20,
            border: selected
              ? `1px solid ${selected.accentColor}88`
              : "1px solid rgba(255,255,255,0.15)",
            background: selected
              ? `rgba(${hexToRgb(selected.accentColor)},0.12)`
              : "rgba(255,255,255,0.06)",
            color: "#fff",
            cursor: "pointer",
            fontSize: 13,
            fontWeight: 500,
            transition: "all 0.15s",
          }}
        >
          {selected ? (
            <>
              <span>📋</span>
              <span style={{ color: selected.accentColor }}>{selected.name}</span>
              <span
                onClick={handleClear}
                title="Clear template"
                style={{
                  marginLeft: 2,
                  fontSize: 11,
                  color: "rgba(255,255,255,0.35)",
                  lineHeight: 1,
                }}
              >
                ✕
              </span>
            </>
          ) : (
            <>
              <span>📋</span>
              <span style={{ color: "rgba(255,255,255,0.6)" }}>Add Template</span>
            </>
          )}
        </button>
      </div>

      {/* Modal */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.7)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: "#0f1318",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 16,
              padding: 24,
              width: "100%",
              maxWidth: 640,
              maxHeight: "80vh",
              overflowY: "auto",
              position: "relative",
            }}
          >
            <button
              onClick={() => setOpen(false)}
              style={{
                position: "absolute",
                top: 14,
                right: 14,
                background: "rgba(255,255,255,0.08)",
                border: "none",
                borderRadius: "50%",
                width: 28,
                height: 28,
                color: "rgba(255,255,255,0.6)",
                cursor: "pointer",
                fontSize: 14,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              ✕
            </button>
            <TemplateSelector value={value} onChange={handleChange} />
          </div>
        </div>
      )}
    </>
  );
}

function hexToRgb(hex) {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map(c => c + c).join("") : h;
  const n = parseInt(full, 16);
  return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
}
