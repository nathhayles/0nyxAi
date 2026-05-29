// SequencerPanel.jsx — V2 NLE Sequencer
// 6-track timeline wired to timelineReducer. DO NOT use in Editor.jsx (V1).
// Handles: clip rendering, playhead scrub, zoom, drag-drop from media panel,
//          trim handles, clip selection, split at playhead, mute/solo.

import React, {
  useRef, useState, useCallback, useEffect, useMemo, useLayoutEffect,
} from "react";
import HelpTooltip from "./HelpTooltip.jsx";
import { getAuthHeaders } from "../utils/auth.js";
import {
  TRACK_TYPES, makeClip, totalDuration, snapTargets, nearestSnap,
} from "../reducers/timelineReducer.js";

// ─── constants ────────────────────────────────────────────────────────────────
const TRACK_H       = 48;   // px per track row
const HEADER_W      = 72;   // px for track label column
const RULER_H       = 28;   // px for time ruler
const MIN_ZOOM      = 20;   // px per second (zoomed out)
const MAX_ZOOM      = 400;  // px per second (zoomed in)
const DEFAULT_ZOOM  = 80;
const SNAP_PX       = 8;    // snap threshold in pixels

const TRACK_ORDER = ["video", "broll", "fx", "voiceover", "music", "sfx"];

