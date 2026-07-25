import { Link } from "react-router-dom";
import LearnPageLayout from "../components/LearnPageLayout";

const h2Style = { fontSize: 20, fontWeight: 700, color: "var(--onyx-text)", marginTop: 36, marginBottom: 12 };
const pStyle = { color: "var(--onyx-text-dim)", fontSize: 15, marginBottom: 16 };

export default function LearnVeoPrompting() {
  return (
    <LearnPageLayout
      seo={{
        title: "Veo 3.1 Prompting Guide",
        description: "How to get the best results from Google's Veo 3.1, our highest-fidelity AI video model on Onyx Reelz.",
        path: "/learn/veo-prompting",
      }}
    >
      <Link to="/learn" style={{ fontSize: 13, color: "var(--onyx-text-faint)", textDecoration: "none", display: "inline-block", marginBottom: 16 }}>&larr; Back to Learn</Link>
      <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 8 }}>Veo 3.1 Prompting Guide</h1>
      <p style={{ color: "var(--onyx-text-dim)", fontSize: 15, marginBottom: 32 }}>
        How to get the best results from Google's Veo 3.1, our highest-fidelity AI video model.
      </p>

      <h2 style={h2Style}>Google's highest-fidelity video model</h2>
      <p style={pStyle}>
        Veo 3.1 is our top-tier model for visual quality — sharp detail, native
        vertical framing, and support for longer, continuous scenes.
      </p>

      <h2 style={h2Style}>Structure your prompt with intention</h2>
      <p style={pStyle}>
        Subject and action first, then camera movement, shot composition,
        lighting, and style — the same proven order that works across every
        model on Onyx Reelz. Veo rewards real specificity: name the actual
        lighting condition, the actual lens behavior, not just "cinematic."
      </p>

      <h2 style={h2Style}>Seed-locking is supported</h2>
      <p style={pStyle}>
        Like Wan, Veo lets you fix a seed and reuse it — draft a composition,
        lock it in, then re-run at higher settings without losing the shot you
        liked.
      </p>

      <h2 style={h2Style}>One action per scene</h2>
      <p style={pStyle}>
        A single, clearly described motion produces sharper, more predictable
        results than stacking multiple beats into one clip.
      </p>

      <h2 style={h2Style}>When to reach for Veo 3.1</h2>
      <p style={{ ...pStyle, marginBottom: 0 }}>
        Choose it when visual quality is the priority — hero shots, key scenes
        in a narrative, anything meant to be the best-looking clip in your
        reel.
      </p>
    </LearnPageLayout>
  );
}
