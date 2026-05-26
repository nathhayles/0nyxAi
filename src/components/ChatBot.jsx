import { useState, useRef, useEffect } from "react";

const WELCOME = "Hi! I'm Onyx Support. Ask me anything about creating reels, credits, voiceovers, or your account.";

export default function ChatBot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([{ role: "assistant", content: WELCOME }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    const userMsg = { role: "user", content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/support/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [...messages, userMsg] }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: "assistant", content: data.reply || "Sorry, something went wrong." }]);
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "Connection error. Please try again." }]);
    }
    setLoading(false);
  }

  return (
    <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 9999, fontFamily: "sans-serif" }}>
      {open && (
        <div style={{
          width: 340, height: 480, background: "#0f141b", border: "1px solid #2b3442",
          borderRadius: 16, display: "flex", flexDirection: "column",
          boxShadow: "0 8px 32px rgba(0,0,0,0.5)", marginBottom: 12, overflow: "hidden"
        }}>
          <div style={{ padding: "14px 16px", background: "#1a2030", borderBottom: "1px solid #2b3442", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14, color: "#fff" }}>Onyx Support</div>
              <div style={{ fontSize: 11, color: "#4ade80" }}>● Online</div>
            </div>
            <button onClick={() => setOpen(false)} style={{ background: "none", border: "none", color: "#fff", cursor: "pointer", fontSize: 18, opacity: 0.6 }}>✕</button>
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
            {messages.map((m, i) => (
              <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
                <div style={{
                  maxWidth: "82%", padding: "8px 12px", borderRadius: m.role === "user" ? "12px 12px 2px 12px" : "12px 12px 12px 2px",
                  background: m.role === "user" ? "#3b6eff" : "#1a2030",
                  color: "#fff", fontSize: 13, lineHeight: 1.5,
                  border: m.role === "assistant" ? "1px solid #2b3442" : "none"
                }}>
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ display: "flex", justifyContent: "flex-start" }}>
                <div style={{ background: "#1a2030", border: "1px solid #2b3442", borderRadius: "12px 12px 12px 2px", padding: "8px 14px", color: "rgba(255,255,255,0.5)", fontSize: 13 }}>
                  Typing...
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div style={{ padding: "10px 12px", borderTop: "1px solid #2b3442", display: "flex", gap: 8 }}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && send()}
              placeholder="Ask a question..."
              style={{
                flex: 1, background: "#1a2030", border: "1px solid #2b3442", borderRadius: 8,
                color: "#fff", padding: "8px 12px", fontSize: 13, outline: "none"
              }}
            />
            <button onClick={send} disabled={loading || !input.trim()} style={{
              background: "#3b6eff", border: "none", borderRadius: 8, color: "#fff",
              padding: "8px 14px", cursor: "pointer", fontSize: 13, fontWeight: 600,
              opacity: loading || !input.trim() ? 0.5 : 1
            }}>Send</button>
          </div>
        </div>
      )}

      <button onClick={() => setOpen(o => !o)} style={{
        width: 52, height: 52, borderRadius: "50%", background: "#3b6eff",
        border: "none", cursor: "pointer", display: "flex", alignItems: "center",
        justifyContent: "center", boxShadow: "0 4px 16px rgba(59,110,255,0.4)",
        fontSize: 22, color: "#fff", marginLeft: "auto"
      }}>
        {open ? "✕" : "💬"}
      </button>
    </div>
  );
}
