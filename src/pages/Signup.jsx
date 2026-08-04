import { useState } from "react"
import { supabase } from "../supabaseClient"
import { useNavigate } from "react-router-dom"
import SEO from "../components/SEO"
import { staticPages } from "../data/staticPagesSeo"

export default function Signup() {
  const [username, setUsername] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
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
        body: JSON.stringify({ email, password, username, referral_code }),
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
    <div style={{
      minHeight: "100vh", background: "var(--onyx-bg)", display: "flex",
      alignItems: "center", justifyContent: "center", fontFamily: "sans-serif"
    }}>
      <SEO {...staticPages.find(p => p.path === "/signup")} />
      <div style={{
        width: 380, background: "var(--onyx-bg-2)", padding: 40,
        borderRadius: 12, border: "1px solid rgba(255,255,255,0.08)"
      }}>
        <h1 style={{ color: "var(--onyx-text)", marginBottom: 8, fontSize: 24, fontWeight: 700 }}>Create Account</h1>
        <p style={{ color: "var(--onyx-text-faint)", fontSize: 13, marginBottom: 16 }}>
          Free to use. No credit card required.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 24, padding: "12px 16px", background: "rgba(77,208,255,0.08)", borderRadius: 8, border: "1px solid rgba(77,208,255,0.2)" }}>
          {["Full editor, unlimited stock & sharing", "Pay only for AI generation & downloads", "No trial, no expiry — just free"].map(item => (
            <div key={item} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--onyx-cyan)" }}>
              <span style={{ color: "#22c55e", fontWeight: 700 }}>✓</span> {item}
            </div>
          ))}
        </div>

        {error && (
          <div style={{
            padding: "10px 14px", background: "rgba(239,68,68,0.1)",
            border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8,
            color: "#f87171", fontSize: 13, marginBottom: 16
          }}>
            {error}
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <input
            placeholder="Username (optional)"
            value={username}
            onChange={e => setUsername(e.target.value)}
            style={{
              padding: "12px 16px", borderRadius: 8, fontSize: 14,
              background: "var(--onyx-surface)", border: "1px solid var(--onyx-hairline-strong)",
              color: "var(--onyx-text)", outline: "none", width: "100%", boxSizing: "border-box"
            }}
          />
          <input
            placeholder="Email"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSignup()}
            style={{
              padding: "12px 16px", borderRadius: 8, fontSize: 14,
              background: "var(--onyx-surface)", border: "1px solid var(--onyx-hairline-strong)",
              color: "var(--onyx-text)", outline: "none", width: "100%", boxSizing: "border-box"
            }}
          />
          <input
            placeholder="Password (min 6 characters)"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSignup()}
            style={{
              padding: "12px 16px", borderRadius: 8, fontSize: 14,
              background: "var(--onyx-surface)", border: "1px solid var(--onyx-hairline-strong)",
              color: "var(--onyx-text)", outline: "none", width: "100%", boxSizing: "border-box"
            }}
          />

          <button
            onClick={handleSignup}
            disabled={loading}
            style={{
              padding: "13px", borderRadius: 8, fontSize: 15, fontWeight: 700,
              background: loading ? "#374151" : "linear-gradient(135deg, #4dd0ff, #ec4899)",
              border: "none", color: "#fff", cursor: loading ? "not-allowed" : "pointer",
              marginTop: 4,
            }}
          >
            {loading ? "Creating account..." : "Create Account"}
          </button>

          <p style={{ textAlign: "center", color: "var(--onyx-text-faint)", fontSize: 13, marginTop: 8 }}>
            Already have an account?{" "}
            <a href="/login" style={{ color: "var(--onyx-cyan)", textDecoration: "none" }}>Sign in</a>
          </p>
        </div>
      </div>
    </div>
  )
}
