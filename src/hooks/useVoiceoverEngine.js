// useVoiceoverEngine.js
// Shared voiceover generation logic used by AudioPanel (AI Voice tab) and
// VoiceOverPanel (per-scene sidebar panel), so both surfaces regenerate scenes
// through the exact same code path (and the same scene-array dedup guard in
// EditorV2's timeline-sync effect, which keys off scene.voiceoverUrl).
import { useMemo, useRef, useState } from "react";
import { getAuthHeaders } from "../utils/auth.js";

// OpenAI gpt-4o-mini-tts voices — all multilingual (language = input text language)
export const STANDARD_VOICES = [
  { id: "alloy",   name: "Alloy",   gender: "neutral", accent: "",   language: "Multilingual", provider: "openai" },
  { id: "echo",    name: "Echo",    gender: "male",    accent: "",   language: "Multilingual", provider: "openai" },
  { id: "fable",   name: "Fable",   gender: "male",    accent: "UK", language: "Multilingual", provider: "openai" },
  { id: "onyx",    name: "Onyx",    gender: "male",    accent: "",   language: "Multilingual", provider: "openai" },
  { id: "nova",    name: "Nova",    gender: "female",  accent: "",   language: "Multilingual", provider: "openai" },
  { id: "shimmer", name: "Shimmer", gender: "female",  accent: "",   language: "Multilingual", provider: "openai" },
  { id: "ash",     name: "Ash",     gender: "male",    accent: "",   language: "Multilingual", provider: "openai" },
  { id: "coral",   name: "Coral",   gender: "female",  accent: "",   language: "Multilingual", provider: "openai" },
  { id: "sage",    name: "Sage",    gender: "female",  accent: "",   language: "Multilingual", provider: "openai" },
  { id: "ballad",  name: "Ballad",  gender: "male",    accent: "",   language: "Multilingual", provider: "openai" },
  { id: "verse",   name: "Verse",   gender: "male",    accent: "",   language: "Multilingual", provider: "openai" },
  { id: "marin",   name: "Marin",   gender: "female",  accent: "",   language: "Multilingual", provider: "openai" },
  { id: "cedar",   name: "Cedar",   gender: "male",    accent: "",   language: "Multilingual", provider: "openai" },
];

