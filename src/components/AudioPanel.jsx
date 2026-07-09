import React, { useState, useEffect, useRef, useCallback } from "react";
import { getAuthHeaders } from "../utils/auth.js";

// ── Constants ──────────────────────────────────────────────────────────────────

const GOOGLE_LANGUAGES = [
  { code: "en-US",  label: "English (US)" },
  { code: "en-GB",  label: "English (UK)" },
  { code: "de-DE",  label: "German" },
  { code: "fr-FR",  label: "French" },
  { code: "it-IT",  label: "Italian" },
  { code: "es-ES",  label: "Spanish (Spain)" },
  { code: "es-US",  label: "Spanish (US)" },
  { code: "ja-JP",  label: "Japanese" },
  { code: "cmn-CN", label: "Mandarin Chinese" },
  { code: "ko-KR",  label: "Korean" },
  { code: "pt-BR",  label: "Portuguese (Brazil)" },
  { code: "nl-NL",  label: "Dutch" },
  { code: "pl-PL",  label: "Polish" },
  { code: "sv-SE",  label: "Swedish" },
  { code: "ru-RU",  label: "Russian" },
  { code: "ar-XA",  label: "Arabic" },
  { code: "hi-IN",  label: "Hindi" },
];

const GOOGLE_TIERS = [
  { key: "all",       label: "All" },
  { key: "Chirp3-HD", label: "Premium HD" },
  { key: "Neural2",   label: "Neural2" },
  { key: "Wavenet",   label: "Standard+" },
  { key: "Standard",  label: "Standard" },
];

// Generic display labels — never expose underlying provider tier names to the user
const TIER_DISPLAY_LABEL = {
  "Wavenet": "Standard+",
  "Chirp3-HD": "Premium HD",
};

// Voice IDs that get a "Popular" badge (ElevenLabs Premium tab)
const POPULAR_VOICE_NAMES = new Set(["Natasha", "Aaron"]);

// ── Styles ─────────────────────────────────────────────────────────────────────

