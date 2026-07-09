import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient.js";
import BrandSelector from "../components/BrandSelector.jsx";

export default function PptToVideo() {
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState(null);
  const [brandId, setBrandId] = useState("");
  const [applyingColors, setApplyingColors] = useState(false);
  const [colorsApplied, setColorsApplied] = useState(false);
  const fileRef = useRef();

  async function handleUpload() {
    if (!file) return setError("Please select a PowerPoint file");
    setLoading(true);
    setError("");
    setPreview(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/ppt-to-video/extract", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Extraction failed");
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
      title: preview.title || "Presentation Reel",
      ratio: "16:9",
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
      // Fonts aren't auto-applied (they may not be available as web fonts) —
      // just carried along so the editor/reel can surface them later.
      metadata: preview.themeFonts ? { detected_fonts: preview.themeFonts } : {},
    }));
    window.open(`/editor?handoff=${handoffId}`, "_blank");
  }

  async function handleApplyThemeColors() {
    if (!brandId || !preview?.themeColors) return;
    setApplyingColors(true);
    setError("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const colors = Object.values(preview.themeColors).filter(Boolean);
      const res = await fetch(`/api/brands/${brandId}/apply-theme-colors`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ colors }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to apply colours");
      setColorsApplied(true);
    } catch (err) {
      setError(err.message);
    }
    setApplyingColors(false);
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--onyx-bg)", color: "var(--onyx-text)", padding: "40px 24px", fontFamily: "sans-serif" }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <button onClick={() => navigate("/studio")} style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: 13, marginBottom: 24, padding: 0 }}>
          ← Back to Studio
        </button>
        <h1 className="page-title">PPT to Video</h1>
        <p style={{ color: "#94a3b8", fontSize: 15, marginBottom: 32 }}>
          Upload a PowerPoint presentation and we'll convert each slide into a video scene with AI voiceover.
        </p>

        <div
          onClick={() => fileRef.current?.click()}
          style={{ border: "2px dashed #2b3442", borderRadius: 12, padding: 40, textAlign: "center", cursor: "pointer", marginBottom: 16, background: file ? "rgba(77,208,255,0.05)" : "transparent" }}
        >
          {file ? (
            <div>
              <div style={{ fontSize: 32, marginBottom: 8 }}>▦</div>
              <div style={{ fontWeight: 600, color: "#7de0ff" }}>{file.name}</div>
              <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>{(file.size / 1024 / 1024).toFixed(1)} MB</div>
            </div>
          ) : (
            <div>
              <div style={{ fontSize: 40, marginBottom: 12 }}>⬆️</div>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>Drop your .pptx file here</div>
              <div style={{ fontSize: 13, color: "#94a3b8" }}>or click to browse</div>
            </div>
          )}
          <input ref={fileRef} type="file" accept=".pptx,.ppt" style={{ display: "none" }} onChange={e => setFile(e.target.files?.[0] || null)} />
        </div>

        <button
          onClick={handleUpload}
          disabled={!file || loading}
          className="btn-teal"
          style={{ width: "100%", marginBottom: 16 }}
        >
          {loading ? "Extracting slides..." : "Extract Slides"}
        </button>

        {error && (
          <div style={{ padding: "10px 14px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8, color: "#f87171", fontSize: 13, marginBottom: 16 }}>
            {error}
          </div>
        )}

        {preview && (
          <div style={{ background: "var(--onyx-bg-2)", border: "1px solid var(--onyx-hairline-strong)", borderRadius: 12, padding: 24 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>{preview.scenes?.length} slides extracted</h2>
            {preview.scenes?.map((scene, i) => (
              <div key={i} style={{ padding: "10px 14px", background: "var(--onyx-surface)", borderRadius: 8, marginBottom: 8, fontSize: 13 }}>
                <div style={{ color: "#4dd0ff", fontWeight: 600, marginBottom: 4 }}>Slide {i + 1}</div>
                <div style={{ color: "#94a3b8" }}>{scene.narration}</div>
              </div>
            ))}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", marginBottom: 8, fontWeight: 600, fontSize: 14, color: "#e2e8f0" }}>Brand (optional)</label>
              <BrandSelector value={brandId} onChange={(id) => { setBrandId(id); setColorsApplied(false); }} />
            </div>

            {preview.themeColors && (
              <div style={{ marginBottom: 16, padding: "12px 14px", background: "var(--onyx-surface)", borderRadius: 8 }}>
                <div style={{ fontWeight: 600, fontSize: 13, color: "#e2e8f0", marginBottom: 8 }}>Theme colours found in this presentation</div>
                <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                  {Object.values(preview.themeColors).map((hex, i) => (
                    <div key={i} title={hex} style={{ width: 28, height: 28, borderRadius: 6, background: hex, border: "1px solid rgba(255,255,255,0.15)" }} />
                  ))}
                </div>
                <button
                  onClick={handleApplyThemeColors}
                  disabled={!brandId || applyingColors || colorsApplied}
                  className="btn-teal"
                  style={{ fontSize: 13, padding: "6px 12px" }}
                >
                  {colorsApplied ? "Applied to brand ✓" : applyingColors ? "Applying..." : brandId ? "Apply colours to brand" : "Select a brand to apply colours"}
                </button>
              </div>
            )}

            <button onClick={handleGenerate} className="btn-teal" style={{ width: "100%", marginTop: 16 }}>
              Open in Editor
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
