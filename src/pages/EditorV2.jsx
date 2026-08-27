// EditorV2.jsx — Hybrid NLE Editor
// Preview-first + Classic NLE, Onyx design system, theme switcher, all 3 ratios

import React, {
  useReducer, useState, useEffect, useCallback, useRef, useMemo,
} from "react";
import { timelineReducer, makeInitialState, makeClip, importFromScenes, rangesOverlapDuration } from "../reducers/timelineReducer.js";
import { supabase } from "../supabaseClient.js";
import { getAuthHeaders } from "../utils/auth.js";
import { generateReelTitle } from "../utils/autoTitle.js";
import { usePlayheadTicker } from "../hooks/usePlayheadTicker.js";
import "../styles/editor.css";

import SequencerPanel   from "../components/SequencerPanel.jsx";
import StoryboardPanel  from "../components/StoryboardPanel.jsx";
import VisualsPanel     from "../components/VisualsPanel.jsx";
import StylesPanel      from "../components/StylesPanel.jsx";
import TextPanel        from "../components/TextPanel.jsx";
import BrollPanel       from "../components/BrollPanel.jsx";
import ElementsPanel    from "../components/ElementsPanel.jsx";
import TransitionsPanel from "../components/TransitionsPanel.jsx";
import YouTubePublishModal from "../components/YouTubePublishModal.jsx";
import ExportUpgradeModal from "../components/ExportUpgradeModal.jsx";
import AudioPanel from "../components/AudioPanelBoundary.jsx";
import VoiceOverPanel from "../components/VoiceOverPanel.jsx";
import SfxPanel from "../components/SfxPanel.jsx";
import AssetsLibraryPanel from "../components/AssetsLibraryPanel.jsx";
import AvatarPanel from "../components/AvatarPanel.jsx";
import BrandingPanel from "../components/BrandingPanel.jsx";
import HelpTooltip from "../components/HelpTooltip.jsx";
import ChatBot from "../components/ChatBot.jsx";
import Toast from "../components/Toast.jsx";
import { useToast } from "../state/useToast.jsx";
import { bucketFilesByAssetType } from "../utils/mediaType.js";
import SafeZoneOverlay from "../components/SafeZoneOverlay.jsx";

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

