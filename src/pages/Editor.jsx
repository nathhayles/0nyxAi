import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
// import SceneStrip from "../components/SceneStrip.jsx";
import TimelinePanel from "../components/TimelinePanel.jsx";
import StoryboardPanel from "../components/StoryboardPanel.jsx";
import VisualsPanel from "../components/VisualsPanel.jsx";
import AudioPanel from "../components/AudioPanel.jsx";
import ModalPrompt from "../components/ModalPrompt.jsx";
import { supabase } from "../supabaseClient.js";
import "../styles/editor.css";
import StylesPanel from "../components/StylesPanel.jsx";
import AvatarPanel from "../components/AvatarPanel.jsx";
import TextPanel from "../components/TextPanel.jsx";
import ElementsPanel from "../components/ElementsPanel.jsx";
import { getAuthHeaders } from "../utils/auth.js";
import YouTubePublishModal from "../components/YouTubePublishModal.jsx";
import ThemeSelector from "../components/ThemeSelector.jsx";


function KaraokeWord({ word, start, end, audioRef }) {
  const [active, setActive] = React.useState(false);
  React.useEffect(() => {
    let rafId;
    function check() {
      const audio = audioRef?.current;
      if (audio) {
        const t = audio.currentTime;
        setActive(t >= start && t < end);
      }
      rafId = requestAnimationFrame(check);
    }
    rafId = requestAnimationFrame(check);
    return () => cancelAnimationFrame(rafId);
  }, [start, end, audioRef]);

  return (
    <span style={{
      display:"inline-block",
      marginRight:4,
      fontSize:18,
      fontWeight:700,
      color: active ? "#facc15" : "#fff",
      textShadow: active
        ? "0 0 12px rgba(250,204,21,0.8), 0 2px 8px rgba(0,0,0,0.9)"
        : "0 2px 8px rgba(0,0,0,0.9)",
      transform: active ? "scale(1.08)" : "scale(1)",
      transition:"color 0.05s, transform 0.05s",
    }}>
      {word}
    </span>
  );
}

const AUTOSAVE_KEY = "onyx_editor_autosave_v2";
const AI_STUDIO_LIBRARY_KEY = "onyx_ai_studio_library_v1";
const AUDIO_VOICE_PREFS_KEY = "onyx_audio_voice_prefs_v4";
const API_BASE = "";
const DEFAULT_IMAGE_SCENE_MS = 3000;
const MAX_IMAGE_SCENE_MS = 15000;
const FALLBACK_VIDEO_SCENE_MS = 3000;
const PROGRESS_TICK_MS = 100;
const CONTROL_BAR_HEIGHT = 56;
const VOICEOVER_TAIL_MS = 400;
const AUTO_REFRESH_DEBOUNCE_MS = 1000;
const DEFAULT_VOICE_ID = "EXAVITQu4vr4xnSDxMaL"; // Sarah
const DEFAULT_VOICE_NAME = "Sarah";

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

// Blend a CSS colour with a given opacity (0–1).
// forceDark replaces the colour with black before applying opacity.
function blendCaptionBg(bgColor, bgOpacity, forceDark = false) {
  if (bgOpacity === undefined || bgOpacity === null) return bgColor || "rgba(0,0,0,0.82)";
  const base = forceDark ? "0,0,0" : (() => {
    if (!bgColor) return "0,0,0";
    const rgba = bgColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (rgba) return `${rgba[1]},${rgba[2]},${rgba[3]}`;
    const hex = bgColor.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
    if (hex) return `${parseInt(hex[1],16)},${parseInt(hex[2],16)},${parseInt(hex[3],16)}`;
    return "0,0,0";
  })();
  return `rgba(${base},${bgOpacity})`;
}

// Replace the CSS keyword "currentColor" with an actual colour value.
function resolveCurrentColor(value, color) {
  return value ? value.replace("currentColor", color || "#ffffff") : value;
}

