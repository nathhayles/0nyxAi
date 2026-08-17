import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient.js";
import { getAuthHeaders } from "../utils/auth.js";
import YouTubeConnect from "../components/YouTubeConnect.jsx";
import { useCredits } from "../state/CreditsContext.jsx";
import { describeTransaction } from "../utils/creditTransactionLabels.js";

const SOCIAL = [
  { id: "instagram", label: "Instagram",      icon: "IG", color: "#E1306C", status: "connect" },
  { id: "tiktok",    label: "TikTok",         icon: "TT", color: "#69C9D0", status: "connect" },
  { id: "facebook",  label: "Facebook Pages",  icon: "f",  color: "#1877F2", status: "connect" },
  { id: "twitter",   label: "X (Twitter)",    icon: "𝕏",  color: "var(--onyx-text)", status: "coming"  },
  { id: "linkedin",  label: "LinkedIn",       icon: "in", color: "#0A66C2", status: "connect" },
];

const SERVICE_ICONS = [
  { label: "Claude AI",       icon: "✦",  color: "#cc785c" },
  { label: "OpenAI TTS",      icon: "OA", color: "#10a37f" },
  { label: "ElevenLabs",      icon: "EL", color: "#f97316" },
  { label: "HeyGen Avatars",  icon: "HG", color: "#6366f1" },
  { label: "Kling AI Video",  icon: "KL", color: "#ec4899" },
  { label: "Google Lyria",    icon: "GL", color: "#4285f4" },
  { label: "Pexels Stock",    icon: "PX", color: "#05a081" },
  { label: "Freepik AI",      icon: "FP", color: "#ff5722" },
  { label: "Supabase",        icon: "SB", color: "#3ecf8e" },
  { label: "Stripe Billing",  icon: "ST", color: "#6772e5" },
];

const PLAN_COLORS = { pro: "#f59e0b", agency: "#f59e0b", creator: "#4dd0ff", starter: "var(--btn-primary-grad)", free: "#475569" };

function StatCard({ title, value, sub, accent = "var(--btn-primary-grad)", icon }) {
  return (
    <div style={{ background: "var(--onyx-surface-2)", border: "1px solid var(--onyx-hairline-strong)", borderRadius: 12, padding: "20px 24px", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: accent }} />
      <div style={{ fontSize: 24, marginBottom: 8 }}>{icon}</div>
      <div style={{ fontSize: 11, color: "var(--onyx-text-faint)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 32, fontWeight: 700, color: "var(--onyx-text)", marginBottom: 4 }}>{value}</div>
      <div style={{ fontSize: 12, color: "var(--onyx-text-faint)" }}>{sub}</div>
    </div>
  );
}

function UsageBar({ used, limit, color = "var(--btn-primary-grad)" }) {
  const pct = limit > 0 ? Math.min(100, (used / limit) * 100) : 0;
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--onyx-text-faint)", marginBottom: 4 }}>
        <span>{used.toLocaleString()} used</span>
        <span>{limit > 0 ? `${limit.toLocaleString()} limit` : "Unlimited"}</span>
      </div>
      <div style={{ height: 4, background: "var(--onyx-surface-2)", borderRadius: 2 }}>
        <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 2, transition: "width 0.6s ease" }} />
      </div>
    </div>
  );
}

const PAGE_SIZE = 20;

function TransactionRow({ tx }) {
  const { label, detail, isRefund } = describeTransaction(tx.reason, tx.metadata);
  const isCredit = tx.amount > 0;
  const amountColor = isCredit ? "#4ade80" : "var(--onyx-text)";
  const date = new Date(tx.created_at);
  const dateLabel = date.toLocaleDateString(undefined, { month: "short", day: "numeric" }) + " · " +
    date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--onyx-hairline-strong)", gap: 12 }}>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--onyx-text)" }}>{label}</span>
          {isRefund && (
            <span style={{ fontSize: 9, fontWeight: 700, padding: "1px 6px", borderRadius: 10, background: "rgba(77,208,255,0.12)", color: "#4dd0ff", textTransform: "uppercase", letterSpacing: "0.04em" }}>Refund</span>
          )}
        </div>
        <div style={{ fontSize: 11, color: "var(--onyx-text-faint)", marginTop: 2 }}>
          {dateLabel}{detail ? ` · ${detail}` : ""}
        </div>
      </div>
      <div style={{ textAlign: "right", flexShrink: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: amountColor }}>
          {isCredit ? "+" : ""}{tx.amount.toLocaleString()}
        </div>
        <div style={{ fontSize: 10, color: "var(--onyx-text-faint)" }}>
          {tx.balance_after != null ? `${tx.balance_after.toLocaleString()} bal.` : "—"}
        </div>
      </div>
    </div>
  );
}