export const GOOGLE_LANGUAGES = [
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

export function normalizeNarrationText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

export function normalizePremiumVoice(voice, index = 0) {
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

export function useVoiceoverEngine({ scenes, setScenes, speed = 1, voiceoverVolume = 100, onSave, generatingVoiceoverScenes, setGeneratingVoiceoverScenes }) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [appliedVoiceName, setAppliedVoiceName] = useState("");

  const [premiumVoices, setPremiumVoices] = useState([]);
  const [premiumVoicesLoading, setPremiumVoicesLoading] = useState(false);
  const [premiumVoicesError, setPremiumVoicesError] = useState("");

  const [googleVoices, setGoogleVoices] = useState([]);
  const [googleVoicesLoading, setGoogleVoicesLoading] = useState(false);
  const [googleVoicesError, setGoogleVoicesError] = useState("");

  const [googlePremiumVoices, setGooglePremiumVoices] = useState([]);
  const [googlePremiumVoicesLoading, setGooglePremiumVoicesLoading] = useState(false);

  const [voMinutes, setVoMinutes] = useState(null);

  const [playingPreviewId, setPlayingPreviewId] = useState(null);
  const [previewLoadingId, setPreviewLoadingId] = useState(null);
  const previewAudioRef = useRef(null);

  const autoRefreshRequestIdRef = useRef(0);
  const manualApplyInFlightRef = useRef(false);

  const safeScenes = Array.isArray(scenes) ? scenes : [];

  const narratedSceneIndexes = useMemo(() => {
    return safeScenes.reduce((acc, scene, index) => {
      if (normalizeNarrationText(scene?.narration || "")) acc.push(index);
      return acc;
    }, []);
  }, [safeScenes]);

  const isVoiceoverGenerating = useMemo(() => {
    if (!generatingVoiceoverScenes || !generatingVoiceoverScenes.size) return false;
    return narratedSceneIndexes.some((i) => generatingVoiceoverScenes.has(i));
  }, [generatingVoiceoverScenes, narratedSceneIndexes]);

  const voiceCatalogFor = (tier) => {
    if (tier === "premium") return [...premiumVoices, ...googlePremiumVoices];
    // standard: OpenAI voices + Google Standard/WaveNet voices merged
    return [...STANDARD_VOICES, ...googleVoices];
  };

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

  const fetchGoogleVoices = async (languageCode = "en-US") => {
    setGoogleVoicesLoading(true);
    setGoogleVoicesError("");
    try {
      const res = await fetch(`/api/tts/voices?provider=google&language=${encodeURIComponent(languageCode)}&tier=standard`, { cache: "no-store", headers: await getAuthHeaders() });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || `Google voices request failed (${res.status})`);
      const list = Array.isArray(data?.voices) ? data.voices : [];
      const normalized = list.map(v => ({
        id: v.id,
        name: v.name,
        gender: v.gender || "neutral",
        accent: languageCode,
        language: languageCode,
        provider: "google",
        tier: v.tier,
      }));
      setGoogleVoices(normalized);
    } catch (err) {
      console.error("google voices load error", err);
      setGoogleVoices([]);
      setGoogleVoicesError(err?.message || "Failed to load Google voices.");
    } finally {
      setGoogleVoicesLoading(false);
    }
  };

  const fetchGooglePremiumVoices = async (languageCode = "en-US") => {
    setGooglePremiumVoicesLoading(true);
    try {
      const res = await fetch(`/api/tts/voices?provider=google&language=${encodeURIComponent(languageCode)}&tier=premium`, { cache: "no-store", headers: await getAuthHeaders() });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return;
      const list = Array.isArray(data?.voices) ? data.voices : [];
      const normalized = list.map(v => ({
        id: v.id,
        name: v.name,
        gender: v.gender || "neutral",
        accent: languageCode,
        language: languageCode,
        provider: "google",
        tier: v.tier,
        premium: true,
      }));
      setGooglePremiumVoices(normalized);
    } catch (err) {
      console.error("google premium voices load error", err);
      setGooglePremiumVoices([]);
    } finally {
      setGooglePremiumVoicesLoading(false);
    }
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

    setGeneratingVoiceoverScenes?.((prev) => {
      const next = new Set(prev);
      uniqueIndexes.forEach((i) => next.add(i));
      return next;
    });

    if (!isAuto) {
      manualApplyInFlightRef.current = true;
      setLoading(true);
      setStatus(`Applying ${tier} voice to reel...`);
    } else {
      setStatus("Refreshing edited voiceover...");
    }

    try {
      const selectedVoice = voiceCatalogFor(tier).find(v => v.id === voiceId);
      // Use the voice's actual provider so mixed-catalog tiers (Standard has OpenAI+Google, Premium has ElevenLabs+Google) route correctly
      const backendProvider = selectedVoice?.provider === "google" ? "google"
        : selectedVoice?.provider === "elevenlabs" ? "elevenlabs"
        : (selectedVoice?.provider || "openai");
      const res = await fetch("/api/tts/generate-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...await getAuthHeaders() },
        body: JSON.stringify({ provider: backendProvider, voice: voiceId, speed, items })
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

      const matchedVoice = voiceCatalogFor(tier).find((voice) => voice.id === voiceId);

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
            return { ...scene, voiceoverUrl: null, voiceover: null, voiceoverStale: false, voiceoverSourceText: "", voiceoverDuration: null, voiceoverVoiceId: null, voiceoverVoiceName: null, voiceoverTier: null };
          }

          if (!match?.url) return { ...scene, voiceoverStale: true };

          const voDuration = durationMap[match.url] ?? null;
          // Mirror render.js / importFromScenes: scene length must track the
          // freshly generated VO audio (+1.5s buffer), or the VO clip overlaps
          // into the next scene because the video clip keeps its old duration.
          const clipDuration = voDuration > 0 ? voDuration + 1.5 : (Number(scene.duration) || 3);

          return {
            ...scene,
            voiceoverUrl: match.url,
            voiceover: match.url,
            voiceoverStale: false,
            voiceoverSourceText: latestNarration,
            voiceoverDuration: voDuration,
            voiceoverVoiceId: voiceId,
            voiceoverVoiceName: matchedVoice?.name || voiceId,
            voiceoverTier: tier,
            duration: clipDuration,
            trimEnd: clipDuration,
          };
        })
      );

      // Non-blocking: fetch word-level timings for karaoke captions
      data.results
        .filter(item => item?.url)
        .forEach(async (item) => {
          const idx = Number(item?.sceneIndex ?? -1);
          if (!uniqueIndexes.includes(idx)) return;
          try {
            const twRes = await fetch('/api/tts/transcribe-words', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', ...await getAuthHeaders() },
              body: JSON.stringify({ voiceoverUrl: item.url }),
            });
            const twData = await twRes.json();
            if (twData.words?.length) {
              setScenes?.(prev => prev.map((s, i) =>
                i === idx ? { ...s, word_timestamps: twData.words } : s
              ));
              setTimeout(() => onSave?.(), 500);
            }
          } catch (e) {
            console.warn('[karaoke] transcribe-words failed, captions fall back to full text', e);
          }
        });

      if (!isAuto) {
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
      setGeneratingVoiceoverScenes?.((prev) => {
        const next = new Set(prev);
        uniqueIndexes.forEach((i) => next.delete(i));
        return next;
      });
    }
  };

  // targetIndexes: optional explicit scene indexes to apply to (e.g. a single
  // scene from VoiceOverPanel's "Apply to scene" button). Defaults to every
  // narrated scene in the reel, which is AudioPanel's existing "Apply to Reel"
  // behavior.
  const applyVoiceToReel = async (voiceId, tier, targetIndexes) => {
    const targetScenes = (Array.isArray(targetIndexes) ? targetIndexes : scenes.map((_, index) => index))
      .map((index) => ({ index, text: normalizeNarrationText(scenes[index]?.narration || "") }))
      .filter((item) => item.text);

    if (!targetScenes.length) {
      setStatus("No narration found.");
      return;
    }

    if (tier === "premium") {
      const totalChars = targetScenes.reduce((sum, s) => sum + s.text.length, 0);
      const creditsNeeded = Math.ceil(totalChars * 1.5 / 100);
      try {
        const headers = await getAuthHeaders();
        const creditRes = await fetch("/api/credits/deduct-tts", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...headers },
          body: JSON.stringify({ charCount: totalChars })
        });
        if (creditRes.status === 402) { setStatus(`Not enough credits. This voice costs ${creditsNeeded} credits.`); return; }
        if (!creditRes.ok) { setStatus("Credit check failed. Please try again."); return; }
      } catch {
        setStatus("Credit check failed. Please try again.");
        return;
      }
    }

    await regenerateVoiceovers({ targetIndexes: targetScenes.map((s) => s.index), voiceId, tier, isAuto: false });
    if (tier === "standard") fetchVoMinutes();
  };

  const handlePreviewVoice = (voice, tier) => {
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current = null;
    }
    if (playingPreviewId === voice.id) {
      setPlayingPreviewId(null);
      return;
    }
    const provider = voice.provider || (tier === "premium" ? "elevenlabs" : "openai");
    const url = provider === "google"
      ? `/api/tts/voice-preview-google?voice=${encodeURIComponent(voice.id)}`
      : provider === "elevenlabs"
      ? `/api/tts/voice-preview?voice_id=${voice.id}`
      : `/api/tts/voice-preview-standard?voice=${encodeURIComponent(voice.id)}`;
    // Create and start audio immediately to preserve user gesture context.
    const audio = new Audio();
    audio.volume = Math.max(0, Math.min(1, (voiceoverVolume || 100) / 100));
    previewAudioRef.current = audio;
    audio.onended = () => { setPlayingPreviewId(null); previewAudioRef.current = null; };
    audio.onerror = () => { setPlayingPreviewId(null); setPreviewLoadingId(null); previewAudioRef.current = null; };
    audio.src = url;
    audio.play().catch(() => { setPlayingPreviewId(null); setPreviewLoadingId(null); });
    setPlayingPreviewId(voice.id);
    setPreviewLoadingId(null);
  };

  return {
    loading, status, setStatus,
    appliedVoiceName,
    premiumVoices, premiumVoicesLoading, premiumVoicesError, fetchPremiumVoices,
    googleVoices, googleVoicesLoading, googleVoicesError, fetchGoogleVoices,
    googlePremiumVoices, googlePremiumVoicesLoading, fetchGooglePremiumVoices,
    voMinutes, fetchVoMinutes,
    regenerateVoiceovers, applyVoiceToReel,
    handlePreviewVoice, playingPreviewId, previewLoadingId,
    isVoiceoverGenerating, narratedSceneIndexes,
    manualApplyInFlightRef,
    voiceCatalogFor,
  };
}
