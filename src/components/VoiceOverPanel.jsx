// VoiceOverPanel.jsx
// Per-scene voiceover panel with full browsable voice catalog, filters, and preview.
// Keeps the scene list + apply-to-scene/apply-to-all actions from the original panel.
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useVoiceoverEngine, STANDARD_VOICES, GOOGLE_LANGUAGES, normalizeNarrationText } from "../hooks/useVoiceoverEngine.js";
import { getAuthHeaders } from "../utils/auth.js";

// Voice names that get a "Popular" badge (Premium tab)
const POPULAR_VOICE_NAMES = new Set(["Natasha", "Aaron"]);

const SELECT_STYLE = {
  width: "100%",
  marginTop: 4,
  background: "var(--onyx-bg-2)",
  border: "1px solid var(--onyx-hairline-strong)",
  color: "var(--onyx-text)",
  borderRadius: 4,
  padding: "6px 8px",
  fontSize: 11,
};

const LABEL_STYLE = { fontSize: 11, color: "var(--onyx-text-dim)", display: "block" };

// Badge base — shared chip look, theme-aware background
const BADGE_BASE = {
  fontSize: 9, fontWeight: 700, padding: "1px 5px", borderRadius: 3,
  letterSpacing: "0.04em", textTransform: "uppercase",
  background: "var(--chip-bg-strong)", border: "1px solid var(--onyx-hairline-strong)",
};

// Google tier quality badges — Chirp3-HD gets teal highlight, rest use muted tones
const GOOGLE_TIER_BADGE = {
  "Chirp3-HD": { ...BADGE_BASE, color: "var(--onyx-cyan)",    border: "1px solid var(--onyx-cyan)" },
  "Chirp-HD":  { ...BADGE_BASE, color: "var(--onyx-cyan)"    },
  "Studio":    { ...BADGE_BASE, color: "var(--onyx-amber)"   },
  "Neural2":   { ...BADGE_BASE, color: "var(--onyx-success)" },
  "Wavenet":   { ...BADGE_BASE, color: "var(--onyx-success)" },
  "Standard":  { ...BADGE_BASE, color: "var(--onyx-text-mute)", background: "transparent", border: "1px solid var(--onyx-hairline)" },
};

// Generic display labels — never expose underlying provider tier names to the user
const TIER_DISPLAY_LABEL = {
  "Wavenet": "Standard+",
  "Chirp3-HD": "Premium HD",
};

