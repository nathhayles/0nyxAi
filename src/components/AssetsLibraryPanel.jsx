// AssetsLibraryPanel.jsx — browse-only library across all uploaded/generated
// assets, grouped into collapsible sections by media type and filterable by
// brand. Purely additive: reads from media_assets, doesn't touch any
// existing upload flow.
import React, { useEffect, useRef, useState } from "react";
import { getAuthHeaders } from "../utils/auth.js";
import FolderPicker from "./FolderPicker.jsx";
import AssetSearchBar from "./AssetSearchBar.jsx";

const SECTIONS = [
  { type: "music", label: "Music", icon: "🎵" },
  { type: "sfx", label: "Sound Effects", icon: "🔊" },
  { type: "video", label: "Video", icon: "🎬" },
  { type: "image", label: "Images", icon: "🖼" },
  { type: "logo", label: "Logos / Brand Assets", icon: "🏷" },
  { type: "ai_generated", label: "AI-Generated", icon: "✨" },
];

function isAudioUrl(url = "") {
  return /\.(mp3|wav|ogg|m4a|aac|flac|webm)(\?|#|$)/i.test(String(url));
}
function isVideoUrl(url = "") {
  return /\.(mp4|webm|mov|m4v)(\?|#|$)/i.test(String(url));
}

// media_assets rows for AI-generated/saved music & sfx use an opaque proxy
// URL (e.g. /api/music/file/<uuid>) with no file extension, so URL sniffing
// alone can't detect them — prefer the DB `type` column first and only fall
// back to URL sniffing for sections that mix media kinds (e.g. ai_generated).
function detectMediaKind(item) {
  if (item.type === "music" || item.type === "sfx") return "audio";
  if (item.type === "video") return "video";
  if (item.type === "image" || item.type === "logo") return "image";
  if (isVideoUrl(item.url)) return "video";
  if (isAudioUrl(item.url)) return "audio";
  return "image";
}

function assetKindLabel(item) {
  const kind = detectMediaKind(item);
  if (kind === "audio") return "Audio";
  if (kind === "video") return "Video";
  return "Image";
}

// Same "application/onyx-media" shape used by VisualsPanel/MediaPanel/SfxPanel/
// ElementsPanel, so SequencerPanel's handleDrop() consumes Library drags
// identically to drags from those panels.
function buildDragPayload(item) {
  const mediaType = detectMediaKind(item);
  return {
    url:       item.url,
    name:      item.name || "Untitled",
    label:     item.name || "Untitled",
    thumbnail: mediaType === "audio" ? undefined : item.url,
    mediaType,
    type:      mediaType,
    duration:  item.duration || 5,
  };
}

function formatDuration(seconds) {
  if (!seconds || !isFinite(seconds)) return null;
  const total = Math.round(seconds);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function formatDate(value) {
  if (!value) return "Unknown";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "Unknown";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

const HOVER_DELAY = 400;

function AssetPreviewTooltip({ item, x, y }) {
  const [meta, setMeta] = useState({ duration: null, width: null, height: null });
  const kind = assetKindLabel(item);

  const TOOLTIP_W = 220;
  const margin = 12;
  let left = x + margin;
  let top = y + margin;
  if (typeof window !== "undefined") {
    if (left + TOOLTIP_W > window.innerWidth - 8) left = x - TOOLTIP_W - margin;
    if (left < 8) left = 8;
    const estHeight = 280;
    if (top + estHeight > window.innerHeight - 8) top = Math.max(8, window.innerHeight - estHeight - 8);
  }

  return (
    <div
      style={{
        position: "fixed",
        left,
        top,
        width: TOOLTIP_W,
        background: "var(--onyx-surface)",
        border: "1px solid var(--onyx-hairline-strong)",
        borderRadius: 10,
        padding: 10,
        boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
        zIndex: 1001,
        pointerEvents: "none",
      }}
    >
      <div style={{ width: "100%", height: 120, borderRadius: 6, overflow: "hidden", background: "var(--onyx-surface-3)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 8 }}>
        {kind === "Image" ? (
          <img
            src={item.url}
            alt=""
            style={{ width: "100%", height: "100%", objectFit: "contain" }}
            onLoad={(e) => setMeta((m) => ({ ...m, width: e.target.naturalWidth, height: e.target.naturalHeight }))}
          />
        ) : kind === "Video" ? (
          <video
            src={item.url}
            muted
            preload="metadata"
            playsInline
            style={{ width: "100%", height: "100%", objectFit: "contain" }}
            onLoadedMetadata={(e) => {
              const v = e.target;
              setMeta((m) => ({ ...m, duration: v.duration, width: v.videoWidth, height: v.videoHeight }));
              try { v.currentTime = Math.min(0.1, v.duration / 2 || 0); } catch {}
            }}
          />
        ) : (
          <div style={{ fontSize: 32 }}>🔊</div>
        )}
        {kind === "Audio" && (
          <audio
            src={item.url}
            preload="metadata"
            style={{ display: "none" }}
            onLoadedMetadata={(e) => setMeta((m) => ({ ...m, duration: e.target.duration }))}
          />
        )}
      </div>

      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--onyx-text)", wordBreak: "break-word", marginBottom: 4 }}>
        {item.name || "Untitled"}
      </div>

      <div style={{ fontSize: 11, color: "var(--onyx-text-faint)", display: "grid", gap: 2 }}>
        <div>Type: <span style={{ color: "var(--onyx-text-dim)" }}>{kind}</span></div>
        {(kind === "Video" || kind === "Audio") && (
          <div>Duration: <span style={{ color: "var(--onyx-text-dim)" }}>{formatDuration(meta.duration) || "—"}</span></div>
        )}
        {kind === "Image" && (
          <div>Dimensions: <span style={{ color: "var(--onyx-text-dim)" }}>{meta.width && meta.height ? `${meta.width} × ${meta.height} px` : "—"}</span></div>
        )}
        {kind === "Video" && meta.width && meta.height && (
          <div>Dimensions: <span style={{ color: "var(--onyx-text-dim)" }}>{`${meta.width} × ${meta.height} px`}</span></div>
        )}
        <div>Added: <span style={{ color: "var(--onyx-text-dim)" }}>{formatDate(item.created_at)}</span></div>
      </div>
    </div>
  );
}

function MiniAudioButton({ src }) {
  const [audio] = useState(() => (typeof Audio !== "undefined" ? new Audio() : null));
  const [playing, setPlaying] = useState(false);

  const toggle = () => {
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
      return;
    }
    audio.src = src;
    audio.play();
    setPlaying(true);
    audio.onended = () => setPlaying(false);
  };

  return (
    <button onClick={toggle} style={{ width: 24, height: 24, borderRadius: "50%", background: "var(--onyx-cyan-deep)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      {playing ? (
        <svg width="8" height="10" viewBox="0 0 10 12" fill="white"><rect x="0" y="0" width="3" height="12" /><rect x="7" y="0" width="3" height="12" /></svg>
      ) : (
        <svg width="8" height="10" viewBox="0 0 10 12" fill="white"><polygon points="0,0 10,6 0,12" /></svg>
      )}
    </button>
  );
}

function AssetContextMenu({ x, y, mode, folders, onPickMoveToFolder, onPickFolder, onClose }) {
  useEffect(() => {
    const handleClick = () => onClose();
    const handleKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("click", handleClick);
    document.addEventListener("contextmenu", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("click", handleClick);
      document.removeEventListener("contextmenu", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const itemStyle = {
    padding: "6px 12px",
    fontSize: 12,
    color: "var(--onyx-text)",
    cursor: "pointer",
    whiteSpace: "nowrap",
  };

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        position: "fixed",
        top: y,
        left: x,
        background: "var(--onyx-surface)",
        border: "1px solid var(--onyx-hairline-strong)",
        borderRadius: 6,
        padding: "4px 0",
        minWidth: 140,
        maxHeight: 240,
        overflowY: "auto",
        boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
        zIndex: 1000,
      }}
    >
      {mode === "menu" && (
        <div
          style={itemStyle}
          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--onyx-cyan-deep)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          onClick={onPickMoveToFolder}
        >
          Move to folder
        </div>
      )}
      {mode === "folders" && (
        <>
          <div style={{ ...itemStyle, color: "var(--onyx-text-faint)", cursor: "default" }}>Move to...</div>
          <div
            style={itemStyle}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--onyx-cyan-deep)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            onClick={() => onPickFolder("")}
          >
            Unfiled
          </div>
          {folders.map((f) => (
            <div
              key={f.id}
              style={itemStyle}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--onyx-cyan-deep)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              onClick={() => onPickFolder(f.id)}
            >
              {f.name}
            </div>
          ))}
        </>
      )}
    </div>
  );
}

function AssetSection({ section, expanded, onToggle, brandId, folderId, query, folders, onApplyMusic, onApplySfx, onApplyMedia, onMoveToFolder }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [loadedFor, setLoadedFor] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [preview, setPreview] = useState(null);
  const hoverTimerRef = useRef(null);
  const hoverPosRef = useRef({ x: 0, y: 0 });

  const filterKey = `${brandId || "all"}|${folderId || "all"}|${query || ""}`;

  const clearHoverTimer = () => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
  };

  const handleHoverEnter = (item, e) => {
    hoverPosRef.current = { x: e.clientX, y: e.clientY };
    clearHoverTimer();
    hoverTimerRef.current = setTimeout(() => {
      setPreview({ item, x: hoverPosRef.current.x, y: hoverPosRef.current.y });
    }, HOVER_DELAY);
  };

  const handleHoverMove = (e) => {
    hoverPosRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleHoverLeave = () => {
    clearHoverTimer();
    setPreview(null);
  };

  useEffect(() => () => clearHoverTimer(), []);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ type: section.type });
      if (brandId) params.set("brand_id", brandId);
      if (folderId) params.set("folder_id", folderId);
      if (query) params.set("q", query);
      const res = await fetch(`/api/media/assets?${params.toString()}`, { cache: "no-store", headers: await getAuthHeaders() });
      const data = await res.json().catch(() => []);
      setItems(Array.isArray(data) ? data : []);
      setLoadedFor(filterKey);
    } catch (err) {
      console.error("assets load error", err);
      setError("Failed to load.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (expanded && loadedFor !== filterKey) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expanded, filterKey]);

  const handleApply = (item) => {
    if (section.type === "music") return onApplyMusic?.(item.url, item.name);
    if (section.type === "sfx") return onApplySfx?.(item.url, item.name);
    return onApplyMedia?.({
      url: item.url,
      mediaType: detectMediaKind(item),
      source: "library",
    });
  };

  const handleMove = async (item, newFolderId) => {
    const ok = await onMoveToFolder?.(item.id, newFolderId || null);
    if (ok) setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, folder_id: newFolderId || null } : i)));
  };

  return (
    <div style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
      <div
        onClick={onToggle}
        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 4px", cursor: "pointer", userSelect: "none" }}
      >
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--onyx-text)", display: "flex", gap: 8, alignItems: "center" }}>
          <span>{section.icon}</span>
          <span>{section.label}</span>
        </div>
        <span style={{ fontSize: 11, color: "var(--onyx-text-mute)", transform: expanded ? "rotate(90deg)" : "none", transition: "transform 0.15s" }}>▶</span>
      </div>

      {expanded && (
        <div style={{ paddingBottom: 10 }}>
          {loading && <div style={{ fontSize: 12, color: "var(--onyx-text-faint)", padding: "4px 4px" }}>Loading...</div>}
          {error && <div style={{ fontSize: 12, color: "var(--onyx-rose)", padding: "4px 4px" }}>{error}</div>}
          {!loading && !items.length && !error && (
            <div style={{ fontSize: 12, color: "var(--onyx-text-mute)", padding: "4px 4px" }}>No {section.label.toLowerCase()} yet.</div>
          )}
          <div style={{ display: "grid", gap: 6 }}>
            {items.map((item) => (
              <div
                key={item.id}
                draggable
                onDragStart={(e) => {
                  const payload = buildDragPayload(item);
                  e.dataTransfer.setData("application/onyx-media", JSON.stringify(payload));
                  e.dataTransfer.effectAllowed = "copy";
                  // Read by SequencerPanel's onDragOver for live drop-validity feedback —
                  // dataTransfer.getData() isn't readable until the actual drop event.
                  window.__onyxDraggedMedia = payload;
                }}
                onDragEnd={() => { window.__onyxDraggedMedia = null; }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setContextMenu({ x: e.clientX, y: e.clientY, item, mode: "menu" });
                }}
                style={{ display: "flex", alignItems: "center", gap: 8, border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8, padding: "6px 8px", background: "rgba(0,0,0,0.15)", cursor: "grab" }}>
                <div
                  style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 0 }}
                  onMouseEnter={(e) => handleHoverEnter(item, e)}
                  onMouseMove={handleHoverMove}
                  onMouseLeave={handleHoverLeave}
                >
                  {detectMediaKind(item) === "audio" ? (
                    <MiniAudioButton src={item.url} />
                  ) : detectMediaKind(item) === "video" ? (
                    <div style={{ width: 24, height: 24, borderRadius: 4, background: "var(--onyx-surface-3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, flexShrink: 0 }}>🎬</div>
                  ) : (
                    <img src={item.url} alt="" style={{ width: 24, height: 24, borderRadius: 4, objectFit: "cover", flexShrink: 0 }} />
                  )}
                  <div style={{ flex: 1, minWidth: 0, fontSize: 12, color: "var(--onyx-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {item.name || "Untitled"}
                  </div>
                </div>
                <select
                  value={item.folder_id || ""}
                  onChange={(e) => handleMove(item, e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  title="Move to folder"
                  style={{ background: "var(--onyx-surface)", border: "1px solid var(--onyx-hairline-strong)", color: "var(--onyx-text-faint)", borderRadius: 6, padding: "3px 4px", fontSize: 11, flexShrink: 0, maxWidth: 90 }}
                >
                  <option value="">Unfiled</option>
                  {folders.map((f) => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
                <button
                  onClick={() => handleApply(item)}
                  style={{ padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600, background: "var(--onyx-cyan-deep)", border: "none", color: "var(--btn-primary-text)", cursor: "pointer", flexShrink: 0 }}
                >
                  Apply
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {contextMenu && (
        <AssetContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          mode={contextMenu.mode}
          folders={folders}
          onPickMoveToFolder={() => setContextMenu((prev) => ({ ...prev, mode: "folders" }))}
          onPickFolder={(newFolderId) => {
            handleMove(contextMenu.item, newFolderId);
            setContextMenu(null);
          }}
          onClose={() => setContextMenu(null)}
        />
      )}

      {preview && <AssetPreviewTooltip item={preview.item} x={preview.x} y={preview.y} />}
    </div>
  );
}

export default function AssetsLibraryPanel({ onApplyMusic, onApplySfx, onApplyMedia, initialExpandedType = null }) {
  const [brands, setBrands] = useState([]);
  const [brandId, setBrandId] = useState("");
  const [folders, setFolders] = useState([]);
  const [folderId, setFolderId] = useState("");
  const [query, setQuery] = useState("");
  // Lets a caller (e.g. AudioPanel's "Change in Library" button) land here
  // with a section already open instead of the default fully-collapsed list.
  const [expandedType, setExpandedType] = useState(initialExpandedType);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/brands", { cache: "no-store", headers: await getAuthHeaders() });
        const data = await res.json().catch(() => ({}));
        if (res.ok && Array.isArray(data?.brands)) setBrands(data.brands);
      } catch (err) {
        console.error("brands load error", err);
      }
    })();
    loadFolders();
  }, []);

  const loadFolders = async () => {
    try {
      const res = await fetch("/api/media/folders", { cache: "no-store", headers: await getAuthHeaders() });
      const data = await res.json().catch(() => []);
      setFolders(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("folders load error", err);
    }
  };

  const createFolder = async (name) => {
    try {
      const res = await fetch("/api/media/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(await getAuthHeaders()) },
        body: JSON.stringify({ name }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.id) setFolders((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
    } catch (err) {
      console.error("folder create error", err);
    }
  };

  const renameFolder = async (id, name) => {
    try {
      const res = await fetch(`/api/media/folders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...(await getAuthHeaders()) },
        body: JSON.stringify({ name }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.id) setFolders((prev) => prev.map((f) => (f.id === id ? data : f)).sort((a, b) => a.name.localeCompare(b.name)));
    } catch (err) {
      console.error("folder rename error", err);
    }
  };

  const deleteFolder = async (id) => {
    try {
      const res = await fetch(`/api/media/folders/${id}`, { method: "DELETE", headers: await getAuthHeaders() });
      if (res.ok) {
        setFolders((prev) => prev.filter((f) => f.id !== id));
        if (folderId === id) setFolderId("");
      }
    } catch (err) {
      console.error("folder delete error", err);
    }
  };

  const moveAssetToFolder = async (assetId, newFolderId) => {
    try {
      const res = await fetch(`/api/media/assets/${assetId}/folder`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...(await getAuthHeaders()) },
        body: JSON.stringify({ folder_id: newFolderId === "none" ? null : newFolderId }),
      });
      return res.ok;
    } catch (err) {
      console.error("asset move error", err);
      return false;
    }
  };

  return (
    <div className="panelStickyShell">
      <div className="panelStickyTop">
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 12, color: "var(--onyx-text-dim)", marginBottom: 6 }}>Brand</div>
          <select
            value={brandId}
            onChange={(e) => setBrandId(e.target.value)}
            style={{ width: "100%", background: "var(--onyx-surface)", border: "1px solid var(--onyx-hairline-strong)", color: "var(--onyx-text)", borderRadius: 6, padding: "7px 10px", fontSize: 12 }}
          >
            <option value="">All brands</option>
            {brands.map((b) => (
              <option key={b.id} value={b.id}>{b.brand_label || "Untitled brand"}</option>
            ))}
          </select>
        </div>

        <FolderPicker
          folders={folders}
          folderId={folderId}
          setFolderId={setFolderId}
          onCreate={createFolder}
          onRename={renameFolder}
          onDelete={deleteFolder}
        />

        <AssetSearchBar value={query} onChange={setQuery} />
      </div>

      <div className="panelStickyContent">
        {SECTIONS.map((section) => (
          <AssetSection
            key={section.type}
            section={section}
            brandId={brandId}
            folderId={folderId}
            query={query}
            folders={folders}
            expanded={expandedType === section.type}
            onToggle={() => setExpandedType((prev) => (prev === section.type ? null : section.type))}
            onApplyMusic={onApplyMusic}
            onApplySfx={onApplySfx}
            onApplyMedia={onApplyMedia}
            onMoveToFolder={moveAssetToFolder}
          />
        ))}
      </div>
    </div>
  );
}
