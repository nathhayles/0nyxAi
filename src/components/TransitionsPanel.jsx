import React from "react";
import { TRANSITION_CATALOG, normalizeTransition } from "../utils/transitions.js";

const ANIM_STYLES = `
@keyframes tp-fade      { 0%,100%{opacity:1} 50%{opacity:0} }
@keyframes tp-slide     { 0%{transform:translateX(0)} 50%{transform:translateX(-100%)} 51%{transform:translateX(100%)} 100%{transform:translateX(0)} }
@keyframes tp-wipe      { 0%{clip-path:inset(0 0 0 0)} 50%{clip-path:inset(0 0 0 100%)} 51%{clip-path:inset(0 100% 0 0)} 100%{clip-path:inset(0 0 0 0)} }
@keyframes tp-zoom      { 0%,100%{transform:scale(1)} 50%{transform:scale(1.5)} }
@keyframes tp-blur      { 0%,100%{filter:blur(0)} 50%{filter:blur(6px)} }
@keyframes tp-circle    { 0%,100%{clip-path:circle(75% at 50% 50%)} 50%{clip-path:circle(10% at 50% 50%)} }
@keyframes tp-fadeblack { 0%,100%{opacity:1;background:#000} 50%{opacity:0.2;background:#000} }
@keyframes tp-fadewhite { 0%,100%{opacity:1;background:#fff} 50%{opacity:0.2;background:#fff} }
`;

const ANIM_MAP = {
  fade: "tp-fade", slide: "tp-slide", wipe: "tp-wipe", zoom: "tp-zoom",
  blur: "tp-blur", circle: "tp-circle", fadeblack: "tp-fadeblack", fadewhite: "tp-fadewhite",
};

const DIRECTIONS = [
  { value: "left",  label: "←" },
  { value: "right", label: "→" },
  { value: "up",    label: "↑" },
  { value: "down",  label: "↓" },
];

function PreviewBox({ type, color }) {
  if (type === "cut") {
    return (
      <div style={{ width: "100%", height: 36, borderRadius: 5, background: color + "22", border: `1px solid ${color}44`, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", left: "50%", top: 4, bottom: 4, width: 2, background: color, transform: "translateX(-50%)", borderRadius: 1 }} />
      </div>
    );
  }
  const anim = ANIM_MAP[TRANSITION_CATALOG[type]?.previewAnim] || "tp-fade";
  return (
    <div style={{ width: "100%", height: 36, borderRadius: 5, background: color + "22", border: `1px solid ${color}44`, overflow: "hidden", position: "relative" }}>
      <div style={{
        position: "absolute", inset: 0,
        background: `linear-gradient(135deg, ${color}99, ${color}44)`,
        animationName: anim, animationDuration: "1.8s",
        animationIterationCount: "infinite", animationTimingFunction: "ease-in-out",
      }} />
    </div>
  );
}

const SWATCH_COLORS = {
  cut: "#64748b", fade: "#4dd0ff", dissolve: "#b48dff", slide: "#22c55e",
  wipe: "#ec4899", zoom: "#f97316", blur: "#06b6d4", circle: "#a855f7",
  fadeblack: "#334155", fadewhite: "#cbd5e1", pixelize: "#eab308", radial: "#f43f5e",
};

export default function TransitionsPanel({ scenes, selectedBoundarySceneId, onUpdateScene }) {
  const scene = scenes?.find(s => s.id === selectedBoundarySceneId);

  if (!scene) {
    return (
      <div style={{ padding: 12 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", marginBottom: 12, textTransform: "uppercase", letterSpacing: "1.5px" }}>
          Transitions
        </div>
        <div style={{ fontSize: 11, color: "#64748b", padding: "16px 0", textAlign: "center" }}>
          Click a transition marker between two scenes on the timeline to edit it here.
        </div>
      </div>
    );
  }

  const { type: currentType, direction: currentDirection } = normalizeTransition(scene.transitionToNext, scene.transitionDirection);
  const currentDuration = Math.min(Math.max(scene.transitionDuration ?? 0.5, 0.2), 2);
  const catalogEntries = Object.entries(TRANSITION_CATALOG);

  return (
    <div style={{ padding: 12 }}>
      <style>{ANIM_STYLES}</style>
      <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", marginBottom: 4, textTransform: "uppercase", letterSpacing: "1.5px" }}>
        Transitions
      </div>
      <div style={{ fontSize: 10, color: "#334155", marginBottom: 12 }}>
        {scene.narration?.slice(0, 24) || scene.action?.slice(0, 24) || "This scene"} → next
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 14 }}>
        {catalogEntries.map(([key, entry]) => (
          <div
            key={key}
            onClick={() => onUpdateScene(scene.id, { transitionToNext: key, transitionDirection: entry.directional ? (currentDirection || "left") : null })}
            title={entry.label}
            style={{
              padding: "8px 6px 6px", borderRadius: 8, cursor: "pointer",
              background: "var(--onyx-surface-2)",
              border: currentType === key ? `1px solid ${SWATCH_COLORS[key]}` : `1px solid ${SWATCH_COLORS[key]}33`,
              boxShadow: currentType === key ? `0 0 0 1px ${SWATCH_COLORS[key]}` : "none",
              display: "flex", flexDirection: "column", gap: 5, userSelect: "none",
            }}
          >
            <PreviewBox type={key} color={SWATCH_COLORS[key]} />
            <div style={{ fontSize: 10, fontWeight: 600, color: SWATCH_COLORS[key], textAlign: "center", letterSpacing: "0.02em" }}>
              {entry.label}
            </div>
          </div>
        ))}
      </div>

      {currentType !== "cut" && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, color: "#64748b", marginBottom: 4 }}>Duration — {currentDuration.toFixed(1)}s</div>
          <input
            type="range" min={0.2} max={2} step={0.1} value={currentDuration}
            onChange={e => onUpdateScene(scene.id, { transitionDuration: Number(e.target.value) })}
            style={{ width: "100%", accentColor: "var(--onyx-cyan)" }}
          />
        </div>
      )}

      {TRANSITION_CATALOG[currentType]?.directional && (
        <div>
          <div style={{ fontSize: 11, color: "#64748b", marginBottom: 4 }}>Direction</div>
          <div style={{ display: "flex", gap: 6 }}>
            {DIRECTIONS.map(d => (
              <button
                key={d.value}
                onClick={() => onUpdateScene(scene.id, { transitionDirection: d.value })}
                style={{
                  flex: 1, padding: "6px 4px", borderRadius: 4, fontSize: 14, fontWeight: 700, cursor: "pointer",
                  background: currentDirection === d.value ? "var(--chip-bg-strong)" : "var(--chip-bg)",
                  border: currentDirection === d.value ? "1px solid var(--onyx-cyan)" : "0.5px solid var(--onyx-hairline-strong)",
                  color: "var(--onyx-text)",
                }}
              >{d.label}</button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
