import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient.js";
import SEO from "../components/SEO";

// TikTok deliberately excluded from this mobile flow -- its publish call
// requires privacy_level + content-disclosure toggles (real platform
// compliance requirements enforced by routes/publish.js, not optional UI),
// which don't fit "lightweight." Desktop Publish.jsx still supports it in
// full; this screen is additive, not a TikTok regression.
const PLATFORMS = [
  { id: "instagram", label: "Instagram", icon: "IG", color: "#E1306C" },
  { id: "linkedin", label: "LinkedIn", icon: "LI", color: "#0077b5" },
  { id: "youtube", label: "YouTube", icon: "▶️", color: "#FF0000" },
];

const STEP_LABELS = { review: "Review", captions: "Captions", trim: "Trim", publish: "Publish" };
// Captions BEFORE trim, deliberately -- not the "review, trim, captions,
// publish" listing order. Caption edits re-render from the FULL original
// scenes array via the existing /api/render pipeline (see applyCaptionEdits),
// while trim cuts whatever the latest render happens to be (see
// POST /reels/:id/trim, which always reads the reel's most recent completed
// render). Trim-then-captions would silently throw the trim away the moment
// a caption got corrected, since that re-render regenerates the untrimmed
// full video from scratch. Captions-then-trim composes correctly either way
// -- caught during self-review, not by a live user hitting it.
const STEPS = ["review", "captions", "trim", "publish"];

function formatDuration(s) {
  if (!Number.isFinite(s)) return "—";
  const m = Math.floor(s / 60);
  const sec = Math.round(s % 60);
  return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
}

// Same 1-credit-per-minute-of-output formula used server-side (routes/
// render.js's downloadCreditsCharged, and the new /render/trim endpoint) --
// duplicated here ONLY to show an upfront estimate before the user commits;
// the real charge is always computed and enforced server-side, this is
// never trusted as the actual cost.
function estimateCredits(durationSeconds) {
  return Math.max(1, Math.ceil(durationSeconds / 60));
}

const card = { background: "var(--onyx-bg-2)", border: "1px solid var(--onyx-hairline-strong)", borderRadius: 12, padding: 16 };
const btnPrimary = { padding: "12px 20px", minHeight: 44, borderRadius: 10, border: "none", background: "linear-gradient(180deg,#5edcff,#2db8ee)", color: "#06121b", fontWeight: 700, fontSize: 14, cursor: "pointer" };
const btnSecondary = { padding: "12px 20px", minHeight: 44, borderRadius: 10, border: "1px solid var(--onyx-hairline-strong)", background: "transparent", color: "var(--onyx-text-dim)", fontWeight: 600, fontSize: 14, cursor: "pointer" };
const btnDanger = { padding: "12px 20px", minHeight: 44, borderRadius: 10, border: "1px solid rgba(239,68,68,0.4)", background: "rgba(239,68,68,0.08)", color: "#f87171", fontWeight: 600, fontSize: 14, cursor: "pointer" };

