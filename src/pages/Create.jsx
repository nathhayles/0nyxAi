import { useState, useMemo, useEffect, useCallback } from "react";
import { Navigate, Link, useNavigate } from "react-router-dom";
import HelpTooltip from "../components/HelpTooltip.jsx";
import { generateStoryboardFromScript } from "../lib/createStoryboard";
import { supabase } from "../supabaseClient.js";
import BrandSelector from "../components/BrandSelector.jsx";
import TemplateSelectorPill from "../components/TemplateSelectorPill.jsx";
import ThemeSelectorPill from "../components/ThemeSelectorPill.jsx";
import { TEMPLATES } from "../data/templates.js";
import { useSpeechInput } from "../hooks/useSpeechInput.js";
import { useCredits } from "../state/CreditsContext.jsx";

const AUTOSAVE_KEY = "onyx_editor_autosave_v2";

// Kling's cost is duration-based now (backend/routes/kling.js getSceneCost),
// not a flat number — `credits` here is the conservative upper bound (10s
// tier) used for client-side "do you have enough credits" pre-flight checks
// only; `creditsLabel` is what's actually shown to the user, since a single
// flat number would misrepresent the real per-scene cost either direction.
const VIDEO_MODEL_OPTIONS = [
  { id: "wan-2.5",       label: "Wan 2.5",        description: "Fast & affordable",          credits: 18  },
  { id: "kling-2.6-pro", label: "Kling 3 Pro",    description: "Balanced quality (default)", credits: 149, creditsLabel: "~75-150 credits/scene, final cost based on actual scene length" },
  { id: "veo-3",         label: "Veo 3",           description: "Highest quality (Google)",   credits: 140 },
  { id: "seedance-1-pro",label: "Seedance 1 Pro",  description: "Cinematic motion (ByteDance)", credits: 36 },
  { id: "vidu-q3-pro",   label: "Vidu Q3 Pro",    description: "Budget quality (Vidu)",      credits: 20  },
];

const THEMES = [
  { value: "cinematic", label: "Cinematic" },
  { value: "luxury", label: "Luxury" },
  { value: "dark", label: "Dark & Moody" },
  { value: "motivational", label: "Motivational" },
  { value: "documentary", label: "Documentary" },
  { value: "business", label: "Business" },
  { value: "viral", label: "Viral Reels" },
  { value: "minimal", label: "Minimal" },
  { value: "travel", label: "Travel" },
  { value: "realestate", label: "Real Estate" }
];

