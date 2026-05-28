// AudioPanel.jsx
console.log("AUDIO PANEL FIX LIVE");
import React, { useEffect, useMemo, useRef, useState } from "react";
import HelpTooltip from "./HelpTooltip.jsx";
import { supabase } from "../supabaseClient.js";
import { getAuthHeaders } from "../utils/auth.js";

const AUDIO_VOICE_PREFS_KEY = "onyx_audio_voice_prefs_v4";
const AUTO_REFRESH_DEBOUNCE_MS = 1000;

function safeJsonParse(raw, fallback) {
  try {
    const v = JSON.parse(raw);
    return v ?? fallback;
  } catch {
    return fallback;
  }
}

function normalizeNarrationText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function AudioPreview({ src, volume = 100, name = "" }) {
  const ref = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  useEffect(() => {
    if (!ref.current) return;
    ref.current.volume = Math.max(0, Math.min(1, Number(volume || 0) / 100));
  }, [src, volume]);

  function toggle() {
    if (!ref.current) return;
    if (playing) { ref.current.pause(); setPlaying(false); }
    else { ref.current.play(); setPlaying(true); }
  }

  function fmt(s) {
    const n = Math.round(s || 0);
    return `${Math.floor(n/60)}:${String(n%60).padStart(2,"0")}`;
  }

  if (!src) return null;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#0c1016", border: "1px solid #1f2937", borderRadius: 8, padding: "8px 12px" }}>
      <audio
        ref={ref}
        src={src}
        onTimeUpdate={() => { setCurrentTime(ref.current.currentTime); setProgress(ref.current.duration ? ref.current.currentTime / ref.current.duration : 0); }}
        onLoadedMetadata={() => setDuration(ref.current.duration)}
        onEnded={() => { setPlaying(false); setProgress(0); setCurrentTime(0); }}
        style={{ display: "none" }}
      />
      <button onClick={toggle} style={{ width: 28, height: 28, borderRadius: "50%", background: "#1d4ed8", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        {playing ? (
          <svg width="10" height="12" viewBox="0 0 10 12" fill="white"><rect x="0" y="0" width="3" height="12"/><rect x="7" y="0" width="3" height="12"/></svg>
        ) : (
          <svg width="10" height="12" viewBox="0 0 10 12" fill="white"><polygon points="0,0 10,6 0,12"/></svg>
        )}
      </button>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
        <div style={{ height: 3, background: "#1f2937", borderRadius: 2, overflow: "hidden", cursor: "pointer" }}
          onClick={e => {
            if (!ref.current || !ref.current.duration) return;
            const rect = e.currentTarget.getBoundingClientRect();
            const pct = (e.clientX - rect.left) / rect.width;
            ref.current.currentTime = pct * ref.current.duration;
          }}>
          <div style={{ height: "100%", width: `${progress * 100}%`, background: "linear-gradient(90deg, #7c3aed, #ec4899)", borderRadius: 2, transition: "width 0.1s" }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontSize: 10, color: "#94a3b8" }}>{fmt(currentTime)}</span>
          <span style={{ fontSize: 10, color: "#94a3b8" }}>{fmt(duration)}</span>
        </div>
      </div>
    </div>
  );
}

const STANDARD_VOICES = [
  { id: "alloy",   name: "Alloy",   gender: "neutral", accent: "US", language: "English" },
  { id: "echo",    name: "Echo",    gender: "male",    accent: "US", language: "English" },
  { id: "fable",   name: "Fable",   gender: "male",    accent: "UK", language: "English" },
  { id: "onyx",    name: "Onyx",    gender: "male",    accent: "US", language: "English" },
  { id: "nova",    name: "Nova",    gender: "female",  accent: "US", language: "English" },
  { id: "shimmer", name: "Shimmer", gender: "female",  accent: "US", language: "English" },
  { id: "ash",     name: "Ash",     gender: "male",    accent: "US", language: "English" },
  { id: "coral",   name: "Coral",   gender: "female",  accent: "US", language: "English" },
  { id: "sage",    name: "Sage",    gender: "female",  accent: "UK", language: "English" },
  { id: "ballad",  name: "Ballad",  gender: "male",    accent: "US", language: "English" },
  { id: "verse",   name: "Verse",   gender: "male",    accent: "US", language: "English" },
];