// Dashboard renders thumbnail_url in a plain <img>, which silently shows
// nothing for a video file -- but every thumbnailUrl fallback chain in this
// file ends with "|| scene.mediaUrl", which is a video URL for any scene
// built via Stock-mode direct-URL-paste or AI generation (only Pexels search
// results populate a real stockThumb image). Confirmed live 2026-08-20: every
// reel built by paste-URL today saved a .mp4 as its thumbnail_url and showed
// blank in the dashboard grid. A reel with no real image thumbnail should
// fall through to the dashboard's existing "No preview" placeholder instead
// of a broken image, so the mediaUrl fallback is only used when it's not
// itself a video.
function isLikelyVideoUrl(u) {
  if (!u) return true;
  if (/^https:\/\/api\.sync\.so\//i.test(u)) return true;
  const ext = u.split("?")[0].split(".").pop().toLowerCase();
  return ["mp4", "webm", "mov", "m4v"].includes(ext);
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

// Real union of every model's supported aspect ratios (see backend
// VIDEO_MODELS' aspectRatio specs) -- "4:5" dropped since no model actually
// supports it; "21:9"/"4:3"/"3:4" added since Seedance 1 Pro/2.0 and
// wan-2.7 genuinely support them.
const RATIOS = {
  "9:16": { label: "9:16", css: "9/16",  icon: "▯" },
  "16:9": { label: "16:9", css: "16/9",  icon: "▭" },
  "1:1":  { label: "1:1",  css: "1/1",   icon: "□" },
  "4:3":  { label: "4:3",  css: "4/3",   icon: "▭" },
  "3:4":  { label: "3:4",  css: "3/4",   icon: "▮" },
  "21:9": { label: "21:9", css: "21/9",  icon: "▬" },
};

const ratioStyles = {
  "9:16": { width: "auto", height: "100%", aspectRatio: "9/16" },
  "3:4":  { width: "auto", height: "100%", aspectRatio: "3/4"  },
  "1:1":  { width: "min(100%,100vh)", height: "min(100%,100vw)", aspectRatio: "1/1" },
  "16:9": { width: "100%", height: "auto", aspectRatio: "16/9" },
  "4:3":  { width: "100%", height: "auto", aspectRatio: "4/3"  },
  "21:9": { width: "100%", height: "auto", aspectRatio: "21/9" },
};

const SIDEBAR_TABS = [
  { key: "storyboard",  label: "Scenes",      icon: "storyboard"  },
  { key: "visuals",     label: "Media",        icon: "media"       },
  { key: "audio",       label: "Audio",        icon: "audio"       },
  { key: "voiceover",   label: "Voice Over",   icon: "voiceover"   },
  { key: "sfx",         label: "SFX",          icon: "sfx"         },
  { key: "library",     label: "Library",      icon: "library"     },
  { key: "text",        label: "Text",         icon: "text"        },
  { key: "broll",       label: "B-Roll",       icon: "broll"       },
  { key: "elements",    label: "FX",           icon: "fx"          },
  { key: "transitions", label: "Transitions",  icon: "transitions" },
  { key: "branding",    label: "Brand",        icon: "brand"       },
  { key: "avatar",      label: "Avatar",       icon: "avatar"      },
];

const EDITOR_ICONS = {
  storyboard:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>`,
  media:       `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m10 9 5 3-5 3V9z"/></svg>`,
  audio:       `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>`,
  voiceover:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3z"/><path d="M5 11a7 7 0 0 0 14 0"/><path d="M12 18v3"/></svg>`,
  sfx:         `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M11 5 6 9H2v6h4l5 4V5z"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>`,
  library:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>`,
  text:        `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 7V4h16v3"/><path d="M9 20h6"/><path d="M12 4v16"/></svg>`,
  broll:       `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="6" width="14" height="12" rx="1.5"/><path d="M16 10.5 21.5 7v10L16 13.5"/></svg>`,
  fx:          `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3z"/></svg>`,
  transitions: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M5 12h14"/><path d="m15 6 6 6-6 6"/><path d="M3 6v12"/></svg>`,
  brand:       `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="m2 17 10 5 10-5"/><path d="m2 12 10 5 10-5"/></svg>`,
  avatar:      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>`,
};

const EditorIcon = ({ name, size = 20 }) => (
  <span style={{ width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
    dangerouslySetInnerHTML={{ __html: EDITOR_ICONS[name] || '' }} />
);

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
    save:    "M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2zM17 21v-8H7v8M7 3v5h8",
    grade:   "M12 2a10 10 0 100 20A10 10 0 0012 2zM12 2v20",
    folder:  "M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2z",
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
function Toolbar({ title, onTitleChange, saved, theme, onThemeToggle, onExport, onShare, onPublish, onSave, onAddScene, toast }) {
  const [editing, setEditing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const uploadInputRef = useRef(null);

  const handleUploadPicked = async (files) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const headers = await getAuthHeaders();
      for (const [group, assetType] of bucketFilesByAssetType(Array.from(files))) {
        if (!group.length) continue;
        const form = new FormData();
        for (const file of group) form.append("files", file);
        form.append("assetType", assetType);

        const res = await fetch("/api/media/upload", { method: "POST", headers, body: form });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json?.error || `Upload failed (${res.status})`);
      }
    } catch (e) {
      toast?.show?.(e?.message || "Upload failed", "error");
    } finally {
      setUploading(false);
      if (uploadInputRef.current) uploadInputRef.current.value = "";
    }
  };

  return (
    <div style={{
      height: 52, flexShrink: 0, display: "flex", alignItems: "center",
      padding: "0 14px", gap: 10,
      borderBottom: "0.5px solid var(--onyx-hairline-strong, rgba(255,255,255,0.14))",
      background: "var(--toolbar-bg, rgba(6,9,15,0.85))",
      backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)",
      position: "relative", zIndex: 100,
    }}>
      <button onClick={() => { window.location.href = '/dashboard'; }} style={{ background: "none", border: "none", color: "var(--onyx-text-dim,rgba(241,245,251,0.62))", cursor: "pointer", padding: 4, borderRadius: 6, display: "flex" }}>
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
      {saved && <span style={{ fontSize: 12, fontWeight: 600, color: saved.startsWith("✗") ? "#ff6b6b" : saved.startsWith("✓") || saved === "Saved" ? "#4dd0ff" : "var(--onyx-text-dim)", background: "rgba(255,255,255,0.06)", border: "0.5px solid rgba(255,255,255,0.1)", borderRadius: 6, padding: "3px 9px", whiteSpace: "nowrap" }}>{saved}</span>}

      {/* Add Scene */}
      <button onClick={onAddScene} style={{ background: "linear-gradient(180deg,#5edcff,#2db8ee)", border: "0.5px solid rgba(255,255,255,0.45)", borderRadius: 7, padding: "5px 11px", cursor: "pointer", color: theme === "opal" ? "#ffffff" : "#06121b", fontWeight: 600, fontSize: 11.5, fontFamily: "inherit", display: "flex", alignItems: "center", gap: 5, boxShadow: "0 1px 0 rgba(255,255,255,0.4) inset,0 3px 10px rgba(77,208,255,0.25)" }}>
        + Add Scene
      </button>

      {/* Upload */}
      <input
        ref={uploadInputRef}
        type="file"
        multiple
        accept=".jpg,.jpeg,.png,.apng,.mp4,.mov,.webm,.m4v,.mp3,.wav,image/jpeg,image/png,image/apng,video/*,audio/mpeg,audio/wav"
        style={{ display: "none" }}
        onChange={(e) => handleUploadPicked(e.target.files)}
      />
      <button onClick={() => uploadInputRef.current?.click()} disabled={uploading} style={{ background: "linear-gradient(180deg,#5edcff,#2db8ee)", border: "0.5px solid rgba(255,255,255,0.45)", borderRadius: 7, padding: "5px 11px", cursor: uploading ? "default" : "pointer", opacity: uploading ? 0.6 : 1, color: theme === "opal" ? "#ffffff" : "#06121b", fontWeight: 600, fontSize: 11.5, fontFamily: "inherit", display: "flex", alignItems: "center", gap: 5, boxShadow: "0 1px 0 rgba(255,255,255,0.4) inset,0 3px 10px rgba(77,208,255,0.25)" }}>
        {uploading ? "Uploading…" : "Upload"}
      </button>

      <div style={{ flex: 1 }}/>

      {/* Theme toggle */}
      <button onClick={onThemeToggle} style={{ background: "var(--chip-bg,rgba(255,255,255,0.06))", border: "0.5px solid var(--onyx-hairline-strong,rgba(255,255,255,0.14))", borderRadius: 8, padding: "5px 10px", cursor: "pointer", color: "var(--onyx-text-dim)", fontSize: 11, fontFamily: "inherit", display: "flex", alignItems: "center", gap: 5 }}>
        <Glyph name={theme === "onyx" ? "sun" : "moon"} size={12} color="var(--onyx-cyan,#4dd0ff)"/>
        {theme === "onyx" ? "Opal" : "Onyx"}
      </button>

      {/* Save */}
      <button onClick={onSave} style={{ background: "var(--chip-bg,rgba(255,255,255,0.06))", border: "0.5px solid var(--onyx-hairline-strong,rgba(255,255,255,0.14))", borderRadius: 8, padding: "6px 13px", cursor: "pointer", color: "var(--onyx-text,#f1f5fb)", fontWeight: 600, fontSize: 12.5, fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6 }}>
        <Glyph name="save" size={13} color="var(--onyx-cyan,#4dd0ff)"/> Save
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
      <button onClick={onExport} style={{ background: "linear-gradient(180deg,#5edcff,#2db8ee)", border: "0.5px solid rgba(255,255,255,0.45)", borderRadius: 8, padding: "6px 14px", cursor: "pointer", color: theme === "opal" ? "#ffffff" : "#06121b", fontWeight: 600, fontSize: 12.5, fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6, boxShadow: "0 1px 0 rgba(255,255,255,0.4) inset,0 4px 14px rgba(77,208,255,0.35)" }}>
        <Glyph name="download" size={13} color={theme === "opal" ? "#ffffff" : "#06121b"}/> Export
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
        {SIDEBAR_TABS.map((t, idx) => (
          <button key={t.key} onClick={() => setActiveTab(t.key)} title={t.label}
            style={{ width: 36, height: 36, borderRadius: 8, border: "none", cursor: "pointer", background: activeTab === t.key ? "var(--chip-bg-strong,rgba(255,255,255,0.08))" : "transparent", color: activeTab === t.key ? "var(--onyx-cyan,#4dd0ff)" : "var(--onyx-text-faint,rgba(241,245,251,0.40))", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2, fontSize: 14 }}>
            <EditorIcon name={t.icon} />
          </button>
        ))}
      </div>
      {open && <div style={{ marginLeft: 48, width: "calc(100% - 48px)", overflowY: "auto", overflowX: "hidden" }}>{children}</div>}
    </div>
  );
}

// ── Preview transition helper ────────────────────────────────────────────────
function applyTransition(type, cur, nxt, onDone) {
  const typeMap = {
    crossfade: 'fade',
    slideLeft: 'slide', slideRight: 'slide',
    zoomIn: 'zoom', zoomOut: 'zoom',
    dissolve: 'fade', blur: 'fade', flash: 'fade',
    spin: 'zoom', push: 'slide', wipe: 'slide',
    'slide-left': 'slide', 'slide-right': 'slide',
    'zoom-in': 'zoom', 'zoom-out': 'zoom',
  };
  type = typeMap[type] || type;

  const DUR = 0.5;
  nxt.style.visibility = "visible";
  nxt.style.transform = "";
  cur.style.transform = "";

  if (type === "cut") {
    nxt.style.opacity = "1";
    nxt.style.transition = "";
    cur.style.visibility = "hidden";
    cur.style.opacity = "0";
    cur.style.transition = "";
    onDone();
    return;
  }
  if (type === "slide") {
    nxt.style.opacity = "1";
    nxt.style.transform = "translateX(100%)";
    nxt.style.transition = "";
    cur.style.transition = "";
    requestAnimationFrame(() => {
      nxt.style.transition = `transform ${DUR}s ease`;
      nxt.style.transform = "translateX(0)";
      cur.style.transition = `transform ${DUR}s ease`;
      cur.style.transform = "translateX(-100%)";
      setTimeout(() => {
        cur.style.visibility = "hidden";
        cur.style.opacity = "0";
        cur.style.transform = "";
        cur.style.transition = "";
        nxt.style.transform = "";
        nxt.style.transition = "";
        onDone();
      }, DUR * 1000 + 30);
    });
    return;
  }
  if (type === "zoom") {
    nxt.style.opacity = "0";
    nxt.style.transition = "";
    cur.style.transition = "";
    requestAnimationFrame(() => {
      cur.style.transition = `transform ${DUR}s ease, opacity ${DUR}s ease`;
      const scaleOut = type === 'zoomOut' ? 0.85 : 1.15;
      cur.style.transform = `scale(${scaleOut})`;
      cur.style.opacity = "0";
      nxt.style.transition = `opacity ${DUR}s ease`;
      nxt.style.opacity = "1";
      setTimeout(() => {
        cur.style.visibility = "hidden";
        cur.style.opacity = "0";
        cur.style.transform = "";
        cur.style.transition = "";
        nxt.style.transition = "";
        onDone();
      }, DUR * 1000 + 30);
    });
    return;
  }
  // fade (default)
  nxt.style.opacity = "0";
  requestAnimationFrame(() => {
    nxt.style.transition = `opacity ${DUR}s ease`;
    nxt.style.opacity = "1";
    cur.style.transition = `opacity ${DUR}s ease`;
    cur.style.opacity = "0";
    setTimeout(() => {
      cur.style.visibility = "hidden";
      cur.style.opacity = "0";
      cur.style.transition = "";
      nxt.style.transition = "";
      onDone();
    }, DUR * 1000 + 30);
  });
}

// ── Preview canvas ────────────────────────────────────────────────────────────
function PreviewCanvas({ scenes, activeScene, setActiveScene, isPlaying, livePlayheadRef, checkpointPlayhead, totalSec, onSeek, onPlayPause, ratio, captionsVisible, brand, tracks, onFxUpdate, onFxDragEnd, onBrollUpdate, onBrollDragEnd, selectedClipId, onSelectClip, uploadImgRef, uploadVideoRef, brollImgRef, brollVideoRef, brollWrapperRef, theme, safeZonePlatform, onSplit, onOpenVoiceOver, onOpenMusic, onOpenAI }) {
  // Live 60fps value during playback (see usePlayheadTicker) -- reads
  // livePlayheadRef, which EditorV2's master rAF clock updates every frame.
  // timelineState.playhead itself is now only updated at checkpoints
  // (seek/play-start/pause/loop-wrap), not every frame, so this hook is what
  // lets the progress bar and caption sync keep updating smoothly during
  // playback without EditorV2 or SequencerPanel re-rendering on every tick.
  const playhead = usePlayheadTicker(livePlayheadRef, isPlaying, checkpointPlayhead);
  const activeIdx = scenes.findIndex(s => s.id === activeScene);
  const scene = scenes[activeIdx >= 0 ? activeIdx : 0] || null;

  // Caption scene — derived from playhead position, not activeScene (which lags during playback)
  const captionScene = React.useMemo(() => {
    if (!tracks?.length) return scene;
    const videoTrack = tracks.find(t => t.key === "video");
    if (!videoTrack?.clips?.length) return scene;
    const clip = videoTrack.clips.find(c =>
      playhead >= c.startTime && playhead < c.startTime + (c.trimEnd - c.trimStart)
    );
    if (!clip?.sceneId) return scene;
    return scenes.find(s => s.id === clip.sceneId) || scene;
  }, [playhead, tracks, scenes, scene]);
  const cssRatio = RATIOS[ratio]?.css || "9/16";
  const progress = totalSec > 0 ? (playhead / totalSec) * 100 : 0;

  // id of the broll clip whose real media dimensions are now known (set by
  // measureWrapperFromImg/Video below, once onLoad/onLoadedMetadata fires).
  // Gates the enter/exit animation on a freshly-activated clip so it never
  // starts mid-flight against the wrapper's 16:9 placeholder aspectRatio —
  // see the flash-at-rest-position bug this fixes, documented below.
  const [brollReadyId, setBrollReadyId] = useState(null);

  // ── FX interactive state ──────────────────────────────────────────────────
  const frameRef     = useRef(null);
  const fxDragRef    = useRef(null); // { type:"move"|"resize", clipId, startX, startY, startXPct, startYPct, startSizePct }
  // Parallel, separate drag state for B-roll position/size — deliberately not
  // sharing fxDragRef/handleFxMouseMove so fx-specific code stays untouched.
  const brollDragRef = useRef(null); // { type:"move"|"resize", clipId, startX, startY, startXPct, startYPct, startSizePct }
  const avatarVideoRef    = useRef(null);
  const avatarCanvasRef   = useRef(null);
  const avatarOffscreenRef = useRef(null);
  const avatarRafRef      = useRef(null);

  // Chroma-key (green-screen removal) applied per-pixel to a downscaled offscreen
  // canvas, then composited onto the visible canvas with object-fit math — this is
  // what makes the live preview match ffmpeg's colorkey/overlay export.
  function chromaKeyFrame(imageData, threshold = 90, smoothing = 30) {
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i], g = data[i + 1], b = data[i + 2];
      const diff = g - Math.max(r, b);
      if (diff > threshold) {
        data[i + 3] = 0;
      } else if (diff > threshold - smoothing) {
        const alpha = 1 - (diff - (threshold - smoothing)) / smoothing;
        data[i + 3] = Math.round(data[i + 3] * alpha);
        data[i + 1] = Math.min(g, (r + b) / 2); // despill
      }
    }
  }

  function drawAvatarFrame(fit) {
    const video  = avatarVideoRef.current;
    const canvas = avatarCanvasRef.current;
    if (!video || !canvas || video.readyState < 2 || !video.videoWidth) return;

    if (!avatarOffscreenRef.current) avatarOffscreenRef.current = document.createElement("canvas");
    const off = avatarOffscreenRef.current;

    const maxDim = 480;
    const scale = Math.min(1, maxDim / Math.max(video.videoWidth, video.videoHeight));
    const ow = Math.max(1, Math.round(video.videoWidth * scale));
    const oh = Math.max(1, Math.round(video.videoHeight * scale));
    if (off.width !== ow || off.height !== oh) { off.width = ow; off.height = oh; }
    const offCtx = off.getContext("2d", { willReadFrequently: true });
    offCtx.drawImage(video, 0, 0, ow, oh);

    // If the source lacks CORS headers, getImageData throws (tainted canvas) —
    // fall back to the un-keyed frame rather than breaking the draw loop.
    try {
      const imageData = offCtx.getImageData(0, 0, ow, oh);
      chromaKeyFrame(imageData);
      offCtx.putImageData(imageData, 0, 0);
    } catch (_e) {}

    const rect = canvas.getBoundingClientRect();
    const dpr  = window.devicePixelRatio || 1;
    const cw   = Math.max(1, Math.round(rect.width  * dpr));
    const ch   = Math.max(1, Math.round(rect.height * dpr));
    if (canvas.width !== cw || canvas.height !== ch) { canvas.width = cw; canvas.height = ch; }
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    let sx = 0, sy = 0, sw = ow, sh = oh, dx = 0, dy = 0, dw = canvas.width, dh = canvas.height;
    if (fit === "cover") {
      const scaleCover = Math.max(canvas.width / ow, canvas.height / oh);
      sw = canvas.width / scaleCover;
      sh = canvas.height / scaleCover;
      sx = (ow - sw) / 2;
      sy = (oh - sh) / 2;
    } else {
      const scaleContain = Math.min(canvas.width / ow, canvas.height / oh);
      dw = ow * scaleContain;
      dh = oh * scaleContain;
      dx = (canvas.width - dw) / 2;
      dy = (canvas.height - dh) / 2;
    }
    ctx.drawImage(off, sx, sy, sw, sh, dx, dy, dw, dh);
  }

  function fxGridToPercent(pos) {
    const [v, h] = (pos || "middle-center").split("-");
    return {
      x: h === "left" ? 15 : h === "right" ? 85 : 50,
      y: v === "top"  ? 15 : v === "bottom" ? 85 : 50,
    };
  }

  function fxSizePct(clip) {
    if (clip.sizePct != null) return clip.sizePct;
    const canvasW = frameRef.current?.getBoundingClientRect().width || 300;
    const px = clip.elementType === "emoji" ? (clip.size || 48) : (clip.size || 80);
    return Math.max(3, (px / canvasW) * 100);
  }

  function handleFxMouseMove(e) {
    if (!fxDragRef.current || !frameRef.current) return;
    const { type, clipId, startX, startY, startXPct, startYPct, startSizePct } = fxDragRef.current;
    const rect = frameRef.current.getBoundingClientRect();
    const dx = ((e.clientX - startX) / rect.width)  * 100;
    const dy = ((e.clientY - startY) / rect.height) * 100;
    if (type === "move") {
      onFxUpdate?.(clipId, {
        xPct: Math.max(3, Math.min(97, startXPct + dx)),
        yPct: Math.max(3, Math.min(97, startYPct + dy)),
      });
    } else {
      const delta = (Math.abs(dx) > Math.abs(dy) ? dx : dy);
      const newSizePct = Math.max(3, Math.min(80, startSizePct + delta));
      fxDragRef.current.currentSizePct = newSizePct;
      onFxUpdate?.(clipId, { sizePct: newSizePct });
    }
  }

  function handleFxMouseUp() {
    if (fxDragRef.current) {
      const { type, clipId, startXPct, startYPct, startSizePct, currentSizePct } = fxDragRef.current;
      if (type === "resize") {
        onFxUpdate?.(clipId, {
          sizePct: currentSizePct ?? startSizePct,
          xPct: startXPct,
          yPct: startYPct,
        });
      }
      onFxDragEnd?.();
    }
    fxDragRef.current = null;
  }

  // ── B-roll interactive state (Stage 1: position/size only, no animation) ──
  function activeBrollClip() {
    const brollTrack = tracks?.find(t => t.key === "broll");
    if (!brollTrack?.clips?.length) return null;
    return brollTrack.clips.find(c =>
      playhead >= (c.startTime||0) && playhead < (c.startTime||0)+((c.trimEnd||c.duration||3)-(c.trimStart||0))
    ) || null;
  }

  function handleBrollMouseMove(e) {
    if (!brollDragRef.current || !frameRef.current) return;
    const { type, clipId, startX, startY, startXPct, startYPct, startSizePct } = brollDragRef.current;
    const rect = frameRef.current.getBoundingClientRect();
    const dx = ((e.clientX - startX) / rect.width)  * 100;
    const dy = ((e.clientY - startY) / rect.height) * 100;
    if (type === "move") {
      onBrollUpdate?.(clipId, {
        xPct: Math.max(3, Math.min(97, startXPct + dx)),
        yPct: Math.max(3, Math.min(97, startYPct + dy)),
      });
    } else {
      const delta = (Math.abs(dx) > Math.abs(dy) ? dx : dy);
      const newSizePct = Math.max(10, Math.min(100, startSizePct + delta));
      brollDragRef.current.currentSizePct = newSizePct;
      onBrollUpdate?.(clipId, { sizePct: newSizePct });
    }
  }

  function handleBrollMouseUp() {
    if (brollDragRef.current) {
      const { type, clipId, startXPct, startYPct, startSizePct, currentSizePct } = brollDragRef.current;
      if (type === "resize") {
        onBrollUpdate?.(clipId, {
          sizePct: currentSizePct ?? startSizePct,
          xPct: startXPct,
          yPct: startYPct,
        });
      }
      onBrollDragEnd?.();
    }
    brollDragRef.current = null;
  }

  // ── Avatar video sync ─────────────────────────────────────────────────────
  useEffect(() => {
    const v = avatarVideoRef.current;
    if (!v) return;
    if (isPlaying) v.play().catch(() => {});
    else v.pause();
  }, [isPlaying]);

  useEffect(() => {
    const v = avatarVideoRef.current;
    if (!v) return;
    v.currentTime = 0;
    if (isPlaying) v.play().catch(() => {});
  }, [captionScene?.avatar_video_url]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep the canvas's CSS aspect-ratio matched to the avatar video's native
  // dimensions so "contain" placements (bottom-left/right/center) size correctly.
  useEffect(() => {
    const video  = avatarVideoRef.current;
    const canvas = avatarCanvasRef.current;
    if (!video || !canvas) return;
    function setAspect() {
      if (video.videoWidth && video.videoHeight) {
        canvas.style.aspectRatio = `${video.videoWidth} / ${video.videoHeight}`;
      }
    }
    video.addEventListener("loadedmetadata", setAspect);
    setAspect();
    return () => video.removeEventListener("loadedmetadata", setAspect);
  }, [captionScene?.avatar_video_url]);

  // RAF loop: continuously draws the chroma-keyed avatar frame into the canvas.
  useEffect(() => {
    if (!captionScene?.avatar_video_url) return;
    const isSide = captionScene.avatar_position === "left" || captionScene.avatar_position === "right";
    const fit = isSide ? "cover" : "contain";

    function loop() {
      drawAvatarFrame(fit);
      avatarRafRef.current = requestAnimationFrame(loop);
    }
    avatarRafRef.current = requestAnimationFrame(loop);
    return () => {
      if (avatarRafRef.current) cancelAnimationFrame(avatarRafRef.current);
    };
  }, [captionScene?.avatar_video_url, captionScene?.avatar_position]);

  return (
    <div style={{
      flex: 1, minWidth: 0, display: "flex", flexDirection: "column",
      background: theme === "opal" ? "linear-gradient(180deg,#e8f4fb,#f5faff,#eaf1f8)" : "#010306",
      overflow: "hidden", position: "relative",
    }}>
      {/* Ambient glow */}
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0,
        background: theme === "opal"
          ? "radial-gradient(ellipse 55% 55% at 50% 42%, rgba(77,208,255,0.08), transparent 70%)"
          : "radial-gradient(ellipse 55% 55% at 50% 42%, rgba(77,208,255,0.05), transparent 70%)" }}/>

      {/* Frame area — takes all space above dock */}
      <div style={{
        flex: 1, minHeight: 0, display: "flex",
        alignItems: "center", justifyContent: "center",
        padding: "12px 24px 8px", position: "relative", zIndex: 1,
      }}>
        {/* Preview frame — constrained by both axes */}
        <div
          id="onyx-preview-frame"
          ref={frameRef}
          onMouseMove={e => { handleFxMouseMove(e); handleBrollMouseMove(e); }}
          onMouseUp={() => { handleFxMouseUp(); handleBrollMouseUp(); }}
          onMouseLeave={() => { handleFxMouseUp(); handleBrollMouseUp(); }}
          onClick={() => onSelectClip?.(null)}
          style={{
            ...(ratioStyles[ratio] || ratioStyles["9:16"]),
            maxWidth: "100%",
            maxHeight: "100%",
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
          {safeZonePlatform && <SafeZoneOverlay platform={safeZonePlatform} />}
          {/* Dual-buffer with color grading — filter wrapper keeps captions/FX unaffected */}
          {(() => {
            const br  = captionScene?.brightness ?? 50;
            const con = captionScene?.contrast   ?? 50;
            const sat = captionScene?.saturation ?? 50;
            const filter = (br === 50 && con === 50 && sat === 50)
              ? "none"
              : `brightness(${br * 2}%) contrast(${con * 2}%) saturate(${sat * 2}%)`;
            return (
              <div style={{ position: "absolute", inset: 0, zIndex: 2, filter }}>
                {/* objectFit: "contain" (not "cover") so a scene whose native
                    video shape doesn't match the canvas ratio (e.g. a 9:16
                    generation viewed on a 16:9 canvas) scales to fit and
                    letterboxes/pillarboxes here exactly like render.js's own
                    ffmpeg filter (scale...force_original_aspect_ratio=decrease,
                    pad=...) -- "cover" was cropping to a small zoomed-in slice
                    of the frame instead of matching what export actually
                    produces. No JS measurement needed for this: unlike the
                    avatar/pause-frame canvases elsewhere in this file, these
                    are real <video> elements already pinned to width/height
                    100% of a fixed-ratio frame, so the browser's native
                    object-fit does the scale-to-fit-and-letterbox itself from
                    the video's own intrinsic dimensions. */}
                <video className="v2-preview-video-a"
                    style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain", zIndex: 2, visibility: "hidden" }} playsInline/>
                <video className="v2-preview-video-b"
                    style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain", zIndex: 2, visibility: "hidden" }} playsInline/>
                {/* Upload overlay elements — sit above both buffer slots */}
                <img
                  ref={uploadImgRef}
                  className="v2-preview-upload-img"
                  style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'contain', zIndex: 10, display: 'none', background: 'transparent' }}
                  alt=""
                />
                <video
                  ref={uploadVideoRef}
                  className="v2-preview-upload-video"
                  // objectFit: "contain", not "cover" -- same reasoning as
                  // the a/b crossfade slots above (and already how the
                  // sibling uploadImgRef image element right above this one
                  // behaves): "cover" crops/zooms to fill the frame instead
                  // of letterboxing, which is silently correct when a
                  // scene's native aspect happens to match the canvas but
                  // badly wrong the moment it doesn't. Confirmed live
                  // 2026-08-21: a 9:16-native reframe360 scene viewed with
                  // the canvas ratio set to 16:9 came out "oversized and
                  // unable to watch" -- a heavily cropped, zoomed-in slice
                  // instead of a clean letterboxed view.
                  style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'contain', zIndex: 10, display: 'none' }}
                  playsInline muted
                />
                {/* B-roll upload overlays — above A-roll overlays. Stage 1:
                    position/size only (no animation). Wrapper's style is
                    ONLY the custom xPct/yPct/sizePct box when all three are
                    set on the active broll clip; otherwise it's the exact
                    original top:0/left:0/100%/100% full-frame box — today's
                    behavior is unchanged unless a user actually drags/resizes. */}
                {(() => {
                  const brollActive = activeBrollClip();
                  const bXPct = brollActive?.xPct ?? 50;
                  const bYPct = brollActive?.yPct ?? 50;
                  const bSizePct = brollActive?.sizePct ?? 100;
                  const isCustom = brollActive?.xPct != null && brollActive?.yPct != null && brollActive?.sizePct != null;
                  const isSelected = !!brollActive && brollActive.id === selectedClipId;

                  // aspectRatio starts as a 16/9 placeholder (never a collapsed
                  // box, even before any metadata has ever arrived) and gets
                  // overwritten with the real ratio by onLoadedMetadata/onLoad
                  // below — driven by the media's own dimensions becoming known,
                  // not by incidental reflows from the playback tick loop. This
                  // is what actually fixes the pause-triggered collapse: the box
                  // no longer depends on the video/img's own auto-height
                  // resolution at all, so it can't get stuck stale when paused.
                  const wrapperStyle = isCustom
                    ? { position: 'absolute', left: `${bXPct}%`, top: `${bYPct}%`, width: `${bSizePct}%`, height: 'auto', aspectRatio: '16 / 9', transform: 'translate(-50%,-50%)' }
                    : { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' };

                  const corners = isSelected
                    ? [["nw",-1,-1],["ne",1,-1],["se",1,1],["sw",-1,1]].map(([k,sx,sy]) => (
                        <div key={k}
                          onMouseDown={e => {
                            e.stopPropagation();
                            brollDragRef.current = { type:"resize", clipId:brollActive.id, startX:e.clientX, startY:e.clientY, startXPct:bXPct, startYPct:bYPct, startSizePct:bSizePct };
                          }}
                          style={{
                            position:"absolute", width:10, height:10,
                            background:"#4dd0ff", borderRadius:2, zIndex:21,
                            cursor: sx===sy ? "nwse-resize" : "nesw-resize",
                            ...(sy < 0 ? {top:-5} : {bottom:-5}),
                            ...(sx < 0 ? {left:-5} : {right:-5}),
                          }}/>
                      ))
                    : null;

                  // Stage 3: enter AND exit animation preview, direction-aware for
                  // slide, mirroring render.js's own enterEnd/exitStart window math
                  // (same 40%-of-duration-capped-at-1s slideDur) so the preview and
                  // the export agree on when the transition plays, even though the
                  // preview uses CSS `ease` timing and the export uses a linear
                  // ffmpeg expression — a visual approximation, not pixel-identical.
                  const bTotalDur = brollActive ? (brollActive.trimEnd ?? brollActive.duration ?? 3) - (brollActive.trimStart ?? 0) : 0;
                  const bLocalTime = brollActive ? playhead - (brollActive.startTime || 0) : 0;
                  const bSlideDur = Math.min(bTotalDur * 0.4, 1.0);
                  const inExitWindow = isCustom && !!brollActive && bLocalTime >= (bTotalDur - bSlideDur);

                  // Gates the animation on the wrapper's real aspect ratio being
                  // known for THIS clip — until then, brollDimsReady is false and
                  // the wrapper renders hidden (see style below) instead of
                  // animating. Without this, the enter animation starts the
                  // instant the clip becomes active, using the wrapper's 16:9
                  // placeholder aspectRatio for its percentage-based
                  // translate(-50%,-50%) centering; once the real dimensions
                  // arrive (measureWrapperFromImg/Video, async — onLoad can take
                  // a while for an APNG in particular), the box's own height
                  // changes underneath the still-running animation, so the
                  // percentage-based centering recalculates mid-flight and
                  // visibly snaps to a different position — reported as
                  // "flashes at its default/reset position for a frame before
                  // finding its correct slide start position." Fast-loading
                  // assets whose real ratio is already close to 16:9 clear this
                  // gate almost immediately, so this is a no-op for them.
                  const brollDimsReady = !isCustom || !brollActive || brollReadyId === brollActive.id;

                  const activeAnim = inExitWindow ? brollActive?.exitAnim : brollActive?.enterAnim;
                  const enterAnimClass = !isCustom || !brollDimsReady ? ""
                    : activeAnim === "slide" ? (inExitWindow ? "broll-anim-slide-out" : "broll-anim-slide-in")
                    : activeAnim === "fade"  ? (inExitWindow ? "broll-anim-fade-out"  : "broll-anim-fade-in")
                    : activeAnim === "spin"  ? (inExitWindow ? "broll-anim-spin-out"  : "broll-anim-spin-in")
                    : "";

                  function slideDirectionOffset(dir) {
                    if (dir === "top")   return "translateY(-60px)";
                    if (dir === "left")  return "translateX(-60px)";
                    if (dir === "right") return "translateX(60px)";
                    return "translateY(60px)"; // "bottom" (default) — matches render.js's default
                  }
                  const activeDirection = inExitWindow ? (brollActive?.exitDirection || "bottom") : (brollActive?.enterDirection || "bottom");

                  // Reads the media's real dimensions the moment they're known
                  // and writes them straight onto the wrapper (not state — this
                  // must apply synchronously regardless of isPlaying/render
                  // timing, and re-fires on every reload, e.g. a clip change).
                  const measureWrapperFromVideo = () => {
                    const v = brollVideoRef.current;
                    if (v?.videoWidth && v?.videoHeight && brollWrapperRef.current) {
                      brollWrapperRef.current.style.aspectRatio = `${v.videoWidth} / ${v.videoHeight}`;
                      if (brollActive) setBrollReadyId(brollActive.id);
                    }
                  };
                  const measureWrapperFromImg = () => {
                    const img = brollImgRef.current;
                    if (img?.naturalWidth && img?.naturalHeight && brollWrapperRef.current) {
                      brollWrapperRef.current.style.aspectRatio = `${img.naturalWidth} / ${img.naturalHeight}`;
                      if (brollActive) setBrollReadyId(brollActive.id);
                    }
                  };

                  return (
                    <div
                      ref={brollWrapperRef}
                      className={enterAnimClass}
                      style={{
                        ...wrapperStyle, zIndex: 11,
                        outline: isSelected ? "2px solid #4dd0ff" : "2px solid transparent",
                        outlineOffset: 3, cursor: brollActive ? "move" : "default",
                        "--broll-slide-offset": slideDirectionOffset(activeDirection),
                        ...(brollDimsReady ? null : { visibility: "hidden" }),
                      }}
                      onClick={e => { if (brollActive) { e.stopPropagation(); onSelectClip?.(brollActive.id); } }}
                      onMouseDown={e => {
                        if (!brollActive) return;
                        e.stopPropagation();
                        onSelectClip?.(brollActive.id);
                        brollDragRef.current = { type:"move", clipId:brollActive.id, startX:e.clientX, startY:e.clientY, startXPct:bXPct, startYPct:bYPct, startSizePct:bSizePct };
                      }}
                    >
                      <img
                        ref={brollImgRef}
                        className="v2-preview-broll-img"
                        style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'none', background: 'transparent' }}
                        onLoad={measureWrapperFromImg}
                        alt=""
                      />
                      <video
                        ref={brollVideoRef}
                        className="v2-preview-broll-video"
                        style={{ width: '100%', height: '100%', objectFit: isCustom ? 'contain' : 'cover', display: 'none' }}
                        onLoadedMetadata={measureWrapperFromVideo}
                        playsInline muted
                      />
                      {corners}
                    </div>
                  );
                })()}
                {(captionScene?.mediaType === 'image' ||
                  (!captionScene?.mediaType && captionScene?.mediaUrl &&
                   !(/\.(mp4|webm|mov|m4v)(\?|$)/i.test(captionScene.mediaUrl) || /^https:\/\/api\.sync\.so\//i.test(captionScene.mediaUrl)))) && captionScene?.mediaUrl && (
                  <img src={captionScene.mediaUrl.startsWith('http') ? captionScene.mediaUrl : `https://onyx-reelz.com${captionScene.mediaUrl}`} style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0, zIndex: 4 }} alt="" />
                )}
              </div>
            );
          })()}
          {(() => {
            if (!captionsVisible || !captionScene?.narration || captionScene?.captionsEnabled === false) return null;
            const style = captionScene.caption_style || "normal";
            // Caption shape (style) and caption color are independent choices — brand color
            // is the fallback whenever the scene hasn't set its own explicit color, regardless
            // of which caption style/shape is active.
            const userColor = captionScene.caption_color || brand?.caption_color || null;
            const userBg    = captionScene.caption_bg_color || brand?.caption_bg_color || null;
            const cFont  = captionScene.caption_font || brand?.caption_font || "sans-serif";
            const cSize  = Number(captionScene.caption_size || brand?.caption_size || (ratio === "9:16" ? 18 : 15));
            const cPos   = captionScene.caption_position || brand?.caption_position || "bottom";
            const posStyle = cPos === "top"
              ? { top: 0 }
              : (cPos === "middle" || cPos === "center")
              ? { top: "50%", transform: "translateY(-50%)" }
              : { bottom: 0 };

            // Visual defaults approximating each burnCaptions() branch in render.js —
            // not pixel-perfect, just enough that each style reads as distinct in the editor.
            const STYLE_DEFAULTS = {
              normal:     { color: "#ffffff", bg: "rgba(0,0,0,0.82)", weight: 700 },
              solid:      { color: "#ffffff", bg: "rgba(0,0,0,0.85)", weight: 700 },
              clean:      { color: "#ffffff", bg: "transparent",      weight: 600 },
              bold:       { color: "#ffffff", bg: "rgba(0,0,0,0.95)", weight: 900, fontScale: 1.15 },
              outline:    { color: "#ffffff", bg: "transparent",      weight: 800, stroke: true },
              glass:      { color: "#ffffff", bg: "rgba(255,255,255,0.15)", weight: 600, radius: 8, blur: true, border: "1px solid rgba(255,255,255,0.3)" },
              dark:       { color: "#ffffff", bg: "rgba(0,0,0,1)",    weight: 800, border: "2px solid rgba(255,255,255,0.2)", forceWhite: true },
              underline:  { color: "#ffffff", bg: "transparent",      weight: 600, underline: true },
              soft:       { color: "#f0ece1", bg: "transparent",      weight: 500, softShadow: true },
              crisp:      { color: "#ffffff", bg: "rgba(0,0,0,0.92)", weight: 600 },
              neon:       { color: "#a855f7", bg: "transparent",      weight: 800, neon: true },
              gradient:   { color: "#ffffff", bg: "transparent",      weight: 800, gradient: true },
              karaoke:    { color: "#ffffff", bg: "rgba(0,0,0,0.9)",  weight: 800 },
              tiktok:     { color: "#ffffff", bg: "transparent",      weight: 800, tiktokOutline: true, forceWhite: true },
              bubble:     { color: "#ffffff", bg: "rgba(0,0,0,0.75)", weight: 800, radius: 999, border: "3px solid #ffffff" },
              typewriter: { color: "#ffffff", bg: "transparent",      weight: 500, mono: true },
            };
            const sd = STYLE_DEFAULTS[style] || STYLE_DEFAULTS.normal;
            const cColor = sd.forceWhite ? "#ffffff" : (userColor || sd.color);
            const cBg    = sd.bg === "transparent" ? "transparent" : (userBg || sd.bg);
            const hasBg  = cBg !== "transparent";

            // cSize is authored in export-resolution px (matches render.js's
            // burnCaptions, which draws at these same native widths) but this
            // preview box is CSS-scaled down to fit the sidebar -- FX text/emoji
            // already correct for that via pxSize = (sizePct/100)*canvasW (see
            // fxSizePct above), captions never did, so an 18px caption rendered
            // literally as 18px CSS on a ~300px-wide preview looked roughly 2-3x
            // too large relative to the frame. Scale by the same canvasW ratio.
            const NATIVE_CAPTION_WIDTH = { "9:16": 720, "1:1": 720, "3:4": 720, "4:3": 960, "21:9": 1680 }[ratio] || 1280;
            const captionCanvasW = frameRef.current?.getBoundingClientRect().width || 300;
            const captionScale = captionCanvasW / NATIVE_CAPTION_WIDTH;

            const textShadow = sd.neon
              ? `0 0 4px ${cColor}, 0 0 10px ${cColor}, 0 0 18px ${cColor}, 0 0 30px ${cColor}`
              : sd.softShadow
              ? "0 1px 2px rgba(0,0,0,0.35)"
              : sd.tiktokOutline
              ? "-2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 2px 2px 0 #000, 0 2px 4px rgba(0,0,0,0.6)"
              : "0 1px 3px rgba(0,0,0,0.45)";

            const textStyle = {
              display: "inline-block",
              maxWidth: "92%",
              textAlign: "center",
              fontWeight: sd.weight,
              fontSize: cSize * (sd.fontScale || 1) * captionScale,
              color: sd.gradient ? "transparent" : cColor,
              fontFamily: sd.mono ? "'Courier New', monospace" : cFont,
              background: cBg,
              borderRadius: sd.radius ?? 0,
              padding: hasBg ? "6px 14px" : "2px 6px",
              lineHeight: 1.4,
              border: sd.border || "none",
              backdropFilter: sd.blur ? "blur(6px)" : "none",
              WebkitBackdropFilter: sd.blur ? "blur(6px)" : "none",
              textDecoration: sd.underline ? "underline" : "none",
              textDecorationThickness: sd.underline ? "3px" : undefined,
              textUnderlineOffset: sd.underline ? "4px" : undefined,
              textShadow,
              WebkitTextStroke: sd.stroke ? "2px #000" : (sd.tiktokOutline ? "1px #000" : undefined),
              backgroundImage: sd.gradient ? "linear-gradient(90deg, #ff6b6b, #ffdd00, #4dd0ff)" : undefined,
              WebkitBackgroundClip: sd.gradient ? "text" : undefined,
              backgroundClip: sd.gradient ? "text" : undefined,
            };

            return (
              <div style={{
                position: "absolute", ...posStyle,
                left: 0, right: 0,
                width: "100%",
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                pointerEvents: "none", zIndex: 10,
              }}>
                <div style={textStyle}>
                  {(() => {
                    const timings = captionScene.word_timestamps;
                    if (!timings?.length || style !== 'karaoke') return captionScene.narration;
                    const videoTrack = tracks?.find(t => t.key === "video");
                    const activeClip = videoTrack?.clips?.find(c =>
                      playhead >= c.startTime && playhead < c.startTime + (c.trimEnd - c.trimStart)
                    );
                    const offset = playhead - (activeClip?.startTime ?? 0);
                    const highlightColor = captionScene.caption_highlight_color || brand?.caption_highlight_color || '#ffe566';

                    // Last word whose start time has passed — fills gaps, no unlit frames
                    const activeIdx = timings.reduce((best, w, i) =>
                      offset >= w.start ? i : best, -1);
                    const lastWord = timings[timings.length - 1];
                    const pastEnd = offset > (lastWord?.end ?? Infinity);

                    return timings.map((w, i) => {
                      const isActive = !pastEnd && i === activeIdx;
                      return (
                        <span key={i} style={{
                          color: isActive ? highlightColor : 'inherit',
                          fontWeight: isActive ? 700 : 'inherit',
                          transition: 'color 0.08s ease',
                          marginRight: '0.25em',
                          display: 'inline-block',
                        }}>{w.word}</span>
                      );
                    });
                  })()}
                </div>
                {style === "typewriter" && (
                  <div style={{
                    marginTop: 4, fontSize: 10, color: "rgba(241,245,251,0.5)",
                    background: "rgba(0,0,0,0.4)", padding: "2px 8px", borderRadius: 4,
                    textAlign: "center",
                  }}>
                    Animation visible in export only
                  </div>
                )}
              </div>
            );
          })()}
          {/* Text overlay boxes */}
          {(scene?.text_boxes || []).map(tb => {
            const posStyle = {
              top: tb.position?.startsWith("top") ? 12 : tb.position?.startsWith("middle") ? "50%" : "auto",
              bottom: tb.position?.startsWith("bottom") ? 12 : "auto",
              left: tb.position?.endsWith("left") ? 12 : tb.position?.endsWith("center") ? "50%" : "auto",
              right: tb.position?.endsWith("right") ? 12 : "auto",
              transform: tb.position?.includes("center") ? "translate(-50%,-50%)" : tb.position?.startsWith("middle") ? "translateY(-50%)" : "none",
            };
            return (
              <div key={tb.id} style={{
                position: "absolute", ...posStyle,
                fontFamily: tb.font || "sans-serif",
                fontSize: tb.fontSize || 24,
                color: tb.color || "#ffffff",
                background: tb.bgColor || "transparent",
                opacity: (tb.opacity ?? 100) / 100,
                textAlign: tb.align || "center",
                borderRadius: 4, padding: "4px 8px",
                pointerEvents: "none", zIndex: 11,
                lineHeight: 1.3, whiteSpace: "pre-wrap",
                maxWidth: "90%",
              }}>
                {tb.text || ""}
              </div>
            );
          })}
          {(() => {
            const fxTrack = tracks?.find(t => t.key === "fx");
            if (!fxTrack?.clips?.length) return null;
            const activeClips = fxTrack.clips.filter(c =>
              playhead >= (c.startTime||0) && playhead < (c.startTime||0)+((c.trimEnd||c.duration||3)-(c.trimStart||0))
            );
            if (!activeClips.length) return null;

            return activeClips.map(clip => {
              const { x: gx, y: gy } = fxGridToPercent(clip.position);
              const xPct     = clip.xPct      ?? gx;
              const yPct     = clip.yPct      ?? gy;
              const sizePct  = fxSizePct(clip);
              const canvasW  = frameRef.current?.getBoundingClientRect().width  || 300;
              const canvasH  = frameRef.current?.getBoundingClientRect().height || 500;
              const pxSize   = (sizePct / 100) * canvasW;
              const isSelected = clip.id === selectedClipId;

              const animClass = clip.animation
                ? `text-anim-${clip.animation.replace(/\s+/g, '-').toLowerCase()}`
                : '';
              const inner = clip.elementType === "emoji"
                ? <div style={{ fontSize: pxSize, lineHeight: 1 }}>{clip.content}</div>
                : clip.elementType === "text"
                ? <div className={animClass} style={{ fontSize: pxSize, color: clip.color || brand?.primary_color || "#fff", fontWeight: clip.fontWeight || "bold", textShadow: "0 2px 8px rgba(0,0,0,0.8)", pointerEvents: "none", whiteSpace: "pre-wrap", textAlign: "center" }}>{clip.content}</div>
                : <img src={clip.content} style={{ width: pxSize, height: "auto", display: "block" }} alt="" draggable={false}/>;

              const corners = isSelected
                ? [["nw",-1,-1],["ne",1,-1],["se",1,1],["sw",-1,1]].map(([k,sx,sy]) => (
                    <div key={k}
                      onMouseDown={e => {
                        e.stopPropagation();
                        fxDragRef.current = { type:"resize", clipId:clip.id, startX:e.clientX, startY:e.clientY, startXPct:xPct, startYPct:yPct, startSizePct:sizePct };
                      }}
                      style={{
                        position:"absolute", width:10, height:10,
                        background:"#4dd0ff", borderRadius:2, zIndex:21,
                        cursor: sx===sy ? "nwse-resize" : "nesw-resize",
                        ...(sy < 0 ? {top:-5} : {bottom:-5}),
                        ...(sx < 0 ? {left:-5} : {right:-5}),
                      }}/>
                  ))
                : null;

              return (
                <div key={clip.id}
                  onClick={e => { e.stopPropagation(); onSelectClip?.(clip.id); }}
                  onMouseDown={e => {
                    e.stopPropagation();
                    onSelectClip?.(clip.id);
                    fxDragRef.current = { type:"move", clipId:clip.id, startX:e.clientX, startY:e.clientY, startXPct:xPct, startYPct:yPct, startSizePct:sizePct };
                  }}
                  style={{
                    position:"absolute",
                    left:`${xPct}%`, top:`${yPct}%`,
                    transform:"translate(-50%,-50%)",
                    zIndex:10, cursor:"move", userSelect:"none",
                    opacity:(clip.opacity||100)/100,
                    outline: isSelected ? "2px solid #4dd0ff" : "2px solid transparent",
                    outlineOffset:3, borderRadius:4,
                  }}
                >
                  {inner}
                  {corners}
                </div>
              );
            });
          })()}
          {/* Logo overlay */}
          {brand?.logo_url && (() => {
            const pos = brand.logo_position || "top-left";
            const sz  = { small: 40, medium: 64, large: 96 }[brand.logo_size] || 64;
            const [v, h] = pos.split("-");
            return (
              <img
                src={brand.logo_url} alt="" draggable={false}
                onError={e => { e.target.style.display = "none"; }}
                style={{
                  position: "absolute", zIndex: 12, pointerEvents: "none",
                  width: sz, height: "auto", objectFit: "contain",
                  ...(v === "top" ? { top: 12 } : { bottom: 20 }),
                  ...(h === "left"   ? { left: 12 }
                    : h === "right"  ? { right: 12 }
                    : { left: "50%", transform: "translateX(-50%)" }),
                }}
              />
            );
          })()}
          {/* Avatar overlay — chroma-keyed in canvas to match the ffmpeg export */}
          {captionScene?.avatar_video_url && captionScene.avatar_status === "completed" && (() => {
            const pos    = captionScene.avatar_position || "bottom-right";
            const isSide = pos === "left" || pos === "right";
            return (
              <>
                <video
                  ref={avatarVideoRef}
                  key={captionScene.avatar_video_url}
                  src={captionScene.avatar_video_url}
                  crossOrigin="anonymous"
                  muted playsInline loop
                  style={{ position: "absolute", width: 1, height: 1, opacity: 0, pointerEvents: "none" }}
                />
                <canvas
                  ref={avatarCanvasRef}
                  style={{
                    position: "absolute", zIndex: 11, pointerEvents: "none",
                    width:  isSide ? "33.33%" : "25%",
                    height: isSide ? "100%"   : "auto",
                    ...(pos === "bottom-left"   ? { left: "0.8%",  bottom: "1.4%" }
                      : pos === "bottom-right"  ? { right: "0.8%", bottom: "1.4%" }
                      : pos === "bottom-center" ? { left: "50%", transform: "translateX(-50%)", bottom: "1.4%" }
                      : pos === "left"          ? { left: 0, top: 0 }
                      :                           { right: 0, top: 0 }),
                  }}
                />
              </>
            );
          })()}
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
        {(() => {
          const isOpal = theme === "opal";
          const dockBg = isOpal ? "rgba(240,248,255,0.92)" : "var(--onyx-surface,rgba(20,26,38,0.85))";
          const dockBorder = isOpal ? "0.5px solid rgba(0,0,0,0.12)" : "0.5px solid var(--onyx-hairline-strong,rgba(255,255,255,0.14))";
          const timeColor = isOpal ? "rgba(0,0,0,0.6)" : "rgba(241,245,251,0.6)";
          const dividerColor = isOpal ? "rgba(0,0,0,0.15)" : "rgba(255,255,255,0.1)";
          const hoverBg = isOpal ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.06)";
          // These 4 buttons were pure decoration until 2026-08-17 (found
          // during the tool tutorial campaign: no onClick at all, silent
          // no-op) -- now wired to real actions. Split mirrors the
          // sequencer toolbar's real "Split at playhead" button exactly
          // (same disabled-when-nothing-selected condition), so there's
          // no longer a second control that looks the same but does
          // nothing.
          const toolBtns = [
            { icon: "scissors", label: "Split", color: isOpal ? "rgba(0,0,0,0.55)" : "rgba(241,245,251,0.55)", onClick: onSplit, disabled: !selectedClipId },
            { icon: "mic",      label: "VO",    color: isOpal ? "rgba(0,0,0,0.55)" : "rgba(241,245,251,0.55)", onClick: onOpenVoiceOver },
            { icon: "music",    label: "Music", color: "#b48dff", onClick: onOpenMusic },
            { icon: "sparkle",  label: "AI",    color: "#ffb547", onClick: onOpenAI },
          ];
          return (
            <div style={{ background: dockBg, backdropFilter: "blur(28px) saturate(140%)", WebkitBackdropFilter: "blur(28px) saturate(140%)", border: dockBorder, boxShadow: isOpal ? "0 4px 20px rgba(0,0,0,0.15)" : "0 8px 32px rgba(0,0,0,0.5)", borderRadius: 14, padding: "4px 6px", display: "flex", alignItems: "center", gap: 2 }}>
              <button onClick={() => { document.activeElement?.blur(); onPlayPause(); }} style={{ width: 34, height: 34, borderRadius: 9, border: "none", cursor: "pointer", background: isPlaying ? "rgba(77,208,255,0.12)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Glyph name={isPlaying ? "pause" : "play"} size={16} color="#4dd0ff"/>
              </button>
              <span style={{ fontSize: 11, fontFamily: "monospace", color: timeColor, padding: "0 8px", minWidth: 88, textAlign: "center" }}>
                {fmtTime(playhead)} / {fmtTime(totalSec)}
              </span>
              <div style={{ width: 0.5, height: 20, background: dividerColor }}/>
              {toolBtns.map(t => (
                <button key={t.label} onClick={() => { document.activeElement?.blur(); t.onClick?.(); }} disabled={t.disabled}
                  style={{ height: 34, padding: "0 9px", borderRadius: 9, border: "none", cursor: t.disabled ? "not-allowed" : "pointer", background: "transparent", color: t.color, opacity: t.disabled ? 0.4 : 1, display: "flex", alignItems: "center", gap: 5, fontSize: 11.5, fontFamily: "inherit" }}
                  onMouseEnter={e => { if (!t.disabled) e.currentTarget.style.background = hoverBg; }}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                  <Glyph name={t.icon} size={13} color={t.color}/>{t.label}
                </button>
              ))}
            </div>
          );
        })()}
      </div>
    </div>
  );
}