const S = {
  panel: {
    display: "flex",
    flexDirection: "column",
    height: "100%",
    fontFamily: "var(--onyx-font, system-ui)",
    fontSize: 12,
    color: "var(--onyx-text, #f1f5fb)",
    overflow: "hidden",
  },
  header: {
    padding: "10px 12px 0",
    borderBottom: "0.5px solid var(--onyx-hairline, rgba(255,255,255,0.07))",
    flexShrink: 0,
  },
  providerTabs: {
    display: "flex",
    gap: 2,
    marginBottom: 8,
  },
  tab: (active) => ({
    flex: 1,
    padding: "5px 0",
    background: active ? "var(--chip-bg-strong, rgba(255,255,255,0.10))" : "transparent",
    border: "none",
    borderRadius: 6,
    color: active ? "var(--onyx-text, #f1f5fb)" : "var(--onyx-text-dim, rgba(241,245,251,0.5))",
    cursor: "pointer",
    fontSize: 11,
    fontFamily: "inherit",
    fontWeight: active ? 600 : 400,
    transition: "all 0.15s",
    whiteSpace: "nowrap",
  }),
  filterRow: {
    display: "flex",
    gap: 6,
    padding: "8px 12px",
    borderBottom: "0.5px solid var(--onyx-hairline, rgba(255,255,255,0.07))",
    flexShrink: 0,
    alignItems: "center",
  },
  select: {
    flex: 1,
    background: "rgba(255,255,255,0.05)",
    border: "0.5px solid rgba(255,255,255,0.12)",
    borderRadius: 6,
    color: "var(--onyx-text, #f1f5fb)",
    fontSize: 11,
    padding: "4px 8px",
    fontFamily: "inherit",
    cursor: "pointer",
  },
  favToggle: (active) => ({
    display: "flex",
    alignItems: "center",
    gap: 4,
    padding: "4px 8px",
    background: active ? "rgba(77,208,255,0.12)" : "rgba(255,255,255,0.05)",
    border: active ? "0.5px solid rgba(77,208,255,0.4)" : "0.5px solid rgba(255,255,255,0.12)",
    borderRadius: 6,
    color: active ? "var(--onyx-cyan, #4dd0ff)" : "var(--onyx-text-dim, rgba(241,245,251,0.5))",
    cursor: "pointer",
    fontSize: 11,
    fontFamily: "inherit",
    fontWeight: active ? 600 : 400,
    whiteSpace: "nowrap",
    flexShrink: 0,
  }),
  voiceList: {
    flex: 1,
    overflowY: "auto",
    padding: "6px 8px",
  },
  voiceRow: (selected) => ({
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "7px 8px",
    borderRadius: 7,
    cursor: "pointer",
    background: selected ? "rgba(77,208,255,0.10)" : "transparent",
    border: selected ? "0.5px solid rgba(77,208,255,0.3)" : "0.5px solid transparent",
    marginBottom: 3,
    transition: "background 0.1s",
  }),
  voiceName: {
    flex: 1,
    fontSize: 12,
    color: "var(--onyx-text, #f1f5fb)",
    fontWeight: 500,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  voiceMeta: {
    fontSize: 10,
    color: "var(--onyx-text-faint, rgba(241,245,251,0.40))",
    whiteSpace: "nowrap",
  },
  previewBtn: (playing) => ({
    width: 22,
    height: 22,
    borderRadius: 11,
    border: "none",
    background: playing ? "var(--onyx-cyan, #4dd0ff)" : "rgba(255,255,255,0.10)",
    color: playing ? "#000" : "var(--onyx-text-dim)",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    fontSize: 10,
  }),
  starBtn: (starred) => ({
    width: 20,
    height: 20,
    border: "none",
    background: "transparent",
    color: starred ? "var(--onyx-cyan, #4dd0ff)" : "rgba(241,245,251,0.25)",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    fontSize: 13,
    padding: 0,
    lineHeight: 1,
    transition: "color 0.15s",
  }),
  badge: (tier) => {
    const colors = {
      "Chirp3-HD": { bg: "rgba(77,208,255,0.15)", color: "#4dd0ff" },
      "Chirp-HD":  { bg: "rgba(77,208,255,0.10)", color: "#4dd0ff" },
      "Studio":    { bg: "rgba(255,181,71,0.15)",  color: "#ffb547" },
      "Neural2":   { bg: "rgba(145,110,255,0.15)", color: "#916eff" },
      "Wavenet":   { bg: "rgba(72,187,120,0.15)",  color: "#48bb78" },
      "Standard":  { bg: "rgba(255,255,255,0.07)", color: "rgba(241,245,251,0.5)" },
    };
    const c = colors[tier] || colors["Standard"];
    return {
      fontSize: 9,
      padding: "1px 5px",
      borderRadius: 4,
      background: c.bg,
      color: c.color,
      fontWeight: 600,
      whiteSpace: "nowrap",
    };
  },
  popularBadge: {
    fontSize: 9,
    padding: "1px 5px",
    borderRadius: 4,
    background: "rgba(77,208,255,0.15)",
    color: "var(--onyx-cyan, #4dd0ff)",
    fontWeight: 600,
    whiteSpace: "nowrap",
  },
  sectionTitle: {
    fontSize: 10,
    color: "var(--onyx-text-faint, rgba(241,245,251,0.40))",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    padding: "10px 12px 4px",
    flexShrink: 0,
  },
  slider: {
    width: "100%",
    accentColor: "var(--onyx-cyan, #4dd0ff)",
    cursor: "pointer",
  },
  volumeRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "4px 12px",
  },
  volumeLabel: {
    width: 70,
    fontSize: 11,
    color: "var(--onyx-text-dim, rgba(241,245,251,0.62))",
    flexShrink: 0,
  },
  volumeValue: {
    width: 30,
    fontSize: 11,
    color: "var(--onyx-text-dim)",
    textAlign: "right",
    flexShrink: 0,
  },
  regenBtn: {
    margin: "8px 12px",
    padding: "7px 12px",
    background: "rgba(77,208,255,0.10)",
    border: "0.5px solid rgba(77,208,255,0.3)",
    borderRadius: 7,
    color: "var(--onyx-cyan, #4dd0ff)",
    fontSize: 11,
    fontFamily: "inherit",
    cursor: "pointer",
    fontWeight: 600,
    textAlign: "center",
  },
  divider: {
    height: "0.5px",
    background: "var(--onyx-hairline, rgba(255,255,255,0.07))",
    margin: "4px 0",
  },
  emptyState: {
    padding: 20,
    textAlign: "center",
    color: "var(--onyx-text-faint, rgba(241,245,251,0.40))",
    fontSize: 11,
  },
  multilingualNote: {
    padding: "6px 12px",
    fontSize: 10,
    color: "var(--onyx-text-faint, rgba(241,245,251,0.40))",
    lineHeight: 1.4,
    borderBottom: "0.5px solid var(--onyx-hairline, rgba(255,255,255,0.07))",
    flexShrink: 0,
  },
};

