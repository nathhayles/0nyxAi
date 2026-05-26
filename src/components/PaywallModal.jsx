import { useNavigate } from "react-router-dom";

export default function PaywallModal({ onClose }) {
  const navigate = useNavigate();
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ background: "#0d1117", border: "1px solid #1f2937", borderRadius: 16, padding: "40px 36px", maxWidth: 480, width: "100%", textAlign: "center" }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>🔒</div>
        <h2 style={{ color: "#f1f5f9", fontSize: 22, fontWeight: 700, margin: "0 0 10px" }}>Subscription Required</h2>
        <p style={{ color: "#64748b", fontSize: 14, lineHeight: 1.6, margin: "0 0 28px" }}>
          Access to Onyx Reelz requires an active subscription. Choose a plan to start creating professional video content.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          <button
            onClick={() => navigate("/pricing")}
            style={{ padding: "12px 28px", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#7c3aed,#ec4899)", color: "#fff", fontWeight: 700, fontSize: 15, cursor: "pointer" }}
          >
            View Plans →
          </button>
          {onClose && (
            <button
              onClick={onClose}
              style={{ padding: "12px 20px", borderRadius: 10, border: "1px solid #1f2937", background: "transparent", color: "#64748b", fontSize: 14, cursor: "pointer" }}
            >
              Not now
            </button>
          )}
        </div>
        <p style={{ color: "#334155", fontSize: 12, marginTop: 20 }}>
          Plans start at $19/mo · Cancel anytime
        </p>
      </div>
    </div>
  );
}
