import React, { useEffect, useMemo, useRef, useState } from "react";

const AUDIO_UPLOADS_KEY = "onyx_audio_uploads_v1";

function safeJsonParse(raw, fallback) {
  try {
    const v = JSON.parse(raw);
    return v ?? fallback;
  } catch {
    return fallback;
  }
}

export default function AudioPanel({
  tab,
  setTab,
  voiceoverVolume,
  setVoiceoverVolume,
  musicVolume,
  setMusicVolume,
}) {
  // Persist across menu switching (AudioPanel unmounts when you leave the audio menu)
  const [uploads, setUploads] = useState([]);
  const fileInputRef = useRef(null);

  // Load persisted uploads once
  useEffect(() => {
    const saved = safeJsonParse(localStorage.getItem(AUDIO_UPLOADS_KEY), []);
    if (Array.isArray(saved)) setUploads(saved);
  }, []);

  // Save uploads on change
  useEffect(() => {
    try {
      localStorage.setItem(AUDIO_UPLOADS_KEY, JSON.stringify(uploads));
    } catch (_) {}
  }, [uploads]);

  const addFiles = (fileList) => {
    const files = Array.from(fileList || []).filter(Boolean);
    if (!files.length) return;

    const next = files.map((file) => ({
      id: `${Date.now()}_${Math.random().toString(16).slice(2)}`,
      name: file.name,
      // NOTE: object URLs won't survive a full page refresh, but WILL survive switching menus.
      url: URL.createObjectURL(file),
      mediaType: "audio",
    }));

    setUploads((prev) => [...next, ...prev]);

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const onPickFiles = (e) => addFiles(e.target.files);

  const onDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer?.files?.length) addFiles(e.dataTransfer.files);
  };

  const onDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const removeOne = (id) => {
    setUploads((prev) => prev.filter((x) => x.id !== id));
  };

  // Simple tidy grid styles inline to avoid touching your CSS files
  const gridStyle = useMemo(
    () => ({
      display: "grid",
      gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
      gap: 10,
      marginTop: 10,
    }),
    []
  );

  const itemStyle = useMemo(
    () => ({
      border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 10,
      padding: 10,
      background: "rgba(0,0,0,0.25)",
      cursor: "grab",
      display: "flex",
      flexDirection: "column",
      gap: 8,
    }),
    []
  );

  return (
    <div>
      {/* GLOBAL CONTROLS (RESTORED) */}
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 6 }}>Voiceover Volume</div>
          <input
            type="range"
            min="0"
            max="100"
            step="1"
            value={typeof voiceoverVolume === "number" ? voiceoverVolume : 100}
            onChange={(e) => setVoiceoverVolume(Number(e.target.value))}
            style={{ width: "100%" }}
          />
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 6 }}>Music Volume</div>
          <input
            type="range"
            min="0"
            max="100"
            step="1"
            value={typeof musicVolume === "number" ? musicVolume : 60}
            onChange={(e) => setMusicVolume(Number(e.target.value))}
            style={{ width: "100%" }}
          />
        </div>
      </div>

      {/* TABS (DO NOT REMOVE) */}
      <div className="panelTabs">
        <button className={tab === "uploads" ? "active" : ""} onClick={() => setTab("uploads")}>
          Uploads
        </button>
        <button className={tab === "stock" ? "active" : ""} onClick={() => setTab("stock")}>
          Stock
        </button>
        <button className={tab === "voiceovers" ? "active" : ""} onClick={() => setTab("voiceovers")}>
          AI Voice
        </button>
      </div>

      {/* UPLOADS */}
      {tab === "uploads" && (
        <div style={{ marginTop: 10 }}>
          <div
            onDrop={onDrop}
            onDragOver={onDragOver}
            style={{
              border: "1px dashed rgba(255,255,255,0.18)",
              borderRadius: 12,
              padding: 12,
              background: "rgba(0,0,0,0.18)",
            }}
          >
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*"
                multiple
                onChange={onPickFiles}
              />
              <div style={{ fontSize: 12, opacity: 0.75 }}>Drop audio files here too.</div>
            </div>
          </div>

          <div style={gridStyle}>
            {uploads.map((it) => (
              <div
                key={it.id}
                className="mediaItem"
                draggable
                onDragStart={(ev) => {
                  const payload = { kind: "audio", url: it.url, name: it.name, mediaType: "audio" };
                  ev.dataTransfer.setData("application/onyx-audio", JSON.stringify(payload));
                  ev.dataTransfer.setData("text/plain", it.url);
                  ev.dataTransfer.effectAllowed = "copy";
                }}
                style={itemStyle}
                title={it.name}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                  <div style={{ fontWeight: 700, fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    🎵 {it.name}
                  </div>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      removeOne(it.id);
                    }}
                    style={{
                      border: "1px solid rgba(255,255,255,0.12)",
                      background: "rgba(0,0,0,0.25)",
                      color: "rgba(255,255,255,0.85)",
                      borderRadius: 8,
                      padding: "2px 8px",
                      cursor: "pointer",
                      fontSize: 12,
                    }}
                  >
                    Remove
                  </button>
                </div>

                <audio controls src={it.url} style={{ width: "100%" }} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* STOCK */}
      {tab === "stock" && (
        <div className="panelMuted" style={{ marginTop: 12 }}>
          Stock music tab (unchanged)
        </div>
      )}

      {/* AI VOICE */}
      {tab === "voiceovers" && (
        <div className="panelMuted" style={{ marginTop: 12 }}>
          AI Voice tab (unchanged)
        </div>
      )}
    </div>
  );
}
