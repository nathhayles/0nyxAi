// SequencerPanel.jsx — V2 NLE Sequencer
// 6-track timeline wired to timelineReducer. DO NOT use in Editor.jsx (V1).
// Handles: clip rendering, playhead scrub, zoom, drag-drop from media panel,
//          trim handles, clip selection, split at playhead, mute/solo.

import React, {
  useRef, useState, useCallback, useEffect, useMemo, useLayoutEffect, memo,
} from "react";
import { createPortal } from "react-dom";
import HelpTooltip from "./HelpTooltip.jsx";
import { getAuthHeaders } from "../utils/auth.js";
import { usePlayheadTicker } from "../hooks/usePlayheadTicker.js";
import { PLATFORM_SAFE_ZONES, SAFE_ZONE_PLATFORMS } from "../data/platformSafeZones.js";
import {
  TRACK_TYPES, makeClip, totalDuration, snapTargets, nearestSnap, evalVolumeEnvelope,
  clipOverlapsTrack, SPEED_RAMP_PRESETS,
} from "../reducers/timelineReducer.js";
import { AUDIO_CEILING_MULTIPLIERS } from "@shared/audioConstants.js";

// ─── constants ────────────────────────────────────────────────────────────────
const TRACK_H       = 48;   // px per track row
const HEADER_W      = 116;  // px for track label column
const RULER_H       = 28;   // px for time ruler
const MIN_ZOOM      = 20;   // px per second (zoomed out)
const MAX_ZOOM      = 400;  // px per second (zoomed in)
const DEFAULT_ZOOM  = 80;
const SNAP_PX       = 8;    // snap threshold in pixels

const TRACK_ORDER = ["video", "broll", "fx", "voiceover", "music", "sfx"];

// rAF-throttled drag-scrub helper -- caps onScrub calls to at most once per
// animation frame regardless of how fast mousemove actually fires (some
// trackpads and high-poll-rate mice fire well past 60/sec). Before this,
// nothing throttled the ruler/track drag handlers at all -- in fact
// dragging the ruler or a track background didn't call onScrub on every
// move to begin with (see handleMouseDown/onTrackClick below, both fixed
// alongside this to actually scrub continuously during a drag instead of
// only jumping once on mouseup). Once real per-move scrubbing was wired
// up, an unthrottled version visibly lagged and stuttered on real footage
// -- every raw mousemove was dispatching a SEEK and forcing a video
// currentTime seek, faster than the browser's decoder could keep up with,
// which is exactly the "delays and glitches" this was built to fix.
// Returns { onMove, stop } -- call onMove(time) on every raw mousemove,
// call stop() on mouseup/drag-end to cancel any pending frame.
function createRafScrubber(onScrub) {
  let pending = null;
  let rafId = null;
  function flush() {
    rafId = null;
    if (pending !== null) {
      const t = pending;
      pending = null;
      onScrub(t);
    }
  }
  return {
    onMove(time) {
      pending = time;
      if (rafId === null) rafId = requestAnimationFrame(flush);
    },
    stop() {
      if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; }
      pending = null;
    },
  };
}

const TRACK_META = {
  // `icon` (a text glyph) is kept only for the <option> dropdown at line
  // ~1646, which can't render markup -- the real track-header rendering
  // uses TRACK_ICON_SVG below instead (see that const's own comment).
  video:     { label: "Video",  color: "#7c3aed", dimColor: "rgba(124,58,237,0.18)", icon: "▶" },
  broll:     { label: "B-Roll", color: "#3b82f6", dimColor: "rgba(59,130,246,0.18)", icon: "◈" },
  fx:        { label: "FX",     color: "#ec4899", dimColor: "rgba(236,72,153,0.18)", icon: "✦" },
  voiceover: { label: "Voice",  color: "#22c55e", dimColor: "rgba(34,197,94,0.18)",  icon: "♪" },
  music:     { label: "Music",  color: "#8b5cf6", dimColor: "rgba(139,92,246,0.18)", icon: "♫" },
  sfx:       { label: "SFX",    color: "#f59e0b", dimColor: "rgba(245,158,11,0.18)", icon: "◉" },
};

// Raw Unicode glyphs (▶ ◈ ✦ ♪ ♫ ◉) as the actual track-header icons were
// flagged in a real UX audit (2026-08-27) as the single most visible
// "doesn't look like a professional video tool" signal in the whole app --
// different weights/styles, some read as math symbols rather than
// intentional iconography. Same thin-stroke visual language as
// EditorV2.jsx's EDITOR_ICONS (left sidebar rail) for consistency across
// the app, though not literally shared code -- that map is local to
// EditorV2.jsx and this is a different, smaller icon set (track headers
// only need 6, not the sidebar's 12).
const TRACK_ICON_SVG = {
  video: <svg viewBox="0 0 24 24" width={12} height={12} fill="none" stroke="currentColor" strokeWidth={1.8}><path d="M7 5l12 7-12 7V5z"/></svg>,
  broll: <svg viewBox="0 0 24 24" width={12} height={12} fill="none" stroke="currentColor" strokeWidth={1.8}><rect x="2" y="6" width="14" height="12" rx="1.5"/><path d="M16 10.5 21.5 7v10L16 13.5"/></svg>,
  fx: <svg viewBox="0 0 24 24" width={12} height={12} fill="none" stroke="currentColor" strokeWidth={1.8}><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3z"/></svg>,
  voiceover: <svg viewBox="0 0 24 24" width={12} height={12} fill="none" stroke="currentColor" strokeWidth={1.8}><path d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3z"/><path d="M5 11a7 7 0 0 0 14 0"/><path d="M12 18v3"/></svg>,
  music: <svg viewBox="0 0 24 24" width={12} height={12} fill="none" stroke="currentColor" strokeWidth={1.8}><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>,
  sfx: <svg viewBox="0 0 24 24" width={12} height={12} fill="none" stroke="currentColor" strokeWidth={1.8}><path d="M11 5 6 9H2v6h4l5 4V5z"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>,
};

// Media "kind" each track accepts on a Library/panel drop. voiceover is
// generated (TTS), never manually dropped onto — always rejected.
const TRACK_ACCEPTS = {
  video:     ["video", "image"],
  broll:     ["video", "image"],
  fx:        ["video", "image", "fx"],
  voiceover: [],
  music:     ["audio"],
  sfx:       ["audio"],
};

function mediaKind(media) {
  return media?.type || media?.mediaType || (media?.elementType ? "fx" : null) || "video";
}

// Dynamic stem tracks (key starts with "stem-") aren't in TRACK_ACCEPTS but
// are always audio.
function isDropAllowed(trackKey, media) {
  if (trackKey === "voiceover") return false;
  const accepted = TRACK_ACCEPTS[trackKey] || (trackKey.startsWith("stem-") ? ["audio"] : null);
  if (!accepted) return true; // unknown custom track — don't block
  return accepted.includes(mediaKind(media));
}

// Returns display meta for any track — built-in or dynamic (stem).
function trackMeta(track) {
  if (TRACK_META[track.key]) return TRACK_META[track.key];
  const color = track.color || "#8b5cf6";
  return {
    label:    track.label || track.key,
    icon:     track.icon  || "♪",
    color,
    dimColor: color + "2e",
  };
}

const TRANSITION_TYPES = [
  { value: "cut",         label: "Cut" },
  { value: "fade",        label: "Fade" },
  { value: "dissolve",    label: "Dissolve" },
  { value: "slide-left",  label: "Slide Left" },
  { value: "slide-right", label: "Slide Right" },
  { value: "zoom-in",     label: "Zoom In" },
  { value: "zoom-out",    label: "Zoom Out" },
  { value: "wipe",        label: "Wipe" },
  { value: "blur",        label: "Blur" },
  { value: "push",        label: "Push" },
  { value: "spin",        label: "Spin" },
];

const TRANSITION_PIP = {
  fade:          "#4dd0ff",
  dissolve:      "#a78bfa",
  "slide-left":  "#34d399",
  "slide-right": "#fbbf24",
  "zoom-in":     "#f87171",
  "zoom-out":    "#fb923c",
  wipe:          "#60a5fa",
  slideLeft:     "#22c55e",
  slideRight:    "#22c55e",
  zoomIn:        "#f97316",
  zoomOut:       "#f97316",
  blur:          "#06b6d4",
  flash:         "#fbbf24",
  spin:          "#a855f7",
  push:          "#84cc16",
};

// ─── helpers ──────────────────────────────────────────────────────────────────
function fmtTime(s) {
  const t = Math.max(0, Number(s) || 0);
  const m = Math.floor(t / 60);
  const ss = String(Math.floor(t % 60)).padStart(2, "0");
  const ds = String(Math.floor((t % 1) * 10));
  return `${m}:${ss}.${ds}`;
}

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

// Timecode readout — isolated leaf so it can tick at 60fps during playback
// (via usePlayheadTicker) without forcing all of SequencerPanel to re-render.
function SequencerTimecodeBase({ livePlayheadRef, isPlaying, checkpointPlayhead, totalSec, isOpal }) {
  const playhead = usePlayheadTicker(livePlayheadRef, isPlaying, checkpointPlayhead);
  return (
    <span style={{ fontSize: 10.5, fontFamily: "monospace", color: isOpal ? "#06121b" : "#4dd0ff", letterSpacing: "0.04em" }}>
      {fmtTime(playhead)} / {fmtTime(totalSec)}
    </span>
  );
}
const SequencerTimecode = memo(SequencerTimecodeBase);

// Playhead line spanning all tracks — isolated leaf, same reasoning as
// RulerPlayheadNeedle and SequencerTimecode above.
function TrackAreaPlayheadLineBase({ livePlayheadRef, isPlaying, checkpointPlayhead, zoom }) {
  const playhead = usePlayheadTicker(livePlayheadRef, isPlaying, checkpointPlayhead);
  return (
    <div style={{
      position: "absolute",
      left: playhead * zoom,
      top: RULER_H, bottom: 0,
      width: 1,
      background: "#4dd0ff",
      opacity: 0.85,
      pointerEvents: "none",
      zIndex: 10,
    }}/>
  );
}
const TrackAreaPlayheadLine = memo(TrackAreaPlayheadLineBase);

