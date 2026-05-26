import { useState } from "react";
import { TEMPLATES } from "../data/templates.js";

const CATEGORY_COLORS = {
  "Business":     "#0066cc",
  "Cinematic":    "#c9a227",
  "Social/TikTok":"#ff0050",
  "Documentary":  "#8b7355",
  "Luxury":       "#d4af37",
  "Minimal":      "#94a3b8",
  "Bold":         "#ff4400",
  "News":         "#1d4ed8",
  "Lifestyle":    "#e8956d",
  "Dark":         "#7c3aed",
};

function TemplateCard({ template, selected, onSelect }) {
  const [hovered, setHovered] = useState(false);
  const accent = template.accentColor;
  const catColor = CATEGORY_COLORS[template.category] || "#555";
  const active = selected || hovered;

  return (
    <button
      onClick={() => onSelect(selected ? null : template)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "stretch",
        width: "100%",
        background: selected
          ? `rgba(${hexToRgb(accent)},0.12)`
          : hovered
          ? "rgba(255,255,255,0.05)"
          : "#0c1016",
        border: `1.5px solid ${selected ? accent : hovered ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.08)"}`,
        borderRadius: 12,
        padding: 0,
        cursor: "pointer",
        overflow: "hidden",
        transition: "border-color 0.15s, background 0.15s",
        textAlign: "left",
      }}
    >
      {/* Colour swatch */}
      <div
        style={{
          height: 52,
          background: buildGradient(template),
          position: "relative",
          display: "flex",
          alignItems: "flex-end",
          padding: "6px 8px",
        }}
      >
        {/* aspect ratio badge */}
        <span style={{
          fontSize: 10,
          fontWeight: 700,
          color: "#fff",
          background: "rgba(0,0,0,0.55)",
          borderRadius: 4,
          padding: "2px 5px",
          letterSpacing: "0.04em",
        }}>
          {template.aspectRatio}
        </span>
        {/* selected tick */}
        {selected && (
          <span style={{
            position: "absolute",
            top: 6,
            right: 8,
            width: 18,
            height: 18,
            borderRadius: "50%",
            background: accent,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 11,
            color: "#fff",
            fontWeight: 900,
          }}>✓</span>
        )}
      </div>

      {/* Text content */}
      <div style={{ padding: "9px 10px 10px" }}>
        <div style={{
          fontSize: 12,
          fontWeight: 700,
          color: selected ? accent : "#e2e8f0",
          marginBottom: 4,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}>
          {template.name}
        </div>
        <span style={{
          display: "inline-block",
          fontSize: 10,
          fontWeight: 600,
          color: catColor,
          background: `rgba(${hexToRgb(catColor)},0.15)`,
          borderRadius: 4,
          padding: "2px 6px",
          letterSpacing: "0.03em",
        }}>
          {template.category}
        </span>
        {active && (
          <div style={{
            fontSize: 10,
            color: "#94a3b8",
            marginTop: 5,
            lineHeight: 1.35,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}>
            {template.description}
          </div>
        )}
      </div>
    </button>
  );
}

export default function TemplateSelector({ value, onChange }) {
  const selected = TEMPLATES.find(t => t.id === value) || null;

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <label style={{ fontWeight: 600, fontSize: 14 }}>
          Template
          {selected && (
            <span style={{
              marginLeft: 8,
              fontSize: 12,
              fontWeight: 500,
              color: selected.accentColor,
            }}>
              — {selected.name}
            </span>
          )}
        </label>
        {selected && (
          <button
            onClick={() => onChange(null)}
            style={{
              fontSize: 11,
              color: "#64748b",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "2px 6px",
            }}
          >
            Clear
          </button>
        )}
      </div>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
        gap: 10,
      }}>
        {TEMPLATES.map(t => (
          <TemplateCard
            key={t.id}
            template={t}
            selected={value === t.id}
            onSelect={(tpl) => onChange(tpl ? tpl.id : null)}
          />
        ))}
      </div>

      {selected && (
        <div style={{
          marginTop: 10,
          padding: "8px 12px",
          borderRadius: 8,
          background: `rgba(${hexToRgb(selected.accentColor)},0.08)`,
          border: `1px solid rgba(${hexToRgb(selected.accentColor)},0.2)`,
          fontSize: 11,
          color: "#94a3b8",
          display: "flex",
          gap: 16,
          flexWrap: "wrap",
        }}>
          <span>Transition: <b style={{ color: "#cbd5e1" }}>{selected.transitionStyle}</b></span>
          <span>Ratio: <b style={{ color: "#cbd5e1" }}>{selected.aspectRatio}</b></span>
          <span>Style: <b style={{ color: "#cbd5e1", fontStyle: "italic" }}>{selected.promptPrefix.slice(0, 48)}…</b></span>
        </div>
      )}
    </div>
  );
}

function buildGradient(template) {
  const accent = template.accentColor;
  const dark = shiftBrightness(accent, -40);
  return `linear-gradient(135deg, ${dark} 0%, ${accent} 100%)`;
}

function hexToRgb(hex) {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map(c => c + c).join("") : h, 16);
  return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
}

function shiftBrightness(hex, amount) {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map(c => c + c).join("") : h;
  const clamp = v => Math.min(255, Math.max(0, v));
  const r = clamp(parseInt(full.slice(0, 2), 16) + amount);
  const g = clamp(parseInt(full.slice(2, 4), 16) + amount);
  const b = clamp(parseInt(full.slice(4, 6), 16) + amount);
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}
