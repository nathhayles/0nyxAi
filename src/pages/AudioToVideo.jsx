import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient.js";
import BrandSelector from "../components/BrandSelector.jsx";

export default function AudioToVideo() {
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState(null);
  const [brandId, setBrandId] = useState("");
  const fileRef = useRef();

  async function handleTranscribe() {
    if (!file) return setError("Please select an audio file");
    setLoading(true);
    setError("");
    setPreview(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const formData = new FormData();
      formData.append("audio", file);
      const res = await fetch("/api/audio-to-video/transcribe", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Transcription failed");
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
      title: preview.title || "Audio Reel",
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
    window.location.href = `/editor?handoff=${handoffId}`;
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--onyx-bg)", color: "var(--onyx-text)", padding: "40px 24px", fontFamily: "sans-serif" }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <button onClick={() => navigate("/studio")} style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: 13, marginBottom: 24, padding: 0 }}>
          ← Back to Studio
        </button>
        <h1 className="page-title">Audio to Video</h1>
        <p style={{ color: "#94a3b8", fontSize: 15, marginBottom: 32 }}>
          Upload a voice recording or audio file. We'll transcribe it and turn it into a full video reel with matching visuals.
        </p>

        <div
          onClick={() => fileRef.current?.click()}
          style={{ border: "2px dashed #2b3442", borderRadius: 12, padding: 40, textAlign: "center", cursor: "pointer", marginBottom: 16, background: file ? "rgba(77,208,255,0.05)" : "transparent" }}
        >
          {file ? (
            <div>
              <div style={{ fontSize: 32, marginBottom: 8 }}>♪</div>
              <div style={{ fontWeight: 600, color: "#7de0ff" }}>{file.name}</div>
              <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>{(file.size / 1024 / 1024).toFixed(1)} MB</div>
            </div>
          ) : (
            <div>
              <div style={{ fontSize: 40, marginBottom: 12 }}>↑</div>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>Drop your audio file here</div>
              <div style={{ fontSize: 13, color: "#94a3b8" }}>MP3, WAV, M4A, or OGG</div>
            </div>
          )}
          <input ref={fileRef} type="file" accept="audio/*" style={{ display: "none" }} onChange={e => setFile(e.target.files?.[0] || null)} />
        </div>

        <button
          onClick={handleTranscribe}
          disabled={!file || loading}
          className="btn-teal"
          style={{ width: "100%", marginBottom: 16 }}
        >
          {loading ? "Transcribing audio..." : "Transcribe & Generate Scenes"}
        </button>

        {error && (
          <div style={{ padding: "10px 14px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8, color: "#f87171", fontSize: 13, marginBottom: 16 }}>
            {error}
          </div>
        )}

        {preview && (
          <div style={{ background: "var(--onyx-bg-2)", border: "1px solid var(--onyx-hairline-strong)", borderRadius: 12, padding: 24 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Transcript</h2>
            <p style={{ color: "#94a3b8", fontSize: 13, marginBottom: 20 }}>{preview.transcript}</p>
            <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 12 }}>
              {preview.scenes?.length} scenes generated
            </div>
            {preview.scenes?.map((scene, i) => (
              <div key={i} style={{ padding: "10px 14px", background: "var(--onyx-surface)", borderRadius: 8, marginBottom: 8, fontSize: 13, color: "#94a3b8" }}>
                <span style={{ color: "#4dd0ff", fontWeight: 600 }}>Scene {i + 1}:</span> {scene.narration}
              </div>
            ))}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", marginBottom: 8, fontWeight: 600, fontSize: 14, color: "#e2e8f0" }}>Brand (optional)</label>
              <BrandSelector value={brandId} onChange={(id) => setBrandId(id)} />
            </div>
            <button onClick={handleGenerate} className="btn-teal" style={{ width: "100%", marginTop: 16 }}>
              Open in Editor
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
