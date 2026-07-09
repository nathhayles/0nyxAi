import { useEffect, useState } from "react"
import { supabase } from "../supabaseClient"
import SEO from "../components/SEO"

const TIERS = [
  { plan: "Starter", credits: 50, color: "#60a5fa" },
  { plan: "Creator", credits: 150, color: "#7de0ff" },
  { plan: "Pro / Agency", credits: 400, color: "#f59e0b" },
]

const STEPS = [
  {
    num: 1,
    title: "Create a reel on Onyx Reelz",
    desc: "Build any reel using the Onyx editor — no special setup needed.",
  },
  {
    num: 2,
    title: "Share it — your affiliate link is embedded automatically",
    desc: "When you share a reel, your unique referral code is attached. Anyone who clicks gets tagged to you.",
  },
  {
    num: 3,
    title: "Someone signs up and pays their first month",
    desc: "The moment they complete their first subscription payment, credits land in your account.",
  },
]

function generateCode(uid) {
  const uidClean = uid.replace(/-/g, "").toUpperCase().slice(0, 6)
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  let suffix = ""
  for (let i = 0; i < 4; i++) {
    suffix += chars[Math.floor(Math.random() * chars.length)]
  }
  return uidClean + suffix
}

export default function Earn() {
  const [user, setUser] = useState(null)
  const [refLink, setRefLink] = useState("")
  const [clicks, setClicks] = useState(null)
  const [referrals, setReferrals] = useState(null)
  const [credits, setCredits] = useState(null)
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: userData } = await supabase.auth.getUser()
      const u = userData?.user ?? null
      setUser(u)

      if (!u) {
        setLoading(false)
        return
      }

      const uid = u.id

      // Get or create affiliate link
      let { data: link } = await supabase
        .from("affiliate_links")
        .select("ref_code")
        .eq("user_id", uid)
        .maybeSingle()

      if (!link) {
        const code = generateCode(uid)
        const { data: newLink } = await supabase
          .from("affiliate_links")
          .insert({ user_id: uid, ref_code: code })
          .select("ref_code")
          .maybeSingle()
        if (!newLink) {
          const { data: existing } = await supabase
            .from("affiliate_links")
            .select("ref_code")
            .eq("user_id", uid)
            .maybeSingle()
          link = existing
        } else {
          link = newLink
        }
      }

      if (link?.ref_code) {
        setRefLink(window.location.origin + "/?ref=" + link.ref_code)

        const { data: clickRows } = await supabase
          .from("affiliate_clicks")
          .select("*")
          .eq("ref_code", link.ref_code)
        setClicks(clickRows?.length ?? 0)

        const { data: refRows } = await supabase
          .from("users")
          .select("id")
          .eq("referred_by", link.ref_code)
        setReferrals(refRows?.length ?? 0)
      }

      const { data: rewardRows } = await supabase
        .from("affiliate_rewards")
        .select("credits_awarded")
        .eq("referrer_id", uid)

      let total = 0
      if (rewardRows) rewardRows.forEach((r) => { total += r.credits_awarded })
      setCredits(total)

      setLoading(false)
    }

    load()
  }, [])

  function handleCopy() {
    if (!refLink) return
    navigator.clipboard.writeText(refLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div data-theme="onyx" style={{ minHeight: "100vh", background: "var(--onyx-bg)", color: "var(--onyx-text)", fontFamily: "Arial, Helvetica, sans-serif" }}>
      <SEO
        title="Earn Credits - Affiliate Program"
        description="Refer friends to Onyx Reelz and earn AI credits when they subscribe. Track your referral clicks and conversions from your dashboard."
        path="/earn"
      />
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "80px 24px" }}>

        {/* Hero */}
        <div style={{ textAlign: "center", marginBottom: 80 }}>
          <h1 style={{ fontSize: "clamp(32px, 5vw, 52px)", fontWeight: 800, lineHeight: 1.1, marginBottom: 20, letterSpacing: "-0.02em" }}>
            Earn free credits
            <br />
            <span style={{ background: "linear-gradient(90deg, #7de0ff, #60a5fa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              by sharing your reels
            </span>
          </h1>
          <p style={{ fontSize: 18, color: "rgba(255,255,255,0.5)", maxWidth: 540, margin: "0 auto", lineHeight: 1.65 }}>
            Share your Onyx Reelz content and earn credits automatically every time
            someone signs up and pays through your link — no extra work required.
          </p>
          {!loading && !user && (
            <div style={{ marginTop: 36 }}>
              <a
                href="/login"
                style={{
                  display: "inline-block", padding: "14px 38px", borderRadius: 10,
                  background: "linear-gradient(135deg, #4dd0ff, #3b82f6)", color: "#fff",
                  fontWeight: 700, fontSize: 16, textDecoration: "none",
                  boxShadow: "0 0 40px rgba(77,208,255,0.3)",
                }}
              >
                Sign up to get your link →
              </a>
            </div>
          )}
        </div>

        {/* How it works */}
        <div style={{ marginBottom: 72 }}>
          <h2 style={{ fontSize: 26, fontWeight: 700, marginBottom: 32, textAlign: "center", color: "rgba(255,255,255,0.85)" }}>
            How it works
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 18 }}>
            {STEPS.map((step) => (
              <div key={step.num} style={{ background: "var(--onyx-bg-2)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, padding: "28px 24px" }}>
                <div style={{
                  width: 34, height: 34, borderRadius: "50%", background: "rgba(77,208,255,0.15)",
                  border: "1px solid rgba(77,208,255,0.35)", display: "flex", alignItems: "center",
                  justifyContent: "center", fontWeight: 700, color: "#7de0ff", marginBottom: 18, fontSize: 14,
                }}>
                  {step.num}
                </div>
                <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 10, lineHeight: 1.35, color: "#fff" }}>
                  {step.title}
                </h3>
                <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", lineHeight: 1.65, margin: 0 }}>
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Reward tiers */}
        <div style={{ marginBottom: 72 }}>
          <h2 style={{ fontSize: 26, fontWeight: 700, marginBottom: 32, textAlign: "center", color: "rgba(255,255,255,0.85)" }}>
            Reward tiers
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 18 }}>
            {TIERS.map((tier) => (
              <div key={tier.plan} style={{
                background: "var(--onyx-bg-2)", border: `1px solid ${tier.color}25`,
                borderRadius: 14, padding: "32px 24px", textAlign: "center",
              }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: tier.color, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 14 }}>
                  {tier.plan} plan
                </div>
                <div style={{ fontSize: 48, fontWeight: 800, color: "#fff", lineHeight: 1, marginBottom: 6 }}>
                  {tier.credits}
                </div>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.35)" }}>credits per referral</div>
              </div>
            ))}
          </div>
        </div>

        {/* User section */}
        {loading ? (
          <div style={{ textAlign: "center", color: "rgba(255,255,255,0.25)", padding: "40px 0" }}>Loading…</div>
        ) : user ? (
          <>
            {/* Affiliate link */}
            <div style={{ background: "var(--onyx-bg-2)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: "28px 28px", marginBottom: 20 }}>
              <h3 style={{ fontSize: 17, fontWeight: 700, margin: "0 0 18px" }}>Your affiliate link</h3>
              <div style={{ display: "flex", gap: 10 }}>
                <input
                  readOnly
                  value={refLink}
                  style={{
                    flex: 1, background: "var(--onyx-bg)", border: "1px solid rgba(255,255,255,0.09)",
                    borderRadius: 8, padding: "11px 14px", color: "rgba(255,255,255,0.7)",
                    fontSize: 14, outline: "none", minWidth: 0,
                  }}
                />
                <button
                  onClick={handleCopy}
                  style={{
                    padding: "11px 24px", borderRadius: 8,
                    background: copied ? "#10b981" : "rgba(77,208,255,0.75)",
                    color: "#fff", fontWeight: 700, fontSize: 14, border: "none",
                    cursor: "pointer", whiteSpace: "nowrap", transition: "background 0.15s", flexShrink: 0,
                  }}
                >
                  {copied ? "Copied!" : "Copy link"}
                </button>
              </div>
              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.25)", margin: "12px 0 0" }}>
                Credits are awarded automatically when a referred user completes their first subscription payment.
              </p>
            </div>

            {/* Stats */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 18 }}>
              <div style={{ background: "var(--onyx-bg-2)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: "28px" }}>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700 }}>
                  Total Clicks
                </div>
                <div style={{ fontSize: 44, fontWeight: 800 }}>{clicks ?? "—"}</div>
              </div>
              <div style={{ background: "var(--onyx-bg-2)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: "28px" }}>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700 }}>
                  Total Referrals
                </div>
                <div style={{ fontSize: 44, fontWeight: 800 }}>{referrals ?? "—"}</div>
              </div>
              <div style={{ background: "var(--onyx-bg-2)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: "28px" }}>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700 }}>
                  Credits Earned
                </div>
                <div style={{ fontSize: 44, fontWeight: 800 }}>{credits ?? "—"}</div>
              </div>
            </div>
          </>
        ) : (
          <div style={{ background: "var(--onyx-bg-2)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: "56px 24px", textAlign: "center" }}>
            <h3 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12 }}>Get your affiliate link</h3>
            <p style={{ color: "rgba(255,255,255,0.4)", marginBottom: 30, fontSize: 15, lineHeight: 1.6 }}>
              Create a free account to receive your unique referral link
              <br />
              and start earning credits from every referral.
            </p>
            <a
              href="/login"
              style={{
                display: "inline-block", padding: "14px 38px", borderRadius: 10,
                background: "linear-gradient(135deg, #4dd0ff, #3b82f6)", color: "#fff",
                fontWeight: 700, fontSize: 16, textDecoration: "none",
                boxShadow: "0 0 40px rgba(77,208,255,0.25)",
              }}
            >
              Sign up for free →
            </a>
          </div>
        )}
      </div>
    </div>
  )
}
