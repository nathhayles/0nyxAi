import React, { useState, useEffect, useRef } from "react";
import HelpTooltip from "./HelpTooltip.jsx";
import { getAuthHeaders } from "../utils/auth.js";

function normalizeNarrationText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

// Mirrors normalize() in backend/lib/resolveCharacterTags.js so the chip's
// resolved/unresolved state matches what the server will actually resolve.
function normalizeTagName(value) {
  return String(value || "").toLowerCase().replace(/\s+/g, "");
}

// Character names currently tagged in a scene's prompt text (for the chip row).
function parseTaggedNames(text) {
  const matches = [...String(text || "").matchAll(/@([A-Za-z0-9_]+)/g)];
  return [...new Set(matches.map((m) => m[1]))];
}

// Textarea with "@"-triggered autocomplete over the user's saved characters.
// Selecting a character inserts "@Name" as literal text — no separate
// "attach" control, per spec (tag resolution happens server-side at fal.ai
// submit time; see backend/lib/resolveCharacterTags.js).
function CharacterTagTextarea({ value, onChange, placeholder, onClick, characters }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [triggerPos, setTriggerPos] = useState(null);
  const taRef = useRef(null);

  const matches = open
    ? characters.filter((c) => c.name.toLowerCase().includes(query.toLowerCase())).slice(0, 8)
    : [];

  const handleChange = (e) => {
    const text = e.target.value;
    const caret = e.target.selectionStart;
    onChange(text);

    const upToCaret = text.slice(0, caret);
    const m = upToCaret.match(/@([A-Za-z0-9_]*)$/);
    if (m) {
      setOpen(true);
      setQuery(m[1]);
      setTriggerPos(caret - m[0].length);
    } else {
      setOpen(false);
    }
  };

  const selectCharacter = (name) => {
    if (triggerPos == null) return;
    const before = value.slice(0, triggerPos);
    const after = value.slice(triggerPos + 1 + query.length);
    const next = `${before}@${name} ${after}`;
    onChange(next);
    setOpen(false);
    requestAnimationFrame(() => {
      if (taRef.current) {
        const pos = before.length + name.length + 2;
        taRef.current.focus();
        taRef.current.setSelectionRange(pos, pos);
      }
    });
  };

  return (
    <div style={{ position: "relative" }}>
      <textarea
        ref={taRef}
        placeholder={placeholder}
        value={value}
        onChange={handleChange}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onClick={onClick}
      />
      {open && matches.length > 0 && (
        <div
          style={{
            position: "absolute", zIndex: 20, top: "100%", left: 0, right: 0,
            background: "var(--onyx-surface)", border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 8, marginTop: 2, maxHeight: 160, overflowY: "auto",
            boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
          }}
          onMouseDown={(e) => e.preventDefault()}
        >
          {matches.map((c) => (
            <div
              key={c.id}
              onClick={() => selectCharacter(c.name)}
              style={{ padding: "6px 10px", fontSize: 12, cursor: "pointer" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.08)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              @{c.name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const REGEN_MODEL_OPTIONS = [
  { id: "wan-2.5",        label: "Wan 2.5", credits: 18  },
  { id: "kling-2.6-pro",  label: "Kling 2.6 Pro", credits: 50  },
  { id: "veo-3",          label: "Veo 3",          credits: 140 },
  { id: "seedance-1-pro", label: "Seedance 1 Pro", credits: 36  },
  { id: "vidu-q3-pro",    label: "Vidu Q3 Pro",    credits: 20  },
];

export default function StoryboardPanel({
  scenes,
  activeScene,
  setActiveScene,
  updateScenes,
  onSaveScene,
  onDeleteScene,
  onGenerateScene,
  generatingScenes = {},
  onAddScene,
  regenModel = "kling-2.6-pro",
  onRegenModelChange,
}) {
  const [stockQuery, setStockQuery] = useState({});
  const [stockResults, setStockResults] = useState({});
  const [stockSearching, setStockSearching] = useState({});
  const [uploadingScene, setUploadingScene] = useState({});
  const [characters, setCharacters] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const headers = await getAuthHeaders();
        const res = await fetch("/api/characters", { headers });
        const data = await res.json();
        setCharacters(data.characters || []);
      } catch (e) {
        console.error("[StoryboardPanel] failed to load characters:", e);
      }
    })();
  }, []);

  const updateField = (sceneId, field, value) => {
    const next = scenes.map((sc) => {
      if (String(sc.id) !== String(sceneId)) return sc;

      if (field === "narration") {
        const prevText = normalizeNarrationText(sc.narration || "");
        const nextText = normalizeNarrationText(value);
        if (prevText !== nextText) {
          return { ...sc, narration: value, voiceoverStale: !!nextText };
        }
      }

      return { ...sc, [field]: value };
    });

    updateScenes(next);
  };

  const handleStockSearch = async (sceneId) => {
    const q = (stockQuery[sceneId] || "").trim();
    if (!q) return;
    setStockSearching((prev) => ({ ...prev, [sceneId]: true }));
    try {
      const res = await fetch(`/api/stock/videos?q=${encodeURIComponent(q)}&per_page=9&orientation=portrait`);
      const data = await res.json();
      setStockResults((prev) => ({ ...prev, [sceneId]: data.videos || [] }));
    } catch (e) {
      console.error("Stock search failed:", e);
    } finally {
      setStockSearching((prev) => ({ ...prev, [sceneId]: false }));
    }
  };

  const handleSelectStock = (sceneId, video) => {
    if (sceneId == null) {
      console.warn("[StoryboardPanel] handleSelectStock called with nullish sceneId — scene is missing an id");
      return;
    }
    updateScenes(prev => prev.map((sc) =>
      String(sc.id) !== String(sceneId) ? sc : {
        ...sc,
        url: video.url,
        mediaUrl: video.url,
        mediaType: "video",
        stockSource: "stock",
        thumbnail: video.thumb,
      }
    ));
  };

  const handleUpload = async (sceneId, file) => {
    if (!file) return;
    setUploadingScene((prev) => ({ ...prev, [sceneId]: true }));
    try {
      const headers = await getAuthHeaders();
      const form = new FormData();
      form.append("files", file);
      form.append("assetType", file.type.startsWith("video/") ? "video" : "image");
      const res = await fetch("/api/media/upload", { method: "POST", headers, body: form });
      const data = await res.json();
      const uploaded = data?.files?.[0];
      if (uploaded) {
        updateScenes(prev => prev.map((sc) =>
          String(sc.id) !== String(sceneId) ? sc : {
            ...sc,
            url: uploaded.url,
            mediaUrl: uploaded.url,
            mediaType: uploaded.type,
            thumbnail: uploaded.thumbnailUrl || "",
            stockSource: "upload",
          }
        ));
      }
    } catch (e) {
      console.error("Upload failed:", e);
    } finally {
      setUploadingScene((prev) => ({ ...prev, [sceneId]: false }));
    }
  };

  const handleClearMedia = (sceneId) => {
    updateScenes(prev => prev.map((sc) =>
      String(sc.id) !== String(sceneId) ? sc : { ...sc, url: "", mediaUrl: "", thumbnail: "", stockSource: "" }
    ));
  };

  return (
    <div style={{ maxWidth: "100%", boxSizing: "border-box", overflowX: "hidden" }}>
      {onRegenModelChange && (
        <div style={{ padding: "8px 12px", borderBottom: "1px solid rgba(255,255,255,0.06)", marginBottom: 4 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.4)", marginBottom: 5, textTransform: "uppercase", letterSpacing: 1 }}>Generate model</div>
          <select
            value={regenModel}
            onChange={e => onRegenModelChange(e.target.value)}
            style={{
              width: "100%", padding: "6px 10px", borderRadius: 8, fontSize: 12,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "var(--onyx-bg)", color: "var(--onyx-text)",
            }}
          >
            {REGEN_MODEL_OPTIONS.map(opt => (
              <option key={opt.id} value={opt.id} disabled={opt.disabled}>{opt.label}{opt.disabled ? "" : ` — ${opt.credits} cr/scene`}</option>
            ))}
          </select>
        </div>
      )}
      {scenes.map((sc, index) => {
        const mode = sc.mode || "ai";
        const isStock = mode === "stock";

        return (
          <div
            key={sc.id}
            className={"sceneCard" + (sc.id === activeScene ? " active" : "")}
            onClick={() => setActiveScene(sc.id)}
          >
            {/* ── Header row ── */}
            <div className="sceneHeaderRow">
              <div className="sceneTitle" style={{ whiteSpace: "nowrap", flexShrink: 0, fontSize: 13, fontWeight: 600 }}>
                {sc.name ?? `Scene ${index + 1}`}
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 4 }} onClick={(e) => e.stopPropagation()}>
                <select
                  value={mode}
                  onChange={(e) => updateField(sc.id, "mode", e.target.value)}
                >
                  <option value="ai">AI</option>
                  <option value="stock">Stock</option>
                </select>
                {mode === "ai" && <HelpTooltip topic="kling" />}
              </div>

              <button
                className="sceneSmallBtn"
                onClick={(e) => { e.stopPropagation(); onSaveScene(sc.id); }}
              >
                Save
              </button>

              {scenes.length > 1 && (
                <button
                  className="sceneSmallBtn"
                  title="Delete scene"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteScene?.(sc.id);
                  }}
                  style={{ color: "#f87171" }}
                >
                  ✕
                </button>
              )}

              {!isStock && (
                <button
                  className="sceneSmallBtn primary"
                  disabled={!!generatingScenes[sc.id]}
                  onClick={(e) => { e.stopPropagation(); onGenerateScene(sc.id); }}
                >
                  {generatingScenes[sc.id]?.status === "submitting"
                    ? "Starting…"
                    : generatingScenes[sc.id]?.status === "polling"
                    ? "Generating…"
                    : "Generate"}
                </button>
              )}
            </div>

            {/* ── Duration ── */}
            <div
              style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}
              onClick={(e) => e.stopPropagation()}
            >
              <span style={{ fontSize: 12, opacity: 0.7, marginRight: 2 }}>Duration:</span>
              {[3, 5, 8, 10].map((s) => (
                <button
                  key={s}
                  className={"sceneSmallBtn" + ((sc.duration || 5) === s ? " primary" : "")}
                  onClick={(e) => { e.stopPropagation(); updateField(sc.id, "duration", s); }}
                  style={{ minWidth: 34 }}
                >
                  {s}s
                </button>
              ))}
            </div>

            {/* ── Narration (both modes) ── */}
            <textarea
              placeholder="Narration"
              value={sc.narration || ""}
              onChange={(e) => updateField(sc.id, "narration", e.target.value)}
              onClick={(e) => e.stopPropagation()}
            />

            {/* ── AI mode fields ── */}
            {!isStock && (
              <>
                {parseTaggedNames(sc.action).length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 4 }} onClick={(e) => e.stopPropagation()}>
                    {parseTaggedNames(sc.action).map((name) => {
                      const known = characters.some((c) => normalizeTagName(c.name) === normalizeTagName(name));
                      return (
                        <span
                          key={name}
                          title={known ? name : `"${name}" doesn't match a saved character`}
                          style={{
                            fontSize: 11, padding: "2px 7px", borderRadius: 999,
                            background: known ? "rgba(0,210,255,0.15)" : "rgba(248,113,113,0.15)",
                            color: known ? "#00d2ff" : "#f87171",
                            border: `1px solid ${known ? "rgba(0,210,255,0.35)" : "rgba(248,113,113,0.35)"}`,
                          }}
                        >
                          @{name}
                        </span>
                      );
                    })}
                  </div>
                )}
                <CharacterTagTextarea
                  placeholder="Action / Background"
                  value={sc.action || ""}
                  onChange={(text) => updateField(sc.id, "action", text)}
                  onClick={(e) => e.stopPropagation()}
                  characters={characters}
                />

                <div
                  style={{
                    marginTop: 8,
                    padding: "8px 10px",
                    borderRadius: 8,
                    background: "var(--onyx-inset)",
                    border: `1px solid ${(sc.endImageUrl || "").trim() ? "rgba(0,210,255,0.4)" : "rgba(255,255,255,0.08)"}`,
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div style={{ fontSize: 11, opacity: 0.6, marginBottom: 4 }}>End Frame URL</div>
                  <input
                    type="url"
                    value={sc.endImageUrl || ""}
                    onChange={(e) => updateField(sc.id, "endImageUrl", e.target.value)}
                    placeholder="https://example.com/end-frame.jpg"
                    style={{
                      width: "100%",
                      padding: "6px 8px",
                      borderRadius: 6,
                      border: "1px solid rgba(255,255,255,0.1)",
                      background: "var(--onyx-bg)",
                      color: "var(--onyx-text)",
                      fontSize: 12,
                      boxSizing: "border-box",
                    }}
                  />
                </div>

                {sc.mediaType === "video" && (
                  <div
                    style={{ marginTop: 8, padding: 10, border: "0.5px solid var(--onyx-hairline-strong)", borderRadius: 10, background: "var(--onyx-surface)" }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 6 }}>Clip Audio</div>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, fontSize: 12 }}>
                      <input
                        type="checkbox"
                        checked={!!sc.sourceAudioMuted}
                        onChange={(e) => updateField(sc.id, "sourceAudioMuted", e.target.checked)}
                      />
                      Mute source clip audio
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="1"
                      value={typeof sc.sourceAudioVolume === "number" ? sc.sourceAudioVolume : 100}
                      onChange={(e) => updateField(sc.id, "sourceAudioVolume", Number(e.target.value))}
                      disabled={!!sc.sourceAudioMuted}
                      style={{ width: "100%" }}
                    />
                    <div style={{ fontSize: 12, opacity: 0.75, marginTop: 6 }}>
                      {sc.sourceAudioMuted
                        ? "Muted"
                        : `${typeof sc.sourceAudioVolume === "number" ? sc.sourceAudioVolume : 100}%`}
                    </div>
                  </div>
                )}

                {sc.mediaType === "video" && (
                  <div
                    style={{ marginTop: 8, padding: 10, border: "0.5px solid var(--onyx-hairline-strong)", borderRadius: 10, background: "var(--onyx-surface)", fontSize: 12 }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div style={{ opacity: 0.8, marginBottom: 6 }}>Trim Clip</div>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                      Start: {sc.trimStart ?? 0}s
                      <input
                        type="range"
                        min="0"
                        max={sc.trimEnd ?? 30}
                        step="0.1"
                        value={sc.trimStart ?? 0}
                        onChange={(e) => updateField(sc.id, "trimStart", Number(e.target.value))}
                        style={{ flex: 1 }}
                      />
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      End: {sc.trimEnd ?? "full"}s
                      <input
                        type="range"
                        min={sc.trimStart ?? 0}
                        max="120"
                        step="0.1"
                        value={sc.trimEnd ?? 30}
                        onChange={(e) => updateField(sc.id, "trimEnd", Number(e.target.value))}
                        style={{ flex: 1 }}
                      />
                    </label>
                  </div>
                )}
              </>
            )}

            {/* ── Stock mode fields ── */}
            {isStock && (
              <div onClick={(e) => e.stopPropagation()}>
                {/* Selected media preview */}
                {sc.url && (
                  <div style={{ position: "relative", marginBottom: 10, marginTop: 8 }}>
                    <img
                      src={sc.thumbnail || sc.url}
                      alt="Selected media"
                      style={{ width: "100%", borderRadius: 8, maxHeight: 120, objectFit: "cover", display: "block" }}
                    />
                    <button
                      onClick={() => handleClearMedia(sc.id)}
                      style={{
                        position: "absolute",
                        top: 4,
                        right: 4,
                        background: "var(--onyx-inset)",
                        border: "none",
                        borderRadius: "50%",
                        color: "#fff",
                        cursor: "pointer",
                        width: 22,
                        height: 22,
                        fontSize: 13,
                        lineHeight: "22px",
                        padding: 0,
                        textAlign: "center",
                      }}
                    >
                      ✕
                    </button>
                  </div>
                )}

                {/* Pexels search */}
                <div style={{ display: "flex", gap: 6, marginBottom: 8, marginTop: 8 }}>
                  <input
                    type="text"
                    placeholder="Search Pexels videos…"
                    value={stockQuery[sc.id] || ""}
                    onChange={(e) => setStockQuery((prev) => ({ ...prev, [sc.id]: e.target.value }))}
                    onKeyDown={(e) => { if (e.key === "Enter") handleStockSearch(sc.id); }}
                    style={{
                      flex: 1,
                      padding: "6px 8px",
                      borderRadius: 6,
                      border: "1px solid rgba(255,255,255,0.15)",
                      background: "var(--onyx-bg)",
                      color: "var(--onyx-text)",
                      fontSize: 12,
                    }}
                  />
                  <button
                    className="sceneSmallBtn primary"
                    disabled={stockSearching[sc.id]}
                    onClick={() => handleStockSearch(sc.id)}
                    style={{ minWidth: 56 }}
                  >
                    {stockSearching[sc.id] ? "…" : "Search"}
                  </button>
                </div>

                {/* Results grid */}
                {(stockResults[sc.id] || []).length > 0 && (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 4, marginBottom: 8 }}>
                    {(stockResults[sc.id] || []).map((video) => (
                      <div
                        key={video.id}
                        onClick={() => handleSelectStock(sc.id, video)}
                        style={{
                          cursor: "pointer",
                          borderRadius: 6,
                          overflow: "hidden",
                          border: sc.url === video.url ? "2px solid #00d2ff" : "2px solid transparent",
                          aspectRatio: "9/16",
                          background: "var(--onyx-inset)",
                        }}
                      >
                        <img
                          src={video.thumb}
                          alt=""
                          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                        />
                      </div>
                    ))}
                  </div>
                )}

                {/* Upload */}
                <label style={{ display: "inline-block", marginBottom: 4 }}>
                  <input
                    type="file"
                    accept="video/*,image/*"
                    style={{ display: "none" }}
                    onChange={(e) => handleUpload(sc.id, e.target.files?.[0])}
                  />
                  <span className="sceneSmallBtn" style={{ cursor: "pointer", display: "inline-block" }}>
                    {uploadingScene[sc.id] ? "Uploading…" : "Upload file"}
                  </span>
                </label>
                <div style={{ marginTop: 8 }}>
                  <div style={{ fontSize: 11, color: "var(--onyx-text-faint)", marginBottom: 4 }}>
                    Or paste a direct video/image URL
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <input
                      type="text"
                      placeholder="https://example.com/video.mp4"
                      style={{ flex: 1, padding: "6px 10px", borderRadius: 6, border: "0.5px solid var(--onyx-hairline-strong)", background: "var(--chip-bg)", color: "var(--onyx-text)", fontSize: 12, fontFamily: "inherit" }}
                      onBlur={e => {
                        const url = e.target.value.trim();
                        if (!url) return;
                        const isVideo = /\.(mp4|webm|mov|m4v)(\?|$)/i.test(url);
                        updateScenes(prev => prev.map(s => s.id === sc.id ? {
                          ...s,
                          url,
                          mediaUrl: url,
                          mediaType: isVideo ? "video" : "image",
                          stockSource: "direct",
                          thumbnail: isVideo ? null : url,
                        } : s));
                      }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ── Captions toggle (both modes) ── */}
            <div
              style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, fontSize: 12 }}
              onClick={(e) => e.stopPropagation()}
            >
              <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={sc.captionsEnabled ?? true}
                  onChange={(e) => updateField(sc.id, "captionsEnabled", e.target.checked)}
                />
                Show captions on canvas
              </label>
            </div>

            <div className="sceneMetaRow">
              <span className="meta">
                {sc.savedAt ? `Saved: ${new Date(sc.savedAt).toLocaleTimeString()}` : "Not saved"}
              </span>
              <span className="meta">
                {sc.generatedAt
                  ? `Generated: ${new Date(sc.generatedAt).toLocaleTimeString()}`
                  : "Not generated"}
              </span>
              {sc.voiceoverStale ? <span className="meta">Voiceover out of date</span> : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
