import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient.js";

const TONES = ["Professional", "Energetic", "Inspirational", "Humorous", "Urgent", "Conversational", "Luxury", "Educational"];
const PLATFORMS = ["Instagram Reels", "TikTok", "YouTube Shorts", "Facebook", "LinkedIn"];
const REEL_COUNTS = [3, 5, 7, 10];

const AUTOSAVE_KEY = "onyx_editor_autosave_v2";

export default function Campaign() {
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [credits, setCredits] = useState(null);

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
      fetch("/api/credits/balance", { headers })
        .then(r => r.json()).then(d => setCredits(d?.balance ?? 0)).catch(() => {});
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
    background: "#0c1016", border: "1px solid #1f2937",
    color: "#f1f5f9", fontSize: 14, boxSizing: "border-box",
  };

  const labelStyle = { display: "block", fontSize: 12, fontWeight: 600, color: "#94a3b8", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.8px" };

  return (
    <div style={{ minHeight: "100vh", background: "#06070a", color: "#fff", padding: "40px 24px" }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <button onClick={() => navigate("/studio")} style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: 13, marginBottom: 16, padding: 0 }}>
            ← Back to Studio
          </button>
          <h1 style={{ fontSize: 32, fontWeight: 800, margin: "0 0 8px" }}>⚡ Campaign Generator</h1>
          <p style={{ color: "#94a3b8", margin: 0 }}>Generate {reelCount} unique reels from one campaign brief</p>
          {credits !== null && (
            <div style={{ marginTop: 10, fontSize: 13, color: credits >= estimatedCredits ? "#22c55e" : "#ef4444" }}>
              ⚡ {credits} AI credits available · Reel slots used from your monthly plan allowance
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
                <select style={inputStyle} value={tone} onChange={e => setTone(e.target.value)}>
                  {TONES.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Platform</label>
                <select style={inputStyle} value={platform} onChange={e => setPlatform(e.target.value)}>
                  {PLATFORMS.map(p => <option key={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Number of Reels</label>
                <div style={{ display: "flex", gap: 8 }}>
                  {REEL_COUNTS.map(n => (
                    <button key={n} onClick={() => setReelCount(n)} style={{
                      flex: 1, padding: "10px", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer",
                      background: reelCount === n ? "#2563eb" : "#0c1016",
                      border: reelCount === n ? "1px solid #3b82f6" : "1px solid #1f2937",
                      color: reelCount === n ? "#fff" : "#64748b",
                    }}>{n}</button>
                  ))}
                </div>
              </div>
              {brands.length > 0 && (
                <div>
                  <label style={labelStyle}>Brand</label>
                  <select style={inputStyle} value={brandId ?? ""} onChange={e => setBrandId(e.target.value)}>
                    {brands.map(b => (
                      <option key={b.id} value={b.id}>{b.brand_label}{b.is_default ? " (default)" : ""}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Right column */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Campaign Brief *</label>
                <textarea
                  style={{ ...inputStyle, resize: "vertical", minHeight: 200, lineHeight: 1.6 }}
                  value={brief}
                  onChange={e => setBrief(e.target.value)}
                  placeholder="Describe your campaign... What are you promoting? What's the key message? What action do you want viewers to take?"
                />
              </div>
              <div>
                <label style={labelStyle}>Visual Theme</label>
                <select style={inputStyle} value={theme} onChange={e => setTheme(e.target.value)}>
                  {["cinematic", "business", "energetic", "minimal", "documentary", "luxury", "tech", "wellness"].map(t => (
                    <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        ) : null}

        {/* Progress */}
        {loading && (
          <div style={{ marginTop: 24, padding: 20, background: "#0c1016", border: "1px solid #1f2937", borderRadius: 12 }}>
            <div style={{ fontSize: 14, color: "#94a3b8", marginBottom: 10 }}>{progress.step}</div>
            <div style={{ height: 6, background: "#1f2937", borderRadius: 3, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${progress.percent}%`, background: "linear-gradient(90deg, #8b5cf6, #2563eb)", transition: "width 0.5s" }} />
            </div>
            <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 6 }}>{progress.percent}%</div>
          </div>
        )}

        {/* Error */}
        {error && <div style={{ marginTop: 16, padding: 12, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8, fontSize: 13, color: "#f87171" }}>{error}</div>}

        {/* Generate button */}
        {!done && (
          <button
            onClick={handleGenerate}
            disabled={!canGenerate}
            style={{
              marginTop: 24, width: "100%", padding: "16px", fontSize: 15, fontWeight: 700,
              background: canGenerate ? "linear-gradient(90deg, #8b5cf6, #2563eb)" : "#1f2937",
              border: "none", borderRadius: 12, color: "#fff",
              cursor: canGenerate ? "pointer" : "not-allowed",
            }}
          >
            {loading ? `Generating ${reelCount} reels...` : `⚡ Generate ${reelCount} Reels`}
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
                <div key={i} style={{ background: "#0c1016", border: "1px solid #1f2937", borderRadius: 12, padding: 16 }}>
                  <div style={{ fontSize: 11, color: "#8b5cf6", fontWeight: 700, marginBottom: 6, textTransform: "uppercase" }}>Reel {i + 1}</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#f1f5f9", marginBottom: 6 }}>{reel.title}</div>
                  <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 12, lineHeight: 1.5 }}>{reel.hook}</div>
                  <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 12 }}>{reel.scenes?.length || 0} scenes</div>
                  <button
                    onClick={() => openReel(reel)}
                    style={{ width: "100%", padding: "8px", fontSize: 12, fontWeight: 600, background: "#1e3a5f", border: "1px solid #2563eb", color: "#60a5fa", borderRadius: 6, cursor: "pointer" }}
                  >
                    Open in Editor →
                  </button>
                </div>
              ))}
            </div>
            {done && (
              <button onClick={() => { setDone(false); setGeneratedReels([]); setBrief(""); }} style={{ marginTop: 16, padding: "10px 20px", background: "none", border: "1px solid #1f2937", color: "#94a3b8", borderRadius: 8, cursor: "pointer", fontSize: 13 }}>
                Generate Another Campaign
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
