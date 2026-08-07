import React, { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../supabaseClient.js";
import { getAuthHeaders } from "../utils/auth.js";
import { isVideo } from "../utils/mediaType.js";

function formatDuration(seconds) {
  const n = Number(seconds);
  if (!Number.isFinite(n) || n <= 0) return "";
  const whole = Math.round(n);
  const mins = Math.floor(whole / 60);
  const secs = whole % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

function deriveSceneQuery(scene) {
  const saved = String(scene?.stockQuery || "").trim();
  if (saved) return saved;

  const source = String(scene?.action || scene?.narration || "").trim();
  if (!source) return "";

  return (
    source
      .replace(/\r\n/g, " ")
      .replace(/\n/g, " ")
      .replace(/[^\w\s-]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .split(/\s+/)
      .slice(0, 8)
      .join(" ") || ""
  );
}

function normalizePickedAsset(item) {
  if (!item) return null;

  const url = item.full || item.url || item.mediaUrl || "";
  const thumb = item.thumb || item.thumbnail || item.preview || url;
  const mediaType =
    item.type || item.mediaType || (isVideo(url) ? "video" : "image");

  return {
    id: item.id || item.stockAssetId || null,
    url,
    full: url,
    thumb,
    type: mediaType,
    duration: item.duration || "",
  };
}

function dedupeAssets(items = []) {
  const seen = new Set();
  const out = [];

  for (const item of items) {
    const key = `${item?.type || ""}::${item?.full || item?.url || ""}`;
    if (!item?.url && !item?.full) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }

  return out;
}

function scoreVideoRelevance(item, query, minDuration = 0) {
  const q = String(query || "").toLowerCase().trim();
  if (!q) return 0;

  const haystack = [
    item?.raw?.title,
    item?.raw?.alt,
    item?.raw?.description,
    item?.raw?.tags,
    item?.raw?.query,
    item?.url,
    item?.full,
  ]
    .flat()
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  let score = 0;
  const words = q.split(/\s+/).filter(Boolean);

  for (const word of words) {
    if (haystack.includes(word)) score += 2;
  }

  if (item?.type === "video") score += 50;
  if (minDuration > 0 && (item?.duration || 0) >= minDuration) score += 50;
  return score;
}

function sortStockResults(items = [], query = "", minDuration = 0) {
  return [...items].sort((a, b) => {
    const scoreA = scoreVideoRelevance(a, query, minDuration);
    const scoreB = scoreVideoRelevance(b, query, minDuration);
    return scoreB - scoreA;
  });
}

function MediaTile({
  item,
  label,
  query,
  onSelect,
  onDragStartPayload,
  onDelete,
  showDelete = false,
  pinned = false,
  onClick,
}) {
  const thumb = item?.thumb || item?.url || "";
  const full = item?.full || item?.url || "";
  const type =
    item?.type === "video" || isVideo(item?.full || item?.url)
      ? "video"
      : "image";

  const initialDuration =
    typeof item?.duration === "string" && item.duration.includes(":")
      ? item.duration
      : formatDuration(item?.duration);

  const initialDurationSec =
    typeof item?.duration === "number" && item.duration > 0 ? item.duration : 0;

  const [videoDuration, setVideoDuration] = useState(initialDuration);
  const [durationSec, setDurationSec] = useState(initialDurationSec);
  const [hovering, setHovering] = useState(false);
  const [thumbFailed, setThumbFailed] = useState(false);
  const videoRef = useRef(null);

  useEffect(() => {
    if (type !== "video") return;

    if (initialDuration) {
      setVideoDuration(initialDuration);
      return;
    }

    const vid = document.createElement("video");
    vid.preload = "metadata";
    vid.src = full || thumb;

    const onLoaded = () => {
      setVideoDuration(formatDuration(vid.duration));
      setDurationSec(vid.duration);
    };
    const onError = () => setVideoDuration("");

    vid.addEventListener("loadedmetadata", onLoaded);
    vid.addEventListener("error", onError);

    return () => {
      vid.removeEventListener("loadedmetadata", onLoaded);
      vid.removeEventListener("error", onError);
      vid.src = "";
    };
  }, [type, full, thumb, initialDuration]);

  const payload = {
    kind: "media",
    source: label,
    stockQuery: query || "",
    stockAssetId: item?.id || null,
    mediaType: type,
    thumb,
    url: full,
    duration: durationSec || initialDurationSec || 5,
  };

  const handleDoubleClick = () => {
    onSelect?.(payload);
  };

  const handleMouseEnter = () => {
    setHovering(true);
    if (type === "video" && videoRef.current) {
      try {
        videoRef.current.currentTime = 0.1;
        videoRef.current.play();
      } catch (_) {}
    }
  };

  const handleMouseLeave = () => {
    setHovering(false);
    if (type === "video" && videoRef.current) {
      try {
        videoRef.current.pause();
        videoRef.current.currentTime = 0.1;
      } catch (_) {}
    }
  };

  const showImageThumb =
    type === "image" || (type === "video" && thumb && !thumbFailed && !hovering);

  return (
    <div
      className="mediaTile"
      draggable
      onDragStart={(e) => onDragStartPayload(e, payload)}
      onClick={onClick}
      onDoubleClick={handleDoubleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      title="Drag to canvas or click to assign to active scene"
      style={{
        position: "relative",
        border: pinned ? "1px solid rgba(59,130,246,0.9)" : undefined,
        boxShadow: pinned ? "0 0 0 1px rgba(59,130,246,0.25) inset" : undefined,
      }}
    >
      {showDelete ? (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onDelete?.(item);
          }}
          style={{
            position: "absolute",
            top: 8,
            right: 8,
            zIndex: 3,
            border: "1px solid rgba(255,255,255,0.12)",
            background: "rgba(180,20,20,0.9)",
            color: "#fff",
            borderRadius: 8,
            padding: "4px 8px",
            cursor: "pointer",
            fontSize: 12,
          }}
        >
          Delete
        </button>
      ) : null}

      {pinned ? (
        <div
          style={{
            position: "absolute",
            top: 8,
            left: 8,
            zIndex: 3,
            background: "rgba(59,130,246,0.92)",
            color: "#fff",
            borderRadius: 999,
            fontSize: 11,
            fontWeight: 700,
            padding: "5px 9px",
          }}
        >
          In Scene
        </div>
      ) : null}

      <div
        className="mediaThumb"
        style={{
          position: "relative",
          overflow: "hidden",
          borderRadius: 12,
          background: "var(--onyx-surface)",
        }}
      >
        {showImageThumb ? (
          <img
            src={thumb}
            alt=""
            onError={() => setThumbFailed(true)}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "block",
            }}
          />
        ) : type === "video" ? (
          <video
            ref={videoRef}
            key={full || thumb}
            src={full || thumb}
            muted
            playsInline
            loop
            preload="metadata"
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "block",
            }}
            onLoadedMetadata={(e) => {
              try {
                e.currentTarget.currentTime = 0.1;
              } catch (_) {}
            }}
          />
        ) : (
          <div className="mediaThumbPlaceholder">MEDIA</div>
        )}

        {type === "video" ? (
          <div
            style={{
              position: "absolute",
              top: pinned ? 38 : 8,
              left: 8,
              background: "rgba(0,0,0,0.72)",
              color: "#fff",
              fontSize: 11,
              lineHeight: 1,
              padding: "5px 7px",
              borderRadius: 8,
              fontWeight: 700,
              letterSpacing: "0.04em",
            }}
          >
            VIDEO
          </div>
        ) : null}

        {videoDuration ? (
          <div
            className="mediaDuration"
            style={{
              position: "absolute",
              right: 8,
              bottom: 8,
              background: "rgba(0,0,0,0.72)",
              color: "#fff",
              fontSize: 12,
              lineHeight: 1,
              padding: "6px 8px",
              borderRadius: 8,
              fontWeight: 600,
            }}
          >
            {videoDuration}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function VisualsPanel({
  tab,
  setTab,
  libraryKey,
  onSelect,
  apiBase = "",
  activeScene,
  activeSceneObj,
}) {
  const [aiStudioItems, setAiStudioItems] = useState([]);

  const [q, setQ] = useState("");
  const [stockLoading, setStockLoading] = useState(false);
  const [stockErr, setStockErr] = useState("");
  const [stockItems, setStockItems] = useState([]);
  const lastAutoQueryRef = useRef("");

  const currentSceneQuery = useMemo(
    () => deriveSceneQuery(activeSceneObj),
    [activeSceneObj]
  );

  const currentSceneAsset = useMemo(() => {
    if (!activeSceneObj?.mediaUrl) return null;

    return normalizePickedAsset({
      id: activeSceneObj?.stockAssetId || null,
      url: activeSceneObj?.mediaUrl,
      full: activeSceneObj?.mediaUrl,
      thumb:
        activeSceneObj?.stockThumb ||
        activeSceneObj?.thumbnail ||
        activeSceneObj?.mediaUrl,
      type:
        activeSceneObj?.mediaType ||
        (isVideo(activeSceneObj?.mediaUrl) ? "video" : "image"),
    });
  }, [activeSceneObj]);

  const refreshAiStudio = async () => {
    try {
      const h = await getAuthHeaders();
      const res = await fetch("/api/ai-studio-library", { headers: h, cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          const items = data.map(d => ({
            id: d.id,
            name: d.name || "AI Scene",
            url: d.url,
            thumbnail: d.thumbnail_url || d.url,
            mediaType: d.media_type || "video",
            duration: d.duration || 5,
            createdAt: d.created_at,
            source: "ai",
          }));
          setAiStudioItems(items);
          // Migrate any localStorage items not yet in DB
          try {
            const raw = localStorage.getItem(libraryKey);
            const local = JSON.parse(raw || "[]");
            const dbUrls = new Set(items.map(i => i.url));
            const toMigrate = local.filter(l => !dbUrls.has(l.url));
            for (const l of toMigrate) {
              await fetch("/api/ai-studio-library", {
                method: "POST",
                headers: { ...h, "Content-Type": "application/json" },
                body: JSON.stringify({
                  url: l.url,
                  thumbnail_url: l.thumbnail || l.url,
                  name: l.name || "AI Scene",
                  media_type: l.mediaType || "video",
                  duration: l.duration || 5,
                }),
              });
            }
            if (toMigrate.length) localStorage.removeItem(libraryKey);
          } catch {}
          return;
        }
      }
    } catch {}
    // Fallback to localStorage
    try {
      const raw = localStorage.getItem(libraryKey);
      const list = JSON.parse(raw || "[]");
      setAiStudioItems(Array.isArray(list) ? list : []);
    } catch {
      setAiStudioItems([]);
    }
  };

  useEffect(() => {
    refreshAiStudio();
  }, [tab, libraryKey]);

  useEffect(() => {
    const handler = () => { refreshAiStudio(); setTab("aistudio"); };
    window.addEventListener("onyx:ai-studio-save", handler);
    return () => window.removeEventListener("onyx:ai-studio-save", handler);
  }, [libraryKey]);

  const searchStock = async (nextQuery = q) => {
    const query = String(nextQuery || "").trim();
    if (!query) return;

    setStockErr("");
    setStockLoading(true);

    try {
      const authHeaders = await getAuthHeaders();
      const [imgRes, vidRes] = await Promise.all([
        fetch(`${apiBase}/api/stock/search?q=${encodeURIComponent(query)}`, {
          cache: "no-store",
          headers: authHeaders,
        }),
        fetch(`${apiBase}/api/stock/videos?q=${encodeURIComponent(query)}`, {
          cache: "no-store",
          headers: authHeaders,
        }),
      ]);

      const imgJson = await imgRes.json().catch(() => ({}));
      const vidJson = await vidRes.json().catch(() => ({}));


      if (!imgRes.ok) {
        throw new Error(
          imgJson?.error || `Stock image search failed (${imgRes.status})`
        );
      }

      if (!vidRes.ok) {
        throw new Error(
          vidJson?.error || `Stock video search failed (${vidRes.status})`
        );
      }

      const rawImages = Array.isArray(imgJson?.images)
        ? imgJson.images
        : Array.isArray(imgJson)
        ? imgJson
        : [];

      const rawVideos = Array.isArray(vidJson?.videos)
        ? vidJson.videos
        : Array.isArray(vidJson?.results)
        ? vidJson.results
        : Array.isArray(vidJson)
        ? vidJson
        : [];

      let images = rawImages
        .map((img, index) => ({
          id: `img_${img.id || index}`,
          thumb:
            img.thumb || img.preview || img.thumbnail || img.full || img.url || "",
          full: img.full || img.url || img.image || img.src || img.thumb || "",
          url: img.full || img.url || img.image || img.src || img.thumb || "",
          type: "image",
          duration: "",
          raw: img,
        }))
        .filter((item) => item.url);

      let videos = rawVideos
        .map((vid, index) => {
          const vfLink =
            (Array.isArray(vid.video_files) && vid.video_files.length > 0)
              ? (vid.video_files.find(f => f?.quality === "hd")?.link ||
                 vid.video_files.find(f => f?.file_type === "video/mp4")?.link ||
                 vid.video_files[0]?.link)
              : null;
          const resolvedUrl =
            vid.full ||
            vid.url ||
            vid.video ||
            vid.videoUrl ||
            vid.file ||
            vid.playbackUrl ||
            vid.streamUrl ||
            vfLink ||
            "";
          return {
            id: `vid_${vid.id || index}`,
            thumb:
              vid.thumb ||
              vid.preview ||
              vid.thumbnail ||
              vid.poster ||
              vid.image ||
              "",
            full: resolvedUrl,
            url: resolvedUrl,
            type: "video",
            duration: vid.duration || vid.length || "",
            raw: vid,
          };
        })
        .filter((item) => item.url);

      if (!videos.length) {
        const shorter = query.split(/\s+/).slice(0, 4).join(" ").trim();

        if (shorter && shorter !== query) {
          const retryRes = await fetch(
            `${apiBase}/api/stock/videos?q=${encodeURIComponent(shorter)}`,
            { cache: "no-store", headers: authHeaders }
          );

          const retryJson = await retryRes.json().catch(() => ({}));


          if (retryRes.ok) {
            const retryVideos = Array.isArray(retryJson?.videos)
              ? retryJson.videos
              : Array.isArray(retryJson?.results)
              ? retryJson.results
              : Array.isArray(retryJson)
              ? retryJson
              : [];

            videos = retryVideos
              .map((vid, index) => {
                const vfLink =
                  (Array.isArray(vid.video_files) && vid.video_files.length > 0)
                    ? (vid.video_files.find(f => f?.quality === "hd")?.link ||
                       vid.video_files.find(f => f?.file_type === "video/mp4")?.link ||
                       vid.video_files[0]?.link)
                    : null;
                const resolvedUrl =
                  vid.full ||
                  vid.url ||
                  vid.video ||
                  vid.videoUrl ||
                  vid.file ||
                  vid.playbackUrl ||
                  vid.streamUrl ||
                  vfLink ||
                  "";
                return {
                  id: `vid_${vid.id || index}`,
                  thumb:
                    vid.thumb ||
                    vid.preview ||
                    vid.thumbnail ||
                    vid.poster ||
                    vid.image ||
                    "",
                  full: resolvedUrl,
                  url: resolvedUrl,
                  type: "video",
                  duration: vid.duration || vid.length || "",
                  raw: vid,
                };
              })
              .filter((item) => item.url);
          }
        }
      }

      const merged = dedupeAssets([...videos, ...images]);
      const sceneNarrationWords = (activeSceneObj?.narration || '').split(/\s+/).filter(Boolean).length;
      const sceneMinDuration = sceneNarrationWords > 0 ? Math.max(4, Math.ceil(sceneNarrationWords / 2.2)) : 0;
      const sorted = sortStockResults(merged, query, sceneMinDuration);


      setStockItems(sorted);

      if (!videos.length) {
        setStockErr("No videos were returned by /api/stock/videos for this search.");
      }
    } catch (e) {
      setStockErr(e?.message || "Stock search failed");
      setStockItems([]);
    } finally {
      setStockLoading(false);
    }
  };

  useEffect(() => {
    if (tab !== "stock") return;

    const next = currentSceneQuery || "";
    if (!next.trim()) return;
    if (next === lastAutoQueryRef.current) return;

    lastAutoQueryRef.current = next;
    setQ(next);
    searchStock(next);
  }, [tab, currentSceneQuery, activeScene]);

  const onStockKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      lastAutoQueryRef.current = q.trim();
      searchStock(q);
    }
  };

  const onDragStartPayload = (e, payloadObj) => {
    try {
      e.dataTransfer.setData(
        "application/onyx-media",
        JSON.stringify(payloadObj)
      );
      e.dataTransfer.effectAllowed = "copy";
    } catch (_) {}
  };

  const pinnedStockItem = useMemo(() => {
    if (!currentSceneAsset || !activeSceneObj?.stockSource) return null;
    if (
      activeSceneObj.stockSource !== "stock" &&
      activeSceneObj.stockSource !== "fallback"
    ) {
      return null;
    }
    return currentSceneAsset;
  }, [currentSceneAsset, activeSceneObj]);

  const otherStockItems = useMemo(() => {
    if (!pinnedStockItem) return stockItems;
    return stockItems.filter(
      (item) => (item.full || item.url) !== pinnedStockItem.url
    );
  }, [stockItems, pinnedStockItem]);

  const videoStockItems = useMemo(() => {
    return otherStockItems.filter((item) => item.type === "video");
  }, [otherStockItems]);

  const imageStockItems = useMemo(() => {
    return otherStockItems.filter((item) => item.type !== "video");
  }, [otherStockItems]);

  return (
    <div className="panelStickyShell">
      <div className="panelStickyTop">
        <div className="panelTabs">
          <button
            className={tab === "stock" ? "active" : ""}
            onClick={() => setTab("stock")}
          >
            Stock
          </button>
          <button
            className={tab === "aistudio" ? "active" : ""}
            onClick={() => setTab("aistudio")}
          >
            AI Studio
          </button>
          <div className="panelTabsSpacer" />
        </div>

        {tab === "stock" ? (
          <div style={{ marginTop: 10 }}>
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={onStockKeyDown}
                placeholder="Search stock"
                style={{ flex: 1 }}
              />
              <button
                className="smallBtn primary"
                onClick={() => {
                  lastAutoQueryRef.current = q.trim();
                  searchStock(q);
                }}
                disabled={stockLoading}
              >
                {stockLoading ? "Searching..." : "Search"}
              </button>
            </div>

            {stockErr ? (
              <div style={{ marginTop: 10, color: "#f87171", fontSize: 12 }}>
                {stockErr}
              </div>
            ) : null}
          </div>
        ) : null}

        {tab === "aistudio" ? (
          <div style={{ marginTop: 10 }}>
            <div className="panelTitle">AI Studio</div>
          </div>
        ) : null}
      </div>

      <div className="panelStickyContent">
        {tab === "stock" && (
          <div className="panelBlock" style={{ marginTop: 12 }}>
            {pinnedStockItem ? (
              <div style={{ marginTop: 4 }}>
                <div className="panelMuted" style={{ marginBottom: 8 }}>
                  Current scene asset
                </div>
                <div className="mediaGrid">
                  <MediaTile
                    item={pinnedStockItem}
                    label="stock"
                    query={currentSceneQuery}
                    onSelect={onSelect}
                    onDragStartPayload={onDragStartPayload}
                    pinned
                  />
                </div>
              </div>
            ) : null}

            <div style={{ marginTop: 14 }}>
              <div className="panelMuted" style={{ marginBottom: 8 }}>
                Related results
              </div>

              {stockLoading ? (
                <div className="emptyState">Searching stock…</div>
              ) : (
                <>
                  <div style={{ marginBottom: 14 }}>
                    <div className="panelMuted" style={{ marginBottom: 8 }}>
                      Videos ({videoStockItems.length})
                    </div>

                    {videoStockItems.length ? (
                      <div className="mediaGrid">
                        {videoStockItems.map((item, idx) => (
                          <MediaTile
                            key={`${item.id || item.url}_${idx}`}
                            item={item}
                            label="stock"
                            query={currentSceneQuery}
                            onSelect={onSelect}
                            onDragStartPayload={onDragStartPayload}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="emptyState">No video results found.</div>
                    )}
                  </div>

                  <div>
                    <div className="panelMuted" style={{ marginBottom: 8 }}>
                      Images ({imageStockItems.length})
                    </div>

                    {imageStockItems.length ? (
                      <div className="mediaGrid">
                        {imageStockItems.map((item, idx) => (
                          <MediaTile
                            key={`${item.id || item.url}_${idx}`}
                            item={item}
                            label="stock"
                            query={currentSceneQuery}
                            onSelect={onSelect}
                            onDragStartPayload={onDragStartPayload}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="emptyState">No image results found.</div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {tab === "aistudio" && (
          <div className="panelBlock" style={{ marginTop: 12 }}>
            {aiStudioItems.length ? (
              <div className="mediaGrid">
                {aiStudioItems.map((item) => {
                  const aiPayload = {
                    kind: "media",
                    source: "ai",
                    mediaType: item.mediaType || "video",
                    thumb: item.thumbnail || item.url,
                    url: item.url,
                    duration: item.duration || 5,
                  };
                  return (
                  <div
                    key={item.id}
                    className="mediaTile"
                    style={{ cursor: "pointer" }}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("application/onyx-media", JSON.stringify({
                        kind: "media",
                        url: item.url,
                        mediaUrl: item.url,
                        thumbnail: item.thumbnail || item.url,
                        mediaType: item.mediaType || "video",
                        source: "ai",
                        stockThumb: item.thumbnail || item.url,
                      }));
                    }}
                    onClick={() => onSelect?.(aiPayload)}
                    onDoubleClick={() => onSelect?.(aiPayload)}
                  >
                    <div
                      className="mediaThumb"
                      style={{
                        borderRadius: 12,
                        overflow: "hidden",
                        background: "var(--onyx-surface)",
                      }}
                    >
                      {item.thumbnail ? (
                        <img
                          src={item.thumbnail}
                          alt=""
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                            display: "block",
                          }}
                        />
                      ) : (
                        <div className="mediaThumbPlaceholder">AI</div>
                      )}
                    </div>

                    <div style={{ marginTop: 8, fontSize: 12, fontWeight: 700 }}>
                      {item.name || `Scene ${item.sceneId}`}
                    </div>

                    <button
                      className="smallBtn primary"
                      style={{ marginTop: 8 }}
                      onClick={(e) => { e.stopPropagation(); onSelect?.(aiPayload); }}
                    >
                      Use on Scene
                    </button>
                    <button
                      className="smallBtn"
                      style={{ marginTop: 4, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#f87171" }}
                      onClick={async (e) => {
                        e.stopPropagation();
                        setAiStudioItems(prev => prev.filter(i => i.id !== item.id));
                        try {
                          const h = await getAuthHeaders();
                          await fetch(`/api/ai-studio-library/${item.id}`, { method: "DELETE", headers: h });
                        } catch {}
                      }}
                    >
                      Remove
                    </button>
                  </div>
                  );
                })}
              </div>
            ) : (
              <div className="emptyState">No AI Studio items saved yet.</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}