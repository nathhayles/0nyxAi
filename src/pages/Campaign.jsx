import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient.js";
import { useSpeechInput } from "../hooks/useSpeechInput.js";
import { useCredits } from "../state/CreditsContext.jsx";

const TONES = ["Professional", "Energetic", "Inspirational", "Humorous", "Urgent", "Conversational", "Luxury", "Educational"];
const PLATFORMS = ["Instagram Reels", "TikTok", "YouTube Shorts", "Facebook", "LinkedIn"];
const REEL_COUNTS = [3, 5, 7, 10];

const AUTOSAVE_KEY = "onyx_editor_autosave_v2";

export default function Campaign() {
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const { balance: credits, refreshCredits } = useCredits();

  // Form
  const [brief, setBrief] = useState("");
  const [product, setProduct] = useState("");
  const [audience, setAudience] = useState("");
  const [tone, setTone] = useState("Professional");
  const [platform, setPlatform] = useState("Instagram Reels");
  const [reelCount, setReelCount] = useState(5);
  const [theme, setTheme] = useState("cinematic");
  const [brandId, setBrandId] = useState(null);
  const [brands, setBrands] = useState([]);
  const onBriefSpeech = useCallback((text) => setBrief(prev => prev ? prev + " " + text : text), []);
  const { listening: micListening, supported: micSupported, toggle: micToggle } = useSpeechInput(onBriefSpeech);

  // State
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState({ step: "", percent: 0 });
  const [error, setError] = useState("");
  const [generatedReels, setGeneratedReels] = useState([]);
  const [done, setDone] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) { navigate("/login"); return; }
      setSession(data.session);
      const headers = { Authorization: `Bearer ${data.session.access_token}` };
      fetch("/api/brands", { headers })
        .then(r => r.json())
        .then(data => {
          if (Array.isArray(data) && data.length > 0) {
            setBrands(data);
            const def = data.find(b => b.is_default) || data[0];
            setBrandId(def.id);
          }
        })
        .catch(() => {});
    });
  }, []);

  const estimatedCredits = reelCount * 10;
  const canGenerate = brief.trim() && product.trim() && !loading && credits !== null && credits >= estimatedCredits;

  async function handleGenerate() {
    if (!canGenerate) return;
    setLoading(true);
    setError("");
    setGeneratedReels([]);
    setDone(false);

    try {
      const token = session.access_token;
      setProgress({ step: "Generating campaign scripts...", percent: 10 });

      // Step 1: Generate multiple angle scripts via Claude
      const scriptsRes = await fetch("/api/campaign/generate-scripts", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ brief, product, audience, tone, platform, reelCount, theme, brand_id: brandId }),
      });

      if (!scriptsRes.ok) throw new Error("Failed to generate scripts");
      const { scripts } = await scriptsRes.json();

      setProgress({ step: `Generated ${scripts.length} scripts — creating reels...`, percent: 25 });

      // Step 2: For each script, create a storyboard and save as a reel
      const reels = [];
      for (let i = 0; i < scripts.length; i++) {
        const script = scripts[i];
        setProgress({
          step: `Creating reel ${i + 1} of ${scripts.length}: "${script.hook}"`,
          percent: 25 + Math.round((i / scripts.length) * 65),
        });

        try {
          const storyboardRes = await fetch("/api/campaign/create-reel", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ script, theme, platform }),
          });

          if (storyboardRes.ok) {
            const reel = await storyboardRes.json();
            reels.push(reel);
            setGeneratedReels([...reels]);
          }
        } catch (err) {
          console.error(`Reel ${i + 1} failed:`, err);
        }
      }

      setProgress({ step: "Campaign complete!", percent: 100 });
      setGeneratedReels(reels);
      setDone(true);
      refreshCredits();

    } catch (err) {
      setError(err.message || "Campaign generation failed");
    } finally {
      setLoading(false);
    }
  }

  function openReel(reel) {
    const handoffId = crypto.randomUUID();
    sessionStorage.setItem(`onyx_handoff_${handoffId}`, JSON.stringify({
      title: reel.title,
      ratio: "9:16",
      scenes: reel.scenes,
      activeScene: reel.scenes[0]?.id ?? 1,
      activeMenu: "storyboard",
      visualsTab: "stock",
      audioTab: "stock",
      voiceoverVolume: 100,
      musicVolume: 60,
      globalMusicUrl: "",
      savedAt: new Date().toISOString(),
    }));
    window.location.href = `/editor?handoff=${handoffId}`;
  }

  const inputStyle = {
    width: "100%", padding: "12px 16px", borderRadius: 10,
    background: "var(--onyx-bg-2)", border: "1px solid var(--onyx-hairline-strong)",
    color: "var(--onyx-text)", fontSize: 14, boxSizing: "border-box",
  };

  const selectStyle = {
    ...inputStyle,
    appearance: "none", WebkitAppearance: "none",
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%2394a3b8' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`,
    backgroundRepeat: "no-repeat", backgroundPosition: "right 14px center",
    paddingRight: 36,
  };

  const labelStyle = { display: "block", fontSize: 12, fontWeight: 600, color: "var(--onyx-text-dim)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.8px" };

  return (
    <div style={{ minHeight: "100vh", background: "var(--onyx-bg)", color: "var(--onyx-text)", padding: "40px 24px" }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <button onClick={() => navigate("/studio")} style={{ background: "none", border: "none", color: "var(--onyx-text-dim)", cursor: "pointer", fontSize: 13, marginBottom: 16, padding: 0 }}>
            ← Back to Studio
          </button>
          <h1 className="page-title">Campaign Generator</h1>
          <p style={{ color: "var(--onyx-text-dim)", margin: 0 }}>Generate {reelCount} unique reels from one campaign brief</p>
          {credits !== null && (
            <div style={{ marginTop: 10, fontSize: 13, color: credits >= estimatedCredits ? "#22c55e" : "#ef4444" }}>
              {credits} AI credits available · Reel slots used from your monthly plan allowance
            </div>
          )}
        </div>

        {!done ? (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
            {/* Left column */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={labelStyle}>Product / Service *</label>
                <input style={inputStyle} value={product} onChange={e => setProduct(e.target.value)} placeholder="e.g. AI video editor for creators" />
              </div>
              <div>
                <label style={labelStyle}>Target Audience</label>
                <input style={inputStyle} value={audience} onChange={e => setAudience(e.target.value)} placeholder="e.g. Small business owners, content creators" />
              </div>
              <div>
                <label style={labelStyle}>Tone</label>
                <select style={selectStyle} value={tone} onChange={e => setTone(e.target.value)}>
                  {TONES.map(t => <option key={t} style={{ background: "var(--onyx-bg-2)", color: "var(--onyx-text)" }}>{t}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Platform</label>
                <select style={selectStyle} value={platform} onChange={e => setPlatform(e.target.value)}>
                  {PLATFORMS.map(p => <option key={p} style={{ background: "var(--onyx-bg-2)", color: "var(--onyx-text)" }}>{p}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Number of Reels</label>
                <div style={{ display: "flex", gap: 8 }}>
                  {REEL_COUNTS.map(n => (
                    <button key={n} onClick={() => setReelCount(n)} style={{
                      flex: 1, padding: "10px", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer",
                      background: reelCount === n ? "var(--onyx-cyan)" : "var(--onyx-bg-2)",
                      border: reelCount === n ? "1px solid var(--onyx-cyan)" : "1px solid var(--onyx-hairline-strong)",
                      color: reelCount === n ? "#06121b" : "var(--onyx-text-faint)",
                    }}>{n}</button>
                  ))}
                </div>
              </div>
              {brands.length > 0 && (
                <div>
                  <label style={labelStyle}>Brand</label>
                  <select style={selectStyle} value={brandId ?? ""} onChange={e => setBrandId(e.target.value)}>
                    {brands.map(b => (
                      <option key={b.id} value={b.id} style={{ background: "var(--onyx-bg-2)", color: "var(--onyx-text)" }}>{b.brand_label}{b.is_default ? " (default)" : ""}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Right column */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                  <label style={{ ...labelStyle, marginBottom: 0 }}>Campaign Brief *</label>
                  {micSupported && (
                    <button type="button" onClick={micToggle} style={{
                      display: "flex", alignItems: "center", gap: 5,
                      padding: "4px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: "pointer",
                      border: `1px solid ${micListening ? "#ef4444" : "rgba(255,255,255,0.15)"}`,
                      background: micListening ? "rgba(239,68,68,0.12)" : "transparent",
                      color: micListening ? "#ef4444" : "var(--onyx-text-dim)",
                    }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: micListening ? "#ef4444" : "var(--onyx-text-faint)", display: "inline-block", animation: micListening ? "pulse 1s infinite" : "none" }} />
                      {micListening ? "Stop" : "Dictate"}
                    </button>
                  )}
                </div>
                <textarea
                  style={{ ...inputStyle, resize: "vertical", minHeight: 200, lineHeight: 1.6 }}
                  value={brief}
                  onChange={e => setBrief(e.target.value)}
                  placeholder={micListening ? "Listening…" : "Describe your campaign... What are you promoting? What's the key message? What action do you want viewers to take?"}
                />
              </div>
              <div>
                <label style={labelStyle}>Visual Theme</label>
                <select style={selectStyle} value={theme} onChange={e => setTheme(e.target.value)}>
                  {["cinematic", "business", "energetic", "minimal", "documentary", "luxury", "tech", "wellness"].map(t => (
                    <option key={t} value={t} style={{ background: "var(--onyx-bg-2)", color: "var(--onyx-text)" }}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        ) : null}

        {/* Progress */}
        {loading && (
          <div style={{ marginTop: 24, padding: 20, background: "var(--onyx-bg-2)", border: "1px solid var(--onyx-hairline-strong)", borderRadius: 12 }}>
            <div style={{ fontSize: 14, color: "var(--onyx-text-dim)", marginBottom: 10 }}>{progress.step}</div>
            <div style={{ height: 6, background: "var(--onyx-surface-2)", borderRadius: 3, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${progress.percent}%`, background: "linear-gradient(90deg, #4dd0ff, #2563eb)", transition: "width 0.5s" }} />
            </div>
            <div style={{ fontSize: 12, color: "var(--onyx-text-dim)", marginTop: 6 }}>{progress.percent}%</div>
          </div>
        )}

        {/* Error */}
        {error && <div style={{ marginTop: 16, padding: 12, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8, fontSize: 13, color: "#f87171" }}>{error}</div>}

        {/* Generate button */}
        {!done && (
          <button
            onClick={handleGenerate}
            disabled={!canGenerate}
            className="btn-teal"
            style={{ marginTop: 24, width: "100%" }}
          >
            {loading ? `Generating ${reelCount} reels...` : `Generate ${reelCount} Reels`}
          </button>
        )}

        {/* Generated reels grid */}
        {generatedReels.length > 0 && (
          <div style={{ marginTop: 32 }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>
              {done ? `✓ ${generatedReels.length} Reels Generated` : `Generating... ${generatedReels.length} ready`}
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
              {generatedReels.map((reel, i) => (
                <div key={i} style={{ background: "var(--onyx-bg-2)", border: "1px solid var(--onyx-hairline-strong)", borderRadius: 12, padding: 16 }}>
                  <div style={{ fontSize: 11, color: "#4dd0ff", fontWeight: 700, marginBottom: 6, textTransform: "uppercase" }}>Reel {i + 1}</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#f1f5f9", marginBottom: 6 }}>{reel.title}</div>
                  <div style={{ fontSize: 12, color: "var(--onyx-text-dim)", marginBottom: 12, lineHeight: 1.5 }}>{reel.hook}</div>
                  <div style={{ fontSize: 11, color: "var(--onyx-text-dim)", marginBottom: 12 }}>{reel.scenes?.length || 0} scenes</div>
                  <button
                    onClick={() => openReel(reel)}
                    style={{ width: "100%", padding: "8px", fontSize: 12, fontWeight: 600, background: "var(--onyx-surface-2)", border: "1px solid var(--onyx-hairline-strong)", color: "var(--onyx-text)", borderRadius: 6, cursor: "pointer" }}
                  >
                    Open in Editor →
                  </button>
                </div>
              ))}
            </div>
            {done && (
              <button onClick={() => { setDone(false); setGeneratedReels([]); setBrief(""); }} style={{ marginTop: 16, padding: "10px 20px", background: "none", border: "1px solid var(--onyx-hairline-strong)", color: "var(--onyx-text-dim)", borderRadius: 8, cursor: "pointer", fontSize: 13 }}>
                Generate Another Campaign
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
