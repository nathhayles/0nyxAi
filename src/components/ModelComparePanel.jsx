import { useState, useEffect } from "react";
import { getAuthHeaders } from "../utils/auth.js";

// First-pass "Model Comparison" tool (backlog item, scoped 2026-09-06):
// generate the same prompt across several video models as independent,
// parallel /api/kling/generate jobs and render them side-by-side once each
// completes. Feasible with ZERO new backend surface -- /api/kling/generate's
// sceneId is a client-side tracking label only, not a real DB foreign key
// (see kling.js's own comment on that param), so N calls with the same
// prompt/aspect_ratio and different `model` values are already fully
// independent jobs. Deliberately NOT wired into the reel/storyboard system --
// this is a throwaway comparison, not a reel-building flow, so no /api/reels
// save happens here (unlike QuickCreatePanel).
const COMPARE_MODELS = [
  { id: "kling-2.6-pro", label: "Kling 3 Pro" },
  { id: "seedance-2.5", label: "Seedance 2.5" },
  { id: "veo-3", label: "Veo 3.1" },
  { id: "wan-2.5", label: "Wan 2.5" },
];

const POLL_INTERVAL_MS = 5000;
const POLL_DEADLINE_MS = 1200000; // 20min, same as QuickCreatePanel/EditorV2 regenerate