function useRAF(callback, active) {
  const cbRef = useRef(callback);
  cbRef.current = callback;
  const rafRef = useRef(null);
  useEffect(() => {
    if (!active) { cancelAnimationFrame(rafRef.current); return; }
    let last = performance.now();
    function tick(now) {
      cbRef.current((now - last) / 1000);
      last = now;
      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [active]);
}

// Live playhead needle for the Ruler — isolated into its own tiny memoized
// leaf so it can tick at 60fps during playback (via usePlayheadTicker)
// without forcing Ruler (and everything above it) to re-render every frame.
// Same pattern as SafeZoneOverlay's isolation from PreviewCanvas.
function RulerPlayheadNeedleBase({ zoom, livePlayheadRef, isPlaying, checkpointPlayhead }) {
  const playhead = usePlayheadTicker(livePlayheadRef, isPlaying, checkpointPlayhead);
  const playheadPx = playhead * zoom;
  if (playheadPx < 0) return null;
  return (
    <div style={{
      position: "absolute", top: 0, left: playheadPx, bottom: 0,
      width: 1, background: "#4dd0ff", pointerEvents: "none",
    }}>
      <div style={{
        position: "absolute", top: 0, left: -4, width: 9, height: 9,
        background: "#4dd0ff", clipPath: "polygon(50% 0%,100% 100%,0% 100%)",
      }}/>
    </div>
  );
}
const RulerPlayheadNeedle = memo(RulerPlayheadNeedleBase);

// ─── Ruler ────────────────────────────────────────────────────────────────────
// Memoized: Ruler's own props (zoom/scrollLeft/totalSec/loop state) only
// change on real user actions, not on every playback tick, now that the
// live playhead position is isolated into RulerPlayheadNeedle above.
function RulerBase({ zoom, scrollLeft, totalSec, onScrub, livePlayheadRef, isPlaying, checkpointPlayhead,
                 loopEnabled, loopIn, loopOut, onLoopChange }) {
  const ref = useRef(null);

  const ticks = useMemo(() => {
    const pxPerSec = zoom;
    const intervals = [0.1, 0.25, 0.5, 1, 2, 5, 10, 15, 30, 60];
    const interval = intervals.find(i => i * pxPerSec >= 80) || 60;
    const count = Math.ceil((totalSec + interval) / interval);
    const result = [];
    for (let i = 0; i <= count; i++) {
      const t = i * interval;
      const x = t * pxPerSec;
      const major = i % 2 === 0 || interval >= 1;
      result.push({ t, x, major, label: interval >= 1 ? fmtTime(t) : `${(t % 60).toFixed(1)}` });
    }
    return result;
  }, [zoom, totalSec]);

  // Read canvas-relative time from a clientX, using live DOM scrollLeft.
  function getCanvasSec(clientX) {
    const sc   = ref.current?.closest('[data-sequencer-scroll]');
    const rect = (sc ?? ref.current)?.getBoundingClientRect();
    const sl   = sc ? sc.scrollLeft : 0;
    return Math.max(0, Math.min(totalSec, (clientX - (rect?.left ?? 0) + sl) / zoom));
  }

  function handleMouseDown(e) {
    if (e.button !== 0) return;
    e.preventDefault();
    const clickSec = getCanvasSec(e.clientX);
    const startX   = e.clientX;
    const HANDLE_TOL_SEC = 8 / zoom; // 8px converted to seconds

    const regionExists = loopEnabled && loopOut !== null && loopOut > loopIn;

    // ── Handle drag: grab loopIn edge ──
    if (regionExists && Math.abs(clickSec - loopIn) * zoom <= 8) {
      const scrubber = createRafScrubber(onScrub);
      function onMoveIn(ev) {
        const t = Math.min(getCanvasSec(ev.clientX), loopOut - 0.1);
        onLoopChange(t, loopOut);
        scrubber.onMove(t);
      }
      function onUpIn() {
        window.removeEventListener("mousemove", onMoveIn);
        window.removeEventListener("mouseup", onUpIn);
        scrubber.stop();
      }
      window.addEventListener("mousemove", onMoveIn);
      window.addEventListener("mouseup", onUpIn);
      return;
    }

    // ── Handle drag: grab loopOut edge ──
    if (regionExists && Math.abs(clickSec - loopOut) * zoom <= 8) {
      const scrubber = createRafScrubber(onScrub);
      function onMoveOut(ev) {
        const t = Math.max(getCanvasSec(ev.clientX), loopIn + 0.1);
        onLoopChange(loopIn, t);
        scrubber.onMove(t);
      }
      function onUpOut() {
        window.removeEventListener("mousemove", onMoveOut);
        window.removeEventListener("mouseup", onUpOut);
        scrubber.stop();
      }
      window.addEventListener("mousemove", onMoveOut);
      window.addEventListener("mouseup", onUpOut);
      return;
    }

    // ── Click/drag inside existing region → scrub only, never reset region ──
    // Previously this comment described the intent but the code never
    // actually implemented it -- onMoveInside only tracked whether a drag
    // happened at all, and onScrub only fired on mouseup if it DIDN'T move
    // (i.e. only a plain click worked; dragging inside the region did
    // nothing until release). Now genuinely scrubs on every frame of the
    // drag, matching what the comment always said should happen.
    if (regionExists && clickSec >= loopIn && clickSec <= loopOut) {
      const scrubber = createRafScrubber(onScrub);
      onScrub(clickSec);
      function onMoveInside(ev) { scrubber.onMove(getCanvasSec(ev.clientX)); }
      function onUpInside() {
        window.removeEventListener("mousemove", onMoveInside);
        window.removeEventListener("mouseup", onUpInside);
        scrubber.stop();
      }
      window.addEventListener("mousemove", onMoveInside);
      window.addEventListener("mouseup", onUpInside);
      return;
    }

    // ── Outside region (or no region): rubber-band new region or click-to-scrub ──
    // Scrubs live on every frame of the drag (previously only the
    // loop-region rubber-band updated during the drag itself; the preview
    // never moved until mouseup, and even then only if you HADN'T moved).
    const startSec = clickSec;
    let moved = false;
    const scrubber = createRafScrubber(onScrub);
    onScrub(startSec);
    function onMove(ev) {
      if (Math.abs(ev.clientX - startX) > 4) moved = true;
      const endSec = getCanvasSec(ev.clientX);
      scrubber.onMove(endSec);
      if (moved) {
        const a = Math.min(startSec, endSec);
        const b = Math.max(startSec, endSec);
        onLoopChange(a, b > a ? b : a + 0.5);
      }
    }
    function onUp() {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      scrubber.stop();
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  const hasLoop    = loopEnabled && loopOut !== null && loopOut > loopIn;
  const loopInPx   = loopIn  * zoom;
  const loopOutPx  = (loopOut ?? 0) * zoom;

  return (
    <div ref={ref} onMouseDown={handleMouseDown} style={{
      position: "sticky", top: 0, zIndex: 10,
      height: RULER_H, overflow: "hidden", cursor: "col-resize",
      borderBottom: "0.5px solid rgba(255,255,255,0.08)", userSelect: "none", flexShrink: 0,
      background: "var(--panel-bg)",
    }}>
      <svg width="100%" height={RULER_H} style={{ display: "block", overflow: "visible" }}>
        {/* Loop region shaded band */}
        {hasLoop && (
          <rect x={loopInPx} y={0} width={loopOutPx - loopInPx} height={RULER_H}
            fill="rgba(77,208,255,0.18)" />
        )}
        {ticks.map(({ t, x, major, label }) => (
          <g key={t} transform={`translate(${x},0)`}>
            <line x1={0} y1={major ? 0 : RULER_H * 0.5} x2={0} y2={RULER_H}
              stroke="var(--onyx-text-mute)" strokeWidth={0.5}/>
            {major && (
              <text x={3} y={RULER_H - 8} fill="var(--onyx-text-dim)"
                fontSize={10} fontFamily="monospace">{label}</text>
            )}
          </g>
        ))}
        {/* Loop in/out edge markers */}
        {hasLoop && (
          <>
            <line x1={loopInPx}  y1={0} x2={loopInPx}  y2={RULER_H} stroke="#4dd0ff" strokeWidth={1.5}/>
            <polygon points={`${loopInPx},0 ${loopInPx + 7},0 ${loopInPx},7`}   fill="#4dd0ff"/>
            <line x1={loopOutPx} y1={0} x2={loopOutPx} y2={RULER_H} stroke="#4dd0ff" strokeWidth={1.5}/>
            <polygon points={`${loopOutPx},0 ${loopOutPx - 7},0 ${loopOutPx},7`} fill="#4dd0ff"/>
          </>
        )}
      </svg>
      {/* Playhead needle on ruler — isolated leaf, ticks at 60fps independently */}
      <RulerPlayheadNeedle
        zoom={zoom}
        livePlayheadRef={livePlayheadRef}
        isPlaying={isPlaying}
        checkpointPlayhead={checkpointPlayhead}
      />
    </div>
  );
}
const Ruler = memo(RulerBase);

// ─── Transition duration handle ───────────────────────────────────────────────
// Also doubles as a drop target for applying a transition from the
// Transitions panel -- previously only the clip body itself accepted that
// drop, but this divider marker between two clips is the more intuitive
// target for "apply a transition here" (confirmed live 2026-08-19: a real
// test session dropped on the divider first and got no response). Applies
// to the outgoing clip's transitionToNext, same as dropping on the clip.
function TransitionHandle({ x, color, transitionType, duration, onDurationChange, dispatch, updateScene, clipId, sceneId }) {
  const [dragging, setDragging] = useState(false);
  const [hover, setHover]       = useState(false);
  const [dropHover, setDropHover] = useState(false);
  const startRef = useRef(null);

  function onMouseDown(e) {
    e.stopPropagation();
    e.preventDefault();
    setDragging(true);
    startRef.current = { clientX: e.clientX, duration };

    function onMove(ev) {
      const dx = ev.clientX - startRef.current.clientX;
      const newDur = Math.round(Math.max(0.1, Math.min(2.0, startRef.current.duration + dx * 0.01)) * 10) / 10;
      onDurationChange(newDur);
    }
    function onUp() {
      setDragging(false);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  return (
    <div
      onMouseDown={onMouseDown}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onDragOver={e => {
        if (!sceneId || !window.__onyxDraggedTransition) return;
        e.preventDefault();
        setDropHover(true);
      }}
      onDragLeave={() => setDropHover(false)}
      onDrop={e => {
        if (!sceneId || !window.__onyxDraggedTransition) return;
        e.preventDefault();
        e.stopPropagation();
        setDropHover(false);
        const data = window.__onyxDraggedTransition;
        window.__onyxDraggedTransition = null;
        updateScene?.(sceneId, { transitionToNext: data.type });
        dispatch?.({ type: "UPDATE_CLIP", clipId, changes: { transitionToNext: data.type } });
      }}
      title={`${transitionType} · ${duration}s — drag to adjust, or drop a transition here to apply`}
      style={{
        position: "absolute",
        // Widened well past the 10px visual marker so a transition dropped
        // anywhere near the cut point registers -- the marker itself stays
        // visually thin, only the interactive hit area is bigger.
        left: x - 14,
        top: 0, bottom: 0,
        width: 28,
        cursor: "ew-resize",
        zIndex: 10,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: dropHover ? `${color}22` : "transparent",
        outline: dropHover ? `2px solid ${color}` : "none",
        outlineOffset: -1,
      }}
    >
      <div style={{
        width: dragging ? 4 : (hover || dropHover) ? 3 : 2,
        height: "70%",
        background: color,
        borderRadius: 2,
        boxShadow: `0 0 ${hover || dragging || dropHover ? 6 : 3}px ${color}`,
        transition: "width 0.1s, box-shadow 0.1s",
      }}/>
      {(hover || dragging) && (
        <div style={{
          position: "absolute", bottom: "105%", left: "50%", transform: "translateX(-50%)",
          background: "var(--onyx-inset)", border: `1px solid ${color}55`,
          borderRadius: 4, padding: "2px 6px",
          fontSize: 9, color, whiteSpace: "nowrap", pointerEvents: "none",
        }}>
          {transitionType} {duration}s
        </div>
      )}
    </div>
  );
}

// ─── Volume envelope overlay (audio clips) ────────────────────────────────────
// SVG overlay on top of the waveform. Outer <svg> has pointerEvents:"none" so it
// never blocks clip drag/select; only the line and handles opt back in.
//
// Stored point value `v` (0-100) is always "% of this track's ceiling" — that
// part of the data model and the render-pipeline math are untouched by this
// component. Only the *visual* y-axis is recalibrated here to show true
// absolute volume (0% = silence, 100% = the loudest any clip could ever be),
// so the displayed height actually means what it looks like it means. The
// axis's reference max is `Math.max(1, ceilingFraction)`: normally that's
// "true 100%", but for tracks whose ceiling multiplier pushes past 1 (e.g.
// the voiceover boost) the axis stretches to the clip's own reachable max so
// the baseline never renders above the top of the chart.
const HANDLE_R = 4;       // visible dot radius
const HANDLE_HIT_R = 11;  // invisible grab radius — ~2.7x the visible dot (item 5)
const ENVELOPE_HINT_SEEN_KEY = "onyx_envelope_hint_seen"; // per-browser, not per-account — fine for a low-stakes one-time hint

function VolumeEnvelope({ clip, w, dispatch, trackKey, trackVolume }) {
  const H = 28;
  const PAD = 2;
  const [lineHovered, setLineHovered] = useState(false);
  const [hoveredHandle, setHoveredHandle] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [hintPos, setHintPos] = useState({ x: 0, y: 0 });
  const clipDuration = clip.trimEnd - clip.trimStart;
  if (!(clipDuration > 0)) return null;

  const ceilingMultiplier = AUDIO_CEILING_MULTIPLIERS[trackKey] ?? 1;
  const ceilingFraction = (Number(trackVolume ?? 100) / 100) * ceilingMultiplier;
  const axisMax = Math.max(1, ceilingFraction);

  // v (0-100, % of ceiling) <-> absolute fraction of axisMax, for display only.
  function valueToY(v) {
    const absoluteFrac = (clamp(v, 0, 100) / 100) * ceilingFraction;
    return PAD + (1 - absoluteFrac / axisMax) * (H - 2 * PAD);
  }
  function yToValue(y) {
    if (ceilingFraction <= 0) return 0; // track muted/zeroed — nothing is reachable anyway
    const absoluteFrac = (1 - (y - PAD) / (H - 2 * PAD)) * axisMax;
    return clamp((absoluteFrac / ceilingFraction) * 100, 0, 100);
  }

  const points = clip.volumePoints || [];
  const sorted = points.length ? [...points].sort((a, b) => a.t - b.t) : [];

  const toXY = (p) => ({
    x: clamp((p.t / clipDuration) * w, 0, w),
    y: valueToY(p.v),
  });

  const handles = sorted.map(toXY);
  // Baseline (no points yet): flat line at the track's current ceiling — always
  // solid and prominent, never an empty/dashed placeholder (item 1 + item 2).
  const baselineY = valueToY(100);
  const lineXY = sorted.length >= 2
    ? handles
    : sorted.length === 1
      ? [{ x: 0, y: handles[0].y }, { x: w, y: handles[0].y }]
      : [{ x: 0, y: baselineY }, { x: w, y: baselineY }];
  const polylineStr = lineXY.map(p => `${p.x},${p.y}`).join(" ");

  function commit(nextPoints) {
    dispatch({ type: "SET_VOLUME_POINTS", clipId: clip.id, points: nextPoints });
  }

  // Click the line itself (not a handle) → insert a point at the current
  // interpolated value, so there's no visual jump (confirmed UX decision).
  // evalVolumeEnvelope already operates in stored-v space (% of ceiling), so
  // this needs no change for the new axis — only where it's drawn changed.
  function onLineMouseDown(e) {
    e.stopPropagation();
    const rect = e.currentTarget.closest('[data-clip-envelope]').getBoundingClientRect();
    const x = clamp(e.clientX - rect.left, 0, w);
    const t = (x / w) * clipDuration;
    const v = evalVolumeEnvelope(sorted.length >= 1 ? sorted : null, t);
    commit([...sorted, { t, v }].sort((a, b) => a.t - b.t));
  }

  // Drag a handle: horizontal = time (clamped between neighbors), vertical = value.
  // y is clamped to the full [0,H] track height (not [PAD,H-PAD]) so the very
  // bottom (true 0%/silence) and very top (100%/full ceiling) pixels are both
  // reachable — confirmed no floor/ceiling clamp keeps this from hitting 0 or 100.
  function onHandleMouseDown(e, idx) {
    e.stopPropagation();
    e.preventDefault();
    const svgEl = e.currentTarget.closest('[data-clip-envelope]');
    const minT = idx > 0 ? sorted[idx - 1].t + 0.01 : 0;
    const maxT = idx < sorted.length - 1 ? sorted[idx + 1].t - 0.01 : clipDuration;
    setDragging(true);

    function onMove(ev) {
      ev.preventDefault(); // stop native text/image drag-selection from hijacking fast pointer moves
      const rect = svgEl.getBoundingClientRect();
      const x = clamp(ev.clientX - rect.left, 0, w);
      const y = clamp(ev.clientY - rect.top, 0, H);
      const t = clamp((x / w) * clipDuration, minT, Math.max(minT, maxT));
      const v = yToValue(y);
      const next = sorted.map((p, i) => (i === idx ? { t, v } : p));
      commit(next);
    }
    function onUp() {
      setDragging(false);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  function onHandleDoubleClick(e, idx) {
    e.stopPropagation();
    commit(sorted.filter((_, i) => i !== idx));
  }

  // First-ever hover over an envelope, this browser: surface a one-time hint,
  // then never again (item 6) — purely a discoverability nudge, not a modal.
  function showHintIfFirstTime(e) {
    if (localStorage.getItem(ENVELOPE_HINT_SEEN_KEY)) return;
    const rect = e.currentTarget.closest('[data-clip-envelope]').getBoundingClientRect();
    setHintPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    setShowHint(true);
    localStorage.setItem(ENVELOPE_HINT_SEEN_KEY, "1");
    setTimeout(() => setShowHint(false), 3000);
  }

  const cursor = dragging ? "grabbing" : "grab";

  return (
    <svg data-clip-envelope="1" width={w} height={H}
      style={{ position: "absolute", left: 0, top: 0, pointerEvents: "none", overflow: "visible" }}>
      {/* Widened invisible hit-area around the visible 1.5px stroke — was 10px,
          which on a short/narrow clip (esp. music, before the real-duration
          fix above) covered nearly the whole clip body and stole plain
          click-drags meant to move the clip, not touch its volume line.
          4px keeps the line comfortably grabbable without eating the clip. */}
      <polyline points={polylineStr} fill="none" stroke="rgba(0,0,0,0.01)" strokeWidth={4}
        data-volume-line="1" style={{ pointerEvents: "all", cursor: "copy" }}
        onMouseDown={onLineMouseDown}
        onMouseEnter={e => { setLineHovered(true); showHintIfFirstTime(e); }}
        onMouseLeave={() => setLineHovered(false)}/>
      <polyline points={polylineStr} fill="none" stroke="#4dd0ff"
        strokeWidth={lineHovered ? 2 : 1.3} opacity={lineHovered ? 1 : 0.85}
        style={{ pointerEvents: "none", transition: "stroke-width 0.1s, opacity 0.1s" }}/>
      {handles.map((p, idx) => (
        <g key={idx}>
          {/* hover halo — signals "grabbable point" before the user commits to a click */}
          {hoveredHandle === idx && (
            <circle cx={p.x} cy={p.y} r={7} fill="none" stroke="#4dd0ff" strokeWidth={1.5} opacity={0.5}/>
          )}
          {/* invisible, oversized hit-target — ~2.7x the visible dot (item 5) */}
          <circle cx={p.x} cy={p.y} r={HANDLE_HIT_R} fill="rgba(0,0,0,0.01)"
            data-volume-handle="1" style={{ pointerEvents: "all", cursor }}
            onMouseDown={e => onHandleMouseDown(e, idx)}
            onDoubleClick={e => onHandleDoubleClick(e, idx)}
            onMouseEnter={e => { setHoveredHandle(idx); showHintIfFirstTime(e); }}
            onMouseLeave={() => setHoveredHandle(null)}/>
          <circle cx={p.x} cy={p.y} r={HANDLE_R} fill="#4dd0ff" stroke="#06121b" strokeWidth={1}
            style={{ pointerEvents: "none" }}/>
        </g>
      ))}
      {showHint && (
        <foreignObject x={clamp(hintPos.x - 60, 0, Math.max(0, w - 150))} y={-34} width={150} height={30}
          style={{ pointerEvents: "none" }}>
          <div style={{
            background: "rgba(6,18,27,0.95)", border: "1px solid rgba(77,208,255,0.4)",
            borderRadius: 4, padding: "3px 6px", fontSize: 9, color: "#4dd0ff",
            lineHeight: 1.3, fontFamily: "inherit", whiteSpace: "nowrap",
          }}>
            Click to add a point · drag up/down
          </div>
        </foreignObject>
      )}
    </svg>
  );
}

// ─── Clip block ───────────────────────────────────────────────────────────────
function ClipBlock({ clip, zoom, selected, onSelect, onTrimStart, onTrimEnd, onDragMove,
                     trackColor, trackDimColor, trackKey, trackVolume, timelineRef, onDeleteScene, dispatch,
                     onContextMenu, transitionToNext, updateScene }) {
  const x     = clip.startTime * zoom;
  const w     = Math.max(4, (clip.trimEnd - clip.trimStart) * zoom);
  const isAudio = clip.type === "audio";
  const pipColor = transitionToNext && transitionToNext !== "cut" ? TRANSITION_PIP[transitionToNext] : null;

  function onMouseDownBody(e) {
    if (e.target.dataset.trim || e.target.dataset.volumeHandle || e.target.dataset.volumeLine) return;
    e.stopPropagation();
    onSelect(clip.id);
    onDragMove(e, clip);
  }

  return (
    <div
      onMouseDown={onMouseDownBody}
      onContextMenu={onContextMenu}
      onDragOver={e => {
        if (!clip.sceneId || !window.__onyxDraggedTransition) return;
        e.preventDefault();
        e.currentTarget.style.outline = "2px solid #4dd0ff";
      }}
      onDragLeave={e => { e.currentTarget.style.outline = "none"; }}
      onDrop={e => {
        // Only video clips accept transition drags; everything else (media dropped
        // from a panel onto an existing audio clip, etc.) must bubble up to the
        // track row's own onDrop instead of being silently swallowed here.
        if (!clip.sceneId || !window.__onyxDraggedTransition) return;
        e.preventDefault();
        e.stopPropagation();
        e.currentTarget.style.outline = 'none';
        const data = window.__onyxDraggedTransition;
        window.__onyxDraggedTransition = null;
        updateScene?.(clip.sceneId, { transitionToNext: data.type });
        dispatch({ type: "UPDATE_CLIP", clipId: clip.id, changes: { transitionToNext: data.type } });
      }}
      style={{
        position: "absolute",
        left: x, width: w, top: 3, bottom: 3,
        borderRadius: 5,
        background: selected
          ? `linear-gradient(180deg, ${trackColor}cc, ${trackColor}88)`
          : `linear-gradient(180deg, ${trackDimColor}, rgba(0,0,0,0.25))`,
        border: selected
          ? `1px solid ${trackColor}`
          : `0.5px solid ${trackColor}55`,
        cursor: "grab",
        overflow: "hidden",
        display: "flex", alignItems: "center",
        userSelect: "none",
        boxShadow: selected ? `0 0 0 1px ${trackColor}44, 0 2px 8px rgba(0,0,0,0.4)` : "none",
        transition: "border-color 0.1s, background 0.1s",
      }}
    >
      {/* Trim handle — left */}
      <div data-trim="start" onMouseDown={e => { e.stopPropagation(); onTrimStart(e, clip); }}
        style={{
          position: "absolute", left: 0, top: 0, bottom: 0, width: 7,
          cursor: "ew-resize", background: `${trackColor}88`,
          borderRadius: "5px 0 0 5px", flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
        <div style={{ width: 1, height: 10, background: "rgba(255,255,255,0.5)", borderRadius: 1 }}/>
      </div>

      {/* Content */}
      <div style={{
        flex: 1, minWidth: 0, padding: "0 10px 0 10px",
        display: "flex", alignItems: "center", gap: 4, overflow: "hidden",
      }}>
        {clip.thumbnail && !isAudio && w > 40 && (
          <img src={clip.thumbnail} alt="" style={{
            height: 30, width: 22, objectFit: "cover", borderRadius: 3,
            flexShrink: 0, opacity: 0.85,
          }}/>
        )}
        {w > 50 && (
          <span style={{
            fontSize: 9.5, fontWeight: 600, color: "rgba(255,255,255,0.9)",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            letterSpacing: "0.02em",
          }}>
            {clip.label || clip.narration?.slice(0, 20) || "Clip"}
          </span>
        )}
        {isAudio && w > 80 && (
          <svg width={Math.max(0, w - 28)} height={28} viewBox={`0 0 ${w - 28} 28`}
            style={{ position: "absolute", left: 10, opacity: 0.3, pointerEvents: "none" }}>
            {Array.from({ length: Math.floor((w - 28) / 3) }).map((_, i) => {
              const h = Math.max(1, 4 + Math.sin(i * 0.7 + clip.id.charCodeAt(2)) * 8 + Math.random() * 6);
              return <rect key={i} x={i * 3} y={(28 - h) / 2} width={2} height={h}
                fill={trackColor} rx={1}/>;
            })}
          </svg>
        )}
        {isAudio && w > 24 && (
          <div style={{ position: "absolute", left: 4, top: 0, width: Math.max(0, w - 8), height: 28 }}>
            <VolumeEnvelope clip={clip} w={Math.max(0, w - 8)} dispatch={dispatch}
              trackKey={trackKey} trackVolume={trackVolume}/>
          </div>
        )}
      </div>

      {/* Trim handle — right */}
      <div data-trim="end" onMouseDown={e => { e.stopPropagation(); onTrimEnd(e, clip); }}
        style={{
          position: "absolute", right: 0, top: 0, bottom: 0, width: 7,
          cursor: "ew-resize", background: `${trackColor}88`,
          borderRadius: "0 5px 5px 0", flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
        <div style={{ width: 1, height: 10, background: "rgba(255,255,255,0.5)", borderRadius: 1 }}/>
      </div>

      {/* Muted badge */}
      {clip.muted && (
        <div style={{
          position: "absolute", top: 3, right: 10,
          fontSize: 8, color: "rgba(255,100,100,0.9)",
          background: "rgba(0,0,0,0.5)", borderRadius: 3, padding: "1px 4px",
        }}>MUTE</div>
      )}

      {/* Transition pip — right edge, shown when a non-cut transition is set */}
      {pipColor && (
        <div style={{
          position: "absolute", right: 9, top: "50%", transform: "translateY(-50%)",
          width: 6, height: 6, borderRadius: "50%",
          background: pipColor, boxShadow: `0 0 4px ${pipColor}`,
          pointerEvents: "none", zIndex: 5,
        }}/>
      )}

    </div>
  );
}

// ─── Track row ────────────────────────────────────────────────────────────────
// Memoized (see const TrackRow = memo(...) below): TrackRow never reads
// playhead at all, so it only needs to re-render when its own props
// (track/zoom/selection/etc.) genuinely change -- previously it re-rendered
// 60x/sec purely as collateral damage from its unmemoized parent
// (SequencerPanel) re-rendering on every playback tick.
function TrackRowBase({ track, zoom, scrollLeft, selected, totalWidth, onSelect,
                    onScrub, onDrop, dispatch, snapEnabled, snapTgts, onDeleteScene,
                    scenes, setCtxMenu, updateScene, setActiveScene }) {
  const meta = trackMeta(track);
  const trackRef = useRef(null);
  const [rejectFlash, setRejectFlash] = useState(false);
  const rejectTimerRef = useRef(null);

  function flashReject() {
    setRejectFlash(true);
    clearTimeout(rejectTimerRef.current);
    rejectTimerRef.current = setTimeout(() => setRejectFlash(false), 350);
  }
  useEffect(() => () => clearTimeout(rejectTimerRef.current), []);

  // ── drag-move clip ──────────────────────────────────────────────────────────
  const onDragMove = useCallback((e, clip) => {
    e.preventDefault();
    const startX    = e.clientX;
    const startTime = clip.startTime;

    function onMove(ev) {
      const dx       = ev.clientX - startX;
      const dSec     = dx / zoom;
      let newStart   = Math.max(0, startTime + dSec);
      if (snapEnabled) {
        const dur      = clip.trimEnd - clip.trimStart;
        const thresh   = SNAP_PX / zoom;
        const snapL    = nearestSnap(newStart, snapTgts, thresh);
        const snapR    = nearestSnap(newStart + dur, snapTgts, thresh);
        const distL    = snapL !== null ? Math.abs(newStart - snapL) : Infinity;
        const distR    = snapR !== null ? Math.abs(newStart + dur - snapR) : Infinity;
        if (distL <= distR && snapL !== null) newStart = snapL;
        else if (snapR !== null)              newStart = Math.max(0, snapR - dur);
      }
      dispatch({ type: "MOVE_CLIP", clipId: clip.id, startTime: newStart });
    }
    function onUp() {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [zoom, snapEnabled, snapTgts, dispatch]);

  // ── trim start ─────────────────────────────────────────────────────────────
  const onTrimStart = useCallback((e, clip) => {
    e.preventDefault();
    const startX     = e.clientX;
    const origTrimSt = clip.trimStart;
    const origStart  = clip.startTime;

    function onMove(ev) {
      const dx   = ev.clientX - startX;
      const dSec = dx / zoom;
      const newTrimSt = clamp(origTrimSt + dSec, 0, clip.trimEnd - 0.1);
      const shift     = newTrimSt - origTrimSt;
      dispatch({ type: "TRIM_CLIP", clipId: clip.id,
        trimStart: newTrimSt, trimEnd: clip.trimEnd });
      dispatch({ type: "MOVE_CLIP", clipId: clip.id, startTime: Math.max(0, origStart + shift) });
    }
    function onUp() {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [zoom, dispatch]);

  // ── trim end ───────────────────────────────────────────────────────────────
  const onTrimEnd = useCallback((e, clip) => {
    e.preventDefault();
    const startX    = e.clientX;
    const origTrimE = clip.trimEnd;

    function onMove(ev) {
      const dx       = ev.clientX - startX;
      const dSec     = dx / zoom;
      const newTrimE = Math.max(clip.trimStart + 0.1, origTrimE + dSec);
      dispatch({ type: "TRIM_CLIP", clipId: clip.id,
        trimStart: clip.trimStart, trimEnd: newTrimE });
    }
    function onUp() {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [zoom, dispatch]);

  // ── drop target ────────────────────────────────────────────────────────────
  function onDragOver(e) {
    e.preventDefault();
    // window.__onyxDraggedMedia is set by the drag source on dragstart — native
    // dataTransfer.getData() isn't readable during dragover, only at drop time.
    const dragged = window.__onyxDraggedMedia;
    const allowed = dragged ? isDropAllowed(track.key, dragged) : true;
    e.dataTransfer.dropEffect = allowed ? "copy" : "none";
  }

  function handleDrop(e) {
    e.preventDefault();
    window.__onyxDraggedMedia = null;
    if (!trackRef.current) return;
    const raw = e.dataTransfer.getData("application/onyx-media");
    if (!raw) return;
    try {
      const media = JSON.parse(raw);
      if (!isDropAllowed(track.key, media)) {
        flashReject();
        return;
      }
      const rect  = trackRef.current.getBoundingClientRect();
      // rect.left already reflects the row's current scroll position (it scrolls
      // natively with the container) — do not add scrollLeft again on top.
      const x     = e.clientX - rect.left;
      let time    = Math.max(0, x / zoom);
      const dur   = Number(media.duration) || 5;
      if (snapEnabled) {
        const thresh = SNAP_PX / zoom;
        const snapL  = nearestSnap(time, snapTgts, thresh);
        const snapR  = nearestSnap(time + dur, snapTgts, thresh);
        const distL  = snapL !== null ? Math.abs(time - snapL) : Infinity;
        const distR  = snapR !== null ? Math.abs(time + dur - snapR) : Infinity;
        if (distL <= distR && snapL !== null) time = snapL;
        else if (snapR !== null)              time = Math.max(0, snapR - dur);
      }
      if (clipOverlapsTrack(track, time, dur)) {
        flashReject();
        return;
      }
      onDrop(track.key, time, media);
    } catch (err) { console.error("[sequencer] drop parse error:", err); }
  }

  // ── click/drag on empty track area to seek ────────────────────────────────
  // Was click-only (single jump on mouseup) -- now scrubs live on every
  // frame of the drag too, same rAF-throttled pattern as the ruler (see
  // createRafScrubber's comment for why raw mousemove needed throttling).
  function trackSec(clientX) {
    const rect = trackRef.current.getBoundingClientRect();
    // rect.left already reflects the row's current scroll position — see handleDrop.
    return Math.max(0, (clientX - rect.left) / zoom);
  }
  function onTrackMouseDown(e) {
    if (e.button !== 0 || e.target !== trackRef.current) return;
    onScrub(trackSec(e.clientX));
    const scrubber = createRafScrubber(onScrub);
    function onMove(ev) { scrubber.onMove(trackSec(ev.clientX)); }
    function onUp() {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      scrubber.stop();
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  return (
    <div ref={trackRef}
      data-track-bg="1"
      onMouseDown={onTrackMouseDown}
      onDragOver={onDragOver}
      onDrop={handleDrop}
      style={{
        position: "relative", height: TRACK_H, flexShrink: 0,
        width: totalWidth, minWidth: "100%",
        borderBottom: "0.5px solid rgba(255,255,255,0.05)",
        background: rejectFlash ? "rgba(239,68,68,0.25)" : "rgba(0,0,0,0.15)",
        transition: "background 0.15s",
      }}
    >
      {/* Track tint stripe */}
      <div style={{
        position: "absolute", left: 0, top: 0, bottom: 0, width: 2,
        background: meta.color, opacity: 0.5,
      }}/>

      {track.clips.map((clip, clipIdx) => {
        const scene = clip.sceneId ? (scenes || []).find(s => s.id === clip.sceneId) : null;
        const transitionToNext = clip.transitionToNext || scene?.transitionToNext || null;
        const transitionDuration = clip.transitionDuration ?? scene?.transitionDuration ?? 0.5;
        const clipRight = (clip.startTime + (clip.trimEnd - clip.trimStart)) * zoom;
        const hasNext = clipIdx < track.clips.length - 1;
        const pipColor = transitionToNext && transitionToNext !== "cut" ? (TRANSITION_PIP[transitionToNext] || "#4dd0ff") : null;
        return (
          <React.Fragment key={clip.id}>
            <ClipBlock
              clip={clip}
              zoom={zoom}
              selected={clip.id === selected}
              trackColor={meta.color}
              trackDimColor={meta.dimColor}
              trackKey={track.key}
              trackVolume={track.volume ?? 100}
              onSelect={id => {
                dispatch({ type: "SELECT", clipId: id });
                if (clip.sceneId != null) setActiveScene?.(clip.sceneId);
              }}
              onTrimStart={onTrimStart}
              onTrimEnd={onTrimEnd}
              onDragMove={onDragMove}
              onDeleteScene={onDeleteScene}
              dispatch={dispatch}
              transitionToNext={transitionToNext}
              updateScene={updateScene}
              onContextMenu={setCtxMenu ? e => {
                e.preventDefault();
                e.stopPropagation();
                setCtxMenu({ x: e.clientX, y: e.clientY, clip, trackKey: track.key });
              } : undefined}
            />
            {hasNext && clip.sceneId && (
              <TransitionHandle
                x={clipRight}
                color={pipColor || 'rgba(255,255,255,0.2)'}
                transitionType={transitionToNext || 'cut'}
                duration={transitionDuration}
                onDurationChange={d => {
                  updateScene?.(clip.sceneId, { transitionDuration: d });
                  dispatch({ type: "UPDATE_CLIP", clipId: clip.id, changes: { transitionDuration: d } });
                }}
                dispatch={dispatch}
                updateScene={updateScene}
                clipId={clip.id}
                sceneId={clip.sceneId}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
const TrackRow = memo(TrackRowBase);

// ─── Clip context menu ────────────────────────────────────────────────────────
function ClipContextMenu({ ctxMenu, onClose, dispatch, updateScene, onDeleteScene }) {
  const { x, y, clip, trackKey } = ctxMenu;
  const menuRef = useRef(null);
  const isVideo = !!clip.sceneId;
  const isBRoll = !clip.sceneId && trackKey === "broll";
  const isFX    = trackKey === "fx" || (!clip.sceneId && !isBRoll);

  const currentTransition = clip.transitionToNext || "cut";
  const [duration, setDuration] = useState(clip.transitionDuration ?? 0.5);
  const [strength, setStrength] = useState(clip.transitionStrength ?? 50);
  const [transitionAxis, setTransitionAxis] = useState(clip.transitionAxis || { x: false, y: true, z: false });
  const fadeIn  = !!clip.fadeIn;
  const fadeOut = !!clip.fadeOut;

  useEffect(() => {
    function onKey(e) { if (e.key === "Escape") onClose(); }
    function onDown(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) onClose();
    }
    document.addEventListener("keydown", onKey, true);
    document.addEventListener("click", onDown);
    return () => {
      document.removeEventListener("keydown", onKey, true);
      document.removeEventListener("click", onDown);
    };
  }, [onClose]);

  // Keep menu inside viewport
  const [pos, setPos] = useState({ left: x, top: y });
  useEffect(() => {
    if (!menuRef.current) return;
    const { width, height } = menuRef.current.getBoundingClientRect();
    setPos({
      left: Math.min(x, window.innerWidth  - width  - 8),
      top:  Math.min(y, window.innerHeight - height - 8),
    });
  }, [x, y]);

  const menuStyle = {
    position: "fixed", left: pos.left, top: pos.top, zIndex: 99999, pointerEvents: "auto",
    background: "var(--panel-bg)", border: "0.5px solid rgba(77,208,255,0.25)",
    borderRadius: 8, padding: "6px 0", minWidth: 200,
    boxShadow: "0 8px 32px rgba(0,0,0,0.6)", fontFamily: "inherit",
    fontSize: 12, color: "var(--onyx-text)",
  };
  const itemStyle = (danger) => ({
    display: "block", width: "100%", padding: "5px 14px", textAlign: "left",
    background: "none", border: "none", cursor: "pointer",
    color: danger ? "#f87171" : "var(--onyx-text)", fontSize: 12, fontFamily: "inherit",
  });
  const sectionLabel = {
    padding: "4px 14px 2px", fontSize: 10, fontWeight: 700, letterSpacing: "0.07em",
    color: "rgba(77,208,255,0.6)", textTransform: "uppercase",
  };
  const divider = { margin: "4px 0", borderTop: "0.5px solid rgba(255,255,255,0.08)" };
  const toggleItem = (active, label, onClick) => (
    <button style={{ ...itemStyle(false), display: "flex", alignItems: "center", gap: 8 }} onClick={onClick}>
      <span style={{ width: 14, height: 14, borderRadius: 3, border: "1px solid rgba(255,255,255,0.3)",
        background: active ? "#4dd0ff" : "transparent", flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9,
      }}>{active ? "✓" : ""}</span>
      {label}
    </button>
  );

  return createPortal(
    <div ref={menuRef} style={menuStyle} onClick={e => e.stopPropagation()}>

      {isVideo && (
        <>
          <div style={sectionLabel}>Transition to next</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, padding: "4px 14px 6px" }}>
            {TRANSITION_TYPES.map(t => (
              <button key={t.value} onClick={() => {
                updateScene?.(clip.sceneId, { transitionToNext: t.value, transitionDuration: duration });
                dispatch({ type: "UPDATE_CLIP", clipId: clip.id, changes: { transitionToNext: t.value } });
              }} style={{
                padding: "3px 8px", fontSize: 10, borderRadius: 4, border: "none", cursor: "pointer",
                background: currentTransition === t.value ? "#4dd0ff" : "var(--chip-bg-strong)",
                color: currentTransition === t.value ? "#06121b" : "var(--onyx-text)", fontWeight: currentTransition === t.value ? 700 : 400,
              }}>{t.label}</button>
            ))}
          </div>
          <div style={{ padding: "0 14px 6px", display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 10, color: "var(--onyx-text-faint)", flexShrink: 0 }}>Duration</span>
            <input type="range" min={0.1} max={2.0} step={0.1} value={duration}
              onChange={e => {
                const v = Number(e.target.value);
                setDuration(v);
                if (currentTransition !== "cut") {
                  updateScene?.(clip.sceneId, { transitionToNext: currentTransition, transitionDuration: v });
                  dispatch({ type: "UPDATE_CLIP", clipId: clip.id, changes: { transitionDuration: v } });
                }
              }}
              style={{ flex: 1, accentColor: "var(--onyx-cyan)", cursor: "pointer" }}/>
            <span style={{ fontSize: 10, color: "var(--onyx-text-faint)", minWidth: 28, fontFamily: "monospace" }}>{duration.toFixed(1)}s</span>
          </div>
          <div style={{ padding: "0 14px 6px", display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 10, color: "var(--onyx-text-faint)", flexShrink: 0 }}>Strength</span>
            <input type="range" min={0} max={100} step={5} value={strength}
              onChange={e => {
                const v = Number(e.target.value);
                setStrength(v);
                if (currentTransition !== "cut") {
                  updateScene?.(clip.sceneId, { transitionStrength: v });
                  dispatch({ type: "UPDATE_CLIP", clipId: clip.id, changes: { transitionStrength: v } });
                }
              }}
              style={{ flex: 1, accentColor: "var(--onyx-cyan)", cursor: "pointer" }}/>
            <span style={{ fontSize: 10, color: "var(--onyx-text-faint)", minWidth: 28, fontFamily: "monospace" }}>{strength}%</span>
          </div>
          {currentTransition === "spin" && (
            <div style={{ padding: "0 14px 8px" }}>
              <div style={{ fontSize: 10, color: "var(--onyx-text-faint)", marginBottom: 4 }}>Spin axis</div>
              <div style={{ display: "flex", gap: 12 }}>
                {["x", "y", "z"].map(axis => (
                  <label key={axis} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, color: "var(--onyx-text-dim)", cursor: "pointer" }}>
                    <input type="checkbox" checked={!!transitionAxis[axis]}
                      onChange={e => {
                        const next = { ...transitionAxis, [axis]: e.target.checked };
                        setTransitionAxis(next);
                        updateScene?.(clip.sceneId, { transitionAxis: next });
                        dispatch({ type: "UPDATE_CLIP", clipId: clip.id, changes: { transitionAxis: next } });
                      }}
                      style={{ accentColor: "var(--onyx-cyan)" }}/>
                    {axis.toUpperCase()}
                  </label>
                ))}
              </div>
            </div>
          )}
          <div style={divider}/>
        </>
      )}

      {(isVideo || isBRoll) && (
        <>
          {toggleItem(fadeIn,  "Fade in (0.3s)",  () => dispatch({ type: "UPDATE_CLIP", clipId: clip.id, changes: { fadeIn:  !fadeIn  } }))}
          {toggleItem(fadeOut, "Fade out (0.3s)", () => dispatch({ type: "UPDATE_CLIP", clipId: clip.id, changes: { fadeOut: !fadeOut } }))}
          <div style={divider}/>
        </>
      )}

      {isVideo && (
        <>
          <button style={itemStyle(false)} onClick={() => {
            dispatch({ type: "DUPLICATE_CLIP", clipId: clip.id });
            onClose();
          }}>Duplicate scene</button>
          <button style={itemStyle(true)} onClick={() => {
            onDeleteScene?.(clip.sceneId);
            onClose();
          }}>Delete scene</button>
        </>
      )}

      {(isBRoll || isFX) && (
        <button style={itemStyle(true)} onClick={() => {
          dispatch({ type: "DELETE_CLIP", clipId: clip.id });
          onClose();
        }}>Delete clip</button>
      )}
    </div>,
    document.body
  );
}

// ─── Main SequencerPanel ──────────────────────────────────────────────────────
const SEQUENCER_HEIGHTS = {
  mini:   36,   // toolbar only — collapsed
  normal: 220,  // ~4 tracks visible, scrollable
  full:   680,  // all tracks + breathing room
};

// Real union of every model's supported aspect ratios (see backend
// VIDEO_MODELS' aspectRatio specs) -- "4:5" dropped since no model actually
// supports it; "21:9"/"4:3"/"3:4" added since Seedance 1 Pro/2.0 and
// wan-2.7 genuinely support them.
const RATIOS = {
  "9:16": { label: "9:16", icon: "▯" },
  "16:9": { label: "16:9", icon: "▭" },
  "1:1":  { label: "1:1",  icon: "▪" },
  "4:3":  { label: "4:3",  icon: "▭" },
  "3:4":  { label: "3:4",  icon: "▮" },
  "21:9": { label: "21:9", icon: "▬" },
};

function SequencerPanelBase({
  timelineState, dispatch,
  isPlaying, livePlayheadRef, onPlayPause,
  scenes, activeScene, setActiveScene,
  updateScene,
  globalMusicUrl, globalMusicName,
  musicVolume, voiceoverVolume,
  totalDuration: totalDurationProp,
  onSeek,
  loopEnabled, onLoopEnabledChange,
  loopIn, loopOut, onLoopChange,
  ratio, onRatioChange,
  onUndo, onRedo,
  onUpdateActiveScene,
  captionsVisible, onCaptionsToggle,
  safeZoneEnabled, onSafeZoneToggle, safeZonePlatform, onSafeZonePlatformChange,
  onDeleteScene,
  onSfxOutOfRange,
  theme,
}) {
  const isOpal = theme === "opal";
  const [zoom, setZoom]           = useState(DEFAULT_ZOOM);
  const [ctxMenu, setCtxMenu]     = useState(null);
  const [colorGradeOpen, setColorGradeOpen] = useState(false);
  const [colorGradePos,  setColorGradePos]  = useState(null);
  const colorGradeRef = useRef(null);
  const colorGradePopoverRef = useRef(null);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [seqSize, setSeqSize]       = useState("normal"); // 'mini' | 'normal' | 'full'
  const scrollRef         = useRef(null);
  const manualScrolledAtRef = useRef(0);
  const headerRef   = useRef(null);
  const containerRef = useRef(null);

  const totalSec  = useMemo(() => {
    try { return totalDuration(timelineState) || 30; } catch { return 30; }
  }, [timelineState]);

  // Checkpoint value only -- timelineState.playhead is now updated at
  // discrete checkpoints (seek/play-start/pause/loop-wrap), not every
  // playback frame (see EditorV2's playback-engine effect). Anything here
  // that needs the true live position during playback must read
  // livePlayheadRef directly (see splitAtPlayhead) or use the
  // usePlayheadTicker hook in a small isolated leaf (see SequencerTimecode,
  // TrackAreaPlayheadLine below) rather than this variable, or the whole
  // ~1800-line component would re-render every frame again.
  const checkpointPlayhead = timelineState.playhead ?? 0;
  const selected  = timelineState.selected;
  const snapEnabled = timelineState.snap;

  // close color grade popover on outside click
  useEffect(() => {
    if (!colorGradeOpen) return;
    function onClickOutside(e) {
      const inButton  = colorGradeRef.current?.contains(e.target);
      const inPopover = colorGradePopoverRef.current?.contains(e.target);
      if (!inButton && !inPopover) setColorGradeOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [colorGradeOpen]);

  // ── BPM detection state ───────────────────────────────────────────────────
  const [beatBpm,     setBeatBpm]     = useState(null);
  const [bpmAnalysing, setBpmAnalysing] = useState(false);

  const snapTgts = useMemo(() => {
    const base = snapTargets(timelineState, selected);
    if (!beatBpm || !snapEnabled) return base;
    const interval = 60 / beatBpm;
    const grid = [];
    for (let t = 0; t <= totalSec + 4; t += interval) grid.push(t);
    return [...new Set([...base, ...grid])].sort((a, b) => a - b);
  }, [timelineState, selected, beatBpm, snapEnabled, totalSec]);

  // ── auto-scroll playhead into view ────────────────────────────────────────
  // Split into two effects rather than one keyed on a live-updating
  // `playhead` value, which would re-render this whole component every
  // playback frame. While paused/scrubbing, checkpointPlayhead already
  // updates immediately on every seek (those dispatches aren't throttled,
  // only continuous playback ticking is) so this effect is enough on its own.
  useEffect(() => {
    if (!scrollRef.current) return;
    if (Date.now() - manualScrolledAtRef.current < 1500) return;
    const el   = scrollRef.current;
    const phPx = checkpointPlayhead * zoom;
    const { scrollLeft: sl, clientWidth: cw } = el;
    if (phPx < sl + 20 || phPx > sl + cw - 20) {
      const next = Math.max(0, phPx - cw / 2);
      el.scrollLeft = next;
      setScrollLeft(next);
    }
  }, [checkpointPlayhead, zoom]);

  // While actively playing, auto-scroll continuously from the live ref via
  // its own rAF loop -- purely imperative (direct DOM scrollLeft write),
  // only calling setScrollLeft on the rare frame that actually crosses the
  // scroll threshold, so this does not re-render SequencerPanel every frame.
  useEffect(() => {
    if (!isPlaying) return;
    let rafId;
    function tick() {
      if (Date.now() - manualScrolledAtRef.current > 1500 && scrollRef.current) {
        const el = scrollRef.current;
        const phPx = livePlayheadRef.current * zoom;
        const { scrollLeft: sl, clientWidth: cw } = el;
        if (phPx < sl + 20 || phPx > sl + cw - 20) {
          const next = Math.max(0, phPx - cw / 2);
          el.scrollLeft = next;
          setScrollLeft(next);
        }
      }
      rafId = requestAnimationFrame(tick);
    }
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [isPlaying, zoom, livePlayheadRef]);

  const totalWidth = Math.max((totalSec + 10) * zoom, 800);

  // ── handle drop from VisualsPanel / media panel ────────────────────────────
  const handleDrop = useCallback((trackKey, startTime, media) => {
    const rawUrl = media.url || media.mediaUrl || media.src || media.video_files?.[0]?.link || media.videoUrl || '';
    const fullUrl = rawUrl.startsWith('http') ? rawUrl : rawUrl ? `https://onyx-reelz.com${rawUrl}` : '';
    const dur = media.duration || 5;
    const clip = makeClip({
      trackKey,
      startTime,
      duration:  dur,
      trimStart: 0,
      trimEnd:   dur,
      sourceDuration: dur,
      src:       fullUrl,
      url:       fullUrl,
      type:      media.type || (["voiceover","music","sfx"].includes(trackKey) ? "audio" : "video"),
      thumbnail: media.thumbnail || media.thumb || fullUrl || "",
      label:     media.label || media.name || "",
      volume:    100,
      elementType: media.elementType || null,
      content:   media.content || null,
      position:  media.position || "middle-center",
      size:      media.size || 80,
      opacity:   media.opacity || 100,
    });
    dispatch({ type: "ADD_CLIP", clip });

    // SFX dropped past the end of the last scene has nothing to attach to at
    // render time (buildV2RenderRequest only matches sfx clips that overlap a
    // scene's span) and would otherwise be silently excluded from the export.
    // Don't block the drop — just surface it immediately instead of letting
    // the user find out only after exporting.
    if (trackKey === "sfx") {
      const videoTrack = timelineState.tracks.find(t => t.key === "video");
      const videoEnd = (videoTrack?.clips || []).reduce((max, c) => {
        const end = (c.startTime || 0) + ((c.trimEnd || c.duration || 0) - (c.trimStart || 0));
        return Math.max(max, end);
      }, 0);
      if (startTime >= videoEnd) onSfxOutOfRange?.();
    }

    // If dropping onto video track, update the existing scene clip's mediaUrl instead of adding a new clip
    if (trackKey === 'video' && fullUrl) {
      const videoTrack = timelineState.tracks.find(t => t.key === 'video');
      const overlappingClip = videoTrack?.clips.find(c =>
        c.sceneId &&
        startTime >= c.startTime &&
        startTime < c.startTime + (c.trimEnd - c.trimStart)
      );
      if (overlappingClip?.sceneId) {
        const mediaType = /\.(mp4|webm|mov|m4v)(\?|$)/i.test(fullUrl) ? 'video' : 'image';
        updateScene?.(overlappingClip.sceneId, {
          mediaUrl: fullUrl,
          url: fullUrl,
          thumbnail: media.thumbnail || media.thumb || fullUrl,
          mediaType,
        });
        dispatch({ type: "UPDATE_CLIP", clipId: overlappingClip.id, changes: { src: fullUrl, thumbnail: fullUrl } });
      }
    }

    // Background BPM detection when a music clip is dropped
    if (trackKey === "music" && fullUrl) {
      setBeatBpm(null);
      setBpmAnalysing(true);
      (async () => {
        try {
          const headers = await getAuthHeaders();
          const form = new FormData();
          form.append("url", fullUrl);
          const res = await fetch("/api/music/fadr/analyse", { method: "POST", headers, body: form });
          const data = await res.json();
          if (res.ok && data.bpm) setBeatBpm(Math.round(data.bpm));
        } catch { /* silent — BPM snap is a bonus, not critical */ }
        finally { setBpmAnalysing(false); }
      })();
    }
  }, [dispatch, timelineState, updateScene, onSfxOutOfRange]);

  // ── scrub ─────────────────────────────────────────────────────────────────
  const handleScrub = useCallback((time) => {
    dispatch({ type: "SEEK", time: Math.max(0, time) });
    onSeek?.(time / Math.max(totalSec, 1));
  }, [dispatch, onSeek, totalSec]);

  // ── zoom wheel — native listener so preventDefault works on passive scroll ──
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    function handleWheel(e) {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        setZoom(z => clamp(z * (e.deltaY < 0 ? 1.15 : 0.87), MIN_ZOOM, MAX_ZOOM));
      } else {
        e.preventDefault();
        e.stopPropagation();
        if (scrollRef.current) {
          manualScrolledAtRef.current = Date.now();
          const nextX = Math.max(0, scrollRef.current.scrollLeft + e.deltaX);
          scrollRef.current.scrollLeft = nextX;
          setScrollLeft(nextX);
          const nextTop = Math.max(0, scrollRef.current.scrollTop + e.deltaY);
          scrollRef.current.scrollTop = nextTop;
          if (headerRef.current) headerRef.current.scrollTop = nextTop;
        }
      }
    }
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, []);

  // When height mode changes, reset scroll to top
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [seqSize]);

  function splitAtPlayhead() {
    if (!selected) return;
    // Read the live ref when playing -- checkpointPlayhead would be stale
    // (only synced at discrete checkpoints during active playback), and
    // splitting is a committed mutation, not just a visual display.
    const atTime = isPlaying ? livePlayheadRef.current : checkpointPlayhead;
    dispatch({ type: "SPLIT_CLIP", clipId: selected, atTime });
  }

  function deleteSelected() {
    if (!selected) return;
    dispatch({ type: "DELETE_CLIP", clipId: selected });
  }

  function toggleMuteSelected() {
    if (!selected) return;
    const clip = timelineState.tracks.flatMap(t => t.clips).find(c => c.id === selected);
    if (!clip) return;
    dispatch({ type: "UPDATE_CLIP", clipId: selected, changes: { muted: !clip.muted } });
  }

  function applySlowMo() {
    if (!loopEnabled || loopIn === null || loopOut === null || loopOut <= loopIn) return;
    dispatch({ type: "SLOW_MO_REGION", loopIn, loopOut });
  }

  const selectedClip = useMemo(() =>
    timelineState.tracks.flatMap(t => t.clips).find(c => c.id === selected) || null,
  [timelineState.tracks, selected]);

  const tracks = useMemo(() => {
    const base = TRACK_ORDER.map(key => timelineState.tracks.find(t => t.key === key)).filter(Boolean);
    const stems = timelineState.tracks.filter(t => t.key?.startsWith("stem-") || t.type === "stem");
    return [...base, ...stems];
  }, [timelineState.tracks]);

  return (
    <>
    <div
      ref={containerRef}
      style={{
        display: "flex", flexDirection: "column",
        background: "var(--panel-bg)",
        borderTop: "0.5px solid var(--onyx-hairline-strong)",
        userSelect: "none",
        height: SEQUENCER_HEIGHTS[seqSize],
        flexShrink: 0,
        overflow: "hidden",
        position: "relative",
        transition: "height 0.2s ease",
      }}
    >
      {/* ── top toolbar ──────────────────────────────────────────────────── */}
      <div style={{
        height: 36, flexShrink: 0, display: "flex", alignItems: "center",
        padding: "0 8px", gap: 4,
        borderBottom: isOpal ? "0.5px solid rgba(0,0,0,0.1)" : "0.5px solid rgba(255,255,255,0.08)",
        background: isOpal ? "rgba(240,248,255,0.9)" : "rgba(0,0,0,0.3)",
        color: isOpal ? "#06121b" : "inherit",
      }}>
        <TlBtn onClick={() => { document.activeElement?.blur(); onPlayPause(); }} title={isPlaying ? "Pause (Space)" : "Play (Space)"}>
          {isPlaying ? <PauseIcon/> : <PlayIcon/>}
        </TlBtn>

        <Div/>

        <TlBtn onClick={splitAtPlayhead} title="Split at playhead" disabled={!selected}>
          <ScissorsIcon/>
        </TlBtn>
        <TlBtn onClick={deleteSelected} title="Delete selected (Del)" disabled={!selected}>
          <TrashIcon/>
        </TlBtn>
        <TlBtn onClick={toggleMuteSelected} title="Mute selected" disabled={!selected}>
          <MuteIcon/>
        </TlBtn>
        <TlBtn onClick={() => selected && dispatch({ type:"DUPLICATE_CLIP", clipId:selected })}
          title="Duplicate clip (Cmd+D)" disabled={!selected}>
          ⧉
        </TlBtn>

        <Div/>

        <TlBtn
          onClick={() => dispatch({ type: "TOGGLE_SNAP" })}
          title="Magnetic snap (S)"
          active={snapEnabled}
        >
          <MagnetIcon/>
        </TlBtn>
        <TlBtn
          onClick={() => dispatch({ type: "SNAP_ALL_VO_TO_SCENES" })}
          title="Snap all voiceovers back to their scenes"
        >
          <span style={{ fontSize: 11 }}>🔗</span>
        </TlBtn>

        <Div/>

        <TlBtn
          onClick={() => onLoopEnabledChange?.(!loopEnabled)}
          title={loopEnabled ? "Loop: on — click to disable" : "Loop: off — drag ruler to set region, then enable"}
          active={loopEnabled}
        >
          <LoopIcon/>
        </TlBtn>
        {loopEnabled && loopOut !== null && loopOut > loopIn && (
          <span style={{ fontSize: 9, fontFamily: "monospace", color: "#4dd0ff",
            background: "rgba(77,208,255,0.1)", border: "0.5px solid rgba(77,208,255,0.3)",
            borderRadius: 4, padding: "1px 5px", letterSpacing: "0.02em" }}>
            {fmtTime(loopIn)}–{fmtTime(loopOut)}
          </span>
        )}
        <TlBtn
          onClick={applySlowMo}
          title="Slow Mo — split loop region and apply 0.5× speed"
          disabled={!(loopEnabled && loopIn !== null && loopOut !== null && loopOut > loopIn)}
        >
          <span style={{ fontSize: 10, letterSpacing: "-0.03em" }}>0.5×</span>
        </TlBtn>

        <Div/>

        <span style={{ fontSize: 9.5, color: isOpal ? "rgba(6,18,27,0.6)" : "var(--onyx-text-faint)", fontFamily: "monospace", minWidth: 36 }}>
          {Math.round(zoom)}px/s
        </span>
        <input type="range" min={MIN_ZOOM} max={MAX_ZOOM} step={5} value={zoom}
          onChange={e => setZoom(Number(e.target.value))}
          style={{ width: 72, accentColor: "var(--onyx-cyan)", cursor: "pointer" }}/>

        <div style={{ flex: 1 }}/>

        <SequencerTimecode
          livePlayheadRef={livePlayheadRef}
          isPlaying={isPlaying}
          checkpointPlayhead={checkpointPlayhead}
          totalSec={totalSec}
          isOpal={isOpal}
        />

        <Div/>

        {/* BPM indicator — shown after music clip drop + Fadr analysis */}
        {bpmAnalysing && (
          <span style={{ fontSize: 9.5, color: "rgba(167,139,250,0.6)", fontFamily: "monospace" }} title="Detecting BPM…">
            ♩ …
          </span>
        )}
        {beatBpm && !bpmAnalysing && (
          <span
            onClick={() => setBeatBpm(null)}
            title={`Beat grid: ${beatBpm} BPM — click to clear`}
            style={{ fontSize: 9.5, fontFamily: "monospace", color: "#a78bfa", background: "rgba(124,58,237,0.18)", border: "0.5px solid rgba(124,58,237,0.4)", borderRadius: 4, padding: "1px 6px", cursor: "pointer" }}>
            ♩ {beatBpm}
          </span>
        )}

        <Div/>

        {/* Ratio dropdown */}
        {ratio && onRatioChange && (
          <>
            <Div/>
            <select
              value={ratio}
              onChange={e => onRatioChange(e.target.value)}
              style={{
                background: "var(--chip-bg)", border: "0.5px solid var(--onyx-hairline-strong)",
                borderRadius: 5, padding: "3px 6px", fontSize: 10, color: "var(--onyx-text-dim)",
                cursor: "pointer", fontFamily: "inherit", outline: "none",
              }}
            >
              {Object.entries(RATIOS).map(([k, r]) => (
                <option key={k} value={k}>{r.icon} {r.label}</option>
              ))}
            </select>
          </>
        )}

        {/* Undo / Redo */}
        {onUndo && (
          <>
            <Div/>
            <button onClick={onUndo} title="Undo (Cmd+Z)" style={{ background: "var(--chip-bg)", border: "0.5px solid rgba(255,255,255,0.14)", borderRadius: 6, padding: "3px 8px", cursor: "pointer", color: "var(--onyx-text-dim)", fontSize: 11, fontFamily: "inherit" }}>↩</button>
            <button onClick={onRedo} title="Redo (Cmd+Shift+Z)" style={{ background: "var(--chip-bg)", border: "0.5px solid rgba(255,255,255,0.14)", borderRadius: 6, padding: "3px 8px", cursor: "pointer", color: "var(--onyx-text-dim)", fontSize: 11, fontFamily: "inherit" }}>↪</button>
          </>
        )}

        {/* Color grade */}
        {onUpdateActiveScene && (
          <>
            <Div/>
            <div ref={colorGradeRef}>
              <button
                onClick={() => {
                  if (!colorGradeOpen && colorGradeRef.current) {
                    const r = colorGradeRef.current.getBoundingClientRect();
                    setColorGradePos({ bottom: window.innerHeight - r.top + 6, right: window.innerWidth - r.right });
                  }
                  setColorGradeOpen(p => !p);
                }}
                title="Colour grade"
                style={{ background: colorGradeOpen ? "rgba(77,208,255,0.12)" : "var(--chip-bg)", border: `0.5px solid ${colorGradeOpen ? "rgba(77,208,255,0.4)" : "var(--onyx-hairline-strong)"}`, borderRadius: 6, padding: "3px 8px", cursor: "pointer", color: colorGradeOpen ? "#4dd0ff" : "var(--onyx-text-dim)", fontSize: 13, fontFamily: "inherit", display: "flex", alignItems: "center" }}
              >◑</button>
              {colorGradeOpen && colorGradePos && createPortal(
                <div ref={colorGradePopoverRef} style={{ position: "fixed", bottom: colorGradePos.bottom, right: colorGradePos.right, width: 200, background: "rgba(10,14,22,0.97)", border: "0.5px solid rgba(255,255,255,0.14)", borderRadius: 10, padding: "12px 14px", boxShadow: "0 8px 32px rgba(0,0,0,0.5)", zIndex: 9999 }}>
                  {[["Brightness","brightness"],["Contrast","contrast"],["Saturation","saturation"]].map(([label, key]) => {
                    const activeSceneObj = (scenes || []).find(s => s.id === activeScene);
                    const val = activeSceneObj?.[key] ?? 50;
                    return (
                      <div key={key} style={{ marginBottom: 10 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                          <span style={{ fontSize: 10, fontWeight: 600, color: "var(--onyx-text-faint)", textTransform: "uppercase", letterSpacing: "0.07em" }}>{label}</span>
                          <span style={{ fontSize: 10, color: "var(--onyx-text-faint)", fontFamily: "monospace" }}>{val}</span>
                        </div>
                        <div style={{ position: "relative", height: 4, background: "var(--chip-bg-strong)", borderRadius: 2 }}>
                          <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: val + "%", background: "linear-gradient(90deg,#1aa3d6,#4dd0ff)", borderRadius: 2 }}/>
                          <input type="range" min={0} max={100} value={val} onChange={e => onUpdateActiveScene({ [key]: Number(e.target.value) })} style={{ position: "absolute", inset: 0, width: "100%", opacity: 0, cursor: "pointer", height: "100%" }}/>
                          <div style={{ position: "absolute", left: val + "%", top: "50%", transform: "translate(-50%,-50%)", width: 10, height: 10, borderRadius: "50%", background: "var(--panel-bg)", boxShadow: "0 2px 6px rgba(0,0,0,0.35)", pointerEvents: "none" }}/>
                        </div>
                      </div>
                    );
                  })}
                  {updateScene && (() => {
                    const activeSceneObj = (scenes || []).find(s => s.id === activeScene);
                    const gradeVals = {
                      brightness: activeSceneObj?.brightness ?? 50,
                      contrast:   activeSceneObj?.contrast   ?? 50,
                      saturation: activeSceneObj?.saturation ?? 50,
                    };
                    return (
                      <button
                        onClick={() => (scenes || []).forEach(s => updateScene(s.id, gradeVals))}
                        style={{ width: "100%", marginTop: 4, padding: "5px 0", background: "rgba(77,208,255,0.08)", border: "0.5px solid rgba(77,208,255,0.25)", borderRadius: 6, cursor: "pointer", color: "rgba(77,208,255,0.8)", fontSize: 10, fontFamily: "inherit", letterSpacing: "0.05em" }}
                      >Apply to all scenes</button>
                    );
                  })()}
                </div>,
                document.body
              )}
            </div>
          </>
        )}

        {/* Captions toggle */}
        {onCaptionsToggle !== undefined && (
          <>
            <Div/>
            <button
              onClick={() => onCaptionsToggle?.()}
              title="Toggle captions preview"
              style={{ background: captionsVisible ? "rgba(77,208,255,0.12)" : "var(--chip-bg)", border: `0.5px solid ${captionsVisible ? "rgba(77,208,255,0.4)" : "var(--onyx-hairline-strong)"}`, borderRadius: 6, padding: "3px 8px", cursor: "pointer", color: captionsVisible ? "#4dd0ff" : "var(--onyx-text-faint)", fontSize: 11, fontWeight: 700, fontFamily: "inherit" }}
            >CC</button>
          </>
        )}

        {/* Safe zone overlay toggle — passive reference guide, no auto-enforcement */}
        {onSafeZoneToggle !== undefined && (
          <>
            <Div/>
            <button
              onClick={() => onSafeZoneToggle?.()}
              title="Toggle platform safe-zone overlay (approximate UI reference, not pixel-perfect)"
              style={{ background: safeZoneEnabled ? "rgba(255,80,80,0.12)" : "var(--chip-bg)", border: `0.5px solid ${safeZoneEnabled ? "rgba(255,80,80,0.4)" : "var(--onyx-hairline-strong)"}`, borderRadius: 6, padding: "3px 8px", cursor: "pointer", color: safeZoneEnabled ? "#ff6b6b" : "var(--onyx-text-faint)", fontSize: 11, fontWeight: 700, fontFamily: "inherit" }}
            >Safe Zone</button>
            {safeZoneEnabled && (
              <select
                value={safeZonePlatform}
                onChange={e => onSafeZonePlatformChange?.(e.target.value)}
                style={{ background: "var(--chip-bg)", border: "0.5px solid var(--onyx-hairline-strong)", borderRadius: 6, padding: "3px 6px", color: "var(--onyx-text-dim)", fontSize: 11, fontFamily: "inherit", cursor: "pointer" }}
              >
                {SAFE_ZONE_PLATFORMS.map(p => (
                  <option key={p} value={p}>{PLATFORM_SAFE_ZONES[p].label}</option>
                ))}
              </select>
            )}
          </>
        )}

        {/* Height controls */}
        {[
          { key: "mini",   label: "▁", title: "Collapse sequencer" },
          { key: "normal", label: "▄", title: "Normal view" },
          { key: "full",   label: "█", title: "Full view" },
        ].map(({ key, label, title }) => (
          <TlBtn key={key} onClick={() => setSeqSize(key)} active={seqSize === key} title={title}>
            <span style={{ fontSize: 11 }}>{label}</span>
          </TlBtn>
        ))}

        <HelpTooltip topic="sequencer" />

        {selectedClip && (
          <>
            <Div/>
            <span style={{ fontSize: 9.5, color: isOpal ? "rgba(6,18,27,0.6)" : "var(--onyx-text-faint)" }}>
              {selectedClip.label || "Clip"} · {(selectedClip.trimEnd - selectedClip.trimStart).toFixed(1)}s
            </span>
            <input type="range" min={0} max={100} step={1}
              value={selectedClip.volume ?? 100}
              onChange={e => dispatch({ type: "VOLUME_CLIP", clipId: selected, volume: Number(e.target.value) })}
              style={{ width: 56, accentColor: "var(--onyx-cyan)", cursor: "pointer" }}
              title="Clip volume"/>
            <span style={{ fontSize: 9, color: isOpal ? "rgba(6,18,27,0.6)" : "var(--onyx-text-faint)", fontFamily: "monospace", minWidth: 22 }}>
              {selectedClip.volume ?? 100}%
            </span>
            {/* Speed controls -- explicit "Speed" label + divider before the
                ramp-preset group added 2026-08-27 (UX audit finding: these
                read as loose unlabeled buttons crammed at the toolbar's
                edge, easy to miss entirely). */}
            <span style={{ fontSize: 9.5, color: isOpal ? "rgba(6,18,27,0.6)" : "var(--onyx-text-faint)", marginLeft: 8 }}>Speed</span>
            <div style={{ display:"flex", alignItems:"center", gap:4, marginLeft:4 }}>
              {[0.25, 0.5, 1, 1.5, 2].map(s => (
                <button key={s} onClick={() => dispatch({ type:"SPEED_CLIP", clipId:selectedClip.id, speed:s })}
                  style={{ padding:"2px 6px", fontSize:10, borderRadius:4, border:"none", cursor:"pointer",
                    background: (selectedClip.speed||1)===s ? "var(--onyx-cyan)" : "var(--chip-bg)",
                    color: (selectedClip.speed||1)===s ? "#06121b" : "var(--onyx-text-dim)" }}>
                  {s}x
                </button>
              ))}
            </div>
            {selectedClip.trackKey === "video" && (
              <>
              <Div/>
              <div style={{ display:"flex", alignItems:"center", gap:4 }}>
                {Object.entries(SPEED_RAMP_PRESETS).map(([key, preset]) => (
                  <button key={key}
                    onClick={() => dispatch({ type:"SPEED_RAMP_PRESET", clipId:selectedClip.id, preset:key })}
                    title={`${preset.label} -- splits this clip into ${preset.segments.length} segments at preset speeds`}
                    style={{ padding:"2px 6px", fontSize:10, borderRadius:4, border:"none", cursor:"pointer",
                      background: selectedClip.speedRampPreset===key ? "var(--onyx-cyan)" : "var(--chip-bg)",
                      color: selectedClip.speedRampPreset===key ? "#06121b" : "var(--onyx-text-dim)" }}>
                    {preset.label}
                  </button>
                ))}
              </div>
              </>
            )}
            {selectedClip.trackKey === "voiceover" && selectedClip.sceneId && (
              <TlBtn
                onClick={() => dispatch({ type: "SNAP_VO_TO_SCENE", clipId: selected })}
                title={`Snap voiceover to scene ${selectedClip.sceneId}`}
              >
                <span style={{ fontSize: 11 }}>🔗</span>
              </TlBtn>
            )}
          </>
        )}
      </div>

      {/* ── body: header col + scrollable area ──────────────────────────── */}
      <div style={{ flex: 1, display: "flex", minHeight: 0, overflow: "visible" }}>

        {/* Track header column — scrolls in sync with track area */}
        <div ref={headerRef} style={{
          width: HEADER_W, flexShrink: 0,
          borderRight: "0.5px solid rgba(255,255,255,0.08)",
          display: "flex", flexDirection: "column",
          overflowY: "scroll",  // allows scrollTop assignment; scrollbar hidden below
          scrollbarWidth: "none",
        }}>
          <div style={{ height: RULER_H, flexShrink: 0, borderBottom: "0.5px solid rgba(255,255,255,0.08)" }}/>

          {tracks.map(track => {
            const meta = trackMeta(track);
            const vol  = track.volume ?? 100;
            const muted = !!track.muted;
            return (
              <div key={track.key} style={{
                height: TRACK_H, flexShrink: 0, display: "flex", flexDirection: "column",
                justifyContent: "center",
                padding: "4px 6px 4px 8px", gap: 2,
                borderBottom: isOpal ? "0.5px solid rgba(0,0,0,0.08)" : "0.5px solid rgba(255,255,255,0.05)",
                background: isOpal ? "rgba(240,248,255,0.7)" : "rgba(0,0,0,0.2)",
              }}>
                {/* icon + label */}
                <div style={{ display: "flex", alignItems: "center", gap: 4, overflow: "hidden" }}>
                  <span style={{ display: "flex", opacity: 0.75, flexShrink: 0, color: isOpal ? "#06121b" : meta.color }}>{TRACK_ICON_SVG[track.key]}</span>
                  <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.06em",
                    textTransform: "uppercase", color: isOpal ? "#06121b" : meta.color, opacity: 0.9,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
                    {meta.label}
                  </span>
                </div>
                {/* mute + volume */}
                <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                  <button
                    onClick={e => { e.stopPropagation(); dispatch({ type: "TRACK_MUTE", trackKey: track.key }); }}
                    title={muted ? "Unmute track" : "Mute track"}
                    style={{
                      width: 18, height: 14, borderRadius: 3, border: "none", padding: 0,
                      background: muted ? "rgba(239,68,68,0.75)" : "var(--onyx-hairline)",
                      color: muted ? "#fff" : "var(--onyx-text-dim)",
                      cursor: "pointer", fontSize: 8, fontWeight: 700, flexShrink: 0,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}
                  >M</button>
                  <input
                    type="range" min={0} max={100} step={1}
                    value={vol}
                    onChange={e => dispatch({ type: "TRACK_VOLUME", trackKey: track.key, volume: Number(e.target.value) })}
                    title={`Track volume: ${vol}%`}
                    style={{ flex: 1, height: 3, cursor: "pointer", accentColor: meta.color, minWidth: 0 }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Scrollable tracks area */}
        <div
          ref={scrollRef}
          data-sequencer-scroll
          onScroll={e => {
            setScrollLeft(e.currentTarget.scrollLeft);
            if (headerRef.current && headerRef.current.scrollTop !== e.currentTarget.scrollTop)
              headerRef.current.scrollTop = e.currentTarget.scrollTop;
          }}
          onClick={e => {
            if (e.target === e.currentTarget || e.target.getAttribute('data-track-bg')) {
              dispatch({ type: "SELECT", clipId: null });
            }
          }}
          style={{
            flex: 1, overflowX: "auto", overflowY: "auto", position: "relative",
            scrollbarWidth: "thin",
            scrollbarColor: "rgba(255,255,255,0.1) transparent",
          }}
        >
          <div style={{ width: totalWidth, position: "relative", display: "flex", flexDirection: "column" }}>

            <Ruler
              zoom={zoom}
              scrollLeft={scrollLeft}
              totalSec={totalSec}
              onScrub={handleScrub}
              livePlayheadRef={livePlayheadRef}
              isPlaying={isPlaying}
              checkpointPlayhead={checkpointPlayhead}
              loopEnabled={!!loopEnabled}
              loopIn={loopIn ?? 0}
              loopOut={loopOut ?? null}
              onLoopChange={onLoopChange}
            />

            {tracks.map(track => (
              <TrackRow
                key={track.key}
                track={track}
                zoom={zoom}
                scrollLeft={scrollLeft}
                selected={selected}
                totalWidth={totalWidth}
                onSelect={id => dispatch({ type: "SELECT", clipId: id })}
                onScrub={handleScrub}
                onDrop={handleDrop}
                dispatch={dispatch}
                snapEnabled={snapEnabled}
                snapTgts={snapTgts}
                onDeleteScene={onDeleteScene}
                scenes={scenes}
                setCtxMenu={setCtxMenu}
                updateScene={updateScene}
                setActiveScene={setActiveScene}
              />
            ))}

            {/* Loop region overlay across all tracks */}
            {loopEnabled && loopOut !== null && loopOut > (loopIn ?? 0) && (
              <div style={{
                position: "absolute",
                left: (loopIn ?? 0) * zoom,
                width: (loopOut - (loopIn ?? 0)) * zoom,
                top: RULER_H, bottom: 0,
                background: "rgba(77,208,255,0.055)",
                borderLeft:  "1px solid rgba(77,208,255,0.35)",
                borderRight: "1px solid rgba(77,208,255,0.35)",
                pointerEvents: "none",
                zIndex: 2,
              }}/>
            )}

            {/* Playhead line across all tracks — isolated leaf, ticks at 60fps independently */}
            <TrackAreaPlayheadLine
              livePlayheadRef={livePlayheadRef}
              isPlaying={isPlaying}
              checkpointPlayhead={checkpointPlayhead}
              zoom={zoom}
            />

            {/* Drop hint overlay when empty */}
            {timelineState.tracks.every(t => t.clips.length === 0) && (
              <div style={{
                position: "absolute", inset: `${RULER_H}px 0 0 0`,
                display: "flex", alignItems: "center", justifyContent: "center",
                pointerEvents: "none",
              }}>
                <span style={{ fontSize: 11, color: "var(--onyx-text-mute)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                  Drag media here or generate scenes →
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>

    {ctxMenu && (
      <ClipContextMenu
        ctxMenu={ctxMenu}
        onClose={() => setCtxMenu(null)}
        dispatch={dispatch}
        updateScene={updateScene}
        onDeleteScene={onDeleteScene}
      />
    )}
    </>
  );
}
// Memoized: timelineState (and every other prop) now only gets a new
// reference at discrete checkpoints (seek/play-start/pause/loop-wrap), not
// every playback frame -- see EditorV2's playback-engine effect. Combined
// with TrackRow/Ruler also being memoized, this is what actually stops the
// ~1800-line render tree from re-running 60x/sec during playback.
export default memo(SequencerPanelBase);

// ─── micro icon components ────────────────────────────────────────────────────
function TlBtn({ onClick, title, disabled, active, children }) {
  return (
    <button onClick={onClick} title={title} disabled={disabled} style={{
      width: 26, height: 26, borderRadius: 6, border: "none",
      background: active ? "rgba(77,208,255,0.15)" : "transparent",
      color: disabled ? "var(--onyx-text-faint)" : active ? "#4dd0ff" : "var(--onyx-text-dim)",
      cursor: disabled ? "default" : "pointer",
      display: "flex", alignItems: "center", justifyContent: "center",
      transition: "background 0.1s, color 0.1s",
      flexShrink: 0,
    }}>
      {children}
    </button>
  );
}

function Div() {
  return <div style={{ width: 0.5, height: 16, background: "var(--onyx-hairline)", flexShrink: 0 }}/>;
}

function PlayIcon() {
  return <svg width={12} height={12} viewBox="0 0 24 24" fill="currentColor"><path d="M7 5l12 7-12 7V5z"/></svg>;
}
function PauseIcon() {
  return <svg width={12} height={12} viewBox="0 0 24 24" fill="currentColor">
    <rect x={6} y={5} width={4} height={14} rx={1}/>
    <rect x={14} y={5} width={4} height={14} rx={1}/>
  </svg>;
}
function ScissorsIcon() {
  return <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
    <circle cx={6} cy={6} r={3}/><circle cx={6} cy={18} r={3}/>
    <line x1={20} y1={4} x2={8.12} y2={15.88}/>
    <line x1={14.47} y1={14.48} x2={20} y2={20}/>
    <line x1={8.12} y1={8.12} x2={12} y2={12}/>
  </svg>;
}
function TrashIcon() {
  return <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
    <path d="M10 11v6M14 11v6M9 6V4h6v2"/>
  </svg>;
}
function MuteIcon() {
  return <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
    <line x1={23} y1={9} x2={17} y2={15}/><line x1={17} y1={9} x2={23} y2={15}/>
  </svg>;
}
function MagnetIcon() {
  return <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 15A6 6 0 0 0 18 15V4h-3v11a3 3 0 0 1-6 0V4H6v11z"/>
    <line x1={4} y1={4} x2={8} y2={4}/><line x1={16} y1={4} x2={20} y2={4}/>
  </svg>;
}
function LoopIcon() {
  return <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
    <polyline points="17 1 21 5 17 9"/>
    <path d="M3 11V9a4 4 0 014-4h14"/>
    <polyline points="7 23 3 19 7 15"/>
    <path d="M21 13v2a4 4 0 01-4 4H3"/>
  </svg>;
}