// ── Helper ─────────────────────────────────────────────────────────────────────

function genderIcon(gender) {
  if (gender === "male") return "♂";
  if (gender === "female") return "♀";
  return "◈";
}

// ── AudioPanel ─────────────────────────────────────────────────────────────────

export default function AudioPanel({
  voiceoverVolume = 100, setVoiceoverVolume,
  musicVolume = 60,       setMusicVolume,
  onRegenerateAllVO,
  brand = {},
}) {
  const [provider, setProvider] = useState("openai");
  const [voices, setVoices]     = useState([]);
  const [loading, setLoading]   = useState(false);
  const [selectedVoice, setSelectedVoice] = useState(brand?.default_voice_id || null);

  // Google-specific filters
  const [googleLang, setGoogleLang] = useState("en-US");
  const [googleTier, setGoogleTier] = useState("all");

  // Favorites
  const [favorites, setFavorites] = useState(new Set()); // Set of "provider:voice_id"
  const [showFavOnly, setShowFavOnly] = useState(false);

  // Preview audio
  const audioRef = useRef(null);
  const [playingVoice, setPlayingVoice] = useState(null);

  // Fetch voices when provider changes (or Google lang changes)
  useEffect(() => {
    let cancelled = false;
    setVoices([]);
    setLoading(true);
    const params = new URLSearchParams({ provider });
    if (provider === "google") params.set("language", googleLang);
    fetch(`/api/tts/voices?${params}`, { headers: getAuthHeaders() })
      .then(r => r.json())
      .then(data => { if (!cancelled) setVoices(data.voices || []); })
      .catch(err => { console.error("voices fetch:", err); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [provider, googleLang]);

  // Fetch favorites once on mount
  useEffect(() => {
    fetch("/api/tts/favorites", { headers: getAuthHeaders() })
      .then(r => r.json())
      .then(data => {
        if (data.favorites) {
          setFavorites(new Set(data.favorites.map(f => `${f.provider}:${f.voice_id}`)));
        }
      })
      .catch(() => {});
  }, []);

  // Stop preview when provider changes
  useEffect(() => {
    stopPreview();
  }, [provider]);

  function stopPreview() {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
    }
    setPlayingVoice(null);
  }

  function previewVoice(voice) {
    if (playingVoice === voice.id) {
      stopPreview();
      return;
    }
    stopPreview();
    let url;
    if (provider === "openai") {
      url = `/api/tts/voice-preview-standard?voice=${encodeURIComponent(voice.id)}`;
    } else if (provider === "google") {
      url = `/api/tts/voice-preview-google?voice=${encodeURIComponent(voice.id)}`;
    } else {
      url = `/api/tts/voice-preview?voice_id=${encodeURIComponent(voice.id)}`;
    }
    const audio = new Audio(url);
    audioRef.current = audio;
    audio.onended = () => setPlayingVoice(null);
    audio.onerror = () => setPlayingVoice(null);
    audio.play().catch(() => setPlayingVoice(null));
    setPlayingVoice(voice.id);
  }

  function toggleFavorite(e, voice) {
    e.stopPropagation();
    const key = `${provider}:${voice.id}`;
    const starred = favorites.has(key);
    setFavorites(prev => {
      const next = new Set(prev);
      if (starred) next.delete(key); else next.add(key);
      return next;
    });
    if (starred) {
      fetch(`/api/tts/favorites?voice_id=${encodeURIComponent(voice.id)}&provider=${encodeURIComponent(provider)}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      }).catch(() => {});
    } else {
      fetch("/api/tts/favorites", {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ voice_id: voice.id, provider }),
      }).catch(() => {});
    }
  }

  // Filtered voice list
  const displayedVoices = (() => {
    let list = provider === "google" && googleTier !== "all"
      ? voices.filter(v => v.tier === googleTier)
      : voices;
    if (showFavOnly) {
      list = list.filter(v => favorites.has(`${provider}:${v.id}`));
    }
    return list;
  })();

  const renderVoiceList = () => {
    if (loading) return <div style={S.emptyState}>Loading voices…</div>;
    if (!displayedVoices.length) {
      return <div style={S.emptyState}>{showFavOnly ? "No favourites yet — star a voice to save it here." : "No voices found"}</div>;
    }

    if (provider === "openai") {
      return displayedVoices.map(v => {
        const starred = favorites.has(`openai:${v.id}`);
        return (
          <div key={v.id} style={S.voiceRow(selectedVoice === v.id)}
            onClick={() => setSelectedVoice(v.id)}>
            <span style={{ fontSize: 11, color: "var(--onyx-text-faint)", width: 14 }}>{genderIcon(v.gender)}</span>
            <span style={S.voiceName}>{v.name}</span>
            <span style={S.voiceMeta}>{v.style}</span>
            <button style={S.starBtn(starred)}
              onClick={e => toggleFavorite(e, v)}
              title={starred ? "Remove from favourites" : "Add to favourites"}>
              {starred ? "★" : "☆"}
            </button>
            <button style={S.previewBtn(playingVoice === v.id)}
              onClick={e => { e.stopPropagation(); previewVoice(v); }}>
              {playingVoice === v.id ? "■" : "▶"}
            </button>
          </div>
        );
      });
    }

    if (provider === "elevenlabs") {
      return displayedVoices.map(v => {
        const starred = favorites.has(`elevenlabs:${v.id}`);
        const isPopular = POPULAR_VOICE_NAMES.has(String(v.name || "").split(" - ")[0].trim());
        return (
          <div key={v.id} style={S.voiceRow(selectedVoice === v.id)}
            onClick={() => setSelectedVoice(v.id)}>
            <span style={S.voiceName}>{v.name}</span>
            {isPopular && <span style={S.popularBadge}>Popular</span>}
            {v.labels?.accent && <span style={S.voiceMeta}>{v.labels.accent}</span>}
            <button style={S.starBtn(starred)}
              onClick={e => toggleFavorite(e, v)}
              title={starred ? "Remove from favourites" : "Add to favourites"}>
              {starred ? "★" : "☆"}
            </button>
            <button style={S.previewBtn(playingVoice === v.id)}
              onClick={e => { e.stopPropagation(); previewVoice(v); }}>
              {playingVoice === v.id ? "■" : "▶"}
            </button>
          </div>
        );
      });
    }

    // Google
    return displayedVoices.map(v => {
      const starred = favorites.has(`google:${v.id}`);
      return (
        <div key={v.id} style={S.voiceRow(selectedVoice === v.id)}
          onClick={() => setSelectedVoice(v.id)}>
          <span style={{ fontSize: 11, color: "var(--onyx-text-faint)", width: 14 }}>{genderIcon(v.gender)}</span>
          <span style={S.voiceName}>{v.name}</span>
          <span style={S.badge(v.tier)}>{TIER_DISPLAY_LABEL[v.tier] || v.tier}</span>
          <button style={S.starBtn(starred)}
            onClick={e => toggleFavorite(e, v)}
            title={starred ? "Remove from favourites" : "Add to favourites"}>
            {starred ? "★" : "☆"}
          </button>
          <button style={S.previewBtn(playingVoice === v.id)}
            onClick={e => { e.stopPropagation(); previewVoice(v); }}>
            {playingVoice === v.id ? "■" : "▶"}
          </button>
        </div>
      );
    });
  };

  return (
    <div style={S.panel}>
      {/* Provider tabs */}
      <div style={S.header}>
        <div style={S.providerTabs}>
          {[
            { key: "openai",      label: "Standard" },
            { key: "elevenlabs",  label: "Premium" },
            { key: "google",      label: "More Voices" },
          ].map(({ key, label }) => (
            <button key={key} style={S.tab(provider === key)}
              onClick={() => setProvider(key)}>{label}</button>
          ))}
        </div>
      </div>

      {/* Multilingual note for OpenAI and ElevenLabs */}
      {(provider === "openai" || provider === "elevenlabs") && (
        <div style={S.multilingualNote}>
          {provider === "openai"
            ? "These voices are multilingual — just write your script in any language and the voice will speak it."
            : "All voices use eleven_multilingual_v2 and speak 29+ languages automatically — language follows your script text."}
        </div>
      )}

      {/* Google filters + Favourites toggle */}
      {provider === "google" ? (
        <div style={S.filterRow}>
          <select value={googleLang} onChange={e => setGoogleLang(e.target.value)} style={S.select}>
            {GOOGLE_LANGUAGES.map(l => (
              <option key={l.code} value={l.code}>{l.label}</option>
            ))}
          </select>
          <select value={googleTier} onChange={e => setGoogleTier(e.target.value)} style={{ ...S.select, flex: "0 0 auto" }}>
            {GOOGLE_TIERS.map(t => (
              <option key={t.key} value={t.key}>{t.label}</option>
            ))}
          </select>
          <button style={S.favToggle(showFavOnly)} onClick={() => setShowFavOnly(v => !v)}>
            ★ Favourites
          </button>
        </div>
      ) : (
        <div style={{ ...S.filterRow, justifyContent: "flex-end" }}>
          <button style={S.favToggle(showFavOnly)} onClick={() => setShowFavOnly(v => !v)}>
            ★ Favourites
          </button>
        </div>
      )}

      {/* Voice list */}
      <div style={S.voiceList}>
        {renderVoiceList()}
      </div>

      <div style={S.divider} />

      {/* Volume controls */}
      <div style={S.sectionTitle}>Mix</div>
      <div style={S.volumeRow}>
        <span style={S.volumeLabel}>Voice Over</span>
        <input type="range" min={0} max={100} value={voiceoverVolume}
          onChange={e => setVoiceoverVolume(Number(e.target.value))} style={S.slider} />
        <span style={S.volumeValue}>{voiceoverVolume}%</span>
      </div>
      <div style={S.volumeRow}>
        <span style={S.volumeLabel}>Music</span>
        <input type="range" min={0} max={100} value={musicVolume}
          onChange={e => setMusicVolume(Number(e.target.value))} style={S.slider} />
        <span style={S.volumeValue}>{musicVolume}%</span>
      </div>

      {/* Regenerate all VO */}
      {onRegenerateAllVO && (
        <button style={S.regenBtn} onClick={onRegenerateAllVO}>
          ↻ Regenerate All Voice Over
        </button>
      )}
    </div>
  );
}
