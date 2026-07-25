import { Link } from "react-router-dom";
import LearnPageLayout from "../components/LearnPageLayout";

const h2Style = { fontSize: 20, fontWeight: 700, color: "var(--onyx-text)", marginTop: 36, marginBottom: 12 };
const pStyle = { color: "var(--onyx-text-dim)", fontSize: 15, marginBottom: 16 };

export default function LearnWanPrompting() {
  return (
    <LearnPageLayout
      seo={{
        title: "Wan Prompting Guide",
        description: "How to write prompts for Wan, our fast and affordable AI video model on Onyx Reelz.",
        path: "/learn/wan-prompting",
      }}
    >
      <Link to="/learn" style={{ fontSize: 13, color: "var(--onyx-text-faint)", textDecoration: "none", display: "inline-block", marginBottom: 16 }}>&larr; Back to Learn</Link>
      <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 8 }}>Wan Prompting Guide</h1>
      <p style={{ color: "var(--onyx-text-dim)", fontSize: 15, marginBottom: 32 }}>
        How to write prompts for Wan, our fast and affordable AI video model.
      </p>

      <h2 style={h2Style}>Onyx Reelz's fastest, most affordable model</h2>
      <p style={pStyle}>
        Wan is built for speed and value — ideal for drafts, iteration, and
        high-volume content where you want to try ideas quickly before
        committing credits to a higher-tier generation.
      </p>

      <h2 style={h2Style}>Same core structure as any strong video prompt</h2>
      <p style={pStyle}>
        Subject and action first, then camera, then lighting and style — see our{" "}
        <Link to="/learn/camera-glossary" style={{ color: "var(--onyx-cyan)" }}>Camera Glossary</Link>{" "}
        for camera movement and shot composition terms. Keep it concrete —
        specific nouns and verbs outperform vague mood words every time.
      </p>

      <h2 style={h2Style}>Seed-locking: draft cheap, then upgrade</h2>
      <p style={pStyle}>
        Wan supports a reproducible seed. Generate a rough draft first, and once
        you're happy with the composition and motion, reuse the same seed on a
        longer or higher-quality re-run — you get the same shot, just refined,
        instead of a new roll of the dice. Kling doesn't support this, so Wan
        and Veo are your go-to models when you want to lock in a look before
        spending more.
      </p>

      <h2 style={h2Style}>One action per scene</h2>
      <p style={pStyle}>
        Like every model on Onyx Reelz, Wan performs best with a single, clear
        motion per clip rather than several actions stacked together.
      </p>

      <h2 style={h2Style}>When to reach for Wan</h2>
      <p style={pStyle}>
        Choose it for early drafts, testing an idea's composition and pacing,
        or high-volume content where the cheapest generation cost matters more
        than maximum visual fidelity.
      </p>

      <p style={{ ...pStyle, marginBottom: 0 }}>
        Ready to try it? <Link to="/create" style={{ color: "var(--onyx-cyan)" }}>Start creating</Link> with Wan on Onyx Reelz.
      </p>
    </LearnPageLayout>
  );
}
