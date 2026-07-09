import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient.js";
import BrandSelector from "../components/BrandSelector.jsx";
import { useSpeechInput } from "../hooks/useSpeechInput.js";

const PLATFORMS = ["tiktok", "instagram", "youtube", "linkedin", "twitter"];
const TONES = ["bold", "educational", "funny", "inspirational", "professional"];
const FRAMEWORKS = {
  curiosity: "Curiosity",
  controversy: "Controversy",
  story: "Story",
  statistic: "Statistic",
  question: "Question",
  mistake: "Mistake",
  secret: "Secret",
  transformation: "Transformation",
  list: "List",
  challenge: "Challenge",
};

export default function ViralHooks() {
  const navigate = useNavigate();
  const [topic, setTopic] = useState("");
  const [niche, setNiche] = useState("");
  const [platform, setPlatform] = useState("tiktok");
  const [tone, setTone] = useState("bold");
  const [count, setCount] = useState(10);
  const [loading, setLoading] = useState(false);
  const [hooks, setHooks] = useState([]);
  const [error, setError] = useState("");
  const [copiedId, setCopiedId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [captionLoading, setCaptionLoading] = useState(null);
  const [captions, setCaptions] = useState({});
  const [brandId, setBrandId] = useState("");
  const onTopicSpeech = useCallback((text) => setTopic(prev => prev ? prev + " " + text : text), []);
  const { listening: micListening, supported: micSupported, toggle: micToggle } = useSpeechInput(onTopicSpeech);

  async function getHeaders() {
    const { data: { session } } = await supabase.auth.getSession();
    return { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` };
  }

  async function generateHooks() {
    if (!topic.trim()) return setError("Enter a topic first");
    setLoading(true);
    setError("");
    setHooks([]);
    try {
      const headers = await getHeaders();
      const res = await fetch("/api/viral-hooks/generate", {
        method: "POST",
        headers,
        body: JSON.stringify({ topic, niche, platform, tone, count }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generation failed");
      setHooks(data.hooks || []);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  }

  async function generateCaption(hook, index) {
    setCaptionLoading(index);
    try {
      const headers = await getHeaders();
      const res = await fetch("/api/viral-hooks/caption", {
        method: "POST",
        headers,
        body: JSON.stringify({ hook: hook.text, topic, platform }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setCaptions(prev => ({ ...prev, [index]: data }));
      setExpandedId(index);
    } catch (err) {
      setError(err.message);
    }
    setCaptionLoading(null);
  }

  function copyText(text, id) {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  function openInEditor(hook) {
    const handoffId = crypto.randomUUID();
    const scene1Media = hook.suggestedMedia;
    sessionStorage.setItem(`onyx_handoff_${handoffId}`, JSON.stringify({
      title: topic,
      ratio: platform === "youtube" ? "16:9" : "9:16",
      scenes: [
        {
          id: 1,
          narration: hook.text,
          action: "Hook scene — bold text on screen",
          url: scene1Media?.url || null,
          mediaUrl: scene1Media?.url || null,
          mediaType: "video",
          thumbnail: scene1Media?.thumb || null,
          stockThumb: scene1Media?.thumb || null,
          mode: "stock",
        },
        {
          id: 2,
          narration: hook.cta || "Follow for more tips!",
          action: "Call to action",
          url: scene1Media?.url || null,
          mediaUrl: scene1Media?.url || null,
          mediaType: "video",
          thumbnail: scene1Media?.thumb || null,
          stockThumb: scene1Media?.thumb || null,
          mode: "stock",
        },
      ],
      activeScene: 1,
      activeMenu: "storyboard",
      savedAt: new Date().toISOString(),
      brandId,
    }));
    window.open(`/editor?handoff=${handoffId}`, "_blank");
  }

  const s = { minHeight: "100vh", background: "var(--onyx-bg)", color: "var(--onyx-text)", fontFamily: "sans-serif", padding: "40px 24px" };
  const card = { background: "var(--onyx-bg-2)", border: "1px solid var(--onyx-hairline-strong)", borderRadius: 12, padding: 20, marginBottom: 16 };
  const inputS = { width: "100%", background: "var(--onyx-bg-2)", border: "1px solid var(--onyx-hairline-strong)", color: "#e2e8f0", borderRadius: 8, padding: "10px 14px", fontSize: 14, boxSizing: "border-box", outline: "none" };
  const chipBase = { padding: "7px 14px", borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: "pointer", border: "1px solid var(--onyx-hairline-strong)" };

  return (
    <div style={s}>
      <div style={{ maxWidth: 800, margin: "0 auto" }}>
        <button onClick={() => navigate("/studio")} style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: 13, marginBottom: 24, padding: 0 }}>← Back to Studio</button>

        <div style={{ marginBottom: 28 }}>
          <h1 className="page-title">Viral Hooks Generator</h1>
          <p style={{ color: "#64748b", fontSize: 15 }}>Generate 10 scroll-stopping opening lines for your reels using proven viral frameworks. Then turn any hook into a full reel in one click.</p>
        </div>

        {/* Config */}
        <div style={card}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                <label style={{ fontSize: 12, color: "#94a3b8" }}>Topic / Subject *</label>
                {micSupported && (
                  <button type="button" onClick={micToggle} style={{
                    display: "flex", alignItems: "center", gap: 5,
                    padding: "4px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: "pointer",
                    border: `1px solid ${micListening ? "#ef4444" : "rgba(255,255,255,0.15)"}`,
                    background: micListening ? "rgba(239,68,68,0.12)" : "transparent",
                    color: micListening ? "#ef4444" : "#94a3b8",
                  }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: micListening ? "#ef4444" : "#94a3b8", display: "inline-block", animation: micListening ? "pulse 1s infinite" : "none" }} />
                    {micListening ? "Stop" : "Dictate"}
                  </button>
                )}
              </div>
              <input style={inputS} value={topic} onChange={e => setTopic(e.target.value)}
                onKeyDown={e => e.key === "Enter" && generateHooks()}
                placeholder={micListening ? "Listening…" : "e.g. how I grew my Instagram to 10k followers in 30 days"} />
            </div>

            <div>
              <label style={{ fontSize: 12, color: "#94a3b8", display: "block", marginBottom: 6 }}>Niche / Industry (optional)</label>
              <input style={inputS} value={niche} onChange={e => setNiche(e.target.value)}
                placeholder="e.g. fitness, real estate, cooking, personal finance..." />
            </div>

            <div>
              <label style={{ fontSize: 12, color: "#94a3b8", display: "block", marginBottom: 8 }}>Platform</label>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {PLATFORMS.map(p => (
                  <button key={p} onClick={() => setPlatform(p)} style={{
                    ...chipBase,
                    background: platform === p ? "rgba(94,220,255,0.12)" : "var(--onyx-surface)",
                    border: platform === p ? "1px solid var(--onyx-cyan)" : "1px solid var(--onyx-hairline-strong)",
                    color: platform === p ? "var(--onyx-cyan)" : "#64748b",
                    textTransform: "capitalize",
                  }}>{p}</button>
                ))}
              </div>
            </div>

            <div>
              <label style={{ fontSize: 12, color: "#94a3b8", display: "block", marginBottom: 8 }}>Tone</label>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {TONES.map(t => (
                  <button key={t} onClick={() => setTone(t)} style={{
                    ...chipBase,
                    background: tone === t ? "rgba(94,220,255,0.12)" : "var(--onyx-surface)",
                    border: tone === t ? "1px solid var(--onyx-cyan)" : "1px solid var(--onyx-hairline-strong)",
                    color: tone === t ? "var(--onyx-cyan)" : "#64748b",
                    textTransform: "capitalize",
                  }}>{t}</button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", marginBottom: 8, fontWeight: 600, fontSize: 14, color: "#e2e8f0" }}>Brand (optional)</label>
              <BrandSelector value={brandId} onChange={(id) => setBrandId(id)} />
            </div>

            <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 12, color: "#94a3b8", display: "block", marginBottom: 6 }}>Number of hooks: {count}</label>
                <input type="range" min={5} max={20} value={count} onChange={e => setCount(Number(e.target.value))} style={{ width: "100%" }} />
              </div>
              <button onClick={generateHooks} disabled={loading} className="btn-teal" style={{ flexShrink: 0 }}>
                {loading ? "Generating..." : "Generate Hooks"}
              </button>
            </div>
          </div>
        </div>

        {error && <div style={{ padding: "12px 16px", borderRadius: 8, marginBottom: 16, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#f87171", fontSize: 14 }}>{error}</div>}

        {loading && (
          <div style={{ ...card, textAlign: "center", padding: 40 }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>...</div>
            <div style={{ color: "#94a3b8", fontSize: 14 }}>Analysing viral patterns and generating hooks...</div>
          </div>
        )}

        {/* Results */}
        {hooks.length > 0 && (
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#e2e8f0" }}>{hooks.length} hooks generated</div>
              <button onClick={() => copyText(hooks.map(h => h.text).join("\n\n"), "all")} style={{ fontSize: 12, color: "#64748b", background: "none", border: "1px solid var(--onyx-hairline-strong)", borderRadius: 6, padding: "5px 12px", cursor: "pointer" }}>
                {copiedId === "all" ? "Copied all!" : "Copy all hooks"}
              </button>
            </div>

            {hooks.map((hook, i) => (
              <div key={i} style={{ ...card, marginBottom: 10 }}>
                <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 4, background: "rgba(77,208,255,0.15)", color: "#7de0ff" }}>
                        {FRAMEWORKS[hook.framework] || hook.framework}
                      </span>
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: "#f1f5f9", lineHeight: 1.4, marginBottom: 8 }}>
                      "{hook.text}"
                    </div>
                    <div style={{ fontSize: 12, color: "#64748b", marginBottom: expandedId === i ? 12 : 0 }}>
                      {hook.why}
                    </div>

                    {/* Expanded caption */}
                    {expandedId === i && captions[i] && (
                      <div style={{ marginTop: 12, padding: 14, background: "var(--onyx-surface)", borderRadius: 8, border: "1px solid var(--onyx-hairline-strong)" }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: "#475569", textTransform: "uppercase", marginBottom: 8 }}>Full Caption</div>
                        <div style={{ fontSize: 13, color: "#94a3b8", whiteSpace: "pre-wrap", marginBottom: 12 }}>{captions[i].caption}</div>
                        {captions[i].hashtags?.length > 0 && (
                          <div style={{ fontSize: 12, color: "#60a5fa", marginBottom: 8 }}>
                            {captions[i].hashtags.map(h => `#${h}`).join(" ")}
                          </div>
                        )}
                        {captions[i].cta && (
                          <div style={{ fontSize: 12, color: "#4ade80" }}>{captions[i].cta}</div>
                        )}
                        <button onClick={() => copyText(`${hook.text}\n\n${captions[i].caption}\n\n${captions[i].hashtags?.map(h => `#${h}`).join(" ")}`, `caption_${i}`)}
                          style={{ marginTop: 10, padding: "6px 14px", borderRadius: 6, background: "var(--btn-primary-grad)", border: "none", color: "var(--btn-primary-text)", fontSize: 12, cursor: "pointer", fontWeight: 600 }}>
                          {copiedId === `caption_${i}` ? "Copied!" : "Copy full caption"}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, flexShrink: 0 }}>
                    <button onClick={() => copyText(hook.text, i)} style={{ padding: "6px 12px", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer", background: copiedId === i ? "rgba(34,197,94,0.15)" : "#1f2937", border: copiedId === i ? "1px solid #22c55e" : "1px solid var(--onyx-hairline-strong)", color: copiedId === i ? "#4ade80" : "#94a3b8" }}>
                      {copiedId === i ? "Copied" : "Copy"}
                    </button>
                    <button onClick={() => generateCaption(hook, i)} disabled={captionLoading === i} style={{ padding: "6px 12px", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer", background: "rgba(94,220,255,0.08)", border: "1px solid rgba(94,220,255,0.3)", color: "var(--onyx-cyan)" }}>
                      {captionLoading === i ? "..." : "Caption"}
                    </button>
                    <button onClick={() => openInEditor(hook)} style={{ padding: "6px 12px", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer", background: "rgba(94,220,255,0.08)", border: "1px solid rgba(94,220,255,0.3)", color: "var(--onyx-cyan)" }}>
                      Edit →
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
