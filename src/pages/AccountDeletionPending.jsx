import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient.js";
import { getAuthHeaders } from "../utils/auth.js";

export default function AccountDeletionPending() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [status, setStatus] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState("");
  const [cancelled, setCancelled] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setLoadError("");
      try {
        const headers = await getAuthHeaders();
        const res = await fetch("/api/account/delete/status", { headers });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Unable to load deletion status.");
        setStatus(data);
      } catch (err) {
        setLoadError(err.message);
      }
      setLoading(false);
    })();
  }, []);

  async function handleCancel() {
    setCancelling(true);
    setCancelError("");
    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/account/delete/cancel", { method: "POST", headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to cancel deletion.");
      setCancelled(true);
      await supabase.auth.signOut();
      navigate("/login");
    } catch (err) {
      setCancelError(err.message);
      setCancelling(false);
    }
  }

  const cardStyle = {
    background: "var(--onyx-bg-2)",
    border: "1px solid var(--onyx-hairline-strong)",
    borderRadius: 12,
    padding: 32,
    maxWidth: 520,
    width: "100%",
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, background: "var(--onyx-bg)", color: "var(--onyx-text)" }}>
      <div style={cardStyle}>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 8px" }}>Account Deletion Pending</h1>

        {loading && <div style={{ fontSize: 13, color: "var(--onyx-text-faint)", padding: "16px 0" }}>Loading status...</div>}

        {!loading && loadError && (
          <div style={{ fontSize: 13, color: "#f87171", padding: "12px 16px", borderRadius: 8, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", marginTop: 12 }}>
            {loadError}
          </div>
        )}

        {!loading && !loadError && status && !status.pending && (
          <>
            <div style={{ fontSize: 13, color: "var(--onyx-text-faint)", marginTop: 12, marginBottom: 20 }}>
              Nothing is currently pending on this account.
            </div>
            <a href="/dashboard" style={{ color: "#4dd0ff", fontSize: 13, fontWeight: 600 }}>Back to Dashboard →</a>
          </>
        )}

        {!loading && !loadError && status && status.pending && (
          <>
            <p style={{ fontSize: 13, color: "var(--onyx-text-faint)", lineHeight: 1.6, marginTop: 12 }}>
              This account is scheduled for deletion. It's locked while a request is pending — you can cancel any time before the deletion runs to restore full access.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 12, color: "var(--onyx-text-dim)", background: "var(--onyx-surface)", border: "1px solid var(--onyx-hairline-strong)", borderRadius: 8, padding: "12px 16px", margin: "16px 0" }}>
              <div>Requested: {status.requestedAt ? new Date(status.requestedAt).toLocaleString() : "—"}</div>
              {status.step && <div>Progress: {status.step}</div>}
              {status.error && <div style={{ color: "#f87171" }}>Last error: {status.error}</div>}
            </div>

            {cancelError && (
              <div style={{ fontSize: 13, color: "#f87171", padding: "12px 16px", borderRadius: 8, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", marginBottom: 16 }}>
                {cancelError}
              </div>
            )}

            {cancelled && (
              <div style={{ fontSize: 13, color: "#4ade80", padding: "12px 16px", borderRadius: 8, background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)", marginBottom: 16 }}>
                Deletion cancelled. Signing you out...
              </div>
            )}

            <button
              onClick={handleCancel}
              disabled={cancelling || cancelled}
              style={{
                width: "100%", padding: "12px 20px", borderRadius: 8, border: "none",
                background: "var(--btn-primary-grad)", color: "var(--btn-primary-text)",
                fontWeight: 700, fontSize: 13, cursor: cancelling || cancelled ? "not-allowed" : "pointer",
                opacity: cancelling || cancelled ? 0.6 : 1,
              }}
            >
              {cancelling ? "Cancelling..." : "Cancel Deletion"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
