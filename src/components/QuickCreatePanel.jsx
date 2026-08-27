import { useState, useEffect, useRef } from "react";
import { getAuthHeaders } from "../utils/auth.js";
import { TEMPLATES } from "../data/templates.js";

// "Style Presets" one-click flow (Higgsfield gap, see
// docs/competitive-feature-parity-scoping.md item 3): upload one photo, pick
// a style, get a finished clip -- bypasses the storyboard/scene-building
// step entirely. Reuses three already-proven, unmodified pieces rather than
// inventing new backend surface: /api/media/upload (StoryboardPanel's Start
// Image upload), /api/kling/generate + /api/kling/status polling
// (EditorV2's regenerateScene, copied verbatim below), and the same
// single-scene reel shape reframe360.js's buildReelScene produces
// (mode:"stock", not "ai" -- this clip is already finished, so it must NOT
// render EditorV2's "awaiting generation" panel, exactly the bug fixed in
// reframe360 2026-08-27).
export default function QuickCreatePanel({ brand, videoModelOptions, onCreated }) {
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState(null);
  const [photoUrl, setPhotoUrl] = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const [selectedTemplateId, setSelectedTemplateId] = useState(null);
  const [duration, setDuration] = useState(5);
  const [videoModel, setVideoModel] = useState(videoModelOptions?.[0]?.id || "kling-2.6-pro");

  const [estimatedCredits, setEstimatedCredits] = useState(null);
  const [estimateLoading, setEstimateLoading] = useState(false);

  const [generating, setGenerating] = useState(false);
  const [statusText, setStatusText] = useState("");
  const [error, setError] = useState("");

  const fileInputRef = useRef(null);
  const selectedTemplate = TEMPLATES.find(t => t.id === selectedTemplateId) || null;

  // Same debounced live-estimate pattern as StoryboardPanel.jsx -- calls the
  // real getSceneCost() server-side rather than duplicating pricing math.
  useEffect(() => {
    if (!selectedTemplate) { setEstimatedCredits(null); return; }
    let cancelled = false;
    setEstimateLoading(true);
    const timer = setTimeout(async () => {
      try {
        const headers = await getAuthHeaders();
        const params = new URLSearchParams({
          model: videoModel,
          duration: String(duration),
          aspect_ratio: selectedTemplate.aspectRatio,
        });
        const res = await fetch(`/api/models/estimate-cost?${params}`, { headers });
        const data = await res.json();
        if (!cancelled) setEstimatedCredits(typeof data.credits === "number" ? data.credits : null);
      } catch {
        if (!cancelled) setEstimatedCredits(null);
      } finally {
        if (!cancelled) setEstimateLoading(false);
      }
    }, 400);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [videoModel, duration, selectedTemplate]);

  async function handlePhotoSelect(file) {
    if (!file) return;
    setError("");
    setPhotoFile(file);
    setPhotoPreviewUrl((old) => { if (old) URL.revokeObjectURL(old); return URL.createObjectURL(file); });
    setPhotoUrl(null);
    setUploadingPhoto(true);
    try {
      const headers = await getAuthHeaders();
      const form = new FormData();
      form.append("files", file);
      form.append("assetType", "image");
      const res = await fetch("/api/media/upload", { method: "POST", headers, body: form });
      const data = await res.json();
      const uploaded = data?.files?.[0];
      if (!uploaded?.url) throw new Error(data?.error || "Upload failed");
      setPhotoUrl(uploaded.url);
    } catch (e) {
      console.error("[QuickCreate] photo upload failed:", e);
      setError(e.message || "Photo upload failed");
    } finally {
      setUploadingPhoto(false);
    }
  }

  const canGenerate = !!photoUrl && !!selectedTemplate && !generating && !uploadingPhoto;

  async function handleGenerate() {
    if (!canGenerate) return;
    setGenerating(true);
    setError("");
    setStatusText("Starting generation…");
    try {
      const h = await getAuthHeaders(); h["Content-Type"] = "application/json";
      const submitRes = await fetch("/api/kling/generate", {
        method: "POST",
        headers: h,
        body: JSON.stringify({
          prompt: selectedTemplate.promptPrefix,
          sceneId: 1,
          aspect_ratio: selectedTemplate.aspectRatio,
          duration,
          model: videoModel,
          brand_id: brand || null,
          image_url: photoUrl,
          end_image_url: null,
          resolution: null,
          voiceoverUrl: null,
          voiceoverMultiSpeaker: false,
          reference_mode: null,
        }),
      });
      const { jobId, error: submitErr } = await submitRes.json();
      if (!jobId) throw new Error(submitErr || "No jobId returned");

      setStatusText("Generating your clip — this can take a few minutes…");
      // Same 5s-poll / 20min-deadline pattern as EditorV2.jsx's
      // regenerateScene, copied verbatim (see that function's own comment
      // for why: falPoll takes up to 10 min + download, plus an optional
      // lip-sync pass).
      const deadline = Date.now() + 1200000;
      let result = null;
      while (Date.now() < deadline) {
        await new Promise(r => setTimeout(r, 5000));
        let poll;
        try {
          const ph = await getAuthHeaders();
          poll = await (await fetch(`/api/kling/status/${jobId}`, { headers: ph })).json();
        } catch (pollErr) {
          console.warn("[QuickCreate] poll transient failure, retrying:", pollErr);
          continue;
        }
        if (poll.status === "completed") {
          if (!poll.videoUrl) throw new Error("Job completed but no video URL returned");
          result = poll;
          break;
        }
        if (poll.status === "failed") throw new Error(poll.error || "Generation failed");
      }
      if (!result) throw new Error("Timed out waiting for video");

      setStatusText("Saving your reel…");
      const scene = {
        type: "video",
        mode: "stock",
        stockSource: "direct",
        url: result.videoUrl,
        mediaUrl: result.videoUrl,
        thumbnail: result.thumbnailUrl || result.videoUrl,
        stockThumb: result.thumbnailUrl || result.videoUrl,
        duration,
        trimStart: 0,
        trimEnd: duration,
        speed: 1,
        voiceoverUrl: null,
        narration: "",
        captionsEnabled: false,
        transitionToNext: "cut",
        label: selectedTemplate.name,
      };
      const reelHeaders = await getAuthHeaders(); reelHeaders["Content-Type"] = "application/json";
      const reelRes = await fetch("/api/reels", {
        method: "POST",
        headers: reelHeaders,
        body: JSON.stringify({
          title: `Quick Create — ${selectedTemplate.name}`,
          scenes: [scene],
          ratio: selectedTemplate.aspectRatio,
          status: "draft",
          timeline: { tracks: [] },
        }),
      });
      const reelData = await reelRes.json();
      if (!reelData?.id) throw new Error(reelData?.error || "Failed to save reel");
      onCreated?.(reelData.id);
    } catch (e) {
      console.error("[QuickCreate] generate failed:", e);
      setError(e.message || "Generation failed");
    } finally {
      setGenerating(false);
      setStatusText("");
    }
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 32 }}>
      <div>
        <label style={{ display: "block", marginBottom: 10, fontWeight: 600 }}>Photo</label>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={(e) => handlePhotoSelect(e.target.files?.[0])}
        />
        <div
          onClick={() => fileInputRef.current?.click()}
          style={{
            width: "100%", aspectRatio: "1/1", borderRadius: 12, cursor: "pointer",
            border: "1px dashed var(--onyx-hairline-strong)", background: "var(--onyx-bg-2)",
            display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", marginBottom: 8,
          }}
        >
          {photoPreviewUrl ? (
            <img src={photoPreviewUrl} alt="Selected" style={{ width: "100%", height: "100%", objectFit: "cover", opacity: uploadingPhoto ? 0.5 : 1 }} />
          ) : (
            <span style={{ color: "var(--onyx-text-faint)", fontSize: 13 }}>Click to upload a photo</span>
          )}
        </div>
        {uploadingPhoto && <p style={{ fontSize: 12, color: "var(--onyx-text-faint)" }}>Uploading…</p>}

        <label style={{ display: "block", margin: "20px 0 10px", fontWeight: 600 }}>Duration</label>
        <input
          type="range" min={3} max={15} step={1} value={duration}
          onChange={(e) => setDuration(Number(e.target.value))}
          style={{ width: "100%" }}
        />
        <div style={{ fontSize: 12, color: "var(--onyx-text-faint)", marginBottom: 20 }}>{duration}s</div>

        <label style={{ display: "block", marginBottom: 10, fontWeight: 600 }}>Model</label>
        <select
          value={videoModel}
          onChange={(e) => setVideoModel(e.target.value)}
          style={{ width: "100%", padding: 12, borderRadius: 12, border: "1px solid var(--onyx-hairline-strong)", background: "var(--onyx-bg-2)", color: "var(--onyx-text)", marginBottom: 20, boxSizing: "border-box" }}
        >
          {(videoModelOptions || []).map((m) => (
            <option key={m.id} value={m.id}>{m.label}</option>
          ))}
        </select>

        <div style={{ padding: 10, borderRadius: 8, background: "var(--onyx-bg-2)", border: "1px solid var(--onyx-hairline-strong)", marginBottom: 20, fontSize: 13 }}>
          Estimated cost:{" "}
          {estimateLoading ? "…" : estimatedCredits != null ? (
            <b style={{ color: "#fbbf24" }}>{estimatedCredits} credits</b>
          ) : (
            <span style={{ color: "var(--onyx-text-faint)" }}>pick a style to see cost</span>
          )}
        </div>

        {error && (
          <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8, padding: "10px 12px", color: "#f87171", fontSize: 13, marginBottom: 16 }}>
            {error}
          </div>
        )}

        <button
          onClick={handleGenerate}
          disabled={!canGenerate}
          style={{
            width: "100%", padding: "14px 20px", borderRadius: 12, border: "none", fontWeight: 700, fontSize: 15,
            cursor: canGenerate ? "pointer" : "not-allowed",
            background: canGenerate ? "linear-gradient(90deg,#4dd0ff,#b48dff)" : "var(--onyx-bg-2)",
            color: canGenerate ? "#06121b" : "var(--onyx-text-faint)",
          }}
        >
          {generating ? (statusText || "Generating…") : "Generate Clip"}
        </button>
      </div>

      <div>
        <label style={{ display: "block", marginBottom: 10, fontWeight: 600 }}>Style</label>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12 }}>
          {TEMPLATES.map((tpl) => (
            <div
              key={tpl.id}
              onClick={() => setSelectedTemplateId(tpl.id)}
              style={{
                padding: 14, borderRadius: 12, cursor: "pointer",
                border: selectedTemplateId === tpl.id ? `2px solid ${tpl.accentColor}` : "1px solid var(--onyx-hairline-strong)",
                background: "var(--onyx-bg-2)",
              }}
            >
              <div style={{ width: 28, height: 28, borderRadius: 8, background: tpl.accentColor, marginBottom: 10 }} />
              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>{tpl.name}</div>
              <div style={{ fontSize: 11, color: "var(--onyx-text-faint)" }}>{tpl.description}</div>
              <div style={{ fontSize: 10, color: "var(--onyx-text-faint)", marginTop: 6 }}>{tpl.aspectRatio}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
