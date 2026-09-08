import React, { useState, useRef } from "react";
import { getAuthHeaders } from "../utils/auth.js";

// Magic Resize v1 (docs/margin-and-feature-scoping-2026-09-08.md, Task 3 #1).
// Batch multi-format export on an ALREADY-RENDERED reel: reuses the exact
// same /api/render pipeline as the normal Export button (buildV2RenderRequest
// + the render/status/download-proxy flow), just called once per selected
// target ratio. Zero new AI generation -- render compute only, same 1
// credit/minute download charge the normal Export already applies, per
// ratio. Also carries the manual per-scene focal point control (v1's cheap
// alternative to real saliency-aware auto-crop -- see the same doc, Task 3
// #2): a click-to-set marker per scene, per target ratio, stored in-memory
// here and passed to buildV2RenderRequest's `focalPoints` override so each
// ratio's export can crop differently without touching the reel's own saved
// default fitMode/focalPoint.
const RATIO_OPTIONS = [
  { id: "9:16", label: "9:16 · Reels / TikTok / Shorts" },
  { id: "16:9", label: "16:9 · YouTube / Landscape" },
  { id: "1:1",  label: "1:1 · Square" },
  { id: "4:3",  label: "4:3 · Classic" },
  { id: "3:4",  label: "3:4 · Portrait" },
];

function sceneThumb(scene) {
  return scene?.thumbnail || scene?.stockThumb || null;
}

