const API_BASE = "http://localhost:3000/api/admin";
const statusEl = document.getElementById("status");
const form = document.getElementById("loginForm");
const tokenInput = document.getElementById("token");

// Auto‑login if token already exists
const existing = localStorage.getItem("admin_token");
if (existing) {
  statusEl.textContent = "Already logged in (token found)";
}

// Handle login
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  statusEl.textContent = "Logging in...";

  const token = tokenInput.value.trim();
  if (!token) {
    statusEl.textContent = "Token required";
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ token })
    });

    const data = await res.json();

    if (!res.ok) {
      statusEl.textContent = data.error || "Login failed";
      return;
    }

    localStorage.setItem("admin_token", token);
    statusEl.textContent = "Login successful ✅";

  } catch (err) {
    statusEl.textContent = "Network error";
  }
});

