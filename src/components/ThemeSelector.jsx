import { useState } from "react";
import { THEMES } from "../data/themes";

// Grouped by category
const CATEGORIES = ["All", "Occasions", "Seasonal", "Aesthetic"];

export default function ThemeSelector({ selectedThemeId, onSelect, accent = "#b44fff" }) {
  const [activeCategory, setActiveCategory] = useState("All");
  const [hoveredId, setHoveredId] = useState(null);

  const filtered =
    activeCategory === "All" ? THEMES : THEMES.filter(t => t.category === activeCategory);

  const hexToRgb = hex => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `${r},${g},${b}`;
  };

  return (
    <div style={{ marginTop: 16 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: "#fff" }}>🎨 Occasion Theme</span>
        {selectedThemeId && (
          <button
            onClick={() => onSelect(null)}
            style={{
              marginLeft: "auto",
              fontSize: 11,
              color: "rgba(255,255,255,0.4)",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "2px 6px",
              borderRadius: 4,
            }}
          >
            Clear
          </button>
        )}
      </div>

      {/* Category filter tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            style={{
              fontSize: 11,
              padding: "3px 10px",
              borderRadius: 20,
              border: "1px solid",
              borderColor: activeCategory === cat ? accent : "rgba(255,255,255,0.15)",
              background: activeCategory === cat ? `rgba(${hexToRgb(accent)},0.15)` : "transparent",
              color: activeCategory === cat ? accent : "rgba(255,255,255,0.5)",
              cursor: "pointer",
              transition: "all 0.15s",
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Theme grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
          gap: 8,
        }}
      >
        {filtered.map(theme => {
          const isSelected = selectedThemeId === theme.id;
          const isHovered = hoveredId === theme.id;

          return (
            <div
              key={theme.id}
              onClick={() => onSelect(isSelected ? null : theme)}
              onMouseEnter={() => setHoveredId(theme.id)}
              onMouseLeave={() => setHoveredId(null)}
              style={{
                borderRadius: 10,
                overflow: "hidden",
                cursor: "pointer",
                border: `2px solid ${isSelected ? theme.accentColor : isHovered ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.07)"}`,
                transform: isHovered || isSelected ? "scale(1.03)" : "scale(1)",
                transition: "all 0.15s ease",
                boxShadow: isSelected ? `0 0 12px ${theme.previewColor}55` : "none",
              }}
            >
              {/* Color preview swatch */}
              <div
                style={{
                  height: 70,
                  background: `linear-gradient(135deg, ${theme.previewColor}, ${theme.accentColor})`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 28,
                  position: "relative",
                }}
              >
                {theme.emoji}
                {isSelected && (
                  <div
                    style={{
                      position: "absolute",
                      top: 4,
                      right: 4,
                      width: 16,
                      height: 16,
                      borderRadius: "50%",
                      background: theme.accentColor,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 9,
                      color: "#000",
                      fontWeight: 900,
                    }}
                  >
                    ✓
                  </div>
                )}
              </div>

              {/* Label */}
              <div
                style={{
                  padding: "6px 6px 7px",
                  background: "rgba(255,255,255,0.04)",
                  borderTop: `1px solid ${isSelected ? theme.accentColor + "44" : "rgba(255,255,255,0.06)"}`,
                }}
              >
                <div style={{ fontSize: 11, fontWeight: 600, color: "#fff", textAlign: "center" }}>
                  {theme.name}
                </div>
                <div
                  style={{
                    fontSize: 9,
                    color: "rgba(255,255,255,0.4)",
                    textAlign: "center",
                    marginTop: 1,
                  }}
                >
                  {theme.particleType}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected theme detail */}
      {selectedThemeId && (() => {
        const t = THEMES.find(th => th.id === selectedThemeId);
        if (!t) return null;
        return (
          <div
            style={{
              marginTop: 10,
              padding: "8px 12px",
              borderRadius: 8,
              background: `rgba(${hexToRgb(t.previewColor)},0.1)`,
              border: `1px solid ${t.previewColor}44`,
              fontSize: 11,
              color: "rgba(255,255,255,0.7)",
            }}
          >
            <span style={{ color: t.accentColor, fontWeight: 700 }}>{t.emoji} {t.name}</span>
            {" — "}{t.description}
            <span style={{ color: "rgba(255,255,255,0.35)", marginLeft: 6 }}>
              · {t.particleType} · border · color wash
            </span>
          </div>
        );
      })()}
    </div>
  );
}
