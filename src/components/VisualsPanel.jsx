import React, { useEffect, useMemo, useRef, useState } from "react";

function safeParse(raw, fallback) {
  try {
    const v = JSON.parse(raw);
    return v ?? fallback;
  } catch (_) {
    return fallback;
  }
}

async function uploadFiles(apiBase, files) {
  const form = new FormData();
  for (const f of files) form.append("files", f);

  const res = await fetch(`${apiBase}/api/media/upload`, {
    method: "POST",
    body: form,
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json?.error || `Upload failed (${res.status})`);
  }
  return json?.files || [];
}

export default function VisualsPanel({
  tab,
  setTab,
  onUseAiStudioItem,
  libraryKey,
  onPickMedia,
  apiBase = "http://localhost:4000",
}) {
  const [aiStudioItems, setAiStudioItems] = useState([]);

  // Uploads
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState("");
  const [uploadedItems, setUploadedItems] = useState([]);
  const fileInputRef = useRef(null);

  // Stock
  const [q, setQ] = useState("mountains");
  const [stockLoading, setStockLoading] = useState(false);
  const [stockErr, setStockErr] = useState("");
  const [stockImages, setStockImages] = useState([]);

  const refreshAiStudio = () => {
    const raw = localStorage.getItem(libraryKey);
    const list = safeParse(raw || "[]", []);
    setAiStudioItems(Array.isArray(list) ? list : []);
  };

  useEffect(() => {
    refreshAiStudio();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const canUseDragDrop = useMemo(() => true, []);

  const handleUploadPicked = async (files) => {
    if (!files || files.length === 0) return;
    setUploadErr("");
    setUploading(true);
    try {
      const out = await uploadFiles(apiBase, files);
      setUploadedItems((prev) => [...out, ...prev]);
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

  const searchStock = async () => {
    const query = String(q || "").trim();
    if (!query) return;
    setStockErr("");
    setStockLoading(true);
    try {
      const res = await fetch(`${apiBase}/api/stock/search?q=${encodeURIComponent(query)}`);
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || `Stock search failed (${res.status})`);
      setStockImages(Array.isArray(json?.images) ? json.images : []);
    } catch (e) {
      setStockErr(e?.message || "Stock search failed");
      setStockImages([]);
    } finally {
      setStockLoading(false);
    }
  };

  const onStockKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      searchStock();
    }
  };

  const dragStartPayload = (e, payloadObj) => {
    if (!canUseDragDrop) return;
    try {
      e.dataTransfer.setData("application/onyx-media", JSON.stringify(payloadObj));
      e.dataTransfer.effectAllowed = "copy";
    } catch (_) {}
  };

  const renderMediaTile = (item, label) => {
    const thumb = item?.thumb || item?.url;
    const full = item?.full || item?.url;
    const type = item?.type || "image";

    return (
      <div
        key={`${label}_${item?.id || item?.url || Math.random()}`}
        className="mediaTile"
        draggable
        onDragStart={(e) =>
          dragStartPayload(e, {
            kind: "media",
            source: label,
            mediaType: type,
            thumb: thumb,
            url: full,
          })
        }
        onDoubleClick={() => onPickMedia && onPickMedia({ mediaType: type, thumb, url: full })}
        title="Drag to canvas / Double-click to use"
      >
        <div className="mediaThumb">
          {thumb ? <img src={thumb} alt="" /> : <div className="mediaThumbPlaceholder">MEDIA</div>}
        </div>
      </div>
    );
  };

  return (
    <div>
      <div className="panelTabs">
        <button className={tab === "uploads" ? "active" : ""} onClick={() => setTab("uploads")}>
          Uploads
        </button>
        <button className={tab === "stock" ? "active" : ""} onClick={() => setTab("stock")}>
          Stock
        </button>
        <button className={tab === "aistudio" ? "active" : ""} onClick={() => setTab("aistudio")}>
          AI Studio
        </button>
        <div className="panelTabsSpacer" />
        <button className="smallBtn" onClick={refreshAiStudio}>
          Refresh
        </button>
      </div>

      {tab === "uploads" && (
        <div className="panelBlock">
          <div className="panelTitle">Uploads</div>
          <div className="panelMuted">Upload files or drag-drop into this box. Then drag thumbnails to the canvas.</div>

          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10 }}>
            <button
              className="smallBtn primary"
              onClick={() => fileInputRef.current && fileInputRef.current.click()}
              disabled={uploading}
              type="button"
            >
              {uploading ? "Uploading..." : "Upload files"}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              style={{ display: "none" }}
              onChange={(e) => handleUploadPicked(Array.from(e.target.files || []))}
            />
            {uploadErr ? <div style={{ color: "#f87171", fontSize: 12 }}>{uploadErr}</div> : null}
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

          <div className="mediaGrid" style={{ marginTop: 10 }}>
            {uploadedItems.length === 0 ? (
              <div className="emptyState">No uploads yet.</div>
            ) : (
              uploadedItems.map((it) =>
                renderMediaTile(
                  {
                    url: it.url,
                    thumb: it.url,
                    type: it.type || "image",
                    id: it.name,
                  },
                  "uploads"
                )
              )
            )}
          </div>
        </div>
      )}

      {tab === "stock" && (
        <div className="panelBlock">
          <div className="panelTitle">Stock Library</div>
          <div className="panelMuted">Search stock (backend proxy). Drag thumbnails to the canvas.</div>

          <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={onStockKeyDown}
              className="titleInput"
              style={{ width: "100%" }}
              placeholder="Search stock..."
            />
            <button className="smallBtn primary" onClick={searchStock} disabled={stockLoading}>
              {stockLoading ? "..." : "Search"}
            </button>
          </div>

          {stockErr ? <div style={{ color: "#f87171", fontSize: 12, marginBottom: 8 }}>{stockErr}</div> : null}

          <div className="stockGrid">
            {stockImages.map((img) =>
              renderMediaTile(
                {
                  id: img.id,
                  thumb: img.thumb,
                  url: img.full,
                  type: "image",
                },
                "stock"
              )
            )}
          </div>
        </div>
      )}

      {tab === "aistudio" && (
        <div className="panelBlock">
          <div className="panelTitle">AI Studio Library</div>
          <div className="panelMuted">Only AI-generated scenes saved here.</div>

          {aiStudioItems.length === 0 ? (
            <div className="emptyState">No AI Studio items yet.</div>
          ) : (
            <div className="aiStudioList">
              {aiStudioItems.map((it) => (
                <div key={it.id} className="aiItem">
                  <div className="aiThumb">
                    {it.thumbnail ? <img src={it.thumbnail} alt={it.name || "AI"} /> : <div className="aiThumbPlaceholder">AI</div>}
                  </div>
                  <div className="aiInfo">
                    <div className="aiName">{it.name || "Untitled AI Scene"}</div>
                    <div className="aiMeta">
                      {it.ratio || ""} • {it.createdAt ? new Date(it.createdAt).toLocaleString() : ""}
                    </div>
                  </div>
                  <div className="aiActions">
                    <button className="smallBtn primary" onClick={() => onUseAiStudioItem(it)}>
                      Use
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