export default function VoiceOverPanel({
  scenes = [],
  setScenes,
  voiceoverVolume,
  setVoiceoverVolume,
  generatingVoiceoverScenes,
  setGeneratingVoiceoverScenes,
  onSave,
}) {
  const safeScenes = Array.isArray(scenes) ? scenes : [];

  const [selectedSceneIndex, setSelectedSceneIndex] = useState(0);
  const [selectedVoiceId, setSelectedVoiceId] = useState("alloy");
  const [speed, setSpeed] = useState(1);

  // Two user-facing tiers: "standard" (OpenAI + Google Standard/WaveNet) and "premium" (ElevenLabs + Google Chirp3-HD)
  const [voiceTier, setVoiceTier] = useState("standard");
  // Language selector — applies to Google voices in both tiers
  const [googleLanguage, setGoogleLanguage] = useState("en-US");
  // Sub-filters
  const [filterGender, setFilterGender] = useState("all");
  const [filterAccent, setFilterAccent] = useState("all");
  const [filterLanguage, setFilterLanguage] = useState("all");
  const [filterSearch, setFilterSearch] = useState("");

  // Collapsible header state
  const [headerExpanded, setHeaderExpanded] = useState(true);
  const scrollContentRef = useRef(null);

  // Remembers the volume level to restore on unmute -- voiceoverVolume itself
  // becomes 0 while muted, so this is the only place the pre-mute level lives.
  const lastVoiceoverVolumeRef = useRef(voiceoverVolume > 0 ? voiceoverVolume : 100);
  useEffect(() => {
    if (voiceoverVolume > 0) lastVoiceoverVolumeRef.current = voiceoverVolume;
  }, [voiceoverVolume]);

  // Favorites
  const [favorites, setFavorites] = useState(new Set()); // Set of "provider:voice_id"
  const [showFavOnly, setShowFavOnly] = useState(false);

  useEffect(() => {
    getAuthHeaders().then(headers =>
      fetch("/api/tts/favorites", { headers })
        .then(r => r.json())
        .then(data => {
          if (data.favorites) {
            setFavorites(new Set(data.favorites.map(f => `${f.provider}:${f.voice_id}`)));
          }
        })
        .catch(() => {})
    );
  }, []);

  function voiceProvider(voice) {
    return voice.provider || (voiceTier === "premium" ? "elevenlabs" : "openai");
  }

  function toggleFavorite(e, voice) {
    e.stopPropagation();
    const provider = voiceProvider(voice);
    const key = `${provider}:${voice.id}`;
    const starred = favorites.has(key);
    setFavorites(prev => {
      const next = new Set(prev);
      if (starred) next.delete(key); else next.add(key);
      return next;
    });
    getAuthHeaders().then(headers => {
      if (starred) {
        fetch(`/api/tts/favorites?voice_id=${encodeURIComponent(voice.id)}&provider=${encodeURIComponent(provider)}`, {
          method: "DELETE",
          headers,
        }).catch(() => {});
      } else {
        fetch("/api/tts/favorites", {
          method: "POST",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify({ voice_id: voice.id, provider }),
        }).catch(() => {});
      }
    });
  }

  const {
    loading, status,
    premiumVoices, premiumVoicesLoading, premiumVoicesError, fetchPremiumVoices,
    googleVoices, googleVoicesLoading, googleVoicesError, fetchGoogleVoices,
    googlePremiumVoices, googlePremiumVoicesLoading, fetchGooglePremiumVoices,
    voMinutes, fetchVoMinutes,
    applyVoiceToReel,
    handlePreviewVoice, playingPreviewId, previewLoadingId,
    isVoiceoverGenerating, narratedSceneIndexes,
  } = useVoiceoverEngine({ scenes, setScenes, speed, voiceoverVolume, onSave, generatingVoiceoverScenes, setGeneratingVoiceoverScenes });

  useEffect(() => { fetchVoMinutes(); }, []);

  // Fetch Google Standard/WaveNet voices whenever language changes (used in Standard tier)
  useEffect(() => { fetchGoogleVoices(googleLanguage); }, [googleLanguage]);

  // Fetch premium voices (ElevenLabs + Google Chirp3-HD) when on premium tier
  useEffect(() => {
    if (voiceTier === "premium") {
      fetchPremiumVoices();
      fetchGooglePremiumVoices(googleLanguage);
    }
  }, [voiceTier]);

  // Refetch Google Chirp3-HD when language changes while on premium tier
  useEffect(() => {
    if (voiceTier === "premium") fetchGooglePremiumVoices(googleLanguage);
  }, [googleLanguage, voiceTier]);

  // Reset sub-filters when tier changes
  useEffect(() => {
    setFilterGender("all");
    setFilterAccent("all");
    setFilterLanguage("all");
    setFilterSearch("");
  }, [voiceTier]);

  useEffect(() => {
    if (selectedSceneIndex >= safeScenes.length) setSelectedSceneIndex(0);
  }, [safeScenes.length]);

  // Collapse/expand header on scroll
  useEffect(() => {
    const el = scrollContentRef.current;
    if (!el) return;
    const onScroll = () => {
      if (el.scrollTop > 40 && headerExpanded) setHeaderExpanded(false);
      if (el.scrollTop < 10 && !headerExpanded) setHeaderExpanded(true);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [headerExpanded]);

  // Standard catalog = OpenAI voices + Google Standard/WaveNet for selected language
  // Premium catalog = ElevenLabs voices + Google Chirp3-HD for selected language
  const fullCatalog = useMemo(() => {
    if (voiceTier === "premium") return [...premiumVoices, ...googlePremiumVoices];
    return [...STANDARD_VOICES, ...googleVoices];
  }, [voiceTier, premiumVoices, googlePremiumVoices, googleVoices]);

  const availableGenders = useMemo(() =>
    Array.from(new Set(fullCatalog.map(v => String(v.gender || "").toLowerCase()).filter(Boolean))).sort(),
    [fullCatalog]
  );
  const availableAccents = useMemo(() =>
    Array.from(new Set(fullCatalog.map(v => String(v.accent || "")).filter(Boolean))).sort(),
    [fullCatalog]
  );
  const availableLanguages = useMemo(() =>
    Array.from(new Set(fullCatalog.map(v => String(v.language || "")).filter(Boolean))).sort(),
    [fullCatalog]
  );

  const filteredVoices = useMemo(() => {
    return fullCatalog.filter(voice => {
      if (filterGender !== "all" && String(voice.gender || "").toLowerCase() !== filterGender) return false;
      if (filterAccent !== "all" && String(voice.accent || "") !== filterAccent) return false;
      if (filterLanguage !== "all" && String(voice.language || "") !== filterLanguage) return false;
      if (showFavOnly && !favorites.has(`${voiceProvider(voice)}:${voice.id}`)) return false;
      const q = filterSearch.trim().toLowerCase();
      if (q) {
        const hay = `${voice.name} ${voice.gender || ""} ${voice.accent || ""} ${voice.language || ""} ${voice.category || ""} ${voice.tier || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [fullCatalog, filterGender, filterAccent, filterLanguage, filterSearch, showFavOnly, favorites, voiceTier]);

  // If selected voice gets filtered out, reset to first visible
  useEffect(() => {
    if (filteredVoices.length && !filteredVoices.some(v => v.id === selectedVoiceId)) {
      setSelectedVoiceId(filteredVoices[0].id);
    }
  }, [filteredVoices, selectedVoiceId]);

  const selectedScene = safeScenes[selectedSceneIndex] || null;
  const isGeneratingSelected = !!generatingVoiceoverScenes?.has(selectedSceneIndex);
  const selectedVoice = fullCatalog.find(v => v.id === selectedVoiceId) || null;

  const handleApplyToScene = () => {
    if (!selectedScene || !normalizeNarrationText(selectedScene?.narration || "")) return;
    applyVoiceToReel(selectedVoiceId, voiceTier, [selectedSceneIndex]);
  };

  const handleApplyToAll = () => {
    applyVoiceToReel(selectedVoiceId, voiceTier);
  };

  const activeFilters = [filterGender, filterAccent, filterLanguage].filter(f => f !== "all").length
    + (filterSearch.trim() ? 1 : 0);

  const clearFilters = () => {
    setFilterGender("all");
    setFilterAccent("all");
    setFilterLanguage("all");
    setFilterSearch("");
  };

  const isLoadingVoices = googleVoicesLoading || (voiceTier === "premium" && (premiumVoicesLoading || googlePremiumVoicesLoading));

  return (
    <div className="panelStickyShell" style={{ maxWidth: "100%", boxSizing: "border-box", overflowX: "hidden" }}>
      <div className="panelStickyTop" style={{ transition: "padding 0.15s" }}>

        {/* Tier toggle — always visible */}
        <div style={{ display: "flex", gap: 6, marginBottom: headerExpanded ? 10 : 0, alignItems: "center" }}>
          {[
            { key: "standard", label: "Standard" },
            { key: "premium",  label: "Premium"  },
          ].map(({ key, label }) => (
            <button key={key} type="button" onClick={() => setVoiceTier(key)}
              style={{ flex: 1, padding: "6px 0", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer",
                background: voiceTier === key ? "var(--chip-bg-strong)" : "var(--onyx-surface)",
                border: `1px solid ${voiceTier === key ? "var(--onyx-cyan)" : "var(--onyx-hairline-strong)"}`,
                color: voiceTier === key ? "var(--onyx-cyan)" : "var(--onyx-text-dim)",
              }}>
              {label}
            </button>
          ))}
          <button type="button" onClick={() => setShowFavOnly(v => !v)}
            title={showFavOnly ? "Show all voices" : "Show only favourites"}
            style={{ padding: "6px 8px", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer", flexShrink: 0,
              background: showFavOnly ? "rgba(77,208,255,0.12)" : "var(--onyx-surface)",
              border: `1px solid ${showFavOnly ? "var(--onyx-cyan)" : "var(--onyx-hairline-strong)"}`,
              color: showFavOnly ? "var(--onyx-cyan)" : "var(--onyx-text-dim)",
            }}>
            ★ Favourites
          </button>
          {/* Collapsed state: show filter icon to re-expand */}
          {!headerExpanded && (
            <button type="button" onClick={() => { setHeaderExpanded(true); if (scrollContentRef.current) scrollContentRef.current.scrollTop = 0; }}
              title="Show filters"
              style={{ width: 28, height: 28, flexShrink: 0, borderRadius: 6, border: "1px solid var(--onyx-hairline-strong)", background: "var(--onyx-surface)", color: activeFilters > 0 ? "var(--onyx-cyan)" : "var(--onyx-text-dim)", cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {activeFilters > 0 ? `⚙${activeFilters}` : "⚙"}
            </button>
          )}
        </div>

        {/* Narration volume + mute — always visible (not gated behind the
            collapsible filter panel below) since it's a control you want to
            reach for at any scroll position, not a one-time filter setting. */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: headerExpanded ? 10 : 8 }}>
          <button
            type="button"
            onClick={() => setVoiceoverVolume(voiceoverVolume > 0 ? 0 : lastVoiceoverVolumeRef.current)}
            title={voiceoverVolume > 0 ? "Mute narration" : "Unmute narration"}
            style={{
              width: 26, height: 26, flexShrink: 0, borderRadius: 6, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13,
              background: voiceoverVolume > 0 ? "var(--onyx-surface)" : "var(--onyx-amber-soft)",
              border: `1px solid ${voiceoverVolume > 0 ? "var(--onyx-hairline-strong)" : "var(--onyx-amber)"}`,
              color: voiceoverVolume > 0 ? "var(--onyx-text-dim)" : "var(--onyx-amber)",
            }}
          >
            {voiceoverVolume > 0 ? "🔊" : "🔇"}
          </button>
          <input
            type="range" min="0" max="100" step="1"
            value={voiceoverVolume ?? 100}
            onChange={e => setVoiceoverVolume(Number(e.target.value))}
            style={{ flex: 1 }}
          />
          <span style={{ fontSize: 11, color: "var(--onyx-text-dim)", fontVariantNumeric: "tabular-nums", width: 34, textAlign: "right", flexShrink: 0 }}>
            {voiceoverVolume ?? 100}%
          </span>
        </div>

        {/* Expanded filter panel */}
        {headerExpanded && (
          <>
            {/* Language selector — applies to Google voices in both tiers */}
            <div style={{ marginBottom: 10 }}>
              <label style={LABEL_STYLE}>
                Language
                <select value={googleLanguage} onChange={e => setGoogleLanguage(e.target.value)} style={SELECT_STYLE}>
                  {GOOGLE_LANGUAGES.map(l => (
                    <option key={l.code} value={l.code}>{l.label}</option>
                  ))}
                </select>
              </label>
            </div>

            {/* Multilingual note */}
            <div style={{ fontSize: 10, color: "var(--onyx-text-faint)", marginBottom: 8, lineHeight: 1.4 }}>
              {voiceTier === "standard"
                ? "Multilingual voices speak any language. Select a language above for additional regional voices."
                : "Premium voices speak 29+ languages automatically. Select a language above for Premium HD regional voices."}
            </div>

            {/* Speed */}
            <div style={{ marginBottom: 10, flexShrink: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                <span style={{ fontSize: 11, color: "var(--onyx-text-dim)" }}>Speed</span>
                <span style={{ fontSize: 11, color: "var(--onyx-text-dim)", fontVariantNumeric: "tabular-nums" }}>{speed.toFixed(1)}×</span>
              </div>
              <input type="range" min="0.5" max="2" step="0.1"
                value={speed}
                onChange={e => setSpeed(Number(e.target.value))}
                style={{ width: "100%" }}
              />
            </div>

            {/* Filters */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 6 }}>
              <label style={LABEL_STYLE}>
                Gender
                <select value={filterGender} onChange={e => setFilterGender(e.target.value)} style={SELECT_STYLE}>
                  <option value="all">All</option>
                  {availableGenders.map(g => <option key={g} value={g}>{g.charAt(0).toUpperCase() + g.slice(1)}</option>)}
                </select>
              </label>
              <label style={LABEL_STYLE}>
                Accent
                <select value={filterAccent} onChange={e => setFilterAccent(e.target.value)} style={SELECT_STYLE}>
                  <option value="all">All</option>
                  {availableAccents.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </label>
              {availableLanguages.length > 1 && (
                <label style={LABEL_STYLE}>
                  Language
                  <select value={filterLanguage} onChange={e => setFilterLanguage(e.target.value)} style={SELECT_STYLE}>
                    <option value="all">All</option>
                    {availableLanguages.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </label>
              )}
            </div>
            <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 8 }}>
              <input
                value={filterSearch}
                onChange={e => setFilterSearch(e.target.value)}
                placeholder="Search voices…"
                style={{ flex: 1, background: "var(--onyx-bg-2)", border: "1px solid var(--onyx-hairline-strong)", color: "var(--onyx-text)", borderRadius: 4, padding: "6px 8px", fontSize: 11, outline: "none" }}
              />
              {activeFilters > 0 && (
                <button type="button" onClick={clearFilters}
                  style={{ fontSize: 10, padding: "5px 8px", borderRadius: 4, background: "rgba(255,255,255,0.06)", border: "1px solid var(--onyx-hairline-strong)", color: "var(--onyx-text-dim)", cursor: "pointer", flexShrink: 0, whiteSpace: "nowrap" }}>
                  Clear ({activeFilters})
                </button>
              )}
            </div>

            {voMinutes && voiceTier !== "premium" && (
              <div style={{ fontSize: 10, color: "var(--onyx-text-faint)", marginBottom: 6 }}>
                VO minutes: {voMinutes.minutes_used ?? "?"} / {voMinutes.minutes_limit ?? "?"}
              </div>
            )}

            {isLoadingVoices && <div style={{ fontSize: 11, color: "var(--onyx-text-dim)", marginBottom: 6 }}>Loading voices…</div>}
            {premiumVoicesError && <div style={{ fontSize: 11, color: "#f87171", marginBottom: 6 }}>{premiumVoicesError}</div>}
            {googleVoicesError && <div style={{ fontSize: 11, color: "#f87171", marginBottom: 6 }}>{googleVoicesError}</div>}
          </>
        )}
      </div>

      <div className="panelStickyContent" ref={scrollContentRef}>

        {/* Voice card list */}
        <div style={{ display: "grid", gap: 6, marginBottom: 12 }}>
          {filteredVoices.map(voice => {
            const isSelected = voice.id === selectedVoiceId;
            const isPlaying = playingPreviewId === voice.id;
            const isLoadingPreview = previewLoadingId === voice.id;
            const starred = favorites.has(`${voiceProvider(voice)}:${voice.id}`);
            const isPopular = voiceTier === "premium" && POPULAR_VOICE_NAMES.has(String(voice.name || "").split(" - ")[0].trim());
            return (
              <div
                key={voice.id}
                onClick={() => setSelectedVoiceId(voice.id)}
                style={{
                  border: `1px solid ${isSelected ? "var(--onyx-cyan)" : "var(--onyx-hairline)"}`,
                  borderRadius: 8,
                  padding: "8px 10px",
                  background: isSelected ? "var(--chip-bg-strong)" : "var(--onyx-surface)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 8,
                  cursor: "pointer",
                }}
              >
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
                    <span style={{ fontWeight: 600, fontSize: 12, color: "var(--onyx-text)" }}>{voice.name}</span>
                    {/* Show Google tier quality badge (Wavenet, Chirp3-HD, etc) but no provider label */}
                    {voice.tier && voice.provider === "google" && (
                      <span style={GOOGLE_TIER_BADGE[voice.tier] || GOOGLE_TIER_BADGE["Standard"]}>
                        {TIER_DISPLAY_LABEL[voice.tier] || voice.tier}
                      </span>
                    )}
                    {isPopular && (
                      <span style={{ ...BADGE_BASE, color: "var(--onyx-cyan)", border: "1px solid var(--onyx-cyan)" }}>
                        Popular
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 10, color: "var(--onyx-text-faint)", marginTop: 2 }}>
                    {[voice.gender, voice.accent !== voice.language ? voice.accent : null].filter(Boolean).join(" · ")}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={e => toggleFavorite(e, voice)}
                  title={starred ? "Remove from favourites" : "Add to favourites"}
                  style={{
                    width: 22, height: 22, flexShrink: 0, border: "none", background: "transparent",
                    color: starred ? "var(--onyx-cyan)" : "var(--onyx-text-faint)",
                    cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", padding: 0,
                  }}
                >
                  {starred ? "★" : "☆"}
                </button>
                <button
                  type="button"
                  onClick={e => { e.stopPropagation(); handlePreviewVoice(voice, voiceTier); }}
                  disabled={isLoadingPreview}
                  title="Preview voice"
                  style={{
                    width: 26, height: 26, flexShrink: 0, borderRadius: 5, fontSize: 11,
                    background: isPlaying ? "var(--onyx-cyan)" : "var(--chip-bg)",
                    border: isPlaying ? "1px solid var(--onyx-cyan)" : "1px solid var(--onyx-hairline-strong)",
                    color: isPlaying ? "var(--onyx-bg-2)" : "var(--onyx-text)",
                    cursor: isLoadingPreview ? "wait" : "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}
                >
                  {isLoadingPreview ? "…" : isPlaying ? "■" : "▶"}
                </button>
              </div>
            );
          })}
          {!filteredVoices.length && !isLoadingVoices && (
            <div style={{ fontSize: 12, color: "var(--onyx-text-dim)", padding: "8px 0" }}>No voices match filters.</div>
          )}
        </div>

        {/* Selected voice summary */}
        {selectedVoice && (
          <div style={{ marginBottom: 12, padding: "7px 10px", borderRadius: 7, background: "var(--chip-bg-strong)", border: "1px solid var(--onyx-cyan)", fontSize: 11, color: "var(--onyx-text)" }}>
            Selected: <strong style={{ color: "var(--onyx-text)" }}>{selectedVoice.name}</strong>
          </div>
        )}

        {/* Scene list */}
        <div style={{ fontSize: 11, color: "var(--onyx-text-dim)", marginBottom: 6, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
          Scenes
        </div>
        <div style={{ display: "grid", gap: 6, marginBottom: 12 }}>
          {safeScenes.map((scene, index) => {
            const narration = normalizeNarrationText(scene?.narration || "");
            const isSelected = index === selectedSceneIndex;
            const isGenerating = !!generatingVoiceoverScenes?.has(index);
            return (
              <button
                key={scene?.id ?? index}
                type="button"
                onClick={() => setSelectedSceneIndex(index)}
                style={{
                  textAlign: "left",
                  border: `0.5px solid ${isSelected ? "var(--onyx-cyan)" : "var(--onyx-hairline)"}`,
                  borderRadius: 8,
                  padding: "8px 10px",
                  background: isSelected ? "var(--chip-bg-strong)" : "var(--onyx-surface)",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6 }}>
                  <div style={{ fontWeight: 600, fontSize: 11, color: "var(--onyx-text)" }}>Scene {index + 1}</div>
                  {isGenerating ? (
                    <span style={{ fontSize: 10, color: "var(--onyx-cyan,#4dd0ff)" }}>⏳ generating…</span>
                  ) : scene?.voiceoverVoiceName ? (
                    <span style={{ fontSize: 10, color: "var(--onyx-text-faint)" }}>🎙 {scene.voiceoverVoiceName}</span>
                  ) : scene?.voiceoverUrl ? (
                    <span style={{ fontSize: 10, color: "var(--onyx-text-faint)" }}>🎙 voice assigned</span>
                  ) : (
                    <span style={{ fontSize: 10, color: "var(--onyx-text-faint)" }}>No voice</span>
                  )}
                </div>
                <div style={{ fontSize: 11, color: "var(--onyx-text-dim)", overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                  {narration || <span style={{ opacity: 0.4 }}>No narration</span>}
                </div>
              </button>
            );
          })}
          {!safeScenes.length && (
            <div style={{ fontSize: 12, color: "var(--onyx-text-dim)" }}>No scenes in this reel.</div>
          )}
        </div>

        {/* Apply buttons */}
        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            onClick={handleApplyToScene}
            disabled={!selectedScene || !normalizeNarrationText(selectedScene?.narration || "") || loading || isGeneratingSelected || !selectedVoice}
            style={{ flex: 1, padding: "9px 10px", borderRadius: 8, fontSize: 12, fontWeight: 600, background: "var(--btn-primary-grad)", border: "none", color: "var(--btn-primary-text)", cursor: (loading || isGeneratingSelected) ? "not-allowed" : "pointer" }}
          >
            {isGeneratingSelected ? "Applying…" : "Apply to scene"}
          </button>
          <button
            type="button"
            onClick={handleApplyToAll}
            disabled={!narratedSceneIndexes.length || loading || isVoiceoverGenerating || !selectedVoice}
            style={{ flex: 1, padding: "9px 10px", borderRadius: 8, fontSize: 12, fontWeight: 600, background: "var(--chip-bg,rgba(255,255,255,0.06))", border: "0.5px solid var(--onyx-hairline-strong)", color: "var(--onyx-text)", cursor: (loading || isVoiceoverGenerating) ? "not-allowed" : "pointer" }}
          >
            {isVoiceoverGenerating ? "Applying…" : "Apply to all"}
          </button>
        </div>
      </div>

      {status && (
        <div style={{ padding: "8px 14px", fontSize: 12, color: "var(--onyx-success)", background: "var(--onyx-surface-2)", borderTop: "1px solid var(--onyx-hairline)", textAlign: "center" }}>
          {status}
        </div>
      )}
    </div>
  );
}
