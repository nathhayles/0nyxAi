// EditorV2.jsx — Hybrid NLE Editor
// Preview-first + Classic NLE, Onyx design system, theme switcher, all 3 ratios

import React, {
  useReducer, useState, useEffect, useCallback, useRef, useMemo,
} from "react";
import { timelineReducer, makeInitialState, makeClip, importFromScenes } from "../reducers/timelineReducer.js";
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
import AvatarPanel from "../components/AvatarPanel.jsx";
import BrandingPanel from "../components/BrandingPanel.jsx";
import HelpTooltip from "../components/HelpTooltip.jsx";

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
  { key: "branding",   label: "Brand",   icon: "🏷"  },
  { key: "avatar",     label: "Avatar",  icon: "🧑"  },
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
    upload:  "M12 4v13M7 9l5-5 5 5M4 17v3a1 1 0 001 1h14a1 1 0 001-1v-3",
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
function Toolbar({ title, onTitleChange, saved, theme, onThemeToggle, ratio, onRatioChange, onExport, onShare, onPublish, isPlaying, onPlayPause, activeMode, setActiveMode }) {
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
      {saved && <span style={{ fontSize: 12, fontWeight: 600, color: saved.startsWith("✗") ? "#ff6b6b" : saved.startsWith("✓") || saved === "Saved" ? "#4dd0ff" : "rgba(241,245,251,0.75)", background: "rgba(255,255,255,0.06)", border: "0.5px solid rgba(255,255,255,0.1)", borderRadius: 6, padding: "3px 9px", whiteSpace: "nowrap" }}>{saved}</span>}

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

      {/* Share */}
      <button onClick={onShare} style={{ background: "var(--chip-bg,rgba(255,255,255,0.06))", border: "0.5px solid var(--onyx-hairline-strong,rgba(255,255,255,0.14))", borderRadius: 8, padding: "6px 13px", cursor: "pointer", color: "var(--onyx-text,#f1f5fb)", fontWeight: 600, fontSize: 12.5, fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6 }}>
        <Glyph name="share" size={13} color="var(--onyx-cyan,#4dd0ff)"/> Share
      </button>

      {/* Publish */}
      <button onClick={onPublish} style={{ background: "var(--chip-bg,rgba(255,255,255,0.06))", border: "0.5px solid var(--onyx-hairline-strong,rgba(255,255,255,0.14))", borderRadius: 8, padding: "6px 13px", cursor: "pointer", color: "var(--onyx-text,#f1f5fb)", fontWeight: 600, fontSize: 12.5, fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6 }}>
        <Glyph name="upload" size={13} color="var(--onyx-cyan,#4dd0ff)"/> Publish
      </button>

      {/* Export */}
      <button onClick={onExport} style={{ background: "linear-gradient(180deg,#5edcff,#2db8ee)", border: "0.5px solid rgba(255,255,255,0.45)", borderRadius: 8, padding: "6px 14px", cursor: "pointer", color: "#06121b", fontWeight: 600, fontSize: 12.5, fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6, boxShadow: "0 1px 0 rgba(255,255,255,0.4) inset,0 4px 14px rgba(77,208,255,0.35)" }}>
        <Glyph name="download" size={13} color="#06121b"/> Export
      </button>
      <HelpTooltip topic="export" />
    </div>
  );
}

