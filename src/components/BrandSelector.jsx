import { useState, useEffect } from "react";
import { getAuthHeaders } from "../utils/auth.js";

export default function BrandSelector({ value, onChange, style = {} }) {
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const headers = await getAuthHeaders();
        const res = await fetch("/api/brands", { headers });
        if (res.ok) {
          const data = await res.json();
          const list = data.brands || [];
          setBrands(list);
          // Auto-select default brand if no value set
          if (!value && list.length > 0) {
            const def = list.find(b => b.is_default) || list[0];
            onChange(def.id, def);
          }
        }
      } catch (e) {
        console.error("BrandSelector load error:", e);
      }
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return (
    <select disabled style={{ width: "100%", padding: "10px 12px", borderRadius: 8, background: "var(--onyx-bg-2)", border: "1px solid var(--onyx-hairline-strong)", color: "var(--onyx-text-faint)", fontSize: 14, ...style }}>
      <option>Loading brands...</option>
    </select>
  );

  if (brands.length === 0) return (
    <select disabled style={{ width: "100%", padding: "10px 12px", borderRadius: 8, background: "var(--onyx-bg-2)", border: "1px solid var(--onyx-hairline-strong)", color: "var(--onyx-text-faint)", fontSize: 14, ...style }}>
      <option>No brands — create one in Branding settings</option>
    </select>
  );

  return (
    <select
      value={value || ""}
      onChange={e => {
        const selected = brands.find(b => b.id === e.target.value);
        onChange(e.target.value, selected);
      }}
      style={{ width: "100%", padding: "10px 12px", borderRadius: 8, background: "var(--onyx-bg-2)", border: "1px solid var(--onyx-hairline-strong)", color: "var(--onyx-text)", fontSize: 14, cursor: "pointer", outline: "none", ...style }}
    >
      {brands.map(b => (
        <option key={b.id} value={b.id}>
          {b.brand_label || b.brand_name || "Unnamed"}{b.is_default ? " (Default)" : ""}
        </option>
      ))}
    </select>
  );
}
