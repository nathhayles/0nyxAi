import { supabase } from "../supabaseClient.js";

export default function Login() {
  return `
    <div class="auth">
      <div class="auth-card">
        <h1>Login</h1>
        <p class="auth-subtitle">Sign in to access the app.</p>

        <form id="loginForm">
          <label class="auth-label">Email</label>
          <input
            id="authEmail"
            class="auth-input"
            type="email"
            placeholder="you@example.com"
            required
          />

          <label class="auth-label">Password</label>
          <input
            id="authPassword"
            class="auth-input"
            type="password"
            placeholder="••••••••"
            required
          />

          <button type="submit" class="btn primary auth-btn">
            Login
          </button>
        </form>

        <button id="forgotBtn" class="btn secondary auth-btn">
          Forgot password
        </button>

        <div id="authMsg" class="auth-msg"></div>

        <button id="backHome" class="btn ghost auth-back">Back</button>
      </div>
    </div>
  `;
}

export function bindLoginHandlers({ goHome, goApp }) {
  const form = document.getElementById("loginForm");
  const msg = document.getElementById("authMsg");

  const setMsg = (text) => {
    msg.textContent = text || "";
  };

  // Back button
  document.getElementById("backHome").onclick = () => goHome();

  // LOGIN (Enter key + button)
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    setMsg("Logging in...");

    const email = document.getElementById("authEmail").value.trim();
    const password = document.getElementById("authPassword").value;

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setMsg(error.message);
      return;
    }

    setMsg("Success. Redirecting...");
    goApp();
  });

  // FORGOT PASSWORD (CRITICAL FIX)
  document.getElementById("forgotBtn").onclick = async () => {
    const email = document.getElementById("authEmail").value.trim();

    if (!email) {
      setMsg("Enter your email first.");
      return;
    }

    setMsg("Sending recovery email...");

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: "http://localhost:5173/reset-password",
    });

    if (error) {
      setMsg(error.message);
      return;
    }

    setMsg("Recovery email sent. Check your inbox.");
  };
}