// ── Sidebar ───────────────────────────────────────────────────────────────────
function Sidebar({ open, activeTab, setActiveTab, children }) {
  return (
    <div style={{ width: open ? 320 : 48, flexShrink: 0, borderRight: "0.5px solid var(--onyx-hairline-strong,rgba(255,255,255,0.14))", background: "var(--panel-bg,rgba(6,9,15,0.5))", display: "flex", flexDirection: "column", transition: "width 0.2s ease", overflow: "hidden", position: "relative", zIndex: 10 }}>
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
  const activeIdx = scenes.findIndex(s => s.id === activeScene);
  const scene = scenes[activeIdx >= 0 ? activeIdx : 0] || null;
  const cssRatio = RATIOS[ratio]?.css || "9/16";
  const progress = totalSec > 0 ? (playhead / totalSec) * 100 : 0;

  return (
    <div style={{
      flex: 1, minWidth: 0, display: "flex", flexDirection: "column",
      background: "#010306", overflow: "hidden", position: "relative",
    }}>
      {/* Ambient glow */}
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0,
        background: "radial-gradient(ellipse 55% 55% at 50% 42%, rgba(77,208,255,0.05), transparent 70%)" }}/>

      {/* Frame area — takes all space above dock */}
      <div style={{
        flex: 1, minHeight: 0, display: "flex",
        alignItems: "center", justifyContent: "center",
        padding: "12px 24px 8px", position: "relative", zIndex: 1,
      }}>
        {/* Preview frame — constrained by both axes */}
        <div style={{
          aspectRatio: cssRatio,
          maxWidth: "100%",
          maxHeight: "100%",
          width: ratio === "9:16" ? "auto" : "100%",
          height: ratio === "9:16" ? "100%" : "auto",
          flexShrink: 0, position: "relative", borderRadius: 12, overflow: "hidden",
          boxShadow: "0 24px 64px rgba(0,0,0,0.75), 0 0 0 0.5px rgba(255,255,255,0.07)",
          background: "linear-gradient(135deg,#0d1f38,#1a3260,#0a1628,#040d1a)",
        }}>
          {/* Placeholder — always behind video, visible through transparent unsourced video */}
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, zIndex: 0 }}>
                <div style={{ opacity: 0.15 }}><Glyph name="film" size={44} color="#4dd0ff"/></div>
                <span style={{ fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.18)", fontFamily: "monospace" }}>
                  {scenes.length ? "Scene " + ((activeIdx >= 0 ? activeIdx : 0) + 1) + " of " + scenes.length : "No scenes yet"}
                </span>
              </div>
          {/* Dual-buffer: two stacked videos; tick/scrub effects manage src entirely */}
          <video className="v2-preview-video-a"
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", zIndex: 2, opacity: 1, visibility: "hidden" }} playsInline/>
          <video className="v2-preview-video-b"
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", zIndex: 2, opacity: 0, visibility: "hidden" }} playsInline/>
          {scene?.narration && (
            <div style={{ position: "absolute", bottom: 8, left: 12, right: 12, textAlign: "center", fontWeight: 700, fontSize: ratio === "9:16" ? 18 : 15, color: "#fff", textShadow: "0 2px 12px rgba(0,0,0,0.8)", letterSpacing: "-0.01em", lineHeight: 1.3, pointerEvents: "none" }}>
              {scene.narration.split(" ").slice(0, 10).join(" ")}
            </div>
          )}
          {/* Scrub bar */}
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 3, background: "rgba(255,255,255,0.08)", cursor: "pointer" }}
            onClick={e => { const r = e.currentTarget.getBoundingClientRect(); onSeek(((e.clientX - r.left) / r.width) * totalSec); }}>
            <div style={{ height: "100%", width: progress + "%", background: "#4dd0ff", transition: "width 0.1s linear" }}/>
          </div>
        </div>
      </div>

      {/* Transport dock — normal flow, never overlaps video */}
      <div style={{
        flexShrink: 0, display: "flex", justifyContent: "center",
        padding: "6px 0 10px", position: "relative", zIndex: 1,
      }}>
        <div style={{ background: "var(--onyx-surface,rgba(20,26,38,0.85))", backdropFilter: "blur(28px) saturate(140%)", WebkitBackdropFilter: "blur(28px) saturate(140%)", border: "0.5px solid var(--onyx-hairline-strong,rgba(255,255,255,0.14))", boxShadow: "0 8px 32px rgba(0,0,0,0.5)", borderRadius: 14, padding: "4px 6px", display: "flex", alignItems: "center", gap: 2 }}>
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
    </div>
  );
}