function formatDuration(seconds) {
  const n = Number(seconds);
  if (!Number.isFinite(n) || n <= 0) return "";
  const whole = Math.round(n);
  const mins = Math.floor(whole / 60);
  const secs = whole % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

function normalizeUploadItem(file) {
  return {
    id: file.id || file._id || file.url || `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    name: file.name || file.fileName || file.filename || (file.url ? String(file.url).split("/").pop() : "audio"),
    url: file.url || "",
    mediaType: "audio",
    source: "upload",
    duration: file.duration || ""
  };
}

function normalizePremiumVoice(voice, index = 0) {
  const labels = voice?.labels && typeof voice.labels === "object" ? voice.labels : {};
  const language =
    voice?.language ||
    labels.language ||
    (String(labels.accent || "").toLowerCase().includes("british") ? "English" : "") ||
    "English";
  const gender = String(voice?.gender || labels.gender || "unknown").toLowerCase();
  const accent = voice?.accent || labels.accent || labels.use_case || "unknown";

  return {
    id: String(voice?.id || voice?.voice_id || `premium_${index}`),
    name: String(voice?.name || `Premium Voice ${index + 1}`),
    gender,
    accent: String(accent),
    language: String(language),
    previewUrl: String(voice?.previewUrl || voice?.preview_url || ""),
    category: String(voice?.category || ""),
    labels
  };
}

// ===========================
// MAIN AUDIO PANEL
// ===========================

export default function AudioPanel({
  tab,
  setTab,
  scenes = [],
  setScenes,
  voiceoverVolume,
  setVoiceoverVolume,
  musicVolume,
  setMusicVolume,
  musicUrl,
  setMusicUrl
}) {
  const [uploads, setUploads] = useState([]);
  const fileInputRef = useRef(null);
  const [myMusicTracks, setMyMusicTracks] = useState([]);
  const [myMusicLoading, setMyMusicLoading] = useState(false);

  const [tracks, setTracks] = useState([]);
  const [stockQuery, setStockQuery] = useState("");
  const [stockLoading, setStockLoading] = useState(false);
  const [stockError, setStockError] = useState("");

  const [voiceTier, setVoiceTier] = useState("standard");
  const [language, setLanguage] = useState("all");
  const [gender, setGender] = useState("all");
  const [accent, setAccent] = useState("all");
  const [search, setSearch] = useState("");
  const [speed, setSpeed] = useState(1);

  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [appliedMusicName, setAppliedMusicName] = useState("");
  const [appliedVoiceName, setAppliedVoiceName] = useState("");
  const [selectedVoiceId, setSelectedVoiceId] = useState("alloy");

  const [premiumVoices, setPremiumVoices] = useState([]);
  const [premiumVoicesLoading, setPremiumVoicesLoading] = useState(false);
  const [premiumVoicesError, setPremiumVoicesError] = useState("");

  const [voMinutes, setVoMinutes] = useState(null);

  const [playingPreviewId, setPlayingPreviewId] = useState(null);
  const [previewLoadingId, setPreviewLoadingId] = useState(null);
  const previewAudioRef = useRef(null);

  const autoRefreshTimerRef = useRef(null);
  const autoRefreshRequestIdRef = useRef(0);
  const manualApplyInFlightRef = useRef(false);

  const safeScenes = Array.isArray(scenes) ? scenes : [];

  const reelNarration = useMemo(() => {
    return safeScenes
      .map((scene, index) => {
        const text = normalizeNarrationText(scene?.narration || "");
        if (!text) return "";
        return `Scene ${index + 1}\n${text}`;
      })
      .filter(Boolean)
      .join("\n\n");
  }, [safeScenes]);

  const staleSceneIndexes = useMemo(() => {
    return safeScenes.reduce((acc, scene, index) => {
      const narrationText = normalizeNarrationText(scene?.narration || "");
      const sourceText = normalizeNarrationText(scene?.voiceoverSourceText || "");
      const hasNarration = !!narrationText;
      const hasVoice = !!scene?.voiceoverUrl;

      if (!hasNarration) return acc;
      if (scene?.voiceoverStale) {
        acc.push(index);
        return acc;
      }
      if (hasVoice && narrationText !== sourceText) {
        acc.push(index);
      }
      return acc;
    }, []);
  }, [scenes]);

  const staleVoiceSceneCount = staleSceneIndexes.length;

  useEffect(() => {
    const prefs = safeJsonParse(localStorage.getItem(AUDIO_VOICE_PREFS_KEY), null);
    if (!prefs || typeof prefs !== "object") return;

    if (typeof prefs.voiceTier === "string") setVoiceTier(prefs.voiceTier);
    if (typeof prefs.speed === "number") setSpeed(prefs.speed);
    if (typeof prefs.selectedVoiceId === "string") setSelectedVoiceId(prefs.selectedVoiceId);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(
        AUDIO_VOICE_PREFS_KEY,
        JSON.stringify({ voiceTier, language, gender, accent, search, speed, selectedVoiceId })
      );
    } catch (_) {}
  }, [voiceTier, language, gender, accent, search, speed, selectedVoiceId]);

  const fetchVoMinutes = async () => {
    try {
      const res = await fetch("/api/user/vo-minutes", { cache: "no-store", headers: await getAuthHeaders() });
      if (!res.ok) return;
      const data = await res.json().catch(() => null);
      if (data) setVoMinutes(data);
    } catch (_) {}
  };

  const fetchPremiumVoices = async () => {
    setPremiumVoicesLoading(true);
    setPremiumVoicesError("");
    try {
      const res = await fetch("/api/tts/voices?provider=elevenlabs", { cache: "no-store", headers: await getAuthHeaders() });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || `Premium voices request failed (${res.status})`);
      const list = Array.isArray(data?.voices) ? data.voices : [];
      const normalized = list.map(normalizePremiumVoice).filter((voice) => voice.id);
      setPremiumVoices(normalized);
    } catch (err) {
      console.error("premium voices load error", err);
      setPremiumVoices([]);
      setPremiumVoicesError(err?.message || "Failed to load premium voices.");
    } finally {
      setPremiumVoicesLoading(false);
    }
  };

  useEffect(() => { fetchVoMinutes(); }, []);
  useEffect(() => { if (voiceTier === "premium") fetchPremiumVoices(); }, [voiceTier]);

  const voiceCatalog = useMemo(() => {
    return voiceTier === "premium" ? premiumVoices : STANDARD_VOICES;
  }, [voiceTier, premiumVoices]);

  const filteredVoices = useMemo(() => {
    return voiceCatalog.filter((voice) => {
      const voiceLanguage = String(voice.language || "").trim();
      const voiceGender = String(voice.gender || "").trim().toLowerCase();
      const voiceAccent = String(voice.accent || "").trim();

      if (language !== "all" && voiceLanguage !== language) return false;
      if (gender !== "all" && voiceGender !== gender) return false;
      if (accent !== "all" && voiceAccent !== accent) return false;

      const q = search.trim().toLowerCase();
      if (!q) return true;
      const hay = `${voice.name} ${voice.gender} ${voice.accent} ${voice.language} ${voice.category || ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [voiceCatalog, language, gender, accent, search]);

  useEffect(() => {
    if (!filteredVoices.some((voice) => voice.id === selectedVoiceId)) {
      setSelectedVoiceId(filteredVoices[0]?.id || voiceCatalog[0]?.id || "alloy");
    }
  }, [filteredVoices, selectedVoiceId, voiceCatalog]);

  const availableLanguages = useMemo(() => {
    return Array.from(new Set(voiceCatalog.map((voice) => String(voice.language || "").trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b));
  }, [voiceCatalog]);

  const availableAccents = useMemo(() => {
    return Array.from(new Set(voiceCatalog.map((voice) => String(voice.accent || "").trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b));
  }, [voiceCatalog]);

  const fetchUploads = async () => {
    try {
      const res = await fetch("/api/media", { cache: "no-store", headers: await getAuthHeaders() });
      const data = await res.json().catch(() => []);
      const items = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : [];
      const normalized = items
        .map(normalizeUploadItem)
        .filter((item) => item.url && /\.(mp3|wav|ogg|m4a|aac|flac|webm)(\?|#|$)/i.test(item.url));
      setUploads(normalized);
    } catch (err) {
      console.error("audio uploads load error", err);
    }
  };

  const loadMyMusic = async () => {
    setMyMusicLoading(true);
    try {
      const res = await fetch("/api/music/saved", { headers: await getAuthHeaders() });
      const data = await res.json().catch(() => ({}));
      if (res.ok && Array.isArray(data?.tracks)) setMyMusicTracks(data.tracks);
    } catch (_) {}
    finally { setMyMusicLoading(false); }
  };

  useEffect(() => { if (tab === "uploads") { fetchUploads(); loadMyMusic(); } }, [tab]);

  const handleUploadPicked = async (files) => {
    const list = Array.from(files || []).filter(Boolean);
    if (!list.length) return;
    const form = new FormData();
    for (const file of list) form.append("files", file);
    try {
      const res = await fetch("/api/media/upload", { method: "POST", headers: await getAuthHeaders(), body: form });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || `Upload failed (${res.status})`);
      await fetchUploads();
      setStatus("Music uploaded.");
    } catch (err) {
      setStatus(err?.message || "Upload failed.");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeUploadedTrack = async (item) => {
    try {
      if (item?.url) {
        await fetch(`/api/media?url=${encodeURIComponent(item.url)}`, { method: "DELETE", headers: await getAuthHeaders() }).catch(() => null);
      }
    } catch (_) {}
    setUploads((prev) => prev.filter((x) => x.id !== item.id));
    if (musicUrl === item.url && typeof setMusicUrl === "function") setMusicUrl("");
  };

  const loadStockMusic = async (query = stockQuery) => {
    setStockLoading(true);
    setStockError("");
    try {
      const q = encodeURIComponent((query || "").trim());
      const url = q ? `/api/music/stock?q=${q}` : `/api/music/stock`;
      const res = await fetch(url, { cache: "no-store", headers: await getAuthHeaders() });
      const data = await res.json().catch(() => ({ items: [] }));
      if (!res.ok) throw new Error(`Stock music request failed (${res.status})`);
      const items = data.tracks || data.items || [];
      const nextTracks = Array.isArray(items)
        ? items.map((item) => ({ ...item, name: item.name || item.title || "Track", source: "stock" }))
        : [];
      setTracks(nextTracks);
    } catch (err) {
      console.error("stock music load error", err);
      setTracks([]);
      setStockError(err?.message || "Failed to load stock music.");
    } finally {
      setStockLoading(false);
    }
  };

  useEffect(() => { if (tab === "stock") loadStockMusic(); }, [tab]);

  const applyMusicToReel = (url, name) => {
    setMusicUrl?.(url, name || "Track");
    setAppliedMusicName(name || "Track");
    setStatus(`${name || "Track"} applied to reel.`);
  };

  const regenerateVoiceovers = async ({ targetIndexes, voiceId, tier, isAuto = false }) => {
    const uniqueIndexes = Array.from(new Set((targetIndexes || []).filter((v) => Number.isInteger(v))));
    if (!uniqueIndexes.length) return;

    const items = uniqueIndexes
      .map((index) => ({
        sceneId: `scene_index_${index}`,
        sceneIndex: index,
        text: normalizeNarrationText(scenes[index]?.narration || "")
      }))
      .filter((item) => item.text);

    if (!items.length) return;

    const requestId = Date.now() + Math.random();
    autoRefreshRequestIdRef.current = requestId;

    if (!isAuto) {
      manualApplyInFlightRef.current = true;
      setLoading(true);
      setStatus(`Applying ${tier} voice to reel...`);
    } else {
      setStatus("Refreshing edited voiceover...");
    }

    try {
      const res = await fetch("/api/tts/generate-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...await getAuthHeaders() },
        body: JSON.stringify({ provider: tier === "premium" ? "elevenlabs" : "openai", voice: voiceId, speed, items })
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data?.success || !Array.isArray(data?.results)) {
        throw new Error(data?.error || `Voice generation failed (${res.status})`);
      }

      if (autoRefreshRequestIdRef.current !== requestId) return;

      const durationMap = {};
      await Promise.all(
        data.results
          .filter((item) => item?.url)
          .map(
            (item) =>
              new Promise((resolve) => {
                const audio = new Audio();
                audio.onloadedmetadata = () => { durationMap[item.url] = audio.duration; resolve(); };
                audio.onerror = () => resolve();
                audio.src = item.url;
              })
          )
      );

      if (autoRefreshRequestIdRef.current !== requestId) return;

      setScenes?.((prevScenes) =>
        prevScenes.map((scene, index) => {
          if (!uniqueIndexes.includes(index)) return scene;

          const expectedSceneId = `scene_index_${index}`;
          const match = data.results.find((item) => {
            const itemSceneId = String(item?.sceneId || "");
            const itemSceneIndex = Number(item?.sceneIndex);
            return itemSceneId === expectedSceneId || itemSceneIndex === index;
          });

          const latestNarration = normalizeNarrationText(scene?.narration || "");

          if (!latestNarration) {
            return { ...scene, voiceoverUrl: null, voiceover: null, voiceoverStale: false, voiceoverSourceText: "", voiceoverDuration: null };
          }

          return match?.url
            ? { ...scene, voiceoverUrl: match.url, voiceover: match.url, voiceoverStale: false, voiceoverSourceText: latestNarration, voiceoverDuration: durationMap[match.url] ?? null }
            : { ...scene, voiceoverStale: true };
        })
      );

      if (!isAuto) {
        const matchedVoice = voiceCatalog.find((voice) => voice.id === voiceId);
        setAppliedVoiceName(matchedVoice?.name || voiceId);
        setStatus(`${matchedVoice?.name || voiceId} applied to reel.`);
      } else {
        setStatus("Edited voiceover refreshed.");
      }
    } catch (err) {
      setStatus(err?.message || "Voice generation failed.");
    } finally {
      if (!isAuto) {
        setLoading(false);
        manualApplyInFlightRef.current = false;
      }
    }
  };

  const handlePreviewVoice = async (voice) => {
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current = null;
    }
    if (playingPreviewId === voice.id) {
      setPlayingPreviewId(null);
      return;
    }
    const isStandard = voice.provider === "openai" || voiceTier === "standard";
    const url = isStandard
      ? `/api/tts/voice-preview-standard?voice=${encodeURIComponent(voice.id)}`
      : `/api/tts/voice-preview?voice_id=${voice.id}`;
    // Create and start audio immediately to preserve user gesture context
    const audio = new Audio();
    audio.volume = Math.max(0, Math.min(1, (voiceoverVolume || 100) / 100));
    previewAudioRef.current = audio;
    audio.onended = () => { setPlayingPreviewId(null); previewAudioRef.current = null; };
    audio.onerror = () => { setPlayingPreviewId(null); setPreviewLoadingId(null); previewAudioRef.current = null; };
    audio.src = url;
    audio.play().catch(() => { setPlayingPreviewId(null); setPreviewLoadingId(null); });
    setPlayingPreviewId(voice.id);
    setPreviewLoadingId(null);
    return;
    setPreviewLoadingId(voice.id);
    setPlayingPreviewId(null);
    try {
      const audio = new Audio(url);
      previewAudioRef.current = audio;
      audio.onended = () => { setPlayingPreviewId(null); previewAudioRef.current = null; };
      audio.onerror = () => { setPlayingPreviewId(null); setPreviewLoadingId(null); previewAudioRef.current = null; };
      await audio.play();
      setPlayingPreviewId(voice.id);
    } catch {
      setPlayingPreviewId(null);
    } finally {
      setPreviewLoadingId(null);
    }
  };

  const applyVoiceToReel = async (voiceId, tier) => {
    const targetScenes = scenes
      .map((scene, index) => ({ index, text: normalizeNarrationText(scene?.narration || "") }))
      .filter((item) => item.text);

    if (!targetScenes.length) {
      setStatus("No narration found on the reel.");
      return;
    }

    if (tier === "premium") {
      const totalChars = targetScenes.reduce((sum, s) => sum + s.text.length, 0);
      const creditsNeeded = Math.ceil(totalChars / 100);
      try {
        const headers = await getAuthHeaders();
        const creditRes = await fetch("/api/credits/deduct-tts", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...headers },
          body: JSON.stringify({ amount: creditsNeeded })
        });
        if (creditRes.status === 402) { setStatus(`Not enough credits. This voice costs ${creditsNeeded} credits.`); return; }
        if (!creditRes.ok) { setStatus("Credit check failed. Please try again."); return; }
      } catch {
        setStatus("Credit check failed. Please try again.");
        return;
      }
    }

    setSelectedVoiceId(voiceId);
    await regenerateVoiceovers({ targetIndexes: targetScenes.map((s) => s.index), voiceId, tier, isAuto: false });
    if (tier === "standard") fetchVoMinutes();
  };

  useEffect(() => {
    if (autoRefreshTimerRef.current) { clearTimeout(autoRefreshTimerRef.current); autoRefreshTimerRef.current = null; }
    if (!staleSceneIndexes.length) return;
    if (!selectedVoiceId) return;
    if (loading || manualApplyInFlightRef.current) return;

    autoRefreshTimerRef.current = setTimeout(() => {
      regenerateVoiceovers({ targetIndexes: staleSceneIndexes, voiceId: selectedVoiceId, tier: voiceTier, isAuto: true });
    }, AUTO_REFRESH_DEBOUNCE_MS);

    return () => { if (autoRefreshTimerRef.current) { clearTimeout(autoRefreshTimerRef.current); autoRefreshTimerRef.current = null; } };
  }, [staleSceneIndexes.join("|"), selectedVoiceId, voiceTier, speed, loading]);

  return (
    <div className="panelStickyShell">
      <div className="panelStickyTop">
        <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12, flexShrink: 0 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, color: "#b0b8c8", marginBottom: 6 }}>Voiceover Volume</div>
            <input type="range" min="0" max="100" step="1"
              value={typeof voiceoverVolume === "number" ? voiceoverVolume : 100}
              onChange={(e) => setVoiceoverVolume(Number(e.target.value))}
              style={{ width: "100%" }}
            />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, color: "#b0b8c8", marginBottom: 6 }}>Music Volume</div>
            <input type="range" min="0" max="100" step="1"
              value={typeof musicVolume === "number" ? musicVolume : 60}
              onChange={(e) => setMusicVolume(Number(e.target.value))}
              style={{ width: "100%" }}
            />
          </div>
        </div>

        <div className="panelTabs">
          <button className={tab === "uploads" ? "active" : ""} onClick={() => setTab("uploads")}>Uploads</button>
          <button className={tab === "stock" ? "active" : ""} onClick={() => setTab("stock")}>Stock</button>
          <button className={tab === "voiceovers" ? "active" : ""} onClick={() => setTab("voiceovers")}>AI Voice</button>
          <HelpTooltip topic="voiceover" />
        </div>
      </div>

      <div className="panelStickyContent">

        {/* ── UPLOADS TAB ── */}
        {tab === "uploads" && (
          <div style={{ marginTop: 12 }}>
            <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "#0c1016", border: "2px dashed #2b3442", borderRadius: 8, cursor: "pointer", fontSize: 13, color: "#94a3b8" }}>
                <span style={{ fontSize: 18 }}>🎵</span>
                <span>Click to upload music tracks</span>
                <input ref={fileInputRef} type="file" accept="audio/*" multiple onChange={(e) => handleUploadPicked(e.target.files)} style={{ display: "none" }} />
              </label>
            </div>
            <div style={{ display: "grid", gap: 10 }}>
              {uploads.map((it) => (
                <div key={it.id} style={{ border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: 12, background: "rgba(0,0,0,0.18)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginBottom: 8 }}>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>🎵 {it.name}</div>
                    <button type="button" onClick={() => removeUploadedTrack(it)} style={{ padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#f87171", cursor: "pointer" }}>
                      Remove
                    </button>
                  </div>
                  <AudioPreview src={it.url} volume={musicVolume} />
                  <button type="button" onClick={() => applyMusicToReel(it.url, it.name)} style={{ marginTop: 8, width: "100%", padding: "8px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600, background: "#1d4ed8", border: "none", color: "#fff", cursor: "pointer" }}>
                    ✓ Apply to Reel
                  </button>
                </div>
              ))}
            </div>

            {/* My Music section */}
            <div style={{ marginTop: 20, borderTop: "1px solid #1f2937", paddingTop: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>My Generated Music</div>
                <button onClick={loadMyMusic} style={{ fontSize: 11, color: "#6b7280", background: "none", border: "none", cursor: "pointer" }}>↻ Refresh</button>
              </div>
              {myMusicLoading && <div style={{ fontSize: 12, color: "#6b7280" }}>Loading...</div>}
              {!myMusicLoading && myMusicTracks.length === 0 && (
                <div style={{ fontSize: 12, color: "#4b5563", textAlign: "center", padding: "12px 0" }}>No saved tracks yet. Generate music in the Music Studio.</div>
              )}
              <div style={{ display: "grid", gap: 8 }}>
                {myMusicTracks.map((track) => (
                  <div key={track.id} style={{ border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, padding: 10, background: "rgba(0,0,0,0.15)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6, gap: 8 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "#e2e8f0", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        🎵 {track.name || "Saved Track"}
                      </div>
                      <button
                        onClick={() => applyMusicToReel(track.url, track.name || "Saved Track")}
                        style={{ padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600, background: "#1d4ed8", border: "none", color: "#fff", cursor: "pointer", flexShrink: 0 }}
                      >
                        Apply
                      </button>
                    </div>
                    <AudioPreview src={track.url} volume={musicVolume} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── STOCK TAB ── */}
        {tab === "stock" && (
          <div style={{ marginTop: 12 }}>
            <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
              <input
                value={stockQuery}
                onChange={(e) => setStockQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") loadStockMusic(stockQuery); }}
                style={{ flex: 1, background: "#0f141b", border: "1px solid #2b3442", color: "#e2e8f0", borderRadius: 8, padding: "8px 12px", fontSize: 13, outline: "none" }}
                placeholder="Search stock music"
              />
              <button type="button" onClick={() => loadStockMusic(stockQuery)} disabled={stockLoading}
                style={{ padding: "8px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600, background: stockLoading ? "#374151" : "#1d4ed8", border: "none", color: "#fff", cursor: stockLoading ? "not-allowed" : "pointer", flexShrink: 0 }}>
                {stockLoading ? "..." : "Search"}
              </button>
            </div>
            {stockError ? <div style={{ color: "#f87171", fontSize: 12, marginBottom: 10 }}>{stockError}</div> : null}
            <div style={{ display: "grid", gap: 10 }}>
              {tracks.map((track) => (
                <div key={track.id || track.url} style={{ border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: 12, background: "rgba(0,0,0,0.18)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", marginBottom: 8 }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>{track.name}</div>
                      <div style={{ fontSize: 12, color: "#94a3b8" }}>{formatDuration(track.duration)}</div>
                    </div>
                    <button type="button" onClick={() => applyMusicToReel(track.url || track.remoteUrl, track.name)}
                      style={{ padding: "7px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600, background: "#1d4ed8", border: "none", color: "#fff", cursor: "pointer", flexShrink: 0 }}>
                      Apply
                    </button>
                  </div>
                  <AudioPreview src={track.url || track.remoteUrl} volume={musicVolume} />
                </div>
              ))}
              {!tracks.length && !stockLoading ? <div style={{ fontSize: 12, color: "#94a3b8" }}>No stock tracks loaded.</div> : null}
            </div>
          </div>
        )}

        {/* ── VOICEOVERS TAB ── */}
        {tab === "voiceovers" && (
          <div style={{ marginTop: 12 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
              <label style={{ fontSize: 12, color: "#b0b8c8" }}>
                Tier
                <select value={voiceTier} onChange={(e) => { setVoiceTier(e.target.value); setLanguage("all"); setGender("all"); setAccent("all"); setSearch(""); }}
                  style={{ width: "100%", marginTop: 6, background: "#0f141b", border: "1px solid #2b3442", color: "#e2e8f0", borderRadius: 4, padding: "7px 10px", fontSize: 12 }}>
                  <option value="standard">Standard</option>
                  <option value="premium">Premium</option>
                </select>
              </label>
              <label style={{ fontSize: 12, color: "#b0b8c8" }}>
                Search
                <input value={search} onChange={(e) => setSearch(e.target.value)}
                  style={{ width: "100%", marginTop: 6, background: "#0f141b", border: "1px solid #2b3442", color: "#e2e8f0", borderRadius: 4, padding: "7px 10px", fontSize: 12, boxSizing: "border-box" }} />
              </label>
              <label style={{ fontSize: 12, color: "#b0b8c8" }}>
                Gender
                <select value={gender} onChange={(e) => setGender(e.target.value)}
                  style={{ width: "100%", marginTop: 6, background: "#0f141b", border: "1px solid #2b3442", color: "#e2e8f0", borderRadius: 4, padding: "7px 10px", fontSize: 12 }}>
                  <option value="all">All</option>
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                  <option value="neutral">Neutral</option>
                  <option value="unknown">Unknown</option>
                </select>
              </label>
              <label style={{ fontSize: 12, color: "#b0b8c8" }}>
                Accent
                <select value={accent} onChange={(e) => setAccent(e.target.value)}
                  style={{ width: "100%", marginTop: 6, background: "#0f141b", border: "1px solid #2b3442", color: "#e2e8f0", borderRadius: 4, padding: "7px 10px", fontSize: 12 }}>
                  <option value="all">All</option>
                  {availableAccents.map((a) => <option key={a} value={a}>{a}</option>)}
                </select>
              </label>
              <label style={{ fontSize: 12, color: "#b0b8c8" }}>
                Language
                <select value={language} onChange={(e) => setLanguage(e.target.value)}
                  style={{ width: "100%", marginTop: 6, background: "#0f141b", border: "1px solid #2b3442", color: "#e2e8f0", borderRadius: 4, padding: "7px 10px", fontSize: 12 }}>
                  <option value="all">All</option>
                  {availableLanguages.map((l) => <option key={l} value={l}>{l}</option>)}
                </select>
              </label>
              <label style={{ fontSize: 12, color: "#b0b8c8" }}>
                Speed: {speed}x
                <input type="range" min="0.5" max="2" step="0.1" value={speed} onChange={(e) => setSpeed(Number(e.target.value))}
                  style={{ width: "100%", marginTop: 6 }} />
              </label>
            </div>

            {voiceTier === "premium" && voMinutes && (
              <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 10 }}>
                VO Minutes: {voMinutes.used ?? "?"} / {voMinutes.limit ?? "?"}
              </div>
            )}

            {premiumVoicesLoading && <div style={{ fontSize: 12, color: "#94a3b8" }}>Loading premium voices...</div>}
            {premiumVoicesError && <div style={{ fontSize: 12, color: "#f87171" }}>{premiumVoicesError}</div>}

            <div style={{ display: "grid", gap: 8 }}>
              {filteredVoices.map((voice) => (
                <div key={voice.id} style={{ border: `1px solid ${selectedVoiceId === voice.id ? "rgba(124,58,237,0.5)" : "rgba(255,255,255,0.06)"}`, borderRadius: 10, padding: "10px 12px", background: selectedVoiceId === voice.id ? "rgba(124,58,237,0.08)" : "rgba(0,0,0,0.15)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13, color: "#e2e8f0" }}>{voice.name}</div>
                    <div style={{ fontSize: 11, color: "#6b7280" }}>{[voice.gender, voice.accent, voice.language].filter(Boolean).join(" · ")}</div>
                  </div>
                  <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                    <button
                      onClick={() => handlePreviewVoice(voice)}
                      disabled={previewLoadingId === voice.id}
                      title="Preview voice"
                      style={{ width: 30, height: 30, borderRadius: 6, fontSize: 13, background: playingPreviewId === voice.id ? "rgba(124,58,237,0.3)" : "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", color: "#e2e8f0", cursor: previewLoadingId === voice.id ? "wait" : "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {previewLoadingId === voice.id ? "…" : playingPreviewId === voice.id ? "■" : "▶"}
                    </button>
                    <button onClick={() => applyVoiceToReel(voice.id, voiceTier)} disabled={loading}
                      style={{ padding: "6px 12px", borderRadius: 6, fontSize: 12, fontWeight: 600, background: selectedVoiceId === voice.id ? "#7c3aed" : "#1d4ed8", border: "none", color: "#fff", cursor: loading ? "not-allowed" : "pointer" }}>
                      {selectedVoiceId === voice.id && loading ? "..." : "Apply"}
                    </button>
                  </div>
                </div>
              ))}
              {!filteredVoices.length && !premiumVoicesLoading && (
                <div style={{ fontSize: 12, color: "#94a3b8" }}>No voices match filters.</div>
              )}
            </div>

            {staleVoiceSceneCount > 0 && (
              <div style={{ marginTop: 12, padding: "8px 12px", borderRadius: 8, background: "rgba(234,179,8,0.08)", border: "1px solid rgba(234,179,8,0.2)", fontSize: 12, color: "#fbbf24" }}>
                ⚠ {staleVoiceSceneCount} scene{staleVoiceSceneCount > 1 ? "s have" : " has"} updated narration — refreshing voiceover automatically...
              </div>
            )}
          </div>
        )}


      </div>

      {/* Global status bar */}
      {status && (
        <div style={{ padding: "8px 14px", fontSize: 12, color: "#a3e635", background: "rgba(0,0,0,0.3)", borderTop: "1px solid rgba(255,255,255,0.05)", textAlign: "center" }}>
          {status}
        </div>
      )}
    </div>
  );
}