function isVideoUrl(url = "") {
  return /\.(mp4|webm|mov|m4v|ogg)(\?|#|$)/i.test(String(url || ""));
}

function safeJsonParse(raw, fallback) {
  try {
    const v = JSON.parse(raw);
    return v ?? fallback;
  } catch {
    return fallback;
  }
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function formatClock(totalSeconds = 0) {
  const secs = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  const mins = Math.floor(secs / 60);
  const rem = secs % 60;
  return `${mins}:${String(rem).padStart(2, "0")}`;
}

function normalizeNarrationText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function normalizeScene(scene, fallbackId) {
  const mediaUrl = scene?.mediaUrl || scene?.url || null;
  const mediaType =
    scene?.mediaType || (mediaUrl ? (isVideoUrl(mediaUrl) ? "video" : "image") : null);

  return {
    id: scene?.id ?? fallbackId,
    narration: scene?.narration || "",
    action: scene?.action || "",
    mode: scene?.mode || "ai",
    savedAt: scene?.savedAt || null,
    generatedAt: scene?.generatedAt || null,
    isAiGenerated: !!scene?.isAiGenerated,
    thumbnail: scene?.thumbnail || scene?.stockThumb || mediaUrl || null,
    url: mediaUrl,
    mediaUrl,
    mediaType,
    transitionToNext: scene?.transitionToNext || "cut",
    voiceoverUrl: scene?.voiceoverUrl || scene?.voiceover || null,
    voiceover: scene?.voiceover || scene?.voiceoverUrl || null,
    voiceoverStale: !!scene?.voiceoverStale,
    voiceoverSourceText: scene?.voiceoverSourceText || "",
    sourceAudioVolume:
      typeof scene?.sourceAudioVolume === "number" ? scene.sourceAudioVolume : 100,
    sourceAudioMuted: !!scene?.sourceAudioMuted,
    musicUrl: scene?.musicUrl || null,
    duration: Number(scene?.duration || 3),
    stockBaseQuery: scene?.stockBaseQuery || "",
    stockQuery: scene?.stockQuery || "",
    stockVariation: scene?.stockVariation || scene?.stockQuery || "",
    stockSource: scene?.stockSource || "",
    stockAssetId: scene?.stockAssetId || null,
    stockThumb: scene?.stockThumb || scene?.thumbnail || mediaUrl || null,
    captionsEnabled: scene?.captionsEnabled ?? true,
    trimStart: typeof scene?.trimStart === "number" ? scene.trimStart : 0,
    trimEnd: typeof scene?.trimEnd === "number" ? scene.trimEnd : null,
    text_boxes: Array.isArray(scene?.text_boxes) ? scene.text_boxes : [],
    elements: Array.isArray(scene?.elements) ? scene.elements : [],
    caption_words: Array.isArray(scene?.caption_words) ? scene.caption_words : [],
  };
}

function makeEmptyScene(id) {
  return normalizeScene({ id }, id);
}

async function uploadFiles(files) {
  const form = new FormData();
  for (const f of files) form.append("files", f);

  const res = await fetch(`${API_BASE}/api/media/upload`, {
    method: "POST",
    headers: await getAuthHeaders(),
    body: form,
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json?.error || `Upload failed (${res.status})`);
  }

  return json?.files || [];
}

function stopAndReset(mediaEl) {
  if (!mediaEl) return;
  try {
    mediaEl.pause();
  } catch {}
  try {
    mediaEl.currentTime = 0;
  } catch {}
}

export default function Editor() {
  const [activeMenu, setActiveMenu] = useState("storyboard");
  const [activeTheme, setActiveTheme] = useState(null);
  const [visualsTab, setVisualsTab] = useState("stock");
  const [audioTab, setAudioTab] = useState("stock");
  const [ratio, setRatio] = useState("16:9");
  const [title, setTitle] = useState("Untitled Reel");
  const titleRef = React.useRef(title);
  React.useEffect(() => { titleRef.current = title; }, [title]);
  const [reelId, setReelId] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("reelId") || null;
  });
  const [selectedElementId, setSelectedElementId] = useState(null);
  const [voiceoverVolume, setVoiceoverVolume] = useState(100);
  const [musicVolume, setMusicVolume] = useState(60);
  const [globalMusicUrl, setGlobalMusicUrl] = useState("");
  const [globalMusicName, setGlobalMusicName] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [selectedTheme, setSelectedTheme] = useState(null);
  const [scoringReel, setScoringReel] = useState(false);
  const [scenes, setScenes] = useState([makeEmptyScene(1)]);
  const [activeScene, setActiveScene] = useState(1);
  const [past, setPast] = useState([]);
  const [future, setFuture] = useState([]);
  const [promptOpen, setPromptOpen] = useState(false);
  const [promptTitle, setPromptTitle] = useState("Save to AI Studio");
  const [promptLabel, setPromptLabel] = useState("Name");
  const [promptDefault, setPromptDefault] = useState("");
  const [canvasDropHint, setCanvasDropHint] = useState(false);
  const [canvasErr, setCanvasErr] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [reelVideoUrl, setReelVideoUrl] = useState(null);
  const [ytModalOpen, setYtModalOpen]   = useState(false);
  const [ytToken, setYtToken]           = useState('');
  const [sharing, setSharing] = useState(false);
  const [shareModalUrl, setShareModalUrl] = useState(null);
  const [statusMsg, setStatusMsg] = useState("");
  const [generatingScenes, setGeneratingScenes] = useState({});
  const [creditBalance, setCreditBalance] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [trialStatus, setTrialStatus] = useState({ is_trial: false, trial_expired: false, days_remaining: null, has_paid_plan: false });
  const [canvasTool, setCanvasTool] = useState(null); // 'trim' | 'layers' | 'captions' | 'audio' | null
  const [brand, setBrand] = useState({
    brand_name: "My Brand",
    primary_color: "#2563eb",
    secondary_color: "#0ea5e9",
    caption_font: "sans-serif",
    caption_size: 16,
    caption_color: "#ffffff",
    caption_bg_color: "rgba(0,0,0,0.82)",
    caption_position: "bottom",
    logo_url: null,
    logo_position: "bottom-right",
    default_voice_id: null,
    default_voice_name: null,
    default_music_url: null,
    default_music_name: null,
    intro_url: null,
    outro_url: null,
    interlude_url: null,
  });
  const [brands, setBrands] = useState([]);
  const [selectedBrandId, setSelectedBrandId] = useState(null);
  const [brandMenuOpen, setBrandMenuOpen] = useState(false);

  async function loadBrand() {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/brand", { headers });
      const data = await res.json();
      if (data) setBrand(b => ({ ...b, ...data }));
    } catch (e) {
      console.error("Brand load error:", e);
    }
  }

  async function loadBrands() {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/brands", { headers });
      const data = await res.json();
      const list = data.brands || [];
      setBrands(list);
      const def = list.find(b => b.is_default) || list[0];
      if (def) {
        setSelectedBrandId(def.id);
        setBrand(b => ({ ...b, ...def }));
      }
    } catch (e) {
      console.error("Brands load error:", e);
    }
  }

  async function saveBrand(settings) {
    try {
      const headers = { ...(await getAuthHeaders()), "Content-Type": "application/json" };
      const res = await fetch("/api/brand", { method: "POST", headers, body: JSON.stringify(settings) });
      const data = await res.json();
      if (data) setBrand(b => ({ ...b, ...data }));
      setStatusMsg("Brand settings saved.");
    } catch (e) {
      console.error("Brand save error:", e);
    }
  }

  useEffect(() => {
    loadBrand();
    loadBrands();
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUser(data?.user ?? null);
    });
  }, []);

  const fetchCredits = useCallback(async () => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/credits/usage", { headers });
      const data = await res.json();
      setCreditBalance(data.balance);
    } catch {}
  }, [getAuthHeaders]);

  useEffect(() => { fetchCredits(); }, []);

  useEffect(() => {
    getAuthHeaders().then(headers =>
      fetch("/api/user/me", { headers })
        .then(r => r.ok ? r.json() : null)
        .then(d => { if (d) setTrialStatus(d); })
        .catch(() => {})
    );
  }, []);

  const lumaPollingRefs = useRef({});
  const [isPlaying, setIsPlaying] = useState(false);
  const [sceneProgress, setSceneProgress] = useState(0);
  const [sceneDuration, setSceneDuration] = useState(0);

  const promptResolveRef = useRef(null);
  const autosaveTimeoutRef = useRef(null);
  const imageAdvanceTimerRef = useRef(null);
  const voiceEndedHandlerRef = useRef(null);
  const progressTimerRef = useRef(null);
  const canvasVideoRef = useRef(null);
  const sceneVoiceoverAudioRef = useRef(null);
  const projectMusicAudioRef = useRef(null);
  const scenesRef = useRef(scenes);
  const activeSceneRef = useRef(activeScene);
  const isPlayingRef = useRef(isPlaying);
  const playbackSessionRef = useRef(0);
  const pendingPlaybackRef = useRef(null);
  const sceneStartedAtRef = useRef(0);
  const sceneOffsetRef = useRef(0);
  const currentSceneDurationRef = useRef(0);
  const videoDurationMapRef = useRef({});
  const isScrubbingRef = useRef(false);
  const autoVoiceRefreshTimerRef = useRef(null);
  const autoVoiceRefreshRequestIdRef = useRef(0);

  // NLE reel-level time tracking
  const reelElapsedRef = useRef(0);
  const reelTotalDurationRef = useRef(0);
  const [reelProgress, setReelProgress] = useState(0);
  const rafRef = useRef(null);

  const activeSceneObj = useMemo(
    () => scenes.find((sc) => sc.id === activeScene) || null,
    [scenes, activeScene]
  );

  const activeSceneMediaUrl = activeSceneObj?.url || activeSceneObj?.mediaUrl || null;

  const reelTotalDuration = useMemo(() =>
    scenes.reduce((sum, sc) => sum + (Number(sc.duration) || 3), 0),
  [scenes]);

  const sceneStartTimes = useMemo(() => {
    const map = {};
    let elapsed = 0;
    scenes.forEach(sc => {
      map[sc.id] = elapsed;
      elapsed += Number(sc.duration) || 3;
    });
    return map;
  }, [scenes]);

  const canvasAspectRatio = useMemo(() => {
    if (ratio === "9:16") return "9 / 16";
    if (ratio === "1:1") return "1 / 1";
    return "16 / 9";
  }, [ratio]);

  const snapshot = useMemo(
    () => ({
      title,
      ratio,
      scenes,
      activeScene,
      activeMenu,
      visualsTab,
      audioTab,
      voiceoverVolume,
      musicVolume,
      globalMusicUrl,
      globalMusicName,
      template: selectedTemplate,
      theme: selectedTheme,
    }),
    [
      title,
      ratio,
      scenes,
      activeScene,
      activeMenu,
      visualsTab,
      audioTab,
      voiceoverVolume,
      musicVolume,
      globalMusicUrl,
      globalMusicName,
      selectedTemplate,
      selectedTheme,
    ]
  );

  const clearProgressTimer = useCallback(() => {
    if (progressTimerRef.current) {
      clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }
  }, []);

  const clearPlaybackTimers = useCallback(() => {
    if (imageAdvanceTimerRef.current) {
      clearTimeout(imageAdvanceTimerRef.current);
      imageAdvanceTimerRef.current = null;
    }

    const voice = sceneVoiceoverAudioRef.current;
    if (voice && voiceEndedHandlerRef.current) {
      voice.removeEventListener("ended", voiceEndedHandlerRef.current);
      voiceEndedHandlerRef.current = null;
    }

    clearProgressTimer();
  }, [clearProgressTimer]);

  const syncMusicVolume = useCallback(() => {
    const music = projectMusicAudioRef.current;
    if (!music) return;
    music.volume = Math.max(0, Math.min(1, (musicVolume / 100) * 0.45));
    music.loop = true;
  }, [musicVolume]);

  const syncVoiceVolume = useCallback(() => {
    const voice = sceneVoiceoverAudioRef.current;
    if (!voice) return;
    voice.volume = Math.max(0, Math.min(1, (voiceoverVolume / 100) * 1.35));
  }, [voiceoverVolume]);

  // RAF loop — updates reelProgress while playing
  useEffect(() => {
    function tick() {
      if (isPlayingRef.current) {
        const sceneStart = sceneStartTimes[activeSceneRef.current] || 0;
        const elapsed = sceneStart + (sceneOffsetRef.current || 0);
        reelElapsedRef.current = elapsed;
        setReelProgress(elapsed / Math.max(reelTotalDuration, 1));
      }
      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [sceneStartTimes, reelTotalDuration]);

  const getSceneById = useCallback((sceneId) => {
    return scenesRef.current.find((scene) => scene.id === sceneId) || null;
  }, []);

  const getVoiceLimitedDurationSeconds = useCallback((scene, fallbackSeconds = 0) => {
    if (!scene?.voiceoverUrl) return 0;

    const voice = scene.id === activeSceneRef.current ? sceneVoiceoverAudioRef.current : null;
    const voiceDuration = Number(voice?.duration) || Number(scene.voiceoverDuration) || Number(scene.duration) || 0;
    if (!Number.isFinite(voiceDuration) || voiceDuration <= 0) return 0;

    const tailedDuration = Math.max(1, voiceDuration + VOICEOVER_TAIL_MS / 1000);
    if (fallbackSeconds > 0) {
      return Math.max(fallbackSeconds, tailedDuration);
    }

    return tailedDuration;
  }, []);

  const getCurrentSceneDurationSeconds = useCallback(
    (scene) => {
      if (!scene) return 0;

      if (scene.mediaType === "video") {
        const mapped = videoDurationMapRef.current[scene.id];
        const fallbackVideoDuration = Math.max(
          1,
          Number.isFinite(mapped) && mapped > 0
            ? mapped
            : Number(scene.duration) || FALLBACK_VIDEO_SCENE_MS / 1000
        );
        const voiceLimitedDuration = getVoiceLimitedDurationSeconds(scene, fallbackVideoDuration);
        return voiceLimitedDuration > 0 ? voiceLimitedDuration : fallbackVideoDuration;
      }

      const base = Math.max(1, Number(scene.duration) || DEFAULT_IMAGE_SCENE_MS / 1000);
      const voiceLimitedDuration = getVoiceLimitedDurationSeconds(
        scene,
        MAX_IMAGE_SCENE_MS / 1000
      );

      if (voiceLimitedDuration > 0) {
        return Math.min(MAX_IMAGE_SCENE_MS / 1000, Math.max(base, voiceLimitedDuration));
      }

      return base;
    },
    [getVoiceLimitedDurationSeconds]
  );

  const getNextPlayableSceneId = useCallback((currentId) => {
    const currentScenes = scenesRef.current;
    const startIndex = currentScenes.findIndex((scene) => scene.id === currentId);
    if (startIndex === -1) return null;

    for (let i = startIndex + 1; i < currentScenes.length; i += 1) {
      const scene = currentScenes[i];
      if (scene?.url || scene?.mediaUrl) return scene.id;
    }

    return null;
  }, []);

  const getStartPlayableSceneId = useCallback((requestedId) => {
    const currentScenes = scenesRef.current;
    if (!currentScenes.length) return null;

    const requested = currentScenes.find((scene) => scene.id === requestedId);
    if (requested?.url || requested?.mediaUrl) return requestedId;

    const startIndex = currentScenes.findIndex((scene) => scene.id === requestedId);
    if (startIndex !== -1) {
      for (let i = startIndex + 1; i < currentScenes.length; i += 1) {
        const scene = currentScenes[i];
        if (scene?.url || scene?.mediaUrl) return scene.id;
      }
    }

    const firstPlayable = currentScenes.find((scene) => scene?.url || scene?.mediaUrl);
    return firstPlayable?.id || null;
  }, []);

  const getLiveSceneOffset = useCallback(() => {
    const scene = getSceneById(activeSceneRef.current);
    if (!scene) return 0;

    if (scene.mediaType === "video") {
      const video = canvasVideoRef.current;
      const raw = Number(video?.currentTime ?? sceneOffsetRef.current ?? 0);
      const max = currentSceneDurationRef.current || Math.max(raw, 0);
      return clamp(raw, 0, max || raw || 0);
    }

    const baseOffset = Number(sceneOffsetRef.current || 0);
    const elapsed =
      isPlayingRef.current && sceneStartedAtRef.current
        ? baseOffset + (Date.now() - sceneStartedAtRef.current) / 1000
        : baseOffset;

    const max = currentSceneDurationRef.current || Math.max(elapsed, 0);
    return clamp(elapsed, 0, max || elapsed || 0);
  }, [getSceneById]);

  const stopSceneMedia = useCallback(
    ({ resetVideo = false, resetVoice = false } = {}) => {
      clearPlaybackTimers();

      const voice = sceneVoiceoverAudioRef.current;
      if (voice) {
        try {
          voice.pause();
        } catch {}
        if (resetVoice) {
          try {
            voice.currentTime = 0;
          } catch {}
        }
      }

      const video = canvasVideoRef.current;
      if (video) {
        try {
          video.pause();
        } catch {}
        if (resetVideo) {
          try {
            video.currentTime = 0;
          } catch {}
        }
      }
    },
    [clearPlaybackTimers]
  );

  const pauseAllPlayback = useCallback(
    ({ resetMusic = false } = {}) => {
      const liveOffset = getLiveSceneOffset();
      sceneOffsetRef.current = liveOffset;
      setSceneProgress(liveOffset);
      playbackSessionRef.current += 1;
      pendingPlaybackRef.current = null;
      isPlayingRef.current = false;
      clearPlaybackTimers();

      try {
        canvasVideoRef.current?.pause();
      } catch {}
      try {
        sceneVoiceoverAudioRef.current?.pause();
      } catch {}

      const music = projectMusicAudioRef.current;
      if (music) {
        try {
          music.pause();
        } catch {}
        if (resetMusic) {
          try {
            music.currentTime = 0;
          } catch {}
        }
      }

      setIsPlaying(false);
    },
    [clearPlaybackTimers, getLiveSceneOffset]
  );

  const stopPreviewAndReset = useCallback(() => {
    const liveOffset = getLiveSceneOffset();
    playbackSessionRef.current += 1;
    pendingPlaybackRef.current = null;
    isPlayingRef.current = false;
    clearPlaybackTimers();
    stopAndReset(canvasVideoRef.current);
    stopAndReset(sceneVoiceoverAudioRef.current);
    stopAndReset(projectMusicAudioRef.current);
    sceneOffsetRef.current = 0;
    currentSceneDurationRef.current = 0;
    setSceneProgress(0);
    setSceneDuration(0);
    setIsPlaying(false);

    if (liveOffset > 0) {
      setSceneProgress(0);
    }
  }, [clearPlaybackTimers, getLiveSceneOffset]);

  const applySnapshot = useCallback((snap) => {
    if (!snap) return;

    const nextScenes =
      Array.isArray(snap.scenes) && snap.scenes.length
        ? snap.scenes.map((sc, idx) => normalizeScene(sc, idx + 1))
        : [makeEmptyScene(1)];

    setTitle(snap.title || "Untitled Reel");
    setRatio(snap.ratio || "16:9");
    setScenes(nextScenes);
    setActiveScene(
      nextScenes.some((sc) => sc.id === snap.activeScene)
        ? snap.activeScene
        : nextScenes[0].id
    );
    setActiveMenu(snap.activeMenu || "storyboard");
    setVisualsTab(snap.visualsTab || "stock");
    setAudioTab(snap.audioTab || "stock");
    setVoiceoverVolume(
      typeof snap.voiceoverVolume === "number" ? snap.voiceoverVolume : 100
    );
    setMusicVolume(typeof snap.musicVolume === "number" ? snap.musicVolume : 60);
    setGlobalMusicUrl(snap.globalMusicUrl || "");
    setGlobalMusicName(snap.globalMusicName || "");
    if (snap.template) setSelectedTemplate(snap.template);
    if (snap.theme) setSelectedTheme(snap.theme);
  }, []);

  const saveNow = useCallback(async () => {
    try {
      localStorage.setItem(AUTOSAVE_KEY, JSON.stringify({ ...snapshot, savedAt: new Date().toISOString() }));
      const headers = await getAuthHeaders();
      headers["Content-Type"] = "application/json";
      const isImg = u => u && /\.(jpg|jpeg|png|webp|gif)(\?|$)/i.test(u.split("?")[0]);
      let thumbnail_url =
        snapshot.scenes?.find(s => isImg(s.thumbnailUrl))?.thumbnailUrl
        ?? snapshot.scenes?.find(s => isImg(s.thumbnail))?.thumbnail
        ?? null;
      if (!thumbnail_url && snapshot.pipelineId) {
        try {
          const tr = await fetch(`/api/kling/pipeline/${snapshot.pipelineId}/thumbnail`, { headers });
          const td = await tr.json();
          if (td.thumbnailUrl) thumbnail_url = td.thumbnailUrl;
        } catch (_) {}
      }
      const body = JSON.stringify({ title, scenes: snapshot.scenes, status: "draft", thumbnail_url, template_id: selectedTemplate?.id || null });
      if (reelId) {
        await fetch(`/api/reels/${reelId}`, { method: "PUT", headers, body });
      } else {
        const res = await fetch("/api/reels", { method: "POST", headers, body });
        const data = await res.json();
        if (data.id) {
          setReelId(data.id);
          // Persist to URL so refresh doesn't lose it
          const url = new URL(window.location.href);
          url.searchParams.set("reelId", data.id);
          window.history.replaceState({}, "", url.toString());
          // Also persist into the autosave blob
          localStorage.setItem(AUTOSAVE_KEY, JSON.stringify({
            ...snapshot,
            reelId: data.id,
            savedAt: new Date().toISOString()
          }));
        }
      }
    } catch (e) {
      console.error("Save failed:", e);
    }
  }, [snapshot, title, reelId]);

  const loadAutosave = useCallback(() => {
    // Check for campaign handoff first — never touches shared autosave key
    const urlParams = new URLSearchParams(window.location.search);
    const handoffId = urlParams.get("handoff");
    if (handoffId) {
      const raw = sessionStorage.getItem(`onyx_handoff_${handoffId}`);
      sessionStorage.removeItem(`onyx_handoff_${handoffId}`); // consume once
      if (raw) {
        const data = safeJsonParse(raw, null);
        if (data && Array.isArray(data.scenes)) {
          applySnapshot(data);
          setPast([]);
          setFuture([]);
          // Clean handoff param from URL
          const url = new URL(window.location.href);
          url.searchParams.delete("handoff");
          window.history.replaceState({}, "", url.toString());
          return; // don't load autosave — this is a fresh campaign reel
        }
      }
    }

    // Normal autosave restore
    const raw = localStorage.getItem(AUTOSAVE_KEY);
    if (!raw) return;
    const data = safeJsonParse(raw, null);
    if (!data || !Array.isArray(data.scenes)) return;
    applySnapshot(data);
    setPast([]);
    setFuture([]);
    if (data.reelId && !reelId) {
      setReelId(data.reelId);
      const url = new URL(window.location.href);
      if (!url.searchParams.get("reelId")) {
        url.searchParams.set("reelId", data.reelId);
        window.history.replaceState({}, "", url.toString());
      }
    }

    const effectiveReelId = data.reelId || reelId;
    if (effectiveReelId) {
      const injectionKey = `onyx_editor_autosave_${effectiveReelId}`;
      const pending = localStorage.getItem(injectionKey);
      if (pending) {
        try {
          const p = JSON.parse(pending);
          if (p.globalMusicUrl) setGlobalMusicUrl(p.globalMusicUrl);
          if (p.globalMusicName) setGlobalMusicName(p.globalMusicName);
        } catch (_) {}
        localStorage.removeItem(injectionKey);
      }
    }
  }, [applySnapshot, reelId]);

  const commit = useCallback(
    (mutator) => {
      const prev = deepClone(snapshot);
      mutator();
      setPast((p) => [...p, prev]);
      setFuture([]);
    },
    [snapshot]
  );

  const undo = () => {
    setPast((p) => {
      if (!p.length) return p;
      const prev = p[p.length - 1];
      setFuture((f) => [deepClone(snapshot), ...f]);
      applySnapshot(prev);
      return p.slice(0, -1);
    });
  };

  const redo = () => {
    setFuture((f) => {
      if (!f.length) return f;
      const next = f[0];
      setPast((p) => [...p, deepClone(snapshot)]);
      applySnapshot(next);
      return f.slice(1);
    });
  };

  const updateScenes = (nextScenes) => {
    setScenes(
      (Array.isArray(nextScenes) && nextScenes.length ? nextScenes : [makeEmptyScene(1)]).map(
        (sc, idx) => normalizeScene(sc, idx + 1)
      )
    );
  };

  const addScene = () => {
    commit(() => {
      setScenes((prev) => {
        const nextId = prev.reduce((m, sc) => Math.max(m, Number(sc.id) || 0), 0) + 1;
        return [...prev, makeEmptyScene(nextId)];
      });
    });
  };

  const duplicateScene = (id) => {
    commit(() => {
      setScenes((prev) => {
        const idx = prev.findIndex((scene) => scene.id === id);
        if (idx === -1) return prev;

        const nextId = prev.reduce((m, sc) => Math.max(m, Number(sc.id) || 0), 0) + 1;
        const clone = normalizeScene(
          {
            ...deepClone(prev[idx]),
            id: nextId,
          },
          nextId
        );

        const next = [...prev];
        next.splice(idx + 1, 0, clone);
        return next;
      });
    });
  };

  const deleteScene = (id) => {
    commit(() => {
      setScenes((prev) => {
        if (prev.length <= 1) return prev;

        const next = prev.filter((scene) => scene.id !== id);
        if (!next.length) return prev;

        if (activeScene === id) setActiveScene(next[0].id);
        return next;
      });
    });
  };

  const changeTransition = (id, value) => {
    commit(() => {
      setScenes((prev) =>
        prev.map((scene) =>
          scene.id === id ? { ...scene, transitionToNext: value } : scene
        )
      );
    });
  };

  const moveScene = (fromId, toId) => {
    if (fromId === toId) return;

    commit(() => {
      setScenes((prev) => {
        const fromIndex = prev.findIndex((scene) => String(scene.id) === String(fromId));
        const toIndex = prev.findIndex((scene) => String(scene.id) === String(toId));
        if (fromIndex === -1 || toIndex === -1) return prev;

        const next = [...prev];
        const [moved] = next.splice(fromIndex, 1);
        next.splice(toIndex, 0, moved);
        return next;
      });
    });
  };

  const applyMediaToActiveScene = (payload) => {
    if (!payload || !activeScene) return;

    const nextMediaUrl = payload.url || payload.mediaUrl || null;
    const nextMediaType =
      payload.mediaType || (isVideoUrl(nextMediaUrl || "") ? "video" : "image");

    commit(() => {
      setScenes((prev) =>
        prev.map((scene) =>
          scene.id === activeScene
            ? {
                ...scene,
                url: nextMediaUrl,
                mediaUrl: nextMediaUrl,
                thumbnail:
                  payload.thumb ||
                  payload.thumbnail ||
                  payload.stockThumb ||
                  nextMediaUrl ||
                  null,
                mediaType: nextMediaType,
                isAiGenerated: payload.source === "ai",
                generatedAt: new Date().toISOString(),
                stockBaseQuery: payload.stockBaseQuery || scene.stockBaseQuery || "",
                stockQuery: payload.stockQuery || scene.stockQuery || "",
                stockVariation:
                  payload.stockVariation ||
                  payload.stockQuery ||
                  scene.stockVariation ||
                  scene.stockQuery ||
                  "",
                stockSource: payload.source || scene.stockSource || "",
                stockAssetId: payload.stockAssetId || scene.stockAssetId || null,
                stockThumb:
                  payload.stockThumb ||
                  payload.thumb ||
                  payload.thumbnail ||
                  scene.stockThumb ||
                  nextMediaUrl ||
                  null,
              }
            : scene
        )
      );
    });
  };

  const saveSceneToAiStudio = async (sceneId) => {
    const scene = scenes.find((sc) => sc.id === sceneId);
    const sceneUrl = scene?.url || scene?.mediaUrl;

    if (!scene || !sceneUrl) {
      alert("Add media to the scene before saving to AI Studio.");
      return;
    }

    const askName = () =>
      new Promise((resolve) => {
        promptResolveRef.current = resolve;
        setPromptTitle("Save to AI Studio");
        setPromptLabel("Item name");
        setPromptDefault(`Scene ${sceneId}`);
        setPromptOpen(true);
      });

    const name = await askName();
    if (name == null) return;

    const item = {
      id: `ai_${Date.now()}`,
      name: name || `Scene ${sceneId}`,
      url: sceneUrl,
      thumbnail: scene.thumbnail || sceneUrl,
      mediaType: scene.mediaType || (isVideoUrl(sceneUrl) ? "video" : "image"),
      createdAt: new Date().toISOString(),
      source: "ai",
    };

    try {
      const existing = safeJsonParse(localStorage.getItem(AI_STUDIO_LIBRARY_KEY), []);
      const next = [item, ...(Array.isArray(existing) ? existing : [])];
      localStorage.setItem(AI_STUDIO_LIBRARY_KEY, JSON.stringify(next));
      window.dispatchEvent(new CustomEvent("onyx:ai-studio-save", { detail: item }));
    } catch {}

    commit(() => {
      setScenes((prev) =>
        prev.map((sc) =>
          sc.id === sceneId ? { ...sc, savedAt: new Date().toISOString() } : sc
        )
      );
    });
  };

  const generateScene = async (sceneId) => {
    const scene = scenes.find(sc => sc.id === sceneId);
    if (!scene) return;
    const prompt = [scene.action, scene.narration].filter(Boolean).join(". ") || `Scene ${sceneId}`;
    setStatusMsg(`Scene ${sceneId}: Starting generation...`);
    try {
      const { data: { session: genSession } } = await supabase.auth.getSession();
      const genToken = genSession?.access_token;
      // Build scene bible from Scene 1 for continuity
      const allScenes = scenes;
      const sceneIndex = allScenes.findIndex(sc => sc.id === sceneId);
      const scene1 = allScenes[0];
      const isFirstScene = sceneIndex === 0;

      // Get reference image from first completed scene
      const refImageUrl = !isFirstScene && (scene1?.thumbnail || scene1?.url || scene1?.mediaUrl) 
        ? (scene1.thumbnail || scene1.url || scene1.mediaUrl)
        : null;

      // Build scene bible from all previous scenes' prompts
      let continuityPrompt = prompt;
      if (!isFirstScene) {
        const prevSceneDescriptions = allScenes
          .slice(0, sceneIndex)
          .filter(sc => sc.action || sc.narration)
          .map((sc, i) => `Scene ${i+1}: ${[sc.action, sc.narration].filter(Boolean).join(". ")}`)
          .join(" | ");
        if (prevSceneDescriptions) {
          continuityPrompt = `STORY CONTEXT [${prevSceneDescriptions}] CURRENT SCENE: ${prompt}`;
        }
      }

      const generatePayload = {
        prompt: continuityPrompt,
        sceneId,
        aspect_ratio: ratio === "9:16" ? "9:16" : "16:9",
        duration: scene.duration || 5,
        ...(refImageUrl ? { image_url: refImageUrl } : {})
      };

      setGeneratingScenes(prev => ({ ...prev, [sceneId]: { status: "submitting" } }));
      const res = await fetch("/api/kling/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(genToken ? { Authorization: `Bearer ${genToken}` } : {}) },
        body: JSON.stringify(generatePayload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to start generation");
      const { jobId } = data;
      setGeneratingScenes(prev => ({ ...prev, [sceneId]: { status: "polling", jobId } }));
      setStatusMsg(`Scene ${sceneId}: Generating video...`);
      const interval = setInterval(async () => {
        try {
          const pollRes = await fetch(`/api/kling/status/${jobId}`, { headers: genToken ? { Authorization: `Bearer ${genToken}` } : {} });
          const poll = await pollRes.json();
          if (poll.status === "completed" && poll.videoUrl) {
            clearInterval(interval);
            setGeneratingScenes(prev => { const n = { ...prev }; delete n[sceneId]; return n; });
            commit(() => {
              setScenes(prev => prev.map(sc => sc.id === sceneId ? {
                ...sc,
                url: poll.videoUrl,
                mediaUrl: poll.videoUrl,
                mediaType: "video",
                thumbnail: poll.thumbnailUrl || poll.videoUrl,
                isAiGenerated: true,
                generatedAt: new Date().toISOString()
              } : sc));
            });
            setStatusMsg(`Scene ${sceneId}: Video ready!`);
                console.log("[AutoTitle] Video ready, titleRef:", titleRef.current, "prompt:", prompt?.slice(0,50));
                if (titleRef.current === "Untitled Reel" || !titleRef.current) {
                  try {
                    const titleRes = await fetch("/api/analyse/title", {
                      method: "POST",
                      headers: { "Content-Type": "application/json", ...(genToken ? { Authorization: `Bearer ${genToken}` } : {}) },
                      body: JSON.stringify({ prompt }),
                    });
                    if (titleRes.ok) {
                      const titleData = await titleRes.json();
                      if (titleData.title) setTitle(titleData.title);
                    }
                  } catch (_) {}
                }
          } else if (poll.status === "failed") {
            clearInterval(interval);
            setGeneratingScenes(prev => { const n = { ...prev }; delete n[sceneId]; return n; });
            setStatusMsg(`Scene ${sceneId}: Generation failed.`);
          }
        } catch { clearInterval(interval); setGeneratingScenes(prev => { const n = { ...prev }; delete n[sceneId]; return n; }); }
      }, 5000);
    } catch (err) {
      setGeneratingScenes(prev => { const n = { ...prev }; delete n[sceneId]; return n; });
      setStatusMsg(`Scene ${sceneId}: failed — ${err.message}`);
    }
  };

  const clearSceneVoiceover = () => {
    commit(() => {
      setScenes((prev) =>
        prev.map((scene) =>
          scene.id === activeScene
            ? {
                ...scene,
                voiceoverUrl: null,
                voiceover: null,
                voiceoverStale: false,
                voiceoverSourceText: "",
              }
            : scene
        )
      );
    });
    setStatusMsg(`Cleared voiceover for Scene ${activeScene}.`);
  };

  const clearAllVoiceovers = () => {
    commit(() => {
      setScenes((prev) =>
        prev.map((scene) => ({
          ...scene,
          voiceoverUrl: null,
          voiceover: null,
          voiceoverStale: false,
          voiceoverSourceText: "",
        }))
      );
    });
    setStatusMsg("Cleared all scene voiceovers.");
  };

  const buildRenderRequest = (renderMode) => {
    const payload = scenes
      .filter((scene) => scene.url || scene.mediaUrl)
      .map((scene) => {
        const finalUrl = scene.url || scene.mediaUrl;
        return {
          type: isVideoUrl(finalUrl || "") ? "video" : "image",
          url: finalUrl,
          duration: Number(scene.duration || 3),
          voiceoverUrl: scene.voiceoverUrl || null,
          voiceoverVolume: scene.voiceoverVolume || null,
          sourceAudioVolume: typeof scene.sourceAudioVolume === "number" ? scene.sourceAudioVolume : 100,
          sourceAudioMuted: !!scene.sourceAudioMuted,
          trimStart: typeof scene.trimStart === "number" ? scene.trimStart : 0,
          trimEnd: typeof scene.trimEnd === "number" ? scene.trimEnd : null,
          // Caption data for burn-in
          narration: scene.narration || null,
          captionsEnabled: scene.captionsEnabled !== false,
          caption_color: scene.caption_color || brand?.caption_color || selectedTemplate?.captionStyle?.color || "#ffffff",
          caption_bg_color: scene.caption_bg_color || brand?.caption_bg_color || selectedTemplate?.captionStyle?.background || "rgba(0,0,0,0.82)",
          caption_font: scene.caption_font || brand?.caption_font || selectedTemplate?.captionStyle?.fontFamily?.replace(/'/g, "") || "sans-serif",
          caption_size: scene.caption_size || brand?.caption_size || selectedTemplate?.captionStyle?.fontSize || 16,
          caption_position: scene.caption_position || brand?.caption_position || selectedTemplate?.captionStyle?.position || "bottom",
          // Transitions
          transitionToNext: scene.transitionToNext || selectedTemplate?.transitionStyle || "cut",
        };
      });

    // Resolve stock music URL — replace proxy path with direct fetch
    let resolvedMusicUrl = globalMusicUrl || null;
    if (resolvedMusicUrl && String(resolvedMusicUrl).startsWith("/api/stock/")) {
      // Pass as-is — backend will fetch through the proxy
      resolvedMusicUrl = `${window.location.origin}${resolvedMusicUrl}`;
    }

    return {
      scenes: payload,
      musicUrl: resolvedMusicUrl,
      voiceoverVolume,
      musicVolume,
      renderMode,
      brand: brand || null,
      reelId: reelId || null,
      theme_id: selectedTheme?.id || null,
      aspectRatio: ratio,
    };
  };

  const downloadVideo = async () => {
    try {
      setDownloading(true);
      setStatusMsg("Rendering download...");

      const res = await fetch("/api/render", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...await getAuthHeaders() },
        body: JSON.stringify(buildRenderRequest("download")),
      });

      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(text);
      }

      if (!res.ok) {
        throw new Error(data.error || "Render failed");
      }

      const reelName = (title || "onyx-reel")
        .trim()
        .replace(/[^a-z0-9]+/gi, "-")
        .replace(/^-+|-+$/g, "")
        .toLowerCase();

      const link = document.createElement("a");
      link.href = data.url;
      link.download = `${reelName}.mp4`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setStatusMsg("Download started.");
      setReelVideoUrl(data.url);
    } catch (err) {
      console.error(err);
      alert("Download failed: " + err.message);
      setStatusMsg("");
    } finally {
      setDownloading(false);
    }
  };

  const shareVideo = async () => {
    try {
      setSharing(true);
      setStatusMsg("Rendering share link...");
      const res = await fetch("/api/render", {
        method: "POST",
        headers: { ...(await getAuthHeaders()), "Content-Type": "application/json" },
        body: JSON.stringify(buildRenderRequest("share")),
      });
      const text = await res.text();
      let data;
      try { data = JSON.parse(text); } catch { throw new Error(text); }
      if (!res.ok) throw new Error(data.error || "Render failed");
      const username = currentUser?.user_metadata?.username
        || currentUser?.email?.split("@")[0]
        || "onyx";
      const refUrl = `https://onyx-reelz.com/signup?ref=${encodeURIComponent(username)}`;
      const fullVideoUrl = `${window.location.origin}${data.url}`;
      const encoded = btoa(fullVideoUrl).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
      const shareUrl = `${window.location.origin}/preview/${encoded}?ref=${encodeURIComponent(username || '')}`;
      navigator.clipboard.writeText(shareUrl).catch(() => {
        const ta = document.createElement("textarea");
        ta.value = shareUrl;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      });
      setShareModalUrl(shareUrl);
      setStatusMsg("Share link copied!");
    } catch (err) {
      console.error(err);
      setStatusMsg("Share failed: " + err.message);
    } finally {
      setSharing(false);
    }
  };

  const onCanvasDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    setCanvasDropHint(true);
  };

  const onCanvasDragLeave = (e) => {
    e.preventDefault();
    setCanvasDropHint(false);
  };

  const onCanvasDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setCanvasDropHint(false);
    setCanvasErr("");

    try {
      const musicData = e.dataTransfer.getData("application/onyx-music");
      if (musicData) {
        const payload = JSON.parse(musicData);
        if (payload?.url) {
          commit(() => {
            setGlobalMusicUrl(payload.url);
            setGlobalMusicName(payload.name || payload.title || "Track");
          });
          setStatusMsg(`${payload.name || payload.title || "Track"} applied to reel.`);
        }
        return;
      }

      const audioData = e.dataTransfer.getData("application/onyx-audio");
      if (audioData) {
        const payload = JSON.parse(audioData);
        if (payload?.url) {
          commit(() => {
            setScenes((prev) =>
              prev.map((scene) =>
                scene.id === activeScene
                  ? {
                      ...scene,
                      voiceoverUrl: payload.url,
                      voiceover: payload.url,
                      voiceoverStale: false,
                      voiceoverSourceText: normalizeNarrationText(scene?.narration || ""),
                    }
                  : scene
              )
            );
          });
          setStatusMsg(`Voice applied to Scene ${activeScene}.`);
        }
        return;
      }
    } catch {}

    const dtFiles = Array.from(e.dataTransfer.files || []);
    if (dtFiles.length) {
      try {
        const out = await uploadFiles(dtFiles);
        const f = out?.[0];
        if (f) {
          applyMediaToActiveScene({
            url: f.url,
            thumbnail: f.thumbnail || f.url,
            mediaType:
              f.type?.startsWith("video") || isVideoUrl(f.url) ? "video" : "image",
            source: "upload",
          });
        }
      } catch (err) {
        setCanvasErr(err?.message || "Upload failed");
      }
      return;
    }

    try {
      const raw = e.dataTransfer.getData("application/onyx-media");
      if (!raw) return;
      const payload = JSON.parse(raw);
      if (payload?.kind !== "media") return;
      applyMediaToActiveScene(payload);
    } catch {}
  };

  const playMusicIfPossible = useCallback(async () => {
    const music = projectMusicAudioRef.current;
    if (!music || !globalMusicUrl) return;
    syncMusicVolume();
    try {
      await music.play();
    } catch {}
  }, [globalMusicUrl, syncMusicVolume]);

  const playVoiceForSceneId = useCallback(
    async (sceneId, startOffset = 0) => {
      const voice = sceneVoiceoverAudioRef.current;
      const scene = getSceneById(sceneId);
      if (!voice || !scene?.voiceoverUrl) return;

      syncVoiceVolume();

      try {
        voice.pause();
      } catch {}

      try {
        const expectedSrc = new URL(scene.voiceoverUrl, window.location.origin).href;
        if (voice.src !== expectedSrc) {
          voice.src = scene.voiceoverUrl;
          voice.load();
        }
      } catch {}

      try {
        const duration = Number.isFinite(voice.duration) ? voice.duration : startOffset;
        voice.currentTime = clamp(startOffset, 0, duration || startOffset);
      } catch {}

      try {
        await voice.play();
      } catch (err) {
        console.error("VOICE PLAY FAILED", {
          sceneId,
          voiceoverUrl: scene?.voiceoverUrl,
          err,
        });
      }
    },
    [getSceneById, syncVoiceVolume]
  );

  const regenerateVoiceoversForIndexes = useCallback(
    async ({ targetIndexes = [], isAuto = false } = {}) => {
      const uniqueIndexes = Array.from(
        new Set((targetIndexes || []).filter((v) => Number.isInteger(v) && v >= 0))
      );
      if (!uniqueIndexes.length) return;

      const prefs = safeJsonParse(localStorage.getItem(AUDIO_VOICE_PREFS_KEY), {});
      const voiceTier = prefs?.voiceTier === "premium" ? "premium" : "standard";
      const selectedVoiceId =
        typeof prefs?.selectedVoiceId === "string" && prefs.selectedVoiceId
          ? prefs.selectedVoiceId
          : "alloy";
      const speed =
        typeof prefs?.speed === "number" && Number.isFinite(prefs.speed) ? prefs.speed : 1;

      const sourceScenes = scenesRef.current;
      const items = uniqueIndexes
        .map((index) => ({
          sceneId: `scene_index_${index}`,
          sceneIndex: index,
          text: normalizeNarrationText(sourceScenes[index]?.narration || ""),
        }))
        .filter((item) => item.text);

      if (!items.length) return;

      const requestId = Date.now() + Math.random();
      autoVoiceRefreshRequestIdRef.current = requestId;

      if (isAuto) {
        setStatusMsg("Refreshing edited voiceover...");
      }

      try {
        const res = await fetch("/api/tts/generate-batch", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...await getAuthHeaders() },
          body: JSON.stringify({
            provider: voiceTier === "premium" ? "elevenlabs" : "openai",
            voice: selectedVoiceId,
            speed,
            items,
          }),
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data?.success || !Array.isArray(data?.results)) {
          throw new Error(data?.error || `Voice generation failed (${res.status})`);
        }

        if (autoVoiceRefreshRequestIdRef.current !== requestId) return;

        setScenes((prevScenes) =>
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
              return {
                ...scene,
                voiceoverUrl: null,
                voiceover: null,
                voiceoverStale: false,
                voiceoverSourceText: "",
              };
            }

            return match?.url
              ? {
                  ...scene,
                  voiceoverUrl: match.url,
                  voiceover: match.url,
                  voiceoverStale: false,
                  voiceoverSourceText: latestNarration,
                }
              : {
                  ...scene,
                  voiceoverUrl: null,
                  voiceover: null,
                  voiceoverStale: true,
                  voiceoverSourceText: "",
                };
          })
        );

        if (isAuto) {
          setStatusMsg("Edited voiceover refreshed.");
        }
      } catch (err) {
        console.error("AUTO VOICE REFRESH FAILED", err);
        if (isAuto) {
          setStatusMsg(err?.message || "Voice refresh failed.");
        }
      }
    },
    []
  );

  const startProgressTimer = useCallback(
    (sceneType, sessionId) => {
      clearProgressTimer();

      progressTimerRef.current = setInterval(() => {
        if (!isPlayingRef.current) return;
        if (playbackSessionRef.current !== sessionId) return;
        if (isScrubbingRef.current) return;

        if (sceneType === "video") {
          const video = canvasVideoRef.current;
          const now = Number(video?.currentTime || 0);
          sceneOffsetRef.current = now;
          setSceneProgress(now);
          return;
        }

        const elapsed = sceneOffsetRef.current + (Date.now() - sceneStartedAtRef.current) / 1000;
        setSceneProgress(Math.min(elapsed, currentSceneDurationRef.current || elapsed));
      }, PROGRESS_TICK_MS);
    },
    [clearProgressTimer]
  );

  const advanceToNextScene = useCallback(
    (sessionId) => {
      if (!isPlayingRef.current) return;
      if (playbackSessionRef.current !== sessionId) return;

      const currentId = activeSceneRef.current;
      const nextId = getNextPlayableSceneId(currentId);

      if (!nextId) {
        stopPreviewAndReset();
        const finalDuration = currentSceneDurationRef.current || 0;
        setSceneProgress(finalDuration);
        return;
      }

      stopSceneMedia({ resetVideo: true, resetVoice: true });
      sceneOffsetRef.current = 0;
      pendingPlaybackRef.current = {
        sceneId: nextId,
        sessionId,
        offsetSeconds: 0,
        autoplay: true,
      };
      setActiveScene(nextId);
    },
    [getNextPlayableSceneId, stopPreviewAndReset, stopSceneMedia]
  );

  const startScenePlayback = useCallback(
    async (sceneId, sessionId, offsetSeconds = 0, autoplay = true) => {
      const scene = getSceneById(sceneId);
      if (!scene) return;

      const sceneMediaUrl = scene.url || scene.mediaUrl;
      if (!sceneMediaUrl) {
        if (autoplay) advanceToNextScene(sessionId);
        return;
      }

      clearPlaybackTimers();
      stopAndReset(sceneVoiceoverAudioRef.current);
      sceneOffsetRef.current = Math.max(0, Number(offsetSeconds) || 0);
      if (typeof scene.trimStart === "number" && scene.trimStart > 0) {
        sceneOffsetRef.current = Math.max(sceneOffsetRef.current, scene.trimStart);
      }

      const durationSeconds = getCurrentSceneDurationSeconds(scene);
      currentSceneDurationRef.current = durationSeconds;
      setSceneDuration(durationSeconds);
      setSceneProgress(sceneOffsetRef.current);

      if (scene.mediaType === "image") {
        sceneStartedAtRef.current = Date.now();
        if (!autoplay) return;

        const remainingFallbackMs = Math.max(
          0,
          Math.round(((scene.trimEnd ?? durationSeconds) - sceneOffsetRef.current) * 1000)
        );

        if (scene.voiceoverUrl) {
          const handler = () => {
            if (!isPlayingRef.current) return;
            if (playbackSessionRef.current !== sessionId) return;
            advanceToNextScene(sessionId);
          };

          voiceEndedHandlerRef.current = handler;
          sceneVoiceoverAudioRef.current?.addEventListener("ended", handler, { once: true });

          imageAdvanceTimerRef.current = setTimeout(() => {
            if (!isPlayingRef.current) return;
            if (playbackSessionRef.current !== sessionId) return;
            advanceToNextScene(sessionId);
          }, Math.max(0, ((scene.trimEnd ?? MAX_IMAGE_SCENE_MS / 1000) - sceneOffsetRef.current) * 1000));

          await playVoiceForSceneId(sceneId, sceneOffsetRef.current);
          startProgressTimer("image", sessionId);
          return;
        }

        imageAdvanceTimerRef.current = setTimeout(() => {
          if (!isPlayingRef.current) return;
          if (playbackSessionRef.current !== sessionId) return;
          advanceToNextScene(sessionId);
        }, remainingFallbackMs);

        startProgressTimer("image", sessionId);
        return;
      }

      const video = canvasVideoRef.current;
      if (!video) return;

      const muted = !!scene.sourceAudioMuted;
      const volume = Math.max(
        0,
        Math.min(1, Number(scene.sourceAudioVolume ?? 100) / 100)
      );

      try {
        video.muted = muted;
        video.volume = muted ? 0 : volume;
      } catch {}

      try {
        const maxSeek =
          Number.isFinite(video.duration) && video.duration > 0
            ? video.duration
            : sceneOffsetRef.current;
        video.currentTime = clamp(sceneOffsetRef.current, 0, maxSeek);
      } catch {}

      const trimEndHandler = () => {
        const liveScene = scenesRef.current.find((s) => s.id === sceneId);
        const te = liveScene?.trimEnd;
        if (typeof te !== "number") return;
        if (video.currentTime >= te) {
          video.removeEventListener("timeupdate", trimEndHandler);
          if (!isPlayingRef.current) return;
          if (playbackSessionRef.current !== sessionId) return;
          video.pause();
          advanceToNextScene(sessionId);
        }
      };
      video.addEventListener("timeupdate", trimEndHandler);

      if (autoplay) {
        try {
          await video.play();
        } catch {}

        await playVoiceForSceneId(sceneId, sceneOffsetRef.current);

        if (scene.voiceoverUrl) {
          const scheduleVideoAdvanceFromVoice = () => {
            const voice = sceneVoiceoverAudioRef.current;
            const naturalVideoDuration =
              Number.isFinite(videoDurationMapRef.current[scene.id]) &&
              videoDurationMapRef.current[scene.id] > 0
                ? videoDurationMapRef.current[scene.id]
                : Math.max(1, Number(scene.duration) || FALLBACK_VIDEO_SCENE_MS / 1000);

            const voiceDuration = Number(voice?.duration);
            if (!Number.isFinite(voiceDuration) || voiceDuration <= 0) return;

            const effectiveDuration = Math.min(
              Math.max(
                naturalVideoDuration,
                Math.max(1, voiceDuration + VOICEOVER_TAIL_MS / 1000)
              ),
              typeof scene.trimEnd === "number" ? scene.trimEnd : Infinity
            );

            currentSceneDurationRef.current = effectiveDuration;
            setSceneDuration(effectiveDuration);

            const remainingMs = Math.max(
              0,
              Math.round((effectiveDuration - sceneOffsetRef.current) * 1000)
            );

            if (imageAdvanceTimerRef.current) {
              clearTimeout(imageAdvanceTimerRef.current);
            }

            imageAdvanceTimerRef.current = setTimeout(() => {
              if (!isPlayingRef.current) return;
              if (playbackSessionRef.current !== sessionId) return;
              advanceToNextScene(sessionId);
            }, remainingMs);
          };

          scheduleVideoAdvanceFromVoice();

          const voice = sceneVoiceoverAudioRef.current;
          if (voice) {
            const handleVoiceDurationReady = () => {
              scheduleVideoAdvanceFromVoice();
              voice.removeEventListener("loadedmetadata", handleVoiceDurationReady);
              voice.removeEventListener("durationchange", handleVoiceDurationReady);
            };

            if (!(Number.isFinite(voice.duration) && voice.duration > 0)) {
              voice.addEventListener("loadedmetadata", handleVoiceDurationReady);
              voice.addEventListener("durationchange", handleVoiceDurationReady);
            }
          }
        }
      }

      startProgressTimer("video", sessionId);
    },
    [
      advanceToNextScene,
      clearPlaybackTimers,
      getCurrentSceneDurationSeconds,
      getSceneById,
      playVoiceForSceneId,
      startProgressTimer,
    ]
  );

  const beginPreview = useCallback(async () => {
    const startId = getStartPlayableSceneId(activeSceneRef.current);
    if (!startId) return;

    const sessionId = playbackSessionRef.current + 1;
    playbackSessionRef.current = sessionId;
    isPlayingRef.current = true;
    setIsPlaying(true);

    // Seek music to the correct reel position before resuming
    try {
      if (projectMusicAudioRef.current) {
        const currentScenes = scenesRef.current;
        const startIdx = currentScenes.findIndex(s => s.id === startId);
        const reelOffset = currentScenes.slice(0, Math.max(0, startIdx)).reduce((sum, s) => sum + (Number(s.duration) || 3), 0);
        const sceneOff = startId === activeSceneRef.current ? Math.max(0, Number(sceneOffsetRef.current) || 0) : 0;
        projectMusicAudioRef.current.currentTime = reelOffset + sceneOff;
      }
    } catch {}

    await playMusicIfPossible();

    const resumeOffset =
      startId === activeSceneRef.current
        ? Math.max(0, Number(sceneOffsetRef.current) || 0)
        : 0;

    if (startId !== activeSceneRef.current) {
      pendingPlaybackRef.current = {
        sceneId: startId,
        sessionId,
        offsetSeconds: 0,
        autoplay: true,
      };
      setActiveScene(startId);
      return;
    }

    await startScenePlayback(startId, sessionId, resumeOffset, true);
  }, [getStartPlayableSceneId, playMusicIfPossible, startScenePlayback]);

  const seekWithinCurrentScene = useCallback(
    async (targetSeconds, shouldResumePlayback = false) => {
      const scene = getSceneById(activeSceneRef.current);
      if (!scene) return;

      const clamped = clamp(targetSeconds, 0, currentSceneDurationRef.current || 0);
      stopSceneMedia({ resetVideo: false, resetVoice: true });
      clearProgressTimer();
      setSceneProgress(clamped);
      sceneOffsetRef.current = clamped;

      if (scene.mediaType === "video") {
        const video = canvasVideoRef.current;
        if (video) {
          try {
            video.currentTime = clamped;
          } catch {}
        }
      } else {
        sceneStartedAtRef.current = Date.now();
      }

      if (shouldResumePlayback) {
        const sessionId = playbackSessionRef.current + 1;
        playbackSessionRef.current = sessionId;
        isPlayingRef.current = true;
        setIsPlaying(true);
        await playMusicIfPossible();
        await startScenePlayback(scene.id, sessionId, clamped, true);
        return;
      }

      isPlayingRef.current = false;
      setIsPlaying(false);
      await startScenePlayback(scene.id, playbackSessionRef.current, clamped, false);
    },
    [
      clearProgressTimer,
      getSceneById,
      playMusicIfPossible,
      startScenePlayback,
      stopSceneMedia,
    ]
  );

  const seekReel = useCallback(async (pct) => {
    const total = Math.max(reelTotalDuration, 1);
    const targetSec = pct * total;
    let elapsed = 0;
    let targetScene = scenes[0];
    let offsetInScene = 0;
    for (const sc of scenes) {
      const dur = Number(sc.duration) || 3;
      if (elapsed + dur > targetSec) {
        targetScene = sc;
        offsetInScene = targetSec - elapsed;
        break;
      }
      elapsed += dur;
    }
    if (!targetScene) return;
    const wasPlaying = isPlayingRef.current;
    pauseAllPlayback();
    try { if (projectMusicAudioRef.current) projectMusicAudioRef.current.currentTime = targetSec; } catch {}
    if (targetScene.id !== activeSceneRef.current) {
      pendingPlaybackRef.current = {
        sceneId: targetScene.id,
        sessionId: playbackSessionRef.current,
        offsetSeconds: offsetInScene,
        autoplay: wasPlaying,
      };
      setActiveScene(targetScene.id);
    } else {
      await seekWithinCurrentScene(offsetInScene, wasPlaying);
    }
  }, [scenes, reelTotalDuration, pauseAllPlayback, seekWithinCurrentScene]);

  const handleScoreMyReel = useCallback(async () => {
    if (scoringReel) return;
    setScoringReel(true);
    try {
      const allNarration = scenesRef.current
        .map(s => s.narration || s.action || '')
        .filter(Boolean)
        .join(' ');

      if (!allNarration.trim()) {
        setStatusMsg('Add narration to your scenes first.');
        setScoringReel(false);
        return;
      }

      const headers = await getAuthHeaders();
      const toneRes = await fetch('/api/score-reel/analyse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ narration: allNarration }),
      });
      const toneData = await toneRes.json();
      if (!toneRes.ok) throw new Error(toneData.error || 'Analysis failed');

      const musicPrompt = toneData.musicPrompt;
      setStatusMsg('🎵 Composing your score with Lyria 3 Pro...');

      const genRes = await fetch('/api/music/generate-lyria', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ prompt: musicPrompt }),
      });
      const genData = await genRes.json();
      if (!genRes.ok) throw new Error(genData.error || 'Generation failed');

      const track = genData.tracks?.[0];
      if (!track?.url) throw new Error('No track returned from Lyria');
      setGlobalMusicUrl(track.url);
      setGlobalMusicName(toneData.trackName || musicPrompt.slice(0, 40));
      setStatusMsg(`✓ Score applied: "${toneData.trackName || 'AI Score'}"`);
      fetchCredits();

    } catch (err) {
      setStatusMsg(`Score My Reel failed: ${err.message}`);
    } finally {
      setScoringReel(false);
    }
  }, [scoringReel, getAuthHeaders, setGlobalMusicUrl, setGlobalMusicName, fetchCredits]);

  const togglePlayPause = useCallback(async () => {
    if (isPlayingRef.current) {
      pauseAllPlayback();
      return;
    }
    await beginPreview();
  }, [pauseAllPlayback, beginPreview]);

  useEffect(() => {
    function handleKey(e) {
      if (e.code === 'Space' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
        e.preventDefault();
        togglePlayPause();
      }
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [togglePlayPause]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("reelId");
    if (!id) return;
    setReelId(id);
    getAuthHeaders().then(headers => {
      fetch(`/api/reels/${id}`, { headers })
        .then(r => r.json())
        .then(data => {
          if (data.id) {
            if (data.title) setTitle(data.title);
            if (data.scenes && data.scenes.length) {
              const loadedScenes = data.scenes.map((sc, i) => normalizeScene(sc, i + 1));
              const scenesWithVoice = loadedScenes.map(s => ({
                ...s,
                voiceId: s.voiceId || DEFAULT_VOICE_ID,
                voiceName: s.voiceName || DEFAULT_VOICE_NAME,
              }));
              setScenes(scenesWithVoice);
            }
            if (data.theme_id) {
              import('../data/themes.js').then(({ THEMES }) => {
                setSelectedTheme(THEMES.find(t => t.id === data.theme_id) || null);
              });
            }
          }
        })
        .catch(() => {});
    });
  }, []);

  useEffect(() => {
    scenesRef.current = scenes;
  }, [scenes]);

  useEffect(() => {
    activeSceneRef.current = activeScene;
  }, [activeScene]);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    loadAutosave();
  }, [loadAutosave]);

  useEffect(() => {
    if (autosaveTimeoutRef.current) {
      clearTimeout(autosaveTimeoutRef.current);
    }

    autosaveTimeoutRef.current = setTimeout(saveNow, 700);

    return () => {
      if (autosaveTimeoutRef.current) {
        clearTimeout(autosaveTimeoutRef.current);
      }
    };
  }, [snapshot, saveNow]);

  useEffect(() => {
    const beforeUnload = () => {
      saveNow();
    };

    window.addEventListener("beforeunload", beforeUnload);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
    };
  }, [saveNow]);

  useEffect(() => {
    const handleMediaSelect = (e) => {
      if (e.detail) applyMediaToActiveScene(e.detail);
    };

    window.addEventListener("onyx:media-select", handleMediaSelect);
    return () => {
      window.removeEventListener("onyx:media-select", handleMediaSelect);
    };
  }, [activeScene]);

  useEffect(() => {
    syncMusicVolume();
  }, [syncMusicVolume]);

  useEffect(() => {
    syncVoiceVolume();
  }, [syncVoiceVolume]);

  useEffect(() => {
    const voice = sceneVoiceoverAudioRef.current;
    if (!voice) return;

    try {
      voice.pause();
    } catch {}
    try {
      voice.currentTime = 0;
    } catch {}

    const nextUrl = activeSceneObj?.voiceoverUrl || "";
    if (!nextUrl) {
      voice.removeAttribute("src");
      voice.load();
      return;
    }

    voice.src = nextUrl;
    voice.load();
  }, [activeSceneObj?.id, activeSceneObj?.voiceoverUrl]);

  useEffect(() => {
    const video = canvasVideoRef.current;
    if (!video || activeSceneObj?.mediaType !== "video") return;

    const muted = !!activeSceneObj?.sourceAudioMuted;
    const volume = Math.max(
      0,
      Math.min(1, Number(activeSceneObj?.sourceAudioVolume ?? 100) / 100)
    );

    try {
      video.muted = muted;
      video.volume = muted ? 0 : volume;
    } catch {}
  }, [
    activeSceneObj?.id,
    activeSceneObj?.mediaType,
    activeSceneObj?.sourceAudioMuted,
    activeSceneObj?.sourceAudioVolume,
  ]);

  useEffect(() => {
    const staleIndexes = scenes.reduce((acc, scene, index) => {
      const narrationText = normalizeNarrationText(scene?.narration || "");
      const sourceText = normalizeNarrationText(scene?.voiceoverSourceText || "");
      const hasNarration = !!narrationText;

      if (!hasNarration) return acc;

      if (scene?.voiceoverStale) {
        acc.push(index);
        return acc;
      }

      if (scene?.voiceoverUrl && narrationText !== sourceText) {
        acc.push(index);
      }

      return acc;
    }, []);

    if (autoVoiceRefreshTimerRef.current) {
      clearTimeout(autoVoiceRefreshTimerRef.current);
      autoVoiceRefreshTimerRef.current = null;
    }

    if (!staleIndexes.length) return;

    autoVoiceRefreshTimerRef.current = setTimeout(() => {
      regenerateVoiceoversForIndexes({
        targetIndexes: staleIndexes,
        isAuto: true,
      });
    }, AUTO_REFRESH_DEBOUNCE_MS);

    return () => {
      if (autoVoiceRefreshTimerRef.current) {
        clearTimeout(autoVoiceRefreshTimerRef.current);
        autoVoiceRefreshTimerRef.current = null;
      }
    };
  }, [scenes, regenerateVoiceoversForIndexes]);

  useEffect(() => {
    if (!activeSceneObj) {
      setSceneProgress(0);
      setSceneDuration(0);
      return;
    }

    if (isPlayingRef.current) return;

    const duration = getCurrentSceneDurationSeconds(activeSceneObj);
    currentSceneDurationRef.current = duration;
    setSceneDuration(duration);

    const preservedOffset =
      activeSceneRef.current === activeSceneObj.id
        ? clamp(sceneOffsetRef.current, 0, duration || 0)
        : 0;

    sceneOffsetRef.current = preservedOffset;
    setSceneProgress(preservedOffset);
  }, [activeSceneObj, getCurrentSceneDurationSeconds]);

  useEffect(() => {
    if (!activeSceneObj) return;
    const pending = pendingPlaybackRef.current;
    if (!pending) return;
    if (pending.sceneId !== activeSceneObj.id) return;
    pendingPlaybackRef.current = null;
    // If scene has no media, skip it immediately rather than hanging
    if (!activeSceneMediaUrl && pending.autoplay) {
      advanceToNextScene(pending.sessionId);
      return;
    }
    startScenePlayback(pending.sceneId, pending.sessionId, pending.offsetSeconds, pending.autoplay);
  }, [activeSceneObj, activeSceneMediaUrl, startScenePlayback, advanceToNextScene]);

  useEffect(() => {
    return () => {
      stopPreviewAndReset();
      if (autoVoiceRefreshTimerRef.current) {
        clearTimeout(autoVoiceRefreshTimerRef.current);
      }
    };
  }, [stopPreviewAndReset]);

  useEffect(() => {
    return () => {
      Object.values(lumaPollingRefs.current).forEach(clearInterval);
    };
  }, []);

  useEffect(() => {
    const handler = () => addScene();
    window.addEventListener("onyx-add-scene", handler);
    return () => window.removeEventListener("onyx-add-scene", handler);
  }, [addScene]);

  return (
    <div className="editorShell">
      <div className="topNav">
        <div className="topLeft">
          <button
            className="backBtn"
            onClick={() => {
              window.location.href = "/dashboard";
            }}
          >
            Back
          </button>

          <input
            className="titleInput"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          <button className="saveBtn" onClick={saveNow}>
            Save
          </button>

          <button className="addSceneTopBtn" onClick={addScene}>
            + Add Scene
          </button>
        </div>

        <div className="topControls">
          <select value={ratio} onChange={(e) => setRatio(e.target.value)}>
            <option>16:9</option>
            <option>9:16</option>
            <option>1:1</option>
          </select>

          {creditBalance !== null && (
            <div style={{ fontSize: 13, color: "#fff", opacity: 0.8, display: "flex", alignItems: "center", gap: 6, marginRight: 8 }}>
              <span style={{ color: "#fbbf24" }}>⬡</span>
              <span>{creditBalance} credits</span>
            </div>
          )}

          <button onClick={shareVideo} disabled={sharing || downloading}>
            {sharing ? "Sharing..." : "Share"}
          </button>

          <button onClick={undo}>Undo</button>
          <button onClick={redo}>Redo</button>

          <button
            onClick={() => { if (trialStatus.trial_expired) { window.location.href = "/pricing"; return; } downloadVideo(); }}
            disabled={downloading || sharing}
            style={trialStatus.trial_expired ? { border: "1px solid rgba(239,68,68,0.4)", background: "rgba(239,68,68,0.12)", color: "#f87171" } : {}}
          >
            {trialStatus.trial_expired ? "Trial Expired" : downloading ? "Exporting..." : "Download"}
          </button>

          <button
            onClick={async () => {
              const { data } = await supabase.auth.getSession();
              setYtToken(data?.session?.access_token || '');
              const headers = await getAuthHeaders();
              // Open modal immediately — render happens in background
              setYtModalOpen(true);
              // Try existing render first
              let videoUrl = reelVideoUrl;
              if (!videoUrl && reelId) {
                try {
                  const existingRes = await fetch(`/api/reels/${reelId}/renders`, { headers });
                  if (existingRes.ok) {
                    const existingData = await existingRes.json();
                    if (existingData.url) videoUrl = existingData.url;
                  }
                } catch(e) {}
              }
              // No existing render — trigger one in background while modal is open
              if (!videoUrl) {
                try {
                  const scenesPayload = scenes
                    .filter(s => s.url || s.mediaUrl)
                    .map(s => ({ type: s.mediaType || "video", url: s.url || s.mediaUrl, duration: s.duration || 3, voiceoverUrl: s.voiceoverUrl || null }));
                  const res = await fetch("/api/render", {
                    method: "POST",
                    headers: { ...headers, "Content-Type": "application/json" },
                    body: JSON.stringify({ scenes: scenesPayload, reelId, renderMode: "download", theme_id: selectedTheme?.id || null }),
                  });
                  const renderData = await res.json();
                  if (renderData.url) videoUrl = renderData.url;
                } catch(e) { console.error("Background render for YouTube failed:", e); }
              }
              if (videoUrl) setReelVideoUrl(videoUrl);
            }}
            disabled={downloading || sharing}
            style={{
              padding: "6px 14px",
              borderRadius: 8,
              border: "1px solid rgba(255,0,0,0.4)",
              background: "rgba(255,0,0,0.12)",
              color: "#FF4444",
              fontSize: 13,
              fontWeight: 600,
              cursor: (downloading || sharing) ? "not-allowed" : "pointer",
              whiteSpace: "nowrap",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            ▶ YouTube
          </button>

          <button
            onClick={handleScoreMyReel}
            disabled={scoringReel}
            style={{
              padding: '6px 14px',
              borderRadius: 8,
              border: '1px solid rgba(236,72,153,0.4)',
              background: scoringReel ? 'rgba(236,72,153,0.05)' : 'rgba(236,72,153,0.12)',
              color: scoringReel ? '#9d4f7c' : '#f472b6',
              fontSize: 13,
              fontWeight: 600,
              cursor: scoringReel ? 'not-allowed' : 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {scoringReel ? '🎵 Scoring...' : '🎵 Score My Reel'}
          </button>

          <button onClick={() => { window.location.href = `/publish${reelId ? `?reelId=${reelId}` : ""}`; }} style={{
            padding: "8px 16px", borderRadius: 8, border: "none",
            background: "#7c3aed", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer",
          }}>
            📤 Publish
          </button>
        </div>
      </div>

      {statusMsg ? (
        <div
          style={{
            padding: "8px 16px",
            fontSize: 12,
            opacity: 0.85,
            borderTop: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          {statusMsg}
        </div>
      ) : null}

      <div className={`editorBody ${activeMenu === "audio" ? "audioMode" : ""}`}>
        <div className="iconMenu" style={{width: "72px", minWidth: "72px", flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center"}}>
          <div
            className={activeMenu === "storyboard" ? "active" : ""}
            onClick={() => setActiveMenu("storyboard")}
          >
            📜
          </div>
          <div
            className={activeMenu === "visuals" ? "active" : ""}
            onClick={() => setActiveMenu("visuals")}
          >
            🎬
          </div>
          <div
            className={activeMenu === "audio" ? "active" : ""}
            onClick={() => setActiveMenu("audio")}
          >
            🎵
          </div>
          <div
            className={activeMenu === "branding" ? "active" : ""}
            onClick={() => setActiveMenu("branding")}
          >
            🏷
          </div>
          <div
            className={activeMenu === "styles" ? "active" : ""}
            onClick={() => setActiveMenu("styles")}
          >
            🎨
          </div>
          <div
            className={activeMenu === "text" ? "active" : ""}
            onClick={() => setActiveMenu("text")}
          >
            🔤
          </div>
          <div
            className={activeMenu === "elements" ? "active" : ""}
            onClick={() => setActiveMenu("elements")}
          >
            🎭
          </div>
          <div
            className={activeMenu === "avatar" ? "active" : ""}
            onClick={() => setActiveMenu("avatar")}
          >
            🧍
          </div>
        </div>

        <div className="sidePanel" style={{zIndex: 1, height: "100%", overflowY: "auto"}}>
          {activeMenu === "storyboard" && (
            <StoryboardPanel
              scenes={scenes}
              activeScene={activeScene}
              setActiveScene={(id) => {
                pauseAllPlayback();
                try { if (projectMusicAudioRef.current) projectMusicAudioRef.current.currentTime = sceneStartTimes[id] ?? 0; } catch {}
                setActiveScene(id);
              }}
              updateScenes={updateScenes}
              onSaveScene={saveSceneToAiStudio}
              onGenerateScene={generateScene}
              generatingScenes={generatingScenes}
            />
          )}

          {activeMenu === "visuals" && (
            <VisualsPanel
              tab={visualsTab}
              setTab={setVisualsTab}
              libraryKey={AI_STUDIO_LIBRARY_KEY}
              apiBase={API_BASE}
              activeScene={activeScene}
              activeSceneObj={activeSceneObj}
              onSelect={applyMediaToActiveScene}
              onUseAiStudioItem={(item) => {
                applyMediaToActiveScene({
                  url: item.url,
                  thumbnail: item.thumbnail || item.url,
                  mediaType:
                    item.mediaType || (isVideoUrl(item.url || "") ? "video" : "image"),
                  source: "ai",
                });
              }}
            />
          )}

          {activeMenu === "audio" && (
            <AudioPanel
              tab={audioTab}
              setTab={setAudioTab}
              scenes={scenes}
              setScenes={setScenes}
              voiceoverVolume={voiceoverVolume}
              setVoiceoverVolume={setVoiceoverVolume}
              musicVolume={musicVolume}
              setMusicVolume={setMusicVolume}
              musicUrl={globalMusicUrl}
              setMusicUrl={(url, name) => {
                setGlobalMusicUrl(url || "");
                if (name) setGlobalMusicName(name);
                if (url) {
                  setStatusMsg(`${name || "Track"} applied to reel.`);
                }
              }}
              clearSceneVoiceover={clearSceneVoiceover}
              clearAllVoiceovers={clearAllVoiceovers}
            />
          )}

          {activeMenu === "branding" && (
            <div style={{ padding: "16px 12px", display: "flex", flexDirection: "column", gap: 12, height: "100%", overflowY: "auto" }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "1.5px" }}>Brand Kit</div>

              {brands.length === 0 ? (
                <div style={{ fontSize: 12, color: "#475569", textAlign: "center", padding: "16px 0" }}>
                  No brands set up yet.
                  <br />
                  <a href="/branding" style={{ color: "#7c3aed", fontSize: 12, marginTop: 8, display: "inline-block" }}>Create a brand →</a>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {brands.map(b => {
                    const isActive = selectedBrandId === b.id;
                    return (
                      <div key={b.id} onClick={() => {
                        setSelectedBrandId(b.id);
                        setBrand(prev => ({ ...prev, ...b }));
                      }} style={{
                        padding: "10px 12px", borderRadius: 8, cursor: "pointer",
                        background: isActive ? "rgba(124,58,237,0.15)" : "#111827",
                        border: isActive ? "1px solid rgba(124,58,237,0.4)" : "1px solid #1f2937",
                        display: "flex", alignItems: "center", gap: 8,
                      }}>
                        <div style={{ width: 10, height: 10, borderRadius: "50%", background: b.primary_color || "#6366f1", flexShrink: 0 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: isActive ? "#a78bfa" : "#e2e8f0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {b.brand_label || b.brand_name || "Unnamed"}
                          </div>
                          {b.is_default && <div style={{ fontSize: 9, color: "#4ade80", fontWeight: 700 }}>★ DEFAULT</div>}
                        </div>
                        {isActive && <span style={{ color: "#a78bfa", fontSize: 14 }}>✓</span>}
                      </div>
                    );
                  })}
                </div>
              )}

              <a href="/branding" style={{
                display: "block", padding: "8px 12px", borderRadius: 6, fontSize: 11, fontWeight: 600,
                textAlign: "center", textDecoration: "none",
                background: "transparent", border: "1px dashed #2b3442", color: "#7c3aed",
                marginTop: 4,
              }}>
                ✏️ Edit Brands →
              </a>

              {selectedBrandId && brand.default_avatar_id && (
                <div style={{ padding: "8px 10px", borderRadius: 6, fontSize: 11, color: "#fbbf24", background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.2)" }}>
                  ⚡ This brand uses an avatar preset. Credits will be charged per scene when rendered.
                </div>
              )}

              {selectedBrandId && brand.default_voice_provider === "elevenlabs" && (
                <div style={{ padding: "8px 10px", borderRadius: 6, fontSize: 11, color: "#fbbf24", background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.2)" }}>
                  ⚡ This brand uses a premium voice. Credits will be charged per scene when rendered.
                </div>
              )}
            </div>
          )}
          {activeMenu === "styles" && (
            <div style={{ height: "100%", overflowY: "auto", display: "flex", flexDirection: "column" }}>
              <StylesPanel
                scenes={scenes}
                setScenes={setScenes}
                activeScene={activeScene}
                activeThemeId={activeTheme}
              />
              <div style={{ padding: "0 12px 20px" }}>
                <ThemeSelector
                  selectedThemeId={selectedTheme?.id || null}
                  onSelect={setSelectedTheme}
                />
              </div>
            </div>
          )}
          {activeMenu === "text" && (
            <TextPanel
              scenes={scenes}
              setScenes={setScenes}
              activeScene={activeScene}
            />
          )}
          {activeMenu === "elements" && (
            <ElementsPanel
              scenes={scenes}
              setScenes={setScenes}
              activeScene={activeScene}
            />
          )}
          {activeMenu === "avatar" && (
            <AvatarPanel
              scenes={scenes}
              setScenes={setScenes}
              activeScene={activeScene}
              reelVideoUrl={reelVideoUrl}
            />
          )}
        </div>

        <div className="canvasArea">
          <div
            className="canvasWrap"
            onClick={() => setSelectedElementId(null)}
            style={{
              width: "100%",
              flex: 1,
              minHeight: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 12,
            }}
          >
            <div
              className={`canvas ratio-${ratio.replace(":", "-")} ${
                canvasDropHint ? "canvasDropHint" : ""
              }`}
              onDragOver={onCanvasDragOver}
              onDragLeave={onCanvasDragLeave}
              onDrop={onCanvasDrop}
              style={{
                position: "relative",
                width: "100%",
                maxWidth: ratio === "9:16" ? 420 : 980,
                aspectRatio: canvasAspectRatio,
                minHeight: 0,
                background: "#000000",
                borderRadius: 16,
                overflow: "hidden",
                boxShadow: "0 12px 32px rgba(0,0,0,0.22)",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  flexDirection: "column",
                  minHeight: 0,
                }}
              >
                <div
                  style={{
                    flex: 1,
                    minHeight: 0,
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    overflow: "hidden",
                    background: "#000000",
                  }}
                >
                  {activeSceneMediaUrl ? (
                    activeSceneObj?.mediaType === "video" ? (
                      <video
                        ref={canvasVideoRef}
                        key={activeSceneMediaUrl}
                        src={activeSceneMediaUrl}
                        playsInline
                        preload="auto"
                        controls={false}
                        onLoadedMetadata={(e) => {
                          const d = Number(e.currentTarget.duration);
                          if (Number.isFinite(d) && d > 0 && activeSceneObj?.id != null) {
                            videoDurationMapRef.current[activeSceneObj.id] = d;
                            if (
                              !isPlayingRef.current &&
                              activeSceneObj.id === activeSceneRef.current
                            ) {
                              currentSceneDurationRef.current = d;
                              setSceneDuration(d);
                            }
                          }
                        }}
                        onTimeUpdate={(e) => {
                          if (!isPlayingRef.current || isScrubbingRef.current) return;
                          const time = Number(e.currentTarget.currentTime || 0);
                          sceneOffsetRef.current = time;
                          setSceneProgress(time);
                        }}
                        onEnded={() => {
                          if (!isPlayingRef.current) return;
                          advanceToNextScene(playbackSessionRef.current);
                        }}
                        style={{
                          maxWidth: "100%",
                          maxHeight: "100%",
                          width: "100%",
                          height: "100%",
                          objectFit: "contain",
                          display: "block",
                          background: "#000000",
                        }}
                      />
                    ) : (
                      <img
                        src={activeSceneMediaUrl}
                        alt=""
                        style={{
                          maxWidth: "100%",
                          maxHeight: "100%",
                          width: "100%",
                          height: "100%",
                          objectFit: "contain",
                          display: "block",
                          background: "#000000",
                        }}
                      />
                    )
                  ) : (
                    <div style={{ color: "#fff", opacity: 0.7 }}>No Media</div>
                  )}
                {/* Logo overlay */}
                        {brand?.logo_url && (
                          <div style={{
                            position: "absolute",
                            ...(brand.logo_position === "top-left" ? { top: 12, left: 12 } :
                               brand.logo_position === "top-right" ? { top: 12, right: 12 } :
                               brand.logo_position === "bottom-left" ? { bottom: 70, left: 12 } :
                               { bottom: 70, right: 12 }),
                            zIndex: 20,
                            pointerEvents: "none",
                          }}>
                            <img
                              src={brand.logo_url}
                              alt="Brand logo"
                              style={{
                                height: brand.logo_size === "small" ? 36 : brand.logo_size === "large" ? 90 : 64,
                                maxWidth: brand.logo_size === "small" ? 100 : brand.logo_size === "large" ? 240 : 160,
                                objectFit: "contain", opacity: 0.92,
                                filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.5))"
                              }}
                            />
                          </div>
                        )}

                        {/* Text box overlays */}
                        {(activeSceneObj?.text_boxes || []).map(tb => {
                          const posMap = {
                            "top-left":      { top: "8%",  left: "5%",  transform: "none" },
                            "top-center":    { top: "8%",  left: "50%", transform: "translateX(-50%)" },
                            "top-right":     { top: "8%",  right: "5%", transform: "none" },
                            "middle-left":   { top: "50%", left: "5%",  transform: "translateY(-50%)" },
                            "middle-center": { top: "50%", left: "50%", transform: "translate(-50%,-50%)" },
                            "middle-right":  { top: "50%", right: "5%", transform: "translateY(-50%)" },
                            "bottom-left":   { bottom: "12%", left: "5%",  transform: "none" },
                            "bottom-center": { bottom: "12%", left: "50%", transform: "translateX(-50%)" },
                            "bottom-right":  { bottom: "12%", right: "5%", transform: "none" },
                          };
                          const pos = posMap[tb.position] || posMap["middle-center"];
                          return (
                            <div key={tb.id} style={{
                              position: "absolute",
                              ...pos,
                              zIndex: 25,
                              pointerEvents: "none",
                              fontFamily: tb.font,
                              fontSize: tb.fontSize,
                              color: tb.color,
                              background: tb.bgColor === "transparent" ? "transparent" : tb.bgColor,
                              fontWeight: tb.bold ? 700 : 400,
                              fontStyle: tb.italic ? "italic" : "normal",
                              textAlign: tb.align,
                              opacity: (tb.opacity ?? 100) / 100,
                              padding: tb.bgColor !== "transparent" ? "4px 10px" : 0,
                              borderRadius: 4,
                              maxWidth: "90%",
                              lineHeight: 1.3,
                              textShadow: "0 1px 4px rgba(0,0,0,0.7)",
                              whiteSpace: "pre-wrap",
                              wordBreak: "break-word",
                            }}>
                              {tb.text}
                            </div>
                          );
                        })}

                        {(activeSceneObj?.elements || []).map((el, elIdx) => {
                          const posMap = {
                            "top-left":      { top:"5%",  left:"5%",  transform:"none" },
                            "top-center":    { top:"5%",  left:"50%", transform:"translateX(-50%)" },
                            "top-right":     { top:"5%",  right:"5%", transform:"none" },
                            "middle-left":   { top:"50%", left:"5%",  transform:"translateY(-50%)" },
                            "middle-center": { top:"50%", left:"50%", transform:"translate(-50%,-50%)" },
                            "middle-right":  { top:"50%", right:"5%", transform:"translateY(-50%)" },
                            "bottom-left":   { bottom:"12%", left:"5%",  transform:"none" },
                            "bottom-center": { bottom:"12%", left:"50%", transform:"translateX(-50%)" },
                            "bottom-right":  { bottom:"12%", right:"5%", transform:"none" },
                          };
                          const pos = posMap[el.position] || posMap["middle-center"];
                          const size = el.size || 80;
                          const isSelected = selectedElementId === el.id;
                          const allElements = activeSceneObj?.elements || [];

                          function updateEl(changes) {
                            setScenes(prev => prev.map(s => s.id === activeScene ? {
                              ...s,
                              elements: (s.elements || []).map(e => e.id === el.id ? { ...e, ...changes } : e)
                            } : s));
                          }

                          function moveLayer(dir) {
                            setScenes(prev => prev.map(s => {
                              if (s.id !== activeScene) return s;
                              const els = [...(s.elements || [])];
                              const idx = els.findIndex(e => e.id === el.id);
                              const newIdx = idx + dir;
                              if (newIdx < 0 || newIdx >= els.length) return s;
                              [els[idx], els[newIdx]] = [els[newIdx], els[idx]];
                              return { ...s, elements: els };
                            }));
                          }

                          function deleteEl() {
                            setScenes(prev => prev.map(s => s.id === activeScene ? {
                              ...s, elements: (s.elements || []).filter(e => e.id !== el.id)
                            } : s));
                            setSelectedElementId(null);
                          }

                          return (
                            <div key={el.id} style={{ position:"absolute", ...pos, zIndex: 26 + elIdx, cursor:"pointer" }}
                              onClick={e => { e.stopPropagation(); setSelectedElementId(isSelected ? null : el.id); }}>

                              {/* The element itself */}
                              <div style={{
                                position:"relative",
                                outline: isSelected ? "2px solid #7c3aed" : "none",
                                outlineOffset: 3,
                                borderRadius: 4,
                                opacity: (el.opacity ?? 100) / 100,
                              }}>
                                {el.type === "emoji"
                                  ? <span style={{ fontSize: size, display:"block", lineHeight:1 }}>{el.content}</span>
                                  : <img src={el.content} style={{ width:size, height:"auto", display:"block" }} alt="" />
                                }
                              </div>

                              {/* Selected toolbar */}
                              {isSelected && (
                                <div style={{
                                  position:"absolute", bottom:8, left:"50%", transform:"translateX(-50%)", zIndex:200,
                                  marginTop:6, background:"#0f141b", border:"1px solid #7c3aed",
                                  borderRadius:8, padding:"8px 10px", minWidth:220,
                                  boxShadow:"0 4px 20px rgba(0,0,0,0.5)", display:"flex", flexDirection:"column", gap:8,
                                }} onClick={e => e.stopPropagation()}>
                                  {/* Size */}
                                  <div>
                                    <div style={{fontSize:9,color:"#94a3b8",marginBottom:2}}>Size: {size}px</div>
                                    <input type="range" min={20} max={300} value={size}
                                      onChange={e => updateEl({ size: Number(e.target.value) })}
                                      style={{width:"100%"}}/>
                                  </div>
                                  {/* Opacity */}
                                  <div>
                                    <div style={{fontSize:9,color:"#94a3b8",marginBottom:2}}>Opacity: {el.opacity ?? 100}%</div>
                                    <input type="range" min={10} max={100} value={el.opacity ?? 100}
                                      onChange={e => updateEl({ opacity: Number(e.target.value) })}
                                      style={{width:"100%"}}/>
                                  </div>
                                  {/* Position grid */}
                                  <div>
                                    <div style={{fontSize:9,color:"#94a3b8",marginBottom:4}}>Position</div>
                                    <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:2}}>
                                      {["top-left","top-center","top-right","middle-left","middle-center","middle-right","bottom-left","bottom-center","bottom-right"].map(p=>(
                                        <button key={p} onClick={()=>updateEl({position:p})} style={{
                                          padding:"3px 2px", fontSize:8, borderRadius:4, cursor:"pointer", border:"none",
                                          background: el.position===p ? "#7c3aed" : "#1f2937",
                                          color: el.position===p ? "#fff" : "#64748b",
                                        }}>
                                          {p.replace("-"," ")}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                  {/* Layer order + delete */}
                                  <div style={{display:"flex",gap:4}}>
                                    <button onClick={()=>moveLayer(-1)} style={{flex:1,padding:"4px",fontSize:10,borderRadius:4,cursor:"pointer",background:"#1f2937",border:"1px solid #2b3442",color:"#94a3b8"}}>↑ Forward</button>
                                    <button onClick={()=>moveLayer(1)} style={{flex:1,padding:"4px",fontSize:10,borderRadius:4,cursor:"pointer",background:"#1f2937",border:"1px solid #2b3442",color:"#94a3b8"}}>↓ Back</button>
                                    <button onClick={deleteEl} style={{padding:"4px 8px",fontSize:10,borderRadius:4,cursor:"pointer",background:"rgba(239,68,68,0.15)",border:"1px solid rgba(239,68,68,0.3)",color:"#f87171"}}>✕</button>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}

                        {/* Caption overlay */}
                {activeSceneObj?.captionsEnabled && (
                  activeSceneObj?.caption_words?.length > 0 ? (
                    <div style={{
                      position:"absolute", bottom:"15%", left:"5%", right:"5%",
                      zIndex:30, textAlign:"center", pointerEvents:"none",
                    }}>
                      {activeSceneObj.caption_words.map((w, i) => (
                        <KaraokeWord
                          key={i}
                          word={w.word}
                          start={w.start}
                          end={w.end}
                          audioRef={sceneVoiceoverAudioRef}
                        />
                      ))}
                    </div>
                  ) : activeSceneObj?.narration ? (
                    <div style={{
                      position:"absolute", bottom:"15%", left:"5%", right:"5%",
                      zIndex:30, textAlign:"center", pointerEvents:"none",
                      color:"#fff", fontSize:16, fontWeight:700,
                      textShadow:"0 2px 8px rgba(0,0,0,0.9)",
                      background:"rgba(0,0,0,0.4)", borderRadius:6, padding:"4px 10px",
                    }}>
                      {activeSceneObj.narration}
                    </div>
                  ) : null
                )}
                </div>

                <div
                  className="canvasControlBar"
                  style={{
                    flexShrink: 0,
                    height: CONTROL_BAR_HEIGHT,
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "10px 12px",
                    background: "rgba(0,0,0,0.72)",
                    borderTop: "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  <button
                    className="canvasControlBtn"
                    type="button"
                    onClick={togglePlayPause}
                    style={{
                      border: "1px solid rgba(255,255,255,0.14)",
                      background: "rgba(15,23,42,0.9)",
                      color: "#fff",
                      borderRadius: 8,
                      padding: "8px 14px",
                      fontWeight: 700,
                      cursor: "pointer",
                      minWidth: 76,
                    }}
                  >
                    {isPlaying ? "Pause" : "Play"}
                  </button>

                  <div
                    style={{
                      fontSize: 12,
                      color: "#fff",
                      minWidth: 42,
                      textAlign: "right",
                    }}
                  >
                    {formatClock(sceneProgress)}
                  </div>

                  <input
                    type="range"
                    min="0"
                    max={Math.max(sceneDuration, 0.1)}
                    step="0.01"
                    value={clamp(sceneProgress, 0, Math.max(sceneDuration, 0.1))}
                    onMouseDown={() => {
                      isScrubbingRef.current = true;
                    }}
                    onMouseUp={async (e) => {
                      isScrubbingRef.current = false;
                      await seekWithinCurrentScene(
                        Number(e.currentTarget.value),
                        isPlayingRef.current
                      );
                    }}
                    onTouchStart={() => {
                      isScrubbingRef.current = true;
                    }}
                    onTouchEnd={async (e) => {
                      isScrubbingRef.current = false;
                      await seekWithinCurrentScene(
                        Number(e.currentTarget.value),
                        isPlayingRef.current
                      );
                    }}
                    onChange={(e) => {
                      setSceneProgress(Number(e.target.value));
                    }}
                    style={{ flex: 1 }}
                  />

                  <div style={{ fontSize: 12, color: "#fff", minWidth: 42 }}>
                    {formatClock(sceneDuration)}
                  </div>
                </div>

                {/* ── Canvas Tool Toolbar ── */}
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "8px 12px",
                  background: "rgba(0,0,0,0.55)",
                  borderTop: "1px solid rgba(255,255,255,0.06)",
                  flexShrink: 0,
                }}>
                  {[
                    { id: "layers", label: "Layers" },
                    { id: "trim", label: "Trim" },
                    { id: "captions", label: "Captions" },
                    { id: "audio", label: "Audio" },
                  ].map(tool => (
                    <button
                      key={tool.id}
                      onClick={() => setCanvasTool(canvasTool === tool.id ? null : tool.id)}
                      style={{
                        background: canvasTool === tool.id ? "#1e3a5f" : "#1f2937",
                        border: canvasTool === tool.id ? "1px solid #2563eb" : "1px solid #2b3442",
                        color: canvasTool === tool.id ? "#60a5fa" : "#94a3b8",
                        borderRadius: 4,
                        padding: "4px 12px",
                        fontSize: 11,
                        fontWeight: 600,
                        cursor: "pointer",
                        letterSpacing: "0.5px",
                        textTransform: "uppercase",
                      }}
                    >
                      {tool.label}
                    </button>
                  ))}
                </div>

                {/* ── Trim Panel ── */}
                {canvasTool === "trim" && activeSceneObj && (
                  <div style={{
                    background: "rgba(0,0,0,0.8)",
                    borderTop: "1px solid rgba(255,255,255,0.08)",
                    padding: "12px 16px",
                    flexShrink: 0,
                  }}>
                    <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "1px" }}>Trim — Scene {scenes.findIndex(s => s.id === activeScene) + 1}</div>

                    {/* Timeline visual */}
                    <div style={{ position: "relative", height: 36, background: "rgba(255,255,255,0.07)", borderRadius: 6, marginBottom: 10, overflow: "hidden" }}>
                      <div style={{
                        position: "absolute",
                        left: 0,
                        width: `${((activeSceneObj.trimStart ?? 0) / Math.max(sceneDuration, 0.1)) * 100}%`,
                        top: 0, bottom: 0,
                        background: "rgba(0,0,0,0.55)",
                      }} />
                      <div style={{
                        position: "absolute",
                        right: 0,
                        width: `${100 - ((activeSceneObj.trimEnd ?? sceneDuration) / Math.max(sceneDuration, 0.1)) * 100}%`,
                        top: 0, bottom: 0,
                        background: "rgba(0,0,0,0.55)",
                      }} />
                      <div style={{
                        position: "absolute",
                        left: `${((activeSceneObj.trimStart ?? 0) / Math.max(sceneDuration, 0.1)) * 100}%`,
                        right: `${100 - ((activeSceneObj.trimEnd ?? sceneDuration) / Math.max(sceneDuration, 0.1)) * 100}%`,
                        top: 0, bottom: 0,
                        background: "rgba(37,99,235,0.3)",
                        border: "2px solid rgba(37,99,235,0.8)",
                        borderRadius: 4,
                      }} />
                      <div style={{
                        position: "absolute",
                        left: `${(sceneProgress / Math.max(sceneDuration, 0.1)) * 100}%`,
                        top: 0, bottom: 0,
                        width: 2,
                        background: "#fff",
                      }} />
                    </div>

                    <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12, color: "#ccc", marginBottom: 8 }}>
                      <span style={{ minWidth: 60 }}>In: {(activeSceneObj.trimStart ?? 0).toFixed(1)}s</span>
                      <input
                        type="range"
                        min={0}
                        max={activeSceneObj.trimEnd ?? sceneDuration}
                        step={0.1}
                        value={activeSceneObj.trimStart ?? 0}
                        onChange={e => {
                          const val = Number(e.target.value);
                          updateScenes(scenes.map(s => s.id === activeScene ? { ...s, trimStart: val } : s));
                          if (canvasVideoRef.current) canvasVideoRef.current.currentTime = val;
                        }}
                        style={{ flex: 1, accentColor: "#2563eb" }}
                      />
                    </label>

                    <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12, color: "#ccc" }}>
                      <span style={{ minWidth: 60 }}>Out: {(activeSceneObj.trimEnd ?? sceneDuration).toFixed(1)}s</span>
                      <input
                        type="range"
                        min={activeSceneObj.trimStart ?? 0}
                        max={sceneDuration}
                        step={0.1}
                        value={activeSceneObj.trimEnd ?? sceneDuration}
                        onChange={e => {
                          const val = Number(e.target.value);
                          updateScenes(scenes.map(s => s.id === activeScene ? { ...s, trimEnd: val } : s));
                          if (canvasVideoRef.current) canvasVideoRef.current.currentTime = val;
                        }}
                        style={{ flex: 1, accentColor: "#2563eb" }}
                      />
                    </label>

                    <button
                      onClick={() => updateScenes(scenes.map(s => s.id === activeScene ? { ...s, trimStart: 0, trimEnd: null } : s))}
                      style={{ marginTop: 10, fontSize: 11, background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", color: "#ccc", borderRadius: 5, padding: "4px 10px", cursor: "pointer" }}
                    >
                      Reset trim
                    </button>
                  </div>
                )}

                {/* ── Layers Panel ── */}
                {canvasTool === "layers" && (
                  <div style={{
                    background: "rgba(0,0,0,0.8)",
                    borderTop: "1px solid rgba(255,255,255,0.08)",
                    padding: "12px 16px",
                    flexShrink: 0,
                  }}>
                    <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "1px" }}>Layers — Scene {scenes.findIndex(s => s.id === activeScene) + 1}</div>
                    {[
                      { id: "caption", label: "💬 Captions", active: activeSceneObj?.captionsEnabled ?? true },
                      { id: "video", label: "🎬 Base Video", active: true },
                      { id: "avatar", label: "🧑 Avatar", active: false, placeholder: true },
                      { id: "logo", label: "🏷️ Logo / Watermark", active: false, placeholder: true },
                    ].map(layer => (
                      <div key={layer.id} style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "7px 10px",
                        marginBottom: 4,
                        background: "#111827",
                        borderRadius: 4,
                        border: "1px solid #1f2937",
                      }}>
                        <span style={{ flex: 1, fontSize: 12, color: "#e2e8f0" }}>{layer.label}</span>
                        {layer.placeholder ? (
                          <span style={{ fontSize: 10, color: "#666" }}>Coming soon</span>
                        ) : layer.id === "caption" ? (
                          <input
                            type="checkbox"
                            checked={activeSceneObj?.captionsEnabled ?? true}
                            onChange={e => updateScenes(scenes.map(s => s.id === activeScene ? { ...s, captionsEnabled: e.target.checked } : s))}
                            style={{ accentColor: "#8b5cf6" }}
                          />
                        ) : (
                          <span style={{ fontSize: 10, color: "#8b5cf6" }}>Always on</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* ── Captions Panel ── */}
                {canvasTool === "captions" && (
                  <div style={{ background:"rgba(0,0,0,0.85)", borderTop:"1px solid rgba(255,255,255,0.08)", padding:"12px 16px", flexShrink:0 }}>
                    <div style={{ fontSize:11, color:"#94a3b8", marginBottom:10, fontWeight:600, textTransform:"uppercase", letterSpacing:"1px" }}>
                      Captions — Scene {scenes.findIndex(s => s.id === activeScene) + 1}
                    </div>
                    <label style={{ display:"flex", alignItems:"center", gap:8, fontSize:12, color:"#ccc", marginBottom:10 }}>
                      <input type="checkbox"
                        checked={activeSceneObj?.captionsEnabled ?? true}
                        onChange={e => updateScenes(scenes.map(s => s.id === activeScene ? { ...s, captionsEnabled: e.target.checked } : s))}
                        style={{ accentColor:"#8b5cf6" }}
                      />
                      Show captions on canvas
                    </label>
                    {activeSceneObj?.voiceoverUrl ? (
                      <div>
                        <button
                          onClick={async () => {
                            try {
                              const headers = await getAuthHeaders();
                              headers["Content-Type"] = "application/json";
                              const res = await fetch("/api/tts/transcribe-words", {
                                method: "POST", headers,
                                body: JSON.stringify({ voiceoverUrl: activeSceneObj.voiceoverUrl }),
                              });
                              const data = await res.json();
                              if (data.words?.length) {
                                updateScenes(scenes.map(s => s.id === activeScene ? { ...s, caption_words: data.words } : s));
                                setStatusMsg(`✅ ${data.words.length} words synced for captions`);
                              } else {
                                setStatusMsg("No words found in voiceover");
                              }
                            } catch(err) {
                              setStatusMsg("Caption sync failed: " + err.message);
                            }
                          }}
                          style={{ padding:"7px 14px", borderRadius:6, border:"none", background:"#7c3aed", color:"#fff", fontSize:12, fontWeight:600, cursor:"pointer", marginBottom:8, width:"100%" }}
                        >
                          {activeSceneObj?.caption_words?.length
                            ? `✅ ${activeSceneObj.caption_words.length} words synced — Re-sync`
                            : "🎙 Sync Captions from Voiceover"}
                        </button>
                        {activeSceneObj?.caption_words?.length > 0 && (
                          <div style={{ fontSize:10, color:"#475569", lineHeight:1.6 }}>
                            {activeSceneObj.caption_words.map((w,i) => (
                              <span key={i} style={{ marginRight:3 }}>{w.word}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div style={{ fontSize:11, color:"#475569" }}>Generate a voiceover first to enable karaoke captions.</div>
                    )}
                  </div>
                )}

                {/* ── Audio Panel ── */}
                {canvasTool === "audio" && (
                  <div style={{
                    background: "rgba(0,0,0,0.8)",
                    borderTop: "1px solid rgba(255,255,255,0.08)",
                    padding: "12px 16px",
                    flexShrink: 0,
                  }}>
                    <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "1px" }}>Audio — Scene {scenes.findIndex(s => s.id === activeScene) + 1}</div>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#ccc", marginBottom: 8 }}>
                      <input
                        type="checkbox"
                        checked={!!activeSceneObj?.sourceAudioMuted}
                        onChange={e => updateScenes(scenes.map(s => s.id === activeScene ? { ...s, sourceAudioMuted: e.target.checked } : s))}
                        style={{ accentColor: "#8b5cf6" }}
                      />
                      Mute clip audio
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12, color: "#ccc" }}>
                      <span style={{ minWidth: 70 }}>Clip vol: {activeSceneObj?.sourceAudioVolume ?? 100}%</span>
                      <input
                        type="range" min={0} max={100} step={1}
                        value={activeSceneObj?.sourceAudioVolume ?? 100}
                        disabled={!!activeSceneObj?.sourceAudioMuted}
                        onChange={e => updateScenes(scenes.map(s => s.id === activeScene ? { ...s, sourceAudioVolume: Number(e.target.value) } : s))}
                        style={{ flex: 1, accentColor: "#2563eb" }}
                      />
                    </label>
                  </div>
                )}

              </div>
            </div>
          </div>

          <audio
            key={activeSceneObj?.id || "scene-voice-scene-empty"}
            ref={sceneVoiceoverAudioRef}
            src={activeSceneObj?.voiceoverUrl || ""}
            preload="auto"
            style={{ display: "none" }}
          />

          <audio
            key={globalMusicUrl || "global-music-empty"}
            ref={projectMusicAudioRef}
            src={globalMusicUrl || ""}
            preload="auto"
            loop
            style={{ display: "none" }}
          />

          {globalMusicName ? (
            <div style={{ marginTop: 8, fontSize: 12, opacity: 0.8 }}>
            </div>
          ) : null}

          {canvasErr ? <div className="canvasError">{canvasErr}</div> : null}
        </div>
      </div>

      <TimelinePanel
        scenes={scenes}
        activeScene={activeScene}
        setActiveScene={(id) => { pauseAllPlayback(); try { if (projectMusicAudioRef.current) projectMusicAudioRef.current.currentTime = sceneStartTimes[id] ?? 0; } catch {}; setActiveScene(id); }}
        globalMusicUrl={globalMusicUrl}
        globalMusicName={globalMusicName}
        musicVolume={musicVolume}
        voiceoverVolume={voiceoverVolume}
        playbackProgress={reelProgress}
        totalDuration={reelTotalDuration}
        onSeek={seekReel}
        isPlaying={isPlaying}
        sceneStartTimes={sceneStartTimes}
        onDuplicate={duplicateScene}
        onDelete={deleteScene}
        onMoveScene={moveScene}
        updateScene={(sceneId, updates) => updateScenes(scenes.map(s => s.id === sceneId ? { ...s, ...updates } : s))}
      />

      {/* <SceneStrip
        scenes={scenes}
        activeScene={activeScene}
        setActiveScene={(id) => {
          pauseAllPlayback();
          setActiveScene(id);
        }}
        onDuplicate={duplicateScene}
        onDelete={deleteScene}
        onTransitionChange={changeTransition}
        onMoveScene={moveScene}
      /> */}

      <ModalPrompt
        open={promptOpen}
        title={promptTitle}
        label={promptLabel}
        defaultValue={promptDefault}
        onCancel={() => {
          setPromptOpen(false);
          if (promptResolveRef.current) {
            promptResolveRef.current(null);
            promptResolveRef.current = null;
          }
        }}
        onConfirm={(value) => {
          setPromptOpen(false);
          if (promptResolveRef.current) {
            promptResolveRef.current(value);
            promptResolveRef.current = null;
          }
        }}
      />

      {ytModalOpen && (
        <YouTubePublishModal
          token={ytToken}
          videoUrl={reelVideoUrl}
          reelId={reelId}
          onClose={() => setYtModalOpen(false)}
        />
      )}

      {shareModalUrl && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 9999,
            background: "rgba(0,0,0,0.75)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "20px",
          }}
          onClick={e => e.target === e.currentTarget && setShareModalUrl(null)}
        >
          <div style={{
            background: "#161616",
            border: "1px solid #2a2a2a",
            borderRadius: "16px",
            width: "100%", maxWidth: "480px",
            display: "flex", flexDirection: "column",
            overflow: "hidden",
          }}>
            <div style={{
              display: "flex", alignItems: "center", gap: "10px",
              padding: "16px 20px",
              borderBottom: "1px solid #222",
              fontWeight: 700, fontSize: "16px", color: "#fff",
            }}>
              <span>✅ Link copied to clipboard!</span>
              <button
                onClick={() => setShareModalUrl(null)}
                style={{
                  marginLeft: "auto", background: "none", border: "none",
                  color: "#666", cursor: "pointer", fontSize: "18px", lineHeight: 1,
                }}
              >✕</button>
            </div>
            <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "12px" }}>
              <p style={{ color: "#aaa", fontSize: "13px", margin: 0 }}>
                Your share link is ready. It has been copied to your clipboard automatically.
              </p>
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <input
                  readOnly
                  value={shareModalUrl}
                  onClick={e => e.target.select()}
                  style={{
                    flex: 1,
                    background: "#1e1e1e", border: "1px solid #2a2a2a",
                    borderRadius: "8px", padding: "10px 12px",
                    color: "#fff", fontSize: "13px", outline: "none",
                    fontFamily: "monospace",
                  }}
                />
                <button
                  onClick={() => navigator.clipboard.writeText(shareModalUrl)}
                  style={{
                    background: "#2a2a2a", border: "1px solid #3a3a3a",
                    borderRadius: "8px", padding: "10px 14px",
                    color: "#fff", cursor: "pointer", fontSize: "13px",
                    whiteSpace: "nowrap",
                  }}
                >Copy</button>
              </div>
              <button
                onClick={() => setShareModalUrl(null)}
                style={{
                  background: "none", border: "1px solid #333",
                  borderRadius: "8px", padding: "10px",
                  color: "#aaa", cursor: "pointer", fontSize: "14px",
                  marginTop: "4px",
                }}
              >Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}