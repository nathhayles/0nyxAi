// Wraps a page an ambassador account doesn't get (Music Studio, Reshoot,
// Compare): shows a short notice instead of a page whose every action the
// server would refuse with 403 AMBASSADOR_NOT_ALLOWED. Normal accounts, and
// ambassadors whose tier includes the feature, see the page unchanged.
import { Link } from "react-router-dom";
import useAmbassador from "../hooks/useAmbassador.js";
import { ambassadorFeatures } from "../utils/ambassador.js";

export default function AmbassadorFeatureGate({ feature, title, children }) {
  const { ambassador } = useAmbassador();
  if (!ambassador || ambassadorFeatures(ambassador)[feature]) return children;
  return (
    <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "48px 24px", background: "var(--bg-page)", color: "var(--onyx-text)" }}>
      <div style={{ maxWidth: 460, textAlign: "center", padding: 28, borderRadius: 16, background: "var(--onyx-surface)", border: "1px solid var(--onyx-hairline-strong)" }}>
        <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>{title || "This tool"} isn't included in your ambassador account</div>
        <div style={{ fontSize: 14, color: "var(--onyx-text-dim)", lineHeight: 1.5, marginBottom: 18 }}>
          You can still build reels with stock footage, your own uploads and standard voiceovers, and export and share them for free.
        </div>
        <Link to="/studio" style={{ color: "var(--onyx-cyan)", fontWeight: 600 }}>Back to Studio →</Link>
      </div>
    </div>
  );
}
