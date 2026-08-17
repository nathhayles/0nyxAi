import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import SEO from "./SEO";
import { staticPages } from "../data/staticPagesSeo";
import AuthShell from "./AuthShell";
import "../auth.css";

export default function Login({ goHome }) {

  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();

    setMsg("Logging in...");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setMsg(error.message);
      return;
    }

    setMsg("Success. Redirecting...");
    navigate("/dashboard");
  };

  const handleForgot = async () => {

    if (!email) {
      setMsg("Enter your email first.");
      return;
    }

    setMsg("Sending recovery email...");

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: "https://onyx-reelz.com/reset-password",
    });

    if (error) {
      setMsg(error.message);
      return;
    }

    setMsg("Recovery email sent. Check your inbox.");
  };

  return (
    <AuthShell>
      <SEO {...staticPages.find(p => p.path === "/login")} />
      <div className="auth-card">

        <h1>Login</h1>
        <p className="auth-subtitle">Sign in to access the app.</p>

        <form onSubmit={handleLogin}>

          <label className="auth-label">Email</label>
          <input
            className="auth-input"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e)=>setEmail(e.target.value)}
            required
          />

          <label className="auth-label">Password</label>
          <input
            className="auth-input"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e)=>setPassword(e.target.value)}
            required
          />

          <button
            type="submit"
            className="auth-btn primary"
          >
            Login
          </button>

        </form>
        <p style={{ marginTop: 20, fontSize: 13, color: "rgba(255,255,255,0.6)" }}>
          Don't have an account? <a href="/signup" style={{ color: "var(--onyx-cyan, #4dd0ff)" }}>Create one</a>
        </p>

        <button
          onClick={handleForgot}
          className="auth-btn secondary"
        >
          Forgot password
        </button>

        <div className="auth-msg">
          {msg}
        </div>

        <button
          onClick={()=>goHome && goHome()}
          className="auth-btn ghost"
        >
          Back
        </button>

      </div>
    </AuthShell>
  );
}
