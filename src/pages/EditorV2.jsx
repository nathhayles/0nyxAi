// EditorV2.jsx — Hybrid NLE Editor
// Preview-first + Classic NLE, Onyx design system, theme switcher, all 3 ratios

import React, {
  useReducer, useState, useEffect, useCallback, useRef, useMemo,
} from "react";
import { timelineReducer, makeInitialState } from "../reducers/timelineReducer.js";
import { supabase } from "../supabaseClient.js";
import { getAuthHeaders } from "../utils/auth.js";
import "../styles/editor.css";

import SequencerPanel   from "../components/SequencerPanel.jsx";
import StoryboardPanel  from "../components/StoryboardPanel.jsx";
import VisualsPanel     from "../components/VisualsPanel.jsx";
import StylesPanel      from "../components/StylesPanel.jsx";
import TextPanel        from "../components/TextPanel.jsx";
import ElementsPanel    from "../components/ElementsPanel.jsx";
import YouTubePublishModal from "../components/YouTubePublishModal.jsx";
import AudioPanel from "../components/AudioPanelBoundary.jsx";

// ── Error boundary ────────────────────────────────────────────────────────────
class Safe extends React.Component {
  constructor(p) { super(p); this.state = { err: null }; }
  static getDerivedStateFromError(e) { return { err: e }; }
  componentDidCatch(e, i) { console.error("[" + this.props.name + "]", e, i?.componentStack); }
  render() {
    if (this.state.err) return (
      <div style={{ padding: 16, color: "#f87171", fontSize: 11, fontFamily: "monospace" }}>
        <div style={{ fontWeight: 700, marginBottom: 4 }}>{"💥 " + this.props.name}</div>
        <div style={{ opacity: 0.7 }}>{this.state.err.message}</div>
      </div>
    );
    return this.props.children;
  }
}

function calcTotalDuration(state) {
  if (!state?.tracks) return 0;
  let max = 0;
  for (const t of state.tracks) {
    for (const c of (t.clips || [])) {
      const end = (c.startTime || 0) + ((c.trimEnd || 0) - (c.trimStart || 0));
      if (end > max) max = end;
    }
  }
  return max;
}

function fmtTime(s) {
  const t = Math.max(0, Number(s) || 0);
  const m = Math.floor(t / 60);
  const ss = String(Math.floor(t % 60)).padStart(2, "0");
  const ds = String(Math.floor((t % 1) * 10));
  return m + ":" + ss + "." + ds;
}

const RATIOS = {
  "9:16": { label: "9:16", css: "9/16",  icon: "▯" },
  "16:9": { label: "16:9", css: "16/9",  icon: "▭" },
  "1:1":  { label: "1:1",  css: "1/1",   icon: "□" },
};

const SIDEBAR_TABS = [
  { key: "storyboard", label: "Scenes",  icon: "🎬" },
  { key: "visuals",    label: "Media",   icon: "🖼"  },
  { key: "audio",      label: "Audio",   icon: "🎵"  },
  { key: "text",       label: "Text",    icon: "T"   },
  { key: "elements",   label: "FX",      icon: "✨"  },
  { key: "styles",     label: "Style",   icon: "🎨"  },
];

// ── Glyph (SVG icons) ─────────────────────────────────────────────────────────
function Glyph({ name, size, color, stroke }) {
  size = size || 16; color = color || "currentColor"; stroke = stroke || 1.6;
  const paths = {
    arrowL:  "M19 12H5M11 5l-7 7 7 7",
    arrowR:  "M5 12h14M13 5l7 7-7 7",
    reel:    "M3 5h12l3-3v20l-3-3H3z M7 9h4M7 13h6",
    share:   "M18 5a3 3 0 100-6 3 3 0 000 6zM6 12a3 3 0 100-6 3 3 0 000 6zM18 19a3 3 0 100-6 3 3 0 000 6zM8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98",
    sparkle: "M12 3l2.2 5.8L20 11l-5.8 2.2L12 19l-2.2-5.8L4 11l5.8-2.2L12 3z",
    sun:     "M12 3v1M12 20v1M4.22 4.22l.7.7M19.07 19.07l.71.71M3 12h1M20 12h1M4.22 19.78l.7-.7M19.07 4.93l.71-.71M12 7a5 5 0 100 10 5 5 0 000-10z",
    moon:    "M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z",
    download:"M12 17V4M7 12l5 5 5-5M4 17v3a1 1 0 001 1h14a1 1 0 001-1v-3",
    plus:    "M12 5v14M5 12h14",
    film:    "M3 3h18v18H3zM7 3v18M17 3v18M3 8h4M3 12h4M3 16h4M17 8h4M17 12h4M17 16h4",
    scissors:"M6 6a3 3 0 106 0 3 3 0 00-6 0M6 18a3 3 0 106 0 3 3 0 00-6 0M20 4L8.12 15.88M14.47 14.48L20 20M8.12 8.12L12 12",
    mic:     "M12 3a3 3 0 00-3 3v6a3 3 0 006 0V6a3 3 0 00-3-3zM5 11a7 7 0 0014 0M12 18v3",
    music:   "M9 18V6l11-2v12M6 18a3 3 0 100-6 3 3 0 000 6zM17 16a3 3 0 100-6 3 3 0 000 6z",
  };
  if (name === "play") return React.createElement("svg", { width: size, height: size, viewBox: "0 0 24 24", fill: color, stroke: "none" }, React.createElement("path", { d: "M7 5l12 7-12 7V5z" }));
  if (name === "pause") return React.createElement("svg", { width: size, height: size, viewBox: "0 0 24 24", fill: color, stroke: "none" }, React.createElement("rect", { x: 6, y: 5, width: 4, height: 14, rx: 1 }), React.createElement("rect", { x: 14, y: 5, width: 4, height: 14, rx: 1 }));
  return React.createElement("svg", { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: color, strokeWidth: stroke, strokeLinecap: "round", strokeLinejoin: "round" }, paths[name] ? React.createElement("path", { d: paths[name] }) : null);
}

