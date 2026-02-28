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
  const [stockImages, setStockImages] = useState([]);
  const [stockQuery, setStockQuery] = useState("nature");
  const [loadingStock, setLoadingStock] = useState(false);

  const refreshAiStudio = () => {
    const raw = localStorage.getItem(libraryKey);
    const list = safeParse(raw || "[]", []);
    setAiStudioItems(Array.isArray(list) ? list : []);
  };

  const fetchStock = async (query = stockQuery) => {
    try {
      setLoadingStock(true);
      const res = await fetch(`http://localhost:4000/api/stock/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setStockImages(Array.isArray(data.images) ? data.images : []);
    } catch (err) {
      console.error("Stock fetch failed:", err);
      setStockImages([]);
    } finally {
      setLoadingStock(false);
    }
  };

  useEffect(() => {
    if (tab === "aistudio") refreshAiStudio();
    if (tab === "stock") fetchStock();
    // eslint-disable-next-line
  }, [tab]);

  return (
    <div>
      <div className="panelTabs">
        <button className={tab === "uploads" ? "active" : ""} onClick={() => setTab("uploads")}>Uploads</button>
        <button className={tab === "stock" ? "active" : ""} onClick={() => setTab("stock")}>Stock</button>
        <button className={tab === "aistudio" ? "active" : ""} onClick={() => setTab("aistudio")}>AI Studio</button>
        <div className="panelTabsSpacer" />
      </div>

      {tab === "uploads" && (
        <div className="panelBlock">
          <div className="panelTitle">Uploads</div>
          <div className="uploadDrop">Drop media here</div>
        </div>
      )}

      {tab === "stock" && (
        <div className="panelBlock">
          <div className="panelTitle">Stock Library</div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              fetchStock(stockQuery);
            }}
            style={{ display: "flex", gap: "6px", marginBottom: "10px" }}
          >
            <input
              value={stockQuery}
              onChange={(e) => setStockQuery(e.target.value)}
              placeholder="Search stock..."
              className="titleInput"
              style={{ width: "100%" }}
            />
            <button type="submit" className="smallBtn primary">
              Search
            </button>
          </form>

          {loadingStock && <div className="panelMuted">Loading...</div>}

          <div className="stockGrid">
            {stockImages.map((img) => (
              <div
                key={img.id}
                className="stockTile"
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData("application/json", JSON.stringify({
                    type: "stock",
                    thumbnail: img.full
                  }));
                }}
                style={{ padding: 0, overflow: "hidden", cursor: "grab" }}
              >
                <img
                  src={img.thumb}
                  alt=""
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "aistudio" && (
        <div className="panelBlock">
          <div className="panelTitle">AI Studio Library</div>
          {aiStudioItems.length === 0 ? (
            <div className="emptyState">No AI Studio items yet.</div>
          ) : (
            <div className="aiStudioList">
              {aiStudioItems.map((it) => (
                <div key={it.id} className="aiItem">
                  <div className="aiThumb">
                    {it.thumbnail ? <img src={it.thumbnail} alt="" /> : <div>AI</div>}
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
