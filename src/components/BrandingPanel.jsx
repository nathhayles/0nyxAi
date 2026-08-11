import React, { useState, useEffect, useRef } from "react";
import { FONTS } from "../data/fonts.js";
const LOGO_POSITIONS = ["top-left", "top-right", "top-center", "bottom-left", "bottom-right", "bottom-center"];
const AVATAR_POSITIONS = ["bottom-left", "bottom-right", "bottom-center", "left", "right"];
const CAPTION_POSITIONS = ["top", "middle", "bottom"];
const CAPTION_SIZES = [
  { label: "Small",  value: "small",  px: 16 },
  { label: "Medium", value: "medium", px: 20 },
  { label: "Large",  value: "large",  px: 26 },
];
const TABS = ["Style", "Voice", "Music", "Avatar"];

const THEME_PRESETS = [
  { label: "Dark",        bg: "#0a0a0a",   overlay: "rgba(0,0,0,0.55)",  text: "#ffffff" },
  { label: "Light",       bg: "#f8fafc",   overlay: "rgba(255,255,255,0.6)", text: "#0f172a" },
  { label: "Midnight",    bg: "#0f0c29",   overlay: "rgba(15,12,41,0.7)", text: "#e2e8f0" },
  { label: "Ocean",       bg: "#0077b6",   overlay: "rgba(0,53,102,0.6)", text: "#ffffff" },
  { label: "Forest",      bg: "#1b4332",   overlay: "rgba(27,67,50,0.65)", text: "#d1fae5" },
  { label: "Sunset",      bg: "#7f1d1d",   overlay: "rgba(127,29,29,0.6)", text: "#fef3c7" },
  { label: "Purple Haze", bg: "#1e1b4b",   overlay: "rgba(30,27,75,0.65)", text: "#e9d5ff" },
  { label: "Gold",        bg: "#1c1400",   overlay: "rgba(28,20,0,0.6)",  text: "#fde68a" },
];

const inp = {
  width: "100%", background: "var(--input-bg)", border: "0.5px solid var(--onyx-hairline-strong)",
  color: "var(--onyx-text)", borderRadius: 6, padding: "8px 10px", fontSize: 13,
  boxSizing: "border-box", outline: "none",
};
const btn = {
  padding: "7px 12px", borderRadius: 6, fontSize: 12, fontWeight: 600,
  cursor: "pointer", border: "0.5px solid var(--onyx-hairline-strong)", background: "var(--onyx-hairline)", color: "var(--onyx-text-faint)",
};
const primaryBtn = { ...btn, background: "var(--btn-primary-grad)", border: "none", color: "var(--btn-primary-text)" };
const lbl = { fontSize: 11, color: "var(--onyx-text-faint)", display: "block", marginBottom: 4 };

function Field({ labelText, children }) {
  return <div><label style={lbl}>{labelText}</label>{children}</div>;
}

function rgbaToHex(c) {
  if (!c) return "#000000";
  if (c.startsWith("#")) return c.slice(0,7);
  const m = c.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!m) return "#000000";
  return "#" + [m[1],m[2],m[3]].map(n => parseInt(n).toString(16).padStart(2,"0")).join("");
}

function ColorRow({ labelText, colorKey, brand, setBrand }) {
  return (
    <div style={{ flex: 1 }}>
      <label style={lbl}>{labelText}</label>
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <input type="color" value={rgbaToHex(brand[colorKey] || "#000000")}
          onChange={e => setBrand(b => ({ ...b, [colorKey]: e.target.value }))}
          style={{ width: 36, height: 34, border: "none", borderRadius: 4, cursor: "pointer", background: "none" }} />
        <input style={{ ...inp, flex: 1 }} value={brand[colorKey] || ""}
          onChange={e => setBrand(b => ({ ...b, [colorKey]: e.target.value }))} />
      </div>
    </div>
  );
}

const DEFAULT_BRAND = {
  brand_label: "", brand_name: "", tagline: "",
  primary_color: "#6366f1", secondary_color: "#ffffff",
  font: "sans-serif", logo_url: "", logo_position: "top-left", logo_size: "medium",
  bg_color: "#0a0a0a", overlay_color: "rgba(0,0,0,0.55)", text_color: "#ffffff",
  default_voice_id: "", default_voice_name: "", default_voice_provider: "",
  default_music_url: "", default_music_name: "",
  default_avatar_id: "", avatar_position: "bottom-right", avatar_quality: "standard",
  caption_font: "sans-serif", caption_size: 20, caption_color: "#ffffff",
  caption_bg_color: "rgba(0,0,0,0.6)", caption_highlight_color: "#ffe566", caption_position: "bottom",
  logo_palette: [],
};

function rowToState(b) {
  return {
    brand_label:            b.brand_label || b.brand_name || "",
    brand_name:             b.brand_name  || b.brand_label || "",
    tagline:                b.tagline || "",
    primary_color:          b.primary_color || "#6366f1",
    secondary_color:        b.secondary_color || "#ffffff",
    font:                   b.font || "sans-serif",
    logo_url:               b.logo_url || "",
    logo_position:          b.logo_position || "top-left",
    logo_size:              b.logo_size || "medium",
    bg_color:               b.bg_color || "#0a0a0a",
    overlay_color:          b.overlay_color || "rgba(0,0,0,0.55)",
    text_color:             b.text_color || "#ffffff",
    default_voice_id:       b.default_voice_id || "",
    default_voice_name:     b.default_voice_name || "",
    default_voice_provider: b.default_voice_provider || "",
    default_music_url:      b.default_music_url || "",
    default_music_name:     b.default_music_name || "",
    default_avatar_id:      b.default_avatar_id || "",
    avatar_position:        b.avatar_position || "bottom-right",
    avatar_quality:         b.avatar_quality || "standard",
    caption_font:           b.caption_font || b.font || "sans-serif",
    caption_size:           b.caption_size || 20,
    caption_color:          b.caption_color || "#ffffff",
    caption_bg_color:       b.caption_bg_color || "rgba(0,0,0,0.6)",
    caption_highlight_color: b.caption_highlight_color || "#ffe566",
    caption_position:       b.caption_position || "bottom",
    logo_palette:           Array.isArray(b.logo_palette) ? b.logo_palette : [],
  };
}

