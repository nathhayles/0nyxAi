import React, { useEffect, useState } from "react";

function safeParse(raw, fallback) {
  try {
    const v = JSON.parse(raw);
    return v ?? fallback;
  } catch (_) {
    return fallback;
  }
}

export default function VisualsPanel({ tab, setTab, onUseAiStudioItem, libraryKey }) {
  const [aiStudioItems, setAiStudioItems] = useState([]);

  const refresh = () => {
    const raw = localStorage.getItem(libraryKey);
    const list = safeParse(raw || "[]", []);
    setAiStudioItems(Array.isArray(list) ? list : []);
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  return (
    <div>
      <div className="panelTabs">
        <button className={tab === "uploads" ? "active" : ""} onClick={() => setTab("uploads")}>Uploads</button>
        <button className={tab === "stock" ? "active" : ""} onClick={() => setTab("stock")}>Stock</button>
        <button className={tab === "aistudio" ? "active" : ""} onClick={() => setTab("aistudio")}>AI Studio</button>
        <div className="panelTabsSpacer" />
        <button className="smallBtn" onClick={refresh}>Refresh</button>
      </div>

      {tab === "uploads" && (
        <div className="panelBlock">
          <div className="panelTitle">Uploads</div>
          <div className="panelMuted">Drop files here (placeholder)</div>
          <div className="uploadDrop">Drop media here</div>
        </div>
      )}

      {tab === "stock" && (
        <div className="panelBlock">
          <div className="panelTitle">Stock</div>
          <div className="panelMuted">Stock library (placeholder)</div>
          <div className="stockGrid">
            <div className="stockTile">Stock 1</div>
            <div className="stockTile">Stock 2</div>
            <div className="stockTile">Stock 3</div>
            <div className="stockTile">Stock 4</div>
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
                    <div className="aiMeta">{it.ratio || ""} • {it.createdAt ? new Date(it.createdAt).toLocaleString() : ""}</div>
                  </div>
                  <div className="aiActions">
                    <button className="smallBtn primary" onClick={() => onUseAiStudioItem(it)}>Use</button>
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
