import React from "react";

window.__onyxDraggedTransition = null;

const TRANSITIONS = [
  { key: "cut",        label: "Cut",        color: "#64748b", preview: "instant" },
  { key: "fade",       label: "Fade",       color: "#4dd0ff", preview: "fade"    },
  { key: "dissolve",   label: "Dissolve",   color: "#b48dff", preview: "fade"    },
  { key: "slideLeft",  label: "Slide Left", color: "#22c55e", preview: "slideL"  },
  { key: "slideRight", label: "Slide Right",color: "#22c55e", preview: "slideR"  },
  { key: "zoomIn",     label: "Zoom In",    color: "#f97316", preview: "zoom"    },
  { key: "zoomOut",    label: "Zoom Out",   color: "#f97316", preview: "zoom"    },
  { key: "wipe",       label: "Wipe",       color: "#ec4899", preview: "wipe"    },
  { key: "blur",       label: "Blur",       color: "#06b6d4", preview: "fade"    },
  { key: "flash",      label: "Flash",      color: "#fbbf24", preview: "flash"   },
  { key: "spin",       label: "Spin",       color: "#a855f7", preview: "zoom"    },
  { key: "push",       label: "Push",       color: "#84cc16", preview: "slideL"  },
];

const ANIM_STYLES = `
@keyframes tp-fade   { 0%,100%{opacity:1} 50%{opacity:0} }
@keyframes tp-slideL { 0%{transform:translateX(0)} 50%{transform:translateX(-100%)} 51%{transform:translateX(100%)} 100%{transform:translateX(0)} }
@keyframes tp-slideR { 0%{transform:translateX(0)} 50%{transform:translateX(100%)} 51%{transform:translateX(-100%)} 100%{transform:translateX(0)} }
@keyframes tp-zoom   { 0%,100%{transform:scale(1)} 50%{transform:scale(1.5)} }
@keyframes tp-wipe   { 0%{clip-path:inset(0 0 0 0)} 50%{clip-path:inset(0 0 0 100%)} 51%{clip-path:inset(0 100% 0 0)} 100%{clip-path:inset(0 0 0 0)} }
@keyframes tp-flash  { 0%,100%{opacity:1} 45%,55%{opacity:0;background:#fff} }
`;

const ANIM_MAP = {
  fade:   "tp-fade",
  slideL: "tp-slideL",
  slideR: "tp-slideR",
  zoom:   "tp-zoom",
  wipe:   "tp-wipe",
  flash:  "tp-flash",
};

function PreviewBox({ type, color }) {
  const box = {
    width: "100%", height: 36, borderRadius: 5,
    background: color + "22",
    border: `1px solid ${color}44`,
    overflow: "hidden", position: "relative",
  };

  if (type === "instant") {
    return (
      <div style={box}>
        <div style={{ position: "absolute", left: "50%", top: 4, bottom: 4, width: 2, background: color, transform: "translateX(-50%)", borderRadius: 1 }} />
        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, right: "50%", background: color + "33" }} />
      </div>
    );
  }

  return (
    <div style={box}>
      <div style={{
        position: "absolute", inset: 0,
        background: `linear-gradient(135deg, ${color}99, ${color}44)`,
        animationName: ANIM_MAP[type] || "tp-fade",
        animationDuration: "1.8s",
        animationIterationCount: "infinite",
        animationTimingFunction: "ease-in-out",
      }} />
    </div>
  );
}

export default function TransitionsPanel() {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      <style>{ANIM_STYLES}</style>

      <div style={{ padding: "10px 10px 6px", flexShrink: 0, borderBottom: "0.5px solid var(--onyx-hairline)" }}>
        <div style={{ fontSize: 10, color: "var(--onyx-text-mute)", textTransform: "uppercase", letterSpacing: "1px", fontWeight: 700 }}>
          Transitions
        </div>
        <div style={{ fontSize: 10, color: "#334155", marginTop: 3 }}>
          Drag onto a timeline clip to apply
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "8px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
          {TRANSITIONS.map(t => (
            <div
              key={t.key}
              draggable
              onDragStart={e => {
                window.__onyxDraggedTransition = { type: t.key };
                e.dataTransfer.effectAllowed = 'copy';
              }}
              title={`Drag to apply: ${t.label}`}
              style={{
                padding: "8px 6px 6px",
                borderRadius: 8,
                cursor: "grab",
                background: "var(--onyx-surface-2)",
                border: `1px solid ${t.color}33`,
                display: "flex",
                flexDirection: "column",
                gap: 5,
                userSelect: "none",
              }}
            >
              <PreviewBox type={t.preview} color={t.color} />
              <div style={{ fontSize: 10, fontWeight: 600, color: t.color, textAlign: "center", letterSpacing: "0.02em" }}>
                {t.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