// ── Inspector ─────────────────────────────────────────────────────────────────
function Inspector({ scene, onUpdateScene, onRegenerate, generating, open }) {
  const [motionVal, setMotionVal] = useState(50);
  if (!open) return null;
  return (
    <div style={{ width: open ? 288 : 0, flexShrink: 0, borderLeft: open ? "0.5px solid var(--onyx-hairline-strong,rgba(255,255,255,0.14))" : "none", background: "var(--panel-bg,rgba(6,9,15,0.5))", display: "flex", flexDirection: "column", overflow: "hidden", transition: "width 0.2s ease" }}>
      <div style={{ padding: "11px 14px", borderBottom: "0.5px solid var(--onyx-hairline,rgba(255,255,255,0.07))", display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
        <div style={{ width: 26, height: 26, borderRadius: 7, background: "linear-gradient(135deg,#ffcb6f,#c97a20)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Glyph name="sparkle" size={13} color="#1f1100" stroke={2}/>
        </div>
        <span style={{ fontSize: 13, fontWeight: 600 }}>Inspector</span>
        <HelpTooltip topic="inspector" />
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

// ── V2 render serializer ─────────────────────────────────────────────────────
function buildV2RenderRequest({ timelineState, scenes, globalMusicUrl, globalMusicName,
  musicVolume, voiceoverVolume, ratio, brand, reelId }) {
  const videoTrack = timelineState.tracks.find(t => t.key === "video");
  const voiceTrack = timelineState.tracks.find(t => t.key === "voiceover");
  const musicTrack = timelineState.tracks.find(t => t.key === "music");
  function isVid(url) {
    if (!url) return false;
    const ext = url.split("?")[0].split(".").pop().toLowerCase();
    return ["mp4","webm","mov","m4v"].includes(ext);
  }
  const renderable = (videoTrack?.clips || []).map(clip => {
    const scene = scenes.find(s => s.id === clip.sceneId) || {};
    const voClip = (voiceTrack?.clips || []).find(c =>
      c.sceneId === clip.sceneId || Math.abs(c.startTime - clip.startTime) < 0.1
    );
    const url = clip.src || scene.mediaUrl || scene.url || "";
    return {
      type:              isVid(url) ? "video" : "image",
      url,
      duration:          clip.trimEnd - clip.trimStart,
      trimStart:         clip.trimStart || null,
      trimEnd:           clip.trimEnd || null,
      voiceoverUrl:      voClip?.src || scene.voiceoverUrl || null,
      voiceoverVolume:   voiceoverVolume ?? 100,
      sourceAudioVolume: scene.sourceAudioVolume ?? 100,
      sourceAudioMuted:  scene.sourceAudioMuted ?? false,
      narration:         clip.narration || scene.narration || scene.action || null,
      captionsEnabled:   clip.captionsEnabled !== false,
      caption_color:     scene.caption_color || brand?.caption_color || "#ffffff",
      caption_bg_color:  scene.caption_bg_color || brand?.caption_bg_color || "rgba(0,0,0,0.82)",
      caption_font:      scene.caption_font || brand?.caption_font || "sans-serif",
      caption_size:      scene.caption_size || brand?.caption_size || 16,
      caption_position:  scene.caption_position || brand?.caption_position || "bottom",
      transitionToNext:  scene.transitionToNext || "cut",
    };
  });
  const musicClip = musicTrack?.clips?.[0];
  const resolvedMusicUrl = musicClip?.src || globalMusicUrl || null;
  return {
    scenes:          renderable,
    musicUrl:        resolvedMusicUrl,
    musicVolume:     musicVolume ?? 60,
    voiceoverVolume: voiceoverVolume ?? 100,
    renderMode:      "download",
    brand:           brand || {},
    reelId:          reelId || null,
    theme_id:        null,
    aspectRatio:     ratio,
  };
}

// ── Main ──────────────────────────────────────────────────────────────────────
function probeVideoDuration(url) {
  return new Promise(resolve => {
    if (!url) return resolve(null);
    const v = document.createElement("video");
    v.preload = "metadata";
    v.onloadedmetadata = () => { const d = isFinite(v.duration) ? v.duration : null; v.src = ""; resolve(d); };
    v.onerror = () => resolve(null);
    v.src = url;
  });
}

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
  const audioElementsRef   = useRef(new Map());   // clipId → HTMLAudioElement
  const musicVolumeRef     = useRef(60);
  const voiceoverVolumeRef = useRef(100);
  useEffect(() => { musicVolumeRef.current     = musicVolume / 100;     }, [musicVolume]);
  useEffect(() => { voiceoverVolumeRef.current = voiceoverVolume / 100; }, [voiceoverVolume]);
  const [creditBalance,    setCreditBalance]    = useState(null);
  const [currentUser,      setCurrentUser]      = useState(null);
  const [brand,            setBrand]            = useState({});
  const [brands,           setBrands]           = useState([]);
  const [selectedBrandId,  setSelectedBrandId]  = useState(null);
  const [reelVideoUrl,     setReelVideoUrl]     = useState(null);
  const [aiStudioItems,    setAiStudioItems]    = useState([]);
  const [visualsTab,      setVisualsTab]      = useState("stock");
  const [audioTab,        setAudioTab]        = useState("uploads");
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

  // Scene strip — keep active card centered
  const stripRef = useRef(null);
  const cardRefs = useRef({});
  useEffect(() => {
    const container = stripRef.current;
    if (!container || !activeScene) return;
    const idx = scenes.findIndex(s => s.id === activeScene);
    if (idx < 0) return;
    requestAnimationFrame(() => {
      const card = cardRefs.current[activeScene];
      if (!card) return;
      const cardW = card.offsetWidth;
      // 16px strip padding-left + idx cards of (cardW + 5px gap)
      const cardLeft = 16 + idx * (cardW + 5);
      container.scrollTo({
        left: Math.max(0, cardLeft - (container.clientWidth - cardW) / 2),
        behavior: "smooth",
      });
    });
  }, [activeScene, scenes]);

  useEffect(() => { supabase.auth.getUser().then(({ data }) => { if (data?.user) setCurrentUser(data.user); }); }, []);
  useEffect(() => {
    if (!currentUser) return;
    getAuthHeaders().then(h => fetch("/api/credits/balance", { headers: h })).then(r => r.json()).then(d => setCreditBalance(d.balance ?? d.credits ?? null)).catch(() => {});
    async function loadBrands() {
      try {
        const headers = await getAuthHeaders();
        const res = await fetch("/api/brands", { headers });
        const data = await res.json();
        const list = data.brands || [];
        setBrands(list);
        const def = list.find(b => b.is_default) || list[0];
        if (def) { setSelectedBrandId(def.id); setBrand(b => ({ ...b, ...def })); }
      } catch (e) { console.error("Brands load error:", e); }
    }
    loadBrands();
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
        const probed = await Promise.all(norm.map(sc => probeVideoDuration(sc.mediaUrl || sc.url || "")));
        const normWithDur = norm.map((sc, i) => probed[i] != null ? { ...sc, videoDuration: probed[i] } : sc);
        setScenes(normWithDur);
        if (normWithDur.length) setActiveScene(normWithDur[0].id);
        if (d?.timeline?.tracks?.some(t => t.clips?.length)) {
          // If the saved video track is empty (e.g. only broll was added before save),
          // backfill video/voiceover from scenes so the main track isn't blank.
          const savedTracks  = d.timeline.tracks;
          const videoIsEmpty = !savedTracks?.find(t => t.key === "video")?.clips?.length;
          let timelineToLoad = d.timeline;
          if (videoIsEmpty && normWithDur.length) {
            const base = importFromScenes(normWithDur, "", "");
            const mergedTracks = savedTracks.map(st => {
              if (st.key === "video" || st.key === "voiceover")
                return base.tracks.find(bt => bt.key === st.key) ?? st;
              return st;
            });
            timelineToLoad = { ...d.timeline, tracks: mergedTracks };
          }
          dispatch({ type: "LOAD_STATE", state: timelineToLoad });
          const musicTrack = d.timeline.tracks?.find(t => t.key === "music");
          const musicClip = musicTrack?.clips?.[0];
          if (musicClip?.src) {
            setGlobalMusicUrl(musicClip.src);
            setGlobalMusicName(musicClip.label || "Music");
          } else if (d.global_music_url || d.globalMusicUrl) {
            setGlobalMusicUrl(d.global_music_url || d.globalMusicUrl);
            setGlobalMusicName(d.global_music_name || d.globalMusicName || "");
          }
        } else if (normWithDur.length) {
          const gmu = d.global_music_url || d.globalMusicUrl || "";
          const gmn = d.global_music_name || d.globalMusicName || "";
          dispatch({ type: "IMPORT_SCENES", scenes: normWithDur, globalMusicUrl: gmu, globalMusicName: gmn });
        }
        setSavedMsg(normWithDur.length ? "Loaded" : "Loaded (no scenes)");
      } catch (e) { console.error("[EditorV2] load", e); }
    }
    load();
  }, [reelId]);

  const saveNow = useCallback(async () => {
    try {
      const h = await getAuthHeaders(); h["Content-Type"] = "application/json";
      const body = JSON.stringify({ title, scenes, timeline: timelineState, ratio, status: "draft", globalMusicUrl, globalMusicName });
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
  }, [title, scenes, timelineState, ratio, reelId, globalMusicUrl, globalMusicName]);

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
  const previewSrcRef     = useRef(null); // last src assigned to the preview <video>
  const activeVideoSlotRef = useRef("a");  // "a" | "b" — which buffer is currently showing
  const transitioningRef   = useRef(false); // true during the 150 ms crossfade
  const tracksRef = useRef(timelineState.tracks);
  useEffect(() => { tracksRef.current = timelineState.tracks; }, [timelineState.tracks]);
  const seekingRef = useRef(false); // true for 300ms after manual seek — suppresses tick
  const activeSceneRef = useRef(activeScene);
  useEffect(() => { activeSceneRef.current = activeScene; }, [activeScene]);

  // Sync preview on scrub (not playing) — dual-buffer crossfade, no black frame.
  useEffect(() => {
    if (isPlaying) return;
    const getSlots = () => {
      const a = document.querySelector(".v2-preview-video-a");
      const b = document.querySelector(".v2-preview-video-b");
      return activeVideoSlotRef.current === "a" ? { cur: a, nxt: b } : { cur: b, nxt: a };
    };
    const { cur, nxt } = getSlots();
    if (!cur || !nxt) return;
    const ph = playhead;
    const findAt = (key) => tracksRef.current
      .find(t => t.key === key)?.clips
      .find(c => ph >= c.startTime && ph < c.startTime + (c.trimEnd - c.trimStart));
    const clip = findAt("broll") ?? findAt("video");
    const targetSrc = clip?.src || scenes.find(s => s.id === activeScene)?.mediaUrl || "";

    if (!targetSrc) { cur.style.visibility = "hidden"; return; }

    const localTime = clip ? Math.max(0, ph - clip.startTime + clip.trimStart) : 0;

    // Same src — just seek
    if (cur.getAttribute("data-src") === targetSrc) {
      cur.currentTime = localTime;
      cur.style.visibility = "visible";
      return;
    }

    // New src — load into nxt, crossfade when ready; cur stays visible until then
    if (transitioningRef.current) return; // don't stack transitions
    transitioningRef.current = true;
    nxt.oncanplay = null;
    nxt.src = targetSrc;
    nxt.setAttribute("data-src", targetSrc);
    nxt.muted = true;
    nxt.style.zIndex = 3;
    cur.style.zIndex = 2;

    nxt.oncanplay = () => {
      nxt.oncanplay = null;
      nxt.currentTime = localTime;
      nxt.style.opacity = "0";
      nxt.style.visibility = "visible";
      requestAnimationFrame(() => {
        nxt.style.transition = "opacity 0.15s ease";
        nxt.style.opacity = "1";
        cur.style.transition = "opacity 0.15s ease";
        cur.style.opacity = "0";
        setTimeout(() => {
          cur.style.visibility = "hidden";
          cur.style.opacity = "0";
          cur.style.transition = "";
          cur.style.zIndex = 2;
          nxt.style.transition = "";
          nxt.style.zIndex = 2;
          activeVideoSlotRef.current = activeVideoSlotRef.current === "a" ? "b" : "a";
          transitioningRef.current = false;
        }, 180);
      });
    };
    nxt.load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playhead, timelineState.tracks, isPlaying]);

  useEffect(() => {
    if (!isPlaying) {
      playStartRef.current = null;
      previewSrcRef.current = null; // force src re-sync on next play
      // Pause both preview video slots
      document.querySelectorAll(".v2-preview-video-a, .v2-preview-video-b").forEach(v => v.pause());
      transitioningRef.current = false;
      // Pause all audio elements
      audioElementsRef.current.forEach(el => el.pause());
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
      if (seekingRef.current && !playStartRef.current) return; // only suppress tick when paused
      const newPH   = playStartRef.current.playheadAtStart + elapsed;

      // Stop at end
      if (newPH >= totalSec) {
        dispatch({ type: "SEEK", time: 0 });
        setIsPlaying(false);
        return;
      }

      dispatch({ type: "SEEK", time: newPH });

      // Sync preview video — broll takes priority over video when both overlap
      const getSlotsTick = () => {
        const a = document.querySelector(".v2-preview-video-a");
        const b = document.querySelector(".v2-preview-video-b");
        return activeVideoSlotRef.current === "a" ? { cur: a, nxt: b } : { cur: b, nxt: a };
      };
      const findActive = (key) => tracksRef.current
        .find(t => t.key === key)?.clips
        .find(c => newPH >= c.startTime && newPH < c.startTime + (c.trimEnd - c.trimStart));
      const clip = findActive("broll") ?? findActive("video");
      if (clip) {
        // Dual-buffer src swap — cur keeps playing while nxt preloads (no black frame)
        if (clip.src && previewSrcRef.current !== clip.src && !transitioningRef.current) {
          previewSrcRef.current = clip.src;
          transitioningRef.current = true;
          const { cur, nxt } = getSlotsTick();
          if (cur && nxt) {
            cur.pause(); // freeze outgoing frame so it can't play to end-of-file black
            nxt.oncanplay = null;
            nxt.src = clip.src;
            nxt.setAttribute("data-src", clip.src);
            nxt.muted = true;
            nxt.style.zIndex = 3;
            cur.style.zIndex = 2;
            nxt.oncanplay = () => {
              nxt.oncanplay = null;
              nxt.currentTime = Math.max(0, newPH - clip.startTime + clip.trimStart);
              nxt.style.opacity = "0";
              nxt.style.visibility = "visible";
              nxt.play().catch(() => {});
              requestAnimationFrame(() => {
                nxt.style.transition = "opacity 0.12s ease";
                nxt.style.opacity = "1";
                cur.style.transition = "opacity 0.12s ease";
                cur.style.opacity = "0";
                setTimeout(() => {
                  cur.pause();
                  cur.style.visibility = "hidden";
                  cur.style.opacity = "0";
                  cur.style.transition = "";
                  cur.style.zIndex = 2;
                  nxt.style.transition = "";
                  nxt.style.zIndex = 2;
                  activeVideoSlotRef.current = activeVideoSlotRef.current === "a" ? "b" : "a";
                  transitioningRef.current = false;
                }, 150);
              });
            };
            nxt.load();
          }
        }
        // Switch active scene if playhead crossed into a different clip
        if (clip.sceneId != null && clip.sceneId !== activeSceneRef.current) {
          setActiveScene(clip.sceneId);
        }
        // Sync currentTime and play on the current (active) slot
        if (!transitioningRef.current) {
          const { cur } = getSlotsTick();
          if (cur) {
            cur.style.visibility = "visible";
            const localTime = newPH - clip.startTime + clip.trimStart;
            if (Math.abs(cur.currentTime - localTime) > 0.2) cur.currentTime = localTime;
            if (cur.paused) cur.play().catch(() => {});
          }
        }
      } else {
        // Gap between clips — blank the preview
        const { cur } = getSlotsTick();
        if (cur) { cur.pause(); cur.currentTime = 0; cur.style.visibility = "hidden"; }
      }

      // Sync audio tracks (voiceover, music, sfx)
      const AUDIO_TRACKS = [
        { key: "voiceover", volRef: voiceoverVolumeRef },
        { key: "music",     volRef: musicVolumeRef },
        { key: "sfx",       volRef: musicVolumeRef },
      ];
      AUDIO_TRACKS.forEach(({ key, volRef }) => {
        const track = tracksRef.current.find(t => t.key === key);
        if (!track) return;
        track.clips.forEach(clip => {
          if (!clip.src) return;
          const clipDur = clip.trimEnd - clip.trimStart;
          const inRange = newPH >= clip.startTime && newPH < clip.startTime + clipDur;
          let el = audioElementsRef.current.get(clip.id);
          if (!el) {
            el = new Audio(clip.src);
            el.preload = "auto";
            audioElementsRef.current.set(clip.id, el);
          }
          el.volume = Math.min(1, Math.max(0, volRef.current));
          if (inRange) {
            const localTime = newPH - clip.startTime + clip.trimStart;
            if (Math.abs(el.currentTime - localTime) > 0.25) el.currentTime = localTime;
            if (el.paused) el.play().catch(() => {});
          } else {
            if (!el.paused) el.pause();
          }
        });
      });

      rafId = requestAnimationFrame(tick);
    }

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  // Intentionally excludes playhead from deps — clock reads elapsed wall time,
  // not React state, to avoid restarting the loop every tick.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, totalSec]);

  // Keep audioElementsRef pool in sync — dispose elements whose clip no longer exists
  useEffect(() => {
    const liveIds = new Set(
      timelineState.tracks
        .flatMap(t => t.clips)
        .filter(c => c.src)
        .map(c => c.id)
    );
    audioElementsRef.current.forEach((el, id) => {
      if (!liveIds.has(id)) {
        el.pause();
        audioElementsRef.current.delete(id);
      }
    });
  }, [timelineState.tracks]);

  const updateScene = useCallback((id, changes) => {
    setScenes(prev => prev.map(s => s.id === id ? { ...s, ...changes } : s));
    const clip = timelineState.tracks?.flatMap(t => t.clips).find(c => c.sceneId === id);
    if (clip) dispatch({ type: "UPDATE_CLIP", clipId: clip.id, changes });
  }, [timelineState.tracks]);

  const handleSetScenes = useCallback((updater) => {
    setScenes(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      if (!Array.isArray(next)) return prev;

      // Sync voiceover clips into the Voice track for any scene whose voiceoverUrl changed
      const voTrack = timelineState.tracks.find(t => t.key === "voiceover");
      const vidTrack = timelineState.tracks.find(t => t.key === "video");
      next.forEach(scene => {
        const old = prev.find(s => s.id === scene.id);
        if (!old || old.voiceoverUrl === scene.voiceoverUrl) return;

        // Remove any existing voiceover clip for this scene
        const existing = voTrack?.clips.find(c => c.sceneId === scene.id);
        if (existing) dispatch({ type: "DELETE_CLIP", clipId: existing.id });

        if (!scene.voiceoverUrl) return;

        // Mirror the position/duration of the matching video clip
        const vidClip = vidTrack?.clips.find(c => c.sceneId === scene.id);
        const startTime = vidClip?.startTime ?? 0;
        const duration  = scene.voiceoverDuration
          || (vidClip ? vidClip.trimEnd - vidClip.trimStart : 3);

        dispatch({
          type: "ADD_CLIP",
          clip: makeClip({
            trackKey:  "voiceover",
            sceneId:   scene.id,
            startTime,
            duration,
            trimStart: 0,
            trimEnd:   duration,
            src:       scene.voiceoverUrl,
            type:      "audio",
            volume:    voiceoverVolume ?? 100,
            label:     "VO",
          }),
        });
      });

      return next;
    });
  }, [timelineState.tracks, voiceoverVolume]);

  // Sync globalMusicUrl into the Music track whenever Apply is clicked in AudioPanel
  useEffect(() => {
    if (!globalMusicUrl) return;
    const musicTrack = timelineState.tracks.find(t => t.key === "music");
    if (!musicTrack) return;
    musicTrack.clips.forEach(c => dispatch({ type: "DELETE_CLIP", clipId: c.id }));
    const totalDur = timelineState.tracks
      .find(t => t.key === "video")
      ?.clips.reduce((max, c) => Math.max(max, c.startTime + (c.trimEnd - c.trimStart)), 0) || 60;
    dispatch({
      type: "ADD_CLIP",
      clip: makeClip({
        trackKey:  "music",
        startTime: 0,
        duration:  totalDur,
        trimStart: 0,
        trimEnd:   totalDur,
        src:       globalMusicUrl,
        type:      "audio",
        volume:    musicVolume ?? 60,
        label:     globalMusicName || "Music",
      }),
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [globalMusicUrl]);

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
          onExport={async () => {
              try {
                // Check trial/plan gate same as V1
                const meRes = await fetch("/api/user/me", { headers: await getAuthHeaders() });
                const me = await meRes.json();
                if (me.trial_expired || (!me.has_paid_plan && !me.is_trial)) {
                  setSavedMsg("Upgrade to export");
                  alert("Please upgrade your plan to export reels.");
                  return;
                }
                const h = await getAuthHeaders();
                h["Content-Type"] = "application/json";
                const payload = buildV2RenderRequest({
                  timelineState, scenes, globalMusicUrl, globalMusicName,
                  musicVolume, voiceoverVolume, ratio, brand, reelId,
                });
                if (!payload.scenes.length) { alert("No scenes to export."); return; }
                setSavedMsg("Rendering…");
                // Show visible rendering indicator
                const ind = document.createElement("div");
                ind.id = "v2-render-indicator";
                ind.textContent = "⏳ Rendering your reel… this may take a minute";
                ind.style.cssText = "position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(6,9,15,0.95);border:1px solid rgba(77,208,255,0.4);color:#4dd0ff;padding:20px 32px;border-radius:12px;font-weight:600;font-size:14px;z-index:99999;box-shadow:0 8px 40px rgba(0,0,0,0.6);text-align:center;";
                document.body.appendChild(ind);
                const res = await fetch("/api/render", { method: "POST", headers: h, body: JSON.stringify(payload) });
                const data = await res.json();
                const rawUrl = data.url || data.downloadUrl;
                if (rawUrl) {
                  setSavedMsg("✓ Downloading…");
                  // Make absolute — backend returns relative /storage/renders/...
                  const dlUrl = rawUrl.startsWith("http") ? rawUrl : window.location.origin + rawUrl;
                  const a = document.createElement("a");
                  a.href = dlUrl;
                  a.download = (title || "reel").replace(/[^a-z0-9]/gi, "_") + ".mp4";
                  a.rel = "noopener";
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  setTimeout(() => setSavedMsg("Saved"), 3000);
                  document.getElementById("v2-render-indicator")?.remove();
                } else {
                  setSavedMsg("✗ Render failed");
                  document.getElementById("v2-render-indicator")?.remove();
                  console.error("[Export]", data);
                }
              } catch(e) {
                setSavedMsg("Render error");
                console.error("[Export]", e);
              }
            }}
          onPublish={() => {
              const url = "/publish" + (reelId ? "?reelId=" + reelId : "");
              window.location.href = url;
            }}
          onShare={async () => {
              try {
                if (!reelId) { setSavedMsg("Save your reel first."); return; }
                const h = await getAuthHeaders();
                setSavedMsg("Building share link…");
                const res = await fetch(`/api/reels/${reelId}/renders`, { headers: h });
                const data = await res.json();
                if (!data.url) { setSavedMsg("Export your reel first, then share."); return; }
                const username = currentUser?.user_metadata?.username || currentUser?.email?.split("@")[0] || "onyx";
                const encoded = btoa(data.url).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
                const shareUrl = `${window.location.origin}/preview/${encoded}?ref=${encodeURIComponent(username)}`;
                navigator.clipboard.writeText(shareUrl).catch(() => {
                  const ta = document.createElement("textarea");
                  ta.value = shareUrl; ta.style.position = "fixed"; ta.style.opacity = "0";
                  document.body.appendChild(ta); ta.focus(); ta.select();
                  document.execCommand("copy"); document.body.removeChild(ta);
                });
                setSavedMsg("Share link copied!");
              } catch(e) {
                setSavedMsg("Share failed");
                console.error("[Share]", e);
              }
            }}
          isPlaying={isPlaying} onPlayPause={() => setIsPlaying(p=>!p)}
          activeMode={activeMode} setActiveMode={setActiveMode}
        />

        <div style={{ flex: 1, display: "flex", minHeight: 0, overflow: "hidden" }}>
          {/* Sidebar */}
          <Sidebar open={sidebarOpen} activeTab={activeMenu} setActiveTab={setActiveMenu}>
            {activeMenu==="storyboard" && <Safe name="StoryboardPanel"><StoryboardPanel scenes={scenes} activeScene={activeScene} setActiveScene={setActiveScene} updateScenes={setScenes} onSaveScene={() => saveNow()} onGenerateScene={() => {}}/></Safe>}
            {activeMenu==="visuals"    && <Safe name="VisualsPanel"><VisualsPanel
              tab={visualsTab} setTab={setVisualsTab}
              scenes={scenes} activeScene={activeScene}
              activeSceneObj={scenes.find(s => s.id === activeScene) || null}
              onUpdateScene={updateScene}
              onSelect={item => updateScene(activeScene, { mediaUrl: item.url || item.mediaUrl, thumbnail: item.thumbnail || item.thumb || item.url })}
              onUseAiStudioItem={item => updateScene(activeScene, { mediaUrl: item.url, thumbnail: item.thumbnail })}
              aiStudioItems={aiStudioItems}
              apiBase=""
              libraryKey={reelId || "default"}
            /></Safe>}
            {activeMenu==="audio"      && <Safe name="AudioPanel"><AudioPanel
              tab={audioTab} setTab={setAudioTab}
              scenes={scenes} activeScene={activeScene} setScenes={handleSetScenes}
              musicUrl={globalMusicUrl} setMusicUrl={setGlobalMusicUrl}
              globalMusicUrl={globalMusicUrl} setGlobalMusicUrl={setGlobalMusicUrl}
              globalMusicName={globalMusicName} setGlobalMusicName={setGlobalMusicName}
              voiceoverVolume={voiceoverVolume} setVoiceoverVolume={setVoiceoverVolume}
              musicVolume={musicVolume} setMusicVolume={setMusicVolume}
              onUpdateScene={updateScene} onRegenerateAllVO={() => {}}
              creditBalance={creditBalance} currentUser={currentUser} brand={brand}
            /></Safe>}
            {activeMenu==="text"       && <Safe name="TextPanel"><TextPanel scenes={scenes} activeScene={activeScene} onUpdateScene={updateScene}/></Safe>}
            {activeMenu==="elements"   && <Safe name="ElementsPanel"><ElementsPanel scenes={scenes} activeScene={activeScene} onUpdateScene={updateScene}/></Safe>}
            {activeMenu==="styles"     && <Safe name="StylesPanel"><StylesPanel scenes={scenes} activeScene={activeScene} onUpdateScene={updateScene}/></Safe>}
            {activeMenu==="branding"   && <Safe name="BrandingPanel">
              <div style={{ padding: "16px 12px", display: "flex", flexDirection: "column", gap: 12, height: "100%", overflowY: "auto" }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "1.5px" }}>Brand Kit</div>
                {brands.length === 0 ? (
                  <div style={{ fontSize: 12, color: "#475569", textAlign: "center", padding: "16px 0" }}>
                    No brands set up yet.<br />
                    <a href="/branding" style={{ color: "#7c3aed", fontSize: 12, marginTop: 8, display: "inline-block" }}>Create a brand →</a>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {brands.map(b => {
                      const isActive = selectedBrandId === b.id;
                      return (
                        <div key={b.id} onClick={() => { setSelectedBrandId(b.id); setBrand(prev => ({ ...prev, ...b })); }} style={{
                          padding: "10px 12px", borderRadius: 8, cursor: "pointer",
                          background: isActive ? "rgba(124,58,237,0.15)" : "#111827",
                          border: isActive ? "1px solid rgba(124,58,237,0.4)" : "1px solid #1f2937",
                          display: "flex", alignItems: "center", gap: 8,
                        }}>
                          <div style={{ width: 10, height: 10, borderRadius: "50%", background: b.primary_color || "#6366f1", flexShrink: 0 }} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 12, fontWeight: 600, color: isActive ? "#a78bfa" : "#e2e8f0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {b.brand_label || b.brand_name || "Unnamed"}
                            </div>
                            {b.is_default && <div style={{ fontSize: 9, color: "#4ade80", fontWeight: 700 }}>★ DEFAULT</div>}
                          </div>
                          {isActive && <span style={{ color: "#a78bfa", fontSize: 14 }}>✓</span>}
                        </div>
                      );
                    })}
                  </div>
                )}
                <a href="/branding" style={{
                  display: "block", padding: "8px 12px", borderRadius: 6, fontSize: 11, fontWeight: 600,
                  textAlign: "center", textDecoration: "none",
                  background: "transparent", border: "1px dashed #2b3442", color: "#7c3aed", marginTop: 4,
                }}>✏️ Edit Brands →</a>
                {selectedBrandId && brand.default_avatar_id && (
                  <div style={{ padding: "8px 10px", borderRadius: 6, fontSize: 11, color: "#fbbf24", background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.2)" }}>
                    ⚡ This brand uses an avatar preset. Credits will be charged per scene when rendered.
                  </div>
                )}
                {selectedBrandId && brand.default_voice_provider === "elevenlabs" && (
                  <div style={{ padding: "8px 10px", borderRadius: 6, fontSize: 11, color: "#fbbf24", background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.2)" }}>
                    ⚡ This brand uses a premium voice. Credits will be charged per scene when rendered.
                  </div>
                )}
              </div>
            </Safe>}
            {activeMenu==="avatar"     && <Safe name="AvatarPanel"><AvatarPanel
              scenes={scenes} setScenes={setScenes}
              activeScene={activeScene}
              reelVideoUrl={reelVideoUrl}
            /></Safe>}
          </Sidebar>

          {/* Preview */}
          <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
            <PreviewCanvas
              scenes={scenes} activeScene={activeScene} setActiveScene={setActiveScene}
              isPlaying={isPlaying} playhead={playhead} totalSec={totalSec||1}
              onSeek={t => dispatch({type:"SEEK",time:Math.max(0,t)})}
              onPlayPause={() => setIsPlaying(p=>!p)}
              ratio={ratio}
            />
            {/* Scene strip — centered filmstrip below preview */}
            {scenes.length > 0 && (() => {
              const [rW, rH] = (RATIOS[ratio]?.css || "9/16").split("/").map(Number);
              const cardH = 48;
              const cardW = Math.max(27, Math.round(cardH * rW / rH));
              return (
                <div ref={stripRef} style={{
                  height: 64, flexShrink: 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  padding: "0 16px", overflowX: "auto",
                  background: "rgba(0,0,0,0.45)",
                  borderTop: "0.5px solid rgba(255,255,255,0.07)",
                  borderBottom: "0.5px solid rgba(255,255,255,0.07)",
                  scrollbarWidth: "none",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
                    {scenes.map((s, i) => {
                      const active = s.id === activeScene;
                      return (
                        <div key={s.id} data-scene-id={s.id} ref={el => { if (el) cardRefs.current[s.id] = el; else delete cardRefs.current[s.id]; }} onClick={() => setActiveScene(s.id)}
                          style={{
                            width: cardW, height: cardH, flexShrink: 0,
                            borderRadius: 5, overflow: "hidden", cursor: "pointer",
                            border: active ? "1.5px solid #4dd0ff" : "0.5px solid rgba(255,255,255,0.12)",
                            background: s.thumbnail ? `url(${s.thumbnail}) center/cover no-repeat` : `linear-gradient(135deg,hsl(${200 + i * 22},45%,22%),hsl(${215 - i * 8},35%,10%))`,
                            position: "relative",
                            boxShadow: active ? "0 0 0 2px rgba(77,208,255,0.22), 0 2px 10px rgba(0,0,0,0.7)" : "0 1px 5px rgba(0,0,0,0.55)",
                            transition: "border-color 0.15s, box-shadow 0.15s",
                          }}>
                          <div style={{ position: "absolute", inset: 0, background: active ? "rgba(77,208,255,0.1)" : "rgba(0,0,0,0.18)" }}/>
                          <div style={{ position: "absolute", bottom: 2, left: 3, fontSize: 8, fontFamily: "monospace", color: "rgba(255,255,255,0.85)", fontWeight: 700, lineHeight: 1 }}>
                            {String(i + 1).padStart(2, "0")}
                          </div>
                        </div>
                      );
                    })}
                    <div onClick={() => window.dispatchEvent(new CustomEvent("onyx-add-scene"))}
                      style={{
                        width: Math.max(cardW, 32), height: cardH, flexShrink: 0,
                        borderRadius: 5, border: "1px dashed rgba(255,255,255,0.15)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        cursor: "pointer", background: "rgba(255,255,255,0.02)",
                      }}>
                      <Glyph name="plus" size={14} color="rgba(255,255,255,0.3)"/>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Inspector toggle tab */}
          <div onClick={() => setInspectorOpen(p => !p)} style={{
            width: 16, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", background: "var(--panel-bg,rgba(6,9,15,0.5))",
            borderLeft: "0.5px solid var(--onyx-hairline-strong,rgba(255,255,255,0.14))",
            color: "var(--onyx-text-faint,rgba(241,245,251,0.40))", fontSize: 10,
            userSelect: "none",
          }} title={inspectorOpen ? "Hide inspector (])" : "Show inspector (])"}>
            {inspectorOpen ? "›" : "‹"}
          </div>

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
              onSeek={p => {
                const t = p * totalSec;
                dispatch({ type: "SEEK", time: t });
                // If playing, restart the play clock from the new position so the tick stays in sync
                if (playStartRef.current) {
                  playStartRef.current = { wallTime: performance.now() / 1000, playheadAtStart: t };
                }
                // Brief seek lock to prevent double-fire jitter (but don't suppress if playing)
                seekingRef.current = true;
                setTimeout(() => { seekingRef.current = false; }, 80);
              }}
            />
          </Safe>
        </div>
      </div>

      {ytModalOpen && <YouTubePublishModal onClose={() => setYtModalOpen(false)} scenes={scenes} title={title}/>}
    </div>
  );
}
