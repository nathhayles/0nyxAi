import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import BrandingPanel from "../components/BrandingPanel.jsx";
import { getAuthHeaders } from "../utils/auth.js";

const PLAN_LIMITS = { free: 1, starter: 1, creator: 3, pro: Infinity };

const EMPTY_BRAND = {
  brand_label: "New Brand",
  brand_name: "",
  primary_color: "#4dd0ff",
  secondary_color: "#06b6d4",
  caption_font: "sans-serif",
  caption_size: 16,
  caption_color: "#ffffff",
  caption_bg_color: "rgba(0,0,0,0.72)",
  caption_position: "bottom",
  logo_url: null,
  logo_size: "medium",
  logo_position: "top-right",
};

export default function Brands() {
  const navigate = useNavigate();
  const [brands, setBrands] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [editBrand, setEditBrand] = useState(null);
  const [plan, setPlan] = useState("starter");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const limit = PLAN_LIMITS[plan] ?? 1;
  const atLimit = brands.length >= limit;

  const fetchBrands = useCallback(async () => {
    setLoading(true);
    try {
      const headers = await getAuthHeaders();
      const [brandsRes, planRes] = await Promise.all([
        fetch("/api/brands", { headers }),
        fetch("/api/stripe/plan", { headers }),
      ]);
      const brandsData = await brandsRes.json();
      const planData = await planRes.json();
      setBrands(Array.isArray(brandsData) ? brandsData : []);
      setPlan(planData.plan || "starter");
      if (brandsData.length > 0 && !selectedId) {
        const def = brandsData.find(b => b.is_default) || brandsData[0];
        setSelectedId(def.id);
        setEditBrand({ ...def });
      }
    } catch (e) {
      setError("Failed to load brands");
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchBrands(); }, [fetchBrands]);

  useEffect(() => {
    if (selectedId && brands.length > 0) {
      const b = brands.find(b => b.id === selectedId);
      if (b) setEditBrand({ ...b });
    }
  }, [selectedId, brands]);

  const handleSave = async (brandData) => {
    setSaving(true);
    setError(null);
    try {
      const headers = await getAuthHeaders();
      headers["Content-Type"] = "application/json";
      const res = await fetch(`/api/brands/${selectedId}`, {
        method: "PUT",
        headers,
        body: JSON.stringify(brandData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      setBrands(prev => prev.map(b => b.id === selectedId ? data : b));
    } catch (e) {
      setError(e.message);
    }
    setSaving(false);
  };

  const handleCreate = async () => {
    if (atLimit) return;
    setSaving(true);
    setError(null);
    try {
      const headers = await getAuthHeaders();
      headers["Content-Type"] = "application/json";
      const res = await fetch("/api/brands", {
        method: "POST",
        headers,
        body: JSON.stringify({ ...EMPTY_BRAND, brand_label: `Brand ${brands.length + 1}` }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Create failed");
      setBrands(prev => [...prev, data]);
      setSelectedId(data.id);
      setEditBrand({ ...data });
    } catch (e) {
      setError(e.message);
    }
    setSaving(false);
  };

  const handleSetDefault = async (id) => {
    try {
      const headers = await getAuthHeaders();
      await fetch(`/api/brands/${id}/set-default`, { method: "POST", headers });
      setBrands(prev => prev.map(b => ({ ...b, is_default: b.id === id })));
    } catch (e) {
      setError("Failed to set default");
    }
  };

  const handleDelete = async (id) => {
    if (brands.length <= 1) return;
    if (!confirm("Delete this brand? This cannot be undone.")) return;
    try {
      const headers = await getAuthHeaders();
      await fetch(`/api/brands/${id}`, { method: "DELETE", headers });
      const remaining = brands.filter(b => b.id !== id);
      setBrands(remaining);
      if (selectedId === id) {
        const next = remaining.find(b => b.is_default) || remaining[0];
        setSelectedId(next?.id || null);
        setEditBrand(next ? { ...next } : null);
      }
    } catch (e) {
      setError("Failed to delete brand");
    }
  };

  if (loading) return (
    <div style={{ padding: 40, color: "var(--onyx-text-faint)", textAlign: "center" }}>Loading brands...</div>
  );

  return (
    <div style={{ display: "flex", height: "100%", background: "var(--onyx-bg-2)" }}>

      {/* Sidebar — brand list */}
      <div style={{ width: 220, borderRight: "1px solid var(--onyx-hairline-strong)", display: "flex", flexDirection: "column", flexShrink: 0 }}>
        <div style={{ padding: "16px 14px 10px", fontSize: 10, fontWeight: 700, color: "var(--onyx-text-faint)", textTransform: "uppercase", letterSpacing: "1.5px", borderBottom: "1px solid var(--onyx-hairline-strong)" }}>
          Brand Kits
        </div>

        <div style={{ flex: 1, overflowY: "auto" }}>
          {brands.map(b => (
            <div
              key={b.id}
              onClick={() => setSelectedId(b.id)}
              style={{
                padding: "10px 14px",
                cursor: "pointer",
                borderBottom: "0.5px solid var(--onyx-hairline)",
                background: selectedId === b.id ? "var(--onyx-surface)" : "transparent",
                borderLeft: selectedId === b.id ? "2px solid var(--onyx-cyan)" : "2px solid transparent",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: b.primary_color || "#4dd0ff", flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, color: "var(--onyx-text)", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {b.brand_label || b.brand_name || "Untitled"}
                  </div>
                  {b.is_default && (
                    <div style={{ fontSize: 9, color: "var(--btn-primary-grad)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>Default</div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Add brand button */}
        <div style={{ padding: 12, borderTop: "1px solid var(--onyx-hairline-strong)" }}>
          {atLimit ? (
            <div style={{ fontSize: 10, color: "var(--onyx-text-faint)", textAlign: "center", lineHeight: 1.4 }}>
              {plan === "pro" ? "" : `Upgrade to add more brands`}
              <br />
              <span style={{ color: "var(--btn-primary-grad)", cursor: "pointer" }} onClick={() => window.location.href = "/pricing"}>
                {limit === 1 ? "Starter: 1 brand max" : `${plan}: ${limit} brands max`}
              </span>
            </div>
          ) : (
            <button
              onClick={handleCreate}
              disabled={saving}
              style={{
                width: "100%", padding: "8px", fontSize: 11, fontWeight: 600,
                background: "var(--chip-bg-strong)", border: "1px solid var(--onyx-cyan)", color: "var(--onyx-cyan)",
                borderRadius: 4, cursor: "pointer", letterSpacing: "0.5px",
              }}
            >
              + New Brand ({brands.length}/{limit === Infinity ? "∞" : limit})
            </button>
          )}
        </div>
      </div>

      {/* Main panel — brand editor */}
      <div style={{ flex: 1, overflowY: "auto", position: "relative" }}>
        {error && (
          <div style={{ margin: 12, padding: "8px 12px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 4, fontSize: 12, color: "#f87171" }}>
            {error}
          </div>
        )}

        {editBrand && selectedId ? (
          <>
            {/* Brand label + actions bar */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderBottom: "1px solid var(--onyx-hairline-strong)" }}>
              <input
                value={editBrand.brand_label || ""}
                onChange={e => setEditBrand(b => ({ ...b, brand_label: e.target.value }))}
                style={{ flex: 1, background: "var(--onyx-surface)", border: "1px solid var(--onyx-hairline-strong)", color: "var(--onyx-text)", borderRadius: 4, padding: "6px 10px", fontSize: 13, fontWeight: 600 }}
                placeholder="Brand name..."
              />
              {!brands.find(b => b.id === selectedId)?.is_default && (
                <button
                  onClick={() => handleSetDefault(selectedId)}
                  style={{ padding: "6px 10px", fontSize: 11, background: "var(--onyx-surface-2)", border: "1px solid var(--onyx-hairline-strong)", color: "var(--onyx-text-faint)", borderRadius: 4, cursor: "pointer", whiteSpace: "nowrap" }}
                >
                  Set Default
                </button>
              )}
              {brands.length > 1 && (
                <button
                  onClick={() => handleDelete(selectedId)}
                  style={{ padding: "6px 10px", fontSize: 11, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", color: "#f87171", borderRadius: 4, cursor: "pointer" }}
                >
                  Delete
                </button>
              )}
            </div>

            <BrandingPanel
              brand={editBrand}
              setBrand={setEditBrand}
              onSave={handleSave}
              getAuthHeaders={getAuthHeaders}
              saving={saving}
              onApply={(brand) => navigate("/projects", { state: { applyBrandId: brand.id } })}
            />
          </>
        ) : (
          <div style={{ padding: 40, color: "var(--onyx-text-faint)", textAlign: "center" }}>
            Select a brand or create a new one
          </div>
        )}
      </div>
    </div>
  );
}