const TRACK_META = {
  video:     { label: "Video",  color: "#7c3aed", dimColor: "rgba(124,58,237,0.18)", icon: "▶" },
  broll:     { label: "B-Roll", color: "#3b82f6", dimColor: "rgba(59,130,246,0.18)", icon: "◈" },
  fx:        { label: "FX",     color: "#ec4899", dimColor: "rgba(236,72,153,0.18)", icon: "✦" },
  voiceover: { label: "Voice",  color: "#22c55e", dimColor: "rgba(34,197,94,0.18)",  icon: "♪" },
  music:     { label: "Music",  color: "#8b5cf6", dimColor: "rgba(139,92,246,0.18)", icon: "♫" },
  sfx:       { label: "SFX",    color: "#f59e0b", dimColor: "rgba(245,158,11,0.18)", icon: "◉" },
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

// ─── Ruler ────────────────────────────────────────────────────────────────────
function Ruler({ zoom, scrollLeft, totalSec, onScrub, playhead }) {
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

  function handleClick(e) {
    if (!ref.current) return;
    // Use the scroll container's left edge (stable) + scrollLeft for canvas-relative x
    const containerRect = ref.current.closest('[data-sequencer-scroll]')?.getBoundingClientRect()
      ?? ref.current.getBoundingClientRect();
    const x = e.clientX - containerRect.left + scrollLeft;
    onScrub(Math.max(0, x / zoom));
  }

  const playheadPx = playhead * zoom;

  return (
    <div ref={ref} onClick={handleClick} style={{
      position: "relative", height: RULER_H, overflow: "hidden", cursor: "pointer",
      borderBottom: "0.5px solid rgba(255,255,255,0.08)", userSelect: "none", flexShrink: 0,
      background: "rgba(0,0,0,0.25)",
    }}>
      <svg width="100%" height={RULER_H} style={{ display: "block", overflow: "visible" }}>
        {ticks.map(({ t, x, major, label }) => (
          <g key={t} transform={`translate(${x},0)`}>
            <line x1={0} y1={major ? 0 : RULER_H * 0.5} x2={0} y2={RULER_H}
              stroke="rgba(255,255,255,0.15)" strokeWidth={major ? 0.5 : 0.5}/>
            {major && (
              <text x={3} y={RULER_H - 8} fill="rgba(255,255,255,0.3)"
                fontSize={9} fontFamily="monospace">{label}</text>
            )}
          </g>
        ))}
      </svg>
      {/* Playhead needle on ruler */}
      {playheadPx >= 0 && (
        <div style={{
          position: "absolute", top: 0, left: playheadPx, bottom: 0,
          width: 1, background: "#4dd0ff", pointerEvents: "none",
        }}>
          <div style={{
            position: "absolute", top: 0, left: -4, width: 9, height: 9,
            background: "#4dd0ff", clipPath: "polygon(50% 0%,100% 100%,0% 100%)",
          }}/>
        </div>
      )}
    </div>
  );
}

// ─── Clip block ───────────────────────────────────────────────────────────────
function ClipBlock({ clip, zoom, selected, onSelect, onTrimStart, onTrimEnd, onDragMove,
                     trackColor, trackDimColor, timelineRef }) {
  const x     = clip.startTime * zoom;
  const w     = Math.max(4, (clip.trimEnd - clip.trimStart) * zoom);
  const isAudio = clip.type === "audio";

  function onMouseDownBody(e) {
    if (e.target.dataset.trim) return;
    e.stopPropagation();
    onSelect(clip.id);
    onDragMove(e, clip);
  }

  return (
    <div
      onMouseDown={onMouseDownBody}
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
    </div>
  );
}

// ─── Track row ────────────────────────────────────────────────────────────────
function TrackRow({ track, zoom, scrollLeft, selected, totalWidth, onSelect,
                    onScrub, onDrop, dispatch, snapEnabled, snapTgts }) {
  const meta = TRACK_META[track.key] || TRACK_META.video;
  const trackRef = useRef(null);

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
  function onDragOver(e) { e.preventDefault(); e.dataTransfer.dropEffect = "copy"; }

  function handleDrop(e) {
    e.preventDefault();
    if (!trackRef.current) return;
    const raw = e.dataTransfer.getData("application/onyx-media");
    console.log("[sequencer] raw drop data:", raw?.slice(0, 200));
    if (!raw) return;
    try {
      const media = JSON.parse(raw);
      const rect  = trackRef.current.getBoundingClientRect();
      const x     = e.clientX - rect.left + scrollLeft;
      const time  = Math.max(0, x / zoom);
      onDrop(track.key, time, media);
    } catch (err) { console.error("[sequencer] drop parse error:", err); }
  }

  // ── click on empty track area to seek ─────────────────────────────────────
  function onTrackClick(e) {
    if (e.target !== trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const x    = e.clientX - rect.left + scrollLeft;
    onScrub(Math.max(0, x / zoom));
  }

  return (
    <div ref={trackRef}
      onClick={onTrackClick}
      onDragOver={onDragOver}
      onDrop={handleDrop}
      style={{
        position: "relative", height: TRACK_H, flexShrink: 0,
        width: totalWidth, minWidth: "100%",
        borderBottom: "0.5px solid rgba(255,255,255,0.05)",
        background: "rgba(0,0,0,0.15)",
      }}
    >
      {/* Track tint stripe */}
      <div style={{
        position: "absolute", left: 0, top: 0, bottom: 0, width: 2,
        background: meta.color, opacity: 0.5,
      }}/>

      {track.clips.map(clip => (
        <ClipBlock
          key={clip.id}
          clip={clip}
          zoom={zoom}
          selected={clip.id === selected}
          trackColor={meta.color}
          trackDimColor={meta.dimColor}
          onSelect={id => dispatch({ type: "SELECT", clipId: id })}
          onTrimStart={onTrimStart}
          onTrimEnd={onTrimEnd}
          onDragMove={onDragMove}
        />
      ))}
    </div>
  );
}

// ─── Main SequencerPanel ──────────────────────────────────────────────────────
const SEQUENCER_HEIGHTS = {
  mini:   36,   // toolbar only — collapsed
  normal: 220,  // ~4 tracks visible, scrollable
  full:   420,  // all tracks + breathing room
};

export default function SequencerPanel({
  timelineState, dispatch,
  isPlaying, onPlayPause,
  scenes, activeScene, setActiveScene,
  updateScene,
  globalMusicUrl, globalMusicName,
  musicVolume, voiceoverVolume,
  totalDuration: totalDurationProp,
  onSeek,
}) {
  const [zoom, setZoom]           = useState(DEFAULT_ZOOM);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [seqSize, setSeqSize]       = useState("normal"); // 'mini' | 'normal' | 'full'
  const scrollRef   = useRef(null);
  const headerRef   = useRef(null);
  const containerRef = useRef(null);

  const totalSec  = useMemo(() => {
    try { return totalDuration(timelineState) || 30; } catch { return 30; }
  }, [timelineState]);

  const playhead  = timelineState.playhead ?? 0;
  const selected  = timelineState.selected;
  const snapEnabled = timelineState.snap;

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
  useEffect(() => {
    if (!scrollRef.current) return;
    const el   = scrollRef.current;
    const phPx = playhead * zoom;
    const { scrollLeft: sl, clientWidth: cw } = el;
    if (phPx < sl + 20 || phPx > sl + cw - 20) {
      const next = Math.max(0, phPx - cw / 2);
      el.scrollLeft = next;
      setScrollLeft(next);
    }
  }, [playhead, zoom]);

  const totalWidth = Math.max((totalSec + 10) * zoom, 800);

  // ── handle drop from VisualsPanel / media panel ────────────────────────────
  const handleDrop = useCallback((trackKey, startTime, media) => {
    console.log("[sequencer] drop media keys:", Object.keys(media), "url:", media.url, "mediaUrl:", media.mediaUrl, "src:", media.src);
    const dur = media.duration || 5;
    const clip = makeClip({
      trackKey,
      startTime,
      duration:  dur,
      trimStart: 0,
      trimEnd:   dur,
      src:       media.url || media.mediaUrl || "",
      type:      media.type || (["voiceover","music","sfx"].includes(trackKey) ? "audio" : "video"),
      thumbnail: media.thumbnail || "",
      label:     media.label || media.name || "",
      volume:    100,
    });
    dispatch({ type: "ADD_CLIP", clip });

    // Background BPM detection when a music clip is dropped
    const src = media.url || media.mediaUrl;
    if (trackKey === "music" && src) {
      setBeatBpm(null);
      setBpmAnalysing(true);
      (async () => {
        try {
          const headers = await getAuthHeaders();
          const form = new FormData();
          form.append("url", src);
          const res = await fetch("/api/music/fadr/analyse", { method: "POST", headers, body: form });
          const data = await res.json();
          if (res.ok && data.bpm) setBeatBpm(Math.round(data.bpm));
        } catch { /* silent — BPM snap is a bonus, not critical */ }
        finally { setBpmAnalysing(false); }
      })();
    }
  }, [dispatch]);

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
        if (scrollRef.current) {
          const next = Math.max(0, scrollRef.current.scrollLeft + e.deltaX + e.deltaY * 0.5);
          scrollRef.current.scrollLeft = next;
          setScrollLeft(next);
        }
      }
    }
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, []);

  const playheadPx = playhead * zoom - scrollLeft;

  function splitAtPlayhead() {
    if (!selected) return;
    dispatch({ type: "SPLIT_CLIP", clipId: selected, atTime: playhead });
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

  const selectedClip = useMemo(() =>
    timelineState.tracks.flatMap(t => t.clips).find(c => c.id === selected) || null,
  [timelineState.tracks, selected]);

  const tracks = useMemo(() =>
    TRACK_ORDER.map(key => timelineState.tracks.find(t => t.key === key)).filter(Boolean),
  [timelineState.tracks]);

  return (
    <div
      ref={containerRef}
      style={{
        display: "flex", flexDirection: "column",
        background: "#080c14",
        borderTop: "0.5px solid rgba(255,255,255,0.1)",
        userSelect: "none",
        height: SEQUENCER_HEIGHTS[seqSize],
        flexShrink: 0,
        position: "relative",
        transition: "height 0.2s ease",
      }}
    >
      {/* ── top toolbar ──────────────────────────────────────────────────── */}
      <div style={{
        height: 36, flexShrink: 0, display: "flex", alignItems: "center",
        padding: "0 8px", gap: 4,
        borderBottom: "0.5px solid rgba(255,255,255,0.08)",
        background: "rgba(0,0,0,0.3)",
      }}>
        <TlBtn onClick={onPlayPause} title={isPlaying ? "Pause (Space)" : "Play (Space)"}>
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

        <Div/>

        <TlBtn
          onClick={() => dispatch({ type: "TOGGLE_SNAP" })}
          title="Magnetic snap (S)"
          active={snapEnabled}
        >
          <MagnetIcon/>
        </TlBtn>

        <Div/>

        <span style={{ fontSize: 9.5, color: "rgba(255,255,255,0.3)", fontFamily: "monospace", minWidth: 36 }}>
          {Math.round(zoom)}px/s
        </span>
        <input type="range" min={MIN_ZOOM} max={MAX_ZOOM} step={5} value={zoom}
          onChange={e => setZoom(Number(e.target.value))}
          style={{ width: 72, accentColor: "#4dd0ff", cursor: "pointer" }}/>

        <div style={{ flex: 1 }}/>

        <span style={{ fontSize: 10.5, fontFamily: "monospace", color: "#4dd0ff", letterSpacing: "0.04em" }}>
          {fmtTime(playhead)} / {fmtTime(totalSec)}
        </span>

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
            <span style={{ fontSize: 9.5, color: "rgba(255,255,255,0.4)" }}>
              {selectedClip.label || "Clip"} · {(selectedClip.trimEnd - selectedClip.trimStart).toFixed(1)}s
            </span>
            <input type="range" min={0} max={100} step={1}
              value={selectedClip.volume ?? 100}
              onChange={e => dispatch({ type: "VOLUME_CLIP", clipId: selected, volume: Number(e.target.value) })}
              style={{ width: 56, accentColor: "#4dd0ff", cursor: "pointer" }}
              title="Clip volume"/>
            <span style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", fontFamily: "monospace", minWidth: 22 }}>
              {selectedClip.volume ?? 100}%
            </span>
          </>
        )}
      </div>

      {/* ── body: header col + scrollable area ──────────────────────────── */}
      <div style={{ flex: 1, display: "flex", minHeight: 0, overflow: "hidden" }}>

        {/* Track header column — scrolls in sync with track area */}
        <div ref={headerRef} style={{
          width: HEADER_W, flexShrink: 0,
          borderRight: "0.5px solid rgba(255,255,255,0.08)",
          display: "flex", flexDirection: "column",
          overflowY: "hidden",  // driven by JS sync, not user scroll
        }}>
          <div style={{ height: RULER_H, flexShrink: 0, borderBottom: "0.5px solid rgba(255,255,255,0.08)" }}/>

          {tracks.map(track => {
            const meta = TRACK_META[track.key] || TRACK_META.video;
            return (
              <div key={track.key} style={{
                height: TRACK_H, flexShrink: 0, display: "flex", alignItems: "center",
                padding: "0 8px 0 10px", gap: 6,
                borderBottom: "0.5px solid rgba(255,255,255,0.05)",
                background: "rgba(0,0,0,0.2)",
              }}>
                <span style={{ fontSize: 13, opacity: 0.6 }}>{meta.icon}</span>
                <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.06em",
                  textTransform: "uppercase", color: meta.color, opacity: 0.9,
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>
                  {meta.label}
                </span>
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
            if (headerRef.current) headerRef.current.scrollTop = e.currentTarget.scrollTop;
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
              playhead={playhead}
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
              />
            ))}

            {/* Playhead line across all tracks */}
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

            {/* Drop hint overlay when empty */}
            {timelineState.tracks.every(t => t.clips.length === 0) && (
              <div style={{
                position: "absolute", inset: `${RULER_H}px 0 0 0`,
                display: "flex", alignItems: "center", justifyContent: "center",
                pointerEvents: "none",
              }}>
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.15)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                  Drag media here or generate scenes →
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── micro icon components ────────────────────────────────────────────────────
function TlBtn({ onClick, title, disabled, active, children }) {
  return (
    <button onClick={onClick} title={title} disabled={disabled} style={{
      width: 26, height: 26, borderRadius: 6, border: "none",
      background: active ? "rgba(77,208,255,0.15)" : "transparent",
      color: disabled ? "rgba(255,255,255,0.2)" : active ? "#4dd0ff" : "rgba(255,255,255,0.55)",
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
  return <div style={{ width: 0.5, height: 16, background: "rgba(255,255,255,0.1)", flexShrink: 0 }}/>;
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
