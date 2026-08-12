// Pop-out file manager, Phase 1 -- full-screen asset management overlay,
// separate from AssetsLibraryPanel.jsx's cramped in-editor sidebar (which
// stays as-is for drag/apply-to-scene use). Reuses the same media_assets/
// media_folders API surface, but as a single filterable grid/list instead
// of collapsible per-type sections, plus bulk select/move/delete -- none of
// which the sidebar panel has room or need for.
import React, { useEffect, useState } from "react";
import { getAuthHeaders } from "../utils/auth.js";

const TYPE_OPTIONS = [
  { value: "", label: "All types" },
  { value: "music", label: "Music" },
  { value: "sfx", label: "Sound Effects" },
  { value: "video", label: "Video" },
  { value: "image", label: "Images" },
  { value: "logo", label: "Logos / Brand Assets" },
  { value: "ai_generated", label: "AI-Generated" },
];

function isAudioUrl(url = "") {
  return /\.(mp3|wav|ogg|m4a|aac|flac|webm)(\?|#|$)/i.test(String(url));
}
function isVideoUrl(url = "") {
  return /\.(mp4|webm|mov|m4v)(\?|#|$)/i.test(String(url));
}
function detectMediaKind(item) {
  if (item.type === "music" || item.type === "sfx") return "audio";
  if (item.type === "video") return "video";
  if (item.type === "image" || item.type === "logo") return "image";
  if (isVideoUrl(item.url)) return "video";
  if (isAudioUrl(item.url)) return "audio";
  return "image";
}

function Thumb({ item, size }) {
  const kind = detectMediaKind(item);
  const box = { width: size, height: size, borderRadius: 6, flexShrink: 0, background: "var(--onyx-surface-3)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" };
  if (kind === "image") return <img src={item.url} alt="" style={{ ...box, objectFit: "cover" }} />;
  if (kind === "video") return <div style={{ ...box, fontSize: size > 60 ? 24 : 14 }}>🎬</div>;
  return <div style={{ ...box, fontSize: size > 60 ? 24 : 14 }}>🔊</div>;
}

export default function FileManagerModal({ onClose }) {
  const [brands, setBrands] = useState([]);
  const [brandId, setBrandId] = useState("");
  const [folders, setFolders] = useState([]);
  const [folderId, setFolderId] = useState("");
  const [type, setType] = useState("");
  const [query, setQuery] = useState("");
  const [view, setView] = useState("grid");

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selected, setSelected] = useState(new Set());
  const [confirmingBulkDelete, setConfirmingBulkDelete] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const headers = await getAuthHeaders();
        const [brandsRes, foldersRes] = await Promise.all([
          fetch("/api/brands", { cache: "no-store", headers }),
          fetch("/api/media/folders", { cache: "no-store", headers }),
        ]);
        const brandsData = await brandsRes.json().catch(() => ({}));
        if (brandsRes.ok && Array.isArray(brandsData?.brands)) setBrands(brandsData.brands);
        const foldersData = await foldersRes.json().catch(() => []);
        if (Array.isArray(foldersData)) setFolders(foldersData);
      } catch (err) {
        console.error("file manager init error", err);
      }
    })();
  }, []);

  const filterKey = `${brandId || "all"}|${folderId || "all"}|${type || "all"}|${query || ""}`;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams();
        if (type) params.set("type", type);
        if (brandId) params.set("brand_id", brandId);
        if (folderId) params.set("folder_id", folderId);
        if (query) params.set("q", query);
        const res = await fetch(`/api/media/assets?${params.toString()}`, { cache: "no-store", headers: await getAuthHeaders() });
        const data = await res.json().catch(() => []);
        if (!cancelled) { setItems(Array.isArray(data) ? data : []); setSelected(new Set()); }
      } catch (err) {
        console.error("file manager assets load error", err);
        if (!cancelled) { setError("Failed to load assets."); setItems([]); }
      }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterKey]);

  const toggleSelect = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelected((prev) => (prev.size === items.length ? new Set() : new Set(items.map((i) => i.id))));
  };

  const deleteOne = async (id) => {
    if (!window.confirm("Remove this asset from your library? This can't be undone.")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/media/assets/${id}`, { method: "DELETE", headers: await getAuthHeaders() });
      if (res.ok) {
        setItems((prev) => prev.filter((i) => i.id !== id));
        setSelected((prev) => { const next = new Set(prev); next.delete(id); return next; });
      }
    } catch (err) {
      console.error("asset delete error", err);
    }
    setBusy(false);
  };

  const bulkDelete = async () => {
    setBusy(true);
    try {
      const ids = [...selected];
      const res = await fetch("/api/media/assets/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(await getAuthHeaders()) },
        body: JSON.stringify({ ids }),
      });
      if (res.ok) {
        setItems((prev) => prev.filter((i) => !selected.has(i.id)));
        setSelected(new Set());
      }
    } catch (err) {
      console.error("bulk delete error", err);
    }
    setConfirmingBulkDelete(false);
    setBusy(false);
  };

  const bulkMove = async (newFolderId) => {
    setBusy(true);
    try {
      const ids = [...selected];
      const res = await fetch("/api/media/assets/bulk-folder", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...(await getAuthHeaders()) },
        body: JSON.stringify({ ids, folder_id: newFolderId || null }),
      });
      if (res.ok) {
        setItems((prev) => prev.map((i) => (selected.has(i.id) ? { ...i, folder_id: newFolderId || null } : i)));
        setSelected(new Set());
      }
    } catch (err) {
      console.error("bulk move error", err);
    }
    setBusy(false);
  };

  const selectStyle = { background: "var(--onyx-surface)", border: "1px solid var(--onyx-hairline-strong)", color: "var(--onyx-text)", borderRadius: 6, padding: "7px 10px", fontSize: 12 };

  return (
    <div
      onClick={(e) => e.target === e.currentTarget && onClose()}
      style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
    >
      <div style={{ background: "var(--onyx-bg-2)", border: "1px solid var(--onyx-hairline-strong)", borderRadius: 14, width: "100%", maxWidth: 1100, height: "85vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid var(--onyx-hairline-strong)" }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: "var(--onyx-text)" }}>File Manager</div>
          <button onClick={onClose} aria-label="Close" style={{ background: "none", border: "none", color: "var(--onyx-text-faint)", fontSize: 16, cursor: "pointer" }}>✕</button>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, padding: "14px 20px", borderBottom: "1px solid var(--onyx-hairline-strong)", alignItems: "center" }}>
          <select value={brandId} onChange={(e) => setBrandId(e.target.value)} style={selectStyle}>
            <option value="">All brands</option>
            {brands.map((b) => (
              <option key={b.id} value={b.id}>{b.brand_label || "Untitled brand"}</option>
            ))}
          </select>

          <select value={folderId} onChange={(e) => setFolderId(e.target.value)} style={selectStyle}>
            <option value="">All folders</option>
            <option value="none">Unfiled</option>
            {folders.map((f) => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>

          <select value={type} onChange={(e) => setType(e.target.value)} style={selectStyle}>
            {TYPE_OPTIONS.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>

          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search assets by name..."
            style={{ ...selectStyle, flex: 1, minWidth: 160 }}
          />

          <div style={{ display: "flex", border: "1px solid var(--onyx-hairline-strong)", borderRadius: 6, overflow: "hidden" }}>
            <button
              onClick={() => setView("grid")}
              title="Grid view"
              style={{ padding: "6px 10px", fontSize: 12, border: "none", cursor: "pointer", background: view === "grid" ? "var(--onyx-cyan-deep)" : "var(--onyx-surface)", color: view === "grid" ? "var(--btn-primary-text)" : "var(--onyx-text-faint)" }}
            >⊞</button>
            <button
              onClick={() => setView("list")}
              title="List view"
              style={{ padding: "6px 10px", fontSize: 12, border: "none", cursor: "pointer", background: view === "list" ? "var(--onyx-cyan-deep)" : "var(--onyx-surface)", color: view === "list" ? "var(--btn-primary-text)" : "var(--onyx-text-faint)" }}
            >☰</button>
          </div>
        </div>

        {items.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 20px", borderBottom: "1px solid var(--onyx-hairline-strong)", fontSize: 12 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", color: "var(--onyx-text-faint)" }}>
              <input type="checkbox" checked={selected.size === items.length && items.length > 0} onChange={toggleSelectAll} />
              Select all
            </label>
            <span style={{ color: "var(--onyx-text-faint)" }}>{items.length} asset{items.length === 1 ? "" : "s"}</span>

            {selected.size > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: "auto" }}>
                <span style={{ color: "var(--onyx-text)", fontWeight: 600 }}>{selected.size} selected</span>
                <select
                  disabled={busy}
                  value=""
                  onChange={(e) => e.target.value && bulkMove(e.target.value === "none" ? null : e.target.value)}
                  style={{ ...selectStyle, padding: "5px 8px" }}
                >
                  <option value="">Move to folder...</option>
                  <option value="none">Unfiled</option>
                  {folders.map((f) => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
                {confirmingBulkDelete ? (
                  <>
                    <span style={{ color: "var(--onyx-rose)" }}>Delete {selected.size} assets?</span>
                    <button onClick={bulkDelete} disabled={busy} style={{ padding: "5px 10px", borderRadius: 6, fontSize: 11, fontWeight: 700, background: "var(--onyx-rose)", border: "none", color: "#fff", cursor: "pointer" }}>Delete</button>
                    <button onClick={() => setConfirmingBulkDelete(false)} style={{ padding: "5px 10px", borderRadius: 6, fontSize: 11, background: "var(--onyx-surface)", border: "1px solid var(--onyx-hairline-strong)", color: "var(--onyx-text-faint)", cursor: "pointer" }}>Cancel</button>
                  </>
                ) : (
                  <button onClick={() => setConfirmingBulkDelete(true)} disabled={busy} style={{ padding: "5px 10px", borderRadius: 6, fontSize: 11, fontWeight: 700, background: "rgba(248,113,113,0.12)", border: "1px solid rgba(248,113,113,0.3)", color: "var(--onyx-rose)", cursor: "pointer" }}>
                    Delete ({selected.size})
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
          {loading ? (
            <div style={{ fontSize: 13, color: "var(--onyx-text-faint)" }}>Loading...</div>
          ) : error ? (
            <div style={{ fontSize: 13, color: "var(--onyx-rose)" }}>{error}</div>
          ) : items.length === 0 ? (
            <div style={{ fontSize: 13, color: "var(--onyx-text-faint)" }}>No assets match these filters.</div>
          ) : view === "grid" ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 12 }}>
              {items.map((item) => (
                <div key={item.id} style={{ position: "relative", border: `1px solid ${selected.has(item.id) ? "var(--onyx-cyan-deep)" : "var(--onyx-hairline-strong)"}`, borderRadius: 8, padding: 8, background: "var(--onyx-surface)" }}>
                  <input
                    type="checkbox"
                    checked={selected.has(item.id)}
                    onChange={() => toggleSelect(item.id)}
                    style={{ position: "absolute", top: 10, left: 10, zIndex: 1 }}
                  />
                  <button
                    onClick={() => deleteOne(item.id)}
                    disabled={busy}
                    title="Delete"
                    style={{ position: "absolute", top: 8, right: 8, width: 22, height: 22, borderRadius: "50%", border: "none", background: "rgba(0,0,0,0.55)", color: "#f87171", fontSize: 11, cursor: "pointer", zIndex: 1 }}
                  >✕</button>
                  <Thumb item={item} size={122} />
                  <div style={{ marginTop: 6, fontSize: 11, color: "var(--onyx-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {item.name || "Untitled"}
                  </div>
                  <div style={{ fontSize: 10, color: "var(--onyx-text-faint)" }}>
                    {item.folder_id ? (folders.find((f) => f.id === item.folder_id)?.name || "Filed") : "Unfiled"}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ display: "grid", gap: 6 }}>
              {items.map((item) => (
                <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 10, border: `1px solid ${selected.has(item.id) ? "var(--onyx-cyan-deep)" : "var(--onyx-hairline-strong)"}`, borderRadius: 8, padding: "6px 10px", background: "var(--onyx-surface)" }}>
                  <input type="checkbox" checked={selected.has(item.id)} onChange={() => toggleSelect(item.id)} />
                  <Thumb item={item} size={32} />
                  <div style={{ flex: 1, minWidth: 0, fontSize: 12, color: "var(--onyx-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {item.name || "Untitled"}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--onyx-text-faint)", flexShrink: 0 }}>
                    {item.folder_id ? (folders.find((f) => f.id === item.folder_id)?.name || "Filed") : "Unfiled"}
                  </div>
                  <button
                    onClick={() => deleteOne(item.id)}
                    disabled={busy}
                    title="Delete"
                    style={{ padding: "4px 8px", borderRadius: 6, fontSize: 11, background: "rgba(248,113,113,0.12)", border: "1px solid rgba(248,113,113,0.3)", color: "var(--onyx-rose)", cursor: "pointer", flexShrink: 0 }}
                  >Delete</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
