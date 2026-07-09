import React, { useRef } from "react";

const TRANSITIONS = [
  { value: "cut",   label: "Cut" },
  { value: "fade",  label: "Fade" },
  { value: "slide", label: "Slide" },
  { value: "zoom",  label: "Zoom" },
];

function isVideoUrl(u = "") {
  return /\.(mp4|webm|mov|m4v)(\?|#|$)/i.test(String(u));
}

function formatDuration(s) {
  if (!s) return "";
  const sec = Math.round(Number(s));
  return sec >= 60 ? `${Math.floor(sec/60)}:${String(sec%60).padStart(2,"0")}` : `${sec}s`;
}

export default function SceneStrip({
  scenes,
  activeScene,
  setActiveScene,
  onDuplicate,
  onDelete,
  onTransitionChange,
  onMoveScene,
}) {
  const dragId = useRef(null);

  return (
    <div style={{
      position: "fixed", bottom: 0, left: 392, right: 0, height: 130,
      zIndex: 100, background: "#0a0c10",
      borderTop: "1px solid #1f2937",
      display: "flex", alignItems: "center",
      overflowX: "auto", overflowY: "hidden",
      padding: "0 12px", gap: 0,
      scrollbarWidth: "thin",
      scrollbarColor: "#2b3442 transparent",
    }}>
      {scenes.map((sc, idx) => {
        const src    = sc.thumbnail || sc.mediaUrl || "";
        const isVid  = isVideoUrl(sc.mediaUrl || sc.thumbnail || "");
        const isActive = sc.id === activeScene;
        const hasVO  = !!(sc.voiceoverUrl || sc.voiceover);
        const hasMusic = !!sc.musicUrl;

        return (
          <React.Fragment key={sc.id}>
            {/* Scene card */}
            <div
              draggable
              onDragStart={e => { dragId.current = sc.id; e.dataTransfer.effectAllowed = "move"; }}
              onDragOver={e => e.preventDefault()}
              onDrop={e => {
                e.preventDefault();
                if (dragId.current && dragId.current !== sc.id && onMoveScene)
                  onMoveScene(dragId.current, sc.id);
                dragId.current = null;
              }}
              onClick={() => setActiveScene(sc.id)}
              style={{
                flexShrink: 0,
                width: 100,
                height: 106,
                borderRadius: 8,
                overflow: "hidden",
                cursor: "pointer",
                position: "relative",
                border: isActive ? "2px solid #7c3aed" : "2px solid #1f2937",
                background: "#111827",
                transition: "border 0.15s",
                userSelect: "none",
              }}
            >
              {/* Thumbnail */}
              <div style={{ width: "100%", height: 66, background: "#0f172a", position: "relative", overflow: "hidden" }}>
                {src ? (
                  isVid ? (
                    <video key={src} src={sc.mediaUrl || src} muted playsInline preload="metadata"
                      style={{ width:"100%", height:"100%", objectFit:"cover" }}
                      onLoadedMetadata={e => { try { e.currentTarget.currentTime = 0.1; } catch(_){} }} />
                  ) : (
                    <img src={src} alt={`Scene ${idx+1}`} style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                  )
                ) : (
                  <div style={{ width:"100%", height:"100%", display:"flex", alignItems:"center", justifyContent:"center" }}>
                    <div style={{ fontSize:9, color:"#475569", textAlign:"center", padding:"0 6px", lineHeight:1.3 }}>
                      {(sc.narration||sc.action||"").slice(0,40) || "No media"}
                    </div>
                  </div>
                )}

                {/* Scene number badge */}
                <div style={{ position:"absolute", top:4, left:4, background:"rgba(0,0,0,0.7)", color:"#fff", fontSize:9, fontWeight:700, padding:"2px 5px", borderRadius:4, backdropFilter:"blur(4px)" }}>
                  {idx+1}
                </div>

                {/* Duration badge */}
                {sc.duration > 0 && (
                  <div style={{ position:"absolute", bottom:4, right:4, background:"rgba(0,0,0,0.7)", color:"#94a3b8", fontSize:9, padding:"2px 5px", borderRadius:4 }}>
                    {formatDuration(sc.duration)}
                  </div>
                )}

                {/* Indicators */}
                <div style={{ position:"absolute", top:4, right:4, display:"flex", flexDirection:"column", gap:2 }}>
                  {hasVO    && <div style={{ width:6, height:6, borderRadius:"50%", background:"#22c55e" }} title="Has voiceover" />}
                  {hasMusic && <div style={{ width:6, height:6, borderRadius:"50%", background:"var(--onyx-cyan)" }} title="Has music" />}
                  {sc.isAiGenerated && <div style={{ width:6, height:6, borderRadius:"50%", background:"#f59e0b" }} title="AI generated" />}
                </div>
              </div>

              {/* Bottom bar */}
              <div style={{ padding:"4px 5px", display:"flex", alignItems:"center", justifyContent:"space-between", gap:2 }}>
                <div style={{ fontSize:9, color: isActive ? "#a78bfa" : "#475569", fontWeight:700, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", flex:1 }}>
                  {sc.narration?.slice(0,18) || sc.action?.slice(0,18) || `Scene ${idx+1}`}
                </div>
                <div style={{ display:"flex", gap:2, flexShrink:0 }}>
                  <button
                    onClick={e => { e.stopPropagation(); onDuplicate(sc.id); }}
                    style={{ fontSize:9, padding:"2px 5px", borderRadius:3, border:"1px solid #2b3442", background:"#1f2937", color:"#64748b", cursor:"pointer" }}
                    title="Duplicate"
                  >⧉</button>
                  <button
                    onClick={e => { e.stopPropagation(); onDelete(sc.id); }}
                    style={{ fontSize:9, padding:"2px 5px", borderRadius:3, border:"1px solid rgba(239,68,68,0.3)", background:"rgba(239,68,68,0.1)", color:"#f87171", cursor:"pointer" }}
                    title="Delete"
                  >✕</button>
                </div>
              </div>

              {/* Active glow */}
              {isActive && (
                <div style={{ position:"absolute", inset:0, borderRadius:6, boxShadow:"inset 0 0 0 2px rgba(124,58,237,0.5)", pointerEvents:"none" }} />
              )}
            </div>

            {/* Transition connector */}
            {idx < scenes.length - 1 && (
              <div style={{ flexShrink:0, display:"flex", flexDirection:"column", alignItems:"center", padding:"0 4px", gap:3 }}>
                <div style={{ width:1, height:16, background:"#1f2937" }} />
                <select
                  value={sc.transitionToNext || "cut"}
                  onChange={e => onTransitionChange(sc.id, e.target.value)}
                  onClick={e => e.stopPropagation()}
                  style={{ fontSize:8, background:"#111827", color:"#475569", border:"1px solid #2b3442", borderRadius:4, padding:"2px 2px", cursor:"pointer", outline:"none" }}
                >
                  {TRANSITIONS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
                <div style={{ width:1, height:16, background:"#1f2937" }} />
              </div>
            )}
          </React.Fragment>
        );
      })}

      {/* Add scene button */}
      <div style={{ flexShrink:0, marginLeft:8 }}>
        <div style={{ width:60, height:66, borderRadius:8, border:"2px dashed #2b3442", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", color:"#475569", fontSize:20, background:"transparent" }}
          onClick={() => {
            const evt = new CustomEvent("onyx-add-scene");
            window.dispatchEvent(evt);
          }}
          title="Add scene"
        >+</div>
      </div>
    </div>
  );
}
