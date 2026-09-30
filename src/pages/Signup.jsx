import { useState } from "react"
import { supabase } from "../supabaseClient"
import { useNavigate } from "react-router-dom"
import SEO from "../components/SEO"
import { staticPages } from "../data/staticPagesSeo"
import AuthShell from "../components/AuthShell"
import { signupAttributionPayload, selfReportedPayload, marketingPayload, MARKETING_OPT_IN_LABEL, SOURCE_OPTIONS, SOURCE_OTHER_MAX } from "../utils/attribution"
import "../auth.css"

export default function Signup() {
  const [username, setUsername] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [source, setSource] = useState("")
  const [sourceOther, setSourceOther] = useState("")
  const [marketingOptIn, setMarketingOptIn] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const navigate = useNavigate()

  async function handleSignup(e) {
    e?.preventDefault()
    setError("")
    if (!email || !password) return setError("Email and password are required")
    if (password.length < 6) return setError("Password must be at least 6 characters")
    setLoading(true)

    try {
      const referral_code = localStorage.getItem("referral_code") || undefined
      // Call our backend signup route — handles auth + all DB inserts
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, username, referral_code, ...signupAttributionPayload(), ...selfReportedPayload(source, sourceOther), ...marketingPayload(marketingOptIn) }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Signup failed")

      // Clear referral code after successful signup so it doesn't re-attach on re-signup
      localStorage.removeItem("referral_code")

      // Now sign in with Supabase to get a session
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
      if (signInError) throw new Error("Account created but sign-in failed — please log in manually")

      navigate("/studio")
    } catch (err) {
      setError(err.message)
    }
    setLoading(false)
  }

  return (
    <AuthShell>
      <SEO {...staticPages.find(p => p.path === "/signup")} />
      <div className="auth-card">
        <h1>Create Account</h1>
        <p className="auth-subtitle">Free to use. No credit card required.</p>

        <div className="auth-perks">
          {["Full editor, unlimited stock & sharing", "Pay only for AI generation & downloads", "No trial, no expiry — just free"].map(item => (
            <div key={item} className="auth-perk">
              <span className="auth-perk-check">✓</span> {item}
            </div>
          ))}
        </div>

        {error && <div className="auth-error">{error}</div>}

        <label className="auth-label">Username (optional)</label>
        <input
          className="auth-input"
          placeholder="Username"
          value={username}
          onChange={e => setUsername(e.target.value)}
        />

        <label className="auth-label">Email</label>
        <input
          className="auth-input"
          placeholder="you@example.com"
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleSignup()}
        />

        <label className="auth-label">Password</label>
        <input
          className="auth-input"
          placeholder="Min 6 characters"
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleSignup()}
        />

        <label className="auth-label" htmlFor="signup-source">How did you hear about Onyx? (optional)</label>
        <select
          id="signup-source"
          className="auth-input"
          value={source}
          onChange={e => setSource(e.target.value)}
        >
          <option value="">Prefer not to say</option>
          {SOURCE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        {source === "other" && (
          <input
            className="auth-input"
            style={{ marginTop: 8 }}
            placeholder="Tell us where (optional)"
            aria-label="Where did you hear about us?"
            maxLength={SOURCE_OTHER_MAX}
            value={sourceOther}
            onChange={e => setSourceOther(e.target.value)}
          />
        )}

        <label style={{ display: "flex", alignItems: "flex-start", gap: 10, marginTop: 14, fontSize: 13, lineHeight: 1.4, color: "rgba(255,255,255,0.75)", cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={marketingOptIn}
            onChange={e => setMarketingOptIn(e.target.checked)}
            style={{ marginTop: 2, flexShrink: 0 }}
          />
          <span>{MARKETING_OPT_IN_LABEL}</span>
        </label>

        <button
          onClick={handleSignup}
          disabled={loading}
          className="auth-btn primary"
        >
          {loading ? "Creating account…" : "Create Account"}
        </button>

        <p style={{ textAlign: "center", color: "rgba(255,255,255,0.6)", fontSize: 13, marginTop: 16 }}>
          Already have an account?{" "}
          <a href="/login" style={{ color: "var(--onyx-cyan, #4dd0ff)", textDecoration: "none" }}>Sign in</a>
        </p>
      </div>
    </AuthShell>
  )
}
