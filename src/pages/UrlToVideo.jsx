import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient.js";
import BrandSelector from "../components/BrandSelector.jsx";

export default function UrlToVideo() {
  const navigate = useNavigate();
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState(null);
  const [brandId, setBrandId] = useState("");

  async function handleAnalyse() {
    if (!url.trim()) return setError("Please enter a URL");
    let normalizedUrl = url.trim();
    if (normalizedUrl && !normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
      normalizedUrl = 'https://' + normalizedUrl;
    }
    setLoading(true);
    setError("");
    setPreview(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/url-to-video/analyse", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ url: normalizedUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Analysis failed");
      setPreview(data);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  }

  function handleGenerate() {
    if (!preview) return;
    const handoffId = crypto.randomUUID();
    sessionStorage.setItem(`onyx_handoff_${handoffId}`, JSON.stringify({
      title: preview.title || "URL Reel",
      ratio: "9:16",
      scenes: preview.scenes,
      activeScene: preview.scenes[0]?.id ?? 1,
      activeMenu: "storyboard",
      visualsTab: "stock",
      audioTab: "stock",
      voiceoverVolume: 100,
      musicVolume: 60,
      globalMusicUrl: "",
      savedAt: new Date().toISOString(),
      brandId,
    }));
    navigate(`/editor?handoff=${handoffId}`);
  }

  return (
    <div style={{ minHeight: "100vh", background: "#06070a", color: "#fff", padding: "40px 24px", fontFamily: "sans-serif" }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <button onClick={() => navigate("/studio")} style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: 13, marginBottom: 24, padding: 0 }}>
          ← Back to Studio
        </button>
        <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>🔗 URL to Video</h1>
        <p style={{ color: "#94a3b8", fontSize: 15, marginBottom: 32 }}>
          Paste any webpage URL and we'll turn its content into a ready-to-edit video reel.
        </p>

        <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
          <input
            value={url}
            onChange={e => setUrl(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleAnalyse()}
            placeholder="https://yourbusiness.com/about"
            style={{ flex: 1, padding: "13px 16px", borderRadius: 8, background: "#0c1016", border: "1px solid #1f2937", color: "#f1f5f9", fontSize: 14, outline: "none" }}
          />
          <button
            onClick={handleAnalyse}
            disabled={loading}
            style={{ padding: "13px 24px", borderRadius: 8, background: loading ? "#374151" : "linear-gradient(135deg, #7c3aed, #ec4899)", border: "none", color: "#fff", fontWeight: 700, fontSize: 14, cursor: loading ? "not-allowed" : "pointer" }}
          >
            {loading ? "Analysing..." : "Analyse"}
          </button>
        </div>

        {error && (
          <div style={{ padding: "10px 14px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8, color: "#f87171", fontSize: 13, marginBottom: 16 }}>
            {error}
          </div>
        )}

        {loading && (
          <div style={{ padding: 20, background: "#0c1016", border: "1px solid #1f2937", borderRadius: 12, textAlign: "center", color: "#94a3b8", fontSize: 14 }}>
            Fetching and analysing page content with AI...
          </div>
        )}

        {preview && (
          <div style={{ background: "#0c1016", border: "1px solid #1f2937", borderRadius: 12, padding: 24 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>{preview.title}</h2>
            <p style={{ color: "#94a3b8", fontSize: 13, marginBottom: 20 }}>{preview.summary}</p>
            <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 12 }}>
              {preview.scenes?.length} scenes generated
            </div>
            {preview.scenes?.map((scene, i) => (
              <div key={i} style={{ padding: "10px 14px", background: "#111827", borderRadius: 8, marginBottom: 8, fontSize: 13, color: "#94a3b8" }}>
                <span style={{ color: "#7c3aed", fontWeight: 600 }}>Scene {i + 1}:</span> {scene.narration}
              </div>
            ))}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", marginBottom: 8, fontWeight: 600, fontSize: 14, color: "#e2e8f0" }}>Brand (optional)</label>
              <BrandSelector value={brandId} onChange={(id) => setBrandId(id)} />
            </div>
            <button
              onClick={handleGenerate}
              style={{ width: "100%", marginTop: 16, padding: "13px", borderRadius: 8, background: "linear-gradient(135deg, #7c3aed, #ec4899)", border: "none", color: "#fff", fontWeight: 700, fontSize: 15, cursor: "pointer" }}
            >
              ✨ Open in Editor
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
