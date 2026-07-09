import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient.js";
import SEO from "./SEO";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ text: "", type: "" });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let done = false;
    const markReady = () => { if (!done) { done = true; setReady(true); } };

    // New Supabase email format sends token_hash as a query param — must exchange
    // it for a session via verifyOtp before updateUser will work.
    const params = new URLSearchParams(window.location.search);
    const token_hash = params.get("token_hash");
    const type = params.get("type");

    if (token_hash && type === "recovery") {
      supabase.auth.verifyOtp({ token_hash, type: "recovery" }).then(({ error }) => {
        if (error) {
          setMsg({ text: error.message, type: "error" });
        }
        markReady();
      });
      return;
    }

    // Legacy: Auth listener — catches PASSWORD_RECOVERY when SDK processes URL hash
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && session)) markReady();
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) markReady();
    });

    const hash = window.location.hash;
    if (hash.includes("type=recovery") || hash.includes("access_token")) {
      markReady();
    }

    const t = setTimeout(markReady, 3000);

    return () => { subscription.unsubscribe(); clearTimeout(t); };
  }, []);

  async function handleReset(e) {
    e.preventDefault();
    if (!password) return setMsg({ text: "Enter a new password", type: "error" });
    if (password !== confirm) return setMsg({ text: "Passwords don't match", type: "error" });
    if (password.length < 8) return setMsg({ text: "Password must be at least 8 characters", type: "error" });

    setLoading(true);
    setMsg({ text: "", type: "" });

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setMsg({ text: error.message, type: "error" });
    } else {
      setMsg({ text: "Password updated! Redirecting to login...", type: "success" });
      setTimeout(() => navigate("/login"), 2000);
    }
    setLoading(false);
  }

  const inputS = {
    width: "100%", padding: "12px 16px", borderRadius: 8,
    background: "var(--onyx-bg)", border: "1px solid var(--onyx-hairline-strong)",
    color: "var(--onyx-text)", fontSize: 15, boxSizing: "border-box", outline: "none",
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--onyx-bg)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "sans-serif", padding: 24 }}>
      <SEO title="Reset Password" description="Reset the password for your Onyx Reelz account." path="/reset-password" />
      <div style={{ width: "100%", maxWidth: 400, background: "var(--onyx-bg-2)", border: "1px solid var(--onyx-hairline-strong)", borderRadius: 16, padding: 32 }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🔐</div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--onyx-text)", margin: 0 }}>Reset Password</h1>
          <p style={{ color: "var(--onyx-text-faint)", fontSize: 14, marginTop: 8 }}>Enter your new password below</p>
        </div>

        {!ready ? (
          <div style={{ textAlign: "center", color: "var(--onyx-text-faint)", fontSize: 14, padding: 20 }}>
            Verifying reset link...
          </div>
        ) : (
          <form onSubmit={handleReset} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={{ fontSize: 12, color: "var(--onyx-text-faint)", display: "block", marginBottom: 6 }}>New Password</label>
              <input type="password" style={inputS} value={password}
                onChange={e => setPassword(e.target.value)} placeholder="Min. 8 characters" />
            </div>

            <div>
              <label style={{ fontSize: 12, color: "var(--onyx-text-faint)", display: "block", marginBottom: 6 }}>Confirm Password</label>
              <input type="password" style={inputS} value={confirm}
                onChange={e => setConfirm(e.target.value)} placeholder="Repeat new password" />
            </div>

            {msg.text && (
              <div style={{
                padding: "10px 14px", borderRadius: 8, fontSize: 13, fontWeight: 600,
                background: msg.type === "success" ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
                border: `1px solid ${msg.type === "success" ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"}`,
                color: msg.type === "success" ? "var(--onyx-success)" : "var(--onyx-rose)",
              }}>
                {msg.text}
              </div>
            )}

            <button type="submit" disabled={loading} style={{
              padding: "13px", borderRadius: 8, border: "none",
              background: loading ? "var(--chip-bg-strong)" : "var(--btn-primary-grad)",
              color: "var(--btn-primary-text)", fontWeight: 700, fontSize: 15,
              cursor: loading ? "not-allowed" : "pointer", marginTop: 4,
            }}>
              {loading ? "Updating..." : "Update Password"}
            </button>
          </form>
        )}

        <div style={{ textAlign: "center", marginTop: 20 }}>
          <button onClick={() => navigate("/login")} style={{ background: "none", border: "none", color: "var(--onyx-text-faint)", fontSize: 13, cursor: "pointer" }}>
            ← Back to Login
          </button>
        </div>
      </div>
    </div>
  );
}
