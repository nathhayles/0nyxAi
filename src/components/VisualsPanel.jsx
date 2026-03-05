import React, { useEffect, useMemo, useRef, useState } from "react";

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

export default function VisualsPanel({ tab, setTab, onUseAiStudioItem, libraryKey }) {
  const API_BASE = useMemo(() => {
    const host = window.location.hostname || "localhost";
    return `http://${host}:4000`;
  }, []);

  const [uploads, setUploads] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);

  const loadMedia = async () => {
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/media`, { cache: "no-store" });
      if (!res.ok) throw new Error(`GET /api/media failed: ${res.status}`);
      const data = await res.json();

      const items = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : [];
      setUploads(
        items
          .map((it) => ({
            name: it?.name || it?.fileName || it?.filename || "media",
            url: normalizeUrl(it?.url || it?.publicUrl || it?.publicPath, API_BASE),
          }))
          .filter((it) => it.url)
      );
    } catch (e) {
      console.error("Media load error:", e);
      setError("Failed to load uploads (backend not reachable or API error).");
      setUploads([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMedia();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const uploadOne = async (file) => {
    const fd = new FormData();
    fd.append("file", file);

    const res = await fetch(`${API_BASE}/api/media/upload`, {
      method: "POST",
      body: fd,
    });

    let payload = null;
    try {
      payload = await res.json();
    } catch {
      // ignore
    }

    if (!res.ok) {
      const msg = payload?.error || payload?.message || `Upload failed: HTTP ${res.status}`;
      throw new Error(msg);
    }

    await loadMedia();
  };

  const uploadFiles = async (files) => {
    const list = Array.from(files || []).filter(Boolean);
    if (!list.length) return;

    setUploading(true);
    setError("");
    try {
      for (const f of list) await uploadOne(f);
    } catch (e) {
      console.error("Upload error:", e);
      setError(e?.message || "Upload failed.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const onPickFiles = (e) => uploadFiles(e.target.files);

  const onDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const dt = e.dataTransfer;
    if (dt?.files?.length) uploadFiles(dt.files);
  };

  const onDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const renderThumb = (item) => {
    const u = item.url;
    const key = `${item.name}-${u}`;
    const video = isVideo(u) || isVideo(item.name);
    const img = isImage(u) || isImage(item.name);

    const mediaType = video ? "video" : "image";
    const thumb = u; // backend currently returns playable asset URL; use same for thumb

    return (
      <div
        key={key}
        className="mediaItem"
        draggable
        onDragStart={(ev) => {
          // IMPORTANT: Editor.jsx expects "application/onyx-media" with kind:"media"
          const payload = { kind: "media", url: u, thumb, mediaType };
          ev.dataTransfer.setData("application/onyx-media", JSON.stringify(payload));
          ev.dataTransfer.effectAllowed = "copy";
        }}
        style={{
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 10,
          padding: 8,
          background: "rgba(0,0,0,0.25)",
          cursor: "grab",
        }}
        title={item.name}
      >
        <div style={{ width: "100%", aspectRatio: "16/9", borderRadius: 10, overflow: "hidden", background: "rgba(255,255,255,0.04)" }}>
          {video ? (
            <video src={u} muted playsInline preload="metadata" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
          ) : img ? (
            <img src={u} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
          ) : (
            <div style={{ width: "100%", height: "100%", display: "grid", placeItems: "center", fontSize: 12, opacity: 0.7 }}>FILE</div>
          )}
        </div>

        <div style={{ marginTop: 8, fontSize: 11, opacity: 0.85, lineHeight: 1.2, wordBreak: "break-word" }}>{item.name}</div>
      </div>
    );
  };

  return (
    <div className="panelBody">
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10 }}>
        <button className={tab === "uploads" ? "tabBtn active" : "tabBtn"} onClick={() => setTab("uploads")}>
          Uploads
        </button>
        <button className={tab === "stock" ? "tabBtn active" : "tabBtn"} onClick={() => setTab("stock")}>
          Stock
        </button>
        <button className={tab === "ai" ? "tabBtn active" : "tabBtn"} onClick={() => setTab("ai")}>
          AI Studio
        </button>

        <div style={{ flex: 1 }} />
        <button className="tabBtn" onClick={loadMedia} disabled={loading || uploading}>
          Refresh
        </button>
      </div>

      {tab === "uploads" && (
        <div>
          <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 10 }}>
            Upload files or drag-drop into this box. Then drag thumbnails to the canvas.
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10 }}>
            <input ref={fileInputRef} type="file" multiple onChange={onPickFiles} />
            {uploading ? <div style={{ fontSize: 12, opacity: 0.8 }}>Uploading…</div> : null}
            {error ? <div style={{ fontSize: 12, color: "#f87171" }}>{error}</div> : null}
          </div>

          <div
            onDrop={onDrop}
            onDragOver={onDragOver}
            style={{
              border: "1px dashed rgba(255,255,255,0.25)",
              borderRadius: 12,
              padding: 10,
              minHeight: 140,
            }}
          >
            <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 10 }}>Drop media here</div>

            {loading ? (
              <div style={{ fontSize: 12, opacity: 0.8 }}>Loading…</div>
            ) : uploads.length ? (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {uploads.map(renderThumb)}
              </div>
            ) : (
              <div style={{ fontSize: 12, opacity: 0.7 }}>No uploads yet.</div>
            )}
          </div>
        </div>
      )}

      {tab === "stock" && <div className="panelMuted">Stock library not wired in this build.</div>}
      {tab === "ai" && <div className="panelMuted">AI Studio library not wired in this build.</div>}
    </div>
  );
}