export default function Review() {
  const navigate = useNavigate();
  // Same one-time-read query-param convention as Publish.jsx/EditorV2 --
  // read once at mount, never re-derived from a changing location.
  const [reelId] = useState(() => new URLSearchParams(window.location.search).get("reelId"));
  const [session, setSession] = useState(null);
  const [step, setStep] = useState("review");
  const [reel, setReel] = useState(null);
  const [render, setRender] = useState(null); // { url, duration }
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  // Credits shown on the review screen for ANY action taken in Phase 2 (trim,
  // caption re-render) -- NOT for the reel's original generation, which
  // isn't recoverable: routes/render.js deducts credits at render time but
  // never persists the charged amount back onto the renders row, and the
  // credit ledger's metadata doesn't carry reel_id either (confirmed during
  // investigation). Rather than show a wrong/guessed number, the original
  // render's cost is simply not shown -- only costs incurred right here.
  const [sessionCreditsSpent, setSessionCreditsSpent] = useState(0);

  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);
  const [trimming, setTrimming] = useState(false);
  const [trimError, setTrimError] = useState("");
  const [trimConfirming, setTrimConfirming] = useState(false);

  const [scenes, setScenes] = useState([]);
  const [captionsDirty, setCaptionsDirty] = useState(false);
  const [applyingCaptions, setApplyingCaptions] = useState(false);
  const [captionError, setCaptionError] = useState("");
  const [captionConfirming, setCaptionConfirming] = useState(false);

  const [canAutopost, setCanAutopost] = useState(false);
  const [accounts, setAccounts] = useState({});
  const [selectedPlatforms, setSelectedPlatforms] = useState([]);
  const [caption, setCaption] = useState("");
  const [hashtags, setHashtags] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [publishMsg, setPublishMsg] = useState({ text: "", type: "" });

  const authHeaders = useCallback((sess) => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${(sess || session)?.access_token}`,
  }), [session]);

  const loadReel = useCallback(async (sess) => {
    setLoading(true);
    setLoadError("");
    try {
      const headers = authHeaders(sess);
      const [reelRes, renderRes] = await Promise.all([
        fetch(`/api/reels/${reelId}`, { headers }),
        fetch(`/api/reels/${reelId}/renders`, { headers }),
      ]);
      if (!reelRes.ok) throw new Error("Reel not found");
      const reelData = await reelRes.json();
      const renderData = await renderRes.json();
      setReel(reelData);
      setScenes(reelData.scenes || []);
      if (renderData.url) {
        setRender({ url: renderData.url, duration: renderData.duration });
        setTrimStart(0);
        setTrimEnd(renderData.duration || 0);
      } else {
        setRender(null);
      }
      setCaption(reelData.title || "");
    } catch (err) {
      setLoadError(err.message || "Failed to load this reel");
    }
    setLoading(false);
  }, [reelId, authHeaders]);

  useEffect(() => {
    if (!reelId) { setLoadError("No reel specified"); setLoading(false); return; }
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) loadReel(session);
    });
    // Mount-once by design (reelId is a one-time useState read, same
    // invariant as EditorV2/Publish.jsx -- it never changes post-mount).
    // MUST NOT depend on loadReel: loadReel's identity changes whenever
    // `session` changes (via authHeaders -> session), and this effect is
    // what calls setSession -- depending on loadReel here created a real
    // infinite render loop, caught live during mocked-UI testing (every
    // render produced a fresh session object reference, re-triggering this
    // effect, re-setting session, re-changing loadReel's identity, forever).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reelId]);

  useEffect(() => {
    if (!session) return;
    (async () => {
      const headers = authHeaders(session);
      const brandsRes = await fetch("/api/brands", { headers }).then(r => r.json()).catch(() => ({}));
      setCanAutopost(brandsRes.canAutopost || false);
      const def = brandsRes.brands?.find(b => b.is_default) || brandsRes.brands?.[0];
      const qs = def ? `?brand_id=${def.id}` : "";
      const accRes = await fetch(`/api/social/accounts${qs}`, { headers }).then(r => r.ok ? r.json() : {}).catch(() => ({}));
      setAccounts(accRes.accounts || {});
    })();
  }, [session, authHeaders]);

  // Shared by trim and caption-edit -- both kick off an async render.js job
  // (POST /render/trim or POST /render) and need to poll the exact same
  // GET /render/status/:jobId shape until it leaves "processing".
  async function pollRenderJob(jobId) {
    for (let i = 0; i < 150; i++) { // ~5 min ceiling at 2s intervals
      const res = await fetch(`/api/render/status/${jobId}`, { headers: authHeaders() });
      const data = await res.json();
      if (data.status === "completed") return { url: data.url, duration: data.duration };
      if (data.status === "failed") throw new Error(data.error || "Render failed");
      await new Promise(r => setTimeout(r, 2000));
    }
    throw new Error("Timed out waiting for render");
  }

  async function applyTrim() {
    setTrimming(true);
    setTrimError("");
    try {
      const res = await fetch(`/api/reels/${reelId}/trim`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ startOffset: trimStart, endOffset: trimEnd }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Trim failed");
      setSessionCreditsSpent(c => c + (data.creditsCharged || 0));
      const result = await pollRenderJob(data.jobId);
      setRender(result);
      setTrimStart(0);
      setTrimEnd(result.duration || 0);
      setTrimConfirming(false);
    } catch (err) {
      setTrimError(err.message || "Trim failed");
    }
    setTrimming(false);
  }

  function updateSceneNarration(idx, text) {
    setScenes(prev => prev.map((s, i) => i === idx ? { ...s, narration: text } : s));
    setCaptionsDirty(true);
  }

  function updateSceneWord(sceneIdx, wordIdx, text) {
    setScenes(prev => prev.map((s, i) => {
      if (i !== sceneIdx) return s;
      const word_timestamps = s.word_timestamps.map((w, wi) => wi === wordIdx ? { ...w, word: text } : w);
      return { ...s, word_timestamps };
    }));
    setCaptionsDirty(true);
  }

  const captionEditEstimatedCredits = estimateCredits(scenes.reduce((sum, s) => sum + (Number(s.duration) || 3), 0));

  // POST /api/render does NOT take the raw reels.scenes array -- confirmed
  // by reading EditorV2's real request builder (buildV2RenderRequest): it
  // expects one object per clip with a `url` field (not `mediaUrl`, which is
  // what scenes are actually stored with -- confirmed against a real
  // production reel, caught before this ever ran for real), built from the
  // full timeline (tracks, transitions, SFX, broll, per-clip trim). This
  // mobile screen has no timeline to draw from, only the reel's scenes
  // array -- same situation Dashboard.jsx's existing Share/Download menu
  // items are already in, and they solve it the same simplified way: map
  // scenes directly, one clip each, no transitions/SFX/broll/global music
  // layered on top. A caption fix from this screen re-renders THIS
  // simplified version, not a byte-identical copy of whatever the desktop
  // editor's timeline would produce -- consistent with the same tradeoff
  // Dashboard's quick-render already makes today, not a new gap.
  function scenesToRenderPayload() {
    return scenes
      .filter(s => s.url || s.mediaUrl)
      .map(s => ({
        type: s.mediaType || "video",
        url: s.url || s.mediaUrl,
        duration: s.duration || 3,
        // Caught during the real live smoke test: routes/render.js's video
        // scenes need explicit trimStart/trimEnd to know how much of the
        // SOURCE file to use -- with neither set, it uses the entire source
        // clip untouched. Real production reels store trimStart/trimEnd on
        // the timeline's per-clip data, never on the top-level scenes[]
        // array this screen actually has access to, so they're reliably
        // absent here. scene.duration (the intended clip length, always
        // present) is the correct fallback for trimEnd -- confirmed by
        // triggering a real re-render without this fix first: a reel whose
        // 4 scenes were meant to total 42s came back as 60.37s, exactly
        // matching the SUM OF THE FULL UNTRIMMED SOURCE CLIPS' real
        // durations (21.3+18.5+9.0+11.6s, verified via ffprobe against the
        // actual Pexels source files) -- not a rounding/estimate mismatch,
        // the pipeline was using entire untrimmed stock clips.
        trimStart: s.trimStart ?? 0,
        trimEnd: s.trimEnd ?? s.duration ?? null,
        voiceoverUrl: s.voiceoverUrl || null,
        narration: s.narration || null,
        // captionsEnabled defaults true whenever there's narration text to
        // burn, rather than trusting the stored flag alone -- confirmed
        // against real production reels during the live smoke test that
        // captionsEnabled is often ABSENT from stored scenes even on reels
        // with visibly burned-in captions (its persistence elsewhere in the
        // save pipeline -- e.g. EditorV2's own save path -- is unreliable,
        // a pre-existing issue not introduced here and out of scope for
        // this screen to fix at the source). Narration presence is what's
        // actually reliable, so it's the real signal this maps against.
        captionsEnabled: s.captionsEnabled ?? !!s.narration,
        caption_style: s.caption_style || "normal",
        word_timestamps: s.word_timestamps || null,
        caption_font_size: s.caption_font_size,
        caption_size: s.caption_size,
        caption_position: s.caption_position,
        caption_color: s.caption_color,
        caption_highlight_color: s.caption_highlight_color,
        caption_bg_color: s.caption_bg_color,
      }));
  }

  async function applyCaptionEdits() {
    setApplyingCaptions(true);
    setCaptionError("");
    try {
      const putRes = await fetch(`/api/reels/${reelId}`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify({ scenes }),
      });
      if (!putRes.ok) { const d = await putRes.json().catch(() => ({})); throw new Error(d.error || "Failed to save caption edits"); }

      // reel.global_music_url -- a music-video reel's background track lives
      // here, separate from the scenes array entirely. Missing this was
      // caught during the real live smoke test against an actual music-video
      // reel: without it, this re-render would have silently come back with
      // no music at all. musicVolume deliberately omitted -- POST /render
      // already defaults it to 60 when absent, matching what this reel's own
      // timeline music clip is set to, so there's no real value stored
      // anywhere else worth threading through for this simplified path.
      const renderRes = await fetch("/api/render", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          scenes: scenesToRenderPayload(), reelId, aspectRatio: reel?.ratio || "9:16", renderMode: "download",
          musicUrl: reel?.global_music_url || "",
        }),
      });
      const renderData = await renderRes.json();
      if (!renderRes.ok) throw new Error(renderData.error || "Re-render failed");
      // POST /render deducts credits itself (existing behavior) but doesn't
      // return the amount charged in its immediate response the way the new
      // /trim endpoint does -- shown as the estimate here since that's the
      // real number that was actually enforced (Math.max(1, Math.ceil(...)),
      // identical formula, just not echoed back by that endpoint today.
      setSessionCreditsSpent(c => c + captionEditEstimatedCredits);
      const result = await pollRenderJob(renderData.jobId);
      setRender(result);
      setCaptionsDirty(false);
      setCaptionConfirming(false);
    } catch (err) {
      setCaptionError(err.message || "Failed to apply caption edits");
    }
    setApplyingCaptions(false);
  }

  function togglePlatform(id) {
    setSelectedPlatforms(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);
  }

  async function handlePublish() {
    if (!render?.url) return setPublishMsg({ text: "No exported video to publish yet", type: "error" });
    if (selectedPlatforms.length === 0) return setPublishMsg({ text: "Select at least one platform", type: "error" });
    if (!canAutopost) return setPublishMsg({ text: "Auto-posting requires an upgrade.", type: "error" });
    setPublishing(true);
    setPublishMsg({ text: "", type: "" });
    const results = [];
    for (const platform of selectedPlatforms) {
      try {
        const res = await fetch("/api/publish/now", {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({ platform, video_url: render.url, caption, hashtags, title: reel?.title }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Publish failed");
        results.push(platform);
      } catch (err) {
        results.push(`FAIL: ${platform}: ${err.message}`);
      }
    }
    const allOk = results.every(r => !r.startsWith("FAIL:"));
    setPublishMsg({ text: results.join(" · "), type: allOk ? "success" : "error" });
    setPublishing(false);
  }

  if (loading) {
    return <div style={{ minHeight: "100vh", background: "var(--onyx-bg)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--onyx-text-faint)" }}>Loading...</div>;
  }
  if (loadError) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--onyx-bg)", color: "var(--onyx-text)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, padding: 24, textAlign: "center" }}>
        <div style={{ fontSize: 15 }}>{loadError}</div>
        <button onClick={() => navigate("/dashboard")} style={btnSecondary}>Back to Dashboard</button>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--onyx-bg)", color: "var(--onyx-text)", fontFamily: "sans-serif" }}>
      <SEO title="Review Reel" description="Review, trim, and publish your reel." path="/review" />
      <div style={{ maxWidth: 520, margin: "0 auto", padding: "20px 16px 60px" }}>
        {/* Persistent back link -- Navbar is suppressed on this route (see
            App.jsx isEditor), same full-screen-flow treatment as /editor, so
            there'd otherwise be no way back to the dashboard mid-flow. */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <button onClick={() => navigate("/dashboard")} style={{ background: "none", border: "none", color: "var(--onyx-text-faint)", fontSize: 13, cursor: "pointer", padding: "8px 0", minHeight: 36 }}>
            ← Dashboard
          </button>
        </div>

        {/* Step indicator -- earlier steps are tappable to go back (state is
            kept, e.g. re-opening "trim" after moving on still shows the last
            trim values); later steps are deliberately NOT skippable this way
            to keep the approve→trim→captions→publish progression intact. */}
        <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
          {STEPS.map((s, i) => {
            const canJump = i < STEPS.indexOf(step);
            return (
              <button key={s} onClick={() => canJump && setStep(s)} disabled={!canJump} style={{
                flex: 1, textAlign: "center", padding: "8px 4px", minHeight: 36, borderRadius: 8, fontSize: 11, fontWeight: 700,
                background: step === s ? "rgba(77,208,255,0.15)" : "var(--onyx-surface)",
                color: step === s ? "var(--onyx-cyan)" : "var(--onyx-text-faint)",
                border: step === s ? "1px solid rgba(77,208,255,0.35)" : "1px solid var(--onyx-hairline-strong)",
                cursor: canJump ? "pointer" : "default",
              }}>
                {STEP_LABELS[s]}
              </button>
            );
          })}
        </div>

        {sessionCreditsSpent > 0 && (
          <div style={{ fontSize: 12, color: "var(--onyx-text-faint)", marginBottom: 12, textAlign: "center" }}>
            {sessionCreditsSpent} credit{sessionCreditsSpent === 1 ? "" : "s"} spent this session
          </div>
        )}

        {render?.url && (
          <video key={render.url} src={render.url} controls playsInline style={{ width: "100%", borderRadius: 12, background: "#000", marginBottom: 16 }} />
        )}
        {!render?.url && (
          <div style={{ ...card, marginBottom: 16, textAlign: "center", color: "var(--onyx-text-faint)", fontSize: 13 }}>
            No exported video for this reel yet. Export it from the desktop editor first.
          </div>
        )}

        {step === "review" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={card}>
              <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 8 }}>{reel?.title || "Untitled Reel"}</div>
              <div style={{ fontSize: 13, color: "var(--onyx-text-faint)" }}>
                Duration: {formatDuration(render?.duration)}
              </div>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                style={{ ...btnDanger, flex: 1 }}
                onClick={() => navigate("/dashboard")}
              >
                Reject
              </button>
              <button
                style={{ ...btnPrimary, flex: 1 }}
                disabled={!render?.url}
                onClick={() => setStep("captions")}
              >
                Approve →
              </button>
            </div>
            <div style={{ fontSize: 11, color: "var(--onyx-text-faint)", textAlign: "center" }}>
              Approve just moves to the next step below — nothing is saved until you actually trim, edit captions, or publish.
            </div>
          </div>
        )}

        {step === "trim" && render?.url && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={card}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Trim start/end</div>
              <label style={{ fontSize: 12, color: "var(--onyx-text-faint)" }}>Start: {trimStart.toFixed(1)}s</label>
              <input type="range" min={0} max={Math.max(render.duration - 0.5, 0)} step={0.1} value={trimStart}
                onChange={e => setTrimStart(Math.min(Number(e.target.value), trimEnd - 0.5))}
                style={{ width: "100%", minHeight: 36 }} />
              <label style={{ fontSize: 12, color: "var(--onyx-text-faint)", marginTop: 10, display: "block" }}>End: {trimEnd.toFixed(1)}s</label>
              <input type="range" min={0.5} max={render.duration || 0} step={0.1} value={trimEnd}
                onChange={e => setTrimEnd(Math.max(Number(e.target.value), trimStart + 0.5))}
                style={{ width: "100%", minHeight: 36 }} />
              <div style={{ fontSize: 12, color: "var(--onyx-text-faint)", marginTop: 8 }}>
                New length: {formatDuration(trimEnd - trimStart)}
              </div>
            </div>

            {trimError && <div style={{ ...card, color: "#f87171", fontSize: 13 }}>{trimError}</div>}

            {!trimConfirming ? (
              <div style={{ display: "flex", gap: 10 }}>
                <button style={{ ...btnSecondary, flex: 1 }} onClick={() => setStep("publish")}>Skip trim →</button>
                <button
                  style={{ ...btnPrimary, flex: 1 }}
                  disabled={trimEnd - trimStart >= (render.duration || 0) - 0.2}
                  onClick={() => setTrimConfirming(true)}
                >
                  Apply Trim
                </button>
              </div>
            ) : (
              <div style={{ ...card, display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ fontSize: 13 }}>
                  This will cost <strong>{estimateCredits(trimEnd - trimStart)} credit{estimateCredits(trimEnd - trimStart) === 1 ? "" : "s"}</strong> and take a moment to process. Continue?
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  <button style={{ ...btnSecondary, flex: 1 }} onClick={() => setTrimConfirming(false)} disabled={trimming}>Cancel</button>
                  <button style={{ ...btnPrimary, flex: 1 }} onClick={applyTrim} disabled={trimming}>
                    {trimming ? "Trimming…" : "Confirm"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {step === "captions" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {/* Same captionsEnabled-unreliable reasoning as
                scenesToRenderPayload above -- a scene with narration text is
                treated as caption-editable even when the stored flag itself
                is missing, since that's what actually determines whether
                anything burns at render time in practice. */}
            {scenes.filter(s => s.captionsEnabled ?? !!s.narration).length === 0 && (
              <div style={{ ...card, color: "var(--onyx-text-faint)", fontSize: 13, textAlign: "center" }}>
                No captions on this reel to edit.
              </div>
            )}
            {scenes.map((s, idx) => {
              if (!(s.captionsEnabled ?? !!s.narration)) return null;
              return (
                <div key={idx} style={card}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--onyx-text-faint)", marginBottom: 8 }}>SCENE {idx + 1}</div>
                  {s.caption_style === "karaoke" && s.word_timestamps?.length ? (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {s.word_timestamps.map((w, wi) => (
                        <input
                          key={wi}
                          value={w.word}
                          onChange={e => updateSceneWord(idx, wi, e.target.value)}
                          style={{ width: Math.max(40, w.word.length * 9 + 16), minHeight: 36, padding: "6px 8px", fontSize: 13, borderRadius: 6, border: "1px solid var(--onyx-hairline-strong)", background: "var(--onyx-bg-2)", color: "var(--onyx-text)" }}
                        />
                      ))}
                    </div>
                  ) : (
                    <textarea
                      value={s.narration || ""}
                      onChange={e => updateSceneNarration(idx, e.target.value)}
                      rows={3}
                      style={{ width: "100%", padding: 10, fontSize: 13, borderRadius: 8, border: "1px solid var(--onyx-hairline-strong)", background: "var(--onyx-bg-2)", color: "var(--onyx-text)", boxSizing: "border-box" }}
                    />
                  )}
                </div>
              );
            })}

            {captionError && <div style={{ ...card, color: "#f87171", fontSize: 13 }}>{captionError}</div>}

            {!captionConfirming ? (
              <div style={{ display: "flex", gap: 10 }}>
                <button style={{ ...btnSecondary, flex: 1 }} onClick={() => setStep("trim")}>
                  {captionsDirty ? "Discard & skip →" : "Skip →"}
                </button>
                <button
                  style={{ ...btnPrimary, flex: 1 }}
                  disabled={!captionsDirty}
                  onClick={() => setCaptionConfirming(true)}
                >
                  Apply Edits
                </button>
              </div>
            ) : (
              <div style={{ ...card, display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ fontSize: 13 }}>
                  Correcting captions re-renders the full video — this will cost <strong>~{captionEditEstimatedCredits} credit{captionEditEstimatedCredits === 1 ? "" : "s"}</strong> and take a moment. Continue?
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  <button style={{ ...btnSecondary, flex: 1 }} onClick={() => setCaptionConfirming(false)} disabled={applyingCaptions}>Cancel</button>
                  <button style={{ ...btnPrimary, flex: 1 }} onClick={applyCaptionEdits} disabled={applyingCaptions}>
                    {applyingCaptions ? "Applying…" : "Confirm"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {step === "publish" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={card}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Platforms</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {PLATFORMS.map(p => {
                  const connected = !!accounts[p.id];
                  const active = selectedPlatforms.includes(p.id);
                  return (
                    <button
                      key={p.id}
                      onClick={() => connected && togglePlatform(p.id)}
                      disabled={!connected}
                      style={{
                        padding: "10px 14px", minHeight: 40, borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: connected ? "pointer" : "not-allowed",
                        border: active ? `1px solid ${p.color}` : "1px solid var(--onyx-hairline-strong)",
                        background: active ? `${p.color}22` : "var(--onyx-surface)",
                        color: connected ? (active ? p.color : "var(--onyx-text-dim)") : "var(--onyx-text-faint)",
                        opacity: connected ? 1 : 0.5,
                      }}
                    >
                      {p.icon} {p.label}{!connected && " (not connected)"}
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={card}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Caption</div>
              <textarea value={caption} onChange={e => setCaption(e.target.value)} rows={4}
                style={{ width: "100%", padding: 10, fontSize: 13, borderRadius: 8, border: "1px solid var(--onyx-hairline-strong)", background: "var(--onyx-bg-2)", color: "var(--onyx-text)", boxSizing: "border-box", marginBottom: 10 }} />
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Hashtags</div>
              <textarea value={hashtags} onChange={e => setHashtags(e.target.value)} rows={2}
                placeholder="#example #tags"
                style={{ width: "100%", padding: 10, fontSize: 13, borderRadius: 8, border: "1px solid var(--onyx-hairline-strong)", background: "var(--onyx-bg-2)", color: "var(--onyx-text)", boxSizing: "border-box" }} />
            </div>

            {!canAutopost && (
              <div style={{ ...card, fontSize: 13, color: "#fbbf24" }}>Auto-posting requires an upgrade to publish from here.</div>
            )}
            {publishMsg.text && (
              <div style={{ ...card, fontSize: 13, color: publishMsg.type === "error" ? "#f87171" : "#4ade80" }}>{publishMsg.text}</div>
            )}

            <button style={btnPrimary} onClick={handlePublish} disabled={publishing || !canAutopost}>
              {publishing ? "Publishing…" : "Publish Now"}
            </button>
            <div style={{ fontSize: 11, color: "var(--onyx-text-faint)", textAlign: "center" }}>
              Need to schedule for later, or post to TikTok? Use Publish &amp; Schedule on desktop.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
