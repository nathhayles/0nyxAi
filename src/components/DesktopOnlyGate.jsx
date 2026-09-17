import { useState } from "react";

// Shared "this needs a bigger screen" screen for genuinely desktop-only
// tools (EditorV2's full timeline, the Admin dashboard) -- replaces each
// page's own ad-hoc wall with one honest, consistent message plus a real
// way to pick the work back up later: copy the exact current link (reelId
// and all, when there is one) or email it to yourself. A bare "Back to
// Dashboard" link with no explanation of what to do next was the previous
// EditorV2 gate; this is the same shape, done properly.
export default function DesktopOnlyGate({ featureName, explanation, minWidth = 1024 }) {
  const [copied, setCopied] = useState(false);
  const currentUrl = typeof window !== "undefined" ? window.location.href : "";

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(currentUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API can be unavailable (older WebViews, permissions) --
      // the mailto link below still works as a fallback, so this is a
      // silent no-op rather than an error state.
    }
  }

  const mailtoHref = `mailto:?subject=${encodeURIComponent(`Open on desktop: ${featureName}`)}&body=${encodeURIComponent(`Link to open on a laptop/desktop:\n\n${currentUrl}`)}`;

  return (
    <div style={{ width: "100vw", height: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, background: "#0b0f17", color: "#f1f5fb", fontFamily: "-apple-system,system-ui,sans-serif", textAlign: "center", padding: 32, boxSizing: "border-box" }}>
      <div style={{ fontSize: 48 }}>🖥️</div>
      <div style={{ fontSize: 20, fontWeight: 700 }}>{featureName} needs a bigger screen</div>
      <div style={{ fontSize: 14, color: "rgba(241,245,251,0.6)", maxWidth: 340, lineHeight: 1.5 }}>
        {explanation || `This needs a screen at least ${minWidth}px wide to work properly -- there's no good way to shrink it down without breaking the tool itself.`}
      </div>

      <div style={{ display: "flex", gap: 10, marginTop: 8, flexWrap: "wrap", justifyContent: "center" }}>
        <button
          onClick={copyLink}
          style={{ padding: "10px 18px", minHeight: 44, borderRadius: 8, border: "1px solid rgba(241,245,251,0.25)", background: "transparent", color: "#f1f5fb", fontWeight: 600, fontSize: 14, cursor: "pointer" }}
        >
          {copied ? "✓ Link copied" : "Copy link"}
        </button>
        <a
          href={mailtoHref}
          style={{ padding: "10px 18px", minHeight: 44, borderRadius: 8, border: "1px solid rgba(241,245,251,0.25)", background: "transparent", color: "#f1f5fb", fontWeight: 600, fontSize: 14, textDecoration: "none", display: "inline-flex", alignItems: "center" }}
        >
          Email me this link
        </a>
      </div>

      <a href="/dashboard" style={{ marginTop: 8, padding: "10px 24px", borderRadius: 8, background: "#4dd0ff", color: "#0b0f17", fontWeight: 700, fontSize: 14, textDecoration: "none" }}>Back to Dashboard</a>
    </div>
  );
}
