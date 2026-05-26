import { useState, useMemo, useEffect } from "react";
import { Navigate, Link, useNavigate } from "react-router-dom";
import { generateStoryboardFromScript } from "../lib/createStoryboard";
import { supabase } from "../supabaseClient.js";
import BrandSelector from "../components/BrandSelector.jsx";
import TemplateSelectorPill from "../components/TemplateSelectorPill.jsx";
import ThemeSelectorPill from "../components/ThemeSelectorPill.jsx";
import { TEMPLATES } from "../data/templates.js";

const AUTOSAVE_KEY = "onyx_editor_autosave_v2";

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
    action: scene?.action || "",
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

export default function CreatePage() {
  const navigate = useNavigate();

  // Auth — must be declared before any conditional returns
  const [session, setSession] = useState(null);
  const [sessionLoading, setSessionLoading] = useState(true);

  // Credits from API
  const [credits, setCredits] = useState(null);

  // Form state
  const [script, setScript] = useState("");
  const [theme, setTheme] = useState("cinematic");
  const [mode, setMode] = useState("standard");
  const [ratio, setRatio] = useState("16:9");
  const [selectedTemplateId, setSelectedTemplateId] = useState(null);
  const [selectedTheme, setSelectedTheme] = useState(null);
  const [brand, setBrand] = useState("");
  const [characterLock, setCharacterLock] = useState(false);
  const [styleRefUrl, setStyleRefUrl] = useState("");
  const [motionRefUrl, setMotionRefUrl] = useState("");

  const [loading, setLoading] = useState(false);
  const [progressStep, setProgressStep] = useState("Idle");
  const [progressPercent, setProgressPercent] = useState(0);

  const [error, setError] = useState("");
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [pipelineId, setPipelineId] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null);
      setSessionLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!session) return;

    fetch("/api/credits/balance", {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
      .then((r) => r.json())
      .then((data) => setCredits(data?.balance ?? data?.credits ?? 0))
      .catch(() => setCredits(0));
  }, [session]);

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
  const estimatedCredits = mode === "ai" ? estimatedScenes * 5 : 0;

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
          body: JSON.stringify({ script, voices }),
        });
        const analysis = analyseRes.ok ? await analyseRes.json() : null;

        const effectiveTheme = selectedTemplate
          ? `${selectedTemplate.id} ${selectedTemplate.promptPrefix}`
          : theme;
        const klingBody = { prompt: script, theme: effectiveTheme, analysis, aspect_ratio: ratio };
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
        while (pending.size > 0 && Date.now() - startTime < 600000) {
          await new Promise(r => setTimeout(r, 5000));
          setProgressPercent(Math.min(90, 20 + Math.round(((jobs.length - pending.size) / jobs.length) * 70)));
          setProgressStep(`Generating AI videos... ${jobs.length - pending.size}/${jobs.length} scenes ready`);
          await Promise.all([...pending].map(async (i) => {
            const job = jobs[i];
            const { data: { session: pollSession } } = await supabase.auth.getSession();
            const pollToken = pollSession?.access_token || token;
            const r = await fetch(`/api/kling/status/${job.jobId}`, { headers: pollToken ? { Authorization: `Bearer ${pollToken}` } : {} });
            const d = await r.json();
            if (d.status === "completed" && d.videoUrl) {
              results[i] = { id: i+1, narration: job.narration, action: job.visual_prompt || job.narration, mediaUrl: d.videoUrl, thumbnail: d.thumbnailUrl || null, mediaType: "video", isAiGenerated: true, generatedAt: new Date().toISOString(), mode: "ai" };
              pending.delete(i);
            } else if (d.status === "failed") {
              results[i] = { id: i+1, narration: job.narration, action: job.visual_prompt || job.narration, mediaType: "video", isAiGenerated: true, mode: "ai" };
              pending.delete(i);
            }
          }));
        }
        scenes = results.filter(Boolean);
      }

      if (!Array.isArray(scenes) || !scenes.length) {
        throw new Error("No scenes generated.");
      }

      const DEFAULT_VOICE = { voiceId: "alloy", voiceName: "Alloy", voiceProvider: "openai" };
      const normalizedScenes = scenes.map((scene, i) => ({
        ...normalizeGeneratedScene(scene, i),
        ...DEFAULT_VOICE,
        ...(selectedTemplate ? { transitionToNext: selectedTemplate.transitionStyle } : {}),
      }));

      const snapshot = {
        title: await (async () => {
          try {
            const { data: { session: ts } } = await supabase.auth.getSession();
            const firstPrompt = scenes[0]?.narration || scenes[0]?.action || scenes[0]?.visual_prompt || "";
            if (!firstPrompt.trim()) return "Untitled Reel";
            const tr = await fetch("/api/analyse/title", {
              method: "POST",
              headers: { "Content-Type": "application/json", ...(ts?.access_token ? { Authorization: `Bearer ${ts.access_token}` } : {}) },
              body: JSON.stringify({ prompt: firstPrompt }),
            });
            if (tr.ok) { const td = await tr.json(); if (td.title) return td.title; }
          } catch(_) {}
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
      navigate("/editor");
    } catch (err) {
      setError(err?.message || "Failed to generate storyboard.");
      setProgressStep("Failed");
    } finally {
      setLoading(false);
    }
  }

  const displayCredits = credits === null ? "..." : credits;

  return (
    <div style={{ minHeight: "100vh", background: "#06070a", color: "#fff", padding: "40px 24px" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <Link to="/dashboard" style={{ color: "#00d2ff" }}>
          ← Back to Projects
        </Link>

        <h1 style={{ fontSize: 36, marginBottom: 10 }}>Create Reel</h1>

        <p style={{ opacity: 0.8, marginBottom: 10 }}>
          Paste a script or story idea, configure settings, and generate your storyboard.
        </p>

        {/* Other creation tools */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 28 }}>
          <Link to="/video-to-reel" style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '12px 18px',
            borderRadius: 12, border: '1px solid rgba(124,58,237,0.4)',
            background: 'rgba(124,58,237,0.08)', textDecoration: 'none',
            color: '#c4b5fd', fontWeight: 600, fontSize: 14,
          }}>
            <span style={{ fontSize: 22 }}>🎬</span>
            <div>
              <div>Video to Reel</div>
              <div style={{ fontSize: 11, color: '#6d5da8', fontWeight: 400 }}>Upload clips → edit in timeline</div>
            </div>
          </Link>
          <Link to="/url-to-video" style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '12px 18px',
            borderRadius: 12, border: '1px solid rgba(59,130,246,0.3)',
            background: 'rgba(59,130,246,0.06)', textDecoration: 'none',
            color: '#93c5fd', fontWeight: 600, fontSize: 14,
          }}>
            <span style={{ fontSize: 22 }}>🔗</span>
            <div>
              <div>URL to Video</div>
              <div style={{ fontSize: 11, color: '#4a6fa5', fontWeight: 400 }}>Turn any link into a reel</div>
            </div>
          </Link>
          <Link to="/audio-to-video" style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '12px 18px',
            borderRadius: 12, border: '1px solid rgba(16,185,129,0.3)',
            background: 'rgba(16,185,129,0.06)', textDecoration: 'none',
            color: '#6ee7b7', fontWeight: 600, fontSize: 14,
          }}>
            <span style={{ fontSize: 22 }}>🎙️</span>
            <div>
              <div>Audio to Video</div>
              <div style={{ fontSize: 11, color: '#3d7a5e', fontWeight: 400 }}>Podcast / voiceover → reel</div>
            </div>
          </Link>
        </div>

        <div
          style={{
            marginBottom: 20,
            padding: 10,
            borderRadius: 8,
            background: "#0c1016",
            border: "1px solid rgba(255,255,255,0.08)"
          }}
        >
          Credits Available:{" "}
          <b style={{ color: insufficientCredits ? "#ff5c5c" : "#00d2ff" }}>
            {displayCredits}
          </b>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 32 }}>
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
                border: "1px solid rgba(255,255,255,0.12)",
                background: "#0c1016",
                color: "#fff",
                marginBottom: 20
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
                border: "1px solid rgba(255,255,255,0.12)",
                background: "#0c1016",
                color: "#fff",
                marginBottom: 20
              }}
            >
              <option value="standard">Standard Storyboard</option>
              <option value="ai">AI Video</option>
            </select>

            <label style={{ display: "block", marginBottom: 10, fontWeight: 600 }}>Aspect ratio</label>

            <select
              value={ratio}
              onChange={(e) => setRatio(e.target.value)}
              style={{
                width: "100%",
                padding: 12,
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "#0c1016",
                color: "#fff",
                marginBottom: 20
              }}
            >
              <option value="16:9">16:9 — Landscape (YouTube, Facebook)</option>
              <option value="9:16">9:16 — Portrait (Reels, TikTok, Shorts)</option>
              <option value="1:1">1:1 — Square (Instagram)</option>
            </select>

            {mode === "ai" && (
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: "block", marginBottom: 10, fontWeight: 600 }}>AI Options</label>

                {/* Character Lock */}
                <label style={{
                  display: "flex", alignItems: "center", gap: 10, cursor: "pointer",
                  padding: "10px 14px", borderRadius: 10,
                  background: "#0c1016", border: `1px solid ${characterLock ? "rgba(0,210,255,0.4)" : "rgba(255,255,255,0.08)"}`,
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
                  background: "#0c1016", border: `1px solid ${styleRefUrl.trim() ? "rgba(0,210,255,0.4)" : "rgba(255,255,255,0.08)"}`,
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
                      background: "#06070a", color: "#fff", fontSize: 13,
                      boxSizing: "border-box",
                    }}
                  />
                </div>

                {/* Motion Reference URL */}
                <div style={{
                  padding: "10px 14px", borderRadius: 10,
                  background: "#0c1016", border: `1px solid ${motionRefUrl.trim() ? "rgba(0,210,255,0.4)" : "rgba(255,255,255,0.08)"}`,
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
                      background: "#06070a", color: "#fff", fontSize: 13,
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
                background: "#0c1016",
                border: "1px solid rgba(255,255,255,0.08)"
              }}
            >
              <div style={{ fontWeight: 600, marginBottom: 10 }}>Estimator</div>
              <div style={{ opacity: 0.8 }}>Words: {wordCount}</div>
              <div style={{ opacity: 0.8 }}>Scenes: {estimatedScenes}</div>
              <div style={{ color: insufficientCredits ? "#ff5c5c" : "rgba(255,255,255,0.8)" }}>
                AI Credits Needed: {estimatedCredits}
              </div>
            </div>
          </div>

          <div>
            <TemplateSelectorPill value={selectedTemplateId} onChange={handleTemplateChange} />
            <ThemeSelectorPill selectedTheme={selectedTheme} onSelect={setSelectedTheme} />

            <label style={{ display: "block", marginBottom: 10, fontWeight: 600 }}>Script or story idea</label>

            <textarea
              value={script}
              onChange={(e) => setScript(e.target.value)}
              placeholder="Paste your script here..."
              rows={16}
              style={{
                width: "100%",
                borderRadius: 16,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "#0c1016",
                color: "#fff",
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
                  background: "#0c1016",
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
                <div style={{ color: "#94a3b8", opacity: 1, marginTop: 8 }}>{progressPercent}%</div>
                {mode === "ai" && loading && (
                  <div style={{fontSize:12,opacity:0.6,marginTop:8,lineHeight:1.6}}>
                    ⏳ AI video generation takes 2–4 minutes per scene. Please keep this tab open. Your reel will open automatically when ready.
                  </div>
                )}
              </div>
            ) : null}

            <button
              onClick={handleGenerate}
              disabled={!canGenerate}
              style={{
                background: canGenerate ? "linear-gradient(90deg, #00d2ff, #3b82f6)" : "#1f2937",
                color: "white",
                border: "none",
                borderRadius: 14,
                padding: "14px 22px",
                fontWeight: 700,
                cursor: canGenerate ? "pointer" : "not-allowed",
                fontSize: 15
              }}
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
                background: "#0c1016",
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
                    color: "#fff"
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
                    color: "#fff",
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