// ── Diamond wordmark ──────────────────────────────────────────────────────────
function OnyxMark() {
  return React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 9 } },
    React.createElement("svg", { width: 18, height: 18, viewBox: "0 0 24 24", style: { filter: "drop-shadow(0 0 6px rgba(77,208,255,0.55))" } },
      React.createElement("defs", null,
        React.createElement("linearGradient", { id: "mkv2", x1: "0", y1: "0", x2: "1", y2: "1" },
          React.createElement("stop", { offset: "0%", stopColor: "#9eecff" }),
          React.createElement("stop", { offset: "55%", stopColor: "#4dd0ff" }),
          React.createElement("stop", { offset: "100%", stopColor: "#1d7da8" })
        )
      ),
      React.createElement("path", { d: "M12 2L22 12L12 22L2 12Z", fill: "url(#mkv2)" }),
      React.createElement("path", { d: "M12 2L22 12L12 22L2 12Z", fill: "none", stroke: "rgba(255,255,255,0.4)", strokeWidth: "0.5" }),
      React.createElement("path", { d: "M12 7L17 12L12 17L7 12Z", fill: "rgba(8,12,20,0.5)" })
    ),
    React.createElement("span", { style: { fontSize: 14, fontWeight: 600, letterSpacing: "0.32em", color: "var(--onyx-text, #f1f5fb)" } }, "ONYX")
  );
}

// ── Toolbar ───────────────────────────────────────────────────────────────────
function Toolbar({ title, onTitleChange, saved, theme, onThemeToggle, ratio, onRatioChange, onExport, isPlaying, onPlayPause, activeMode, setActiveMode }) {
  const [editing, setEditing] = useState(false);
  return (
    <div style={{
      height: 52, flexShrink: 0, display: "flex", alignItems: "center",
      padding: "0 14px", gap: 10,
      borderBottom: "0.5px solid var(--onyx-hairline-strong, rgba(255,255,255,0.14))",
      background: "var(--toolbar-bg, rgba(6,9,15,0.85))",
      backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)",
      position: "relative", zIndex: 100,
    }}>
      <button onClick={() => window.history.back()} style={{ background: "none", border: "none", color: "var(--onyx-text-dim,rgba(241,245,251,0.62))", cursor: "pointer", padding: 4, borderRadius: 6, display: "flex" }}>
        <Glyph name="arrowL" size={15}/>
      </button>
      <OnyxMark/>
      <div style={{ width: 0.5, height: 20, background: "var(--onyx-hairline-strong,rgba(255,255,255,0.14))" }}/>

      {/* Title */}
      <Glyph name="reel" size={13} color="var(--onyx-cyan,#4dd0ff)"/>
      {editing
        ? <input autoFocus value={title} onChange={e => onTitleChange(e.target.value)} onBlur={() => setEditing(false)} onKeyDown={e => e.key === "Enter" && setEditing(false)}
            style={{ background: "var(--input-bg,rgba(0,0,0,0.35))", border: "0.5px solid var(--onyx-cyan,#4dd0ff)", borderRadius: 5, padding: "3px 8px", fontSize: 13, fontWeight: 600, color: "var(--onyx-text,#f1f5fb)", fontFamily: "inherit", outline: "none", minWidth: 160 }}/>
        : <span onClick={() => setEditing(true)} style={{ fontSize: 13, fontWeight: 600, cursor: "text", color: "var(--onyx-text,#f1f5fb)" }}>{title}</span>
      }
      <span style={{ fontSize: 10.5, color: "var(--onyx-text-mute,rgba(241,245,251,0.28))" }}>{saved}</span>

      <div style={{ flex: 1 }}/>

      {/* Mode tabs */}
      <div style={{ display: "flex", gap: 1, padding: 3, background: "var(--chip-bg-low,rgba(255,255,255,0.04))", borderRadius: 8 }}>
        {["Edit","Color","Captions"].map(m => (
          <button key={m} onClick={() => setActiveMode(m)} style={{ padding: "4px 10px", fontSize: 11, borderRadius: 5, border: "none", cursor: "pointer", background: activeMode === m ? "var(--chip-bg-strong,rgba(255,255,255,0.08))" : "transparent", color: activeMode === m ? "var(--onyx-text,#f1f5fb)" : "var(--onyx-text-dim,rgba(241,245,251,0.62))", fontFamily: "inherit" }}>{m}</button>
        ))}
      </div>
      <div style={{ width: 0.5, height: 20, background: "var(--onyx-hairline-strong,rgba(255,255,255,0.14))" }}/>

      {/* Ratio */}
      <div style={{ display: "flex", gap: 1, padding: 3, background: "var(--chip-bg-low,rgba(255,255,255,0.04))", borderRadius: 8 }}>
        {Object.entries(RATIOS).map(([k, r]) => (
          <button key={k} onClick={() => onRatioChange(k)} style={{ padding: "4px 9px", fontSize: 11, borderRadius: 5, border: "none", cursor: "pointer", background: ratio === k ? "var(--chip-bg-strong,rgba(255,255,255,0.08))" : "transparent", color: ratio === k ? "var(--onyx-cyan,#4dd0ff)" : "var(--onyx-text-dim,rgba(241,245,251,0.62))", fontFamily: "inherit" }}>{r.icon} {r.label}</button>
        ))}
      </div>
      <div style={{ width: 0.5, height: 20, background: "var(--onyx-hairline-strong,rgba(255,255,255,0.14))" }}/>

      {/* Theme toggle */}
      <button onClick={onThemeToggle} style={{ background: "var(--chip-bg,rgba(255,255,255,0.06))", border: "0.5px solid var(--onyx-hairline-strong,rgba(255,255,255,0.14))", borderRadius: 8, padding: "5px 10px", cursor: "pointer", color: "var(--onyx-text-dim)", fontSize: 11, fontFamily: "inherit", display: "flex", alignItems: "center", gap: 5 }}>
        <Glyph name={theme === "onyx" ? "sun" : "moon"} size={12} color="var(--onyx-cyan,#4dd0ff)"/>
        {theme === "onyx" ? "Opal" : "Onyx"}
      </button>

      {/* Export */}
      <button onClick={onExport} style={{ background: "linear-gradient(180deg,#5edcff,#2db8ee)", border: "0.5px solid rgba(255,255,255,0.45)", borderRadius: 8, padding: "6px 14px", cursor: "pointer", color: "#06121b", fontWeight: 600, fontSize: 12.5, fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6, boxShadow: "0 1px 0 rgba(255,255,255,0.4) inset,0 4px 14px rgba(77,208,255,0.35)" }}>
        <Glyph name="download" size={13} color="#06121b"/> Export
      </button>
    </div>
  );
}

