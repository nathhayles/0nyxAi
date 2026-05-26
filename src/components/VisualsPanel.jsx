import React, { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../supabaseClient.js";
import { getAuthHeaders } from "../utils/auth.js";

function extOf(nameOrUrl = "") {
  const clean = String(nameOrUrl).split("?")[0].split("#")[0];
  const parts = clean.split(".");
  return parts.length > 1 ? parts.pop().toLowerCase() : "";
}

function isVideo(nameOrUrl = "") {
  const ext = extOf(nameOrUrl);
  return ["mp4", "webm", "mov", "m4v"].includes(ext);
}

function isImage(nameOrUrl = "") {
  const ext = extOf(nameOrUrl);
  return ["png", "jpg", "jpeg", "gif", "webp"].includes(ext);
}

function normalizeUrl(url, apiBase) {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith("/")) return `${apiBase}${url}`;
  return `${apiBase}/${url}`;
}

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
  if (!source) return "mountains";

  return (
    source
      .replace(/\r\n/g, " ")
      .replace(/\n/g, " ")
      .replace(/[^\w\s-]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .split(/\s+/)
      .slice(0, 8)
      .join(" ") || "mountains"
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

  const [videoDuration, setVideoDuration] = useState(initialDuration);
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

    const onLoaded = () => setVideoDuration(formatDuration(vid.duration));
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
      onDoubleClick={handleDoubleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      title="Drag to canvas or double-click to use"
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
          background: "#0b1220",
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
  onUseAiStudioItem,
  libraryKey,
  onSelect,
  apiBase = "",
  activeScene,
  activeSceneObj,
}) {
  const [aiStudioItems, setAiStudioItems] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState("");
  const [uploadedItems, setUploadedItems] = useState([]);
  const fileInputRef = useRef(null);

  const [q, setQ] = useState("mountains");
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

  const refreshAiStudio = () => {
    const raw = localStorage.getItem(libraryKey);
    const list = (() => {
      try {
        const parsed = JSON.parse(raw || "[]");
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    })();

    setAiStudioItems(list);
  };

  const fetchUploads = async () => {
    try {
      const res = await fetch(`${apiBase}/api/media`, { cache: "no-store", headers: await getAuthHeaders() });
      const json = await res.json().catch(() => []);
      const items = Array.isArray(json)
        ? json
        : Array.isArray(json?.items)
        ? json.items
        : [];

      setUploadedItems(
        items.map((it) => ({
          name: it?.name || it?.fileName || it?.filename || "media",
          url: normalizeUrl(
            it?.url || it?.publicUrl || it?.publicPath,
            apiBase
          ),
          deleteUrl: it?.url || it?.publicUrl || it?.publicPath || "",
          thumb: normalizeUrl(
            it?.thumbnail ||
              it?.thumb ||
              it?.preview ||
              it?.poster ||
              it?.url ||
              it?.publicUrl ||
              it?.publicPath,
            apiBase
          ),
          type:
            it?.type ||
            (isVideo(it?.url || it?.publicUrl || "") ? "video" : "image"),
          duration: it?.duration || "",
        }))
      );
    } catch (e) {
      console.error("Failed to load uploads", e);
    }
  };

  useEffect(() => {
    refreshAiStudio();
    if (tab === "uploads") fetchUploads();
  }, [tab, libraryKey]);

  const handleUploadPicked = async (files) => {
    if (!files || files.length === 0) return;

    setUploadErr("");
    setUploading(true);

    try {
      const form = new FormData();
      for (const file of files) form.append("files", file);

      const res = await fetch(`${apiBase}/api/media/upload`, {
        method: "POST",
        headers: await getAuthHeaders(),
        body: form,
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || `Upload failed (${res.status})`);

      await fetchUploads();
    } catch (e) {
      setUploadErr(e?.message || "Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const onUploadsDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!e.dataTransfer?.files || e.dataTransfer.files.length === 0) return;
    await handleUploadPicked(Array.from(e.dataTransfer.files));
  };

  const deleteUploadedItem = async (item) => {
    try {
      const target = item?.deleteUrl || item?.url || "";
      if (target) {
        await fetch(
          `${apiBase}/api/media?url=${encodeURIComponent(target)}&name=${encodeURIComponent(
            item?.name || ""
          )}`,
          {
            method: "DELETE",
            headers: await getAuthHeaders(),
          }
        ).catch(() => null);
      }
    } catch (_) {}

    setUploadedItems((prev) => prev.filter((x) => x.url !== item.url));
  };

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

      console.log("stock images raw:", imgJson);
      console.log("stock videos raw:", vidJson);

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
        .map((vid, index) => ({
          id: `vid_${vid.id || index}`,
          thumb:
            vid.thumb ||
            vid.preview ||
            vid.thumbnail ||
            vid.poster ||
            vid.image ||
            "",
          full:
            vid.full ||
            vid.url ||
            vid.video ||
            vid.videoUrl ||
            vid.file ||
            vid.playbackUrl ||
            vid.streamUrl ||
            "",
          url:
            vid.full ||
            vid.url ||
            vid.video ||
            vid.videoUrl ||
            vid.file ||
            vid.playbackUrl ||
            vid.streamUrl ||
            "",
          type: "video",
          duration: vid.duration || vid.length || "",
          raw: vid,
        }))
        .filter((item) => item.url);

      if (!videos.length) {
        const shorter = query.split(/\s+/).slice(0, 4).join(" ").trim();

        if (shorter && shorter !== query) {
          const retryRes = await fetch(
            `${apiBase}/api/stock/videos?q=${encodeURIComponent(shorter)}`,
            { cache: "no-store", headers: authHeaders }
          );

          const retryJson = await retryRes.json().catch(() => ({}));

          console.log("stock videos retry raw:", retryJson);

          if (retryRes.ok) {
            const retryVideos = Array.isArray(retryJson?.videos)
              ? retryJson.videos
              : Array.isArray(retryJson?.results)
              ? retryJson.results
              : Array.isArray(retryJson)
              ? retryJson
              : [];

            videos = retryVideos
              .map((vid, index) => ({
                id: `vid_${vid.id || index}`,
                thumb:
                  vid.thumb ||
                  vid.preview ||
                  vid.thumbnail ||
                  vid.poster ||
                  vid.image ||
                  "",
                full:
                  vid.full ||
                  vid.url ||
                  vid.video ||
                  vid.videoUrl ||
                  vid.file ||
                  vid.playbackUrl ||
                  vid.streamUrl ||
                  "",
                url:
                  vid.full ||
                  vid.url ||
                  vid.video ||
                  vid.videoUrl ||
                  vid.file ||
                  vid.playbackUrl ||
                  vid.streamUrl ||
                  "",
                type: "video",
                duration: vid.duration || vid.length || "",
                raw: vid,
              }))
              .filter((item) => item.url);
          }
        }
      }

      const merged = dedupeAssets([...videos, ...images]);
      const sceneNarrationWords = (activeSceneObj?.narration || '').split(/\s+/).filter(Boolean).length;
      const sceneMinDuration = sceneNarrationWords > 0 ? Math.max(4, Math.ceil(sceneNarrationWords / 2.2)) : 0;
      const sorted = sortStockResults(merged, query, sceneMinDuration);

      console.log("mapped videos:", videos);
      console.log("mapped images:", images);
      console.log("final sorted stock items:", sorted);

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

    const next = currentSceneQuery || "mountains";
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
            className={tab === "uploads" ? "active" : ""}
            onClick={() => setTab("uploads")}
          >
            Uploads
          </button>
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
          <button className="smallBtn" onClick={refreshAiStudio}>
            Refresh
          </button>
        </div>

        {tab === "stock" ? (
          <div style={{ marginTop: 10 }}>
            <div className="panelTitle">Stock Library</div>
            <div className="panelMuted">
              Search stock images and videos. The current scene search is loaded
              automatically when you switch scenes.
            </div>

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

            {activeSceneObj ? (
              <div style={{ marginTop: 10, fontSize: 12, opacity: 0.8 }}>
                Scene {activeSceneObj.id} query: <b>{currentSceneQuery || "(none)"}</b>
              </div>
            ) : null}

            {stockErr ? (
              <div style={{ marginTop: 10, color: "#f87171", fontSize: 12 }}>
                {stockErr}
              </div>
            ) : null}
          </div>
        ) : null}

        {tab === "uploads" ? (
          <div style={{ marginTop: 10 }}>
            <div className="panelTitle">Uploads</div>
            <div className="panelMuted">
              Upload files or drag-drop into this box. Then drag thumbnails to the
              canvas or double-click to use on the highlighted scene.
            </div>

            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10 }}>
              <button
                className="smallBtn primary"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                type="button"
              >
                {uploading ? "Uploading..." : "Upload"}
              </button>

              <input
                ref={fileInputRef}
                type="file"
                multiple
                style={{ display: "none" }}
                onChange={(e) =>
                  handleUploadPicked(Array.from(e.target.files || []))
                }
              />

              {uploadErr ? (
                <div style={{ color: "#f87171", fontSize: 12 }}>{uploadErr}</div>
              ) : null}
            </div>

            <div
              className="uploadDrop"
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "copy";
              }}
              onDrop={onUploadsDrop}
            >
              Drop media here
            </div>
          </div>
        ) : null}

        {tab === "aistudio" ? (
          <div style={{ marginTop: 10 }}>
            <div className="panelTitle">AI Studio</div>
          </div>
        ) : null}
      </div>

      <div className="panelStickyContent">
        {tab === "uploads" && (
          <div className="panelBlock" style={{ marginTop: 12 }}>
            <div className="mediaGrid" style={{ marginTop: 10 }}>
              {uploadedItems.length === 0 ? (
                <div className="emptyState">No uploads yet.</div>
              ) : (
                uploadedItems.map((it, idx) => (
                  <MediaTile
                    key={`${it.url || it.name || "upload"}_${idx}`}
                    item={it}
                    label="uploads"
                    query=""
                    onSelect={onSelect}
                    onDragStartPayload={onDragStartPayload}
                    onDelete={deleteUploadedItem}
                    showDelete
                  />
                ))
              )}
            </div>
          </div>
        )}

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
                {aiStudioItems.map((item) => (
                  <div
                    key={item.id}
                    className="mediaTile"
                    style={{ cursor: "grab" }}
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
                    onDoubleClick={() => onUseAiStudioItem?.(item)}
                  >
                    <div
                      className="mediaThumb"
                      style={{
                        borderRadius: 12,
                        overflow: "hidden",
                        background: "#0b1220",
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
                      onClick={() => onUseAiStudioItem?.(item)}
                    >
                      Use on Scene
                    </button>
                  </div>
                ))}
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