import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient.js";

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

    // Auth listener — catches PASSWORD_RECOVERY event when SDK processes the URL hash
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && session)) markReady();
    });

    // Fallback: session may already exist (e.g. token exchanged before listener registered)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) markReady();
    });

    // Last-resort fallback: if the URL contains a recovery token but the SDK
    // fires the event before our listener is attached, show the form anyway.
    // The updateUser call will fail gracefully if there's no valid session.
    const hash = window.location.hash;
    if (hash.includes("type=recovery") || hash.includes("access_token")) {
      markReady();
    }

    // Hard timeout: never leave user stuck on "Verifying..." forever
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
    background: "#0f141b", border: "1px solid #2b3442",
    color: "#e2e8f0", fontSize: 15, boxSizing: "border-box", outline: "none",
  };

  return (
    <div style={{ minHeight: "100vh", background: "#06070a", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "sans-serif", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 400, background: "#0c1016", border: "1px solid #1f2937", borderRadius: 16, padding: 32 }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🔐</div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#fff", margin: 0 }}>Reset Password</h1>
          <p style={{ color: "#64748b", fontSize: 14, marginTop: 8 }}>Enter your new password below</p>
        </div>

        {!ready ? (
          <div style={{ textAlign: "center", color: "#64748b", fontSize: 14, padding: 20 }}>
            Verifying reset link...
          </div>
        ) : (
          <form onSubmit={handleReset} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={{ fontSize: 12, color: "#94a3b8", display: "block", marginBottom: 6 }}>New Password</label>
              <input type="password" style={inputS} value={password}
                onChange={e => setPassword(e.target.value)} placeholder="Min. 8 characters" />
            </div>

            <div>
              <label style={{ fontSize: 12, color: "#94a3b8", display: "block", marginBottom: 6 }}>Confirm Password</label>
              <input type="password" style={inputS} value={confirm}
                onChange={e => setConfirm(e.target.value)} placeholder="Repeat new password" />
            </div>

            {msg.text && (
              <div style={{
                padding: "10px 14px", borderRadius: 8, fontSize: 13, fontWeight: 600,
                background: msg.type === "success" ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
                border: `1px solid ${msg.type === "success" ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"}`,
                color: msg.type === "success" ? "#4ade80" : "#f87171",
              }}>
                {msg.text}
              </div>
            )}

            <button type="submit" disabled={loading} style={{
              padding: "13px", borderRadius: 8, border: "none",
              background: loading ? "#374151" : "#1d4ed8",
              color: "#fff", fontWeight: 700, fontSize: 15,
              cursor: loading ? "not-allowed" : "pointer", marginTop: 4,
            }}>
              {loading ? "Updating..." : "Update Password"}
            </button>
          </form>
        )}

        <div style={{ textAlign: "center", marginTop: 20 }}>
          <button onClick={() => navigate("/login")} style={{ background: "none", border: "none", color: "#64748b", fontSize: 13, cursor: "pointer" }}>
            ← Back to Login
          </button>
        </div>
      </div>
    </div>
  );
}