export default function BrandingPanel({ onApply }) {
  const [brands, setBrands]               = useState([]);
  const [activeBrandId, setActiveBrandId] = useState(null);
  const activeBrandIdRef = useRef(null);
  function setActiveBrandIdSync(id) { activeBrandIdRef.current = id; setActiveBrandId(id); }
  const [brand, setBrand]                 = useState(DEFAULT_BRAND);
  const [activeTab, setActiveTab]         = useState("Style");
  const [saving, setSaving]               = useState(false);
  const [loading, setLoading]             = useState(true);
  const [voices, setVoices]               = useState([]);
  const [voicesLoading, setVoicesLoading] = useState(false);
  const [voiceTier, setVoiceTier]         = useState("standard");
  const [avatars, setAvatars]             = useState([]);
  const [userAvatars, setUserAvatars]     = useState([]);
  const [avatarsLoading, setAvatarsLoading] = useState(false);
  const [avatarSource, setAvatarSource]   = useState("preset");
  const [stockTracks, setStockTracks]     = useState([]);
  const [tracksLoading, setTracksLoading] = useState(false);
  const [creating, setCreating]           = useState(false);
  const [newBrandName, setNewBrandName]   = useState("");
  const [msg, setMsg]                     = useState("");
  const [voiceSearch, setVoiceSearch]     = useState("");
  const [musicSearch, setMusicSearch]     = useState("");
  const [musicTag, setMusicTag]           = useState("");
  const [avatarSearch, setAvatarSearch]   = useState("");
  const [fontSearch, setFontSearch]       = useState("");
  const [showFontPicker, setShowFontPicker] = useState(false);
  const [paletteLoading, setPaletteLoading] = useState(false);

  const logoInputRef = useRef();

  async function getHeaders() {
    const { supabase } = await import("../supabaseClient.js");
    const { data } = await supabase.auth.getSession();
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${data?.session?.access_token}`,
    };
  }

  async function uploadLogo(file) {
    try {
      const headers = await getHeaders();
      delete headers["Content-Type"];
      const form = new FormData();
      form.append("files", file);
      form.append("assetType", "logo");
      const res = await fetch("/api/media/upload", { method: "POST", headers, body: form });
      const data = await res.json();
      const uploaded = data?.files?.[0] || data?.uploaded?.[0] || data?.[0];
      if (uploaded?.url) {
        setBrand(b => ({ ...b, logo_url: uploaded.url }));
        flash("Logo uploaded ✓");
        if (activeBrandId) extractPalette(activeBrandId, uploaded.url);
      }
    } catch (err) { flash("Logo upload failed: " + err.message, true); }
  }

  async function extractPalette(brandId, logoUrl) {
    if (!brandId || !logoUrl) return;
    setPaletteLoading(true);
    try {
      const headers = await getHeaders();
      // Save the logo_url first so the backend can fetch it
      await fetch(`/api/brands/${brandId}`, {
        method: "PUT", headers,
        body: JSON.stringify({ logo_url: logoUrl }),
      });
      const res = await fetch(`/api/brands/${brandId}/extract-palette`, { method: "POST", headers });
      const data = await res.json();
      if (data?.palette?.length) {
        setBrand(b => ({ ...b, logo_palette: data.palette }));
      // Persist logo_palette to DB immediately
      if (brandId) {
        try {
          const h2 = await getHeaders();
          await fetch(`/api/brands/${brandId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json", ...h2 },
            body: JSON.stringify({ logo_palette: data.palette }),
          });
        } catch(e) { console.warn("logo_palette save failed:", e); }
      }
        flash("Palette extracted ✓");
      }
    } catch (err) { flash("Palette extraction failed: " + err.message, true); }
    setPaletteLoading(false);
  }

  function flash(text, isError = false) {
    setMsg((isError ? "Error: " : "") + text);
    setTimeout(() => setMsg(""), 3000);
  }

  async function loadVoices(tier = "standard") {
    setVoicesLoading(true);
    try {
      const headers = await getHeaders();
      const res = await fetch(`/api/tts/voices?provider=${tier === "premium" ? "elevenlabs" : "openai"}`, { headers });
      const data = await res.json();
      setVoices(Array.isArray(data?.voices) ? data.voices : []);
    } catch { setVoices([]); }
    setVoicesLoading(false);
  }

  async function loadAvatars() {
    setAvatarsLoading(true);
    try {
      const headers = await getHeaders();
      const res = await fetch("/api/heygen/avatars", { headers });
      const data = await res.json();
      setAvatars(Array.isArray(data?.avatars) ? data.avatars : []);
      try {
        const userRes = await fetch("/api/heygen/avatars?type=custom", { headers });
        const userData = await userRes.json();
        setUserAvatars(Array.isArray(userData?.avatars) ? userData.avatars : []);
      } catch { setUserAvatars([]); }
    } catch { setAvatars([]); }
    setAvatarsLoading(false);
  }

  async function loadStockTracks() {
    setTracksLoading(true);
    try {
      const res = await fetch("/api/music/stock");
      const data = await res.json();
      setStockTracks(Array.isArray(data?.tracks) ? data.tracks : []);
    } catch { setStockTracks([]); }
    setTracksLoading(false);
  }

  async function loadBrands() {
    setLoading(true);
    try {
      const headers = await getHeaders();
      const res = await fetch("/api/brands", { headers });
      const data = await res.json();
      const list = Array.isArray(data) ? data : (data.brands || []);
      setBrands(list);
      if (list.length > 0) {
        const def = list.find(b => b.is_default) || list[0];
        setActiveBrandIdSync(def.id);
        setBrand(rowToState(def));
      }
    } catch (err) { console.error("Failed to load brands:", err); }
    setLoading(false);
  }

  useEffect(() => { loadBrands(); }, []);
  useEffect(() => {
    if (activeTab === "Voice") loadVoices(voiceTier);
    if (activeTab === "Avatar") loadAvatars();
    if (activeTab === "Music") loadStockTracks();
  }, [activeTab]);
  useEffect(() => { if (activeTab === "Voice") loadVoices(voiceTier); }, [voiceTier]);

  function switchBrand(id) {
    const b = brands.find(x => x.id === id);
    if (!b) return;
    setActiveBrandIdSync(id);
    setBrand(rowToState(b));
  }

  async function saveBrand() {
    setSaving(true);
    setMsg("");
    try {
      const headers = await getHeaders();
      const targetId = activeBrandId || (brands.length > 0 ? brands[0].id : null);
      if (!targetId) { flash("No brand selected", true); setSaving(false); return; }
      if (!activeBrandId) setActiveBrandIdSync(targetId);

      const res = await fetch(`/api/brands/${targetId}`, {
        method: "PUT", headers, body: JSON.stringify({ ...brand }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      if (data.id) setActiveBrandIdSync(data.id);
      await loadBrands();
      flash("Brand saved ✓");
      if (onApply) onApply(brand);
    } catch (err) { flash(err.message, true); }
    setSaving(false);
  }

  async function createBrand() {
    if (!newBrandName.trim()) return;
    try {
      const headers = await getHeaders();
      const res = await fetch("/api/brands", {
        method: "POST", headers,
        body: JSON.stringify({ brand_label: newBrandName.trim(), primary_color: "#6366f1", secondary_color: "#ffffff", font: "sans-serif" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Create failed");
      setCreating(false); setNewBrandName("");
      await loadBrands();
      if (data.id) switchBrand(data.id);
    } catch (err) { flash(err.message, true); }
  }

  async function deleteBrand(id) {
    if (!window.confirm("Delete this brand?")) return;
    try {
      const headers = await getHeaders();
      await fetch(`/api/brands/${id}`, { method: "DELETE", headers });
      await loadBrands();
    } catch (err) { flash(err.message, true); }
  }

  async function setDefault(id) {
    try {
      const headers = await getHeaders();
      await fetch(`/api/brands/${id}/set-default`, { method: "POST", headers });
      await loadBrands();
      flash("Default brand updated ✓");
    } catch (err) { flash(err.message, true); }
  }

  const filteredVoices  = voices.filter(v => v.name?.toLowerCase().includes(voiceSearch.toLowerCase()));
  const filteredAvatars = (avatarSource === "mine" ? userAvatars : avatars)
    .filter(av => (av.avatar_name || "").toLowerCase().includes(avatarSearch.toLowerCase()));
  const musicTags = [...new Set(stockTracks.flatMap(t => [t.genre, t.mood].filter(Boolean)))];
  const filteredTracks  = stockTracks.filter(t => {
    const q = musicSearch.toLowerCase();
    const matchSearch = !q || (t.name || t.title || "").toLowerCase().includes(q)
      || (t.genre || "").toLowerCase().includes(q) || (t.mood || "").toLowerCase().includes(q);
    const matchTag = !musicTag || t.genre === musicTag || t.mood === musicTag;
    return matchSearch && matchTag;
  });

  const activeBrand = brands.find(b => b.id === activeBrandId);

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--onyx-text-faint)", fontSize: 13 }}>
      Loading brands...
    </div>
  );

  return (
    <div style={{ display: "flex", height: "calc(100vh - 64px)", background: "var(--onyx-bg-2)", color: "var(--onyx-text)", fontFamily: "sans-serif" }}>

      {/* ── Left Sidebar ─────────────────────────────────────────────────────── */}
      <div style={{
        width: 220, flexShrink: 0, borderRight: "0.5px solid var(--onyx-hairline)",
        display: "flex", flexDirection: "column", background: "var(--input-bg)",
      }}>
        <div style={{ padding: "16px 14px 10px", borderBottom: "0.5px solid var(--onyx-hairline)" }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "var(--onyx-text-dim)", textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: 10 }}>
            Brand Kits
          </div>
          <button onClick={() => setCreating(v => !v)} style={{
            width: "100%", padding: "8px", borderRadius: 6, fontSize: 12, fontWeight: 700,
            cursor: "pointer", border: "1px dashed var(--onyx-hairline-strong)", background: "transparent", color: "#7c3aed",
            marginBottom: creating ? 8 : 0,
          }}>
            + New Brand
          </button>
          {creating && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <input value={newBrandName} onChange={e => setNewBrandName(e.target.value)}
                onKeyDown={e => e.key === "Enter" && createBrand()}
                placeholder="Brand name..." style={inp} autoFocus />
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={createBrand} style={{ ...primaryBtn, flex: 1 }}>Create</button>
                <button onClick={() => setCreating(false)} style={btn}>✕</button>
              </div>
            </div>
          )}
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "8px 8px" }}>
          {brands.length === 0 && !creating && (
            <div style={{ padding: "20px 8px", textAlign: "center", color: "var(--onyx-text-dim)", fontSize: 12 }}>
              No brands yet. Create your first one above.
            </div>
          )}
          {brands.map(b => {
            const isActive = b.id === activeBrandId;
            return (
              <div key={b.id} onClick={() => switchBrand(b.id)} style={{
                padding: "10px 12px", borderRadius: 8, cursor: "pointer", marginBottom: 4,
                background: isActive ? "rgba(124,58,237,0.15)" : "transparent",
                border: isActive ? "1px solid rgba(124,58,237,0.4)" : "1px solid transparent",
                transition: "all 0.15s",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: b.primary_color || "#6366f1", flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 13, fontWeight: 600,
                      color: isActive ? "#a78bfa" : "#e2e8f0",
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                      {b.brand_label || b.brand_name || "Unnamed"}
                    </div>
                    {b.is_default && (
                      <div style={{ fontSize: 9, color: "#4ade80", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                        ★ Default
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Main Panel ───────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, overflowY: "auto" }}>
        {!activeBrandId ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", flex: 1, color: "var(--onyx-text-dim)", fontSize: 14 }}>
            Select a brand or create a new one
          </div>
        ) : (
          <>
            {/* Header */}
            <div style={{ padding: "16px 24px", borderBottom: "0.5px solid var(--onyx-hairline)", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, color: "var(--onyx-text)" }}>
                  {activeBrand?.brand_label || activeBrand?.brand_name || "Brand"}
                </div>
                {activeBrand?.tagline && (
                  <div style={{ fontSize: 12, color: "var(--onyx-text-dim)", marginTop: 2 }}>{activeBrand.tagline}</div>
                )}
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {msg && (
                  <div style={{
                    padding: "5px 12px", borderRadius: 6, fontSize: 12, fontWeight: 600,
                    background: msg.startsWith("Error") ? "rgba(239,68,68,0.1)" : "rgba(34,197,94,0.1)",
                    color: msg.startsWith("Error") ? "#f87171" : "#4ade80",
                    border: `1px solid ${msg.startsWith("Error") ? "rgba(239,68,68,0.3)" : "rgba(34,197,94,0.3)"}`,
                  }}>{msg}</div>
                )}
                <button onClick={() => setDefault(activeBrandId)} style={{ ...btn, fontSize: 11 }}>★ Set Default</button>
                <button onClick={() => deleteBrand(activeBrandId)} style={{ ...btn, fontSize: 11, color: "#f87171", borderColor: "rgba(239,68,68,0.3)" }}>Delete</button>
                <button onClick={saveBrand} disabled={saving || loading} style={{ ...primaryBtn, opacity: (saving || loading) ? 0.5 : 1, minWidth: 100 }}>
                  {saving ? "Saving..." : "Save Brand"}
                </button>
                {onApply && (
                  <button onClick={() => onApply(brand)} style={btn}>Apply to Reel</button>
                )}
              </div>
            </div>

            {/* Tab bar */}
            <div style={{ display: "flex", gap: 0, borderBottom: "0.5px solid var(--onyx-hairline)", padding: "0 24px", flexShrink: 0 }}>
              {TABS.map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)} style={{
                  padding: "10px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer",
                  border: "none", background: "transparent",
                  color: activeTab === tab ? "#a78bfa" : "#475569",
                  borderBottom: activeTab === tab ? "2px solid #7c3aed" : "2px solid transparent",
                  transition: "all 0.15s",
                }}>
                  {tab}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div style={{ flex: 1, padding: "24px", overflowY: "auto" }}>

              {/* ── Style tab ── */}
              {activeTab === "Style" && (
                <div style={{ maxWidth: 740 }}>

                  {/* ── Identity ── */}
                  <div style={{ fontSize: 10, fontWeight: 700, color: "var(--onyx-text-dim)", textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: 12 }}>Identity</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
                    <div style={{ gridColumn: "1 / -1" }}>
                      <Field labelText="Brand Name">
                        <input style={inp} value={brand.brand_label}
                          onChange={e => setBrand(b => ({ ...b, brand_label: e.target.value, brand_name: e.target.value }))} />
                      </Field>
                    </div>
                    <div style={{ gridColumn: "1 / -1" }}>
                      <Field labelText="Tagline">
                        <input style={inp} value={brand.tagline} placeholder="Your brand tagline..."
                          onChange={e => setBrand(b => ({ ...b, tagline: e.target.value }))} />
                      </Field>
                    </div>
                  </div>

                  {/* ── Colours ── */}
                  <div style={{ fontSize: 10, fontWeight: 700, color: "var(--onyx-text-dim)", textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: 4 }}>Colours</div>
                  <div style={{ fontSize: 11, color: "var(--onyx-text-dim)", marginBottom: 12 }}>Primary = borders, buttons, highlights · Secondary = text, overlays, accents</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 24 }}>
                    <ColorRow labelText="Primary"    colorKey="primary_color"   brand={brand} setBrand={setBrand} />
                    <ColorRow labelText="Secondary"  colorKey="secondary_color" brand={brand} setBrand={setBrand} />
                    <ColorRow labelText="Text Color" colorKey="text_color"      brand={brand} setBrand={setBrand} />
                  </div>

                  {/* ── Theme ── */}
                  <div style={{ fontSize: 10, fontWeight: 700, color: "var(--onyx-text-dim)", textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: 12 }}>Theme</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 16 }}>
                    {THEME_PRESETS.map(p => {
                      const isActive = brand.bg_color === p.bg;
                      return (
                        <div key={p.label} onClick={() => setBrand(b => ({ ...b, bg_color: p.bg, overlay_color: p.overlay, text_color: p.text }))}
                          style={{ borderRadius: 10, overflow: "hidden", cursor: "pointer",
                            border: isActive ? "2px solid #7c3aed" : "2px solid transparent",
                            boxShadow: isActive ? "0 0 0 2px rgba(124,58,237,0.4)" : "none" }}>
                          <div style={{ height: 48, background: p.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: p.text, background: p.overlay, padding: "2px 7px", borderRadius: 4 }}>Aa</span>
                          </div>
                          <div style={{ padding: "5px 6px", background: "var(--onyx-surface)", fontSize: 10, color: isActive ? "#a78bfa" : "#64748b", fontWeight: 600, textAlign: "center" }}>
                            {p.label}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                    <ColorRow labelText="Background Color" colorKey="bg_color" brand={brand} setBrand={setBrand} />
                    <div>
                      <label style={lbl}>Overlay (rgba)</label>
                      <input style={inp} value={brand.overlay_color} placeholder="rgba(0,0,0,0.55)"
                        onChange={e => setBrand(b => ({ ...b, overlay_color: e.target.value }))} />
                    </div>
                  </div>

                  {/* Live preview */}
                  <div style={{ height: 120, borderRadius: 10, overflow: "hidden", position: "relative", background: brand.bg_color, border: "0.5px solid var(--onyx-hairline)", marginBottom: 24, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <div style={{ position: "absolute", inset: 0, background: brand.overlay_color }} />
                    <div style={{ position: "relative", textAlign: "center" }}>
                      <div style={{ fontSize: 20, fontWeight: 800, color: brand.text_color, fontFamily: brand.font, marginBottom: 4 }}>{brand.brand_label || "Your Brand"}</div>
                      <div style={{ fontSize: 12, color: brand.text_color, opacity: 0.7, fontFamily: brand.font }}>{brand.tagline || "Your tagline here"}</div>
                    </div>
                  </div>

                  {/* ── Typography ── */}
                  <div style={{ fontSize: 10, fontWeight: 700, color: "var(--onyx-text-dim)", textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: 12 }}>Typography</div>
                  <div style={{ marginBottom: 24 }}>
                    <label style={lbl}>Brand Font</label>
                    <div onClick={() => setShowFontPicker(v => !v)} style={{ ...inp, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", fontFamily: brand.font, marginBottom: showFontPicker ? 0 : 0 }}>
                      <span>{brand.font}</span><span style={{ color: "var(--onyx-text-dim)", fontSize: 10 }}>▾</span>
                    </div>
                    {showFontPicker && (
                      <div style={{ background: "var(--input-bg)", border: "0.5px solid var(--onyx-hairline-strong)", borderRadius: "0 0 6px 6px", maxHeight: 220, overflowY: "auto" }}>
                        <input value={fontSearch} onChange={e => setFontSearch(e.target.value)}
                          placeholder="Search fonts..." style={{ ...inp, borderRadius: 0, borderBottom: "0.5px solid var(--onyx-hairline-strong)", position: "sticky", top: 0 }} autoFocus />
                        {FONTS.filter(f => f.label.toLowerCase().includes(fontSearch.toLowerCase())).map(f => (
                          <div key={f.value} onClick={() => { setBrand(b => ({ ...b, font: f.value })); setShowFontPicker(false); setFontSearch(""); }}
                            style={{ padding: "8px 12px", cursor: "pointer", fontFamily: f.value, fontSize: 14,
                              background: brand.font === f.value ? "rgba(124,58,237,0.15)" : "transparent",
                              color: brand.font === f.value ? "#a78bfa" : "#e2e8f0",
                              borderBottom: "0.5px solid var(--onyx-hairline)" }}>
                            {f.label}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* ── Logo ── */}
                  <div style={{ fontSize: 10, fontWeight: 700, color: "var(--onyx-text-dim)", textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: 12 }}>Logo</div>
                  <div style={{ marginBottom: 24 }}>
                    <input style={{ ...inp, marginBottom: 8 }} value={brand.logo_url} placeholder="https://... or upload below"
                      onChange={e => setBrand(b => ({ ...b, logo_url: e.target.value }))} />
                    <label style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", background: "var(--input-bg)", border: "2px dashed var(--onyx-hairline-strong)", borderRadius: 8, cursor: "pointer", fontSize: 12, color: "var(--onyx-text-faint)", marginBottom: 8 }}>
                      Upload logo image
                      <input ref={logoInputRef} type="file" accept="image/*" style={{ display: "none" }}
                        onChange={e => { const f = e.target.files?.[0]; if (f) uploadLogo(f); }} />
                    </label>
                    {brand.logo_url && (
                      <div style={{ marginBottom: 10, textAlign: "center" }}>
                        <img src={brand.logo_url} alt="Brand logo"
                          style={{ maxHeight: 80, maxWidth: "100%", objectFit: "contain", borderRadius: 8,
                            background: "var(--onyx-inset)", padding: 8 }}
                          onError={e => { e.target.style.display = "none"; }} />
                      </div>
                    )}

                    {/* ── Extracted palette ── */}
                    {(brand.logo_palette?.length > 0 || paletteLoading) && (
                      <div style={{ marginTop: 10, marginBottom: 4 }}>
                        <div style={{ fontSize: 10, fontWeight: 600, color: "var(--onyx-text-dim)", textTransform: "uppercase", letterSpacing: "1.2px", marginBottom: 6 }}>
                          Extracted Palette {paletteLoading && <span style={{ color: "var(--onyx-text-faint)" }}>— extracting…</span>}
                        </div>
                        {!paletteLoading && brand.logo_palette.length > 0 && (
                          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                            {brand.logo_palette.map(({ role, hex }) => {
                              const ROLE_COLOR_MAP = {
                                background: "bg_color",
                                text: "text_color",
                                accent: "overlay_color",
                                primary: "primary_color",
                                secondary: "secondary_color",
                              };
                              const ROLE_CAPTION_MAP = {
                                text: "caption_color",
                                background: "caption_bg_color",
                              };
                              const colorKey = ROLE_COLOR_MAP[role];
                              const captionKey = ROLE_CAPTION_MAP[role];
                              return (
                                <button key={role} title={`Apply as ${role} (${hex})`}
                                  onClick={() => (colorKey || captionKey) && setBrand(b => ({
                                    ...b,
                                    ...(colorKey ? { [colorKey]: hex } : {}),
                                    ...(captionKey ? { [captionKey]: hex } : {}),
                                  }))}
                                  style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
                                    background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                                  <div style={{ width: 30, height: 30, borderRadius: 6, background: hex,
                                    border: "1.5px solid var(--onyx-hairline-strong)", boxShadow: "0 1px 3px rgba(0,0,0,0.4)" }} />
                                  <span style={{ fontSize: 8, color: "var(--onyx-text-faint)", textTransform: "capitalize" }}>{role}</span>
                                </button>
                              );
                            })}
                            {brand.logo_palette.length > 0 && (
                              <button title="Apply all palette colors to brand"
                                onClick={async () => {
                                  const currentBrandId = activeBrandIdRef.current || activeBrandId;
                                  const ROLE_COLOR_MAP = { background: "bg_color", text: "text_color", accent: "overlay_color", primary: "primary_color", secondary: "secondary_color" };
                                  const ROLE_CAPTION_MAP = { primary: "caption_bg_color", text: "caption_color", accent: "caption_highlight_color" };
                                  const update = {};
                                  brand.logo_palette.forEach(({ role, hex }) => {
                                    if (ROLE_COLOR_MAP[role]) update[ROLE_COLOR_MAP[role]] = hex;
                                    if (ROLE_CAPTION_MAP[role]) update[ROLE_CAPTION_MAP[role]] = hex;
                                  });
                                  setBrand(b => ({ ...b, ...update }));
                                  if (currentBrandId) {
                                    try {
                                      const headers = await getHeaders();
                                      const savePayload = { ...brand, ...update };
                                      await fetch(`/api/brands/${currentBrandId}`, {
                                        method: "PUT",
                                        headers: { "Content-Type": "application/json", ...headers },
                                        body: JSON.stringify(savePayload),
                                      });
                                    } catch(e) { console.warn("Auto-save failed:", e); }
                                  }
                                }}
                                style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
                                  background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                                <div style={{ width: 30, height: 30, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center",
                                  border: "1.5px solid var(--onyx-cyan)", color: "var(--onyx-cyan)", fontSize: 12, fontWeight: 700 }}>✓</div>
                                <span style={{ fontSize: 8, color: "var(--onyx-text-faint)" }}>Apply all</span>
                              </button>
                            )}
                            {activeBrandId && (
                              <button title="Re-extract palette from logo"
                                onClick={() => extractPalette(activeBrandId, brand.logo_url)}
                                style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
                                  background: "none", border: "none", cursor: "pointer", padding: 0, opacity: 0.6 }}>
                                <div style={{ width: 30, height: 30, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center",
                                  border: "1.5px dashed var(--onyx-hairline-strong)", color: "var(--onyx-text-faint)", fontSize: 14 }}>↺</div>
                                <span style={{ fontSize: 8, color: "var(--onyx-text-faint)" }}>refresh</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                    {brand.logo_url && !brand.logo_palette?.length && !paletteLoading && activeBrandId && (
                      <button onClick={() => extractPalette(activeBrandId, brand.logo_url)}
                        style={{ marginTop: 8, fontSize: 11, padding: "5px 10px", borderRadius: 6,
                          background: "var(--input-bg)", border: "1px solid var(--onyx-hairline-strong)",
                          color: "var(--onyx-text-faint)", cursor: "pointer" }}>
                        Extract palette from logo
                      </button>
                    )}

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
                      <Field labelText="Logo Position">
                        <select style={inp} value={brand.logo_position} onChange={e => setBrand(b => ({ ...b, logo_position: e.target.value }))}>
                          {LOGO_POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                      </Field>
                      <Field labelText="Logo Size">
                        <select style={inp} value={brand.logo_size} onChange={e => setBrand(b => ({ ...b, logo_size: e.target.value }))}>
                          <option value="small">Small</option><option value="medium">Medium</option><option value="large">Large</option>
                        </select>
                      </Field>
                    </div>
                  </div>

                  {/* ── Captions ── */}
                  <div style={{ fontSize: 10, fontWeight: 700, color: "var(--onyx-text-dim)", textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: 12 }}>Captions</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                    <div style={{ gridColumn: "1 / -1" }}>
                      <label style={lbl}>Caption Font</label>
                      <select style={inp} value={brand.caption_font} onChange={e => setBrand(b => ({ ...b, caption_font: e.target.value }))}>
                        <option value="Noto Sans">Noto Sans</option>
                        <option value="Arial">Arial</option>
                        <option value="Roboto">Roboto</option>
                        <option value="DejaVu Sans">DejaVu Sans</option>
                        <option value="Georgia">Georgia</option>
                        <option value="Courier New">Courier New</option>
                        <option value="Impact">Impact</option>
                        <option value="sans-serif">Sans Serif</option>
                        <option value="serif">Serif</option>
                        <option value="monospace">Monospace</option>
                      </select>
                    </div>
                    <ColorRow labelText="Caption Text Color" colorKey="caption_color"    brand={brand} setBrand={setBrand} />
                    <ColorRow labelText="Caption Background" colorKey="caption_bg_color" brand={brand} setBrand={setBrand} />
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <label style={lbl}>Caption Size</label>
                    <div style={{ display: "flex", gap: 8 }}>
                      {/* caption_size is stored as a Postgres integer (px), not a
                          string enum -- these buttons used to write "small"/
                          "medium"/"large" directly, which Postgres rejected on
                          save ("invalid input syntax for type integer"),
                          blocking the whole Style tab. Write/compare the
                          numeric px value instead -- render.js's caption
                          sizing already accepts a raw numeric caption_size
                          the same way per-scene editor captions do. */}
                      {CAPTION_SIZES.map(s => (
                        <button key={s.value} onClick={() => setBrand(b => ({ ...b, caption_size: s.px }))}
                          style={{ flex: 1, padding: "8px", borderRadius: 6, cursor: "pointer", fontSize: s.px * 0.65, fontWeight: 600,
                            border: brand.caption_size === s.px ? "1px solid var(--onyx-cyan)" : "0.5px solid var(--onyx-hairline-strong)",
                            background: brand.caption_size === s.px ? "var(--btn-primary-grad)" : "var(--chip-bg)",
                            color: brand.caption_size === s.px ? "var(--btn-primary-text)" : "var(--onyx-text-dim)" }}>{s.label}</button>
                      ))}
                    </div>
                  </div>
                  <div style={{ marginBottom: 20 }}>
                    <label style={lbl}>Caption Position</label>
                    <div style={{ display: "flex", gap: 8 }}>
                      {["top","middle","bottom"].map(p => (
                        <button key={p} onClick={() => setBrand(b => ({ ...b, caption_position: p }))}
                          style={{ flex: 1, padding: "8px", borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: 600, textTransform: "capitalize",
                            border: brand.caption_position === p ? "1px solid var(--onyx-cyan)" : "0.5px solid var(--onyx-hairline-strong)",
                            background: brand.caption_position === p ? "var(--btn-primary-grad)" : "var(--chip-bg)",
                            color: brand.caption_position === p ? "var(--btn-primary-text)" : "var(--onyx-text-dim)" }}>{p}</button>
                      ))}
                    </div>
                  </div>
                  {/* Caption preview */}
                  <div style={{ height: 80, borderRadius: 8, overflow: "hidden", background: brand.bg_color || "#111", position: "relative",
                    display: "flex", alignItems: brand.caption_position === "top" ? "flex-start" : brand.caption_position === "middle" ? "center" : "flex-end",
                    justifyContent: "center", padding: 8, border: "0.5px solid var(--onyx-hairline)" }}>
                    <div style={{ position: "absolute", inset: 0, background: brand.overlay_color }} />
                    <span style={{ position: "relative", fontFamily: brand.caption_font,
                      fontSize: Math.round((Number(brand.caption_size) || 20) * 0.85),
                      color: brand.caption_color, background: brand.caption_bg_color, padding: "2px 10px", borderRadius: 4 }}>
                      Caption preview
                    </span>
                  </div>

                </div>
              )}

              {/* ── Voice tab ── */}
              {activeTab === "Voice" && (
                <div style={{ maxWidth: 600 }}>
                  <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                    {["standard", "premium"].map(t => (
                      <button key={t} onClick={() => setVoiceTier(t)} style={{
                        flex: 1, padding: "8px", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer",
                        background: voiceTier === t ? "var(--chip-bg-strong)" : "var(--onyx-hairline)",
                        border: voiceTier === t ? "1px solid var(--onyx-cyan)" : "0.5px solid var(--onyx-hairline-strong)",
                        color: voiceTier === t ? "#60a5fa" : "#64748b", textTransform: "capitalize",
                      }}>{t}</button>
                    ))}
                  </div>
                  {voiceTier === "premium" && (
                    <div style={{ fontSize: 11, color: "#fbbf24", padding: "6px 10px", background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.25)", borderRadius: 6, marginBottom: 12 }}>
                      Premium voices use credits per scene
                    </div>
                  )}
                  <input value={voiceSearch} onChange={e => setVoiceSearch(e.target.value)}
                    placeholder="Search voices..." style={{ ...inp, marginBottom: 12 }} />
                  {brand.default_voice_name && (
                    <div style={{ fontSize: 12, color: "#60a5fa", background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.2)", borderRadius: 6, padding: "6px 10px", marginBottom: 12 }}>
                      Selected: <strong>{brand.default_voice_name}</strong> via {brand.default_voice_provider}
                    </div>
                  )}
                  {voicesLoading ? (
                    <div style={{ color: "var(--onyx-text-faint)", fontSize: 13, textAlign: "center", padding: 20 }}>Loading voices...</div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {filteredVoices.map(v => {
                        const isSel = brand.default_voice_id === v.id;
                        return (
                          <div key={v.id} onClick={() => setBrand(b => ({ ...b, default_voice_id: v.id, default_voice_name: v.name, default_voice_provider: voiceTier === "premium" ? "elevenlabs" : "openai" }))}
                            style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 8, cursor: "pointer",
                              background: isSel ? "var(--chip-bg-strong)" : "var(--onyx-surface)", border: isSel ? "1px solid var(--onyx-cyan)" : "0.5px solid var(--onyx-hairline)" }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 13, fontWeight: 600, color: isSel ? "#60a5fa" : "#e2e8f0" }}>{v.name}</div>
                              <div style={{ fontSize: 11, color: "var(--onyx-text-faint)" }}>{v.gender} · {v.accent} · {v.language}</div>
                            </div>
                            {isSel && <span style={{ color: "#4ade80", fontSize: 16 }}>✓</span>}
                          </div>
                        );
                      })}
                      {!filteredVoices.length && <div style={{ color: "var(--onyx-text-faint)", fontSize: 13, textAlign: "center", padding: 20 }}>No voices found</div>}
                    </div>
                  )}
                </div>
              )}

              {/* ── Music tab ── */}
              {activeTab === "Music" && (
                <div style={{ maxWidth: 600 }}>
                  <input value={musicSearch} onChange={e => setMusicSearch(e.target.value)}
                    placeholder="Search tracks..." style={{ ...inp, marginBottom: 10 }} />
                  {musicTags.length > 0 && (
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
                      <button onClick={() => setMusicTag("")} style={{ padding: "4px 12px", borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: "pointer",
                        border: !musicTag ? "1px solid #22c55e" : "0.5px solid var(--onyx-hairline-strong)",
                        background: !musicTag ? "rgba(34,197,94,0.1)" : "var(--onyx-hairline)",
                        color: !musicTag ? "#4ade80" : "#64748b" }}>All</button>
                      {musicTags.map(tag => (
                        <button key={tag} onClick={() => setMusicTag(tag === musicTag ? "" : tag)} style={{ padding: "4px 12px", borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: "pointer",
                          border: musicTag === tag ? "1px solid #22c55e" : "0.5px solid var(--onyx-hairline-strong)",
                          background: musicTag === tag ? "rgba(34,197,94,0.1)" : "var(--onyx-hairline)",
                          color: musicTag === tag ? "#4ade80" : "#64748b" }}>{tag}</button>
                      ))}
                    </div>
                  )}
                  {brand.default_music_name && (
                    <div style={{ fontSize: 12, color: "#4ade80", background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: 6, padding: "6px 10px", marginBottom: 12 }}>
                      Selected: <strong>{brand.default_music_name}</strong>
                    </div>
                  )}
                  {tracksLoading ? (
                    <div style={{ color: "var(--onyx-text-faint)", fontSize: 13, textAlign: "center", padding: 20 }}>Loading tracks...</div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {filteredTracks.map(track => {
                        const isSel = brand.default_music_url === track.url;
                        return (
                          <div key={track.id} onClick={() => setBrand(b => ({ ...b, default_music_url: track.url, default_music_name: track.name || track.title }))}
                            style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 8, cursor: "pointer",
                              background: isSel ? "#14532d" : "var(--onyx-surface)", border: isSel ? "1px solid #22c55e" : "0.5px solid var(--onyx-hairline)" }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 13, fontWeight: 600, color: isSel ? "#4ade80" : "#e2e8f0" }}>{track.name || track.title}</div>
                              <div style={{ fontSize: 11, color: "var(--onyx-text-faint)" }}>{track.genre} · {track.mood}</div>
                            </div>
                            {isSel && <span style={{ color: "#4ade80", fontSize: 16 }}>✓</span>}
                          </div>
                        );
                      })}
                      {!filteredTracks.length && <div style={{ color: "var(--onyx-text-faint)", fontSize: 13, textAlign: "center", padding: 20 }}>No tracks found</div>}
                    </div>
                  )}
                  <button onClick={() => window.open("/music", "_blank")} style={{ ...btn, width: "100%", marginTop: 12, textAlign: "center" }}>
                    Browse Music Studio →
                  </button>
                </div>
              )}

              {/* ── Avatar tab ── */}
              {activeTab === "Avatar" && (
                <div style={{ maxWidth: 680 }}>
                  <div style={{ fontSize: 11, color: "#fbbf24", padding: "6px 10px", background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.25)", borderRadius: 6, marginBottom: 14 }}>
                    Avatar uses credits per scene
                  </div>
                  <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                    {[{ key: "preset", label: "Preset Avatars" }, { key: "mine", label: `My Avatars${userAvatars.length ? ` (${userAvatars.length})` : ""}` }].map(s => (
                      <button key={s.key} onClick={() => setAvatarSource(s.key)} style={{
                        flex: 1, padding: "8px", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer",
                        background: avatarSource === s.key ? "var(--chip-bg-strong)" : "var(--onyx-hairline)",
                        border: avatarSource === s.key ? "1px solid var(--onyx-cyan)" : "0.5px solid var(--onyx-hairline-strong)",
                        color: avatarSource === s.key ? "#60a5fa" : "#64748b",
                      }}>{s.label}</button>
                    ))}
                  </div>
                  {avatarSource === "mine" && userAvatars.length === 0 && !avatarsLoading && (
                    <div style={{ padding: "16px", background: "var(--onyx-surface)", borderRadius: 8, border: "0.5px solid var(--onyx-hairline)", fontSize: 13, color: "var(--onyx-text-dim)", marginBottom: 12 }}>
                      No custom avatars found. Create one in the editor using HeyGen, then it'll appear here.
                    </div>
                  )}
                  <input value={avatarSearch} onChange={e => setAvatarSearch(e.target.value)}
                    placeholder="Search avatars..." style={{ ...inp, marginBottom: 12 }} />
                  {brand.default_avatar_id && (
                    <div style={{ fontSize: 12, color: "#60a5fa", background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.2)", borderRadius: 6, padding: "6px 10px", marginBottom: 12 }}>
                      Avatar selected ✓
                    </div>
                  )}
                  {avatarsLoading ? (
                    <div style={{ color: "var(--onyx-text-faint)", fontSize: 13, textAlign: "center", padding: 20 }}>Loading avatars...</div>
                  ) : (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 16 }}>
                      {filteredAvatars.map(av => {
                        const isSel = brand.default_avatar_id === av.avatar_id;
                        return (
                          <div key={av.avatar_id} onClick={() => setBrand(b => ({ ...b, default_avatar_id: av.avatar_id }))}
                            style={{ borderRadius: 10, overflow: "hidden", cursor: "pointer",
                              border: isSel ? "2px solid var(--onyx-cyan)" : "2px solid transparent",
                              background: "var(--onyx-surface)", transition: "border 0.15s" }}>
                            <img src={av.preview_image_url} alt={av.avatar_name}
                              style={{ width: "100%", aspectRatio: "1", objectFit: "cover", display: "block" }}
                              onError={e => e.target.style.display = "none"} />
                            <div style={{ padding: "4px 6px", fontSize: 10, color: isSel ? "#60a5fa" : "#64748b", textAlign: "center", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {av.avatar_name}
                            </div>
                          </div>
                        );
                      })}
                      {!filteredAvatars.length && (
                        <div style={{ color: "var(--onyx-text-faint)", fontSize: 13, textAlign: "center", padding: 20, gridColumn: "1/-1" }}>No avatars found</div>
                      )}
                    </div>
                  )}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                    <Field labelText="Avatar Position">
                      <select style={inp} value={brand.avatar_position} onChange={e => setBrand(b => ({ ...b, avatar_position: e.target.value }))}>
                        {AVATAR_POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </Field>
                    <Field labelText="Avatar Quality">
                      <div style={{ display: "flex", gap: 8 }}>
                        {[{ value: "standard", label: "Standard", sub: "200 cr/min" }, { value: "avatar_iv", label: "Avatar IV", sub: "600 cr/min" }].map(opt => (
                          <button key={opt.value} onClick={() => setBrand(b => ({ ...b, avatar_quality: opt.value }))}
                            style={{ flex: 1, padding: "8px 6px", borderRadius: 6, cursor: "pointer", textAlign: "center",
                              border: brand.avatar_quality === opt.value ? "1px solid #7c3aed" : "0.5px solid var(--onyx-hairline-strong)",
                              background: brand.avatar_quality === opt.value ? "var(--chip-bg-strong)" : "var(--chip-bg)",
                              color: brand.avatar_quality === opt.value ? "#a78bfa" : "#64748b" }}>
                            <div style={{ fontSize: 11, fontWeight: 700 }}>{opt.label}</div>
                            <div style={{ fontSize: 10, marginTop: 2, color: "var(--onyx-text-dim)" }}>{opt.sub}</div>
                          </button>
                        ))}
                      </div>
                    </Field>
                  </div>
                </div>
              )}


            </div>
          </>
        )}
      </div>
    </div>
  );
}
