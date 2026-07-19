// SfxPanel.jsx
import React, { useEffect, useRef, useState } from "react";
import { getAuthHeaders } from "../utils/auth.js";

function AudioPreview({ src, volume = 100 }) {
  const ref = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  useEffect(() => {
    if (!ref.current) return;
    ref.current.volume = Math.max(0, Math.min(1, Number(volume || 0) / 100));
  }, [src, volume]);

  function toggle() {
    if (!ref.current) return;
    if (playing) { ref.current.pause(); setPlaying(false); }
    else { ref.current.play(); setPlaying(true); }
  }

  function fmt(s) {
    const n = Math.round(s || 0);
    return `${Math.floor(n / 60)}:${String(n % 60).padStart(2, "0")}`;
  }

  if (!src) return null;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, background: "var(--onyx-bg-2)", border: "1px solid var(--onyx-hairline-strong)", borderRadius: 8, padding: "8px 12px" }}>
      <audio
        ref={ref}
        src={src}
        onTimeUpdate={() => { setCurrentTime(ref.current.currentTime); setProgress(ref.current.duration ? ref.current.currentTime / ref.current.duration : 0); }}
        onLoadedMetadata={() => setDuration(ref.current.duration)}
        onEnded={() => { setPlaying(false); setProgress(0); setCurrentTime(0); }}
        style={{ display: "none" }}
      />
      <button onClick={toggle} style={{ width: 28, height: 28, borderRadius: "50%", background: "#1d4ed8", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        {playing ? (
          <svg width="10" height="12" viewBox="0 0 10 12" fill="white"><rect x="0" y="0" width="3" height="12" /><rect x="7" y="0" width="3" height="12" /></svg>
        ) : (
          <svg width="10" height="12" viewBox="0 0 10 12" fill="white"><polygon points="0,0 10,6 0,12" /></svg>
        )}
      </button>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
        <div style={{ height: 3, background: "var(--onyx-hairline-strong)", borderRadius: 2, overflow: "hidden", cursor: "pointer" }}
          onClick={(e) => {
            if (!ref.current || !ref.current.duration) return;
            const rect = e.currentTarget.getBoundingClientRect();
            const pct = (e.clientX - rect.left) / rect.width;
            ref.current.currentTime = pct * ref.current.duration;
          }}>
          <div style={{ height: "100%", width: `${progress * 100}%`, background: "linear-gradient(90deg, #7c3aed, #ec4899)", borderRadius: 2, transition: "width 0.1s" }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontSize: 10, color: "var(--onyx-text-faint)" }}>{fmt(currentTime)}</span>
          <span style={{ fontSize: 10, color: "var(--onyx-text-faint)" }}>{fmt(duration)}</span>
        </div>
      </div>
    </div>
  );
}

