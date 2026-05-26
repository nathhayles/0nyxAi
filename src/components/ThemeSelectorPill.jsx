import { useState } from "react";
import ThemeSelector from "./ThemeSelector.jsx";

export default function ThemeSelectorPill({ selectedTheme, onSelect }) {
  const [open, setOpen] = useState(false);

  function handleSelect(theme) {
    onSelect(theme);
    if (theme) setOpen(false);
  }

  function handleClear(e) {
    e.stopPropagation();
    onSelect(null);
  }

  return (
    <>
      {/* Pill trigger */}
      <div style={{ marginTop: 16, marginBottom: 4 }}>
        <button
          onClick={() => setOpen(true)}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 7,
            padding: "6px 14px",
            borderRadius: 20,
            border: selectedTheme
              ? `1px solid ${selectedTheme.accentColor}88`
              : "1px solid rgba(255,255,255,0.15)",
            background: selectedTheme
              ? `linear-gradient(135deg, ${selectedTheme.previewColor}22, ${selectedTheme.accentColor}18)`
              : "rgba(255,255,255,0.06)",
            color: "#fff",
            cursor: "pointer",
            fontSize: 13,
            fontWeight: 500,
            transition: "all 0.15s",
          }}
        >
          {selectedTheme ? (
            <>
              <span>{selectedTheme.emoji}</span>
              <span style={{ color: selectedTheme.accentColor }}>{selectedTheme.name}</span>
              <span
                onClick={handleClear}
                title="Clear theme"
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
              <span>🎨</span>
              <span style={{ color: "rgba(255,255,255,0.6)" }}>Add Theme</span>
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
              maxWidth: 560,
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
            <ThemeSelector
              selectedThemeId={selectedTheme?.id || null}
              onSelect={handleSelect}
            />
          </div>
        </div>
      )}
    </>
  );
}