export default function MagicResizeModal({
  currentRatio, scenes, timelineState, globalMusicUrl, globalMusicName,
  musicVolume, voiceoverVolume, sfxVolume, brand, reelId, captionsVisible,
  title, buildRenderRequest, onClose, toast,
}) {
  const availableRatios = RATIO_OPTIONS.filter(r => r.id !== currentRatio);
  const [selected, setSelected] = useState(() => new Set());
  const [activeTab, setActiveTab] = useState(availableRatios[0]?.id || null);
  // { [ratio]: { [sceneId]: {x,y} } }
  const [focalPoints, setFocalPoints] = useState({});
  const [status, setStatus] = useState({}); // { [ratio]: "idle"|"rendering"|"done"|"error" }
  const [running, setRunning] = useState(false);
  const boxRefs = useRef({});

  const videoTrack = timelineState.tracks.find(t => t.key === "video");
  const orderedScenes = (videoTrack?.clips || [])
    .slice().sort((a, b) => a.startTime - b.startTime)
    .map(clip => scenes.find(s => s.id === clip.sceneId))
    .filter(Boolean);

  function toggleRatio(id) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
    if (!activeTab) setActiveTab(id);
  }

  function setFocal(ratio, sceneId, x, y) {
    setFocalPoints(prev => ({
      ...prev,
      [ratio]: { ...(prev[ratio] || {}), [sceneId]: { x, y } },
    }));
  }

  function handleBoxClick(e, sceneId) {
    const box = boxRefs.current[sceneId];
    if (!box) return;
    const rect = box.getBoundingClientRect();
    const x = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    const y = Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height));
    setFocal(activeTab, sceneId, x, y);
  }

  async function downloadRendered(url, ratio) {
    const dh = await getAuthHeaders();
    const filename = (title || "reel").replace(/[^a-z0-9]/gi, "_") + "_" + ratio.replace(":", "x") + ".mp4";
    const proxyUrl = `/api/render/download?url=${encodeURIComponent(url)}&filename=${encodeURIComponent(filename)}`;
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
  }

  async function exportOneRatio(ratio) {
    setStatus(prev => ({ ...prev, [ratio]: "rendering" }));
    try {
      const h = await getAuthHeaders();
      h["Content-Type"] = "application/json";
      const payload = buildRenderRequest({ ratio, focalPoints: focalPoints[ratio] || {} });
      const startRes = await fetch("/api/render", { method: "POST", headers: h, body: JSON.stringify(payload) });
      const startData = await startRes.json();
      if (startRes.status === 402 && startData.code === "INSUFFICIENT_CREDITS") {
        setStatus(prev => ({ ...prev, [ratio]: "insufficient_credits" }));
        return;
      }
      if (!startData.jobId) {
        setStatus(prev => ({ ...prev, [ratio]: "error" }));
        return;
      }
      const deadline = Date.now() + 3600000;
      while (Date.now() < deadline) {
        await new Promise(r => setTimeout(r, 5000));
        const ph = await getAuthHeaders();
        const poll = await (await fetch(`/api/render/status/${startData.jobId}`, { headers: ph })).json();
        if (poll.status === "completed") {
          const dlUrl = poll.url.startsWith("http") ? poll.url : window.location.origin + poll.url;
          await downloadRendered(dlUrl, ratio);
          setStatus(prev => ({ ...prev, [ratio]: "done" }));
          return;
        }
        if (poll.status === "failed") {
          setStatus(prev => ({ ...prev, [ratio]: "error" }));
          return;
        }
      }
      setStatus(prev => ({ ...prev, [ratio]: "error" }));
    } catch (err) {
      console.error("[MagicResize] export failed for", ratio, err);
      setStatus(prev => ({ ...prev, [ratio]: "error" }));
    }
  }

  async function handleExportAll() {
    if (running || !selected.size) return;
    setRunning(true);
    // Sequential, not parallel -- each render is a real ffmpeg job on the
    // same backend; running N of them at once for one user's batch export
    // has no real UX benefit and just contends for server render capacity.
    for (const ratio of selected) {
      await exportOneRatio(ratio);
    }
    setRunning(false);
    toast?.(`Magic Resize: ${selected.size} format${selected.size === 1 ? "" : "s"} exported`);
  }

  const statusLabel = {
    idle: null,
    rendering: "Rendering…",
    done: "✓ Downloaded",
    error: "✗ Failed",
    insufficient_credits: "Not enough credits",
  };

  return (
    <div className="magic-resize-overlay" onClick={e => e.target === e.currentTarget && !running && onClose()}>
      <div className="magic-resize-modal">
        <div className="magic-resize-header">
          <span>Export in other formats</span>
          <button className="magic-resize-close" onClick={onClose} disabled={running} aria-label="Close">✕</button>
        </div>
        <div className="magic-resize-body">
          <p className="magic-resize-hint">
            Re-exports this already-rendered reel at other aspect ratios — no new AI generation, same
            1 credit/minute download cost as a normal export, charged per format.
          </p>

          <div className="magic-resize-ratios">
            {availableRatios.map(r => (
              <label key={r.id} className="magic-resize-ratio-row">
                <input
                  type="checkbox"
                  checked={selected.has(r.id)}
                  disabled={running}
                  onChange={() => toggleRatio(r.id)}
                />
                <span>{r.label}</span>
                {status[r.id] && <span className={`magic-resize-status magic-resize-status--${status[r.id]}`}>{statusLabel[status[r.id]]}</span>}
              </label>
            ))}
          </div>

          {selected.size > 0 && (
            <div className="magic-resize-focal">
              <div className="magic-resize-focal-tabs">
                {[...selected].map(r => (
                  <button
                    key={r}
                    className={`magic-resize-tab ${activeTab === r ? "active" : ""}`}
                    onClick={() => setActiveTab(r)}
                    disabled={running}
                  >
                    {r}
                  </button>
                ))}
              </div>
              <p className="magic-resize-hint">
                Optional: click a scene below to set where the crop centers for <strong>{activeTab}</strong>.
                Leave untouched for the existing center-crop default.
              </p>
              <div className="magic-resize-scenes">
                {orderedScenes.map((scene, i) => {
                  const thumb = sceneThumb(scene);
                  const fp = focalPoints[activeTab]?.[scene.id];
                  return (
                    <div
                      key={scene.id || i}
                      className="magic-resize-scene-box"
                      ref={el => { boxRefs.current[scene.id] = el; }}
                      onClick={(e) => handleBoxClick(e, scene.id)}
                      style={{ backgroundImage: thumb ? `url(${thumb})` : undefined }}
                    >
                      <span className="magic-resize-scene-label">{i + 1}</span>
                      <span
                        className="magic-resize-focal-marker"
                        style={{ left: `${(fp?.x ?? 0.5) * 100}%`, top: `${(fp?.y ?? 0.5) * 100}%` }}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="magic-resize-actions">
            <button className="btn btn-ghost" onClick={onClose} disabled={running}>Cancel</button>
            <button className="btn btn-primary" onClick={handleExportAll} disabled={running || !selected.size}>
              {running ? "Exporting…" : `Export ${selected.size || ""} format${selected.size === 1 ? "" : "s"}`}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        .magic-resize-overlay {
          position: fixed; inset: 0; z-index: 9999;
          background: rgba(0,0,0,0.75);
          display: flex; align-items: center; justify-content: center;
          padding: 20px;
        }
        .magic-resize-modal {
          background: #161616; border: 1px solid #2a2a2a; border-radius: 16px;
          width: 100%; max-width: 520px; max-height: 85vh; overflow-y: auto;
          display: flex; flex-direction: column;
        }
        .magic-resize-header {
          display: flex; align-items: center; gap: 10px;
          padding: 16px 20px; border-bottom: 1px solid #222;
          font-weight: 700; font-size: 16px; color: #fff;
          position: sticky; top: 0; background: #161616; z-index: 1;
        }
        .magic-resize-close { margin-left: auto; background: none; border: none; color: #666; cursor: pointer; font-size: 14px; }
        .magic-resize-close:hover { color: #fff; }
        .magic-resize-body { padding: 20px; display: flex; flex-direction: column; gap: 16px; }
        .magic-resize-hint { margin: 0; font-size: 12.5px; line-height: 1.5; color: #999; }
        .magic-resize-ratios { display: flex; flex-direction: column; gap: 8px; }
        .magic-resize-ratio-row {
          display: flex; align-items: center; gap: 10px;
          padding: 8px 10px; border: 1px solid #262626; border-radius: 8px;
          font-size: 13.5px; color: #ddd; cursor: pointer;
        }
        .magic-resize-status { margin-left: auto; font-size: 12px; color: #4dd0ff; }
        .magic-resize-status--done { color: #4ade80; }
        .magic-resize-status--error, .magic-resize-status--insufficient_credits { color: #f87171; }
        .magic-resize-focal-tabs { display: flex; gap: 6px; flex-wrap: wrap; }
        .magic-resize-tab {
          background: #1e1e1e; border: 1px solid #2a2a2a; color: #aaa;
          border-radius: 6px; padding: 5px 10px; font-size: 12px; cursor: pointer;
        }
        .magic-resize-tab.active { background: #4dd0ff; color: #06121b; border-color: #4dd0ff; font-weight: 700; }
        .magic-resize-scenes { display: flex; flex-wrap: wrap; gap: 8px; }
        .magic-resize-scene-box {
          position: relative; width: 84px; height: 84px; border-radius: 8px;
          background-color: #222; background-size: cover; background-position: center;
          border: 1px solid #2a2a2a; cursor: crosshair; flex-shrink: 0;
        }
        .magic-resize-scene-label {
          position: absolute; top: 3px; left: 5px; font-size: 10px; color: #fff;
          text-shadow: 0 1px 3px rgba(0,0,0,0.9); font-weight: 700;
        }
        .magic-resize-focal-marker {
          position: absolute; width: 12px; height: 12px; margin: -6px 0 0 -6px;
          border-radius: 50%; background: #4dd0ff; border: 2px solid #06121b;
          box-shadow: 0 0 0 1px rgba(255,255,255,0.6); pointer-events: none;
        }
        .magic-resize-actions { display: flex; gap: 10px; justify-content: flex-end; }
        .magic-resize-actions .btn {
          padding: 9px 16px; border-radius: 8px; font-size: 13.5px; font-weight: 700;
          cursor: pointer; border: 1px solid transparent;
        }
        .magic-resize-actions .btn-primary { background: #4dd0ff; color: #06121b; }
        .magic-resize-actions .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
        .magic-resize-actions .btn-primary:hover:not(:disabled) { background: #7de0ff; }
        .magic-resize-actions .btn-ghost { background: transparent; border-color: #2a2a2a; color: #aaa; }
        .magic-resize-actions .btn-ghost:hover:not(:disabled) { color: #fff; }
      `}</style>
    </div>
  );
}