function normalizeGeneratedScene(scene, index) {
  const mediaUrl = scene?.mediaUrl || scene?.url || null;
  const mediaType = scene?.mediaType || (typeof mediaUrl === "string" && /\.(mp4|webm|mov|m4v|ogg)(\?|#|$)/i.test(mediaUrl) ? "video" : "image");

  return {
    ...scene,
    id: scene?.id ?? index + 1,
    narration: scene?.narration || "",
    action: scene?.visual_direction || scene?.action || "",
    mode: scene?.mode || "ai",
    savedAt: scene?.savedAt || null,
    generatedAt: scene?.generatedAt || new Date().toISOString(),
    isAiGenerated: !!scene?.isAiGenerated,
    url: mediaUrl,
    mediaUrl,
    mediaType,
    thumbnail: scene?.thumbnail || scene?.stockThumb || mediaUrl || null,
    transitionToNext: scene?.transitionToNext || "cut",
    voiceoverUrl: scene?.voiceoverUrl || scene?.voiceover || null,
    musicUrl: scene?.musicUrl || null,
    stockBaseQuery: scene?.stockBaseQuery || "",
    stockQuery: scene?.stockQuery || scene?.visual_prompt || "",
    stockVariation: scene?.stockVariation || scene?.stockQuery || scene?.visual_prompt || "",
    stockSource: scene?.stockSource || (scene?.visual_type === "stock" ? "stock" : ""),
    stockAssetId: scene?.stockAssetId || null,
    stockThumb: scene?.stockThumb || scene?.thumbnail || mediaUrl || null,
    duration: scene?.duration || 5,
  };
}

function isMobileDevice() {
  return /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(navigator.userAgent) || window.innerWidth < 768;
}

export default function CreatePage() {
  const navigate = useNavigate();

  // Auth — must be declared before any conditional returns
  const [session, setSession] = useState(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(() => typeof window !== "undefined" && window.innerWidth < 768);

  // Credits from shared context
  const { balance: credits, refreshCredits } = useCredits();

  // Form state
  const [script, setScript] = useState("");
  const [theme, setTheme] = useState("cinematic");
  const [mode, setMode] = useState("standard");
  const [ratio, setRatio] = useState("16:9");
  const [selectedTemplateId, setSelectedTemplateId] = useState(null);
  const [selectedTheme, setSelectedTheme] = useState(null);
  const [brand, setBrand] = useState("");
  const [contentMode, setContentMode] = useState("cinematic"); // "cinematic" | "marketing" — visual-direction style, see backend/routes/analyse.js CONTENT_MODE_COPY
  const [characterLock, setCharacterLock] = useState(false);
  const [styleRefUrl, setStyleRefUrl] = useState("");
  const [motionRefUrl, setMotionRefUrl] = useState("");
  const [videoModel, setVideoModel] = useState("kling-2.6-pro");

  const [loading, setLoading] = useState(false);
  const [progressStep, setProgressStep] = useState("Idle");
  const [progressPercent, setProgressPercent] = useState(0);

  const [error, setError] = useState("");

  const onSpeechTranscript = useCallback((text) => {
    setScript(prev => prev ? prev + " " + text : text);
  }, []);
  const { listening: micListening, supported: micSupported, toggle: micToggle } = useSpeechInput(onSpeechTranscript);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [pipelineId, setPipelineId] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null);
      setSessionLoading(false);
    });
  }, []);

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  function handleTemplateChange(id) {
    setSelectedTemplateId(id);
    if (id) {
      const tpl = TEMPLATES.find(t => t.id === id);
      if (tpl) setRatio(tpl.aspectRatio);
    }
  }

  const selectedTemplate = TEMPLATES.find(t => t.id === selectedTemplateId) || null;

  const wordCount = script.trim() ? script.trim().split(/\s+/).length : 0;
  const estimatedScenes = Math.max(1, Math.ceil(wordCount / 22));
  const selectedModelOption = VIDEO_MODEL_OPTIONS.find(m => m.id === videoModel) || VIDEO_MODEL_OPTIONS[1];
  const estimatedCredits = mode === "ai" ? estimatedScenes * selectedModelOption.credits : 0;

  // Only block if credits have loaded and are genuinely insufficient
  const insufficientCredits = mode === "ai" && credits !== null && estimatedCredits > credits;

  const canGenerate = useMemo(() => {
    if (!script.trim()) return false;
    if (loading) return false;
    if (insufficientCredits) return false;
    return true;
  }, [script, loading, insufficientCredits]);

  // Conditional returns come after all hooks
  if (sessionLoading) return null;
  if (!session) return <Navigate to="/login" />;

  async function handleGenerate() {
    if (!script.trim()) return;

    if (insufficientCredits) {
      setShowUpgradeModal(true);
      return;
    }

    setLoading(true);
    setError("");
    setProgressStep("Preparing script");
    setProgressPercent(0);

    try {
      let scenes;

      if (mode === "standard") {
        const orientation = ratio === "9:16" ? "portrait" : "landscape";
        const effectiveTheme = selectedTemplate ? selectedTemplate.id : theme;
        scenes = await generateStoryboardFromScript({
          script,
          theme: effectiveTheme,
          brand,
          orientation,
          promptPrefix: selectedTemplate?.promptPrefix || null,
          token: session?.access_token,
          onProgress: ({ step, percent }) => {
            setProgressStep(step || "Generating storyboard");
            setProgressPercent(typeof percent === "number" ? percent : 0);
          }
        });
      } else {
        setProgressStep("Starting AI video generation...");
        setProgressPercent(10);
        const token = session?.access_token;

        // 1. Fetch available voices
        const voicesRes = await fetch("/api/tts/voices?provider=elevenlabs", {
          headers: { Authorization: `Bearer ${token}` }
        });
        const voicesData = voicesRes.ok ? await voicesRes.json() : { voices: [] };
        const voices = voicesData.voices || [];

        // 2. Analyse script for style + speakers
        setProgressStep("Analysing script...");
        setProgressPercent(8);
        const analyseRes = await fetch("/api/analyse", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ script, voices, ratio, content_mode: contentMode }),
        });
        const analysis = analyseRes.ok ? await analyseRes.json() : null;

        const effectiveTheme = selectedTemplate
          ? `${selectedTemplate.id} ${selectedTemplate.promptPrefix}`
          : theme;
        const klingBody = { prompt: script, theme: effectiveTheme, analysis, aspect_ratio: ratio, model: videoModel, brand_id: brand || null, content_mode: contentMode };
        if (characterLock) klingBody.character_lock = true;
        if (styleRefUrl.trim()) klingBody.style_ref_url = styleRefUrl.trim();
        if (motionRefUrl.trim()) klingBody.motion_ref_url = motionRefUrl.trim();

        const res = await fetch("/api/kling/", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: JSON.stringify(klingBody)
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || `Pipeline failed (${res.status}): ${JSON.stringify(data)}`);
        const { jobs, pipelineId: pid } = data;
        setPipelineId(pid ?? null);
        if (!jobs?.length) throw new Error("No scenes started");
        setProgressStep("Generating AI videos... this may take 2-3 minutes");
        setProgressPercent(20);
        const results = new Array(jobs.length).fill(null);
        const pending = new Set(jobs.map((_, i) => i));
        const startTime = Date.now();
        // 20 min ceiling, matching EditorV2.jsx's regenerateScene poll. Backend
        // falPoll alone allows up to 10 min for Kling generation (routes/kling.js),
        // plus up to 5 min more for an optional Sync.so lip-sync pass
        // (lib/syncLipSync.js maxWaitMs), plus download/thumbnail/ffmpeg overhead.
        // The previous 10-minute cap only covered the Kling-generation ceiling and
        // left no room for lip-sync, so scenes with a voiceover could silently
        // time out on the client while still completing normally server-side.
        const POLL_DEADLINE_MS = 1200000;
        // Above the observed field median (~216s) for a same-model scene with no
        // lip-sync -- once we're past this, the remaining scenes are plausibly in
        // (or waiting on) the slower lip-sync path, so say so instead of leaving
        // the progress text looking stuck.
        const SLOW_SCENE_WARNING_MS = 180000;
        while (pending.size > 0 && Date.now() - startTime < POLL_DEADLINE_MS) {
          await new Promise(r => setTimeout(r, 5000));
          const elapsed = Date.now() - startTime;
          setProgressPercent(Math.min(90, 20 + Math.round(((jobs.length - pending.size) / jobs.length) * 70)));
          setProgressStep(
            elapsed > SLOW_SCENE_WARNING_MS
              ? `Generating AI videos... ${jobs.length - pending.size}/${jobs.length} scenes ready (some scenes are taking longer than usual — still working)`
              : `Generating AI videos... ${jobs.length - pending.size}/${jobs.length} scenes ready`
          );
          await Promise.all([...pending].map(async (i) => {
            const job = jobs[i];
            const { data: { session: pollSession } } = await supabase.auth.getSession();
            const pollToken = pollSession?.access_token || token;
            const r = await fetch(`/api/kling/status/${job.jobId}`, { headers: pollToken ? { Authorization: `Bearer ${pollToken}` } : {} });
            const d = await r.json();
            if (d.status === "completed" && d.videoUrl) {
              results[i] = { id: i+1, narration: job.narration, action: job.visual_direction || job.visual_prompt || job.narration, mediaUrl: d.videoUrl, thumbnail: d.thumbnailUrl || null, mediaType: "video", isAiGenerated: true, generatedAt: new Date().toISOString(), mode: "ai", needsBleedFade: !!d.needsBleedFade };
              pending.delete(i);
            } else if (d.status === "failed") {
              results[i] = { id: i+1, narration: job.narration, action: job.visual_direction || job.visual_prompt || job.narration, mediaType: "video", isAiGenerated: true, mode: "ai" };
              pending.delete(i);
            }
          }));
        }
        // Anything still pending at the deadline is very likely still running
        // server-side (pollAndStore has its own, longer-lived ceiling and never
        // learns the client gave up) -- keep it in the storyboard as a resumable
        // placeholder rather than silently dropping it via .filter(Boolean),
        // which made it look like that scene was never generated at all.
        for (const i of pending) {
          const job = jobs[i];
          results[i] = { id: i+1, narration: job.narration, action: job.visual_direction || job.visual_prompt || job.narration, mediaType: "video", isAiGenerated: true, mode: "ai", generationPending: true, jobId: job.jobId };
        }
        scenes = results.filter(Boolean);
      }

      if (!Array.isArray(scenes) || !scenes.length) {
        throw new Error("No scenes generated.");
      }

      if (mode === "ai") refreshCredits();

      const DEFAULT_VOICE = { voiceId: "alloy", voiceName: "Alloy", voiceProvider: "openai" };
      // Convert template colorGrade from CSS multiplier scale (1.0=neutral) to editor 0-100 scale (50=neutral)
      const tplColorGrade = selectedTemplate?.colorGrade ? {
        brightness: Math.round(selectedTemplate.colorGrade.brightness * 50),
        contrast:   Math.round(selectedTemplate.colorGrade.contrast   * 50),
        saturation: Math.round(selectedTemplate.colorGrade.saturation * 50),
      } : {};
      // Map template captionStyle keys to the scene field names EditorV2 expects
      const tplCaption = selectedTemplate?.captionStyle ? {
        caption_font:     selectedTemplate.captionStyle.fontFamily,
        caption_size:     selectedTemplate.captionStyle.fontSize,
        caption_color:    selectedTemplate.captionStyle.color,
        caption_bg_color: selectedTemplate.captionStyle.background,
        caption_position: selectedTemplate.captionStyle.position,
      } : {};
      const normalizedScenes = scenes.map((scene, i) => ({
        ...normalizeGeneratedScene(scene, i),
        ...DEFAULT_VOICE,
        ...(selectedTemplate ? { transitionToNext: selectedTemplate.transitionStyle } : {}),
        ...tplColorGrade,
        ...tplCaption,
      }));

      const snapshot = {
        title: await (async () => {
          // This whole call was previously wrapped in a single bare `catch(_) {}`
          // with no logging anywhere on the failure path -- every distinct
          // failure mode (missing/expired session token -> 401, trial expired
          // -> 403, OpenAI hiccup -> 500, a thrown network/parse error, or a
          // 200 with no title in the body) collapsed identically and silently
          // into "Untitled Reel", with zero way to tell which one actually
          // happened. Traced live 2026-07-20: real AI-generated reels going
          // back to at least 2026-07-05 all had non-empty scenes[0].action at
          // this point, ruling out empty-prompt as the cause -- the call
          // itself was failing. Logging now, not guessing at which failure
          // mode to silently work around.
          try {
            const { data: { session: ts } } = await supabase.auth.getSession();
            const firstPrompt = scenes[0]?.narration || scenes[0]?.action || scenes[0]?.visual_prompt || "";
            if (!firstPrompt.trim()) {
              console.warn("[Create/autoTitle] no narration/action/visual_prompt on scenes[0] -- falling back to Untitled Reel", scenes[0]);
              return "Untitled Reel";
            }
            if (!ts?.access_token) {
              console.warn("[Create/autoTitle] no access_token on current session -- /api/analyse/title will 401");
            }
            const tr = await fetch("/api/analyse/title", {
              method: "POST",
              headers: { "Content-Type": "application/json", ...(ts?.access_token ? { Authorization: `Bearer ${ts.access_token}` } : {}) },
              body: JSON.stringify({ prompt: firstPrompt }),
            });
            if (!tr.ok) {
              const errBody = await tr.text().catch(() => "<unreadable>");
              console.error(`[Create/autoTitle] /api/analyse/title returned ${tr.status}:`, errBody);
              return "Untitled Reel";
            }
            const td = await tr.json();
            if (td.title) return td.title;
            console.error("[Create/autoTitle] /api/analyse/title returned 200 with no title:", td);
          } catch (err) {
            console.error("[Create/autoTitle] threw while generating title:", err);
          }
          return "Untitled Reel";
        })(),
        ratio,
        pipelineId: pipelineId || null,
        scenes: normalizedScenes,
        activeScene: normalizedScenes[0]?.id ?? 1,
        activeMenu: "storyboard",
        visualsTab: "stock",
        audioTab: "stock",
        voiceoverVolume: 100,
        musicVolume: 60,
        globalMusicUrl: "",
        template: selectedTemplate || null,
        theme: selectedTheme || null,
        savedAt: new Date().toISOString()
      };

      localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(snapshot));
      if (isMobileDevice() && snapshot.pipelineId) {
        navigate(`/preview/${snapshot.pipelineId}`);
      } else {
        navigate(`/editor-v2`);
      }
    } catch (err) {
      setError(err?.message || "Failed to generate storyboard.");
      setProgressStep("Failed");
    } finally {
      setLoading(false);
    }
  }

  const displayCredits = credits === null ? "..." : credits;

  return (
    <div style={{ minHeight: "100vh", background: "var(--onyx-bg)", color: "var(--onyx-text)", padding: isMobile ? "16px" : "40px 24px", maxWidth: "100vw", overflowX: "hidden", boxSizing: "border-box" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <Link to="/dashboard" style={{ color: "#00d2ff" }}>
          ← Back to Projects
        </Link>

        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <h1 className="page-title">Create Reel</h1>
          <HelpTooltip topic="create" />
        </div>

        <p style={{ opacity: 0.8, marginBottom: 10 }}>
          Paste a script or story idea, configure settings, and generate your storyboard.
        </p>

        {/* Other creation tools */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 28 }}>
          <Link to="/video-to-reel" style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '12px 18px',
            borderRadius: 12, border: '1px solid rgba(77,208,255,0.4)',
            background: 'rgba(77,208,255,0.08)', textDecoration: 'none',
            color: '#7de0ff', fontWeight: 600, fontSize: 14,
          }}>
            <div>
              <div>Video to Reel</div>
              <div style={{ fontSize: 11, color: 'var(--onyx-text-faint)', fontWeight: 400 }}>Upload clips → edit in timeline</div>
            </div>
          </Link>
          <Link to="/url-to-video" style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '12px 18px',
            borderRadius: 12, border: '1px solid rgba(59,130,246,0.3)',
            background: 'rgba(59,130,246,0.06)', textDecoration: 'none',
            color: '#93c5fd', fontWeight: 600, fontSize: 14,
          }}>
            <div>
              <div>URL to Video</div>
              <div style={{ fontSize: 11, color: 'var(--onyx-text-faint)', fontWeight: 400 }}>Turn any link into a reel</div>
            </div>
          </Link>
          <Link to="/audio-to-video" style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '12px 18px',
            borderRadius: 12, border: '1px solid rgba(16,185,129,0.3)',
            background: 'rgba(16,185,129,0.06)', textDecoration: 'none',
            color: '#6ee7b7', fontWeight: 600, fontSize: 14,
          }}>
            <div>
              <div>Audio to Video</div>
              <div style={{ fontSize: 11, color: 'var(--onyx-text-faint)', fontWeight: 400 }}>Podcast / voiceover → reel</div>
            </div>
          </Link>
        </div>

        <div
          style={{
            marginBottom: 20,
            padding: 10,
            borderRadius: 8,
            background: "var(--onyx-bg-2)",
            border: "1px solid var(--onyx-hairline-strong)"
          }}
        >
          Credits Available:{" "}
          <b style={{ color: insufficientCredits ? "#ff5c5c" : "#00d2ff" }}>
            {displayCredits}
          </b>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "320px 1fr", gap: isMobile ? 20 : 32 }}>
          <div>
            <label style={{ display: "block", marginBottom: 10, fontWeight: 600 }}>Brand</label>

            <BrandSelector value={brand} onChange={(id) => setBrand(id)} />

            {mode === "ai" && (
            <>
            <label style={{ display: "block", marginBottom: 10, fontWeight: 600 }}>Visual theme</label>

            <select
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              style={{
                width: "100%",
                padding: 12,
                borderRadius: 12,
                border: "1px solid var(--onyx-hairline-strong)",
                background: "var(--onyx-bg-2)",
                color: "var(--onyx-text)",
                marginBottom: 20,
                maxWidth: "100%",
                boxSizing: "border-box"
              }}
            >
              {THEMES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
            </>
            )}

            <label style={{ display: "block", marginBottom: 10, fontWeight: 600 }}>Generation mode</label>

            <select
              value={mode}
              onChange={(e) => setMode(e.target.value)}
              style={{
                width: "100%",
                padding: 12,
                borderRadius: 12,
                border: "1px solid var(--onyx-hairline-strong)",
                background: "var(--onyx-bg-2)",
                color: "var(--onyx-text)",
                marginBottom: 20,
                maxWidth: "100%",
                boxSizing: "border-box"
              }}
            >
              <option value="standard">Standard Storyboard</option>
              <option value="ai">AI Video</option>
            </select>

            {mode === "ai" && (
            <>
            <label style={{ display: "block", marginBottom: 10, fontWeight: 600 }}>Content mode</label>

            <select
              value={contentMode}
              onChange={(e) => setContentMode(e.target.value)}
              style={{
                width: "100%",
                padding: 12,
                borderRadius: 12,
                border: "1px solid var(--onyx-hairline-strong)",
                background: "var(--onyx-bg-2)",
                color: "var(--onyx-text)",
                marginBottom: 8,
                maxWidth: "100%",
                boxSizing: "border-box"
              }}
            >
              <option value="cinematic">Cinematic — dramatic, story-driven visuals</option>
              {/* Marketing mode temporarily hidden 2026-07-10: shipped without a live
                  output-quality test. Re-enable only after that test passes.
                  <option value="marketing">Marketing — polished, commercial ad-style visuals</option> */}
            </select>
            <div style={{ fontSize: 11, color: "var(--onyx-text-faint)", marginBottom: 20 }}>
              Slower, story-paced scene count and dramatic camera direction, tuned for narrative content.
            </div>
            </>
            )}

            <label style={{ display: "block", marginBottom: 10, fontWeight: 600 }}>Aspect ratio</label>

            <select
              value={ratio}
              onChange={(e) => setRatio(e.target.value)}
              style={{
                width: "100%",
                padding: 12,
                borderRadius: 12,
                border: "1px solid var(--onyx-hairline-strong)",
                background: "var(--onyx-bg-2)",
                color: "var(--onyx-text)",
                marginBottom: 20,
                maxWidth: "100%",
                boxSizing: "border-box"
              }}
            >
              <option value="16:9">16:9 — Landscape (YouTube, Facebook)</option>
              <option value="9:16">9:16 — Portrait (Reels, TikTok, Shorts)</option>
              <option value="1:1">1:1 — Square (Instagram)</option>
            </select>

            {mode === "ai" && (
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: "block", marginBottom: 10, fontWeight: 600 }}>AI Options</label>

                {/* Model selector */}
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 6 }}>Video model</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {VIDEO_MODEL_OPTIONS.map(opt => (
                      <label key={opt.id} style={{
                        display: "flex", alignItems: "center", gap: 10,
                        cursor: opt.disabled ? "not-allowed" : "pointer",
                        padding: "9px 12px", borderRadius: 10,
                        background: "var(--onyx-bg-2)",
                        border: `1px solid ${videoModel === opt.id ? "rgba(0,210,255,0.5)" : "rgba(255,255,255,0.08)"}`,
                        opacity: opt.disabled ? 0.45 : 1,
                      }}>
                        <input
                          type="radio"
                          name="videoModel"
                          value={opt.id}
                          checked={videoModel === opt.id}
                          disabled={opt.disabled}
                          onChange={() => setVideoModel(opt.id)}
                          style={{ accentColor: "#00d2ff", cursor: opt.disabled ? "not-allowed" : "pointer" }}
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <span style={{ fontWeight: 600, fontSize: 13 }}>{opt.label}</span>
                          <span style={{ fontSize: 12, opacity: 0.55, marginLeft: 6 }}>{opt.description}</span>
                        </div>
                        <span style={{
                          fontSize: 12, fontWeight: 700,
                          color: videoModel === opt.id ? "#00d2ff" : "rgba(255,255,255,0.4)",
                          whiteSpace: "nowrap",
                        }}>{opt.disabled ? "" : (opt.creditsLabel || `${opt.credits} cr/scene`)}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Character Lock */}
                <label style={{
                  display: "flex", alignItems: "center", gap: 10, cursor: "pointer",
                  padding: "10px 14px", borderRadius: 10,
                  background: "var(--onyx-bg-2)", border: `1px solid ${characterLock ? "rgba(0,210,255,0.4)" : "rgba(255,255,255,0.08)"}`,
                  marginBottom: 10,
                }}>
                  <input
                    type="checkbox"
                    checked={characterLock}
                    onChange={(e) => setCharacterLock(e.target.checked)}
                    style={{ width: 16, height: 16, accentColor: "#00d2ff", cursor: "pointer" }}
                  />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>Character Lock</div>
                    <div style={{ fontSize: 12, opacity: 0.6, marginTop: 2 }}>
                      Extracts a reference frame from scene 1 and pins the character across all scenes
                    </div>
                  </div>
                </label>

                {/* Style Reference URL */}
                <div style={{
                  padding: "10px 14px", borderRadius: 10,
                  background: "var(--onyx-bg-2)", border: `1px solid ${styleRefUrl.trim() ? "rgba(0,210,255,0.4)" : "rgba(255,255,255,0.08)"}`,
                  marginBottom: 10,
                }}>
                  <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 6 }}>Style Reference</div>
                  <div style={{ fontSize: 12, opacity: 0.6, marginBottom: 8 }}>
                    Paste a URL to an image — applied as a visual style guide across all scenes
                  </div>
                  <input
                    type="url"
                    value={styleRefUrl}
                    onChange={(e) => setStyleRefUrl(e.target.value)}
                    placeholder="https://example.com/style-frame.jpg"
                    style={{
                      width: "100%", padding: "8px 10px", borderRadius: 8,
                      border: "1px solid rgba(255,255,255,0.12)",
                      background: "var(--onyx-bg)", color: "var(--onyx-text)", fontSize: 13,
                      boxSizing: "border-box",
                    }}
                  />
                </div>

                {/* Motion Reference URL */}
                <div style={{
                  padding: "10px 14px", borderRadius: 10,
                  background: "var(--onyx-bg-2)", border: `1px solid ${motionRefUrl.trim() ? "rgba(0,210,255,0.4)" : "rgba(255,255,255,0.08)"}`,
                }}>
                  <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 6 }}>Motion Reference</div>
                  <div style={{ fontSize: 12, opacity: 0.6, marginBottom: 8 }}>
                    Paste a URL to a video — used to transfer motion style across all scenes
                  </div>
                  <input
                    type="url"
                    value={motionRefUrl}
                    onChange={(e) => setMotionRefUrl(e.target.value)}
                    placeholder="https://example.com/motion-ref.mp4"
                    style={{
                      width: "100%", padding: "8px 10px", borderRadius: 8,
                      border: "1px solid rgba(255,255,255,0.12)",
                      background: "var(--onyx-bg)", color: "var(--onyx-text)", fontSize: 13,
                      boxSizing: "border-box",
                    }}
                  />
                </div>
              </div>
            )}

            <div
              style={{
                padding: 16,
                borderRadius: 12,
                background: "var(--onyx-bg-2)",
                border: "1px solid var(--onyx-hairline-strong)"
              }}
            >
              <div style={{ fontWeight: 600, marginBottom: 10, color: "var(--onyx-text)" }}>Estimator</div>
              <div style={{ color: "var(--onyx-text-faint)" }}>Words: {wordCount}</div>
              <div style={{ color: "var(--onyx-text-faint)" }}>Scenes: {estimatedScenes}</div>
              {mode === "ai" && <div style={{ color: "var(--onyx-text-faint)" }}>{selectedModelOption.creditsLabel ? `${selectedModelOption.creditsLabel} (${estimatedScenes} scenes)` : `${selectedModelOption.credits} credits × ${estimatedScenes} scenes`}</div>}
              <div style={{ color: insufficientCredits ? "#ff5c5c" : "var(--onyx-text)" }}>
                AI Credits Needed: {estimatedCredits}
              </div>
            </div>
          </div>

          <div>
            <TemplateSelectorPill value={selectedTemplateId} onChange={handleTemplateChange} />
            <ThemeSelectorPill selectedTheme={selectedTheme} onSelect={setSelectedTheme} />

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <label style={{ fontWeight: 600 }}>Script or story idea</label>
              {micSupported && (
                <button
                  type="button"
                  onClick={micToggle}
                  title={micListening ? "Stop recording" : "Dictate script"}
                  style={{
                    display: "flex", alignItems: "center", gap: 6,
                    padding: "6px 12px", borderRadius: 20,
                    border: `1px solid ${micListening ? "#ef4444" : "rgba(255,255,255,0.15)"}`,
                    background: micListening ? "rgba(239,68,68,0.12)" : "var(--onyx-surface)",
                    color: micListening ? "#ef4444" : "var(--onyx-text-dim)",
                    cursor: "pointer", fontSize: 12, fontWeight: 600,
                    transition: "all 0.2s",
                  }}
                >
                  <span style={{
                    display: "inline-block", width: 8, height: 8, borderRadius: "50%",
                    background: micListening ? "#ef4444" : "var(--onyx-text-faint)",
                    animation: micListening ? "pulse 1s infinite" : "none",
                  }} />
                  {micListening ? "Stop" : "Dictate"}
                </button>
              )}
            </div>
            {micListening && (
              <div style={{ marginBottom: 8, fontSize: 12, color: "#ef4444", display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#ef4444", display: "inline-block", animation: "pulse 1s infinite" }} />
                Listening — speak your script…
              </div>
            )}

            <textarea
              value={script}
              onChange={(e) => setScript(e.target.value)}
              placeholder="Paste your script here, or click Dictate to speak it…"
              rows={16}
              style={{
                width: "100%",
                borderRadius: 16,
                border: "1px solid var(--onyx-hairline-strong)",
                background: "var(--onyx-bg-2)",
                color: "var(--onyx-text)",
                padding: 18,
                resize: "vertical",
                fontSize: 15,
                lineHeight: 1.6,
                marginBottom: 20
              }}
            />

            {error ? (
              <div style={{ color: "#ff5c5c", marginBottom: 12 }}>{error}</div>
            ) : null}

            {loading ? (
              <div
                style={{
                  marginBottom: 20,
                  padding: 16,
                  borderRadius: 12,
                  background: "var(--onyx-bg-2)",
                  border: "1px solid rgba(255,255,255,0.08)"
                }}
              >
                <div style={{ fontWeight: 600, marginBottom: 8 }}>{progressStep}</div>
                <div
                  style={{
                    width: "100%",
                    height: 10,
                    borderRadius: 999,
                    background: "rgba(255,255,255,0.08)",
                    overflow: "hidden"
                  }}
                >
                  <div
                    style={{
                      width: `${progressPercent}%`,
                      height: "100%",
                      background: "linear-gradient(90deg, #00d2ff, #3b82f6)"
                    }}
                  />
                </div>
                <div style={{ color: "var(--onyx-text-dim)", opacity: 1, marginTop: 8 }}>{progressPercent}%</div>
                {mode === "ai" && loading && (
                  <div style={{fontSize:12,opacity:0.6,marginTop:8,lineHeight:1.6}}>
                    AI video generation takes 2–4 minutes per scene. Please keep this tab open. Your reel will open automatically when ready.
                  </div>
                )}
              </div>
            ) : null}

            <button
              onClick={handleGenerate}
              disabled={!canGenerate}
              className="btn-teal"
              style={{ width: "100%" }}
            >
              {loading ? "Generating..." : "Generate Reel"}
            </button>
          </div>
        </div>

        {showUpgradeModal ? (
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.7)",
              display: "grid",
              placeItems: "center",
              padding: 20
            }}
          >
            <div
              style={{
                width: "100%",
                maxWidth: 420,
                background: "var(--onyx-bg-2)",
                borderRadius: 18,
                padding: 24,
                border: "1px solid rgba(255,255,255,0.08)"
              }}
            >
              <h3 style={{ marginTop: 0 }}>Not enough credits</h3>
              <p style={{ opacity: 0.8 }}>
                Your AI video request needs {estimatedCredits} credits, but only {displayCredits} are available.
              </p>
              <div style={{ display: "flex", gap: 12, marginTop: 18 }}>
                <button
                  onClick={() => setShowUpgradeModal(false)}
                  style={{
                    flex: 1,
                    padding: 12,
                    borderRadius: 12,
                    border: "1px solid rgba(255,255,255,0.12)",
                    background: "transparent",
                    color: "var(--onyx-text)"
                  }}
                >
                  Close
                </button>
                <Link
                  to="/billing"
                  style={{
                    flex: 1,
                    textAlign: "center",
                    textDecoration: "none",
                    padding: 12,
                    borderRadius: 12,
                    background: "linear-gradient(90deg, #00d2ff, #3b82f6)",
                    color: "var(--onyx-text)",
                    fontWeight: 700
                  }}
                >
                  Upgrade
                </Link>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