// ── Sidebar ───────────────────────────────────────────────────────────────────
function Sidebar({ open, activeTab, setActiveTab, children }) {
  return (
    <div style={{ width: open ? 264 : 48, flexShrink: 0, borderRight: "0.5px solid var(--onyx-hairline-strong,rgba(255,255,255,0.14))", background: "var(--panel-bg,rgba(6,9,15,0.5))", display: "flex", flexDirection: "column", transition: "width 0.2s ease", overflow: "hidden", position: "relative", zIndex: 10 }}>
      {/* Icon rail */}
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 48, display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 8, gap: 2, borderRight: open ? "0.5px solid var(--onyx-hairline,rgba(255,255,255,0.07))" : "none" }}>
        {SIDEBAR_TABS.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)} title={t.label}
            style={{ width: 36, height: 36, borderRadius: 8, border: "none", cursor: "pointer", background: activeTab === t.key ? "var(--chip-bg-strong,rgba(255,255,255,0.08))" : "transparent", color: activeTab === t.key ? "var(--onyx-cyan,#4dd0ff)" : "var(--onyx-text-faint,rgba(241,245,251,0.40))", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2, fontSize: 14 }}>
            {t.icon}
            <span style={{ fontSize: 7.5, letterSpacing: "0.04em", textTransform: "uppercase", color: "inherit" }}>{t.label}</span>
          </button>
        ))}
      </div>
      {open && <div style={{ marginLeft: 48, flex: 1, overflowY: "auto", overflowX: "hidden" }}>{children}</div>}
    </div>
  );
}

