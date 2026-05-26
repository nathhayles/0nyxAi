import React, { useRef, useState, useEffect, useCallback } from "react";

// ── helpers ──────────────────────────────────────────────────────────────────

function fmtTime(sec) {
  const s = Math.round(Number(sec) || 0);
  return s >= 60
    ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`
    : `${s}s`;
}

function isVideoUrl(u = "") {
  return /\.(mp4|webm|mov|m4v)(\?|#|$)/i.test(String(u));
}

const PANEL_HEIGHT = 220;        // total panel height
const VISUAL_TRACK_H = 72;       // scene cards row
const AUDIO_TRACK_H = 44;        // voiceover row
const MUSIC_TRACK_H = 36;        // global music bar
const RULER_H = 20;              // time ruler
const LEFT_LABEL_W = 64;         // track label column
const SCENE_MIN_W = 80;          // min px per scene card
const SCENE_MAX_W = 220;         // max px per scene card
const PX_PER_SEC = 60;           // pixels per second for audio blocks

// ── WaveformBar: simple animated bars ────────────────────────────────────────

function WaveformBar({ active = false, count = 18 }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 1, height: "100%", padding: "4px 6px" }}>
      {Array.from({ length: count }).map((_, i) => {
        const h = 20 + Math.sin(i * 1.3) * 14 + Math.cos(i * 0.8) * 8;
        return (
          <div key={i} style={{
            flex: 1,
            height: `${h}%`,
            minHeight: 3,
            borderRadius: 2,
            background: active
              ? `rgba(124,58,237,${0.5 + Math.sin(i) * 0.3})`
              : "rgba(255,255,255,0.12)",
            transition: "height 0.3s ease",
          }} />
        );
      })}
    </div>
  );
}

// ── Scrubber line ─────────────────────────────────────────────────────────────

function Scrubber({ position, totalW, onSeek }) {
  const ref = useRef(null);

  function handleDown(e) {
    e.preventDefault();
    seek(e.clientX);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  function onMove(e) { seek(e.clientX); }
  function onUp() {
    window.removeEventListener("mousemove", onMove);
    window.removeEventListener("mouseup", onUp);
  }

  function seek(clientX) {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    onSeek(pct);
  }

  return (
    <div ref={ref} style={{ position: "absolute", inset: 0, cursor: "crosshair" }} onMouseDown={handleDown}>
      <div style={{
        position: "absolute",
        left: `${position * 100}%`,
        top: 0, bottom: 0,
        width: 2,
        background: "#f43f5e",
        pointerEvents: "none",
        zIndex: 20,
      }}>
        <div style={{
          position: "absolute",
          top: -4,
          left: "50%",
          transform: "translateX(-50%)",
          width: 10, height: 10,
          borderRadius: "50%",
          background: "#f43f5e",
        }} />
      </div>
    </div>
  );
}

// ── Main TimelinePanel ────────────────────────────────────────────────────────

export default function TimelinePanel({
  scenes = [],
  activeScene,
  setActiveScene,
  globalMusicUrl = "",
  globalMusicName = "",
  musicVolume = 60,
  voiceoverVolume = 100,
  playbackProgress = 0,      // 0–1 across the whole reel
  totalDuration = 0,
  onSeek,
  isPlaying = false,
  onMoveScene,
}) {
  const [collapsed, setCollapsed] = useState(false);
  const scrollRef = useRef(null);

  // Compute scene widths proportionally
  const sceneDurations = scenes.map(s => Number(s.duration) || Number(s.trimEnd) || 3);
  const totalSec = sceneDurations.reduce((a, b) => a + b, 0) || 1;

  // Total track width (content area)
  const trackW = Math.max(
    sceneDurations.reduce((sum, d) => {
      const w = Math.max(SCENE_MIN_W, Math.min(SCENE_MAX_W, (d / totalSec) * 900));
      return sum + w;
    }, 0),
    600
  );

  // Scene widths array
  const sceneWidths = sceneDurations.map(d =>
    Math.max(SCENE_MIN_W, Math.min(SCENE_MAX_W, (d / totalSec) * trackW))
  );

  // Cumulative offsets for positioning
  const sceneOffsets = sceneWidths.reduce((acc, w, i) => {
    acc.push(i === 0 ? 0 : acc[i - 1] + sceneWidths[i - 1]);
    return acc;
  }, []);

  // Scroll active scene into view
  useEffect(() => {
    if (!activeScene || !scrollRef.current) return;
    const idx = scenes.findIndex(s => s.id === activeScene);
    if (idx < 0) return;
    const offset = sceneOffsets[idx];
    scrollRef.current.scrollLeft = Math.max(0, offset - 40);
  }, [activeScene]);

  const handleSeek = useCallback((pct) => {
    if (onSeek) onSeek(pct);
  }, [onSeek]);

  const panelH = collapsed ? 36 : PANEL_HEIGHT;

  return (
    <div style={{
      position: "fixed",
      bottom: 0,
      left: 392,
      right: 0,
      height: panelH,
      zIndex: 99,
      background: "#07090d",
      borderTop: "1px solid #1a2030",
      display: "flex",
      flexDirection: "column",
      transition: "height 0.2s ease",
      overflow: "hidden",
      userSelect: "none",
    }}>

      {/* ── Header bar ── */}
      <div style={{
        height: 36,
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        padding: "0 12px",
        borderBottom: collapsed ? "none" : "1px solid #1a2030",
        gap: 10,
      }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: "#475569", letterSpacing: "0.08em", textTransform: "uppercase" }}>
          Timeline
        </span>
        <span style={{ fontSize: 11, color: "#334155", marginLeft: 4 }}>
          {fmtTime(totalDuration || totalSec)}
        </span>
        <div style={{ flex: 1 }} />
        {!collapsed && (
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <span style={{ fontSize: 11, color: "#334155" }}>
              🎵 {globalMusicName || (globalMusicUrl ? "Music applied" : "No music")}
            </span>
          </div>
        )}
        <button
          onClick={() => setCollapsed(v => !v)}
          style={{ background: "none", border: "none", color: "#475569", cursor: "pointer", fontSize: 14, padding: "2px 6px", borderRadius: 4 }}
        >
          {collapsed ? "▲" : "▼"}
        </button>
      </div>

      {!collapsed && (
        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

          {/* ── Left labels column ── */}
          <div style={{
            width: LEFT_LABEL_W,
            flexShrink: 0,
            borderRight: "1px solid #1a2030",
            display: "flex",
            flexDirection: "column",
          }}>
            {/* Ruler label */}
            <div style={{ height: RULER_H, borderBottom: "1px solid #1a2030" }} />
            {/* Visual label */}
            <div style={{
              height: VISUAL_TRACK_H,
              display: "flex", alignItems: "center", justifyContent: "center",
              borderBottom: "1px solid #1a2030",
            }}>
              <span style={{ fontSize: 9, color: "#334155", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", writingMode: "vertical-rl", transform: "rotate(180deg)" }}>
                Video
              </span>
            </div>
            {/* Voiceover label */}
            <div style={{
              height: AUDIO_TRACK_H,
              display: "flex", alignItems: "center", justifyContent: "center",
              borderBottom: "1px solid #1a2030",
            }}>
              <span style={{ fontSize: 9, color: "#334155", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", writingMode: "vertical-rl", transform: "rotate(180deg)" }}>
                Voice
              </span>
            </div>
            {/* Music label */}
            <div style={{
              height: MUSIC_TRACK_H,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <span style={{ fontSize: 9, color: "#334155", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", writingMode: "vertical-rl", transform: "rotate(180deg)" }}>
                Music
              </span>
            </div>
          </div>

          {/* ── Scrollable track area ── */}
          <div
            ref={scrollRef}
            style={{
              flex: 1,
              overflowX: "auto",
              overflowY: "hidden",
              position: "relative",
              scrollbarWidth: "thin",
              scrollbarColor: "#1e2a3a transparent",
            }}
          >
            <div style={{ width: trackW, position: "relative", height: "100%" }}>

              {/* Scrubber overlay */}
              <Scrubber
                position={playbackProgress}
                totalW={trackW}
                onSeek={handleSeek}
              />

              {/* ── Time ruler ── */}
              <div style={{
                height: RULER_H,
                position: "relative",
                borderBottom: "1px solid #1a2030",
                display: "flex",
                alignItems: "center",
              }}>
                {sceneOffsets.map((offset, i) => (
                  <div key={i} style={{
                    position: "absolute",
                    left: offset,
                    width: sceneWidths[i],
                    height: "100%",
                    display: "flex",
                    alignItems: "center",
                    paddingLeft: 6,
                    borderRight: "1px solid #1a2030",
                  }}>
                    <span style={{ fontSize: 9, color: "#334155" }}>
                      {fmtTime(sceneOffsets[i] / trackW * totalSec)}
                    </span>
                  </div>
                ))}
              </div>

              {/* ── Visual track (scene cards) ── */}
              <div style={{
                height: VISUAL_TRACK_H,
                position: "relative",
                borderBottom: "1px solid #1a2030",
                display: "flex",
              }}>
                {scenes.map((sc, i) => {
                  const isActive = sc.id === activeScene;
                  const thumb = sc.thumbnail || sc.stockThumb || sc.mediaUrl || sc.url || "";
                  const hasVO = !!(sc.voiceoverUrl || sc.voiceover);
                  const isVid = isVideoUrl(thumb);

                  return (
                    <div
                      key={sc.id}
                      draggable
                      onDragStart={e => { e.stopPropagation(); e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", String(sc.id)); }}
                      onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; }}
                      onDrop={e => { e.preventDefault(); const fromId = e.dataTransfer.getData("text/plain"); if (fromId !== String(sc.id)) onMoveScene?.(fromId, sc.id); }}
                      onClick={() => setActiveScene?.(sc.id)}
                      style={{
                        position: "absolute",
                        left: sceneOffsets[i],
                        width: sceneWidths[i] - 2,
                        height: "100%",
                        cursor: "grab",
                        background: isActive
                          ? "rgba(124,58,237,0.15)"
                          : "rgba(255,255,255,0.02)",
                        border: isActive
                          ? "1px solid rgba(124,58,237,0.6)"
                          : "1px solid #1a2030",
                        borderRadius: 4,
                        overflow: "hidden",
                        display: "flex",
                        flexDirection: "column",
                        transition: "border-color 0.15s",
                      }}
                    >
                      {/* Thumbnail */}
                      {thumb ? (
                        <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>
                          {isVid ? (
                            <video
                              src={thumb}
                              style={{ width: "100%", height: "100%", objectFit: "cover" }}
                              muted
                              playsInline
                            />
                          ) : (
                            <img
                              src={thumb}
                              alt=""
                              style={{ width: "100%", height: "100%", objectFit: "cover" }}
                            />
                          )}
                          <div style={{
                            position: "absolute", inset: 0,
                            background: isActive
                              ? "rgba(124,58,237,0.2)"
                              : "rgba(0,0,0,0.2)",
                          }} />
                        </div>
                      ) : (
                        <div style={{
                          flex: 1,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          color: "#1e2a3a", fontSize: 11,
                        }}>
                          No media
                        </div>
                      )}

                      {/* Scene label */}
                      <div style={{
                        height: 18,
                        flexShrink: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "0 5px",
                        background: "rgba(0,0,0,0.5)",
                        fontSize: 9,
                        color: isActive ? "#c4b5fd" : "#475569",
                      }}>
                        <span>S{i + 1}</span>
                        <span style={{ display: "flex", gap: 3 }}>
                          {hasVO && <span style={{ color: "#22c55e" }}>●</span>}
                          {sc.musicUrl && <span style={{ color: "#3b82f6" }}>●</span>}
                          {sc.aiGenerated && <span style={{ color: "#f59e0b" }}>●</span>}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* ── Voiceover track ── */}
              <div style={{
                height: AUDIO_TRACK_H,
                position: "relative",
                borderBottom: "1px solid #1a2030",
              }}>
                {scenes.map((sc, i) => {
                  const hasVO = !!(sc.voiceoverUrl || sc.voiceover);
                  if (!hasVO) return null;
                  return (
                    <div
                      key={sc.id}
                      style={{
                        position: "absolute",
                        left: sceneOffsets[i] + 1,
                        width: sceneWidths[i] - 4,
                        top: 4, bottom: 4,
                        background: "rgba(34,197,94,0.12)",
                        border: "1px solid rgba(34,197,94,0.3)",
                        borderRadius: 4,
                        overflow: "hidden",
                      }}
                    >
                      <WaveformBar active={sc.id === activeScene} count={Math.max(6, Math.floor(sceneWidths[i] / 8))} />
                    </div>
                  );
                })}
              </div>

              {/* ── Global music track ── */}
              <div style={{
                height: MUSIC_TRACK_H,
                position: "relative",
              }}>
                {globalMusicUrl && (
                  <div style={{
                    position: "absolute",
                    left: 0,
                    right: 0,
                    top: 4, bottom: 4,
                    background: "rgba(124,58,237,0.1)",
                    border: "1px solid rgba(124,58,237,0.25)",
                    borderRadius: 4,
                    overflow: "hidden",
                    display: "flex",
                    alignItems: "center",
                    paddingLeft: 8,
                    gap: 6,
                  }}>
                    <WaveformBar active={isPlaying} count={Math.max(12, Math.floor(trackW / 12))} />
                    <span style={{
                      position: "absolute",
                      left: 8,
                      fontSize: 10,
                      color: "#7c3aed",
                      fontWeight: 600,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      maxWidth: "80%",
                      pointerEvents: "none",
                    }}>
                      🎵 {globalMusicName || "Music"}
                    </span>
                  </div>
                )}
                {!globalMusicUrl && (
                  <div style={{
                    position: "absolute",
                    left: 0, right: 0, top: 4, bottom: 4,
                    border: "1px dashed #1a2030",
                    borderRadius: 4,
                    display: "flex",
                    alignItems: "center",
                    paddingLeft: 10,
                  }}>
                    <span style={{ fontSize: 10, color: "#1e2a3a" }}>No music — add from Music Studio or Audio panel</span>
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