// ── V2 render serializer ─────────────────────────────────────────────────────
function buildV2RenderRequest({ timelineState, scenes, globalMusicUrl, globalMusicName,
  musicVolume, voiceoverVolume, sfxVolume, ratio, brand, reelId, canvasH = 500, canvasW = 300,
  captionsVisible = true }) {
  const videoTrack = timelineState.tracks.find(t => t.key === "video");
  const voiceTrack = timelineState.tracks.find(t => t.key === "voiceover");
  const musicTrack = timelineState.tracks.find(t => t.key === "music");
  const sfxTrack   = timelineState.tracks.find(t => t.key === "sfx");
  const fxTrack    = timelineState.tracks.find(t => t.key === "fx");
  const brollTrack = timelineState.tracks.find(t => t.key === "broll");
  function isVid(url) {
    if (!url) return false;
    if (/^https:\/\/api\.sync\.so\//i.test(url)) return true;
    const ext = url.split("?")[0].split(".").pop().toLowerCase();
    return ["mp4","webm","mov","m4v"].includes(ext);
  }
  // Explicit per-ratio export dimensions, not a ternary chain -- the old
  // 3-branch version silently fell back to 1280x720 (16:9) for any ratio it
  // didn't name, which would have made 4:3/3:4/21:9 exports come out
  // landscape 16:9 regardless of what was actually selected.
  const VIDEO_DIMENSIONS = {
    "9:16": { w: 720, h: 1280 },
    "1:1":  { w: 720, h: 720 },
    "16:9": { w: 1280, h: 720 },
    "4:3":  { w: 960, h: 720 },
    "3:4":  { w: 720, h: 960 },
    "21:9": { w: 1680, h: 720 },
    // No longer picker-reachable, kept only so a pre-existing reel with a
    // stored ratio of "4:5" still renders the way it always did.
    "4:5":  { w: 1080, h: 1350 },
  };
  const videoW = VIDEO_DIMENSIONS[ratio]?.w ?? 1280;
  const videoH = VIDEO_DIMENSIONS[ratio]?.h ?? 720;
  const renderable = (videoTrack?.clips || []).slice().sort((a, b) => a.startTime - b.startTime).map((clip, i) => {
    const scene = scenes.find(s => s.id === clip.sceneId) || {};
    const voClip = (voiceTrack?.clips || []).find(c =>
      c.sceneId === clip.sceneId || Math.abs(c.startTime - clip.startTime) < 0.1
    );
    const url = clip.url || clip.mediaUrl || clip.src || scene.mediaUrl || scene.url || "";
    const cStart = clip.startTime || 0;
    const clipDuration = (clip.trimEnd || clip.duration || 5) - (clip.trimStart || 0);
    const cEnd   = cStart + clipDuration;
    // SFX is timeline-native: any number of sfx clips can overlap this scene's
    // span, each carrying its own frame-accurate offset. sfxItems carries that
    // to the renderer; sfxUrl/sfxVolume (first item, offset 0) stay populated
    // too as a fallback for old backends during rollout.
    const sceneSfxClips = (sfxTrack?.clips || [])
      .filter(c => {
        const sStart = c.startTime || 0;
        const sEnd   = sStart + ((c.trimEnd || c.duration || 0) - (c.trimStart || 0));
        return rangesOverlapDuration(sStart, sEnd, cStart, cEnd) > 0;
      })
      .sort((a, b) => (a.startTime || 0) - (b.startTime || 0));
    const sfxItems = sceneSfxClips.map(c => ({
      url:          c.src,
      volume:       c.volume ?? sfxVolume ?? 80,
      startTime:    Math.max(0, (c.startTime || 0) - cStart),
      duration:     (c.trimEnd || c.duration || 0) - (c.trimStart || 0),
      volumePoints: c.volumePoints || null,
    }));
    const sfxClip = sceneSfxClips[0] || null;
    const brollClip = (brollTrack?.clips || []).reduce((best, b) => {
      const bStart = b.startTime || 0;
      const bEnd   = bStart + ((b.trimEnd || b.duration || 3) - (b.trimStart || 0));
      const overlap = rangesOverlapDuration(bStart, bEnd, cStart, cEnd);
      if (overlap <= 0) return best;
      return (!best || overlap > best.overlap) ? { clip: b, overlap } : best;
    }, null)?.clip || null;
    return {
      type:              isVid(url) ? "video" : "image",
      url,
      duration:          clip.trimEnd - clip.trimStart,
      trimStart:         clip.trimStart || null,
      // Real source range, not the shrunk value SPEED_CLIP leaves in trimEnd
      // when speed !== 1 -- sourceDuration is the fixed anchor (never mutated
      // by speed changes, see timelineReducer.js SPEED_CLIP). Falls back to
      // the plain trimEnd for clips that predate sourceDuration.
      trimEnd:           clip.trimStart + (clip.sourceDuration ?? (clip.trimEnd - clip.trimStart)) || null,
      speed:             clip.speed || 1,
      voiceoverUrl:      voClip?.src || scene.voiceoverUrl || null,
      lipSynced:         !!scene.lipSynced,
      // Set by regenerateScene/Create.jsx from the kling job status response
      // when this scene's i2v request used the neutral placeholder start
      // frame (character_consistency background-bleed fix) -- render.js's
      // Step 1a fade-in gates on this. Was correctly threaded onto scene/clip
      // state but never forwarded into the actual render request payload, so
      // the fade never fired despite the flag being right there in memory.
      needsBleedFade:    !!(clip.needsBleedFade || scene.needsBleedFade),
      voiceoverVolume:   voiceoverVolume ?? 100,
      voiceoverVolumePoints: voClip?.volumePoints || null,
      voiceoverDuration: voClip ? (voClip.trimEnd - voClip.trimStart) : null,
      sfxUrl:            sfxClip?.src || scene.sfxUrl || null,
      sfxVolume:         sfxClip?.volume ?? sfxVolume ?? 80,
      sfxItems:          sfxItems.length ? sfxItems : (scene.sfxUrl ? [{ url: scene.sfxUrl, volume: scene.sfxVolume ?? sfxVolume ?? 80, startTime: 0 }] : []),
      sourceAudioVolume: scene.sourceAudioVolume ?? 100,
      sourceAudioMuted:  scene.sourceAudioMuted ?? false,
      // "fit" (default, pad) vs "fill" (crop-to-cover) when this scene's
      // source doesn't match the reel's aspect ratio -- see the Fill/Fit
      // toggle in StoryboardPanel.jsx and render.js's scaleFilter().
      fitMode:           scene.fitMode === "fill" ? "fill" : "fit",
      // No scene.action fallback here -- action is the internal AI generation
      // prompt, never meant to be user-facing. An empty narration must mean
      // no caption, not "show the raw prompt instead" (see sourcePrompt below
      // for the one place action is legitimately supposed to travel to render.js).
      narration:         clip.narration || scene.narration || null,
      // Raw scene prompt (with literal @CharacterName tags), independent of
      // narration/captions — real-person disclosure detection server-side
      // needs this regardless of whether narration/captions are enabled.
      sourcePrompt:      scene.action || null,
      // Real-person disclosure Pass 3 (image-based detection, see the EU AI
      // Act audit follow-up) needs the actual reference images a real
      // person's likeness could have come from, not just the text prompt —
      // sourcePrompt alone misses a real photo uploaded as Start Image/End
      // Frame with an innocuous text prompt. Same fields StoryboardPanel's
      // Start Image/End Frame blocks already read/write on scene state.
      sourceImageUrl:    scene.sourceImageUrl || null,
      endImageUrl:       scene.endImageUrl || null,
      captionsEnabled:   captionsVisible && clip.captionsEnabled === true,
      caption_color:     scene.caption_color || brand?.caption_color || "#ffffff",
      caption_bg_color:  scene.caption_bg_color || brand?.caption_bg_color || "rgba(0,0,0,0.82)",
      caption_font:      scene.caption_font || brand?.caption_font || "sans-serif",
      caption_size:      scene.caption_size || brand?.caption_size || 16,
      caption_position:  scene.caption_position || brand?.caption_position || "bottom",
      transitionToNext:  scene.transitionToNext || "cut",
      word_timestamps:   scene.word_timestamps || [],
      caption_style:     scene.caption_style || "normal",
      // caption_font_size_px used to scale cSize by the LIVE on-screen preview
      // panel's current pixel size (document.getElementById('onyx-preview-frame')
      // .getBoundingClientRect(), captured at export time) against native export
      // dimensions. cSize itself (default 18/15, matching render.js's own
      // small/medium tiers which are proportional to the fixed 720/1280-wide
      // export frame) was already calibrated in export-resolution terms, so that
      // extra scaleRef multiplication double-counted: a narrow browser window or
      // collapsed sidebar at export time (small canvasW/canvasH) inflated this
      // into a huge multiplier, baking oversized captions permanently into the
      // rendered video regardless of the size actually configured -- confirmed
      // live 2026-08-19, a 157px-wide preview frame produced 62-83px captions
      // on a 720px-wide export (8-11% of frame width) from an 18px default.
      // cSize is now sent as-is (native export px), matching how render.js's
      // own _sizeMap proportional tiers are already scaled.
      caption_font_size_px: (() => {
        const cSize = Number(scene.caption_size || brand?.caption_size || (ratio === "9:16" ? 18 : 15));
        return Math.round(cSize);
      })(),
      caption_bar_height_percent: (() => {
        const cSize = Number(scene.caption_size || brand?.caption_size || (ratio === "9:16" ? 18 : 15));
        const barH = cSize * 1.4 + 12;
        return barH / videoH;
      })(),
      brollUrl:          brollClip?.src || brollClip?.url || brollClip?.mediaUrl || null,
      brollStart:        brollClip ? (brollClip.startTime || 0) - cStart : 0,
      brollEnd:          brollClip ? (brollClip.startTime || 0) - cStart + ((brollClip.trimEnd - brollClip.trimStart) || brollClip.duration || 3) : 0,
      // Stage 1 position/size (no animation yet) — undefined when the clip was
      // never resized, which render.js treats as "full-frame" (today's only
      // behavior). Only present when the user actually dragged/resized it.
      brollXPct:         brollClip?.xPct,
      brollYPct:         brollClip?.yPct,
      brollSizePct:      brollClip?.sizePct,
      // Stage 2 — independent enter/exit animation, only meaningful when
      // the above position/size fields are also set (render.js gates on it).
      brollEnterAnim:    brollClip?.enterAnim,
      brollExitAnim:     brollClip?.exitAnim,
      // Direction only matters when the respective anim above is "slide";
      // undefined falls back to "bottom" server-side (render.js), matching
      // slide's original hardcoded direction.
      brollEnterDirection: brollClip?.enterDirection,
      brollExitDirection:  brollClip?.exitDirection,
      avatar_status:     scene.avatar_status || null,
      avatar_video_url:  scene.avatar_video_url || null,
      avatar_position:   scene.avatar_position || null,
      brightness:        scene.brightness ?? 50,
      contrast:          scene.contrast   ?? 50,
      saturation:        scene.saturation ?? 50,
      fxItems: (fxTrack?.clips || [])
        .filter(fx => {
          const fxS = fx.startTime || 0;
          const fxD = (fx.trimEnd || fx.duration || 3) - (fx.trimStart || 0);
          const cS  = clip.startTime || 0;
          const cD  = (clip.trimEnd || 0) - (clip.trimStart || 0);
          return rangesOverlapDuration(fxS, fxS + fxD, cS, cS + cD) > 0;
        })
        .map(fx => {
          const fxS = fx.startTime || 0;
          const fxD = (fx.trimEnd || fx.duration || 3) - (fx.trimStart || 0);
          const cS  = clip.startTime || 0;
          const cD  = (clip.trimEnd || 0) - (clip.trimStart || 0);
          return {
            elementType: fx.elementType,
            content:     fx.content,
            xPct:        fx.xPct ?? 50,
            yPct:        fx.yPct ?? 50,
            sizePct:     fx.sizePct ?? 20,
            color:       fx.color || (fx.elementType === "text" ? brand?.primary_color : undefined),
            fontWeight:  fx.fontWeight,
            animation:   fx.animation,
            font:        fx.font,
            shadow:      fx.shadow,
            outlineColor: fx.outlineColor,
            bgStyle:     fx.bgStyle,
            textAlign:   fx.textAlign,
            startTime:   Math.max(0, fxS - cS),
            duration:    Math.min(fxD, (cS + cD) - Math.max(fxS, cS)),
          };
        }),
    };
  });
  // Backstop: any sfx clip that doesn't overlap any scene's video span is silently
  // dropped from sfxItems above (nothing to attach it to) — flag those explicitly
  // here so it's visible in the request/render logs even if the drop-time toast
  // warning was missed or dismissed, instead of the clip just vanishing.
  const videoSpans = (videoTrack?.clips || []).map(c => {
    const s = c.startTime || 0;
    return { start: s, end: s + ((c.trimEnd || c.duration || 5) - (c.trimStart || 0)) };
  });
  const excludedSfxClips = (sfxTrack?.clips || [])
    .filter(c => {
      const s = c.startTime || 0;
      const e = s + ((c.trimEnd || c.duration || 0) - (c.trimStart || 0));
      return !videoSpans.some(v => s < v.end && e > v.start);
    })
    .map(c => ({ src: c.src, label: c.label || "SFX", startTime: c.startTime || 0 }));
  if (excludedSfxClips.length) {
    console.warn("[buildV2RenderRequest] SFX clip(s) placed outside any scene's span — will NOT be included in this export:", excludedSfxClips);
  }

  const musicClip = musicTrack?.clips?.[0];
  const resolvedMusicUrl = musicClip?.src || globalMusicUrl || null;
  return {
    scenes:          renderable,
    excludedSfxClips,
    musicUrl:        resolvedMusicUrl,
    musicVolume:     musicVolume ?? 60,
    musicVolumePoints: musicClip?.volumePoints || null,
    musicDuration:   musicClip ? (musicClip.trimEnd - musicClip.trimStart) : null,
    voiceoverVolume: voiceoverVolume ?? 100,
    sfxVolume:       sfxVolume ?? 80,
    renderMode:      "download",
    brand:           brand || {},
    reelId:          reelId || null,
    theme_id:        null,
    aspectRatio:     ratio,
  };
}

// ── Main ──────────────────────────────────────────────────────────────────────
function normalizeScene(scene, fallbackId) {
  const mediaUrl = scene?.mediaUrl || scene?.url || null;
  const mediaType =
    scene?.mediaType || (mediaUrl ? (isVideoUrl(mediaUrl) ? "video" : "image") : null);
  return {
    id: scene?.id ?? fallbackId,
    label: scene?.label || "",
    narration: scene?.narration || "",
    action: scene?.action || "",
    mode: scene?.mode || "ai",
    savedAt: scene?.savedAt || null,
    generatedAt: scene?.generatedAt || null,
    isAiGenerated: !!scene?.isAiGenerated,
    thumbnail: scene?.thumbnail || scene?.stockThumb || mediaUrl || null,
    url: mediaUrl,
    mediaUrl,
    mediaType,
    transitionToNext: scene?.transitionToNext || "cut",
    voiceoverUrl: scene?.voiceoverUrl || scene?.voiceover || null,
    voiceover: scene?.voiceover || scene?.voiceoverUrl || null,
    voiceoverStale: !!scene?.voiceoverStale,
    voiceoverSourceText: scene?.voiceoverSourceText || "",
    sourceAudioVolume: typeof scene?.sourceAudioVolume === "number" ? scene.sourceAudioVolume : 100,
    sourceAudioMuted: !!scene?.sourceAudioMuted,
    fitMode: scene?.fitMode === "fill" ? "fill" : "fit",
    musicUrl: scene?.musicUrl || null,
    sfxUrl: scene?.sfxUrl || null,
    sfxName: scene?.sfxName || "",
    duration: Number(scene?.duration || 3),
    stockBaseQuery: scene?.stockBaseQuery || "",
    stockQuery: scene?.stockQuery || "",
    stockVariation: scene?.stockVariation || scene?.stockQuery || "",
    stockSource: scene?.stockSource || "",
    stockAssetId: scene?.stockAssetId || null,
    stockThumb: scene?.stockThumb || scene?.thumbnail || mediaUrl || null,
    captionsEnabled: scene?.captionsEnabled ?? true,
    trimStart: typeof scene?.trimStart === "number" ? scene.trimStart : 0,
    trimEnd: typeof scene?.trimEnd === "number" ? scene.trimEnd : null,
    text_boxes: Array.isArray(scene?.text_boxes) ? scene.text_boxes : [],
    elements: Array.isArray(scene?.elements) ? scene.elements : [],
    caption_words: Array.isArray(scene?.caption_words) ? scene.caption_words : [],
  };
}

function makeEmptyScene(id, label) {
  return normalizeScene({ id, mode: "ai", label: label || "" }, id);
}

export default function EditorV2() {
  const [theme, setTheme] = useState(() => localStorage.getItem("onyx-theme") || "onyx");
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("onyx-theme", theme);
  }, [theme]);

  const [timelineState, dispatch] = useReducer(timelineReducer, null, makeInitialState);

  // Undo/redo history — snapshots BOTH timelineState (tracks/clips) and
  // scenes together, as one atomic entry. Previously only timelineState was
  // tracked, so any edit that only touched the `scenes` array (Duration,
  // narration typed directly, Transitions applied via updateScene) was
  // silently not undoable at all -- no error, undo just did nothing for
  // those (confirmed live 2026-08-19). scenesRef is declared further down
  // this component but by the time any of these callbacks actually run
  // (always post-mount, from a user action), it's already initialized --
  // same closure pattern moveScene/deleteScene/etc. already rely on.
  const historyRef = useRef({ past: [], future: [] });
  const pushHistorySnapshot = useCallback(() => {
    historyRef.current.past.push({
      timelineState: JSON.parse(JSON.stringify(timelineState)),
      scenes: JSON.parse(JSON.stringify(scenesRef.current)),
    });
    if (historyRef.current.past.length > 50) historyRef.current.past.shift();
    historyRef.current.future = [];
  }, [timelineState]);
  const dispatchWithHistory = useCallback((action) => {
    const noRecord = ["SEEK", "TRACK_VOLUME", "LOAD_STATE", "SELECT"];
    if (!noRecord.includes(action.type)) pushHistorySnapshot();
    dispatch(action);
  }, [dispatch, pushHistorySnapshot]);

  const undoTimeline = useCallback(() => {
    const { past, future } = historyRef.current;
    if (!past.length) return;
    const prev = past[past.length - 1];
    historyRef.current.past = past.slice(0, -1);
    historyRef.current.future = [
      { timelineState: JSON.parse(JSON.stringify(timelineState)), scenes: JSON.parse(JSON.stringify(scenesRef.current)) },
      ...future,
    ];
    dispatch({ type: "LOAD_STATE", state: prev.timelineState });
    setScenes(prev.scenes);
  }, [dispatch, timelineState]);

  const redoTimeline = useCallback(() => {
    const { past, future } = historyRef.current;
    if (!future.length) return;
    const next = future[0];
    historyRef.current.future = future.slice(1);
    historyRef.current.past = [
      ...past,
      { timelineState: JSON.parse(JSON.stringify(timelineState)), scenes: JSON.parse(JSON.stringify(scenesRef.current)) },
    ];
    dispatch({ type: "LOAD_STATE", state: next.timelineState });
    setScenes(next.scenes);
  }, [dispatch, timelineState]);

  // DEBUG: expose timeline state for console inspection
  useEffect(() => { window.__timelineState = timelineState; }, [timelineState]);

  const [_scenes, _setScenes] = useState([]);
  const scenes = _scenes;
  const setScenes = useCallback((arg) => {
    if (typeof arg === 'function') {
      _setScenes((prev) => {
        const next = arg(prev);
        if (Array.isArray(next) && next.length === 0) console.warn('[setScenes] EMPTY ARRAY called from:', new Error().stack.split('\n')[2]);
        scenesRef.current = next;
        return next;
      });
    } else {
      if (Array.isArray(arg) && arg.length === 0) console.warn('[setScenes] EMPTY ARRAY called from:', new Error().stack.split('\n')[2]);
      scenesRef.current = arg;
      _setScenes(arg);
    }
  }, []);
  const toast = useToast();
  const [activeScene,      setActiveScene]      = useState(null);
  const [title,            setTitle]            = useState("Untitled Reel");
  const [ratio,            setRatio]            = useState("9:16");
  const [reelId,           setReelId]           = useState(() => new URLSearchParams(window.location.search).get("reelId"));
  // Synchronous mirror of reelId (state updates are async, so two near-
  // simultaneous "no reelId yet -> create one" call sites could both read
  // reelId===null before either's setReelId flushes -- this is the exact
  // race that caused duplicate reel rows, confirmed live 2026-07-28: two
  // near-identical reels created 168ms apart from the handoff-restore path
  // and the debounced autosave path both deciding to POST independently).
  const reelIdRef = useRef(reelId);
  useEffect(() => { reelIdRef.current = reelId; }, [reelId]);
  // Optimistic-concurrency tracking for saveNow's PUT -- the updated_at this
  // tab last saw from the server, sent back as expected_updated_at so the
  // backend can reject (409) a save if the server's row has since moved on
  // without this tab knowing. Set at every point this tab receives a fresh
  // row from the server: initial load, reel creation, and every successful
  // save response. See the 2026-08-06 autosave-race investigation -- every
  // save path used to PUT unconditionally, so a tab left open (even idle)
  // would silently overwrite changes made elsewhere (another tab, another
  // device, or a direct DB fix) every 30s forever.
  const lastKnownUpdatedAtRef = useRef(null);
  // Set (non-null) when the last save attempt was rejected as stale -- gates
  // saveNow from retrying with the same doomed expected_updated_at every 30s
  // (which would just 409 again), and drives the conflict banner. Cleared on
  // the next successful save or on reload.
  const [saveConflict, setSaveConflict] = useState(null);
  // Soft, non-alarming advisory shown after a completed export whose render
  // auto-inserted the real-person disclaimer scene (EU AI Act Article 50).
  // Purely informational -- additive to the disclaimer-scene mechanism
  // itself, which already happened server-side regardless of this notice.
  // Generic across all trigger sources (character tag, prompt text,
  // reference image, or a detected self-attestation mismatch) by design --
  // see render.js's disclosure block, which never exposes which one fired.
  // Just a boolean -- the UI copy lives here, not server-side (the backend's
  // disclosureReason is a separate, generic string used for its own
  // logging/future flexibility, not necessarily this exact notice's copy).
  const [disclosureNotice, setDisclosureNotice] = useState(false);
  // Holds the in-flight creation request (if any) so a second caller reuses
  // it instead of firing its own POST. Assigned synchronously before any
  // await inside createReelOnce, so this is safe even if multiple effects
  // call it back-to-back in the same tick.
  const reelCreationPromiseRef = useRef(null);
  // Single choke point for every "create this reel for the first time" call
  // site (there were three, each with its own raw fetch -- see 2026-07-28
  // duplicate-reel investigation). Returns { id, created }: created is false
  // if another concurrent call won the race, so the caller can still PUT
  // its own snapshot rather than silently discarding it.
  const createReelOnce = useCallback((body, headers) => {
    if (reelIdRef.current) return Promise.resolve({ id: reelIdRef.current, created: false });
    if (reelCreationPromiseRef.current) {
      return reelCreationPromiseRef.current.then(r => ({ id: r.id, created: false }));
    }
    const promise = fetch("/api/reels", { method: "POST", headers, body })
      .then(r => r.json())
      .then(resp => {
        if (resp.id) {
          reelIdRef.current = resp.id;
          lastKnownUpdatedAtRef.current = resp.updated_at || null;
          setReelId(resp.id);
          const u = new URL(window.location.href);
          u.searchParams.set("reelId", resp.id);
          window.history.replaceState({}, "", u.toString());
        }
        return { id: resp.id || null, created: true };
      })
      .finally(() => { reelCreationPromiseRef.current = null; });
    reelCreationPromiseRef.current = promise;
    return promise;
  }, []);

  // Apply any stems queued from Music Studio → sessionStorage (same tab or cross-tab)
  // Must be after reelId is declared — dependency array references it directly.
  useEffect(() => {
    function applyPending() {
      try {
        const raw = sessionStorage.getItem("onyx_pending_stems");
        if (!raw) return;
        const { reelId: pendingReelId, stems } = JSON.parse(raw);
        if (pendingReelId === reelId && Array.isArray(stems) && stems.length) {
          dispatch({ type: "ADD_STEM_TRACKS", stems });
          hasStemTracks.current = true;
          sessionStorage.removeItem("onyx_pending_stems");
        }
      } catch {}
    }
    applyPending();
    const onStorage = (e) => {
      if (e.key === "onyx_pending_stems" && e.newValue) applyPending();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [reelId]);
  const [isPlaying,        setIsPlaying]        = useState(false);
  const [loopEnabled,      setLoopEnabled]      = useState(false);
  const [loopIn,           setLoopIn]           = useState(0);
  const [loopOut,          setLoopOut]          = useState(null);
  const [activeMenu,       setActiveMenu]       = useState("storyboard");
  const [brandTab,         setBrandTab]         = useState("kit");
  const [activeMode,       setActiveMode]       = useState("Edit");
  const [sidebarOpen,      setSidebarOpen]      = useState(() => localStorage.getItem("onyx_sidebar")   !== "false");
  useEffect(() => { localStorage.setItem("onyx_sidebar",   sidebarOpen);   }, [sidebarOpen]);
  const [savedMsg,         setSavedMsg]         = useState("–");
  const [ytModalOpen,      setYtModalOpen]      = useState(false);
  const [exportUpgrade,    setExportUpgrade]    = useState(null); // { requiredCredits } | null
  const [generatingScenes, setGeneratingScenes] = useState({});
  const [regenModel, setRegenModel] = useState("kling-2.6-pro");
  // Fetched once from the backend's capability matrix (GET /api/models/capabilities,
  // sourced from VIDEO_MODELS in kling.js) rather than duplicating a hardcoded
  // list here -- keeps StoryboardPanel's ref-gated controls in sync with the
  // same source of truth the backend uses to decide whether to honor refs.
  const [modelCapabilities, setModelCapabilities] = useState({});
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/models/capabilities", { headers: await getAuthHeaders() });
        const data = await res.json();
        setModelCapabilities(Object.fromEntries((data || []).map((m) => [m.id, m])));
      } catch (e) {
        console.error("[EditorV2] failed to load model capabilities:", e);
      }
    })();
  }, []);
  // Same pattern as modelCapabilities above, separate endpoint -- Upscale
  // button build brief (2026-08-07): each of the 5 upscale models has a
  // genuinely different UI control shape (continuous factor, resolution
  // enum, discrete 2x/4x enum, or quality-only), sourced from
  // GET /api/upscale/capabilities (UPSCALE_MODELS in routes/upscale.js)
  // rather than hardcoded here, so StoryboardPanel never fakes a uniform
  // dropdown across models that don't actually share one.
  const [upscaleCapabilities, setUpscaleCapabilities] = useState({});
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/upscale/capabilities", { headers: await getAuthHeaders() });
        const data = await res.json();
        setUpscaleCapabilities(Object.fromEntries((data || []).map((m) => [m.id, m])));
      } catch (e) {
        console.error("[EditorV2] failed to load upscale capabilities:", e);
      }
    })();
  }, []);
  const [upscalingScenes, setUpscalingScenes] = useState({});
  const supportsRefs = modelCapabilities[regenModel]?.supportsRefs ?? false;
  // Distinct from supportsRefs -- gates the End Frame URL field, not the
  // @-tag character reference UI. Previously StoryboardPanel's End Frame
  // field was wired to supportsRefs instead of this, which meant it was
  // wrong (indistinguishable) for every model except kling-2.6-pro, the
  // only one where both flags happen to be true.
  const supportsEndFrame = modelCapabilities[regenModel]?.supportsEndFrame ?? false;
  // Gates the persistent Start Image field, distinct from supportsEndFrame
  // and derived server-side from (i2vId || seId), not i2vId alone -- see
  // the matching comment in routes/models.js for why vidu-q3-turbo (no
  // i2vId, seId-only) still needs this to read true.
  const supportsStartImage = modelCapabilities[regenModel]?.supportsStartImage ?? false;
  // True only for models with no t2v/i2v fallback (currently vidu-q3-turbo)
  // -- these 500 server-side with a generic "Internal server error" if only
  // one of Start Image/End Frame is set, since there's nothing to fall back
  // to. Checked client-side in regenerateScene before the request fires.
  const requiresStartAndEnd = modelCapabilities[regenModel]?.requiresStartAndEnd ?? false;
  // The selected model's real duration constraint (discrete values or a
  // min/max range) -- see StoryboardPanel's Duration UI, which renders
  // directly from this instead of one hardcoded [3,5,8,10] set.
  const durationSpec = modelCapabilities[regenModel]?.duration ?? null;
  // Currently true only for wan-2.7 -- gates StoryboardPanel's "Upgrade to
  // 1080p" toggle, which writes scene.resolution, read by regenerateScene
  // below and passed through to /api/kling/generate.
  const supports1080pUpgrade = modelCapabilities[regenModel]?.supports1080pUpgrade ?? false;
  // Distinct from supports1080pUpgrade above -- see that flag's own name
  // vs. resolutionOptions' own comment in routes/models.js. Currently just
  // seedance-2.5's real 480p/720p choice (no 1080p tier to upgrade to at
  // all for that model).
  const resolutionOptions = modelCapabilities[regenModel]?.resolutionOptions ?? null;
  // The selected model's real aspect-ratio constraint (see kling.js's
  // VIDEO_MODELS aspectRatio spec) -- null means the provider has no real
  // aspect_ratio field to validate against (both Vidu models), so every
  // ratio is treated as compatible. Checked client-side in regenerateScene
  // before the request fires, same pattern as requiresStartAndEnd above --
  // this is what would have caught the Veo 1:1 case before it ever reached
  // fal.ai's own 422.
  const aspectRatioSpec = modelCapabilities[regenModel]?.aspectRatio ?? null;
  const aspectRatioSupported = !aspectRatioSpec || aspectRatioSpec.values.includes(ratio);
  // Lives at the EditorV2 level (not inside AudioPanel) so it survives AudioPanel
  // unmount/remount when the user switches sidebar tabs mid-generation.
  const [generatingVoiceoverScenes, setGeneratingVoiceoverScenes] = useState(() => new Set());
  const [globalMusicUrl,   setGlobalMusicUrl]   = useState("");
  const [globalMusicName,  setGlobalMusicName]  = useState("");
  // Which Library section to auto-expand next time it mounts — set right
  // before jumping there from AudioPanel's "Change in Library" button.
  const [libraryInitialSection, setLibraryInitialSection] = useState(null);
  const [musicVolume,      setMusicVolume]      = useState(60);
  const [voiceoverVolume,  setVoiceoverVolume]  = useState(100);
  const [sfxVolume,        setSfxVolume]        = useState(80);
  const [captionsVisible,  setCaptionsVisible]  = useState(true);
  const [safeZoneEnabled,  setSafeZoneEnabled]  = useState(false);
  const [safeZonePlatform, setSafeZonePlatform] = useState("tiktok");
  const audioElementsRef   = useRef(new Map());   // clipId → HTMLAudioElement
  const musicVolumeRef     = useRef(60);
  const voiceoverVolumeRef = useRef(100);
  const hasStemTracks      = useRef(false);
  useEffect(() => { musicVolumeRef.current     = musicVolume / 100;     }, [musicVolume]);
  useEffect(() => { voiceoverVolumeRef.current = voiceoverVolume / 100; }, [voiceoverVolume]);
  const loopEnabledRef = useRef(false);
  const loopInRef      = useRef(0);
  const loopOutRef     = useRef(null);
  useEffect(() => { loopEnabledRef.current = loopEnabled; }, [loopEnabled]);
  useEffect(() => { loopInRef.current      = loopIn;      }, [loopIn]);
  useEffect(() => { loopOutRef.current     = loopOut;     }, [loopOut]);
  const [currentUser,      setCurrentUser]      = useState(null);
  const [brand,            setBrand]            = useState({});
  const [brands,           setBrands]           = useState([]);
  const [selectedBrandId,  setSelectedBrandId]  = useState(null);
  // undefined = not yet known whether the current reel has a saved brand; null = known to have none.
  const [reelBrandId,      setReelBrandId]      = useState(undefined);
  const [reelVideoUrl,     setReelVideoUrl]     = useState(null);
  const [aiStudioItems,    setAiStudioItems]    = useState([]);
  const [visualsTab,      setVisualsTab]      = useState("stock");
  const [sfxTab,          setSfxTab]          = useState("uploads");
  const [reelLoaded,      setReelLoaded]      = useState(false);
  const totalSec = useMemo(() => { try { return calcTotalDuration(timelineState) || 0; } catch { return 0; } }, [timelineState]);
  const playhead = timelineState.playhead ?? 0;
  // Live 60fps playhead position during playback, updated every frame by
  // the rAF master clock further below -- declared here (rather than
  // alongside playStartRef, deeper in the component) so it's available to
  // every effect regardless of where it's defined in the function body,
  // including the keydown handler above the playback-engine section.
  // See usePlayheadTicker and the "Playback engine" effect for how this
  // gets written to and consumed.
  const livePlayheadRef = useRef(timelineState.playhead ?? 0);
  // Unified clip selection — a single source of truth (timelineState.selected,
  // the existing generic reducer field the timeline's own clip clicks already
  // wrote to via SELECT) shared by canvas clicks, timeline clicks, fx, and
  // broll alike. Previously fx/broll each had their own separate local
  // useState, reachable ONLY from canvas clicks — clicking a clip in the
  // timeline (SequencerPanel's ClipBlock) dispatched SELECT but nothing read
  // timelineState.selected for panel purposes, so timeline clicks silently
  // did nothing for opening TextPanel/BrollPanel. Fixed 2026-07-12 by
  // deriving both panel-selection memos from the same field the timeline
  // already writes to, and routing the canvas's own selection clicks through
  // the same SELECT action instead of a separate local state.
  const selectedFxClip = useMemo(() => {
    const fxTrack = timelineState.tracks.find(t => t.key === "fx");
    return fxTrack?.clips?.find(c => c.id === timelineState.selected && c.elementType === "text") ?? null;
  }, [timelineState]);
  const selectedBrollClip = useMemo(() => {
    const brollTrack = timelineState.tracks.find(t => t.key === "broll");
    return brollTrack?.clips?.find(c => c.id === timelineState.selected) ?? null;
  }, [timelineState]);
  // Sync the sidebar tab to whichever clip just got selected — selection
  // itself (timelineState.selected) already works from both the canvas AND
  // the timeline (see onSelectClip / SequencerPanel's own SELECT dispatch),
  // but nothing previously switched the VISIBLE tab to match, so a timeline
  // click on a b-roll/text clip would select it internally with no visible
  // effect unless the user had already manually opened that tab first.
  // Deliberately keyed on timelineState.selected alone (the id), not on
  // selectedFxClip/selectedBrollClip (which are useMemo'd off the whole
  // timelineState and would re-fire this on unrelated field edits, e.g.
  // during a drag-resize) — this only switches tabs on an actual selection
  // change, not on every edit to the currently-selected clip. Only fx/broll
  // have a dedicated selection-driven panel today, so other track types
  // (video/audio/etc.) intentionally leave activeMenu untouched — this is
  // not a general "always follow selection" mechanism.
  useEffect(() => {
    if (!timelineState.selected) return;
    if (selectedFxClip) setActiveMenu("text");
    else if (selectedBrollClip) setActiveMenu("broll");
  }, [timelineState.selected]); // eslint-disable-line react-hooks/exhaustive-deps
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
    async function loadBrands() {
      try {
        const headers = await getAuthHeaders();
        const res = await fetch("/api/brands", { headers });
        const data = await res.json();
        const list = data.brands || [];
        setBrands(list);
        if (reelBrandId === undefined) return; // wait until we know whether this reel has a saved brand
        const saved = reelBrandId ? list.find(b => b.id === reelBrandId) : null;
        const def = saved || list.find(b => b.is_default) || list[0];
        if (def) {
          setSelectedBrandId(def.id);
          setBrand(b => ({ ...b, ...def }));
        }
      } catch (e) { console.error("Brands load error:", e); }
    }
    loadBrands();
  }, [currentUser, reelBrandId]);

  useEffect(() => {
    if (!reelId) {
      // Check for handoff from screen recorder / webcam / other upload flows
      const urlParams = new URLSearchParams(window.location.search);
      const handoffId = urlParams.get("handoff");
      if (handoffId) {
        const raw = sessionStorage.getItem(`onyx_handoff_${handoffId}`);
        sessionStorage.removeItem(`onyx_handoff_${handoffId}`);
        if (raw) {
          try {
            const d = JSON.parse(raw);
            // A handoff (e.g. PPT-to-video) may carry a pre-selected brandId.
            // Surface it immediately so the brand-loading effect below picks
            // it as the "saved" brand instead of falling back to the default,
            // and so it actually gets persisted on the initial reel POST.
            if (d?.brandId) {
              setReelBrandId(d.brandId);
              setSelectedBrandId(d.brandId);
            } else {
              setReelBrandId(null);
            }
            if (d?.title) setTitle(d.title);
            if (d?.ratio) setRatio(d.ratio);
            const rawScenes = Array.isArray(d?.scenes) ? d.scenes : [];
            const norm = rawScenes.map((sc, i) => ({
              id: sc.id ?? i + 1,
              duration: 3,
              ...sc,
              mode: sc.mode || "ai",
              word_timestamps: sc.word_timestamps || sc.wordTimings || undefined,
            }));
            if (norm.length) {
              setScenes(norm);
              setActiveScene(norm[0].id);
              dispatch({ type: "IMPORT_SCENES", scenes: norm });
            }
            const u = new URL(window.location.href);
            u.searchParams.delete("handoff");
            window.history.replaceState({}, "", u.toString());
            // POST immediately - don't wait for saveNow which guards on base tracks being present
            const handoffTitle = d?.title || "";
            const handoffRatio = d?.ratio || "9:16";
            (async () => {
              try {
                const h = await getAuthHeaders(); h["Content-Type"] = "application/json";
                const normalizedScenes = norm.map(s => ({ ...s, mediaUrl: s.mediaUrl || s.url || s.src || "" }));
                const thumbnailUrl = normalizedScenes.find(s => s.stockThumb || s.thumbnail || s.mediaUrl)?.stockThumb
                  || normalizedScenes.find(s => s.stockThumb || s.thumbnail || s.mediaUrl)?.thumbnail
                  || (isLikelyVideoUrl(normalizedScenes[0]?.mediaUrl) ? null : normalizedScenes[0]?.mediaUrl) || null;
                const body = JSON.stringify({ title: handoffTitle, scenes: normalizedScenes, timeline: { tracks: [] }, ratio: handoffRatio, status: "draft", globalMusicUrl: "", globalMusicName: "", thumbnail_url: thumbnailUrl, brand_id: d?.brandId || null, metadata: d?.metadata || {} });
                const result = await createReelOnce(body, h);
                if (result.id && !result.created) {
                  // Another concurrent call already created the reel -- still
                  // persist this handoff's own snapshot via a normal PUT
                  // instead of silently discarding it.
                  await fetch("/api/reels/" + result.id, { method: "PUT", headers: h, body }).catch(() => {});
                }
              } catch (err) { console.warn("[EditorV2] handoff initial save failed:", err); }
            })();
            setReelLoaded(true);
            return;
          } catch (e) { console.warn("[EditorV2] handoff restore failed:", e); }
        }
      }

      setReelBrandId(null); // no handoff (or handoff had no brand) — new reel with nothing saved yet, fall back to default

      try {
        const saved = localStorage.getItem("onyx_editor_autosave_v2");
        if (saved) {
          const d = JSON.parse(saved);
          localStorage.removeItem("onyx_editor_autosave_v2");
          if (d?.title) setTitle(d.title);
          if (d?.ratio) setRatio(d.ratio);
          const raw = Array.isArray(d?.scenes) ? d.scenes : [];
          const norm = raw.map((sc, i) => ({
            id: sc.id ?? i + 1,
            duration: 3,
            ...sc,
            mode: sc.mode || "ai",
            word_timestamps: sc.word_timestamps || sc.wordTimings || undefined,
          }));
          if (norm.length) {
            setScenes(norm);
            setActiveScene(norm[0].id);
            dispatch({ type: "IMPORT_SCENES", scenes: norm });
          }
          const autosaveTitle = d?.title || "";
          const autosaveRatio = d?.ratio || "9:16";
          const autosaveTemplate = d?.template || null;
          const autosaveTheme = d?.theme || null;
          (async () => {
            try {
              const h = await getAuthHeaders(); h["Content-Type"] = "application/json";
              const normalizedScenes = norm.map(s => ({ ...s, mediaUrl: s.mediaUrl || s.url || s.src || "" }));
              const thumbnailUrl = normalizedScenes.find(s => s.stockThumb || s.thumbnail || s.mediaUrl)?.stockThumb
                || normalizedScenes.find(s => s.stockThumb || s.thumbnail || s.mediaUrl)?.thumbnail
                || (isLikelyVideoUrl(normalizedScenes[0]?.mediaUrl) ? null : normalizedScenes[0]?.mediaUrl) || null;
              const body = JSON.stringify({ title: autosaveTitle, scenes: normalizedScenes, timeline: { tracks: [] }, ratio: autosaveRatio, status: "draft", globalMusicUrl: d?.globalMusicUrl || "", globalMusicName: "", thumbnail_url: thumbnailUrl, template: autosaveTemplate, theme: autosaveTheme });
              const result = await createReelOnce(body, h);
              if (result.id && !result.created) {
                // Another concurrent call already created the reel -- still
                // persist this autosave's own snapshot via a normal PUT
                // instead of silently discarding it.
                await fetch("/api/reels/" + result.id, { method: "PUT", headers: h, body }).catch(() => {});
              }
            } catch (err) { console.warn("[EditorV2] autosave initial save failed:", err); }
          })();
        }
      } catch (e) { console.warn("[EditorV2] autosave restore failed:", e); }
      setReelLoaded(true);
      return;
    }
    async function load() {
      try {
        const h = await getAuthHeaders();
        const d = await (await fetch("/api/reels/" + reelId + "?t=" + Date.now(), { headers: h })).json();
        if (d?.error) { console.error("[EditorV2] reel fetch error:", d.error); setSavedMsg("Load error"); return; }
        lastKnownUpdatedAtRef.current = d?.updated_at || null;
        setReelBrandId(d?.brand_id ?? null);
        if (d?.title) setTitle(d.title);
        if (d?.ratio) setRatio(d.ratio);
        const raw = Array.isArray(d?.scenes) ? d.scenes : [];
        const norm = raw.map((sc, i) => ({
            id: sc.id ?? i + 1,
            duration: 3,
            ...sc,
            mode: sc.mode || "ai",
            word_timestamps: sc.word_timestamps || sc.wordTimings || undefined,
          }));

        // Show scenes immediately — don't block on video probing for large reels
        if (norm.length) {
          setScenes(norm);
          setActiveScene(norm[0].id);
        }
        if (d?.timeline?.tracks?.some(t => t.clips?.length)) {
          const savedTracks  = d.timeline.tracks;
          let timelineToLoad = d.timeline;
          // Always rebuild video + voiceover tracks from current scene data
          // rather than trusting the persisted blob: a saved timeline can predate a
          // narration regeneration, baking in clip lengths/positions derived from
          // a stale scene.duration instead of the scene's current
          // (now-correct) voiceoverDuration. SFX is timeline-native (drag-placed,
          // frame-accurate, multiple clips per scene allowed) — once a saved sfx
          // track has real clips, those positions are the source of truth and must
          // not be stomped back to scene-start on every reload. Only legacy reels
          // with an empty/missing sfx track (predating the SFX feature, or never
          // touched beyond the old scene.sfxUrl field) get one synthesized from
          // scene.sfxUrl at scene-start. Every other track (music, fx, avatar,
          // captions, stems) is left exactly as saved.
          if (norm.length) {
            const base = importFromScenes(norm, "", "");
            const savedSfxTrack = savedTracks.find(st => st.key === "sfx");
            const sfxNeedsRebuild = !savedSfxTrack || !savedSfxTrack.clips?.length;
            // Video was unconditionally rebuilt from scenes here too, same as
            // voiceover -- but unlike voiceover (which can genuinely go stale
            // after a narration regen), the video track has no such staleness
            // problem, and rebuilding it silently discarded any saved
            // timeline-native edit (Split, Trim, Slow Mo region, speed) on
            // every single reload. Found 2026-08-13 via a real DB-verified
            // repro: split a clip, save, reload -- split gone, brand-new clip
            // IDs. Fixed: only rebuild video from scratch when the saved
            // track can't actually represent the current scenes anymore (a
            // scene was added/removed since last save, so sceneIds diverge);
            // otherwise trust the saved track exactly as edited.
            const savedVideoTrack = savedTracks.find(st => st.key === "video");
            const savedVideoSceneIds = new Set((savedVideoTrack?.clips || []).map(c => c.sceneId).filter(Boolean));
            const currentSceneIds = new Set(norm.map(s => s.id));
            const videoNeedsRebuild = !savedVideoTrack || !savedVideoTrack.clips?.length
              || savedVideoSceneIds.size !== currentSceneIds.size
              || [...currentSceneIds].some(id => !savedVideoSceneIds.has(id));
            const mergedTracks = savedTracks.map(st => {
              if (st.key === "video" && videoNeedsRebuild)
                return base.tracks.find(bt => bt.key === "video") ?? st;
              // Unconditionally rebuilding voiceover from `base` (rather than merging
              // with the saved track) is what keeps a saved reel from ever resurfacing
              // a stale/duplicate VO clip on reload — base.tracks always comes from the
              // current importFromScenes, which stamps sceneId on every VO clip. If this
              // ever changes to preserve/merge the saved voiceover track instead, legacy
              // sceneId-less orphans can reappear; re-add an explicit dedup pass then.
              if (st.key === "voiceover")
                return base.tracks.find(bt => bt.key === st.key) ?? st;
              if (st.key === "sfx" && sfxNeedsRebuild)
                return base.tracks.find(bt => bt.key === "sfx") ?? st;
              return st;
            });
            // A saved blob can predate the SFX feature entirely, meaning the
            // sfx key never makes it into savedTracks for the .map() above to
            // replace. Append any base track whose key is missing outright.
            const presentKeys = new Set(mergedTracks.map(t => t.key));
            for (const bt of base.tracks) {
              if (!presentKeys.has(bt.key)) mergedTracks.push(bt);
            }
            timelineToLoad = { ...d.timeline, tracks: mergedTracks };
          }
          dispatch({ type: "LOAD_STATE", state: timelineToLoad });
          if (timelineToLoad.tracks?.some(t => t.key?.startsWith("stem-"))) hasStemTracks.current = true;
          const musicTrack = d.timeline.tracks?.find(t => t.key === "music");
          const musicClip = musicTrack?.clips?.[0];
          if (musicClip?.src) {
            setGlobalMusicUrl(musicClip.src);
            setGlobalMusicName(musicClip.label || "Music");
          } else if (d.global_music_url || d.globalMusicUrl) {
            setGlobalMusicUrl(d.global_music_url || d.globalMusicUrl);
            setGlobalMusicName(d.global_music_name || d.globalMusicName || "");
          }
        } else if (norm.length) {
          const gmu = d.global_music_url || d.globalMusicUrl || "";
          const gmn = d.global_music_name || d.globalMusicName || "";
          dispatch({ type: "IMPORT_SCENES", scenes: norm, globalMusicUrl: gmu, globalMusicName: gmn });
        }
        setSavedMsg(norm.length ? "Loaded" : "Loaded (no scenes)");
        setReelLoaded(true);

        // Reconcile any scene whose generation was still pending when this
        // reel was last saved -- the poll loop that would normally deliver
        // the result may have died (tab backgrounded, network drop, laptop
        // closed) while the job kept running/completing server-side.
        // Silently backfill instead of leaving the scene empty forever with
        // only a jobId as a trail.
        reconcilePendingScenes();
      } catch (e) { console.error("[EditorV2] load", e); }
    }
    load();
  }, [reelId]);

  const saveInFlightRef = useRef(false);
  const exportInFlightRef = useRef(false);
  const saveNow = useCallback(async () => {
    if (!reelLoaded) return;
    if (saveInFlightRef.current) return;
    // A prior save was rejected as stale (409) -- retrying with the same
    // expected_updated_at would just 409 again every 30s. Blocked until the
    // conflict banner's reload clears saveConflict, rather than silently
    // discarding edits in a loop the user never sees.
    if (saveConflict) return;
    saveInFlightRef.current = true;

    try {
      const tracks = timelineState.tracks || [];
      const REQUIRED_BASE = ['video', 'broll', 'fx', 'voiceover', 'music', 'sfx'];
      const missingBase = REQUIRED_BASE.filter(k => !tracks.find(t => (t.key || t.id) === k));
      if (missingBase.length > 0) {
        console.warn('[saveNow] aborted — missing base tracks:', missingBase);
        return;
      }

      if (hasStemTracks.current) {
        const stemTracks = tracks.filter(t => (t.key || t.id || '').startsWith('stem-'));
        if (!stemTracks.length) {
          console.warn('[saveNow] aborted — stems were loaded but are now missing');
          return;
        }
        if (stemTracks.some(t => t.clips.length > 0 && t.clips.some(c => c.src !== undefined && !c.src))) {
          console.warn('[saveNow] aborted — stem clips have missing src URLs', stemTracks.map(t => ({ key: t.key, clips: t.clips.length, src: t.clips[0]?.src })));
          return;
        }
      }

      const h = await getAuthHeaders(); h["Content-Type"] = "application/json";
      const cleanedTracks = timelineState.tracks.map(t => {
        if (!t.key?.startsWith('stem-')) return t;
        return {
          ...t,
          clips: t.clips.filter(c => c.src && !c.src.includes('test.wav') && !c.src.includes('placeholder'))
        };
      });
      const cleanedTimeline = { ...timelineState, tracks: cleanedTracks };
      const normalizedScenes = scenesRef.current.map(s => ({ ...s, mediaUrl: s.mediaUrl || s.url || s.src || "" }));
      const thumbnailUrl = normalizedScenes.find(s => s.stockThumb || s.thumbnail || s.mediaUrl)?.stockThumb
        || normalizedScenes.find(s => s.stockThumb || s.thumbnail || s.mediaUrl)?.thumbnail
        || (isLikelyVideoUrl(normalizedScenes[0]?.mediaUrl) ? null : normalizedScenes[0]?.mediaUrl) || null;
      const bodyObj = { title, scenes: normalizedScenes, timeline: cleanedTimeline, ratio, status: "draft", globalMusicUrl, globalMusicName, thumbnail_url: thumbnailUrl, brand_id: selectedBrandId };
      // createReelOnce's POST doesn't need expected_updated_at -- there's
      // nothing on the server yet for a brand-new reel to conflict with.
      const body = JSON.stringify(bodyObj);

      // Shared PUT path for both the normal case and the "another concurrent
      // call already created the reel" fallback below -- carries
      // expected_updated_at and handles the 409/200 response the same way
      // either time, rather than duplicating the check in two places.
      const putReel = async (id) => {
        const res = await fetch("/api/reels/" + id, {
          method: "PUT", headers: h,
          body: JSON.stringify({ ...bodyObj, expected_updated_at: lastKnownUpdatedAtRef.current }),
        });
        if (res.status === 409) {
          const data = await res.json().catch(() => null);
          setSaveConflict(data?.current || {});
          return false;
        }
        if (!res.ok) return false;
        const data = await res.json().catch(() => null);
        if (data?.updated_at) lastKnownUpdatedAtRef.current = data.updated_at;
        return true;
      };

      let ok;
      if (reelIdRef.current) {
        ok = await putReel(reelIdRef.current);
      } else {
        const result = await createReelOnce(body, h);
        if (result.id && !result.created) {
          // Another concurrent call already created the reel -- still
          // persist this save's own snapshot via a normal PUT instead of
          // silently discarding it.
          ok = await putReel(result.id).catch(() => false);
        } else {
          ok = !!result.id;
        }
      }
      setSavedMsg(ok ? "Saved " + new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Save failed");
    } catch { setSavedMsg("Save failed"); }
    finally { saveInFlightRef.current = false; }
  }, [reelLoaded, title, timelineState, ratio, reelId, globalMusicUrl, globalMusicName, selectedBrandId, saveConflict]);

  useEffect(() => { const id = setInterval(() => saveNowRef.current?.(), 30000); return () => clearInterval(id); }, []);

  // Nuclear sync: any change to scenes triggers a save 500 ms later.
  // scenesRef is updated FIRST so saveNow always reads the latest scenes.
  const sceneSaveTimer = useRef(null);
  useEffect(() => {
    scenesRef.current = scenes; // must happen before the timeout fires
    if (!reelLoaded) return;
    clearTimeout(sceneSaveTimer.current);
    sceneSaveTimer.current = setTimeout(() => {
      saveNowRef.current?.();
    }, 500);
  }, [scenes, reelLoaded]);

  // Auto-title for reels that never went through Create.jsx's own auto-title
  // call (a blank "New Reel" built up scene-by-scene via the Storyboard
  // panel's Generate button -- regenerateScene and StoryboardPanel's
  // narration/action text edits both just update scene state and never
  // touched title at all, so these reels stayed "Untitled Reel" forever).
  // Reactive on scenes/title instead of hooking regenerateScene or
  // StoryboardPanel's updateField individually -- one effect covers both the
  // "prompt text typed" and "generation completed" triggers (and any future
  // path that populates scene 0) without duplicating this logic per call site.
  // autoTitleFiredRef is a genuine one-shot guard checked at debounce-fire
  // time, not at schedule time -- same clear+reschedule debounce shape as
  // the nuclear-sync save above it, so rapid typing keeps pushing the fire
  // time out, but only the first debounce cycle that actually elapses is
  // allowed to call the API, however many times this effect re-runs.
  const autoTitleFiredRef = useRef(false);
  const autoTitleTimerRef = useRef(null);
  useEffect(() => {
    if (!reelLoaded || autoTitleFiredRef.current) return;
    const hasRealTitle = title && title.trim() !== "" && title !== "Untitled Reel";
    if (hasRealTitle) { autoTitleFiredRef.current = true; return; }
    const firstPrompt = (scenes[0]?.narration || scenes[0]?.action || scenes[0]?.visual_prompt || "").trim();
    if (!firstPrompt) return;
    clearTimeout(autoTitleTimerRef.current);
    autoTitleTimerRef.current = setTimeout(async () => {
      if (autoTitleFiredRef.current) return;
      autoTitleFiredRef.current = true;
      const generated = await generateReelTitle(firstPrompt, "[EditorV2/autoTitle]");
      if (generated) setTitle(generated);
    }, 800);
  }, [scenes, title, reelLoaded]);

  useEffect(() => {
    function onKey(e) {
      // Cmd+S must be caught even when focus is in an input
      if ((e.metaKey || e.ctrlKey) && e.key === "s") { e.preventDefault(); saveNow(); return; }
      if ((e.metaKey || e.ctrlKey) && e.key === "z" && !e.shiftKey) { e.preventDefault(); undoTimeline(); return; }
      if ((e.metaKey || e.ctrlKey) && (e.key === "y" || (e.key === "z" && e.shiftKey))) { e.preventDefault(); redoTimeline(); return; }
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
      if (e.key === " ") { e.preventDefault(); setIsPlaying(p => !p); }
      // During playback, timelineState.playhead is only a checkpoint value
      // (see the playback-engine effect) -- nudging from it here would jump
      // from a stale position. Read the live ref instead whenever playing.
      if (e.key === "ArrowRight") {
        const base = isPlaying ? livePlayheadRef.current : playhead;
        dispatchWithHistory({ type: "SEEK", time: Math.max(0, base + 1/30) });
      }
      if (e.key === "ArrowLeft") {
        const base = isPlaying ? livePlayheadRef.current : playhead;
        dispatchWithHistory({ type: "SEEK", time: Math.max(0, base - 1/30) });
      }
      if (e.key === "s" && !e.metaKey) dispatchWithHistory({ type: "TOGGLE_SNAP" });
      if ((e.key === "Delete" || e.key === "Backspace") && timelineState.selected) dispatchWithHistory({ type: "DELETE_CLIP", clipId: timelineState.selected });
      if ((e.metaKey || e.ctrlKey) && e.key === "d") {
        e.preventDefault();
        if (timelineState.selected) dispatchWithHistory({ type:"DUPLICATE_CLIP", clipId:timelineState.selected });
      }
      if (e.key === "[") setSidebarOpen(p => !p);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [playhead, isPlaying, timelineState.selected, saveNow, undoTimeline, redoTimeline, dispatchWithHistory]);

  // Prevent horizontal wheel/swipe from triggering browser back navigation.
  // Must attach to window — browser captures the gesture at OS/window level before
  // any child element sees it, so a listener on #editor-v2 never fires.
  useEffect(() => {
    const prevent = e => { if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) e.preventDefault(); };
    window.addEventListener("wheel", prevent, { passive: false });
    return () => window.removeEventListener("wheel", prevent);
  }, []);

  // Preload all scene videos upfront to eliminate black frames between scenes
  const preloadCacheRef = useRef([]);
  useEffect(() => {
    if (!reelLoaded) return;
    const videoTrack = timelineState.tracks.find(t => t.key === "video");
    const brollTrack = timelineState.tracks.find(t => t.key === "broll");
    const allClips = [...(videoTrack?.clips || []), ...(brollTrack?.clips || [])];
    const srcs = [...new Set(allClips.map(c => c.src || c.url || c.mediaUrl).filter(Boolean))];
    // Clear old cache
    preloadCacheRef.current.forEach(v => { v.src = ""; });
    preloadCacheRef.current = [];
    // Build new cache
    srcs.forEach(src => {
      const v = document.createElement("video");
      v.src = src;
      v.preload = "auto";
      v.muted = true;
      v.style.display = "none";
      v.load();
      document.body.appendChild(v);
      preloadCacheRef.current.push(v);
    });
    return () => {
      preloadCacheRef.current.forEach(v => { v.src = ""; v.remove(); });
      preloadCacheRef.current = [];
    };
  }, [reelLoaded]);

  // Targeted counterpart to the effect above -- that one only ever runs once,
  // keyed on [reelLoaded], so it warms whatever scene URLs exist at initial
  // reel load and nothing assigned afterward. Any "Use on Scene"/AI Studio
  // library pick necessarily happens after the reel has already loaded, so
  // without this, a newly-assigned scene's video never gets preloaded at all
  // -- a real, confirmed contributor to the black-frame report on reel
  // bfc59931-dc7f-4d2f-89b0-362f086cc7a2. Adds exactly one hidden video to
  // the existing cache; does NOT clear or rebuild it, so it can't reproduce
  // the redundant-.load() churn that motivated removing probeAllDurations
  // (see that removal's own comment history) -- this is the only preload
  // call left in the file besides the one-shot effect above.
  const preloadSceneUrl = useCallback((src) => {
    if (!src) return;
    if (preloadCacheRef.current.some(v => v.src === src)) return;
    const v = document.createElement("video");
    v.src = src;
    v.preload = "auto";
    v.muted = true;
    v.style.display = "none";
    v.load();
    document.body.appendChild(v);
    preloadCacheRef.current.push(v);
  }, []);

  // ── Playback engine (rAF master clock) ────────────────────────────────────
  // Drives the live playhead position forward in real time when
  // isPlaying=true. Also syncs the single PreviewCanvas <video> to the
  // active scene's clip.
  //
  // timelineState.playhead (the reducer/React-state value) is intentionally
  // NOT updated every frame here anymore -- it used to be, via a SEEK
  // dispatch inside tick() below, which forced a full re-render of EditorV2
  // and every unmemoized child (SequencerPanel's ~1800 lines, every
  // TrackRow/clip, Ruler) 60 times/sec. livePlayheadRef now holds the true
  // per-frame position instead; timelineState.playhead is only synced to it
  // at discrete checkpoints (play-start, pause/stop, loop-wrap, end-of-
  // timeline). Components that need live 60fps visual sync (progress bar,
  // playhead cursor line, timecode) read livePlayheadRef via the
  // usePlayheadTicker hook, which re-renders only that one leaf component.
  const playStartRef = useRef(null); // { wallTime, playheadAtStart }
  const previewSrcRef     = useRef(null); // last src assigned to the preview <video>
  const activeVideoSlotRef = useRef("a");  // "a" | "b" — which buffer is currently showing
  const transitioningRef   = useRef(false); // true during the 150 ms crossfade
  const uploadImgRef       = useRef(null);
  const uploadVideoRef     = useRef(null);
  const brollImgRef        = useRef(null);
  const brollVideoRef      = useRef(null);
  const brollWrapperRef    = useRef(null);
  const prevBrollClipRef   = useRef(null);
  const tracksRef = useRef(timelineState.tracks);
  useEffect(() => { tracksRef.current = timelineState.tracks; }, [timelineState.tracks]);
  const scenesRef = useRef(scenes); // kept in sync by the sceneSaveTimer effect above
  const seekingRef = useRef(false); // true for 300ms after manual seek — suppresses tick
  const activeSceneRef = useRef(activeScene);
  useEffect(() => { activeSceneRef.current = activeScene; }, [activeScene]);
  const dispatchWithHistoryRef = useRef(dispatchWithHistory);
  useEffect(() => { dispatchWithHistoryRef.current = dispatchWithHistory; }, [dispatchWithHistory]);

  // Avatar generation polling — lives here (not in AvatarPanel) so it survives
  // sidebar tab switches; HeyGen jobs can take minutes and previously died on unmount.
  useEffect(() => {
    const poll = setInterval(async () => {
      const processing = scenesRef.current?.filter(s => s.avatar_status === "processing" && s.avatar_video_id);
      if (!processing?.length) return;

      const headers = await getAuthHeaders();
      for (const scene of processing) {
        try {
          const res = await fetch(`/api/heygen/status/${scene.avatar_video_id}`, { headers });
          const data = await res.json();

          if (data.status === "completed" && data.video_url) {
            setScenes(prev => prev.map(s => s.id === scene.id ? {
              ...s,
              avatar_status: "completed",
              avatar_video_url: data.video_url,
            } : s));
            const vidClip = tracksRef.current.find(t => t.key === "video")?.clips.find(c => c.sceneId === scene.id);
            // Plain dispatch, not dispatchWithHistory -- this fires from a
            // background poll on whatever timer HeyGen happens to finish
            // on, completely independent of anything the user is doing at
            // that moment. Now that history snapshots include scenes too,
            // routing this through dispatchWithHistory would let a
            // mid-session async completion get silently baked into
            // whichever user edit's undo boundary happened to be open at
            // that instant -- an undo could then jump to a state that
            // never actually existed on screen for the user.
            dispatch({
              type: "ADD_AVATAR_CLIP",
              sceneId: scene.id,
              src: data.video_url,
              startTime: vidClip?.startTime ?? 0,
              duration:  vidClip ? (vidClip.trimEnd - vidClip.trimStart) : 3,
              avatarPosition: scene.avatar_position || "bottom-right",
            });
          } else if (data.status === "failed") {
            setScenes(prev => prev.map(s => s.id === scene.id ? {
              ...s,
              avatar_status: "failed",
            } : s));
          }
        } catch (err) {
          console.error("Avatar poll error:", err);
        }
      }
    }, 5000);

    return () => clearInterval(poll);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Whether the b-roll clip currently on screen genuinely covers the preview
  // frame edge-to-edge, vs. being a partial inset (position/size feature).
  // Only the former should suppress A-roll's own overlay underneath it —
  // compares real rendered geometry (not raw xPct/yPct/sizePct math) so it
  // stays correct regardless of the b-roll asset's aspect ratio vs the
  // canvas's own. No custom position/size at all = today's original
  // full-frame behavior, unchanged.
  function brollCoversFrame(brollClip) {
    if (!brollClip) return false;
    const isCustom = brollClip.xPct != null && brollClip.yPct != null && brollClip.sizePct != null;
    if (!isCustom) return true;
    const wrapper = brollWrapperRef.current;
    const frame = document.getElementById("onyx-preview-frame");
    if (!wrapper || !frame) return true; // can't measure yet — fail safe to prior (hide) behavior
    const wRect = wrapper.getBoundingClientRect();
    const fRect = frame.getBoundingClientRect();
    const EPS = 2;
    return wRect.left <= fRect.left + EPS && wRect.top <= fRect.top + EPS &&
      wRect.right >= fRect.right - EPS && wRect.bottom >= fRect.bottom - EPS;
  }

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
    const sc = scenes.find(s => s.id === activeScene);
    // The sc.mediaUrl/sc.url fallback only applies when a clip was actually
    // found (belt-and-suspenders for a clip missing its own url fields) —
    // it must NOT fire when there's no clip at all (a genuine gap, e.g.
    // B-roll has outlived A-roll's own clip and neither track has anything
    // active here), or this falls through to the scene's raw media at
    // time 0 instead of hitting the !targetSrc hide-everything branch
    // below, which is what a real gap should do.
    const targetSrc = clip ? (clip.src || clip.url || clip.mediaUrl || sc?.mediaUrl || sc?.url || "") : "";

    const brollClipScrub = findAt("broll");
    const videoClipScrub = findAt("video");
    const isBrollScrub = !!brollClipScrub;

    if (!targetSrc) {
      cur.style.visibility = "hidden";
      const a = document.querySelector(".v2-preview-video-a");
      const b = document.querySelector(".v2-preview-video-b");
      if (a) { a.src = ""; a.load(); }
      if (b) { b.src = ""; b.load(); }
      if (uploadImgRef.current) uploadImgRef.current.style.display = 'none';
      if (uploadVideoRef.current) { uploadVideoRef.current.style.display = 'none'; uploadVideoRef.current.pause(); }
      if (brollImgRef.current) brollImgRef.current.style.display = 'none';
      if (brollVideoRef.current) { brollVideoRef.current.style.display = 'none'; brollVideoRef.current.pause(); }
      return;
    }

    const localTime = clip ? Math.max(0, ph - clip.startTime + clip.trimStart) : 0;

    // Sets imgEl/vidEl's src+time so it shows `src` at `atTime` — shared by
    // the primary clip sync below and the "A-roll stays visible underneath
    // a partial b-roll inset" case, so both stay in lockstep.
    //
    // `muted`/`volume` default to the always-muted behavior every call site
    // used to hardcode -- B-roll and Pexels/streaming overlays still want
    // that. The one caller that now passes muted=false is A-roll's own
    // upload path, so a scene with real embedded audio (an uploaded clip, a
    // reframe360 render, any source with sourceAudioMuted left at its
    // default false) actually plays here instead of being silently muted
    // regardless of the scene's own audio settings. Confirmed live
    // 2026-08-21: a reframe360 scene's real camera audio was inaudible in
    // the editor even though the file has a genuine aac stream, because
    // this was unconditionally muted no matter what.
    // fitMode default "fit" so B-roll's call site (which never passes one)
    // keeps its existing "contain" behavior unchanged -- B-roll has its own
    // separate position/size system, not this scene-level toggle. Only the
    // two A-roll upload/direct call sites below pass the scene's real
    // fitMode. Was previously a hardcoded "contain" set once in JSX,
    // completely unaware of scene.fitMode -- a real preview/export mismatch
    // found live 2026-08-27: a scene set to "Fill" still showed pillarboxed
    // in the editor (looking like the toggle did nothing) while the actual
    // export correctly cropped to fill.
    function syncOverlay(imgEl, vidEl, src, atTime, muted = true, volume = 1, fitMode = "fit") {
      if (!src) return;
      const isVid = /\.(mp4|webm|mov|m4v)(\?|$)/i.test(src) || /^https:\/\/api\.sync\.so\//i.test(src);
      if (isVid) {
        if (imgEl) imgEl.style.display = 'none';
        if (vidEl) {
          vidEl.style.display = 'block';
          vidEl.style.objectFit = fitMode === "fill" ? "cover" : "contain";
          vidEl.muted = muted;
          vidEl.volume = Math.max(0, Math.min(1, volume));
          if (vidEl.getAttribute('data-src') !== src) {
            vidEl.src = src;
            vidEl.setAttribute('data-src', src);
            vidEl.load();
            vidEl.oncanplay = () => { vidEl.oncanplay = null; vidEl.currentTime = atTime; };
          } else {
            vidEl.currentTime = atTime;
          }
        }
      } else {
        if (vidEl) { vidEl.style.display = 'none'; vidEl.pause(); }
        if (imgEl) { imgEl.src = src; imgEl.style.display = 'block'; }
      }
    }

    if (isBrollScrub) {
      // B-roll always uses the dedicated, position-aware elements regardless
      // of source type (upload or Pexels/stock) — the streaming/dual-buffer
      // path below is only for A-roll's own scene-to-scene crossfade, which
      // doesn't apply to a single overlaid clip. Previously Pexels-sourced
      // B-roll fell through to that dual-buffer path instead, rendering
      // full-frame with no position/size applied at all while paused.
      const slotA = document.querySelector('.v2-preview-video-a');
      const slotB = document.querySelector('.v2-preview-video-b');
      if (slotA) slotA.style.visibility = 'hidden';
      if (slotB) slotB.style.visibility = 'hidden';

      if (brollCoversFrame(brollClipScrub)) {
        if (uploadImgRef.current) uploadImgRef.current.style.display = 'none';
        if (uploadVideoRef.current) { uploadVideoRef.current.style.display = 'none'; uploadVideoRef.current.pause(); }
      } else if (videoClipScrub) {
        // Partial inset with a real A-roll clip underneath — keep it
        // visible and correctly seeked. Deliberately NOT falling back to
        // sc.mediaUrl/sc.url when there's no actual clip (see the branch
        // below) — that fallback used to show A-roll's scene frozen at
        // time 0 instead of clearing it once A-roll's own clip has ended.
        const arollSrc = videoClipScrub.src || videoClipScrub.url || videoClipScrub.mediaUrl || "";
        const arollLocalTime = Math.max(0, ph - videoClipScrub.startTime + videoClipScrub.trimStart);
        const arollScene = scenes.find(s => s.id === videoClipScrub.sceneId);
        syncOverlay(uploadImgRef.current, uploadVideoRef.current, arollSrc, arollLocalTime,
          !!arollScene?.sourceAudioMuted, (arollScene?.sourceAudioVolume ?? 100) / 100, arollScene?.fitMode);
      } else {
        // No A-roll clip active at all (B-roll can outlive A-roll's own
        // clip — see clip_broll_1 on reel 9c3ed13d spanning 2.1875-21.1875
        // against an 8s A-roll clip) — nothing to show underneath, so
        // clear it instead of freezing on whatever was there before.
        if (uploadImgRef.current) uploadImgRef.current.style.display = 'none';
        if (uploadVideoRef.current) { uploadVideoRef.current.style.display = 'none'; uploadVideoRef.current.pause(); }
      }

      syncOverlay(brollImgRef.current, brollVideoRef.current, targetSrc, localTime);
      return;
    }

    // A-roll itself is the active clip (no B-roll) — same upload-vs-Pexels/
    // streaming distinction as before, since that's what crossfades between
    // sequential A-roll scenes.
    if (brollImgRef.current) brollImgRef.current.style.display = 'none';
    if (brollVideoRef.current) { brollVideoRef.current.style.display = 'none'; brollVideoRef.current.pause(); }

    const isUpload = !targetSrc.includes('videos.pexels.com');
    if (isUpload) {
      const slotA = document.querySelector('.v2-preview-video-a');
      const slotB = document.querySelector('.v2-preview-video-b');
      if (slotA) slotA.style.visibility = 'hidden';
      if (slotB) slotB.style.visibility = 'hidden';
      const arollScene = scenes.find(s => s.id === clip?.sceneId);
      syncOverlay(uploadImgRef.current, uploadVideoRef.current, targetSrc, localTime,
        !!arollScene?.sourceAudioMuted, (arollScene?.sourceAudioVolume ?? 100) / 100, arollScene?.fitMode);
      return;
    }

    // Pexels/streaming A-roll scene: hide upload overlay, use dual-buffer crossfade
    if (uploadImgRef.current) uploadImgRef.current.style.display = 'none';
    if (uploadVideoRef.current) { uploadVideoRef.current.style.display = 'none'; uploadVideoRef.current.pause(); }

    // Same src AND same clip — just seek
    if (cur.getAttribute("data-src") === targetSrc && cur.getAttribute("data-clip-id") === (clip?.id || '')) {
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
    nxt.setAttribute("data-clip-id", clip?.id || '');
    nxt.muted = true;
    nxt.style.zIndex = 3;
    cur.style.zIndex = 2;

    // Capture outgoing scene's transition NOW — cur is still the outgoing slot
    const outgoingSrc = cur.getAttribute("data-src");
    const outgoingClip = tracksRef.current.flatMap(t => t.clips || []).find(c =>
      (c.src || c.url || c.mediaUrl) === outgoingSrc
    );
    const scrubTransType = outgoingClip
      ? (scenesRef.current.find(s => s.id === outgoingClip.sceneId)?.transitionToNext || "crossfade")
      : "crossfade";

    nxt.oncanplay = () => {
      nxt.oncanplay = null;
      nxt.currentTime = localTime;
      applyTransition(scrubTransType, cur, nxt, () => {
        cur.style.zIndex = 2;
        nxt.style.zIndex = 2;
        activeVideoSlotRef.current = activeVideoSlotRef.current === "a" ? "b" : "a";
        transitioningRef.current = false;
      });
    };
    nxt.load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playhead, timelineState.tracks, isPlaying]);

  useEffect(() => {
    if (!isPlaying) {
      // Checkpoint: sync timelineState.playhead to the exact stop position.
      // Only fires when actually stopping FROM an active play session
      // (playStartRef was set) -- avoids a bogus SEEK on initial mount or
      // any other re-run while already paused.
      if (playStartRef.current) {
        dispatchWithHistory({ type: "SEEK", time: livePlayheadRef.current });
      }
      playStartRef.current = null;
      previewSrcRef.current = null; // force src re-sync on next play
      prevBrollClipRef.current = null;
      // Pause both preview video slots, plus the upload-overlay and B-roll
      // video elements -- any non-Pexels A-roll (AI-generated, uploaded,
      // reframe360, character-consistency, etc.) plays through
      // uploadVideoRef instead of the a/b crossfade slots (see the isUpload
      // branches above), and was never being paused here. Invisible for
      // short AI-gen clips (a few seconds, easy to miss finishing on its
      // own) but very visible on a long continuous upload-type video: it
      // just kept playing after Pause, confirmed live 2026-08-21 on a 135s
      // reframe360 reel.
      document.querySelectorAll(".v2-preview-video-a, .v2-preview-video-b").forEach(v => v.pause());
      uploadVideoRef.current?.pause();
      brollVideoRef.current?.pause();
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
    livePlayheadRef.current = timelineState.playhead ?? 0;

    // Debug: log first stem clip src so we can verify URLs are populated
    const firstStemClip = tracksRef.current
      .filter(t => t.key?.startsWith("stem-") || t.type === "stem")
      .flatMap(t => t.clips)
      .find(c => c.src);

    let rafId;

    function tick() {
      // Moved ahead of the wallTime read below (it used to run one line
      // after dereferencing playStartRef.current.wallTime -- if that ref
      // were ever actually null, that dereference would throw before this
      // check could even run, making the guard unreachable dead code).
      // Reschedules instead of a bare return -- a bare return here
      // permanently killed the whole requestAnimationFrame loop with no
      // error and no way to recover except pause/replay, since nothing else
      // ever calls tick() again once it stops rescheduling itself.
      if (seekingRef.current && !playStartRef.current) { rafId = requestAnimationFrame(tick); return; }
      const now     = performance.now() / 1000;
      const elapsed = now - playStartRef.current.wallTime;
      const newPH   = playStartRef.current.playheadAtStart + elapsed;

      // Stop at end, or wrap for loop
      const effectiveEnd = loopEnabledRef.current && loopOutRef.current !== null
        ? loopOutRef.current : totalSec;
      if (newPH >= effectiveEnd) {
        if (loopEnabledRef.current && loopOutRef.current !== null) {
          const wrapped = loopInRef.current + (newPH - effectiveEnd);
          playStartRef.current = { wallTime: performance.now() / 1000, playheadAtStart: wrapped };
          livePlayheadRef.current = wrapped;
          // Checkpoint: loop-wrap is one of the discrete points
          // timelineState.playhead gets resynced, not every frame.
          dispatchWithHistory({ type: "SEEK", time: wrapped });
          rafId = requestAnimationFrame(tick);
          return;
        }
        livePlayheadRef.current = 0;
        dispatchWithHistory({ type: "SEEK", time: 0 });
        setIsPlaying(false);
        uploadVideoRef.current?.pause();
        return;
      }

      // Live position updates every frame via the ref only -- NOT dispatched
      // to the reducer here. This is the core of the fix: previously this
      // dispatched SEEK every single frame (~60/sec), spreading the entire
      // timelineState object and forcing a full re-render of EditorV2 and
      // every unmemoized child. See usePlayheadTicker for how components
      // that need live 60fps sync read this ref directly instead.
      livePlayheadRef.current = newPH;

      // Sync preview video — broll takes priority over video when both overlap
      const getSlotsTick = () => {
        const a = document.querySelector(".v2-preview-video-a");
        const b = document.querySelector(".v2-preview-video-b");
        return activeVideoSlotRef.current === "a" ? { cur: a, nxt: b } : { cur: b, nxt: a };
      };
      const findActive = (key) => tracksRef.current
        .find(t => t.key === key)?.clips
        .find(c => newPH >= c.startTime && newPH < c.startTime + (c.trimEnd - c.trimStart));
      const brollClip = findActive("broll");
      const videoClip = findActive("video");
      const clip = brollClip ?? videoClip;
      const isBroll = !!brollClip;
      const brollFullyCovers = !isBroll || brollCoversFrame(brollClip);
      // Keeps A-roll's own overlay in sync with the actual A-roll clip
      // underneath a partial-inset B-roll box, or explicitly clears it when
      // there's no A-roll clip active at all (B-roll can outlive A-roll's
      // own clip — see clip_broll_1 on reel 9c3ed13d spanning 2.1875-21.1875
      // against an 8s A-roll clip). Leaving it untouched froze A-roll on its
      // last real frame indefinitely instead of clearing once it ends.
      function syncOrHideAroll() {
        const vidEl = uploadVideoRef.current;
        const arollSrc = videoClip ? (videoClip.url || videoClip.mediaUrl || videoClip.src || "") : "";
        if (arollSrc && vidEl) {
          const arollSpeed = videoClip.speed || 1;
          const arollLocalTime = (newPH - videoClip.startTime) * arollSpeed + videoClip.trimStart;
          const arollScene = scenes.find(s => s.id === videoClip.sceneId);
          // Same preview/export mismatch fix as syncOverlay() above (scrub
          // path) -- this is the separate play-loop implementation, doesn't
          // share code with syncOverlay, so needed its own one-line fix.
          vidEl.style.objectFit = arollScene?.fitMode === "fill" ? "cover" : "contain";
          vidEl.muted = !!arollScene?.sourceAudioMuted;
          vidEl.volume = Math.max(0, Math.min(1, (arollScene?.sourceAudioVolume ?? 100) / 100));
          if (vidEl.getAttribute('data-src') !== arollSrc) {
            vidEl.src = arollSrc;
            vidEl.setAttribute('data-src', arollSrc);
            vidEl.load();
            vidEl.oncanplay = () => { vidEl.oncanplay = null; vidEl.currentTime = arollLocalTime; };
          } else if (Math.abs(vidEl.currentTime - arollLocalTime) > 0.3) {
            vidEl.currentTime = arollLocalTime;
          }
          vidEl.style.display = 'block';
          return;
        }
        if (uploadImgRef.current) uploadImgRef.current.style.display = 'none';
        if (vidEl) { vidEl.style.display = 'none'; vidEl.pause(); }
      }
      if (clip) {
        const clipSrc = clip.url || clip.mediaUrl || clip.src || "";
        const isUpload = !clipSrc.includes('videos.pexels.com');
        let skipArollSync = false;

        if (isUpload) {
          const isVideoUpload = /\.(mp4|webm|mov|m4v)(\?|$)/i.test(clipSrc) || /^https:\/\/api\.sync\.so\//i.test(clipSrc);

          if (isBroll) {
            // B-roll upload: use dedicated brollVideoRef/brollImgRef
            const bImgEl = brollImgRef.current;
            const bVidEl = brollVideoRef.current;
            // Flash fix — detect clip change and reload immediately
            let brollFreshlyLoaded = false;
            if (prevBrollClipRef.current !== clip.id) {
              prevBrollClipRef.current = clip.id;
              if (isVideoUpload) {
                if (bImgEl) bImgEl.style.display = 'none';
                if (bVidEl) {
                  bVidEl.style.display = 'block';
                  bVidEl.src = clipSrc;
                  bVidEl.setAttribute('data-src', clipSrc);
                  bVidEl.muted = true;
                  bVidEl.onended = () => {
                    // getSlotsTick() only ever manages the Pexels/streaming
                    // crossfade slots (.v2-preview-video-a/-b) -- for an
                    // uploaded A-roll clip (AI-generated, character-
                    // consistency, any non-Pexels source), the actual
                    // visible element is uploadVideoRef.current instead,
                    // and those crossfade slots have no src at all for it.
                    // Blindly resuming via getSlotsTick() here called
                    // .play() on an empty element, throwing
                    // NotSupportedError on every single B-roll-end boundary
                    // during playback (confirmed live 2026-08-19: 14 errors
                    // across one reel's two B-roll boundaries). Route to
                    // the correct element based on the actual A-roll clip's
                    // source, matching the same isUpload check used
                    // everywhere else in this tick function.
                    const arollClipOnEnd = findActive("video");
                    const arollClipOnEndSrc = arollClipOnEnd ? (arollClipOnEnd.url || arollClipOnEnd.mediaUrl || arollClipOnEnd.src || "") : "";
                    const arollOnEndIsUpload = arollClipOnEndSrc && !arollClipOnEndSrc.includes('videos.pexels.com');
                    const arollCur = arollOnEndIsUpload ? uploadVideoRef.current : getSlotsTick().cur;
                    if (arollCur) {
                      if (arollClipOnEnd) {
                        const ph = playStartRef.current.playheadAtStart + (performance.now() / 1000 - playStartRef.current.wallTime);
                        arollCur.currentTime = Math.max(0, (ph - arollClipOnEnd.startTime) * (arollClipOnEnd.speed || 1) + arollClipOnEnd.trimStart);
                      }
                      arollCur.play().catch(err => console.error("[preview] play() failed resuming A-roll after broll ended:", err));
                    }
                  };
                  bVidEl.load();
                  // Calling .play() synchronously right after .load() races the
                  // browser's own readiness state (readyState resets to
                  // HAVE_NOTHING) and commonly rejects -- gate on oncanplay
                  // instead, same pattern syncOrHideAroll() already uses for
                  // currentTime. brollFreshlyLoaded skips the per-tick retry
                  // below on this same tick so there's only one attempt until
                  // the browser actually signals ready.
                  bVidEl.oncanplay = () => {
                    bVidEl.oncanplay = null;
                    bVidEl.play().catch(err => console.error("[preview] oncanplay play() failed for broll upload:", err));
                  };
                  brollFreshlyLoaded = true;
                }
              } else {
                if (bVidEl) { bVidEl.style.display = 'none'; bVidEl.pause(); }
                if (bImgEl) { bImgEl.src = clipSrc; bImgEl.style.display = 'block'; }
              }
            }
            if (isVideoUpload && bVidEl && !brollFreshlyLoaded) {
              const clipSpeed = clip.speed || 1;
              const localTime = (newPH - clip.startTime) * clipSpeed + clip.trimStart;
              if (Math.abs(bVidEl.currentTime - localTime) > 0.3) bVidEl.currentTime = localTime;
              bVidEl.playbackRate = clipSpeed;
              if (bVidEl.paused) bVidEl.play().catch(err => console.error("[preview] play() failed for broll upload:", err));
            }
            if (!brollFullyCovers) syncOrHideAroll();
            // Pause A-roll only when B-roll is a video (not image/PNG/etc)
            const isBrollVideo = isVideoUpload;
            if (isBrollVideo) {
              const { cur: arollCur } = getSlotsTick();
              if (arollCur && !arollCur.paused) arollCur.pause();
            }
            skipArollSync = true;
          } else {
            // A-roll upload: hide video slots and broll overlays, show upload overlay
            const slotA = document.querySelector('.v2-preview-video-a');
            const slotB = document.querySelector('.v2-preview-video-b');
            if (slotA) slotA.style.visibility = 'hidden';
            if (slotB) slotB.style.visibility = 'hidden';
            if (brollImgRef.current) brollImgRef.current.style.display = 'none';
            if (brollVideoRef.current) { brollVideoRef.current.pause(); brollVideoRef.current.removeAttribute('src'); brollVideoRef.current.load(); brollVideoRef.current.style.display = 'none'; }
            prevBrollClipRef.current = null;
            const imgEl = uploadImgRef.current;
            const vidEl = uploadVideoRef.current;
            let arollFreshlyLoaded = false;
            if (previewSrcRef.current !== clipSrc) {
              previewSrcRef.current = clipSrc;
              if (isVideoUpload) {
                if (imgEl) imgEl.style.display = 'none';
                if (vidEl) {
                  vidEl.style.display = 'block';
                  vidEl.src = clipSrc;
                  vidEl.setAttribute('data-src', clipSrc);
                  // Respects the scene's own sourceAudioMuted/sourceAudioVolume
                  // instead of always muting -- see syncOverlay's comment above
                  // for why this changed (a scene's real embedded audio, e.g.
                  // an uploaded clip or a reframe360 render, was previously
                  // inaudible in the editor no matter what).
                  const clipScene = scenes.find(s => s.id === clip.sceneId);
                  vidEl.muted = !!clipScene?.sourceAudioMuted;
                  vidEl.volume = Math.max(0, Math.min(1, (clipScene?.sourceAudioVolume ?? 100) / 100));
                  vidEl.load();
                  // Calling .play() synchronously right after .load() races the
                  // browser's own readiness state (readyState resets to
                  // HAVE_NOTHING) and commonly rejects with AbortError -- gate
                  // on oncanplay instead, same pattern syncOrHideAroll() above
                  // already uses for currentTime. This is the main A-roll
                  // preview path for any non-Pexels source (AI-generated,
                  // uploaded, character-consistency, ...) -- previewSrcRef is
                  // force-reset to null on every pause (see the !isPlaying
                  // branch above), so this exact load()-then-play() race fires
                  // on every single Play press, not just once.
                  vidEl.oncanplay = () => {
                    vidEl.oncanplay = null;
                    vidEl.play().catch(err => console.error("[preview] oncanplay play() failed for A-roll upload:", err));
                  };
                  arollFreshlyLoaded = true;
                }
              } else {
                if (vidEl) { vidEl.style.display = 'none'; vidEl.pause(); }
                if (imgEl) { imgEl.src = clipSrc; imgEl.style.display = 'block'; }
              }
            }
            if (isVideoUpload && vidEl) {
              const clipSpeed = clip.speed || 1;
              const localTime = (newPH - clip.startTime) * clipSpeed + clip.trimStart;
              if (Math.abs(vidEl.currentTime - localTime) > 0.3) vidEl.currentTime = localTime;
              vidEl.playbackRate = clipSpeed;
              if (!arollFreshlyLoaded && vidEl.paused) vidEl.play().catch(err => console.error("[preview] play() failed for A-roll upload:", err));
            }
            skipArollSync = true;
          }
        } else {
          // Pexels/streaming clip: hide upload overlays — but only
          // unconditionally when B-roll isn't a partial inset. A partial
          // inset should leave A-roll visible underneath, same principle
          // the isUpload+isBroll branch above already gets for free (it
          // never hides A-roll's overlay in the first place).
          if (brollFullyCovers) {
            if (uploadImgRef.current) uploadImgRef.current.style.display = 'none';
            if (uploadVideoRef.current) { uploadVideoRef.current.style.display = 'none'; uploadVideoRef.current.pause(); }
          }
          if (!isBroll) {
            if (brollImgRef.current) brollImgRef.current.style.display = 'none';
            if (brollVideoRef.current) { brollVideoRef.current.pause(); brollVideoRef.current.removeAttribute('src'); brollVideoRef.current.load(); brollVideoRef.current.style.display = 'none'; }
            prevBrollClipRef.current = null;
          } else {
            // Stock/Pexels broll video — show it over A-roll
            const bVidEl = brollVideoRef.current;
            if (bVidEl) {
              let stockBrollFreshlyLoaded = false;
              if (prevBrollClipRef.current !== clip.id) {
                prevBrollClipRef.current = clip.id;
                bVidEl.src = clipSrc;
                bVidEl.setAttribute('data-src', clipSrc);
                bVidEl.muted = true;
                bVidEl.load();
                // Same load()-then-play() race as the other spots in this
                // effect -- gate on oncanplay instead of calling play()
                // synchronously right after load().
                bVidEl.oncanplay = () => {
                  bVidEl.oncanplay = null;
                  bVidEl.play().catch(err => console.error("[preview] oncanplay play() failed for stock broll:", err));
                };
                stockBrollFreshlyLoaded = true;
              }
              bVidEl.style.display = 'block';
              bVidEl.style.zIndex = '10';
              const clipSpeed = clip.speed || 1;
              const localTime = (newPH - clip.startTime) * clipSpeed + clip.trimStart;
              if (Math.abs(bVidEl.currentTime - localTime) > 0.3) bVidEl.currentTime = localTime;
              bVidEl.playbackRate = clipSpeed;
              if (!stockBrollFreshlyLoaded && bVidEl.paused) bVidEl.play().catch(err => console.error("[preview] play() failed for stock broll:", err));
            }
            if (!brollFullyCovers) syncOrHideAroll();
            // Pause A-roll while stock broll video plays
            const { cur: arollCur } = getSlotsTick();
            if (arollCur && !arollCur.paused) arollCur.pause();
            skipArollSync = true;
          }
        }

        // A-roll dual-buffer sync — runs for non-upload clips and broll-upload clips
        if (!skipArollSync) {
          const arollClip = isBroll ? videoClip : clip;
          const arollSrc = arollClip ? (arollClip.url || arollClip.mediaUrl || arollClip.src || "") : "";

          if (arollSrc && previewSrcRef.current !== arollSrc && !transitioningRef.current) {
            const outgoingSrc = previewSrcRef.current;
            previewSrcRef.current = arollSrc;
            transitioningRef.current = true;
            // Look up outgoing clip by its source URL (mirrors scrub path) — more reliable than
            // activeSceneRef which lags one render behind the useEffect sync.
            const outgoingClipForTrans = tracksRef.current.flatMap(t => t.clips || []).find(c =>
              outgoingSrc && (c.src || c.url || c.mediaUrl) === outgoingSrc
            );
            const outgoingSceneId = outgoingClipForTrans?.sceneId ?? activeSceneRef.current;
            const outgoingScene = scenesRef.current.find(s => s.id === outgoingSceneId);
            const playTransType = outgoingClipForTrans?.transitionToNext
              || outgoingScene?.transitionToNext
              || "fade";
            const { cur, nxt } = getSlotsTick();
            if (cur && nxt) {
              cur.pause();
              nxt.oncanplay = null;
              nxt.onerror = null;
              nxt.style.opacity = "0";
              nxt.style.visibility = "hidden";
              nxt.src = arollSrc;
              nxt.setAttribute("data-src", arollSrc);
              nxt.muted = true;
              nxt.style.zIndex = 3;
              cur.style.zIndex = 2;
              nxt.onerror = () => { nxt.onerror = null; nxt.oncanplay = null; transitioningRef.current = false; };
              nxt.oncanplay = () => {
                nxt.oncanplay = null;
                nxt.onerror = null;
                nxt.currentTime = Math.max(0, newPH - arollClip.startTime + arollClip.trimStart);
                nxt.style.visibility = "visible";
                nxt.play().catch(err => console.error("[preview] oncanplay play() failed for dual-buffer crossfade:", err));
                applyTransition(playTransType, cur, nxt, () => {
                  cur.pause();
                  cur.style.visibility = 'hidden';
                  cur.style.opacity = '0';
                  cur.style.zIndex = 2;
                  nxt.style.zIndex = 2;
                  activeVideoSlotRef.current = activeVideoSlotRef.current === "a" ? "b" : "a";
                  transitioningRef.current = false;
                });
              };
              nxt.load();
            }
          }

          if (!transitioningRef.current) {
            const { cur } = getSlotsTick();
            if (cur) {
              cur.style.visibility = "visible";
              const arollSpeed = arollClip ? (arollClip.speed || 1) : 1;
              const localTime = arollClip ? ((newPH - arollClip.startTime) * arollSpeed + arollClip.trimStart) : 0;
              if (Math.abs(cur.currentTime - localTime) > 0.3) cur.currentTime = localTime;
              cur.playbackRate = arollSpeed;
              if (cur.paused) cur.play().catch(err => console.error("[preview] play() failed for active preview slot:", err));
            }
          }
        }

        // Switch active scene if playhead crossed into a different clip
        if (clip.sceneId != null && clip.sceneId !== activeSceneRef.current) {
          setActiveScene(clip.sceneId);
        }
      } else {
        // Gap between clips — blank the preview and overlays
        const { cur } = getSlotsTick();
        if (cur) { cur.pause(); cur.currentTime = 0; cur.style.visibility = "hidden"; }
        if (uploadImgRef.current) uploadImgRef.current.style.display = 'none';
        if (uploadVideoRef.current) { uploadVideoRef.current.style.display = 'none'; uploadVideoRef.current.pause(); }
        if (brollImgRef.current) brollImgRef.current.style.display = 'none';
        if (brollVideoRef.current) { brollVideoRef.current.pause(); brollVideoRef.current.removeAttribute('src'); brollVideoRef.current.load(); brollVideoRef.current.style.display = 'none'; }
        prevBrollClipRef.current = null;
      }

      // Sync audio tracks (voiceover, music, sfx, and dynamic stem tracks)
      const stemAudioTracks = tracksRef.current
        .filter(t => t.key?.startsWith("stem-") || t.type === "stem")
        .map(t => ({ key: t.key, volRef: { current: 1 } }));
      const AUDIO_TRACKS = [
        { key: "voiceover", volRef: voiceoverVolumeRef },
        { key: "music",     volRef: musicVolumeRef },
        { key: "sfx",       volRef: musicVolumeRef },
        ...stemAudioTracks,
      ];
      AUDIO_TRACKS.forEach(({ key, volRef }) => {
        const track = tracksRef.current.find(t => t.key === key);
        if (!track) return;
        track.clips.forEach(clip => {
          if (!clip.src) return;
          const clipDur = clip.trimEnd - clip.trimStart;
          const inRange = newPH >= clip.startTime && newPH < clip.startTime + clipDur;
          let el = audioElementsRef.current.get(clip.id);
          // Pooled elements previously kept whatever src they were created
          // with forever, even if the clip's src later changed (e.g. a
          // regenerated voiceover) -- recreate on mismatch instead of
          // silently playing stale audio or re-failing on an old bad URL.
          if (el && el.dataset.src !== clip.src) { el.pause(); el = null; audioElementsRef.current.delete(clip.id); }
          if (!el) {
            el = new Audio(clip.src);
            el.dataset.src = clip.src;
            el.preload = "auto";
            // A source that's fundamentally unplayable (404, wrong codec,
            // stale/moved URL) fails every single play() attempt -- without
            // this, the tick loop below (runs on every animation frame,
            // ~60/sec) retries forever, logging a fresh console.error and
            // burning CPU every frame instead of once. Real fix belongs in
            // whatever produced the broken URL; this stops the runaway
            // retry storm regardless of the underlying cause.
            el.addEventListener("error", () => { el.dataset.playFailed = "1"; }, { once: true });
            audioElementsRef.current.set(clip.id, el);
          }
          el.muted = !!track.muted;
          el.volume = track.muted ? 0 : Math.min(1, Math.max(0, volRef.current * ((track.volume ?? 100) / 100)));
          if (inRange) {
            const localTime = newPH - clip.startTime + clip.trimStart;
            if (Math.abs(el.currentTime - localTime) > 0.25) el.currentTime = localTime;
            if (el.paused && !el.dataset.playFailed) {
              el.play().catch(err => {
                el.dataset.playFailed = "1";
                console.error(`[preview] play() failed for audio track "${key}" (clip ${clip.id}, src ${clip.src}):`, err);
              });
            }
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
    // One snapshot for the whole atomic edit (scenes + the clip change it
    // triggers below), taken BEFORE either mutates -- pushHistorySnapshot
    // must run first while scenesRef.current still holds the pre-edit
    // scenes array. The clip-side change below uses plain dispatch (not
    // dispatchWithHistory) so this doesn't double-push.
    pushHistorySnapshot();
    setScenes(prev => prev.map(s => s.id === id ? { ...s, ...changes } : s));
    const clip = timelineState.tracks?.flatMap(t => t.clips).find(c => c.sceneId === id);
    if (clip) {
      const clipChanges = { ...changes };
      if ('mediaUrl' in changes) clipChanges.src = changes.mediaUrl;
      let durationChanged = false;
      if ('duration' in changes) {
        clipChanges.duration = changes.duration;
        clipChanges.trimEnd = (clip.trimStart ?? 0) + changes.duration;
        durationChanged = Number(changes.duration) !== Number(clip.duration);
      }
      // Reflow downstream clips when duration actually changes (e.g. a scene's
      // placeholder duration gets replaced once its real voiceover/video length
      // is known) — a plain UPDATE_CLIP only resizes this clip in place and
      // leaves every later clip's startTime stale, causing visual overlap.
      dispatch({
        type: durationChanged ? "RESIZE_CLIP_REFLOW" : "UPDATE_CLIP",
        clipId: clip.id,
        changes: clipChanges,
      });
    }
  }, [timelineState.tracks, dispatch, pushHistorySnapshot]);
  const updateSceneRef = useRef(updateScene);
  updateSceneRef.current = updateScene;

  // Backfills any scene left with a jobId + generationPending:true but no
  // real media -- the trail regenerateScene now leaves behind when its own
  // poll loop dies instead of delivering a result. Runs on initial reel load
  // and again on tab visibility/focus regain (see effects below), so both
  // "closed the laptop and came back later" and "backgrounded the tab and
  // switched back" self-heal without a support ticket or manual DB lookup.
  const reconcilingJobsRef = useRef(new Set());
  const reconcilePendingScenes = useCallback(async () => {
    const list = scenesRef.current || [];
    const pending = list.filter(sc =>
      sc.generationPending && sc.jobId && !(sc.mediaUrl || sc.url) && !reconcilingJobsRef.current.has(sc.jobId)
    );
    if (!pending.length) return;
    for (const sc of pending) {
      reconcilingJobsRef.current.add(sc.jobId);
      try {
        const ph = await getAuthHeaders();
        const poll = await (await fetch(`/api/kling/status/${sc.jobId}`, { headers: ph })).json();
        if (poll.status === "completed" && poll.videoUrl) {
          // Same mediaType stamp as the normal completion handler above --
          // this reconciler hits the exact same staleness bug for jobs that
          // finished while the tab was closed/reloaded.
          updateSceneRef.current(sc.id, {
            mediaUrl: poll.videoUrl, url: poll.videoUrl, mediaType: "video",
            thumbnail: poll.thumbnailUrl || poll.videoUrl,
            lipSynced: !!poll.lipSynced, needsBleedFade: !!poll.needsBleedFade,
            generationPending: false, jobId: null,
          });
        } else if (poll.status === "failed") {
          updateSceneRef.current(sc.id, { generationPending: false });
        }
        // else still genuinely pending -- leave as-is, picked up again next
        // load or the next visibility/focus reconciliation pass.
      } catch (e) {
        console.warn("[EditorV2] reconcile pending scene failed:", sc.id, e);
      } finally {
        reconcilingJobsRef.current.delete(sc.jobId);
      }
    }
  }, []);

  // Re-arm reconciliation whenever the tab regains focus/visibility -- catches
  // "backgrounded the tab mid-generation, came back later" without requiring
  // a full page reload (the load() effect below only covers a fresh load).
  useEffect(() => {
    const handler = () => { if (document.visibilityState === "visible") reconcilePendingScenes(); };
    document.addEventListener("visibilitychange", handler);
    window.addEventListener("focus", handler);
    return () => {
      document.removeEventListener("visibilitychange", handler);
      window.removeEventListener("focus", handler);
    };
  }, [reconcilePendingScenes]);

  const [applyingBrand, setApplyingBrand] = useState(false);

  // Brand Quick-Apply: pushes the selected brand's default VO voice / avatar /
  // music onto one scene or the whole reel via POST /api/brands/:id/apply,
  // then merges the server's response back into local scene + timeline state
  // so the editor reflects it without a reload.
  const applyBrandToScenes = useCallback(async (scope) => {
    if (!selectedBrandId) { toast.show("Select a brand first", "error"); return; }
    if (!reelId) { toast.show("Save the reel before applying a brand", "error"); return; }
    const sceneId = scope === "scene" ? activeScene : undefined;
    if (scope === "scene" && !sceneId) { toast.show("Select a scene first", "error"); return; }

    setApplyingBrand(true);
    try {
      const headers = await getAuthHeaders();
      headers["Content-Type"] = "application/json";
      const res = await fetch(`/api/brands/${selectedBrandId}/apply`, {
        method: "POST",
        headers,
        body: JSON.stringify({ reelId, ...(sceneId ? { sceneId } : {}) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Apply failed");

      // Must happen before the updateSceneRef.current calls below, not after
      // this whole function -- each of those schedules its own
      // triggerSaveAfterSceneChange 100ms-later saveNow call, and the VO
      // audio-duration Promise.all below can easily take longer than that,
      // so those inner saves were firing (and 409-ing against this POST's
      // own DB write) using a still-stale ref if this update happened any
      // later. Found 2026-08-17 chasing why the conflict still reproduced
      // after an earlier attempt at this same fix placed it at the end of
      // the function instead.
      if (data.reel?.updated_at) lastKnownUpdatedAtRef.current = data.reel.updated_at;

      const updatedScenes = data.reel?.scenes || [];
      // Pre-fetch VO audio durations so scene/clip length stays in sync with
      // the new voiceover, mirroring useVoiceoverEngine's regenerateVoiceovers.
      await Promise.all(
        updatedScenes
          .filter((s) => s.voiceoverUrl)
          .map(
            (s) =>
              new Promise((resolve) => {
                const audio = new Audio();
                audio.onloadedmetadata = () => { s.__voDuration = audio.duration; resolve(); };
                audio.onerror = () => resolve();
                audio.src = s.voiceoverUrl;
              })
          )
      );

      updatedScenes.forEach((updated) => {
        const original = scenes.find((s) => String(s.id) === String(updated.id));
        if (!original) return;
        const changes = {
          voiceoverUrl: updated.voiceoverUrl,
          voiceoverVoice: updated.voiceoverVoice,
          voiceoverProvider: updated.voiceoverProvider,
          avatar_id: updated.avatar_id,
          avatar_status: updated.avatar_status,
          avatar_video_id: updated.avatar_video_id,
          avatar_position: updated.avatar_position,
        };
        if (updated.__voDuration > 0) {
          changes.duration = updated.__voDuration + 1.5;
        }
        updateSceneRef.current(original.id, changes);
      });

      if (data.reel?.global_music_url) {
        setGlobalMusicUrl(data.reel.global_music_url);
        setGlobalMusicName(data.reel.global_music_name || "");
      }

      const summary = data.applied
        ? Object.entries(data.applied).map(([k, v]) => `${k}: ${v}`).join(" · ")
        : "Brand applied";
      toast.show(summary, "success");
    } catch (err) {
      toast.show(err.message || "Apply failed", "error");
    } finally {
      setApplyingBrand(false);
    }
  }, [selectedBrandId, reelId, activeScene, scenes, toast]);

  const handleSetScenes = useCallback((updater) => {
    // One snapshot for the whole batch of scene+clip changes below,
    // taken BEFORE any mutation -- must run before setScenes so
    // scenesRef.current still holds the pre-edit array. Internal syncs
    // below use plain dispatch (not dispatchWithHistory) so a single
    // user action (e.g. one Duration edit) is one undo step, not several.
    pushHistorySnapshot();
    setScenes(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      if (!Array.isArray(next)) return prev;

      // Use the live ref instead of the stale closure to avoid missed existing-clip lookups
      const voTrack  = tracksRef.current.find(t => t.key === "voiceover");
      const vidTrack = tracksRef.current.find(t => t.key === "video");
      const sfxTrack = tracksRef.current.find(t => t.key === "sfx");

      next.forEach(scene => {
        const old = prev.find(s => s.id === scene.id);
        if (!old) return;

        // Sync duration changes into the video track clip's trimEnd, same
        // RESIZE_CLIP_REFLOW pattern updateScene() already uses (that
        // function correctly reflows every downstream clip's startTime so
        // later scenes don't visually overlap, and gets undo/redo for free
        // via dispatchWithHistory). StoryboardPanel's Duration field goes
        // through this function instead, not updateScene, and had no
        // duration handling at all -- the clip never resized until Save,
        // and being a plain setScenes with no dispatchWithHistory call, it
        // wasn't undoable either (confirmed live 2026-08-19).
        if (old.duration !== scene.duration && scene.duration != null) {
          const vidClip = vidTrack?.clips.find(c => c.sceneId === scene.id);
          if (vidClip) {
            dispatch({
              type: "RESIZE_CLIP_REFLOW",
              clipId: vidClip.id,
              changes: { duration: scene.duration, trimEnd: (vidClip.trimStart ?? 0) + scene.duration },
            });
          }
        }

        // Sync media changes into the video track clip
        const newMedia = scene.mediaUrl || scene.url || "";
        const oldMedia = old.mediaUrl || old.url || "";
        if (newMedia !== oldMedia) {
          const vidClip = vidTrack?.clips.find(c => c.sceneId === scene.id);
          if (vidClip) {
            dispatch({ type: "UPDATE_CLIP", clipId: vidClip.id, changes: { src: newMedia, thumbnail: scene.thumbnail || newMedia } });
          } else {
            console.warn('[handleSetScenes] no vidClip found for sceneId', scene.id, 'clips:', vidTrack?.clips.map(c => c.sceneId));
          }
        }

        // Sync captionsEnabled into the video track clip -- buildV2RenderRequest
        // reads clip.captionsEnabled (EditorV2.jsx), not scene.captionsEnabled,
        // but StoryboardPanel's "Show captions on canvas" checkbox only ever
        // updated the scene. Without this, the clip stayed frozen at whatever
        // importFromScenes set it to at initial load, so toggling the checkbox
        // after that point looked like it worked (the live preview reads
        // scene.captionsEnabled directly and updated correctly) but had zero
        // effect on what actually got exported.
        if (old.captionsEnabled !== scene.captionsEnabled) {
          const vidClip = vidTrack?.clips.find(c => c.sceneId === scene.id);
          if (vidClip) {
            dispatch({ type: "UPDATE_CLIP", clipId: vidClip.id, changes: { captionsEnabled: scene.captionsEnabled !== false } });
          }
        }

        // Sync narration/action into the video track clip -- same failure
        // class as captionsEnabled above, just never given the same fix.
        // SequencerPanel's clip label falls back to clip.narration (never
        // scene.narration), so once a clip exists, its narration/action stay
        // frozen at whatever IMPORT_SCENES set them to at creation -- editing
        // either in StoryboardPanel after that point correctly updates scene
        // state (and export self-heals via buildV2RenderRequest's
        // clip.narration||scene.narration fallback, so captions/export were
        // never actually broken) but the sequencer keeps showing the stale
        // value forever, reading as "narration not carrying into the reel."
        if (old.narration !== scene.narration || old.action !== scene.action) {
          const vidClip = vidTrack?.clips.find(c => c.sceneId === scene.id);
          if (vidClip) {
            dispatch({ type: "UPDATE_CLIP", clipId: vidClip.id, changes: { narration: scene.narration || "", action: scene.action || "" } });
          }
        }

        // Sync per-scene SFX into the SFX track, same scene-keyed clip pattern as voiceover
        if (old.sfxUrl !== scene.sfxUrl) {
          const existingSfx = sfxTrack?.clips.find(c => c.sceneId === scene.id);
          if (existingSfx) dispatch({ type: "DELETE_CLIP", clipId: existingSfx.id });
          if (scene.sfxUrl) {
            const vidClipForSfx = vidTrack?.clips.find(c => c.sceneId === scene.id);
            const sfxStart = vidClipForSfx?.startTime ?? 0;
            const sfxDuration = vidClipForSfx ? vidClipForSfx.trimEnd - vidClipForSfx.trimStart : 3;
            dispatch({
              type: "ADD_CLIP",
              clip: makeClip({
                trackKey:  "sfx",
                sceneId:   scene.id,
                startTime: sfxStart,
                duration:  sfxDuration,
                trimStart: 0,
                trimEnd:   sfxDuration,
                sourceDuration: sfxDuration,
                src:       scene.sfxUrl,
                type:      "audio",
                volume:    sfxVolume ?? 80,
                label:     scene.sfxName || "SFX",
              }),
            });
          }
        }

        if (old.voiceoverUrl === scene.voiceoverUrl) return;

        const existing = voTrack?.clips.find(c => c.sceneId === scene.id);

        // Guard: clip with this exact src already present — skip to prevent duplicate
        if (existing && existing.src === scene.voiceoverUrl) return;

        if (existing) dispatch({ type: "DELETE_CLIP", clipId: existing.id });

        if (!scene.voiceoverUrl) return;

        const vidClip = vidTrack?.clips.find(c => c.sceneId === scene.id);
        const startTime = vidClip?.startTime ?? 0;
        const sceneDuration = vidClip ? vidClip.trimEnd - vidClip.trimStart : 3;
        const duration  = scene.voiceoverDuration || sceneDuration;

        dispatch({
          type: "ADD_CLIP",
          clip: makeClip({
            trackKey:  "voiceover",
            sceneId:   scene.id,
            startTime,
            duration,
            trimStart: 0,
            trimEnd:   duration,
            sourceDuration: duration,
            src:       scene.voiceoverUrl,
            type:      "audio",
            volume:    voiceoverVolume ?? 100,
            label:     "VO",
          }),
        });
      });

      return next;
    });
  }, [voiceoverVolume, sfxVolume, dispatch, pushHistorySnapshot]);

  const applySfxToActiveScene = useCallback((url, name) => {
    if (!activeScene) return;
    handleSetScenes(prev => prev.map(s => s.id === activeScene ? { ...s, sfxUrl: url, sfxName: name } : s));
  }, [activeScene, handleSetScenes]);
  const clearSceneSfx = useCallback(() => {
    if (!activeScene) return;
    handleSetScenes(prev => prev.map(s => s.id === activeScene ? { ...s, sfxUrl: "", sfxName: "" } : s));
  }, [activeScene, handleSetScenes]);

  // Phase 2 of the voiceover-duration fix: scene.voiceoverDuration is only set by
  // AudioPanel's regenerate flow. Scenes created by other pipelines (e.g. bulk AI
  // generation) never get it, so handleSetScenes above falls back to the video
  // clip's (possibly stale) trimEnd as a placeholder. Probe the real audio length
  // here — same new Audio()/onloadedmetadata pattern AudioPanel already uses — then
  // correct the voiceover clip's duration and backfill scene.voiceoverDuration so
  // calcTotalDuration reflects true narration length without re-probing on remount.
  const probedVoiceoverDurationsRef = useRef(new Map()); // voiceoverUrl -> duration | null (in-flight)
  useEffect(() => {
    scenes.forEach(scene => {
      const url = scene.voiceoverUrl;
      if (!url || scene.voiceoverDuration) return;
      if (probedVoiceoverDurationsRef.current.has(url)) return;
      probedVoiceoverDurationsRef.current.set(url, null);

      const audio = new Audio();
      audio.onloadedmetadata = () => {
        const duration = audio.duration;
        probedVoiceoverDurationsRef.current.set(url, duration);

        // RESIZE_CLIP_REFLOW (not plain UPDATE_CLIP) so every later clip's
        // startTime shifts along with this one — otherwise a scene whose
        // duration was only a placeholder (e.g. PPT-path scenes default to
        // 3s before this probe resolves) gets resized in place while
        // everything after it keeps a stale, now-overlapping start position.
        // Plain dispatch (not dispatchWithHistory) throughout this probe --
        // same reasoning as the avatar-poll fix above: this resolves on its
        // own async timer, unrelated to whatever the user is doing right
        // now, so it must not create or get folded into an undo boundary.
        const voClip = tracksRef.current.find(t => t.key === "voiceover")?.clips.find(c => c.sceneId === scene.id);
        if (voClip && voClip.src === url) {
          dispatch({ type: "RESIZE_CLIP_REFLOW", clipId: voClip.id, changes: { duration, trimEnd: duration } });
        }

        // Resize the video clip for this scene to match, using the same
        // duration + 1.5 s padding that importFromScenes uses when voDur is known.
        const vidClip = tracksRef.current.find(t => t.key === "video")?.clips.find(c => c.sceneId === scene.id);
        if (vidClip) {
          const vidDur = duration + 1.5;
          dispatch({ type: "RESIZE_CLIP_REFLOW", clipId: vidClip.id, changes: { duration: vidDur, trimEnd: vidDur } });
        }

        setScenes(prev => prev.map(s =>
          (s.id === scene.id && s.voiceoverUrl === url) ? { ...s, voiceoverDuration: duration } : s
        ));
      };
      audio.onerror = () => { probedVoiceoverDurationsRef.current.delete(url); };
      audio.src = url;
    });
  }, [scenes, dispatch, setScenes]);

  // Sync globalMusicUrl into the Music track whenever Apply is clicked in the
  // Library panel's Music section (the only place music is picked — see
  // onApplyMusic below and clearMusic/openLibraryForMusic just after this).
  // Only rebuild when the track is genuinely missing/empty or the URL actually
  // changed — same guard pattern used for sfx at load time (see sfxNeedsRebuild
  // above). `[globalMusicUrl]` alone can't distinguish "user just clicked Apply
  // with a new track" from "this is the initial mount syncing state from a reel
  // that was already loaded with this exact clip" — without this check, every
  // reload silently wiped the saved clip's volume/fade/trim/volumePoints.
  useEffect(() => {
    if (!globalMusicUrl) return;
    const musicTrack = timelineState.tracks.find(t => t.key === "music");
    if (!musicTrack) return;
    const existingClip = musicTrack.clips[0];
    if (existingClip && existingClip.src === globalMusicUrl) return;
    musicTrack.clips.forEach(c => dispatchWithHistory({ type: "DELETE_CLIP", clipId: c.id }));
    const totalDur = timelineState.tracks
      .find(t => t.key === "video")
      ?.clips.reduce((max, c) => Math.max(max, c.startTime + (c.trimEnd - c.trimStart)), 0) || 60;
    dispatchWithHistory({
      type: "ADD_CLIP",
      clip: makeClip({
        trackKey:  "music",
        startTime: 0,
        duration:  totalDur,
        trimStart: 0,
        trimEnd:   totalDur,
        sourceDuration: totalDur,
        src:       globalMusicUrl,
        type:      "audio",
        volume:    musicVolume ?? 60,
        label:     globalMusicName || "Music",
      }),
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [globalMusicUrl]);

  // Clears the applied music entirely — the sync effect above only ever
  // *adds* a clip when globalMusicUrl becomes truthy, it does nothing on the
  // way back to empty, so this also has to remove the Music track's clip(s)
  // directly or a stale clip would keep playing/exporting after "Clear".
  const clearMusic = useCallback(() => {
    setGlobalMusicUrl("");
    setGlobalMusicName("");
    const musicTrack = timelineState.tracks.find(t => t.key === "music");
    musicTrack?.clips.forEach(c => dispatchWithHistory({ type: "DELETE_CLIP", clipId: c.id }));
  }, [timelineState, dispatchWithHistory]);

  // AudioPanel's "Change in Library" button — music selection lives only in
  // the Library panel now, this just jumps there and asks it to open with
  // the Music section already expanded instead of landing on a blank list.
  const openLibraryForMusic = useCallback(() => {
    setLibraryInitialSection("music");
    setActiveMenu("library");
  }, []);

  // moveScene existed but was never wired to anything (found 2026-08-13
  // during the tool tutorial campaign; fixed 2026-08-17). Also now
  // repositions the video/voiceover track clips to match the new order --
  // reordering just the scenes array without this would desync the
  // storyboard from what actually plays back. scenesRef.current is already
  // the reordered array by the time this line runs: setScenes's own
  // wrapper (see its definition) updates the ref synchronously inside the
  // updater, before returning.
  const moveScene      = useCallback((from, to) => {
    // pushHistorySnapshot() must run before setScenes -- scenesRef.current
    // is updated synchronously as soon as setScenes's own wrapper runs (see
    // its definition), so snapshotting after would capture the ALREADY-
    // reordered array instead of the pre-move one.
    pushHistorySnapshot();
    setScenes(prev => { const n=[...prev]; const [m]=n.splice(from,1); n.splice(to,0,m); return n; });
    dispatch({ type: "REORDER_SCENE_CLIPS", sceneOrder: scenesRef.current.map(s => s.id) });
  }, [dispatch, pushHistorySnapshot]);
  const duplicateScene = useCallback((id) => { pushHistorySnapshot(); setScenes(prev => { const idx=prev.findIndex(s=>s.id===id); if(idx<0) return prev; const mx=prev.reduce((m,s)=>Math.max(m,Number(s.id)||0),0)+1; const n=[...prev]; n.splice(idx+1,0,{...prev[idx],id:mx}); return n; }); }, [pushHistorySnapshot]);
  const deleteScene    = useCallback((id) => {
    pushHistorySnapshot();
    setScenes(prev => {
      const next = prev.filter(s => s.id !== id);
      if (next.length === 0) return prev;
      return next;
    });
    setActiveScene(prev => prev === id ? null : prev);
    const clip = timelineState.tracks?.flatMap(t => t.clips).find(c => c.sceneId === id);
    if (clip) dispatch({ type: "DELETE_CLIP", clipId: clip.id });
  }, [timelineState.tracks, dispatch, pushHistorySnapshot]);
  const addScene       = useCallback(() => {
    const n      = scenes.length + 1;
    const newId  = typeof crypto?.randomUUID === "function"
      ? crypto.randomUUID()
      : `sc_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
    const videoTrack = timelineState.tracks?.find(t => t.key === "video");
    const startTime  = (videoTrack?.clips || []).reduce((max, c) =>
      Math.max(max, (c.startTime || 0) + ((c.trimEnd || 0) - (c.trimStart || 0))), 0);
    pushHistorySnapshot();
    setScenes(prev => [...prev, makeEmptyScene(newId, `Scene ${n}`)]);
    setTimeout(() => {
      setActiveScene(newId);
      dispatch({ type: "SEEK", time: startTime });
    }, 50);
    dispatch({
      type: "ADD_CLIP",
      clip: makeClip({
        trackKey:  "video",
        sceneId:   newId,
        startTime,
        duration:  3,
        trimStart: 0,
        trimEnd:   3,
        src:       "",
        type:      "video",
        label:     `Scene ${n}`,
      }),
    });
    // Seek to the new scene's position so the preview shows blank instead of the previous clip
    dispatch({ type: "SEEK", time: startTime });
  }, [scenes, timelineState.tracks, dispatch, pushHistorySnapshot]);

  useEffect(() => {
    const handler = () => addScene();
    window.addEventListener("onyx-add-scene", handler);
    return () => window.removeEventListener("onyx-add-scene", handler);
  }, [addScene]);

  const updateFxClip = useCallback((clipId, changes) => {
    dispatchWithHistory({ type: "UPDATE_CLIP", clipId, changes });
  }, [dispatchWithHistory]);

  const updateBrollClip = useCallback((clipId, changes) => {
    dispatchWithHistory({ type: "UPDATE_CLIP", clipId, changes });
  }, [dispatchWithHistory]);

  // Unified selection — same SELECT action the timeline's clip clicks
  // already dispatch (SequencerPanel.jsx ClipBlock onSelect); canvas clicks
  // now route through this too instead of separate local fx/broll state.
  const onSelectClip = useCallback((clipId) => {
    dispatchWithHistory({ type: "SELECT", clipId });
  }, [dispatchWithHistory]);

  const saveNowRef = useRef(saveNow);
  useEffect(() => { saveNowRef.current = saveNow; }, [saveNow]);
  // Stable callback: always invokes the latest saveNow after React has flushed the pending state update.
  const triggerSaveAfterSceneChange = useCallback(() => {
    setTimeout(() => saveNowRef.current(), 100);
  }, []);

  const saveSceneToAiStudio = useCallback((id) => {
    const scene = scenes.find(s => s.id === id);
    const sceneUrl = scene?.mediaUrl || scene?.url;
    if (!scene || !sceneUrl) return;
    const isVid = (u) => /\.(mp4|webm|mov|m4v)(\?|$)/i.test(u) || /^https:\/\/api\.sync\.so\//i.test(u);
    const item = {
      id: `ai_${Date.now()}`,
      name: scene.action?.slice(0, 40) || `Scene ${id}`,
      url: sceneUrl,
      thumbnail: scene.thumbnail || sceneUrl,
      mediaType: scene.mediaType || (isVid(sceneUrl) ? "video" : "image"),
      createdAt: new Date().toISOString(),
      source: "ai",
    };
    try {
      const existing = JSON.parse(localStorage.getItem("onyx_ai_studio_library_v1") || "[]");
      localStorage.setItem("onyx_ai_studio_library_v1", JSON.stringify([item, ...(Array.isArray(existing) ? existing : [])]));
      window.dispatchEvent(new CustomEvent("onyx:ai-studio-save", { detail: item }));
    } catch {}
    setVisualsTab("aistudio");
    setActiveMenu("visuals");
  }, [scenes]);

  const regenerateScene = useCallback(async (id) => {
    setGeneratingScenes(p => ({ ...p, [id]: { status: "submitting" } }));
    try {
      const scene = scenes.find(s => s.id === id); if (!scene) return;
      const h = await getAuthHeaders(); h["Content-Type"] = "application/json";
      // Sourced from the dedicated, persistent sourceImageUrl field (set via
      // StoryboardPanel's Start Image block), NOT scene.mediaUrl -- mediaUrl
      // gets overwritten with the generation's own video output on every
      // completion (see the mediaType:"video" stamp below), which silently
      // destroyed the start image on any second regenerate. sourceImageUrl
      // is never touched by a completion handler, so it survives repeat
      // generates on the same scene. Gated on the model's own capability,
      // same stale-value guard as reference_mode/end_image_url below.
      const sceneImageUrl = supportsStartImage ? (scene.sourceImageUrl || null) : null;
      // Caught here, before the request fires, rather than letting it reach
      // the backend -- a model with requiresStartAndEnd 500s with a generic
      // "Internal server error" if only one of the two is set (no t2v/i2v
      // fallback to fall back to), which told the user nothing about what
      // to fix. Checking client-side skips that round trip (and the
      // deduct/refund cycle) entirely.
      if (requiresStartAndEnd && !(sceneImageUrl && scene.endImageUrl)) {
        toast.show(`${modelCapabilities[regenModel]?.label || regenModel} requires both a Start Image and an End Frame`, "error");
        return;
      }
      // Same before-the-request pattern as requiresStartAndEnd above --
      // Veo, for example, only accepts 16:9/9:16 (confirmed via a real 422
      // against fal.ai), so selecting 1:1 with Veo used to reach the
      // backend, burn the round trip, and fail with fal's own validation
      // error instead of a clear client-side message.
      if (!aspectRatioSupported) {
        toast.show(`${modelCapabilities[regenModel]?.label || regenModel} doesn't support ${ratio} — supported: ${aspectRatioSpec.values.join(", ")}`, "error");
        return;
      }
      const submitRes = await fetch("/api/kling/generate", {
        method: "POST",
        headers: h,
        body: JSON.stringify({
          prompt: scene.action || scene.narration,
          sceneId: id,
          aspect_ratio: ratio ?? "9:16",
          duration: scene.duration || 5,
          model: regenModel,
          brand_id: selectedBrandId,
          voiceoverUrl: scene.voiceoverUrl || null,
          // True when this scene's voiceoverUrl is a concatenated multi-
          // speaker track (backend/lib/sceneDefaults.js's
          // applyDefaultVoiceToScenes, Option B 2026-08-12) -- tells the
          // backend to skip its Sync.so lip-sync pass, which has no face-
          // matching of its own and would otherwise sync every OTHER
          // speaker's lines to whichever one face is in the generated clip.
          // Backend defaults this to false/no-skip when absent, so this is
          // the one line that actually closes that blind spot for real
          // regenerate calls -- see memory: project_multispeaker_narration_backlog.
          voiceoverMultiSpeaker: (scene.voiceoverSegments?.length || 0) > 1,
          // Gated on the currently selected model's own capability, not just
          // whatever reference_mode a prior model selection left on the scene --
          // otherwise switching from a ref-supporting model to one that doesn't
          // (e.g. kling-2.6-pro -> wan-2.5) would still send stale reference_mode.
          reference_mode: supportsRefs ? (scene.referenceMode || null) : null,
          image_url: sceneImageUrl,
          // Previously never sent at all, regardless of what supportsEndFrame
          // said -- the End Frame URL field existed in StoryboardPanel and
          // could be filled in, but nothing ever forwarded it to the backend.
          // Same stale-value guard as reference_mode above: gated on the
          // currently selected model's own capability, not whatever value a
          // prior model selection left on the scene.
          end_image_url: supportsEndFrame ? (scene.endImageUrl || null) : null,
          // Same stale-value guard pattern as reference_mode/end_image_url
          // above: gated on the currently selected model's own capability,
          // so switching away from wan-2.7 doesn't send a stale 1080p
          // choice to a model that doesn't have this concept at all.
          resolution: supports1080pUpgrade ? (scene.resolution || "720p") : null,
        }),
      });
      const { jobId, error: submitErr } = await submitRes.json();
      if (!jobId) throw new Error(submitErr || "No jobId returned");

      // Persisted onto the scene immediately (not just tracked in local
      // generatingScenes state) so the jobId survives a poll-loop death --
      // network suspension, tab backgrounded/slept, any uncaught fetch error
      // -- via the next autosave tick. Without this, a dead poll loop leaves
      // no trace of the job anywhere the reel itself can recover from.
      updateSceneRef.current(id, { jobId, generationPending: true });
      setGeneratingScenes(p => ({ ...p, [id]: { status: "polling" } }));

      // Poll until completed or failed (max 20 min — backend falPoll takes up to 10 min +
      // download, then an optional Sync.so lip-sync pass adds up to another 5 min when
      // this scene has a voiceoverUrl; rounded up with buffer for extraction/upload overhead)
      const deadline = Date.now() + 1200000;
      while (Date.now() < deadline) {
        await new Promise(r => setTimeout(r, 5000));
        let poll;
        try {
          const ph = await getAuthHeaders();
          poll = await (await fetch(`/api/kling/status/${jobId}`, { headers: ph })).json();
        } catch (pollErr) {
          // Transient failure (offline, DNS, a 502/504 HTML body instead of
          // JSON -- exactly what tends to come back right after a laptop
          // wakes from sleep). The job itself is unaffected server-side --
          // keep polling instead of treating one hiccup as a hard failure.
          console.warn("[EditorV2] regen poll transient failure, retrying:", pollErr);
          continue;
        }
        if (poll.status === "completed") {
          if (!poll.videoUrl) throw new Error("Job completed but no video URL returned");
          // mediaType: "video" stamped alongside mediaUrl -- previously left
          // whatever it was before (often "image" from the scene's original
          // upload), so a second regenerate's `scene.mediaType === "image"`
          // check at the top of this function would treat THIS generation's
          // own video output as if it were still the original source image,
          // sending it as image_url. Now a second regenerate on a scene
          // that's already been generated once correctly falls back to
          // text-to-video instead of feeding a video into an image field.
          updateSceneRef.current(id, { mediaUrl: poll.videoUrl, url: poll.videoUrl, mediaType: "video", thumbnail: poll.thumbnailUrl || poll.videoUrl, lipSynced: !!poll.lipSynced, needsBleedFade: !!poll.needsBleedFade, generationPending: false, jobId: null });
          return;
        }
        if (poll.status === "failed") throw new Error(poll.error || "Generation failed");
      }
      throw new Error("Timed out waiting for video");
    } catch(e) {
      console.error("[EditorV2] regen", e);
      toast.show(e.message || "Generation failed", "error");
      updateSceneRef.current(id, { generationPending: false });
    }
    finally { setGeneratingScenes(p => ({ ...p, [id]: false })); }
  }, [scenes, ratio, regenModel, toast, supportsRefs, supportsEndFrame, supportsStartImage, requiresStartAndEnd, modelCapabilities, supports1080pUpgrade, aspectRatioSupported, aspectRatioSpec]);

  // Upscale button (build brief 2026-08-07). Mirrors regenerateScene's
  // submit-then-poll shape against the same fal.ai/WaveSpeed queue
  // mechanics, but calls /api/upscale/* instead of /api/kling/* and never
  // touches scene.mediaUrl -- keep-both semantics: the pre-upscale source is
  // preserved as draftMediaUrl (only ever set once, from whatever mediaUrl
  // was current the FIRST time a scene is upscaled -- a second upscale run
  // must not overwrite it with the previous upscale's own output) and the
  // result lands in upscaledMediaUrl. Nothing here ever overwrites mediaUrl
  // itself, unlike regenerateScene's completion handler above.
  const upscaleScene = useCallback(async (id, model, param) => {
    setUpscalingScenes(p => ({ ...p, [id]: { status: "submitting" } }));
    try {
      const scene = scenes.find(s => s.id === id); if (!scene) return;
      const sourceUrl = scene.mediaUrl || scene.url;
      if (!sourceUrl) { toast.show("This scene has no media to upscale yet", "error"); return; }

      const h = await getAuthHeaders(); h["Content-Type"] = "application/json";
      const submitRes = await fetch("/api/upscale/generate", {
        method: "POST",
        headers: h,
        body: JSON.stringify({ sourceUrl, model, param, brandId: selectedBrandId }),
      });
      const { jobId, credits, error: submitErr } = await submitRes.json();
      if (!jobId) throw new Error(submitErr || "No jobId returned");

      // draftMediaUrl set here, before the poll loop, from whatever
      // mediaUrl already is -- NOT inside the completion handler below,
      // where scene.mediaUrl could theoretically have changed underneath a
      // long-running poll (e.g. a regenerate fired in another tab/scene
      // interaction). Only set if not already present, same
      // never-overwrite-the-draft rule the build brief specifies -- a
      // second upscale of an already-upscaled scene must keep pointing at
      // the ORIGINAL draft, not the first upscale's output.
      if (!scene.draftMediaUrl) updateSceneRef.current(id, { draftMediaUrl: sourceUrl });
      setUpscalingScenes(p => ({ ...p, [id]: { status: "polling" } }));

      const deadline = Date.now() + 1200000;
      while (Date.now() < deadline) {
        await new Promise(r => setTimeout(r, 5000));
        let poll;
        try {
          const ph = await getAuthHeaders();
          poll = await (await fetch(`/api/upscale/status/${jobId}`, { headers: ph })).json();
        } catch (pollErr) {
          console.warn("[EditorV2] upscale poll transient failure, retrying:", pollErr);
          continue;
        }
        if (poll.status === "completed") {
          if (!poll.videoUrl) throw new Error("Upscale completed but no video URL returned");
          updateSceneRef.current(id, { upscaledMediaUrl: poll.videoUrl });
          toast.show(`Upscale complete (${credits} credits)`, "success");
          return;
        }
        if (poll.status === "failed") throw new Error(poll.error || "Upscale failed");
      }
      throw new Error("Timed out waiting for upscale");
    } catch (e) {
      console.error("[EditorV2] upscale", e);
      toast.show(e.message || "Upscale failed", "error");
    } finally {
      setUpscalingScenes(p => ({ ...p, [id]: false }));
    }
  }, [scenes, toast, selectedBrandId]);

  // User-agent sniffing alone missed a real case: a desktop browser window
  // narrowed below the editor's usable width (or an unusual/absent mobile
  // UA string) rendered the actual multi-panel desktop layout instead of
  // this gate -- panels overlapping, canvas squeezed to a sliver. Width is
  // checked too now, not just UA, so any viewport too narrow for the editor
  // gets this clean screen instead of the broken one.
  if (/Android|iPhone|iPad|iPod|Opera Mini|IEMobile|Mobile/i.test(navigator.userAgent) || window.innerWidth < 1024) {
    return (
      <div style={{ width: "100vw", height: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, background: "#0b0f17", color: "#f1f5fb", fontFamily: "-apple-system,system-ui,sans-serif", textAlign: "center", padding: 32 }}>
        <div style={{ fontSize: 48 }}>🖥️</div>
        <div style={{ fontSize: 20, fontWeight: 700 }}>Editor requires a desktop browser</div>
        <div style={{ fontSize: 14, color: "rgba(241,245,251,0.5)", maxWidth: 300 }}>The Onyx Reelz editor needs a screen at least 1024px wide. Please open it on a laptop or desktop.</div>
        <a href="/dashboard" style={{ marginTop: 8, padding: "10px 24px", borderRadius: 8, background: "#4dd0ff", color: "#0b0f17", fontWeight: 700, fontSize: 14, textDecoration: "none" }}>Back to Dashboard</a>
      </div>
    );
  }

  return (
    <div id="editor-v2" data-theme={theme} style={{ width: "100vw", height: "100vh", display: "flex", flexDirection: "column", background: "var(--onyx-bg-2,#0b0f17)", color: "var(--onyx-text,#f1f5fb)", fontFamily: "var(--onyx-font,-apple-system,system-ui,sans-serif)", overflow: "hidden", overscrollBehaviorX: "none" }}>
      {/* BG streaks */}
      <div className="onyx-bg-streaks" style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0 }}/>

      {saveConflict && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, zIndex: 1000,
          background: "#b45309", color: "#fff", fontSize: 13, fontWeight: 600,
          padding: "10px 16px", display: "flex", alignItems: "center", justifyContent: "center", gap: 16,
        }}>
          This reel was updated elsewhere — your changes since then aren't saved.
          <button
            onClick={() => window.location.reload()}
            style={{ padding: "4px 14px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.5)", background: "rgba(255,255,255,0.15)", color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 13 }}
          >
            Reload latest version
          </button>
        </div>
      )}

      {disclosureNotice && (
        <div style={{
          position: "fixed", bottom: 24, right: 24, zIndex: 999, maxWidth: 340,
          background: "var(--onyx-surface,#141a24)", border: "1px solid var(--onyx-hairline-strong,rgba(255,255,255,0.14))",
          borderRadius: 10, padding: "12px 14px", display: "flex", alignItems: "flex-start", gap: 10,
          boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
        }}>
          <span style={{ fontSize: 15, lineHeight: 1, marginTop: 1 }}>ℹ️</span>
          <div style={{ flex: 1, fontSize: 12.5, color: "var(--onyx-text-dim,rgba(241,245,251,0.75))", lineHeight: 1.4 }}>
            This reel includes the required AI-disclosure scene, added automatically.
          </div>
          <button
            onClick={() => setDisclosureNotice(false)}
            aria-label="Dismiss"
            style={{ background: "none", border: "none", color: "var(--onyx-text-faint,rgba(241,245,251,0.4))", cursor: "pointer", fontSize: 14, padding: 0, lineHeight: 1 }}
          >
            ✕
          </button>
        </div>
      )}

      <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", height: "100%" }}>
        <Toolbar
          title={title} onTitleChange={setTitle} saved={savedMsg}
          theme={theme} onThemeToggle={() => setTheme(t => t==="onyx"?"opal":"onyx")}
          onSave={saveNow}
          toast={toast}
          onAddScene={() => window.dispatchEvent(new CustomEvent('onyx-add-scene'))}
          onExport={async () => {
              if (exportInFlightRef.current) return;
              exportInFlightRef.current = true;
              try {
                const h = await getAuthHeaders();
                h["Content-Type"] = "application/json";
                const _previewFrame = document.getElementById('onyx-preview-frame');
                const _previewRect = _previewFrame?.getBoundingClientRect();
                const payload = buildV2RenderRequest({
                  timelineState, scenes, globalMusicUrl, globalMusicName,
                  musicVolume, voiceoverVolume, sfxVolume, ratio, brand, reelId,
                  canvasH: _previewRect?.height || 500,
                  canvasW: _previewRect?.width || 300,
                  captionsVisible,
                });
                if (!payload.scenes.length) { alert("No scenes to export."); return; }
                setSavedMsg("Rendering…");
                // Show visible rendering indicator
                const ind = document.createElement("div");
                ind.id = "v2-render-indicator";
                ind.textContent = "⏳ Rendering your reel… this may take a few minutes";
                ind.style.cssText = "position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(6,9,15,0.95);border:1px solid rgba(77,208,255,0.4);color:#4dd0ff;padding:20px 32px;border-radius:12px;font-weight:600;font-size:14px;z-index:99999;box-shadow:0 8px 40px rgba(0,0,0,0.6);text-align:center;";
                document.body.appendChild(ind);

                const startRes = await fetch("/api/render", { method: "POST", headers: h, body: JSON.stringify(payload) });
                const startData = await startRes.json();
                if (startRes.status === 402 && startData.code === "INSUFFICIENT_CREDITS") {
                  setSavedMsg("Not enough credits");
                  document.getElementById("v2-render-indicator")?.remove();
                  setExportUpgrade({ requiredCredits: startData.required || null });
                  return;
                }
                if (!startData.jobId) {
                  setSavedMsg("✗ Render failed");
                  document.getElementById("v2-render-indicator")?.remove();
                  console.error("[Export]", startData);
                  return;
                }

                // Poll for completion — same pattern as Kling regen (5s interval, fresh auth
                // headers every poll). Unlike the old single-await call, closing this tab or
                // losing connection here does NOT kill the job: it keeps rendering server-side
                // and can be checked again later via the same status endpoint.
                let rawUrl = null;
                let jobFailedError = null;
                const deadline = Date.now() + 3600000; // 60 min client-side ceiling; server has none
                while (Date.now() < deadline) {
                  await new Promise(r => setTimeout(r, 5000));
                  const ph = await getAuthHeaders();
                  const poll = await (await fetch(`/api/render/status/${startData.jobId}`, { headers: ph })).json();
                  if (poll.status === "completed") {
                    rawUrl = poll.url;
                    if (poll.disclosureTriggered) setDisclosureNotice(true);
                    break;
                  }
                  if (poll.status === "failed") { jobFailedError = poll.error || "Render failed"; break; }
                }

                if (rawUrl) {
                  setSavedMsg("✓ Downloading…");
                  // Make absolute — backend returns relative /storage/renders/...
                  const dlUrl = rawUrl.startsWith("http") ? rawUrl : window.location.origin + rawUrl;
                  const filename = (title || "reel").replace(/[^a-z0-9]/gi, "_") + ".mp4";
                  // The `download` attribute is ignored by browsers on cross-origin
                  // links, and rendered output URLs are always absolute R2 URLs —
                  // so a plain <a download> here just navigated to/played the video
                  // instead of downloading it. Fetch it through our own origin (with
                  // auth headers, since a plain <a> click can't carry them) and
                  // download the resulting blob, which always honors `download`
                  // regardless of origin.
                  try {
                    const dh = await getAuthHeaders();
                    const proxyUrl = `/api/render/download?url=${encodeURIComponent(dlUrl)}&filename=${encodeURIComponent(filename)}`;
                    const fileRes = await fetch(proxyUrl, { headers: dh });
                    if (!fileRes.ok) throw new Error(`Download failed (${fileRes.status})`);
                    const blob = await fileRes.blob();
                    const blobUrl = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = blobUrl;
                    a.download = filename;
                    a.rel = "noopener";
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
                  } catch (dlErr) {
                    console.error("[Export] download failed:", dlErr);
                    setSavedMsg("✗ Download failed");
                  }
                  // Completion previously only showed as small header text
                  // for 3s while the prominent "Rendering..." modal was
                  // removed in the same instant -- a real render can run for
                  // over a minute, so by the time it's done the user's
                  // attention has drifted away from that small text and the
                  // 3s window is easy to miss entirely (confirmed live
                  // 2026-08-19: watched a real export finish and saw no
                  // visible confirmation at all). Repurposing the same
                  // modal to show success instead of just vanishing.
                  {
                    const doneInd = document.getElementById("v2-render-indicator");
                    if (doneInd) {
                      doneInd.textContent = "✅ Export complete — your download has started";
                      doneInd.style.borderColor = "rgba(74,222,128,0.5)";
                      doneInd.style.color = "#4ade80";
                      setTimeout(() => doneInd.remove(), 3500);
                    }
                  }
                  setTimeout(() => setSavedMsg("Saved"), 3000);
                } else if (jobFailedError) {
                  const failInd = document.getElementById("v2-render-indicator");
                  if (failInd) {
                    failInd.textContent = "✗ Render failed — " + (jobFailedError || "please try again");
                    failInd.style.borderColor = "rgba(248,113,113,0.5)";
                    failInd.style.color = "#f87171";
                    setTimeout(() => failInd.remove(), 4000);
                  }
                  setSavedMsg("✗ Render failed");
                  console.error("[Export]", jobFailedError);
                } else {
                  // Hit the 60-minute client ceiling — the job itself is not necessarily dead.
                  setSavedMsg("Still rendering…");
                  document.getElementById("v2-render-indicator")?.remove();
                  alert("Still processing — this is taking longer than usual. Your video isn't lost; refresh in a few minutes to check again.");
                }
              } catch(e) {
                setSavedMsg("Render error");
                console.error("[Export]", e);
              } finally {
                exportInFlightRef.current = false;
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
                let shareSourceUrl = data.url;
                if (!shareSourceUrl) {
                  setSavedMsg("Rendering watermarked preview…");
                  const rh = { ...h, "Content-Type": "application/json" };
                  const _previewFrame2 = document.getElementById('onyx-preview-frame');
                  const _previewRect2 = _previewFrame2?.getBoundingClientRect();
                  const payload = {
                    ...buildV2RenderRequest({
                      timelineState, scenes, globalMusicUrl, globalMusicName,
                      musicVolume, voiceoverVolume, sfxVolume, ratio, brand, reelId,
                      canvasH: _previewRect2?.height || 500,
                      canvasW: _previewRect2?.width || 300,
                      captionsVisible,
                    }),
                    watermark: true,
                    renderMode: "share",
                  };
                  if (!payload.scenes.length) { setSavedMsg("No scenes to share."); return; }
                  const rRes = await fetch("/api/render", { method: "POST", headers: rh, body: JSON.stringify(payload) });
                  const rData = await rRes.json();
                  if (!rData.jobId) { setSavedMsg("✗ Share failed"); console.error("[Share]", rData); return; }

                  // POST /api/render only ever returns { jobId, status:"processing" } --
                  // never a url on this initial response. The old code read
                  // rData.url/downloadUrl straight off it without polling, so it was
                  // always undefined and "Render failed — try exporting first" fired
                  // on every first-ever Share click, even though nothing had actually
                  // failed yet -- the job just hadn't finished. Poll the same way
                  // onExport does instead of reading a field that was never there.
                  let rawUrl = null;
                  let jobFailedError = null;
                  const deadline = Date.now() + 3600000;
                  while (Date.now() < deadline) {
                    await new Promise(r => setTimeout(r, 5000));
                    const ph = await getAuthHeaders();
                    const poll = await (await fetch(`/api/render/status/${rData.jobId}`, { headers: ph })).json();
                    if (poll.status === "completed") { rawUrl = poll.url; break; }
                    if (poll.status === "failed") { jobFailedError = poll.error || "Render failed"; break; }
                  }
                  if (!rawUrl) {
                    setSavedMsg(jobFailedError ? "✗ Share failed" : "Still rendering — try again shortly");
                    if (jobFailedError) console.error("[Share]", jobFailedError);
                    return;
                  }
                  shareSourceUrl = rawUrl.startsWith("http") ? rawUrl : window.location.origin + rawUrl;
                  setSavedMsg("Building share link…");
                }
                const username = currentUser?.user_metadata?.username || currentUser?.email?.split("@")[0] || "onyx";
                const encoded = btoa(shareSourceUrl).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
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
        />

        <div style={{ flex: 1, display: "flex", minHeight: 0, overflow: "hidden" }}>
          {/* Sidebar */}
          <Sidebar open={sidebarOpen} activeTab={activeMenu} setActiveTab={setActiveMenu}>
            {activeMenu==="storyboard" && <Safe name="StoryboardPanel"><StoryboardPanel scenes={scenes} activeScene={activeScene} setActiveScene={setActiveScene} updateScenes={handleSetScenes} onSaveScene={() => { saveNow(); saveSceneToAiStudio(activeScene); }} onDeleteScene={deleteScene} onGenerateScene={regenerateScene} generatingScenes={generatingScenes} onAddScene={addScene} regenModel={regenModel} onRegenModelChange={setRegenModel} supportsRefs={supportsRefs} supportsEndFrame={supportsEndFrame} supportsStartImage={supportsStartImage} durationSpec={durationSpec} supports1080pUpgrade={supports1080pUpgrade} resolutionOptions={resolutionOptions} aspectRatio={ratio} onUpscaleScene={upscaleScene} upscalingScenes={upscalingScenes} upscaleCapabilities={upscaleCapabilities} onReorder={moveScene} timelineState={timelineState} dispatch={dispatchWithHistory}/></Safe>}
            {activeMenu==="visuals"    && <Safe name="VisualsPanel"><VisualsPanel
              tab={visualsTab} setTab={setVisualsTab}
              scenes={scenes} activeScene={activeScene}
              activeSceneObj={scenes.find(s => s.id === activeScene) || null}
              onUpdateScene={updateScene}
              onSelect={item => {
                const targetId = activeScene || scenes[0]?.id;
                if (!targetId) return;
                const url = item.url || item.mediaUrl;
                const fullUrl = url?.startsWith('http') ? url : `https://onyx-reelz.com${url}`;
                // Keep `thumbnail` (rendered by the timeline clip strip) and
                // `stockThumb` (read first by VisualsPanel's "currently
                // selected" pinned tile) in sync on every swap, so a new
                // visual never leaves a stale stockThumb pointing at the
                // previous asset (root cause of the S1/S2 mismatched-
                // thumbnail bug on reel ad9959ee-b94d-4b5f-af60-e91b345d3b6e).
                const newThumb = item.thumbnail || item.thumb || fullUrl;
                updateScene(targetId, {
                  mediaUrl: fullUrl,
                  url: fullUrl,
                  thumbnail: newThumb,
                  stockThumb: newThumb,
                  mediaType: item.mediaType || 'video'
                });
                if (item.mediaType !== 'image') preloadSceneUrl(fullUrl);
              }}
              aiStudioItems={aiStudioItems}
              apiBase=""
              libraryKey="onyx_ai_studio_library_v1"
            /></Safe>}
            {activeMenu==="audio"      && <Safe name="AudioPanel"><AudioPanel
              musicVolume={musicVolume} setMusicVolume={setMusicVolume}
              musicName={globalMusicName}
              onChangeInLibrary={openLibraryForMusic}
              onClearMusic={clearMusic}
            /></Safe>}
            {activeMenu==="voiceover"  && <Safe name="VoiceOverPanel"><VoiceOverPanel
              scenes={scenes} setScenes={handleSetScenes}
              voiceoverVolume={voiceoverVolume} setVoiceoverVolume={setVoiceoverVolume}
              generatingVoiceoverScenes={generatingVoiceoverScenes}
              setGeneratingVoiceoverScenes={setGeneratingVoiceoverScenes}
              onSave={saveNow}
            /></Safe>}
            {activeMenu==="sfx"        && <Safe name="SfxPanel"><SfxPanel
              tab={sfxTab} setTab={setSfxTab}
              activeScene={activeScene}
              activeSceneNumber={scenes.findIndex(s => s.id === activeScene) + 1}
              activeSceneObj={scenes.find(s => s.id === activeScene) || null}
              sfxVolume={sfxVolume} setSfxVolume={setSfxVolume}
              applySfxToActiveScene={applySfxToActiveScene}
              clearSceneSfx={clearSceneSfx}
            /></Safe>}
            {activeMenu==="library"    && <Safe name="AssetsLibraryPanel"><AssetsLibraryPanel
              initialExpandedType={libraryInitialSection}
              onApplyMusic={(url, name) => {
                setGlobalMusicUrl(url || "");
                if (name) setGlobalMusicName(name);
                setSavedMsg(`${name || "Track"} applied to reel.`);
              }}
              onApplySfx={applySfxToActiveScene}
              onApplyMedia={(item) => {
                const targetId = activeScene || scenes[0]?.id;
                if (!targetId) return;
                const url = item.url || item.mediaUrl;
                const fullUrl = url?.startsWith('http') ? url : `https://onyx-reelz.com${url}`;
                const newThumb = item.thumbnail || item.thumb || fullUrl;
                updateScene(targetId, {
                  mediaUrl: fullUrl,
                  url: fullUrl,
                  thumbnail: newThumb,
                  stockThumb: newThumb,
                  mediaType: item.mediaType || 'video'
                });
              }}
            /></Safe>}
            {activeMenu==="text"       && <Safe name="TextPanel"><TextPanel dispatch={dispatchWithHistory} playhead={playhead} selectedClip={selectedFxClip} brand={brand}/></Safe>}
            {activeMenu==="broll"      && <Safe name="BrollPanel"><BrollPanel dispatch={dispatchWithHistory} selectedClip={selectedBrollClip}/></Safe>}
            {activeMenu==="elements"   && <Safe name="ElementsPanel"><ElementsPanel scenes={scenes} setScenes={setScenes} activeScene={activeScene} onUpdateScene={updateScene} dispatch={dispatch} playhead={playhead} brand={brand}/></Safe>}
            {activeMenu==="transitions" && <Safe name="TransitionsPanel"><TransitionsPanel onUpdateScene={updateScene} /></Safe>}
            {activeMenu==="branding"   && <Safe name="BrandingPanel">
              <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
                {/* Tab bar */}
                <div style={{ display: "flex", borderBottom: "0.5px solid var(--onyx-hairline,rgba(255,255,255,0.07))", flexShrink: 0 }}>
                  {[["kit","Brand Kit"],["themes","Themes"],["captions","Captions"],["custom","Custom"]].map(([k,l]) => (
                    <button key={k} onClick={() => setBrandTab(k)} style={{
                      flex: 1, padding: "8px 2px", fontSize: 10, fontWeight: 700, cursor: "pointer",
                      border: "none", background: "transparent",
                      color: brandTab === k ? "#7de0ff" : "#475569",
                      borderBottom: brandTab === k ? "2px solid #4dd0ff" : "2px solid transparent",
                      fontFamily: "inherit",
                    }}>{l}</button>
                  ))}
                </div>
                {/* Brand Kit tab */}
                {brandTab === "kit" && (
                  <div style={{ flex: 1, overflowY: "auto", padding: "14px 12px", display: "flex", flexDirection: "column", gap: 12 }}>
                    {brands.length === 0 ? (
                      <div style={{ fontSize: 12, color: "#475569", textAlign: "center", padding: "16px 0" }}>
                        No brands set up yet.<br />
                        <a href="/branding" style={{ color: "#4dd0ff", fontSize: 12, marginTop: 8, display: "inline-block" }}>Create a brand →</a>
                      </div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {brands.map(b => {
                          const isActive = selectedBrandId === b.id;
                          return (
                            <div key={b.id} onClick={() => { setSelectedBrandId(b.id); setBrand(prev => ({ ...prev, ...b })); }} style={{
                              padding: "10px 12px", borderRadius: 8, cursor: "pointer",
                              background: isActive ? "rgba(77,208,255,0.15)" : "var(--onyx-surface)",
                              border: isActive ? "1px solid rgba(77,208,255,0.4)" : "1px solid var(--onyx-hairline-strong)",
                              display: "flex", alignItems: "center", gap: 8,
                            }}>
                              <div style={{ width: 10, height: 10, borderRadius: "50%", background: b.primary_color || "#6366f1", flexShrink: 0 }} />
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 12, fontWeight: 600, color: isActive ? "#7de0ff" : theme === "opal" ? "#06121b" : "#e2e8f0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                  {b.brand_label || b.brand_name || "Unnamed"}
                                </div>
                                {b.is_default && <div style={{ fontSize: 9, color: "#4ade80", fontWeight: 700 }}>★ DEFAULT</div>}
                              </div>
                              {isActive && <span style={{ color: "#7de0ff", fontSize: 14 }}>✓</span>}
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {selectedBrandId && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 2 }}>
                        <button
                          onClick={() => applyBrandToScenes("scene")}
                          disabled={applyingBrand || !activeScene}
                          title={!activeScene ? "Select a scene in the timeline first" : ""}
                          style={{
                            padding: "9px 12px", borderRadius: 6, fontSize: 12, fontWeight: 700,
                            background: "rgba(77,208,255,0.12)", border: "1px solid rgba(77,208,255,0.35)",
                            color: "#7de0ff", cursor: (applyingBrand || !activeScene) ? "not-allowed" : "pointer",
                            opacity: (applyingBrand || !activeScene) ? 0.5 : 1,
                          }}
                        >{applyingBrand ? "Applying…" : "Apply to this scene"}</button>
                        <button
                          onClick={() => applyBrandToScenes("reel")}
                          disabled={applyingBrand}
                          style={{
                            padding: "9px 12px", borderRadius: 6, fontSize: 12, fontWeight: 700,
                            background: "#4dd0ff", border: "1px solid #4dd0ff",
                            color: "#06121b", cursor: applyingBrand ? "not-allowed" : "pointer",
                            opacity: applyingBrand ? 0.5 : 1,
                          }}
                        >{applyingBrand ? "Applying…" : "Apply to all scenes"}</button>
                      </div>
                    )}
                    <a href="/branding" style={{
                      display: "block", padding: "8px 12px", borderRadius: 6, fontSize: 11, fontWeight: 600,
                      textAlign: "center", textDecoration: "none",
                      background: "transparent", border: "1px dashed #2b3442", color: "#4dd0ff", marginTop: 4,
                    }}>✏️ Edit Brands →</a>
                    {selectedBrandId && brand.default_avatar_id && (
                      <div style={{ padding: "8px 10px", borderRadius: 6, fontSize: 11, color: "#fbbf24", background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.2)" }}>
                        This brand uses an avatar preset. Credits will be charged per scene when rendered.
                      </div>
                    )}
                    {selectedBrandId && brand.default_voice_provider === "elevenlabs" && (
                      <div style={{ padding: "8px 10px", borderRadius: 6, fontSize: 11, color: "#fbbf24", background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.2)" }}>
                        This brand uses a premium voice. Credits will be charged per scene when rendered.
                      </div>
                    )}
                  </div>
                )}
                {/* Themes / Captions / Custom tabs — delegate to StylesPanel with forcedTab */}
                {brandTab !== "kit" && (
                  <div style={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
                    <StylesPanel
                      scenes={scenes}
                      setScenes={setScenes}
                      activeScene={activeScene}
                      forcedTab={brandTab}
                      brand={brand}
                      onSave={saveNow}
                    />
                  </div>
                )}
              </div>
            </Safe>}
            {activeMenu==="avatar"     && <Safe name="AvatarPanel"><AvatarPanel
              scenes={scenes} setScenes={setScenes}
              activeScene={activeScene}
              reelVideoUrl={reelVideoUrl}
              timelineTracks={timelineState.tracks}
              reelId={reelId}
            /></Safe>}
          </Sidebar>

          {/* Sidebar collapse tab */}
          <div onClick={() => setSidebarOpen(p => !p)} style={{
            width: 16, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", background: "var(--panel-bg,rgba(6,9,15,0.5))",
            borderRight: "0.5px solid var(--onyx-hairline-strong,rgba(255,255,255,0.14))",
            color: "var(--onyx-text-faint,rgba(241,245,251,0.40))", fontSize: 10,
            userSelect: "none",
          }} title={sidebarOpen ? "Collapse sidebar ([)" : "Expand sidebar ([)"}>
            {sidebarOpen ? "‹" : "›"}
          </div>

          {/* Preview */}
          <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
            <PreviewCanvas
              scenes={scenes} activeScene={activeScene} setActiveScene={setActiveScene}
              isPlaying={isPlaying} livePlayheadRef={livePlayheadRef} checkpointPlayhead={playhead} totalSec={totalSec||1}
              onSeek={t => {
                const clamped = Math.max(0, t);
                dispatchWithHistory({type:"SEEK",time:clamped});
                livePlayheadRef.current = clamped;
                // Same fix as SequencerPanel's own onSeek below (see that
                // one's comment) -- without this, scrubbing via a click
                // directly on the preview while playing left playStartRef
                // pointing at the OLD wallTime/playheadAtStart pair, so the
                // next tick() computed elapsed time from before the scrub
                // and the playhead visibly jumped back toward the
                // pre-scrub position instead of continuing from where the
                // user just clicked. SequencerPanel's scrubber already had
                // this reset; PreviewCanvas's own click-to-seek never did.
                if (playStartRef.current) {
                  playStartRef.current = { wallTime: performance.now() / 1000, playheadAtStart: clamped };
                }
              }}
              onPlayPause={() => setIsPlaying(p=>!p)}
              ratio={ratio}
              captionsVisible={captionsVisible}
              tracks={timelineState.tracks}
              brand={brand}
              onFxUpdate={updateFxClip}
              onFxDragEnd={saveNow}
              onBrollUpdate={updateBrollClip}
              onBrollDragEnd={saveNow}
              selectedClipId={timelineState.selected}
              onSelectClip={onSelectClip}
              uploadImgRef={uploadImgRef}
              uploadVideoRef={uploadVideoRef}
              brollImgRef={brollImgRef}
              brollVideoRef={brollVideoRef}
              brollWrapperRef={brollWrapperRef}
              theme={theme}
              safeZonePlatform={safeZoneEnabled ? safeZonePlatform : null}
              onSplit={() => {
                if (!timelineState.selected) return;
                const atTime = isPlaying ? livePlayheadRef.current : playhead;
                dispatchWithHistory({ type: "SPLIT_CLIP", clipId: timelineState.selected, atTime });
              }}
              onOpenVoiceOver={() => setActiveMenu("voiceover")}
              onOpenMusic={() => setActiveMenu("audio")}
              onOpenAI={() => setActiveMenu("storyboard")}
            />
          </div>

        </div>

        {/* Sequencer */}
        <div data-theme={theme} style={{ touchAction: "pan-y" }}>
          <Safe name="SequencerPanel">
            <SequencerPanel
              timelineState={timelineState} dispatch={dispatchWithHistory}
              isPlaying={isPlaying} livePlayheadRef={livePlayheadRef} onPlayPause={() => setIsPlaying(p => !p)}
              scenes={scenes} activeScene={activeScene} setActiveScene={setActiveScene}
              updateScene={updateScene}
              globalMusicUrl={globalMusicUrl} globalMusicName={globalMusicName}
              musicVolume={musicVolume} voiceoverVolume={voiceoverVolume}
              totalDuration={totalSec}
              loopEnabled={loopEnabled} onLoopEnabledChange={setLoopEnabled}
              loopIn={loopIn} loopOut={loopOut}
              onLoopChange={(a, b) => { setLoopIn(a); setLoopOut(b); }}
              ratio={ratio} onRatioChange={setRatio}
              onUndo={undoTimeline} onRedo={redoTimeline}
              onUpdateActiveScene={(changes) => updateScene(activeScene, changes)}
              captionsVisible={captionsVisible}
              onCaptionsToggle={() => setCaptionsVisible(p => !p)}
              safeZoneEnabled={safeZoneEnabled}
              onSafeZoneToggle={() => setSafeZoneEnabled(p => !p)}
              safeZonePlatform={safeZonePlatform}
              onSafeZonePlatformChange={setSafeZonePlatform}
              onDeleteScene={deleteScene}
              onSfxOutOfRange={() => toast.show("SFX clip placed beyond the end of your video — it won't be included in the export.", "error")}
              theme={theme}
              onSeek={p => {
                const t = p * totalSec;
                dispatchWithHistory({ type: "SEEK", time: t });
                livePlayheadRef.current = t;
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
      {exportUpgrade && <ExportUpgradeModal requiredCredits={exportUpgrade.requiredCredits} onClose={() => setExportUpgrade(null)} />}
      <ChatBot />
      <Toast toast={toast.toast} />
    </div>
  );
}