function formatDuration(seconds) {
  const n = Number(seconds);
  if (!Number.isFinite(n) || n <= 0) return "";
  const whole = Math.round(n);
  const mins = Math.floor(whole / 60);
  const secs = whole % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

function normalizeUploadItem(file) {
  return {
    id: file.url || `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    name: file.name || (file.url ? String(file.url).split("/").pop() : "sfx"),
    url: file.url || "",
  };
}

const LICENSE_LABELS = { "CC0": "CC0 (Public Domain)", "CC-BY": "CC-BY (Attribution)" };

export default function SfxPanel({
  tab,
  setTab,
  activeScene,
  activeSceneObj,
  sfxVolume,
  setSfxVolume,
  applySfxToActiveScene,
  clearSceneSfx,
  clearAllSfx,
}) {
  const [uploads, setUploads] = useState([]);
  const fileInputRef = useRef(null);
  const [uploadStatus, setUploadStatus] = useState("");

  const [results, setResults] = useState([]);
  const [stockQuery, setStockQuery] = useState("whoosh");
  const [stockLoading, setStockLoading] = useState(false);
  const [stockError, setStockError] = useState("");

  const fetchUploads = async () => {
    try {
      const res = await fetch("/api/media?assetType=sfx", { cache: "no-store", headers: await getAuthHeaders() });
      const data = await res.json().catch(() => []);
      const items = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : [];
      setUploads(items.map(normalizeUploadItem).filter((item) => item.url));
    } catch (err) {
      console.error("sfx uploads load error", err);
    }
  };

  useEffect(() => { if (tab === "uploads") fetchUploads(); }, [tab]);

  const handleUploadPicked = async (files) => {
    const list = Array.from(files || []).filter(Boolean);
    if (!list.length) return;
    const form = new FormData();
    for (const file of list) form.append("files", file);
    form.append("assetType", "sfx");
    try {
      const res = await fetch("/api/media/upload", { method: "POST", headers: await getAuthHeaders(), body: form });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || `Upload failed (${res.status})`);
      await fetchUploads();
      setUploadStatus("Sound effect uploaded.");
    } catch (err) {
      setUploadStatus(err?.message || "Upload failed.");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const loadStockSfx = async (query = stockQuery) => {
    setStockLoading(true);
    setStockError("");
    try {
      const q = encodeURIComponent((query || "whoosh").trim() || "whoosh");
      const res = await fetch(`/api/stock/sfx?q=${q}`, { cache: "no-store", headers: await getAuthHeaders() });
      const data = await res.json().catch(() => ({ items: [] }));
      if (!res.ok) throw new Error(`Stock SFX request failed (${res.status})`);
      setResults(Array.isArray(data?.items) ? data.items : []);
    } catch (err) {
      console.error("stock sfx load error", err);
      setResults([]);
      setStockError(err?.message || "Failed to load sound effects.");
    } finally {
      setStockLoading(false);
    }
  };

  useEffect(() => { if (tab === "stock") loadStockSfx(); }, [tab]);

  // Drag onto the SFX timeline track for frame-accurate placement — same
  // "application/onyx-media" payload/contract VisualsPanel uses for B-roll.
  // Apply-to-scene-start (below) stays as the no-drag fallback.
  const onDragStartPayload = (e, url, name, duration) => {
    try {
      e.dataTransfer.setData("application/onyx-media", JSON.stringify({ url, name, label: name, duration, type: "audio" }));
      e.dataTransfer.effectAllowed = "copy";
    } catch (_) {}
  };

  return (
    <div className="panelStickyShell">
      <div className="panelStickyTop">
        <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, color: "var(--onyx-text-faint)", marginBottom: 6 }}>SFX Volume</div>
            <input type="range" min="0" max="100" step="1"
              value={typeof sfxVolume === "number" ? sfxVolume : 80}
              onChange={(e) => setSfxVolume(Number(e.target.value))}
              style={{ width: "100%" }}
            />
          </div>
        </div>

        <div style={{ fontSize: 12, color: "var(--onyx-text-faint)", marginBottom: 10 }}>
          Applying to <strong style={{ color: "var(--onyx-text)" }}>Scene {activeScene}</strong>
          {activeSceneObj?.sfxName ? (
            <>
              {" "}— <span style={{ color: "#a3e635" }}>{activeSceneObj.sfxName}</span>
              <button type="button" onClick={clearSceneSfx}
                style={{ marginLeft: 8, padding: "2px 8px", borderRadius: 6, fontSize: 11, fontWeight: 600, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#f87171", cursor: "pointer" }}>
                Remove
              </button>
            </>
          ) : null}
        </div>

        <div className="panelTabs">
          <button className={tab === "uploads" ? "active" : ""} onClick={() => setTab("uploads")}>Uploads</button>
          <button className={tab === "stock" ? "active" : ""} onClick={() => setTab("stock")}>Stock</button>
        </div>
      </div>

      <div className="panelStickyContent">

        {/* ── UPLOADS TAB ── */}
        {tab === "uploads" && (
          <div style={{ marginTop: 12 }}>
            <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "var(--onyx-bg-2)", border: "2px dashed var(--onyx-hairline-strong)", borderRadius: 8, cursor: "pointer", fontSize: 13, color: "var(--onyx-text-faint)" }}>
                <span style={{ fontSize: 18 }}>🔊</span>
                <span>Click to upload sound effects</span>
                <input ref={fileInputRef} type="file" accept="audio/*" multiple onChange={(e) => handleUploadPicked(e.target.files)} style={{ display: "none" }} />
              </label>
            </div>
            <div style={{ display: "grid", gap: 10 }}>
              {uploads.map((it) => (
                <div key={it.id} draggable onDragStart={(e) => onDragStartPayload(e, it.url, it.name)}
                  style={{ border: "1px solid var(--onyx-hairline-strong)", borderRadius: 12, padding: 12, background: "var(--onyx-surface)", cursor: "grab" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginBottom: 8 }}>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>🔊 {it.name}</div>
                  </div>
                  <AudioPreview src={it.url} volume={sfxVolume} />
                  <button type="button" onClick={() => applySfxToActiveScene(it.url, it.name)} style={{ marginTop: 8, width: "100%", padding: "8px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600, background: "#1d4ed8", border: "none", color: "#fff", cursor: "pointer" }}>
                    ✓ Apply to Scene {activeScene}
                  </button>
                </div>
              ))}
              {!uploads.length ? <div style={{ fontSize: 12, color: "var(--onyx-text-faint)" }}>No uploaded sound effects yet.</div> : null}
            </div>
            {uploadStatus && <div style={{ marginTop: 8, fontSize: 12, color: "#a3e635" }}>{uploadStatus}</div>}
          </div>
        )}

        {/* ── STOCK TAB ── */}
        {tab === "stock" && (
          <div style={{ marginTop: 12 }}>
            <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
              <input
                value={stockQuery}
                onChange={(e) => setStockQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") loadStockSfx(stockQuery); }}
                style={{ flex: 1, background: "var(--onyx-surface)", border: "1px solid var(--onyx-hairline-strong)", color: "var(--onyx-text)", borderRadius: 8, padding: "8px 12px", fontSize: 13, outline: "none" }}
                placeholder="Search sound effects (e.g. whoosh, click, applause)"
              />
              <button type="button" onClick={() => loadStockSfx(stockQuery)} disabled={stockLoading}
                style={{ padding: "8px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600, background: stockLoading ? "#374151" : "#1d4ed8", border: "none", color: "#fff", cursor: stockLoading ? "not-allowed" : "pointer", flexShrink: 0 }}>
                {stockLoading ? "..." : "Search"}
              </button>
            </div>
            <div style={{ fontSize: 11, color: "var(--onyx-text-faint)", marginBottom: 10 }}>
              Showing only commercial-safe licenses (CC0, CC-BY) from Freesound.
            </div>
            {stockError ? <div style={{ color: "#f87171", fontSize: 12, marginBottom: 10 }}>{stockError}</div> : null}
            <div style={{ display: "grid", gap: 10 }}>
              {results.map((item) => (
                <div key={item.id || item.url} draggable onDragStart={(e) => onDragStartPayload(e, item.url, item.name, item.duration)}
                  style={{ border: "1px solid var(--onyx-hairline-strong)", borderRadius: 12, padding: 12, background: "var(--onyx-surface)", cursor: "grab" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", marginBottom: 8, minWidth: 0 }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.name}</div>
                      <div style={{ fontSize: 11, color: "var(--onyx-text-faint)", display: "flex", gap: 8 }}>
                        <span>{formatDuration(item.duration)}</span>
                        <span style={{ padding: "1px 6px", borderRadius: 4, background: item.license === "CC0" ? "rgba(34,197,94,0.15)" : "rgba(124,58,237,0.15)", color: item.license === "CC0" ? "#4ade80" : "#c4b5fd" }}>
                          {LICENSE_LABELS[item.license] || item.license}
                        </span>
                      </div>
                    </div>
                    <button type="button" onClick={() => applySfxToActiveScene(item.url, item.name)}
                      style={{ padding: "7px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600, background: "#1d4ed8", border: "none", color: "#fff", cursor: "pointer", flexShrink: 0 }}>
                      Apply
                    </button>
                  </div>
                  <AudioPreview src={item.url} volume={sfxVolume} />
                </div>
              ))}
              {!results.length && !stockLoading ? <div style={{ fontSize: 12, color: "var(--onyx-text-faint)" }}>No sound effects loaded.</div> : null}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
