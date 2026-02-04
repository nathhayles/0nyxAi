import { supabase } from "../supabaseClient.js";

export default function ResetPassword() {
  return `
    <div class="auth">
      <div class="auth-card">
        <h1>Reset password</h1>
        <p class="auth-subtitle">Enter a new password.</p>

        <form id="resetForm">
          <label class="auth-label">New password</label>
          <input
            id="newPassword"
            class="auth-input"
            type="password"
            placeholder="••••••••"
            required
          />

          <button type="submit" class="btn primary auth-btn">
            Update password
          </button>
        </form>

        <div id="resetMsg" class="auth-msg"></div>
      </div>
    </div>
  `;
}

export async function bindResetHandlers({ goLogin }) {
  const form = document.getElementById("resetForm");
  const msg = document.getElementById("resetMsg");

  const setMsg = (text) => {
    msg.textContent = text || "";
  };

  // ✅ STEP 1: Read recovery token from URL
  const params = new URLSearchParams(window.location.search);
  const tokenHash = params.get("token_hash");
  const type = params.get("type");

  if (!tokenHash || type !== "recovery") {
    setMsg("Invalid or expired recovery link. Please request a new one.");
    return;
  }

  // ✅ STEP 2: Exchange recovery token for a session (CRITICAL)
  const { error: verifyError } = await supabase.auth.verifyOtp({
    type: "recovery",
    token_hash: tokenHash,
  });

  if (verifyError) {
    setMsg("Invalid or expired recovery link. Please request a new one.");
    return;
  }

  // ✅ STEP 3: Allow password update
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    setMsg("Updating password...");

    const password = document.getElementById("newPassword").value;

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setMsg(error.message);
      return;
    }

    setMsg("Password updated. Redirecting to login...");
    setTimeout(goLogin, 1500);
  });
}