function ModelCard({ modelId, label, job }) {
  const status = job?.status || "idle";
  return (
    <div style={{
      border: "1px solid var(--onyx-hairline-strong)", borderRadius: 12,
      background: "var(--onyx-bg-2)", overflow: "hidden", display: "flex", flexDirection: "column",
    }}>
      <div style={{
        padding: "10px 14px", fontWeight: 700, fontSize: 13,
        borderBottom: "1px solid var(--onyx-hairline-strong)",
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <span>{label}</span>
        {job?.credits != null && (
          <span style={{ fontSize: 11, fontWeight: 600, color: "#fbbf24" }}>{job.credits}cr</span>
        )}
      </div>
      <div style={{ aspectRatio: "9/16", width: "100%", background: "#000", display: "flex", alignItems: "center", justifyContent: "center" }}>
        {status === "completed" && job.videoUrl ? (
          <video src={job.videoUrl} controls style={{ width: "100%", height: "100%", objectFit: "contain" }} />
        ) : status === "failed" ? (
          <div style={{ color: "#f87171", fontSize: 12, padding: 16, textAlign: "center" }}>
            {job?.error || "Generation failed"}
          </div>
        ) : status === "generating" ? (
          <div style={{ color: "var(--onyx-text-faint)", fontSize: 12, padding: 16, textAlign: "center" }}>
            Generating…
          </div>
        ) : (
          <div style={{ color: "var(--onyx-text-faint)", fontSize: 12 }}>Not started</div>
        )}
      </div>
    </div>
  );
}

export default function ModelComparePanel({ brand }) {
  const [prompt, setPrompt] = useState("");
  const [aspectRatio, setAspectRatio] = useState("9:16");
  const [duration, setDuration] = useState(5);
  const [selectedModels, setSelectedModels] = useState(() => new Set(COMPARE_MODELS.map(m => m.id)));

  const [estimates, setEstimates] = useState({}); // modelId -> credits | null
  const [estimateLoading, setEstimateLoading] = useState(false);

  const [running, setRunning] = useState(false);
  const [jobs, setJobs] = useState({}); // modelId -> { jobId, status, videoUrl, error, credits }
  const [error, setError] = useState("");

  const activeModels = COMPARE_MODELS.filter(m => selectedModels.has(m.id));

  // Live per-model cost estimate + running total, same pattern as
  // QuickCreatePanel/StoryboardPanel (calls the real getSceneCost() endpoint,
  // no client-side pricing math to keep in sync).
  useEffect(() => {
    if (activeModels.length === 0) { setEstimates({}); return; }
    let cancelled = false;
    setEstimateLoading(true);
    const timer = setTimeout(async () => {
      try {
        const headers = await getAuthHeaders();
        const results = await Promise.all(activeModels.map(async (m) => {
          try {
            const params = new URLSearchParams({ model: m.id, duration: String(duration), aspect_ratio: aspectRatio });
            const res = await fetch(`/api/models/estimate-cost?${params}`, { headers });
            const data = await res.json();
            return [m.id, typeof data.credits === "number" ? data.credits : null];
          } catch {
            return [m.id, null];
          }
        }));
        if (!cancelled) setEstimates(Object.fromEntries(results));
      } finally {
        if (!cancelled) setEstimateLoading(false);
      }
    }, 400);
    return () => { cancelled = true; clearTimeout(timer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [duration, aspectRatio, selectedModels.size]);

  const totalEstimate = Object.values(estimates).reduce((sum, c) => (typeof c === "number" ? sum + c : sum), 0);
  const canGenerate = prompt.trim().length > 0 && activeModels.length >= 2 && !running;

  function toggleModel(id) {
    setSelectedModels((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function pollOne(modelId, jobId) {
    const deadline = Date.now() + POLL_DEADLINE_MS;
    while (Date.now() < deadline) {
      await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));
      let poll;
      try {
        const headers = await getAuthHeaders();
        poll = await (await fetch(`/api/kling/status/${jobId}`, { headers })).json();
      } catch (pollErr) {
        console.warn(`[ModelCompare] poll transient failure for ${modelId}, retrying:`, pollErr);
        continue;
      }
      if (poll.status === "completed") {
        if (!poll.videoUrl) {
          setJobs(prev => ({ ...prev, [modelId]: { ...prev[modelId], status: "failed", error: "Completed but no video URL returned" } }));
          return;
        }
        setJobs(prev => ({ ...prev, [modelId]: { ...prev[modelId], status: "completed", videoUrl: poll.videoUrl, thumbnailUrl: poll.thumbnailUrl } }));
        return;
      }
      if (poll.status === "failed") {
        setJobs(prev => ({ ...prev, [modelId]: { ...prev[modelId], status: "failed", error: poll.error || "Generation failed" } }));
        return;
      }
    }
    setJobs(prev => ({ ...prev, [modelId]: { ...prev[modelId], status: "failed", error: "Timed out waiting for video" } }));
  }

  async function handleGenerateAll() {
    if (!canGenerate) return;
    setRunning(true);
    setError("");
    const initialJobs = {};
    for (const m of activeModels) initialJobs[m.id] = { status: "generating", credits: estimates[m.id] ?? null };
    setJobs(initialJobs);

    try {
      const headers = await getAuthHeaders(); headers["Content-Type"] = "application/json";
      // Fire all N submissions in parallel -- each is an independent job,
      // no shared state, no reel/scene wrapper needed.
      await Promise.all(activeModels.map(async (m) => {
        try {
          const res = await fetch("/api/kling/generate", {
            method: "POST",
            headers,
            body: JSON.stringify({
              prompt: prompt.trim(),
              sceneId: `compare-${m.id}`,
              aspect_ratio: aspectRatio,
              duration,
              model: m.id,
              brand_id: brand || null,
              image_url: null,
              end_image_url: null,
              resolution: null,
              voiceoverUrl: null,
              voiceoverMultiSpeaker: false,
              reference_mode: null,
            }),
          });
          const data = await res.json();
          if (!data.jobId) throw new Error(data.error || "No jobId returned");
          setJobs(prev => ({ ...prev, [m.id]: { ...prev[m.id], jobId: data.jobId } }));
          await pollOne(m.id, data.jobId);
        } catch (e) {
          setJobs(prev => ({ ...prev, [m.id]: { ...prev[m.id], status: "failed", error: e.message || "Submission failed" } }));
        }
      }));
    } catch (e) {
      setError(e.message || "Failed to start comparison");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div>
      <label style={{ display: "block", marginBottom: 10, fontWeight: 600 }}>Prompt</label>
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Describe the shot you want to compare across models…"
        rows={3}
        style={{
          width: "100%", padding: 12, borderRadius: 12, border: "1px solid var(--onyx-hairline-strong)",
          background: "var(--onyx-bg-2)", color: "var(--onyx-text)", marginBottom: 20, boxSizing: "border-box",
          fontFamily: "inherit", fontSize: 14, resize: "vertical",
        }}
      />

      <div style={{ display: "flex", gap: 20, marginBottom: 20, flexWrap: "wrap" }}>
        <div>
          <label style={{ display: "block", marginBottom: 8, fontWeight: 600, fontSize: 13 }}>Aspect ratio</label>
          <select
            value={aspectRatio}
            onChange={(e) => setAspectRatio(e.target.value)}
            style={{ padding: 10, borderRadius: 8, border: "1px solid var(--onyx-hairline-strong)", background: "var(--onyx-bg-2)", color: "var(--onyx-text)" }}
          >
            <option value="9:16">9:16 (vertical)</option>
            <option value="16:9">16:9 (horizontal)</option>
            <option value="1:1">1:1 (square)</option>
          </select>
        </div>
        <div>
          <label style={{ display: "block", marginBottom: 8, fontWeight: 600, fontSize: 13 }}>Duration</label>
          <input
            type="range" min={3} max={10} step={1} value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
          />
          <span style={{ marginLeft: 8, fontSize: 12, color: "var(--onyx-text-faint)" }}>{duration}s</span>
        </div>
      </div>

      <label style={{ display: "block", marginBottom: 10, fontWeight: 600 }}>Models to compare (pick at least 2)</label>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
        {COMPARE_MODELS.map((m) => {
          const selected = selectedModels.has(m.id);
          return (
            <button
              key={m.id}
              onClick={() => toggleModel(m.id)}
              disabled={running}
              style={{
                padding: "8px 14px", borderRadius: 999, fontSize: 13, fontWeight: 600,
                cursor: running ? "not-allowed" : "pointer",
                border: selected ? "1px solid var(--onyx-cyan)" : "1px solid var(--onyx-hairline-strong)",
                background: selected ? "rgba(77,208,255,0.12)" : "transparent",
                color: selected ? "var(--onyx-cyan)" : "var(--onyx-text-dim)",
              }}
            >
              {m.label}{typeof estimates[m.id] === "number" ? ` · ${estimates[m.id]}cr` : ""}
            </button>
          );
        })}
      </div>

      <div style={{ padding: 10, borderRadius: 8, background: "var(--onyx-bg-2)", border: "1px solid var(--onyx-hairline-strong)", marginBottom: 16, fontSize: 13 }}>
        Total estimated cost across {activeModels.length} model{activeModels.length === 1 ? "" : "s"}:{" "}
        {estimateLoading ? "…" : <b style={{ color: "#fbbf24" }}>{totalEstimate} credits</b>}
      </div>

      {error && (
        <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8, padding: "10px 12px", color: "#f87171", fontSize: 13, marginBottom: 16 }}>
          {error}
        </div>
      )}

      <button
        onClick={handleGenerateAll}
        disabled={!canGenerate}
        style={{
          padding: "14px 24px", borderRadius: 12, border: "none", fontWeight: 700, fontSize: 15,
          cursor: canGenerate ? "pointer" : "not-allowed",
          background: canGenerate ? "linear-gradient(90deg,#4dd0ff,#b48dff)" : "var(--onyx-bg-2)",
          color: canGenerate ? "#06121b" : "var(--onyx-text-faint)",
          marginBottom: 24,
        }}
      >
        {running ? "Generating all…" : "Generate all"}
      </button>

      {Object.keys(jobs).length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16 }}>
          {activeModels.map((m) => (
            <ModelCard key={m.id} modelId={m.id} label={m.label} job={jobs[m.id]} />
          ))}
        </div>
      )}
    </div>
  );
}