// ── Preview canvas ────────────────────────────────────────────────────────────
function PreviewCanvas({ scenes, activeScene, setActiveScene, isPlaying, playhead, totalSec, onSeek, onPlayPause, ratio }) {
  const videoRef = useRef(null);
  const activeIdx = scenes.findIndex(s => s.id === activeScene);
  const scene = scenes[activeIdx >= 0 ? activeIdx : 0] || null;
  const src = scene?.mediaUrl || scene?.url || "";
  const cssRatio = RATIOS[ratio]?.css || "9/16";
  const progress = totalSec > 0 ? (playhead / totalSec) * 100 : 0;

  useEffect(() => {
    if (!videoRef.current || !src) return;
    if (isPlaying) videoRef.current.play().catch(() => {});
    else videoRef.current.pause();
  }, [isPlaying, src]);

  return (
    <div style={{ flex: 1, minWidth: 0, position: "relative", background: "#010306", display: "flex", alignItems: "center", justifyContent: "center" }}>
      {/* Ambient glow */}
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "radial-gradient(ellipse 55% 55% at 50% 42%, rgba(77,208,255,0.05), transparent 70%)" }}/>

      {/* Preview frame */}
      <div style={{ aspectRatio: cssRatio, height: "calc(100% - 168px)", width: "auto", maxWidth: "calc(100% - 48px)", flexShrink: 0, position: "relative", borderRadius: 16, overflow: "hidden", boxShadow: "0 32px 80px rgba(0,0,0,0.75), 0 0 0 0.5px rgba(255,255,255,0.07)", background: "linear-gradient(135deg,#0d1f38,#1a3260,#0a1628,#040d1a)" }}>
        {src
          ? <video ref={videoRef} src={src} className="v2-preview-video" style={{ width: "100%", height: "100%", objectFit: "cover" }} playsInline/>
          : <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 }}>
              <div style={{ opacity: 0.15 }}><Glyph name="film" size={44} color="#4dd0ff"/></div>
              <span style={{ fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.18)", fontFamily: "monospace" }}>
                {scenes.length ? "Scene " + ((activeIdx >= 0 ? activeIdx : 0) + 1) + " of " + scenes.length : "No scenes yet"}
              </span>
            </div>
        }
        {scene?.narration && (
          <div style={{ position: "absolute", bottom: 52, left: 16, right: 16, textAlign: "center", fontWeight: 700, fontSize: ratio === "9:16" ? 20 : 16, color: "#fff", textShadow: "0 2px 12px rgba(0,0,0,0.8)", letterSpacing: "-0.01em", lineHeight: 1.3 }}>
            {scene.narration.split(" ").slice(0, 10).join(" ")}
          </div>
        )}
        {/* Scrub bar */}
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 3, background: "rgba(255,255,255,0.08)", cursor: "pointer" }}
          onClick={e => { const r = e.currentTarget.getBoundingClientRect(); onSeek(((e.clientX - r.left) / r.width) * totalSec); }}>
          <div style={{ height: "100%", width: progress + "%", background: "#4dd0ff", transition: "width 0.1s linear" }}/>
        </div>
      </div>

      {/* Scene strip */}
      {scenes.length > 0 && (
        <div style={{ position: "absolute", bottom: 84, left: 24, right: 24, display: "flex", gap: 6, height: 66, overflowX: "auto", alignItems: "stretch" }}
          className="no-scroll">
          {scenes.map((s, i) => {
            const dur = Number(s.duration) || 3;
            const active = s.id === activeScene;
            return (
              <div key={s.id} onClick={() => setActiveScene(s.id)}
                style={{ flex: dur + " 0 auto", minWidth: 44, maxWidth: 96, borderRadius: 8, overflow: "hidden", cursor: "pointer", border: active ? "1.5px solid #4dd0ff" : "0.5px solid rgba(255,255,255,0.12)", background: s.thumbnail ? "url(" + s.thumbnail + ") center/cover" : "linear-gradient(135deg,hsl(" + (200 + i * 22) + ",45%,22%),hsl(" + (215 - i * 8) + ",35%,10%))", position: "relative", boxShadow: active ? "0 0 0 2px rgba(77,208,255,0.3)" : "none" }}>
                <div style={{ position: "absolute", inset: 0, background: active ? "rgba(77,208,255,0.12)" : "rgba(0,0,0,0.25)" }}/>
                <div style={{ position: "absolute", bottom: 4, left: 5, fontSize: 9, fontFamily: "monospace", color: "rgba(255,255,255,0.9)", fontWeight: 600 }}>
                  {String(i + 1).padStart(2, "0")} · {dur}s
                </div>
              </div>
            );
          })}
          <div onClick={() => window.dispatchEvent(new CustomEvent("onyx-add-scene"))}
            style={{ width: 44, flexShrink: 0, borderRadius: 8, border: "1px dashed rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "rgba(255,255,255,0.3)" }}>
            <Glyph name="plus" size={18} color="rgba(255,255,255,0.3)"/>
          </div>
        </div>
      )}

      {/* Floating quick-tools dock */}
      <div style={{ position: "absolute", bottom: 22, left: "50%", transform: "translateX(-50%)", background: "var(--onyx-surface,rgba(20,26,38,0.85))", backdropFilter: "blur(28px) saturate(140%)", WebkitBackdropFilter: "blur(28px) saturate(140%)", border: "0.5px solid var(--onyx-hairline-strong,rgba(255,255,255,0.14))", boxShadow: "0 8px 32px rgba(0,0,0,0.5)", borderRadius: 14, padding: "4px 6px", display: "flex", alignItems: "center", gap: 2 }}>
        <button onClick={onPlayPause} style={{ width: 34, height: 34, borderRadius: 9, border: "none", cursor: "pointer", background: isPlaying ? "rgba(77,208,255,0.12)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Glyph name={isPlaying ? "pause" : "play"} size={16} color="#4dd0ff"/>
        </button>
        <span style={{ fontSize: 11, fontFamily: "monospace", color: "rgba(241,245,251,0.6)", padding: "0 8px", minWidth: 88, textAlign: "center" }}>
          {fmtTime(playhead)} / {fmtTime(totalSec)}
        </span>
        <div style={{ width: 0.5, height: 20, background: "rgba(255,255,255,0.1)" }}/>
        {[
          { icon: "scissors", label: "Split", color: "rgba(241,245,251,0.55)" },
          { icon: "mic",      label: "VO",    color: "rgba(241,245,251,0.55)" },
          { icon: "music",    label: "Music", color: "#b48dff" },
          { icon: "sparkle",  label: "AI",    color: "#ffb547" },
        ].map(t => (
          <button key={t.label} style={{ height: 34, padding: "0 9px", borderRadius: 9, border: "none", cursor: "pointer", background: "transparent", color: t.color, display: "flex", alignItems: "center", gap: 5, fontSize: 11.5, fontFamily: "inherit" }}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.06)"}
            onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
            <Glyph name={t.icon} size={13} color={t.color}/>{t.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Inspector ─────────────────────────────────────────────────────────────────
function Inspector({ scene, onUpdateScene, onRegenerate, generating, open }) {
  const [motionVal, setMotionVal] = useState(50);
  if (!open) return null;
  return (
    <div style={{ width: 280, flexShrink: 0, borderLeft: "0.5px solid var(--onyx-hairline-strong,rgba(255,255,255,0.14))", background: "var(--panel-bg,rgba(6,9,15,0.5))", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ padding: "11px 14px", borderBottom: "0.5px solid var(--onyx-hairline,rgba(255,255,255,0.07))", display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
        <div style={{ width: 26, height: 26, borderRadius: 7, background: "linear-gradient(135deg,#ffcb6f,#c97a20)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Glyph name="sparkle" size={13} color="#1f1100" stroke={2}/>
        </div>
        <span style={{ fontSize: 13, fontWeight: 600 }}>Inspector</span>
        <div style={{ flex: 1 }}/>
        {scene && <span style={{ padding: "2px 8px", borderRadius: 999, fontSize: 9.5, background: "rgba(77,208,255,0.1)", border: "0.5px solid rgba(77,208,255,0.3)", color: "#4dd0ff" }}>Scene {(scene._index ?? 0) + 1}</span>}
      </div>
      {!scene
        ? <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--onyx-text-faint,rgba(241,245,251,0.40))", fontSize: 12 }}>Select a scene</div>
        : <div style={{ flex: 1, overflowY: "auto", padding: 14, display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <div style={µL}>Prompt</div>
              <textarea defaultValue={scene.action || scene.narration || ""} onBlur={e => onUpdateScene?.(scene.id, { action: e.target.value })} rows={4} style={{ width: "100%", resize: "none", boxSizing: "border-box", background: "var(--input-bg,rgba(0,0,0,0.35))", border: "0.5px solid var(--onyx-hairline-strong,rgba(255,255,255,0.14))", borderRadius: 8, padding: "9px 10px", color: "var(--onyx-text,#f1f5fb)", fontSize: 12, lineHeight: 1.5, fontFamily: "inherit", outline: "none" }}/>
            </div>
            <div>
              <div style={µL}>Style</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                {["Cinematic","Studio","Documentary","Hyperreal","Anime"].map((s, i) => (
                  <span key={s} style={{ padding: "3px 8px", borderRadius: 999, fontSize: 10.5, cursor: "pointer", background: i === 0 ? "rgba(77,208,255,0.12)" : "var(--chip-bg,rgba(255,255,255,0.06))", border: i === 0 ? "0.5px solid rgba(77,208,255,0.4)" : "0.5px solid var(--onyx-hairline-strong,rgba(255,255,255,0.14))", color: i === 0 ? "#4dd0ff" : "var(--onyx-text-dim,rgba(241,245,251,0.62))" }}>{s}</span>
                ))}
              </div>
            </div>
            <ISL label="Duration" value={Math.round(((scene.duration||3)/10)*100)} displayVal={(scene.duration||3)+"s"} onChange={v => onUpdateScene?.(scene.id,{duration:Number(((v/100)*10).toFixed(1))})}/>
            <ISL label="Motion" value={motionVal} displayVal={motionVal<33?"Slow":motionVal<66?"Medium":"Fast"} onChange={setMotionVal}/>
            <div>
              <div style={µL}>Colour grading</div>
              {[["Brightness","brightness"],["Contrast","contrast"],["Saturation","saturation"]].map(([l,k]) => (
                <ISL key={k} label={l} value={scene[k]??50} onChange={v => onUpdateScene?.(scene.id,{[k]:v})}/>
              ))}
            </div>
            <button onClick={() => onRegenerate?.(scene.id)} disabled={generating}
              style={{ width: "100%", padding: "10px 14px", borderRadius: 8, cursor: generating?"wait":"pointer", fontWeight: 600, fontSize: 13, fontFamily: "inherit", border: "0.5px solid rgba(255,200,120,0.6)", background: generating?"rgba(255,140,40,0.35)":"linear-gradient(180deg,rgba(255,181,71,0.95),rgba(255,140,40,0.95))", color: "#1f1100", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <Glyph name="sparkle" size={14} color="#1f1100"/>{generating?"Generating…":"Regenerate"}
            </button>
          </div>
      }
    </div>
  );
}

function ISL({ label, value, onChange, displayVal }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 11, color: "var(--onyx-text-dim,rgba(241,245,251,0.62))" }}>{label}</span>
        <span style={{ fontSize: 11, color: "var(--onyx-text-faint,rgba(241,245,251,0.40))", fontFamily: "monospace" }}>{displayVal ?? value}</span>
      </div>
      <div style={{ position: "relative", height: 4, background: "var(--chip-bg-strong,rgba(255,255,255,0.08))", borderRadius: 2 }}>
        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: value + "%", background: "linear-gradient(90deg,#1aa3d6,#4dd0ff)", borderRadius: 2 }}/>
        <input type="range" min={0} max={100} value={value} onChange={e => onChange(Number(e.target.value))} style={{ position: "absolute", inset: 0, width: "100%", opacity: 0, cursor: "pointer", height: "100%" }}/>
        <div style={{ position: "absolute", left: value + "%", top: "50%", transform: "translate(-50%,-50%)", width: 12, height: 12, borderRadius: "50%", background: "#fff", boxShadow: "0 2px 6px rgba(0,0,0,0.35)", pointerEvents: "none" }}/>
      </div>
    </div>
  );
}

const µL = { fontSize: 10, fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase", color: "var(--onyx-text-faint,rgba(241,245,251,0.40))", marginBottom: 8 };

// ── Main ──────────────────────────────────────────────────────────────────────
export default function EditorV2() {
  const [theme, setTheme] = useState(() => localStorage.getItem("onyx_theme") || "onyx");
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("onyx_theme", theme);
  }, [theme]);

  const [timelineState, dispatch] = useReducer(timelineReducer, null, makeInitialState);
  const [scenes,           setScenes]           = useState([]);
  const [activeScene,      setActiveScene]      = useState(null);
  const [title,            setTitle]            = useState("Untitled Reel");
  const [ratio,            setRatio]            = useState("9:16");
  const [reelId,           setReelId]           = useState(() => new URLSearchParams(window.location.search).get("reelId"));
  const [isPlaying,        setIsPlaying]        = useState(false);
  const [activeMenu,       setActiveMenu]       = useState("storyboard");
  const [activeMode,       setActiveMode]       = useState("Edit");
  const [sidebarOpen,      setSidebarOpen]      = useState(true);
  const [inspectorOpen,    setInspectorOpen]    = useState(true);
  const [savedMsg,         setSavedMsg]         = useState("–");
  const [ytModalOpen,      setYtModalOpen]      = useState(false);
  const [generatingScenes, setGeneratingScenes] = useState({});
  const [globalMusicUrl,   setGlobalMusicUrl]   = useState("");
  const [globalMusicName,  setGlobalMusicName]  = useState("");
  const [musicVolume,      setMusicVolume]      = useState(60);
  const [voiceoverVolume,  setVoiceoverVolume]  = useState(100);
  const [creditBalance,    setCreditBalance]    = useState(null);
  const [currentUser,      setCurrentUser]      = useState(null);
  const [brand,            setBrand]            = useState({});
  const [aiStudioItems,    setAiStudioItems]    = useState([]);

  const totalSec = useMemo(() => { try { return calcTotalDuration(timelineState) || 0; } catch { return 0; } }, [timelineState]);
  const playhead = timelineState.playhead ?? 0;
  const playbackProgress = totalSec > 0 ? playhead / totalSec : 0;
  const activeSceneObj = useMemo(() => {
    const idx = scenes.findIndex(s => s.id === activeScene);
    return idx >= 0 ? { ...scenes[idx], _index: idx } : null;
  }, [scenes, activeScene]);

  // Auto-select first scene whenever scenes change and nothing is selected
  useEffect(() => {
    if (!activeScene && scenes.length > 0) setActiveScene(scenes[0].id);
  }, [scenes, activeScene]);

  useEffect(() => { supabase.auth.getUser().then(({ data }) => { if (data?.user) setCurrentUser(data.user); }); }, []);
  useEffect(() => {
    if (!currentUser) return;
    getAuthHeaders().then(h => fetch("/api/credits/balance", { headers: h })).then(r => r.json()).then(d => setCreditBalance(d.balance ?? d.credits ?? null)).catch(() => {});
  }, [currentUser]);

  useEffect(() => {
    if (!reelId) return;
    async function load() {
      try {
        const h = await getAuthHeaders();
        const d = await (await fetch("/api/reels/" + reelId, { headers: h })).json();
        if (d?.error) { console.error("[EditorV2] reel fetch error:", d.error); setSavedMsg("Load error"); return; }
        if (d?.title) setTitle(d.title);
        if (d?.ratio) setRatio(d.ratio);
        const raw = Array.isArray(d?.scenes) ? d.scenes : [];
        const norm = raw.map((sc, i) => ({ id: sc.id ?? i + 1, duration: 3, ...sc }));
        setScenes(norm);
        if (norm.length) setActiveScene(norm[0].id);
        if (norm.length) dispatch({ type: "IMPORT_SCENES", scenes: norm, globalMusicUrl: d.globalMusicUrl || "", globalMusicName: d.globalMusicName || "" });
        setSavedMsg(norm.length ? "Loaded" : "Loaded (no scenes)");
      } catch (e) { console.error("[EditorV2] load", e); }
    }
    load();
  }, [reelId]);

  const saveNow = useCallback(async () => {
    try {
      const h = await getAuthHeaders(); h["Content-Type"] = "application/json";
      const body = JSON.stringify({ title, scenes, timeline: timelineState, ratio, status: "draft" });
      if (reelId) {
        await fetch("/api/reels/" + reelId, { method: "PUT", headers: h, body });
      } else {
        const d = await (await fetch("/api/reels", { method: "POST", headers: h, body })).json();
        if (d.id) {
          setReelId(d.id);
          const u = new URL(window.location.href);
          u.searchParams.set("reelId", d.id);
          window.history.replaceState({}, "", u.toString());
        }
      }
      setSavedMsg("Saved " + new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    } catch { setSavedMsg("Save failed"); }
  }, [title, scenes, timelineState, ratio, reelId]);

  useEffect(() => { const id = setInterval(saveNow, 30000); return () => clearInterval(id); }, [saveNow]);

  useEffect(() => {
    function onKey(e) {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
      if (e.key === " ") { e.preventDefault(); setIsPlaying(p => !p); }
      if (e.key === "ArrowRight") dispatch({ type: "SEEK", time: Math.max(0, playhead + 1/30) });
      if (e.key === "ArrowLeft")  dispatch({ type: "SEEK", time: Math.max(0, playhead - 1/30) });
      if (e.key === "s" && !e.metaKey) dispatch({ type: "TOGGLE_SNAP" });
      if ((e.metaKey || e.ctrlKey) && e.key === "s") { e.preventDefault(); saveNow(); }
      if ((e.key === "Delete" || e.key === "Backspace") && timelineState.selected) dispatch({ type: "DELETE_CLIP", clipId: timelineState.selected });
      if (e.key === "[") setSidebarOpen(p => !p);
      if (e.key === "]") setInspectorOpen(p => !p);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [playhead, timelineState.selected, saveNow]);

  // ── Playback engine (rAF master clock) ────────────────────────────────────
  // Drives timelineState.playhead forward in real time when isPlaying=true.
  // Also syncs the single PreviewCanvas <video> to the active scene's clip.
  const playStartRef = useRef(null); // { wallTime, playheadAtStart }

  useEffect(() => {
    if (!isPlaying) {
      playStartRef.current = null;
      // Pause the preview video
      const vid = document.querySelector(".v2-preview-video");
      if (vid) vid.pause();
      return;
    }

    // Stamp start position
    playStartRef.current = {
      wallTime:         performance.now() / 1000,
      playheadAtStart:  timelineState.playhead ?? 0,
    };

    let rafId;

    function tick() {
      const now     = performance.now() / 1000;
      const elapsed = now - playStartRef.current.wallTime;
      const newPH   = playStartRef.current.playheadAtStart + elapsed;

      // Stop at end
      if (newPH >= totalSec) {
        dispatch({ type: "SEEK", time: 0 });
        setIsPlaying(false);
        return;
      }

      dispatch({ type: "SEEK", time: newPH });

      // Sync preview video to active scene clip on video track
      const vid = document.querySelector(".v2-preview-video");
      if (vid) {
        const videoTrack = timelineState.tracks.find(t => t.key === "video");
        const clip = videoTrack?.clips.find(c =>
          newPH >= c.startTime && newPH < c.startTime + (c.trimEnd - c.trimStart)
        );
        if (clip) {
          const localTime = newPH - clip.startTime + clip.trimStart;
          if (Math.abs(vid.currentTime - localTime) > 0.2) {
            vid.currentTime = localTime;
          }
          if (vid.paused) vid.play().catch(() => {});
        } else {
          if (!vid.paused) vid.pause();
        }
      }

      rafId = requestAnimationFrame(tick);
    }

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  // Intentionally excludes playhead from deps — clock reads elapsed wall time,
  // not React state, to avoid restarting the loop every tick.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, totalSec]);

  const updateScene = useCallback((id, changes) => {
    setScenes(prev => prev.map(s => s.id === id ? { ...s, ...changes } : s));
    const clip = timelineState.tracks?.flatMap(t => t.clips).find(c => c.sceneId === id);
    if (clip) dispatch({ type: "UPDATE_CLIP", clipId: clip.id, changes });
  }, [timelineState.tracks]);

  const handleSetScenes = useCallback((updater) => {
    setScenes(prev => { const next = typeof updater === "function" ? updater(prev) : updater; return Array.isArray(next) ? next : prev; });
  }, []);

  const moveScene      = useCallback((from, to) => { setScenes(prev => { const n=[...prev]; const [m]=n.splice(from,1); n.splice(to,0,m); return n; }); }, []);
  const deleteScene    = useCallback((id) => { setScenes(prev => prev.filter(s => s.id !== id)); const c = timelineState.tracks?.flatMap(t=>t.clips).find(c=>c.sceneId===id); if(c) dispatch({type:"DELETE_CLIP",clipId:c.id}); }, [timelineState.tracks]);
  const duplicateScene = useCallback((id) => { setScenes(prev => { const idx=prev.findIndex(s=>s.id===id); if(idx<0) return prev; const mx=prev.reduce((m,s)=>Math.max(m,Number(s.id)||0),0)+1; const n=[...prev]; n.splice(idx+1,0,{...prev[idx],id:mx}); return n; }); }, []);

  const regenerateScene = useCallback(async (id) => {
    setGeneratingScenes(p => ({ ...p, [id]: true }));
    try {
      const scene = scenes.find(s => s.id === id); if (!scene) return;
      const h = await getAuthHeaders(); h["Content-Type"] = "application/json";
      const d = await (await fetch("/api/ai/generate-scene", { method: "POST", headers: h, body: JSON.stringify({ prompt: scene.action || scene.narration, ratio }) })).json();
      if (d.url) updateScene(id, { mediaUrl: d.url, thumbnail: d.thumbnail || d.url });
    } catch(e) { console.error("[EditorV2] regen", e); }
    finally { setGeneratingScenes(p => ({ ...p, [id]: false })); }
  }, [scenes, ratio, updateScene]);

  return (
    <div data-theme={theme} style={{ width: "100vw", height: "100vh", display: "flex", flexDirection: "column", background: "var(--onyx-bg-2,#0b0f17)", color: "var(--onyx-text,#f1f5fb)", fontFamily: "var(--onyx-font,-apple-system,system-ui,sans-serif)", overflow: "hidden" }}>
      {/* BG streaks */}
      <div className="onyx-bg-streaks" style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0 }}/>

      <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", height: "100%" }}>
        <Toolbar
          title={title} onTitleChange={setTitle} saved={savedMsg}
          theme={theme} onThemeToggle={() => setTheme(t => t==="onyx"?"opal":"onyx")}
          ratio={ratio} onRatioChange={setRatio}
          onExport={() => {}}
          isPlaying={isPlaying} onPlayPause={() => setIsPlaying(p=>!p)}
          activeMode={activeMode} setActiveMode={setActiveMode}
        />

        <div style={{ flex: 1, display: "flex", minHeight: 0, overflow: "hidden" }}>
          {/* Sidebar */}
          <Sidebar open={sidebarOpen} activeTab={activeMenu} setActiveTab={setActiveMenu}>
            {activeMenu==="storyboard" && <Safe name="StoryboardPanel"><StoryboardPanel scenes={scenes} activeScene={activeScene} setActiveScene={setActiveScene} updateScenes={setScenes} onSaveScene={() => saveNow()} onGenerateScene={() => {}}/></Safe>}
            {activeMenu==="visuals"    && <Safe name="VisualsPanel"><VisualsPanel scenes={scenes} activeScene={activeScene} onUpdateScene={updateScene} onUseAiStudioItem={item=>updateScene(activeScene,{mediaUrl:item.url,thumbnail:item.thumbnail})} aiStudioItems={aiStudioItems}/></Safe>}
            {activeMenu==="audio"      && <Safe name="AudioPanel"><AudioPanel scenes={scenes} activeScene={activeScene} setScenes={handleSetScenes} musicUrl={globalMusicUrl} setMusicUrl={setGlobalMusicUrl} globalMusicUrl={globalMusicUrl} setGlobalMusicUrl={setGlobalMusicUrl} globalMusicName={globalMusicName} setGlobalMusicName={setGlobalMusicName} voiceoverVolume={voiceoverVolume} setVoiceoverVolume={setVoiceoverVolume} musicVolume={musicVolume} setMusicVolume={setMusicVolume} onUpdateScene={updateScene} onRegenerateAllVO={() => {}} creditBalance={creditBalance} currentUser={currentUser} brand={brand}/></Safe>}
            {activeMenu==="text"       && <Safe name="TextPanel"><TextPanel scenes={scenes} activeScene={activeScene} onUpdateScene={updateScene}/></Safe>}
            {activeMenu==="elements"   && <Safe name="ElementsPanel"><ElementsPanel scenes={scenes} activeScene={activeScene} onUpdateScene={updateScene}/></Safe>}
            {activeMenu==="styles"     && <Safe name="StylesPanel"><StylesPanel scenes={scenes} activeScene={activeScene} onUpdateScene={updateScene}/></Safe>}
          </Sidebar>

          {/* Preview */}
          <PreviewCanvas
            scenes={scenes} activeScene={activeScene} setActiveScene={setActiveScene}
            isPlaying={isPlaying} playhead={playhead} totalSec={totalSec||1}
            onSeek={t => dispatch({type:"SEEK",time:Math.max(0,t)})}
            onPlayPause={() => setIsPlaying(p=>!p)}
            ratio={ratio}
          />

          {/* Inspector */}
          <Inspector
            scene={activeSceneObj} open={inspectorOpen}
            onUpdateScene={updateScene} onRegenerate={regenerateScene}
            generating={!!generatingScenes[activeScene]}
          />
        </div>

        {/* Sequencer — V2 NLE timeline, always dark */}
        <div data-theme="onyx">
          <Safe name="SequencerPanel">
            <SequencerPanel
              timelineState={timelineState} dispatch={dispatch}
              isPlaying={isPlaying} onPlayPause={() => setIsPlaying(p => !p)}
              scenes={scenes} activeScene={activeScene} setActiveScene={setActiveScene}
              updateScene={updateScene}
              globalMusicUrl={globalMusicUrl} globalMusicName={globalMusicName}
              musicVolume={musicVolume} voiceoverVolume={voiceoverVolume}
              totalDuration={totalSec}
              onSeek={p => dispatch({ type: "SEEK", time: p * totalSec })}
            />
          </Safe>
        </div>
      </div>

      {ytModalOpen && <YouTubePublishModal onClose={() => setYtModalOpen(false)} scenes={scenes} title={title}/>}
    </div>
  );
}
