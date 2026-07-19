import React, { useEffect, useState } from "react";

export default function AssetSearchBar({ value, onChange }) {
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    const id = setTimeout(() => onChange(draft.trim()), 300);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft]);

  return (
    <div style={{ marginBottom: 10 }}>
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder="Search assets by name..."
        style={{ width: "100%", background: "var(--onyx-surface)", border: "1px solid var(--onyx-hairline-strong)", color: "var(--onyx-text)", borderRadius: 6, padding: "7px 10px", fontSize: 12, boxSizing: "border-box" }}
      />
    </div>
  );
}