// Own fetch/pagination, same self-contained pattern as Admin.jsx's panel
// components -- keeps Account()'s already-large load effect untouched.
function CreditActivitySection() {
  const [transactions, setTransactions] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const headers = await getAuthHeaders();
        const res = await fetch(`/api/credits/transactions?limit=${PAGE_SIZE}&offset=0`, { headers });
        const d = await res.json();
        if (!res.ok) throw new Error(d.error || "Failed to load activity");
        if (!cancelled) { setTransactions(d.transactions || []); setTotal(d.total || 0); }
      } catch (e) {
        if (!cancelled) setError(e.message);
      }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/credits/transactions?limit=${PAGE_SIZE}&offset=${transactions.length}`, { headers });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Failed to load activity");
      setTransactions((prev) => [...prev, ...(d.transactions || [])]);
    } catch (e) {
      setError(e.message);
    }
    setLoadingMore(false);
  };

  const hasMore = transactions.length < total;

  return (
    <div style={{ background: "var(--onyx-bg-2)", border: "1px solid var(--onyx-hairline-strong)", borderRadius: 12, padding: 24, marginBottom: 24 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Recent Activity</h2>
        {total > 0 && <span style={{ fontSize: 11, color: "var(--onyx-text-faint)" }}>{total} total</span>}
      </div>
      {loading ? (
        <div style={{ fontSize: 12, color: "var(--onyx-text-faint)", padding: "12px 0" }}>Loading...</div>
      ) : error ? (
        <div style={{ fontSize: 12, color: "#f87171", padding: "12px 0" }}>Failed to load: {error}</div>
      ) : transactions.length === 0 ? (
        <div style={{ fontSize: 12, color: "var(--onyx-text-faint)", padding: "12px 0" }}>No credit activity yet.</div>
      ) : (
        <>
          <div>{transactions.map((tx) => <TransactionRow key={tx.id} tx={tx} />)}</div>
          {hasMore && (
            <div style={{ textAlign: "center", marginTop: 14 }}>
              <button
                onClick={loadMore}
                disabled={loadingMore}
                style={{ padding: "7px 18px", fontSize: 12, fontWeight: 600, background: "var(--onyx-surface-2)", border: "1px solid #4b5563", color: "var(--onyx-text)", borderRadius: 8, cursor: loadingMore ? "not-allowed" : "pointer", opacity: loadingMore ? 0.6 : 1 }}
              >
                {loadingMore ? "Loading..." : "Load more"}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function Account() {
  const [user, setUser]               = useState(null);
  const { balance: credits, refreshCredits } = useCredits();
  const [voUsed, setVoUsed]           = useState(0);
  const [voLimit, setVoLimit]         = useState(400);
  const [plan, setPlan]               = useState("starter");
  const [isTrial, setIsTrial]         = useState(false);
  const [trialExpired, setTrialExpired] = useState(false);
  const [daysRemaining, setDaysRemaining] = useState(0);
  const [canAutopost, setCanAutopost] = useState(false);
  const [reelCount, setReelCount]     = useState(0);
  const [brands, setBrands]           = useState([]);
  const [brandLimit, setBrandLimit]   = useState(1);
  const [selectedBrandId, setSelectedBrandId] = useState(null);
  const [socialAccounts, setSocialAccounts]   = useState({});
  const [loadingSocial, setLoadingSocial]     = useState(false);
  const [disconnecting, setDisconnecting]     = useState(null);
  const [loading, setLoading]         = useState(true);
  const [ytToken, setYtToken]         = useState('');
  const [fbPendingPages, setFbPendingPages]     = useState([]);
  const [fbPageSelectBrandId, setFbPageSelectBrandId] = useState(null);
  const [fbSelectingSaving, setFbSelectingSaving] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      setUser(user);
      const { data: sessionData } = await supabase.auth.getSession();
      setYtToken(sessionData?.session?.access_token || '');
      const headers = await getAuthHeaders();
      refreshCredits();
      const [voRes, planRes, meRes, reelsRes, brandsRes] = await Promise.all([
        fetch("/api/user/vo-minutes", { headers }),
        fetch("/api/stripe/plan", { headers }),
        fetch("/api/user/me", { headers }),
        supabase.from("reels").select("id", { count: "exact" }).eq("user_id", user.id),
        fetch("/api/brands", { headers }),
      ]);
      if (reelsRes.count !== null) setReelCount(reelsRes.count);
      if (voRes.ok) { const d = await voRes.json(); setVoUsed(d.used || 0); setVoLimit(d.limit || 400); }
      if (planRes.ok) { const d = await planRes.json(); setPlan(d.plan || "starter"); }
      if (meRes.ok) {
        const d = await meRes.json();
        setIsTrial(d.is_trial || false);
        setTrialExpired(d.trial_expired || false);
        setDaysRemaining(d.days_remaining || 0);
      }
      if (brandsRes.ok) {
        const d = await brandsRes.json();
        setBrands(d.brands || []);
        setBrandLimit(d.limit || 1);
        setCanAutopost(d.canAutopost || false);
        const def = (d.brands || []).find(b => b.is_default) || (d.brands || [])[0];
        if (def) setSelectedBrandId(def.id);
      }
      setLoading(false);
    }
    load();
  }, []);

  useEffect(() => {
    if (!user || !selectedBrandId) return;
    loadSocialAccounts();
  }, [selectedBrandId, user]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const platforms = ["instagram", "tiktok", "linkedin", "facebook"];
    if (platforms.some(p => params.get(p) === "connected")) {
      loadSocialAccounts();
      window.history.replaceState({}, "", window.location.pathname);
    }
    if (params.get("facebook") === "select_page") {
      setFbPageSelectBrandId(params.get("brand_id") || "");
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  useEffect(() => {
    if (!user || fbPageSelectBrandId === null) return;
    (async () => {
      const headers = await getAuthHeaders();
      const qs = fbPageSelectBrandId ? `?brand_id=${fbPageSelectBrandId}` : "";
      const res = await fetch(`/api/social/facebook/pending-pages${qs}`, { headers });
      if (res.ok) { const d = await res.json(); setFbPendingPages(d.pages || []); }
    })();
  }, [user, fbPageSelectBrandId]);

  async function loadSocialAccounts() {
    setLoadingSocial(true);
    const headers = await getAuthHeaders();
    const qs = selectedBrandId ? `?brand_id=${selectedBrandId}` : "";
    const res = await fetch(`/api/social/accounts${qs}`, { headers });
    if (res.ok) { const d = await res.json(); setSocialAccounts(d.accounts || {}); }
    setLoadingSocial(false);
  }

  const handleManageBilling = async () => {
    const headers = await getAuthHeaders();
    headers["Content-Type"] = "application/json";
    const res = await fetch("/api/stripe/create-portal", { method: "POST", headers });
    const data = await res.json();
    if (data.url) window.location.href = data.url;
  };

  async function handleConnect(platformId) {
    if (!canAutopost) { handleManageBilling(); return; }
    const headers = await getAuthHeaders();
    const qs = selectedBrandId ? `?brand_id=${selectedBrandId}` : "";
    const res = await fetch(`/api/social/${platformId}/auth${qs}`, { headers });
    const data = await res.json();
    if (data.upgrade) handleManageBilling();
    else if (data.authUrl) window.location.href = data.authUrl;
    else alert(data.error || `Failed to connect ${platformId}`);
  }

  async function handleDisconnect(platformId) {
    setDisconnecting(platformId);
    const headers = await getAuthHeaders();
    const qs = selectedBrandId ? `?brand_id=${selectedBrandId}` : "";
    await fetch(`/api/social/${platformId}/disconnect${qs}`, { method: "DELETE", headers });
    await loadSocialAccounts();
    setDisconnecting(null);
  }

  async function handleFbPageSelect(pageId) {
    setFbSelectingSaving(true);
    const headers = await getAuthHeaders();
    headers["Content-Type"] = "application/json";
    const res = await fetch("/api/social/facebook/select-page", {
      method: "POST",
      headers,
      body: JSON.stringify({ page_id: pageId, brand_id: fbPageSelectBrandId || null }),
    });
    if (res.ok) {
      setFbPendingPages([]);
      setFbPageSelectBrandId(null);
      await loadSocialAccounts();
    } else {
      const d = await res.json();
      alert(d.error || "Failed to connect page. Please try again.");
    }
    setFbSelectingSaving(false);
  }

  if (loading) return <div style={{ padding: 40, color: "var(--onyx-text-faint)", textAlign: "center", fontSize: 14 }}>Loading account...</div>;

  const planLabel = isTrial
    ? (daysRemaining > 0 ? `Free Trial — ${daysRemaining} day${daysRemaining !== 1 ? "s" : ""} left` : "Free Trial")
    : trialExpired
    ? "Trial Expired"
    : plan.charAt(0).toUpperCase() + plan.slice(1);
  const planColor = isTrial ? "#4dd0ff" : trialExpired ? "#ef4444" : PLAN_COLORS[plan] || "#475569";
  const selectedBrand = brands.find(b => b.id === selectedBrandId);
  const atLimit = brands.length >= brandLimit;

  return (
    <div style={{ minHeight: "100vh",
      background:
        "radial-gradient(ellipse 50% 40% at 15% 0%, rgba(77,208,255,0.10), transparent 60%)," +
        "radial-gradient(ellipse 45% 35% at 88% 8%, rgba(255,181,71,0.08), transparent 60%)," +
        "var(--onyx-bg)" }}>
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "32px 24px 64px", color: "var(--onyx-text)" }}>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32 }}>
        <div>
          <h1 className="page-title">Account</h1>
          <div style={{ fontSize: 14, color: "var(--onyx-text-faint)" }}>{user?.email}</div>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <div style={{ padding: "6px 16px", borderRadius: 20, fontSize: 12, fontWeight: 700, background: `${planColor}20`, border: `1px solid ${planColor}`, color: planColor, textTransform: "uppercase", letterSpacing: "1px" }}>{planLabel} Plan</div>
          <button onClick={handleManageBilling} style={{ padding: "8px 16px", fontSize: 12, fontWeight: 600, background: "var(--onyx-surface-2)", border: "1px solid #4b5563", color: "var(--onyx-text)", borderRadius: 8, cursor: "pointer" }}>Manage Billing →</button>
        </div>
      </div>

      {(isTrial || trialExpired) && (
        <div style={{ marginBottom: 20, padding: "14px 20px", borderRadius: 10, background: isTrial ? "linear-gradient(135deg, rgba(77,208,255,0.12), rgba(99,102,241,0.08))" : "linear-gradient(135deg, rgba(239,68,68,0.12), rgba(220,38,38,0.08))", border: `1px solid ${isTrial ? "rgba(77,208,255,0.3)" : "rgba(239,68,68,0.3)"}`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--onyx-text)", marginBottom: 4 }}>
              {isTrial ? `Free Trial — ${daysRemaining} day${daysRemaining !== 1 ? "s" : ""} remaining` : "Your free trial has expired"}
            </div>
            <div style={{ fontSize: 12, color: "var(--onyx-text-faint)" }}>
              {isTrial ? "Full access to all features during your trial. No credit card required." : "Upgrade to a paid plan to continue creating and publishing reels."}
            </div>
          </div>
          <button onClick={() => window.location.href = "/pricing"} style={{ padding: "9px 18px", borderRadius: 8, border: "none", whiteSpace: "nowrap", background: "var(--btn-primary-grad)", color: "var(--btn-primary-text)", fontWeight: 700, fontSize: 12, cursor: "pointer", flexShrink: 0 }}>
            {isTrial ? "Upgrade Now →" : "Choose a Plan →"}
          </button>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 32 }}>
        <StatCard title="AI Credits" value={(credits ?? 0).toLocaleString()} sub="Used for avatars, AI video & premium voices" icon="✦" accent="#f59e0b" />
        <StatCard title="Reels Created" value={reelCount} sub="Total projects in your library" icon="▶" accent="#4dd0ff" />
        <StatCard title="Plan" value={planLabel} sub={isTrial || trialExpired ? "14-day free trial" : "Click Manage Billing to upgrade"} icon="✦" accent={planColor} />
      </div>

      <div style={{ background: "var(--onyx-bg-2)", border: "1px solid var(--onyx-hairline-strong)", borderRadius: 12, padding: 24, marginBottom: 24 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 20px" }}>Usage This Month</h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#10a37f" }}>OpenAI TTS</span>
            </div>
            <div style={{ fontSize: 12, color: "var(--onyx-text-faint)" }}>Standard voiceover minutes</div>
            <UsageBar used={voUsed} limit={voLimit} color="#10a37f" />
            <div style={{ fontSize: 11, color: "var(--onyx-text-faint)", marginTop: 4 }}>Resets monthly · Free with your plan</div>
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <span>✦</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#f59e0b" }}>AI Credits Balance</span>
            </div>
            <div style={{ fontSize: 12, color: "var(--onyx-text-faint)" }}>Used across all premium services</div>
            <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                { label: "ElevenLabs",     icon: "♪",  color: "#f97316", detail: "Premium voices · 10 credits/min" },
                { label: "HeyGen Avatars", icon: "◎",  color: "#6366f1", detail: "Avatar generation · 200–600 credits/min" },
                { label: "Kling AI Video", icon: "▶",  color: "#ec4899", detail: "AI video generation · credits per scene" },
              ].map(s => (
                <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 14 }}>{s.icon}</span>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: 11, color: s.color, fontWeight: 600 }}>{s.label}</span>
                    <span style={{ fontSize: 10, color: "var(--onyx-text-faint)", marginLeft: 6 }}>{s.detail}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div style={{ marginTop: 20, padding: "12px 16px", background: "var(--onyx-surface)", borderRadius: 8, border: "1px solid var(--onyx-hairline-strong)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--onyx-text)" }}>Need more credits?</div>
            <div style={{ fontSize: 11, color: "var(--onyx-text-faint)" }}>100 credits = $1 · Never expire</div>
          </div>
          <button onClick={() => window.location.href = "/pricing"} style={{ padding: "8px 18px", background: "var(--btn-primary-grad)", border: "none", color: "var(--btn-primary-text)", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Top Up Credits</button>
        </div>
      </div>

      <CreditActivitySection />

      <div style={{ background: "var(--onyx-bg-2)", border: "1px solid var(--onyx-hairline-strong)", borderRadius: 12, padding: 24, marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 4px" }}>Social Media Connections</h2>
            <div style={{ fontSize: 12, color: "var(--onyx-text-faint)" }}>Each brand has its own social accounts. Select a brand below to manage its connections.</div>
          </div>
          {canAutopost && <div style={{ fontSize: 11, padding: "4px 10px", borderRadius: 20, background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)", color: "#4ade80", fontWeight: 700 }}>✓ Auto-posting active</div>}
        </div>

        {!canAutopost && (
          <div style={{ padding: "16px 20px", borderRadius: 10, background: "linear-gradient(135deg, rgba(77,208,255,0.12), rgba(29,78,216,0.12))", border: "1px solid rgba(77,208,255,0.3)", marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--onyx-text)", marginBottom: 4 }}>Unlock Auto-Posting</div>
              <div style={{ fontSize: 12, color: "var(--onyx-text-faint)" }}>
                {plan === "starter" || plan === "creator" ? "Add the $15/mo Auto-posting add-on to connect social accounts and publish reels automatically." : "Upgrade to Pro or Agency for auto-posting included."}
              </div>
            </div>
            <button onClick={handleManageBilling} style={{ padding: "9px 18px", borderRadius: 8, border: "none", whiteSpace: "nowrap", background: "var(--btn-primary-grad)", color: "var(--btn-primary-text)", fontWeight: 700, fontSize: 12, cursor: "pointer", flexShrink: 0 }}>
              {plan === "starter" || plan === "creator" ? "Add $15/mo →" : "Upgrade Plan →"}
            </button>
          </div>
        )}

        {brands.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, color: "var(--onyx-text-faint)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 8, fontWeight: 700 }}>Select Brand</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {brands.map(b => (
                <button key={b.id} onClick={() => setSelectedBrandId(b.id)} style={{ padding: "7px 16px", borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: "pointer", border: selectedBrandId === b.id ? "1px solid #4dd0ff" : "1px solid var(--onyx-hairline-strong)", background: selectedBrandId === b.id ? "rgba(77,208,255,0.15)" : "var(--onyx-surface)", color: selectedBrandId === b.id ? "#7de0ff" : "#64748b" }}>
                  {b.brand_label || "Unnamed Brand"}{b.is_default && <span style={{ marginLeft: 5, fontSize: 9, opacity: 0.7 }}>DEFAULT</span>}
                </button>
              ))}
              {!atLimit
                ? <><button onClick={() => window.location.href = "/branding"} style={{ padding: "7px 16px", borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: "pointer", border: "1px dashed #2b3442", background: "transparent", color: "var(--onyx-text-dim)" }}>+ Add Brand</button><button onClick={() => window.location.href = "/branding"} style={{ padding: "7px 16px", borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: "pointer", border: "1px solid var(--onyx-hairline-strong)", background: "transparent", color: "var(--onyx-text-faint)" }}>Manage Brands →</button></>
                : <button onClick={handleManageBilling} style={{ padding: "7px 16px", borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: "pointer", border: "1px dashed #4dd0ff", background: "transparent", color: "#4dd0ff" }}>+ Upgrade for more brands</button>
              }
            </div>
            <div style={{ fontSize: 11, color: "var(--onyx-text-dim)", marginTop: 8 }}>{brands.length} / {brandLimit === Infinity ? "∞" : brandLimit} brands on {planLabel} plan</div>
          </div>
        )}

        {fbPendingPages.length > 0 && (
          <div style={{ marginBottom: 20, padding: "16px 20px", borderRadius: 10, background: "linear-gradient(135deg, rgba(24,119,242,0.12), rgba(29,78,216,0.08))", border: "1px solid rgba(24,119,242,0.35)" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--onyx-text)", marginBottom: 4 }}>Select a Facebook Page to connect</div>
            <div style={{ fontSize: 12, color: "var(--onyx-text-faint)", marginBottom: 12 }}>Your account manages {fbPendingPages.length} pages. Choose one to use for auto-posting.</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {fbPendingPages.map(p => (
                <div key={p.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderRadius: 8, background: "var(--onyx-surface)", border: "1px solid var(--onyx-hairline-strong)" }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--onyx-text)" }}>{p.name}</div>
                    {p.category && <div style={{ fontSize: 11, color: "#64748b" }}>{p.category}</div>}
                  </div>
                  <button
                    onClick={() => handleFbPageSelect(p.id)}
                    disabled={fbSelectingSaving}
                    style={{ padding: "6px 14px", borderRadius: 6, border: "1px solid #1877F240", background: "rgba(24,119,242,0.15)", color: "#60a5fa", fontSize: 12, fontWeight: 700, cursor: fbSelectingSaving ? "not-allowed" : "pointer", whiteSpace: "nowrap" }}
                  >
                    {fbSelectingSaving ? "Connecting..." : "Connect"}
                  </button>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 10, fontSize: 11, color: "var(--onyx-text-dim)" }}>You can change this later by disconnecting and reconnecting.</div>
          </div>
        )}

        {selectedBrand && (
          <>
            <div style={{ fontSize: 12, color: "#64748b", marginBottom: 12 }}>
              Connections for <span style={{ color: "#7de0ff", fontWeight: 600 }}>{selectedBrand.brand_label}</span>
              {loadingSocial && <span style={{ marginLeft: 8, color: "var(--onyx-text-dim)" }}>Loading...</span>}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
              {SOCIAL.map(s => {
                const connected = !!socialAccounts[s.id];
                const isDisconnecting = disconnecting === s.id;
                return (
                  <div key={s.id} style={{ padding: "14px 16px", borderRadius: 8, background: "var(--onyx-surface)", border: `1px solid ${connected ? s.color + "40" : "var(--onyx-hairline-strong)"}`, display: "flex", alignItems: "center", gap: 10, opacity: !canAutopost && s.status === "connect" ? 0.6 : 1 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", background: connected ? s.color + "20" : "var(--onyx-surface-2)", color: connected ? s.color : "var(--onyx-text-dim)", fontSize: 16, fontWeight: 700, flexShrink: 0 }}>{s.icon}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--onyx-text)" }}>{s.label}</div>
                      <div style={{ fontSize: 11, color: connected ? "#22c55e" : "#475569", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {connected ? `@${socialAccounts[s.id]}` : s.status === "coming" ? "Coming soon" : !canAutopost ? "Requires add-on" : "Not connected"}
                      </div>
                    </div>
                    {s.status === "connect" && !connected && canAutopost && (
                      <button onClick={() => handleConnect(s.id)} style={{ padding: "5px 12px", borderRadius: 6, border: `1px solid ${s.color}40`, background: `${s.color}15`, color: s.color, fontSize: 11, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 }}>Connect</button>
                    )}
                    {s.status === "connect" && !connected && !canAutopost && (
                      <button onClick={handleManageBilling} style={{ padding: "5px 12px", borderRadius: 6, border: "1px solid #4dd0ff40", background: "rgba(77,208,255,0.1)", color: "#7de0ff", fontSize: 11, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 }}>Upgrade</button>
                    )}
                    {connected && (
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, flexShrink: 0 }}>
                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e" }} />
                        <button onClick={() => handleDisconnect(s.id)} disabled={isDisconnecting} style={{ padding: "3px 8px", borderRadius: 4, border: "1px solid #374151", background: "transparent", color: "var(--onyx-text-dim)", fontSize: 10, cursor: "pointer" }}>{isDisconnecting ? "..." : "Disconnect"}</button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}

        {brands.length === 0 && (
          <div style={{ textAlign: "center", padding: "24px 0", color: "var(--onyx-text-dim)", fontSize: 13 }}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>✦</div>
            <div>Set up your first brand in <a href="/branding" style={{ color: "#4dd0ff" }}>Branding settings</a> to connect social accounts.</div>
          </div>
        )}
      </div>

      <div style={{ background: "var(--onyx-bg-2)", border: "1px solid var(--onyx-hairline-strong)", borderRadius: 12, padding: 24, marginBottom: 24 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 16px" }}>YouTube Publishing</h2>
        <div style={{ fontSize: 12, color: "var(--onyx-text-faint)", marginBottom: 16 }}>Connect your YouTube account to publish reels directly from the editor.</div>
        {ytToken && <YouTubeConnect token={ytToken} brandId={selectedBrandId} />}
      </div>

      <div style={{ background: "var(--onyx-bg-2)", border: "1px solid var(--onyx-hairline-strong)", borderRadius: 12, padding: 24, marginBottom: 24 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 4px" }}>Music Generation</h2>
        <div style={{ fontSize: 12, color: "var(--onyx-text-faint)", marginBottom: 20 }}>
          Background music is powered by Google Lyria — no API key required.
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 18px", borderRadius: 10, background: "rgba(66,133,244,0.08)", border: "1px solid rgba(66,133,244,0.3)" }}>
          <span style={{ fontSize: 24, flexShrink: 0 }}>♪</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#93c5fd", marginBottom: 3 }}>Google Lyria — Built In</div>
            <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.5 }}>AI music generation is included with your plan. No setup needed — just select a music style when creating your reel.</div>
          </div>
          <div style={{ padding: "4px 10px", borderRadius: 20, background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)", color: "#4ade80", fontSize: 11, fontWeight: 700, whiteSpace: "nowrap", flexShrink: 0 }}>✓ Active</div>
        </div>
      </div>

      <div style={{ background: "var(--onyx-bg-2)", border: "1px solid var(--onyx-hairline-strong)", borderRadius: 12, padding: 24 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 16px" }}>Powered By</h2>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          {SERVICE_ICONS.map(s => (
            <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", borderRadius: 8, background: "var(--onyx-surface)", border: "1px solid var(--onyx-hairline-strong)" }}>
              <span style={{ fontSize: 16 }}>{s.icon}</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: s.color }}>{s.label}</span>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 12, fontSize: 11, color: "var(--onyx-text-faint)", lineHeight: 1.6 }}>
          Onyx Reelz combines the world's leading AI services into one seamless video production pipeline — delivering professional-grade content at a fraction of the cost of traditional production.
        </div>
      </div>

    </div>
    </div>
  );
}
