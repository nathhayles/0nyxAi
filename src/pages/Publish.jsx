import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient.js";

const PLATFORMS = [
  { id: "instagram", label: "Instagram", icon: "IG", color: "#E1306C" },
  { id: "tiktok",   label: "TikTok",    icon: "TT", color: "#69C9D0" },
  { id: "linkedin", label: "LinkedIn",  icon: "LI", color: "#0077b5" },
  { id: "youtube",  label: "YouTube",   icon: "▶️",  color: "#FF0000" },
];

const STATUS_STYLES = {
  published: { bg: "rgba(34,197,94,0.15)",  color: "#4ade80" },
  failed:    { bg: "rgba(239,68,68,0.15)",  color: "#f87171" },
  scheduled: { bg: "rgba(250,204,21,0.15)", color: "#fbbf24" },
};

export default function Publish() {
  const [session, setSession]                     = useState(null);
  const [brands, setBrands]                       = useState([]);
  const [selectedBrandId, setSelectedBrandId]     = useState(null);
  const [canAutopost, setCanAutopost]             = useState(false);
  const [plan, setPlan]                           = useState("starter");
  const [accounts, setAccounts]                   = useState({});
  const [projects, setProjects]                   = useState([]);
  const [selectedPlatforms, setSelectedPlatforms] = useState([]);
  const [selectedProject, setSelectedProject]     = useState(null);
  const [selectedVideoDurationSec, setSelectedVideoDurationSec] = useState(null);
  const [caption, setCaption]                     = useState("");
  const [hashtags, setHashtags]                   = useState("");
  const [scheduleAt, setScheduleAt]               = useState("");
  const [posts, setPosts]                         = useState([]);
  const [loading, setLoading]                     = useState(true);
  const [submitting, setSubmitting]               = useState(false);
  const [msg, setMsg]                             = useState({ text: "", type: "" });
  const [aiPrompt, setAiPrompt]                   = useState('');
  const [generatingCaption, setGeneratingCaption] = useState(false);
  const [trialStatus, setTrialStatus]             = useState({ is_trial: false, trial_expired: false, days_remaining: null, has_paid_plan: false });
  const [tiktokInfo, setTiktokInfo]               = useState(null);
  const [tiktokInfoLoading, setTiktokInfoLoading] = useState(false);
  const [tiktokInfoError, setTiktokInfoError]     = useState("");
  const [tiktokPrivacy, setTiktokPrivacy]         = useState("");
  const [tiktokAllowComment, setTiktokAllowComment] = useState(true);
  const [tiktokAllowDuet, setTiktokAllowDuet]       = useState(true);
  const [tiktokAllowStitch, setTiktokAllowStitch]   = useState(true);
  const [tiktokDisclosureEnabled, setTiktokDisclosureEnabled] = useState(false);
  const [tiktokBrandOrganic, setTiktokBrandOrganic] = useState(false);
  const [tiktokBrandContent, setTiktokBrandContent] = useState(false);
  const [tiktokPrivacyAutoSwitchNotice, setTiktokPrivacyAutoSwitchNotice] = useState("");
  const [tiktokPublishStatus, setTiktokPublishStatus] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        loadAll(session);
        fetch("/api/user/me", { headers: { Authorization: `Bearer ${session.access_token}` } })
          .then(r => r.ok ? r.json() : null)
          .then(d => { if (d) setTrialStatus(d); })
          .catch(() => {});
      }
    });
  }, []);

  useEffect(() => {
    if (!session) return;
    loadAccounts(session, selectedBrandId);
  }, [session, selectedBrandId]);

  useEffect(() => {
    if (!session || !selectedPlatforms.includes("tiktok") || !accounts.tiktok) {
      setTiktokInfo(null);
      return;
    }
    setTiktokInfoLoading(true);
    setTiktokInfoError("");
    const qs = selectedBrandId ? `?brand_id=${selectedBrandId}` : "";
    fetch(`/api/social/tiktok/creator-info${qs}`, { headers: { Authorization: `Bearer ${session.access_token}` } })
      .then(r => r.ok ? r.json() : Promise.reject(new Error("Failed to load TikTok account options")))
      .then(info => {
        setTiktokInfo(info);
        // No default privacy value, deliberately -- TikTok's guideline requires
        // the user to make an explicit selection, not have one silently
        // pre-chosen for them. tiktokPrivacy stays "" until they pick one; the
        // dropdown shows a disabled placeholder option, and publish is blocked
        // until a real choice is made (see handlePublishNow).
        setTiktokPrivacy("");
        setTiktokAllowComment(!info.comment_disabled);
        setTiktokAllowDuet(!info.duet_disabled);
        setTiktokAllowStitch(!info.stitch_disabled);
      })
      .catch(err => setTiktokInfoError(err.message))
      .finally(() => setTiktokInfoLoading(false));
  }, [session, selectedPlatforms, accounts.tiktok, selectedBrandId]);

  // Probes the ACTUAL video file's real duration rather than trusting any
  // stored/summed value -- this project has a documented history of stored
  // duration figures going stale vs. the real rendered file (see the
  // lip-sync duration-mismatch investigation), and neither `reels` nor
  // `renders` stores a duration column at all today, so there's nothing
  // reliable to read instead. Used by the TikTok max-duration guard below.
  useEffect(() => {
    const url = selectedProject?.output_url || selectedProject?.render_url;
    setSelectedVideoDurationSec(null);
    if (!url) return;
    const videoEl = document.createElement("video");
    videoEl.preload = "metadata";
    videoEl.onloadedmetadata = () => setSelectedVideoDurationSec(videoEl.duration || null);
    videoEl.onerror = () => setSelectedVideoDurationSec(null);
    videoEl.src = url;
  }, [selectedProject]);

  const PRIVACY_LABELS = {
    PUBLIC_TO_EVERYONE: "Everyone",
    MUTUAL_FOLLOW_FRIENDS: "Friends",
    FOLLOWER_OF_CREATOR: "Followers",
    SELF_ONLY: "Only me",
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const reelIdParam = params.get("reelId");
    if (reelIdParam && projects.length > 0) {
      const found = projects.find(p => p.id === reelIdParam);
      if (found) {
        setSelectedProject(found);
        if (found.title && found.title !== 'Untitled Reel') setAiPrompt(found.title);
      }
    }
  }, [projects]);

  async function getHeaders(sess) {
    const s = sess || session;
    return { "Content-Type": "application/json", Authorization: `Bearer ${s.access_token}` };
  }

  async function loadAll(sess) {
    const headers = { Authorization: `Bearer ${sess.access_token}` };
    const [brandsRes, projectsRes, postsRes] = await Promise.all([
      fetch("/api/brands", { headers }).then(r => r.json()),
      fetch("/api/reels/for-publish", { headers }).then(r => r.json()),
      fetch("/api/publish/posts", { headers }).then(r => r.json()),
    ]);
    if (brandsRes.brands) {
      setBrands(brandsRes.brands);
      setCanAutopost(brandsRes.canAutopost || false);
      setPlan(brandsRes.plan || "starter");
      const def = brandsRes.brands.find(b => b.is_default) || brandsRes.brands[0];
      if (def) { setSelectedBrandId(def.id); await loadAccounts(sess, def.id); }
    }
    setProjects(projectsRes.projects || []);
    setPosts(postsRes.posts || []);
    setLoading(false);
  }

  async function loadAccounts(sess, brandId) {
    const headers = { Authorization: `Bearer ${sess.access_token}` };
    const qs = brandId ? `?brand_id=${brandId}` : "";
    const res = await fetch(`/api/social/accounts${qs}`, { headers });
    if (res.ok) { const d = await res.json(); setAccounts(d.accounts || {}); }
  }

  function togglePlatform(id) {
    setSelectedPlatforms(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  }

  const TIKTOK_TERMINAL_STATUSES = new Set(["PUBLISH_COMPLETE", "SEND_TO_USER_INBOX", "FAILED"]);

  // TikTok's guideline requires clients to surface real post-publish status,
  // not just assume success the moment the upload call returns 2xx -- a
  // publish can still fail downstream (encoding, moderation, etc.) after
  // this app has already told the user it succeeded. Polls every 3s, up to
  // 20 times (~60s), stopping early on any terminal status.
  async function pollTiktokPublishStatus(publishId) {
    setTiktokPublishStatus({ status: "PROCESSING", failReason: null });
    for (let attempt = 0; attempt < 20; attempt++) {
      await new Promise(r => setTimeout(r, 3000));
      try {
        const qs = selectedBrandId ? `?brand_id=${selectedBrandId}` : "";
        const res = await fetch(`/api/social/tiktok/publish-status/${publishId}${qs}`, {
          headers: { Authorization: `Bearer ${session?.access_token}` },
        });
        if (!res.ok) continue; // transient fetch error -- keep polling rather than giving up
        const data = await res.json();
        setTiktokPublishStatus({ status: data.status, failReason: data.fail_reason });
        if (TIKTOK_TERMINAL_STATUSES.has(data.status)) return;
      } catch (_) {
        // network hiccup -- keep polling, same as a non-ok response above
      }
    }
    // Gave up after ~60s without a terminal status -- not necessarily a
    // failure, TikTok's own processing can take longer than that. Leave
    // whatever the last-seen status was rather than overwriting with an
    // invented "unknown" state.
  }

  async function handlePublishNow() {
    if (trialStatus.trial_expired) return setMsg({ text: "Your trial has expired. Upgrade to publish.", type: "error" });
    if (!selectedProject) return setMsg({ text: "Select a project first", type: "error" });
    if (selectedPlatforms.length === 0) return setMsg({ text: "Select at least one platform", type: "error" });
    if (!canAutopost) return setMsg({ text: "Auto-posting requires an upgrade.", type: "error" });
    if (selectedPlatforms.includes("tiktok") && !tiktokPrivacy) return setMsg({ text: "Choose who can view this video on TikTok before publishing.", type: "error" });
    if (selectedPlatforms.includes("tiktok") && tiktokInfo?.creator_can_post === false) return setMsg({ text: "TikTok says you can't post right now. Please try again later.", type: "error" });
    if (selectedPlatforms.includes("tiktok") && tiktokInfo?.max_video_post_duration_sec && selectedVideoDurationSec && selectedVideoDurationSec > tiktokInfo.max_video_post_duration_sec) {
      return setMsg({ text: `This video (${Math.round(selectedVideoDurationSec)}s) is longer than TikTok's ${tiktokInfo.max_video_post_duration_sec}s limit for this account.`, type: "error" });
    }
    if (tiktokDisclosureIncomplete) return setMsg({ text: "Select 'Your Brand' or 'Branded Content' (or both) to disclose this content, or turn off Content Disclosure Setting.", type: "error" });
    setSubmitting(true); setMsg({ text: "", type: "" }); setTiktokPublishStatus(null);
    const results = [];
    const headers = { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` };
    const videoUrl = selectedProject.output_url || selectedProject.render_url;
    for (const platform of selectedPlatforms) {
      try {
        const tiktokFields = platform === "tiktok" ? {
          privacy_level: tiktokPrivacy || null,
          disable_comment: !tiktokAllowComment,
          disable_duet: !tiktokAllowDuet,
          disable_stitch: !tiktokAllowStitch,
          brand_organic_toggle: tiktokBrandOrganic,
          brand_content_toggle: tiktokBrandContent,
        } : {};
        const res = await fetch("/api/publish/now", {
          method: "POST", headers,
          body: JSON.stringify({ platform, video_url: videoUrl, caption, hashtags, title: selectedProject.title, brand_id: selectedBrandId, ...tiktokFields }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Publish failed");
        results.push(platform);
        if (platform === "tiktok" && data.publishId) {
          pollTiktokPublishStatus(data.publishId); // fire-and-forget -- updates tiktokPublishStatus as it goes, doesn't block this loop
        }
      } catch (err) {
        results.push(`FAIL: ${platform}: ${err.message}`);
      }
    }
    const allOk = results.every(r => !r.startsWith("FAIL:"));
    setMsg({ text: results.join(" · "), type: allOk ? "success" : "error" });
    if (allOk) { setCaption(""); setHashtags(""); }
    setSubmitting(false);
  }

  async function handleSchedule() {
    if (trialStatus.trial_expired) return setMsg({ text: "Your trial has expired. Upgrade to schedule posts.", type: "error" });
    if (!selectedProject) return setMsg({ text: "Select a project", type: "error" });
    if (!scheduleAt) return setMsg({ text: "Pick a schedule time", type: "error" });
    if (selectedPlatforms.length === 0) return setMsg({ text: "Select at least one platform", type: "error" });
    const unconnected = selectedPlatforms.filter(p => !accounts[p]);
    if (unconnected.length > 0) return setMsg({ text: `Connect your ${unconnected.join(", ")} account(s) first`, type: "error" });
    if (!canAutopost) return setMsg({ text: "Auto-posting requires an upgrade.", type: "error" });
    setSubmitting(true); setMsg({ text: "", type: "" });
    const results = [];
    for (const platform of selectedPlatforms) {
      try {
        const headers = { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` };
        const res = await fetch("/api/publish/schedule", {
          method: "POST", headers,
          body: JSON.stringify({ platform, video_url: selectedProject.output_url || selectedProject.render_url, caption, hashtags, title: selectedProject.title, post_at: new Date(scheduleAt).toISOString(), brand_id: selectedBrandId }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Schedule failed");
        results.push(platform);
      } catch (err) {
        results.push(`FAIL: ${platform}: ${err.message}`);
      }
    }
    const allOk = results.every(r => !r.startsWith("FAIL:"));
    setMsg({ text: `${results.join(" · ")} · ${new Date(scheduleAt).toLocaleString()}`, type: allOk ? "success" : "error" });
    if (allOk) { setCaption(""); setHashtags(""); setScheduleAt(""); }
    setSubmitting(false);
  }

  async function generateCaption() {
    if (!aiPrompt.trim()) return;
    setGeneratingCaption(true);
    try {
      const headers = { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` };
      const res = await fetch('/api/analyse/caption', {
        method: 'POST', headers,
        body: JSON.stringify({ prompt: aiPrompt, platform: selectedPlatforms[0] || 'instagram' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Generation failed');
      if (data.caption) setCaption(data.caption);
      if (data.hashtags) setHashtags(data.hashtags);
    } catch (err) {
      setMsg({ text: err.message, type: 'error' });
    }
    setGeneratingCaption(false);
  }

  async function connectPlatform(platformId) {
    if (!canAutopost) { window.location.href = "/account"; return; }
    const headers = await getHeaders();
    const qs = selectedBrandId ? `?brand_id=${selectedBrandId}` : "";
    const res = await fetch(`/api/social/${platformId}/auth${qs}`, { headers });
    const data = await res.json();
    if (data.authUrl) window.location.href = data.authUrl;
    else setMsg({ text: data.error || `Failed to connect ${platformId}`, type: "error" });
  }

  const card   = { background: "var(--onyx-bg-2)", border: "1px solid var(--onyx-hairline-strong)", borderRadius: 12, padding: 24, marginBottom: 16 };
  const inputS = { width: "100%", background: "var(--onyx-bg-2)", border: "1px solid var(--onyx-hairline-strong)", color: "#e2e8f0", borderRadius: 8, padding: "10px 14px", fontSize: 14, boxSizing: "border-box", outline: "none", marginTop: 6 };
  const allConnected = selectedPlatforms.length > 0 && selectedPlatforms.every(p => accounts[p]);
  const selectedBrand = brands.find(b => b.id === selectedBrandId);
  // TikTok's guideline: "at least one of the options above [Your Brand /
  // Branded Content] must be chosen to proceed with publishing... If neither
  // is selected, the publish button remains disabled" -- only applies once
  // the disclosure toggle itself is on; the toggle being off is a valid,
  // fully-allowed state (this content simply isn't commercial).
  const tiktokDisclosureIncomplete = selectedPlatforms.includes("tiktok") && tiktokDisclosureEnabled && !tiktokBrandOrganic && !tiktokBrandContent;
  const canSubmit = !submitting && selectedPlatforms.length > 0 && allConnected && canAutopost && !tiktokDisclosureIncomplete;

  if (loading) return <div style={{ minHeight: "100vh", background: "var(--onyx-bg)", display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b" }}>Loading...</div>;

  return (
    <div style={{ minHeight: "100vh", background: "var(--onyx-bg)", color: "var(--onyx-text)", fontFamily: "sans-serif" }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "40px 24px" }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, marginBottom: 4 }}>Publish & Schedule</h1>
        <p style={{ color: "#64748b", fontSize: 14, marginBottom: 28 }}>Post your rendered reels directly to social media or schedule for later.</p>

        {trialStatus.trial_expired && (
          <div style={{ ...card, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, marginBottom: 20 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#f87171", marginBottom: 4 }}>Trial Expired</div>
              <div style={{ fontSize: 12, color: "#94a3b8" }}>Your 14-day free trial has ended. Upgrade to keep publishing.</div>
            </div>
            <button onClick={() => window.location.href = "/pricing"} style={{ padding: "9px 18px", borderRadius: 8, border: "none", whiteSpace: "nowrap", background: "#ef4444", color: "#fff", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>Upgrade →</button>
          </div>
        )}

        {trialStatus.is_trial && trialStatus.days_remaining != null && (
          <div style={{ ...card, background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.25)", marginBottom: 20 }}>
            <div style={{ fontSize: 13, color: "#fbbf24" }}>
              Free trial — <strong>{trialStatus.days_remaining} day{trialStatus.days_remaining !== 1 ? "s" : ""}</strong> remaining.{" "}
              <a href="/pricing" style={{ color: "#fbbf24", textDecoration: "underline" }}>Upgrade anytime →</a>
            </div>
          </div>
        )}

        {!canAutopost && (
          <div style={{ ...card, background: "linear-gradient(135deg, rgba(77,208,255,0.1), rgba(29,78,216,0.1))", border: "1px solid rgba(77,208,255,0.3)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#e2e8f0", marginBottom: 4 }}>Auto-posting not active</div>
              <div style={{ fontSize: 12, color: "#94a3b8" }}>{plan === "starter" || plan === "creator" ? "Add the $15/mo Auto-posting add-on, or upgrade to Pro/Agency." : "Upgrade to Pro or Agency to unlock auto-publishing."}</div>
            </div>
            <button onClick={() => window.location.href = "/account"} style={{ padding: "9px 18px", borderRadius: 8, border: "none", whiteSpace: "nowrap", background: "var(--btn-primary-grad)", color: "var(--btn-primary-text)", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>Upgrade →</button>
          </div>
        )}

        {brands.length > 0 && (
          <div style={card}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 12 }}>Publishing as Brand</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {brands.map(b => (
                <button key={b.id} onClick={() => setSelectedBrandId(b.id)} style={{ padding: "7px 16px", borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: "pointer", border: selectedBrandId === b.id ? "1px solid #4dd0ff" : "1px solid var(--onyx-hairline-strong)", background: selectedBrandId === b.id ? "rgba(77,208,255,0.15)" : "var(--onyx-surface)", color: selectedBrandId === b.id ? "#7de0ff" : "#64748b" }}>
                  {b.brand_label || "Unnamed"}{b.is_default && <span style={{ marginLeft: 5, fontSize: 9, opacity: 0.6 }}>DEFAULT</span>}
                </button>
              ))}
            </div>
            {selectedBrand && <div style={{ fontSize: 11, color: "#475569", marginTop: 10 }}>Social accounts connected under <span style={{ color: "#7de0ff" }}>{selectedBrand.brand_label}</span> will be used.</div>}
          </div>
        )}

        <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
          {PLATFORMS.map(p => {
            const selected = selectedPlatforms.includes(p.id);
            return (
              <button key={p.id} onClick={() => togglePlatform(p.id)} style={{ padding: "8px 18px", borderRadius: 20, border: selected ? `2px solid ${p.color}` : "1px solid var(--onyx-hairline-strong)", background: selected ? `${p.color}22` : "var(--onyx-surface)", color: selected ? p.color : "#64748b", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
                {p.icon} {p.label}{accounts[p.id] && <span style={{ marginLeft: 6, fontSize: 10, color: "#4ade80" }}>●</span>}
              </button>
            );
          })}
        </div>
        <div style={{ fontSize: 11, color: "#475569", marginBottom: 16 }}>Select one or more platforms to publish to.</div>

        {selectedPlatforms.length > 0 && (
          <div style={{ ...card, padding: "14px 20px" }}>
            {selectedPlatforms.map(pid => {
              const platform = PLATFORMS.find(p => p.id === pid);
              const connected = !!accounts[pid];
              return (
                <div key={pid} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingBottom: selectedPlatforms[selectedPlatforms.length - 1] !== pid ? 10 : 0, marginBottom: selectedPlatforms[selectedPlatforms.length - 1] !== pid ? 10 : 0, borderBottom: selectedPlatforms[selectedPlatforms.length - 1] !== pid ? "1px solid var(--onyx-hairline-strong)" : "none" }}>
                  <div>
                    <span style={{ fontSize: 13, color: "#94a3b8" }}>{platform?.icon} {platform?.label}: </span>
                    {connected
                      ? <span style={{ fontSize: 13, fontWeight: 600, color: "#4ade80" }}>@{accounts[pid]}</span>
                      : <span style={{ fontSize: 13, color: "#ef4444" }}>Not connected{selectedBrand ? ` for ${selectedBrand.brand_label}` : ""}</span>
                    }
                  </div>
                  {!connected && (
                    <button onClick={() => connectPlatform(pid)} style={{ padding: "7px 16px", borderRadius: 8, border: "none", background: canAutopost ? (platform?.color || "var(--btn-primary-grad)") : "#4dd0ff", color: "#fff", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
                      {canAutopost ? `Connect ${platform?.label}` : "Upgrade to Connect"}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {selectedPlatforms.includes("tiktok") && accounts.tiktok && (
          <div style={{ ...card, padding: "14px 20px" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 12 }}>TikTok Options</div>
            {tiktokInfoLoading && <div style={{ fontSize: 13, color: "#64748b" }}>Loading account options…</div>}
            {tiktokInfoError && <div style={{ fontSize: 13, color: "#ef4444" }}>{tiktokInfoError}</div>}
            {tiktokInfo && !tiktokInfoLoading && tiktokInfo.creator_can_post === false && (
              <div style={{ fontSize: 13, color: "#ef4444" }}>
                TikTok says you can't post right now{tiktokInfo.creator_cant_post_reason === "spam_risk_user_banned_from_posting" ? " — this account is currently restricted from posting" : " — you've reached your posting limit for now"}. Please try again later.
              </div>
            )}
            {tiktokInfo && !tiktokInfoLoading && tiktokInfo.creator_can_post !== false && (
              <>
                <div style={{ fontSize: 13, color: "#94a3b8", marginBottom: 12 }}>
                  Posting as <strong style={{ color: "#e2e8f0" }}>{tiktokInfo.creator_nickname ? `${tiktokInfo.creator_nickname} (@${tiktokInfo.creator_username})` : `@${tiktokInfo.creator_username || accounts.tiktok}`}</strong>
                </div>
                <div style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: 12, color: "#94a3b8" }}>Who can view this video</label>
                  <select style={{ ...inputS }} value={tiktokPrivacy} onChange={e => { setTiktokPrivacy(e.target.value); setTiktokPrivacyAutoSwitchNotice(""); }}>
                    <option value="" disabled>Select who can view this video…</option>
                    {(tiktokInfo.privacy_level_options || []).map(opt => (
                      <option key={opt} value={opt} disabled={tiktokBrandContent && opt === "SELF_ONLY"}>
                        {PRIVACY_LABELS[opt] || opt}{tiktokBrandContent && opt === "SELF_ONLY" ? " (unavailable for branded content)" : ""}
                      </option>
                    ))}
                  </select>
                  {tiktokPrivacyAutoSwitchNotice && (
                    <div style={{ fontSize: 11, color: "#fbbf24", marginTop: 4 }}>{tiktokPrivacyAutoSwitchNotice}</div>
                  )}
                </div>
                <div style={{ display: "flex", gap: 18, flexWrap: "wrap", marginBottom: 12 }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: tiktokInfo.comment_disabled ? "#475569" : "#94a3b8" }}>
                    <input type="checkbox" checked={tiktokAllowComment} disabled={tiktokInfo.comment_disabled} onChange={e => setTiktokAllowComment(e.target.checked)} />
                    Allow comments{tiktokInfo.comment_disabled && " (disabled by account)"}
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: tiktokInfo.duet_disabled ? "#475569" : "#94a3b8" }}>
                    <input type="checkbox" checked={tiktokAllowDuet} disabled={tiktokInfo.duet_disabled} onChange={e => setTiktokAllowDuet(e.target.checked)} />
                    Allow Duet{tiktokInfo.duet_disabled && " (disabled by account)"}
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: tiktokInfo.stitch_disabled ? "#475569" : "#94a3b8" }}>
                    <input type="checkbox" checked={tiktokAllowStitch} disabled={tiktokInfo.stitch_disabled} onChange={e => setTiktokAllowStitch(e.target.checked)} />
                    Allow Stitch{tiktokInfo.stitch_disabled && " (disabled by account)"}
                  </label>
                </div>
                <div style={{ marginBottom: tiktokDisclosureEnabled ? 12 : 8 }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#94a3b8" }}>
                    <input type="checkbox" checked={tiktokDisclosureEnabled} onChange={e => {
                      const checked = e.target.checked;
                      setTiktokDisclosureEnabled(checked);
                      if (!checked) { setTiktokBrandOrganic(false); setTiktokBrandContent(false); }
                    }} />
                    Content Disclosure Setting
                  </label>
                  <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>Turn on if this video promotes yourself/your business, or another brand/product.</div>
                </div>
                {tiktokDisclosureEnabled && (
                  <div style={{ display: "flex", gap: 18, flexWrap: "wrap", marginBottom: 8 }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#94a3b8" }}>
                      <input type="checkbox" checked={tiktokBrandOrganic} onChange={e => setTiktokBrandOrganic(e.target.checked)} />
                      Your Brand
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#94a3b8" }}>
                      <input type="checkbox" checked={tiktokBrandContent} onChange={e => {
                        const checked = e.target.checked;
                        setTiktokBrandContent(checked);
                        if (checked && tiktokPrivacy === "SELF_ONLY") {
                          const options = tiktokInfo.privacy_level_options || [];
                          const nonPrivate = options.filter(o => o !== "SELF_ONLY");
                          const newPrivacy = nonPrivate.includes("PUBLIC_TO_EVERYONE") ? "PUBLIC_TO_EVERYONE" : (nonPrivate[0] || tiktokPrivacy);
                          setTiktokPrivacy(newPrivacy);
                          setTiktokPrivacyAutoSwitchNotice(`Privacy changed to ${PRIVACY_LABELS[newPrivacy] || newPrivacy} — Branded Content can't be posted as private.`);
                        } else if (!checked) {
                          setTiktokPrivacyAutoSwitchNotice("");
                        }
                      }} />
                      Branded Content
                    </label>
                  </div>
                )}
                {tiktokDisclosureEnabled && (tiktokBrandOrganic || tiktokBrandContent) && (
                  <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 8 }}>
                    Your photo/video will be labeled as '{tiktokBrandContent ? "Paid partnership" : "Promotional content"}'.
                  </div>
                )}
                <div style={{ fontSize: 12, color: "#94a3b8" }}>
                  By posting, you agree to TikTok's {tiktokBrandContent ? "Branded Content Policy and " : ""}Music Usage Confirmation.
                </div>
                {tiktokPublishStatus && (
                  <div style={{ fontSize: 12, marginTop: 10, color: tiktokPublishStatus.status === "FAILED" ? "#ef4444" : tiktokPublishStatus.status === "PUBLISH_COMPLETE" || tiktokPublishStatus.status === "SEND_TO_USER_INBOX" ? "#4ade80" : "#fbbf24" }}>
                    TikTok status: {tiktokPublishStatus.status === "FAILED"
                      ? `Failed${tiktokPublishStatus.failReason ? ` — ${tiktokPublishStatus.failReason}` : ""}`
                      : tiktokPublishStatus.status === "PUBLISH_COMPLETE" ? "Published"
                      : tiktokPublishStatus.status === "SEND_TO_USER_INBOX" ? "Sent to your TikTok inbox for review"
                      : "Processing…"}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        <div style={card}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 14 }}>Select Project</div>
          {projects.length === 0
            ? <div style={{ color: "#475569", fontSize: 13 }}>No rendered projects found. Render a reel in the editor first.</div>
            : <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 300, overflowY: "auto" }}>
                {projects.map(p => (
                  <div key={p.id} onClick={() => { setSelectedProject(p); if (p.title && p.title !== 'Untitled Reel') setAiPrompt(p.title); }} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: 8, cursor: "pointer", background: selectedProject?.id === p.id ? "rgba(29,78,216,0.15)" : "var(--onyx-surface)", border: selectedProject?.id === p.id ? "1px solid #3b82f6" : "1px solid var(--onyx-hairline-strong)" }}>
                    {p.thumbnail_url
                      ? <img src={p.thumbnail_url} style={{ width: 48, height: 48, borderRadius: 6, objectFit: "cover", flexShrink: 0 }} alt="" onError={e => { e.target.style.display="none"; e.target.nextSibling && (e.target.nextSibling.style.display="flex"); }} />
                      : null}
                    <div style={{ width: 48, height: 48, borderRadius: 6, background: "var(--onyx-surface-2)", display: p.thumbnail_url ? "none" : "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>▶</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.title}</div>
                      <div style={{ fontSize: 11, color: "#475569", marginTop: 2 }}>{new Date(p.created_at).toLocaleDateString()}</div>
                    </div>
                    {selectedProject?.id === p.id && <span style={{ color: "#3b82f6", fontSize: 16 }}>✓</span>}
                  </div>
                ))}
              </div>
          }
        </div>

        {selectedProject && (
          <div style={card}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 16 }}>Compose</div>
            <div style={{ marginBottom: 14, padding: "10px 14px", background: "var(--onyx-surface)", borderRadius: 8, border: "1px solid var(--onyx-hairline-strong)" }}>
              <div style={{ fontSize: 12, color: "#64748b" }}>
                Publishing: <span style={{ color: "#93c5fd", fontWeight: 600 }}>{selectedProject.title}</span>
                {selectedBrand && <span style={{ color: "#7de0ff", marginLeft: 8 }}>as {selectedBrand.brand_label}</span>}
                {selectedPlatforms.length > 0 && <span style={{ color: "#64748b", marginLeft: 8 }}>→ {selectedPlatforms.join(", ")}</span>}
              </div>
            </div>
            {(selectedProject.output_url || selectedProject.render_url) && (
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, color: "#94a3b8", display: "block", marginBottom: 6 }}>Preview — this is exactly what will be posted</label>
                <video
                  key={selectedProject.id}
                  src={selectedProject.output_url || selectedProject.render_url}
                  controls
                  playsInline
                  style={{ width: "100%", maxWidth: 320, borderRadius: 8, border: "1px solid var(--onyx-hairline-strong)", background: "#000", display: "block" }}
                />
              </div>
            )}
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, color: "#94a3b8" }}>Describe your reel...</label>
              <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                <input style={{ ...inputS, marginTop: 0, flex: 1 }} value={aiPrompt} onChange={e => setAiPrompt(e.target.value)} placeholder="e.g. A product reveal for a new coffee brand targeting millennials" />
                <button onClick={generateCaption} disabled={generatingCaption || !aiPrompt.trim()} style={{ padding: "10px 16px", borderRadius: 8, border: "none", background: (generatingCaption || !aiPrompt.trim()) ? "var(--chip-bg-strong)" : "var(--btn-primary-grad)", color: "var(--btn-primary-text)", fontWeight: 700, fontSize: 13, cursor: (generatingCaption || !aiPrompt.trim()) ? "not-allowed" : "pointer", whiteSpace: "nowrap", flexShrink: 0 }}>
                  {generatingCaption ? <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><span style={{ width: 14, height: 14, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", display: "inline-block", animation: "spin 0.7s linear infinite" }} />Generating...</span> : "Generate Caption & Hashtags"}
                </button>
              </div>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, color: "#94a3b8" }}>Caption</label>
              <textarea style={{ ...inputS, minHeight: 80, resize: "vertical" }} value={caption} onChange={e => setCaption(e.target.value)} placeholder="Write a caption..." />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, color: "#94a3b8" }}>Hashtags</label>
              <input style={inputS} value={hashtags} onChange={e => setHashtags(e.target.value)} placeholder="#reels #viral #ai" />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, color: "#94a3b8" }}>Schedule time (leave blank to publish now)</label>
              <input type="datetime-local" style={inputS} value={scheduleAt} onChange={e => setScheduleAt(e.target.value)} />
            </div>
            {msg.text && (
              <div style={{ padding: "10px 14px", borderRadius: 8, marginBottom: 14, fontSize: 13, fontWeight: 600, background: msg.type === "success" ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)", border: `1px solid ${msg.type === "success" ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"}`, color: msg.type === "success" ? "#4ade80" : "#f87171" }}>{msg.text}</div>
            )}
            {selectedPlatforms.includes("tiktok") && (
              <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 14 }}>This video will be labeled AI-generated on TikTok.</div>
            )}
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={handlePublishNow} disabled={!canSubmit} style={{ padding: "12px 24px", borderRadius: 8, border: "none", background: canSubmit ? "var(--btn-primary-grad)" : "var(--chip-bg-strong)", color: canSubmit ? "var(--btn-primary-text)" : "var(--onyx-text-faint)", fontWeight: 700, fontSize: 14, cursor: canSubmit ? "pointer" : "not-allowed" }}>
                {submitting ? "Publishing..." : "Publish Now"}
              </button>
              <button onClick={handleSchedule} disabled={!canSubmit} style={{ padding: "12px 24px", borderRadius: 8, border: "1px solid var(--onyx-hairline-strong)", background: "var(--onyx-surface)", color: canSubmit ? "#94a3b8" : "#475569", fontWeight: 600, fontSize: 14, cursor: canSubmit ? "pointer" : "not-allowed" }}>
                {submitting ? "Scheduling..." : "Schedule"}
              </button>
            </div>
          </div>
        )}

        <div style={card}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 14 }}>Recent Posts</div>
          {posts.length === 0
            ? <div style={{ color: "#475569", fontSize: 13 }}>No posts yet.</div>
            : posts.map(post => {
                const st = STATUS_STYLES[post.status] || STATUS_STYLES.scheduled;
                const plat = PLATFORMS.find(p => p.id === post.platform);
                return (
                  <div key={post.id} style={{ display: "flex", gap: 12, alignItems: "center", padding: "12px 0", borderBottom: "1px solid var(--onyx-hairline-strong)" }}>
                    <div style={{ fontSize: 22, flexShrink: 0 }}>{plat?.icon || ""}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: plat?.color || "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>{plat?.label || post.platform}</span>
                        <div style={{ fontSize: 11, fontWeight: 700, padding: "2px 6px", borderRadius: 4, background: st.bg, color: st.color }}>{post.status}</div>
                      </div>
                      <div style={{ fontSize: 13, color: "#e2e8f0", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{post.caption?.slice(0, 80) || "No caption"}</div>
                      <div style={{ fontSize: 11, color: "#475569", marginTop: 3 }}>
                        {new Date(post.post_at || post.created_at).toLocaleString()}
                        {post.brand_id && brands.find(b => b.id === post.brand_id) && <span style={{ marginLeft: 8, color: "#4dd0ff" }}>· {brands.find(b => b.id === post.brand_id).brand_label}</span>}
                      </div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, flexShrink: 0 }}>
                      {post.status === "scheduled" && (
                        <button onClick={async () => {
                          if (!confirm("Cancel this scheduled post?")) return;
                          const res = await fetch(`/api/publish/cancel/${post.id}`, {
                            method: "DELETE",
                            headers: { Authorization: `Bearer ${session?.access_token}` }
                          });
                          if (res.ok) setPosts(prev => prev.filter(p => p.id !== post.id));
                          else alert("Failed to cancel post");
                        }} style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid var(--onyx-hairline-strong)", background: "transparent", color: "#ef4444", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
          }
        </div>
      </div>
    </div>
  );
}
