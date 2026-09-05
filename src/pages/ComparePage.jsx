import { useState } from "react";
import { getAuthHeaders } from "../utils/auth.js";

// Model comparison mode -- first pass (2026-09-06). Lets a user generate the
// same prompt across multiple models and see results side-by-side. Feasibility
// confirmed before building: POST /api/kling/generate already returns a jobId
// immediately (fire-and-forget submit, no shared lock/queue across calls) and
// GET /api/kling/status/:jobId is an independent per-job lookup -- so N models
// are just N ordinary parallel calls to the existing endpoints, no new backend
// surface needed. Deliberately minimal per product direction: no save/export
// of a comparison, no history, plain-CSS single-page UI.
const COMPARE_MODELS = [
  { id: "kling-2.6-pro", label: "Kling 3 Pro", credits: 45 },
  { id: "seedance-1-pro", label: "Seedance 1 Pro", credits: 8 },
  { id: "veo-3", label: "Veo 3.1", credits: 107 },
  { id: "wan-2.5", label: "Wan 2.5", credits: 34 },
];

const DURATION = 5;
const ASPECT_RATIO = "9:16";
const POLL_INTERVAL_MS = 5000;
const POLL_DEADLINE_MS = 20 * 60 * 1000;

function initialResults() {
  return Object.fromEntries(COMPARE_MODELS.map(m => [m.id, { status: "idle", videoUrl: null, thumbnailUrl: null, error: null }]));
}

export default function ComparePage() {
  const [prompt, setPrompt] = useState("");
  const [selected, setSelected] = useState(() => new Set(COMPARE_MODELS.map(m => m.id)));
  const [results, setResults] = useState(initialResults);
  const [running, setRunning] = useState(false);

  function toggleModel(id) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function runOne(modelId) {
    setResults(prev => ({ ...prev, [modelId]: { status: "submitting", videoUrl: null, thumbnailUrl: null, error: null } }));
    try {
      const h = await getAuthHeaders(); h["Content-Type"] = "application/json";
      const submitRes = await fetch("/api/kling/generate", {
        method: "POST",
        headers: h,
        body: JSON.stringify({
          prompt,
          sceneId: modelId,
          aspect_ratio: ASPECT_RATIO,
          duration: DURATION,
          model: modelId,
          brand_id: null,
          image_url: null,
          end_image_url: null,
          resolution: null,
          voiceoverUrl: null,
          voiceoverMultiSpeaker: false,
          reference_mode: null,
        }),
      });
      const submitData = await submitRes.json();
      if (!submitData?.jobId) throw new Error(submitData?.error || "No jobId returned");

      setResults(prev => ({ ...prev, [modelId]: { status: "polling", videoUrl: null, thumbnailUrl: null, error: null } }));

      const deadline = Date.now() + POLL_DEADLINE_MS;
      while (Date.now() < deadline) {
        await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));
        let poll;
        try {
          const ph = await getAuthHeaders();
          poll = await (await fetch(`/api/kling/status/${submitData.jobId}`, { headers: ph })).json();
        } catch {
          continue; // transient poll failure, keep trying until deadline
        }
        if (poll.status === "completed") {
          if (!poll.videoUrl) throw new Error("Completed but no video URL returned");
          setResults(prev => ({ ...prev, [modelId]: { status: "completed", videoUrl: poll.videoUrl, thumbnailUrl: poll.thumbnailUrl, error: null } }));
          return;
        }
        if (poll.status === "failed") throw new Error(poll.error || "Generation failed");
      }
      throw new Error("Timed out waiting for video");
    } catch (e) {
      setResults(prev => ({ ...prev, [modelId]: { status: "failed", videoUrl: null, thumbnailUrl: null, error: e.message || "Failed" } }));
    }
  }

  async function handleRun() {
    if (!prompt.trim() || selected.size === 0 || running) return;
    setRunning(true);
    setResults(initialResults());
    // Fire all selected models in parallel -- each runOne() call manages its
    // own submit+poll loop independently, none block on the others.
    await Promise.all(Array.from(selected).map(id => runOne(id)));
    setRunning(false);
  }

  const selectedCredits = COMPARE_MODELS.filter(m => selected.has(m.id)).reduce((sum, m) => sum + m.credits, 0);

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 24px", color: "var(--onyx-text)" }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>Model Comparison</h1>
      <p style={{ fontSize: 13, color: "var(--onyx-text-faint)", marginBottom: 24 }}>
        Generate the same prompt across multiple models and compare results side-by-side. First-pass tool — one prompt, one fixed {DURATION}s / {ASPECT_RATIO} clip per model.
      </p>

      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Describe the shot you want every model to generate…"
        rows={3}
        style={{ width: "100%", padding: 12, borderRadius: 12, border: "1px solid var(--onyx-hairline-strong)", background: "var(--onyx-bg-2)", color: "var(--onyx-text)", boxSizing: "border-box", marginBottom: 16, fontFamily: "inherit", fontSize: 14 }}
      />

      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 16 }}>
        {COMPARE_MODELS.map(m => (
          <label key={m.id} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer" }}>
            <input type="checkbox" checked={selected.has(m.id)} onChange={() => toggleModel(m.id)} disabled={running} />
            {m.label} <span style={{ color: "var(--onyx-text-faint)" }}>(~{m.credits}cr)</span>
          </label>
        ))}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
        <button
          onClick={handleRun}
          disabled={!prompt.trim() || selected.size === 0 || running}
          style={{
            padding: "12px 24px", borderRadius: 12, border: "none", fontWeight: 700, fontSize: 14,
            cursor: (!prompt.trim() || selected.size === 0 || running) ? "not-allowed" : "pointer",
            background: (!prompt.trim() || selected.size === 0 || running) ? "var(--onyx-bg-2)" : "linear-gradient(90deg,#4dd0ff,#b48dff)",
            color: (!prompt.trim() || selected.size === 0 || running) ? "var(--onyx-text-faint)" : "#06121b",
          }}
        >
          {running ? "Generating…" : `Generate (~${selectedCredits} credits total)`}
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
        {COMPARE_MODELS.filter(m => selected.has(m.id)).map(m => {
          const r = results[m.id];
          return (
            <div key={m.id} style={{ border: "1px solid var(--onyx-hairline-strong)", borderRadius: 12, overflow: "hidden", background: "var(--onyx-bg-2)" }}>
              <div style={{ aspectRatio: "9/16", background: "#000", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {r.status === "completed" && r.videoUrl ? (
                  <video src={r.videoUrl} controls poster={r.thumbnailUrl || undefined} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                ) : r.status === "failed" ? (
                  <span style={{ fontSize: 12, color: "#f87171", padding: 12, textAlign: "center" }}>{r.error}</span>
                ) : r.status === "idle" ? (
                  <span style={{ fontSize: 12, color: "var(--onyx-text-faint)" }}>Not started</span>
                ) : (
                  <span style={{ fontSize: 12, color: "var(--onyx-text-faint)" }}>{r.status === "submitting" ? "Starting…" : "Generating…"}</span>
                )}
              </div>
              <div style={{ padding: "10px 12px", fontSize: 13, fontWeight: 600 }}>{m.label}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
