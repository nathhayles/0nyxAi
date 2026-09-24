import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { supabase } from "../supabaseClient.js";

// Must match the backend's routes/feedback.js CATEGORIES and
// migrations/074's CHECK constraint.
const CATEGORIES = [
  { id: "bug", label: "Bug" },
  { id: "feature", label: "Feature request" },
  { id: "general", label: "General" },
];
const MAX_LENGTH = 5000;

const overlayStyle = {
  position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
  display: "flex", alignItems: "center", justifyContent: "center",
  zIndex: 10000, padding: 16, fontFamily: "sans-serif",
};

const modalStyle = {
  background: "#0f141b", border: "1px solid #2b3442", borderRadius: 12,
  maxWidth: 440, width: "100%", maxHeight: "85vh", overflowY: "auto",
  padding: "20px 24px", color: "#e2e8f0", position: "relative",
};

// Rendered inside ChatBot's fixed bottom-right container, next to the chat
// bubble. Only shown to signed-in users -- POST /api/feedback is behind
// requireAuth.
export default function FeedbackButton() {
  const [session, setSession] = useState(null);
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState(null);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data?.session ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => sub?.subscription?.unsubscribe();
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    // Reset after a successful send so the next open starts fresh; keep an
    // unsent draft if the user just closed the modal.
    if (sent) {
      setSent(false);
      setMessage("");
      setCategory(null);
    }
    setError("");
  }, [sent]);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, close]);

  async function submit() {
    const text = message.trim();
    if (!text || sending) return;
    setSending(true);
    setError("");
    try {
      const { data } = await supabase.auth.getSession();
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${data?.session?.access_token}`,
        },
        body: JSON.stringify({ message: text, category, pageUrl: window.location.href }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Couldn't send feedback. Please try again.");
      setSent(true);
    } catch (err) {
      setError(err.message || "Couldn't send feedback. Please try again.");
    }
    setSending(false);
  }

  if (!session) return null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="Send feedback"
        style={{
          height: 36, minWidth: 44, padding: "0 14px", borderRadius: 18,
          background: "#1a2030", border: "1px solid #2b3442", color: "#e2e8f0",
          fontSize: 13, fontWeight: 600, cursor: "pointer",
          boxShadow: "0 4px 16px rgba(0,0,0,0.35)",
        }}
      >
        Feedback
      </button>

      {open && createPortal(
        <div style={overlayStyle} onClick={close}>
          <div style={modalStyle} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Send feedback">
            <button
              onClick={close}
              aria-label="Close"
              style={{ position: "absolute", top: 12, right: 14, background: "none", border: "none", color: "#64748b", fontSize: 18, cursor: "pointer", lineHeight: 1 }}
            >
              ×
            </button>

            {sent ? (
              <div style={{ textAlign: "center", padding: "16px 0 8px" }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>🙏</div>
                <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>Thanks for your feedback!</div>
                <div style={{ fontSize: 13, color: "#94a3b8", marginBottom: 18 }}>We read every message.</div>
                <button onClick={close} style={{ background: "#3b6eff", border: "none", borderRadius: 8, color: "#fff", padding: "8px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                  Close
                </button>
              </div>
            ) : (
              <>
                <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4, paddingRight: 24 }}>Send feedback</div>
                <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 14 }}>Found a bug or have an idea? Let us know.</div>

                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
                  {CATEGORIES.map((c) => {
                    const active = category === c.id;
                    return (
                      <button
                        key={c.id}
                        onClick={() => setCategory(active ? null : c.id)}
                        aria-pressed={active}
                        style={{
                          padding: "6px 12px", borderRadius: 16, fontSize: 12, cursor: "pointer",
                          background: active ? "rgba(59,110,255,0.2)" : "#1a2030",
                          border: `1px solid ${active ? "#3b6eff" : "#2b3442"}`,
                          color: active ? "#fff" : "#cbd5e1",
                        }}
                      >
                        {c.label}
                      </button>
                    );
                  })}
                </div>

                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value.slice(0, MAX_LENGTH))}
                  placeholder="Tell us what's on your mind..."
                  rows={6}
                  autoFocus
                  style={{
                    width: "100%", boxSizing: "border-box", resize: "vertical",
                    background: "#1a2030", border: "1px solid #2b3442", borderRadius: 8,
                    color: "#fff", padding: "10px 12px", fontSize: 13, lineHeight: 1.5,
                    outline: "none", fontFamily: "inherit",
                  }}
                />
                <div style={{ fontSize: 11, color: "#64748b", textAlign: "right", marginTop: 4 }}>
                  {message.length}/{MAX_LENGTH}
                </div>

                {error && <div style={{ fontSize: 12, color: "#f87171", marginTop: 8 }}>{error}</div>}

                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
                  <button
                    onClick={submit}
                    disabled={sending || !message.trim()}
                    style={{
                      background: "#3b6eff", border: "none", borderRadius: 8, color: "#fff",
                      padding: "8px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer",
                      opacity: sending || !message.trim() ? 0.5 : 1,
                    }}
                  >
                    {sending ? "Sending..." : "Send feedback"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
