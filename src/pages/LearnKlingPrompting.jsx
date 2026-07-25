import { Link } from "react-router-dom";
import LearnPageLayout from "../components/LearnPageLayout";

const h2Style = { fontSize: 20, fontWeight: 700, color: "var(--onyx-text)", marginTop: 36, marginBottom: 12 };
const pStyle = { color: "var(--onyx-text-dim)", fontSize: 15, marginBottom: 16 };
const olStyle = { color: "var(--onyx-text-dim)", fontSize: 15, marginBottom: 16, paddingLeft: 20 };
const liStyle = { marginBottom: 10 };

export default function LearnKlingPrompting() {
  return (
    <LearnPageLayout
      seo={{
        title: "Kling Prompting Guide",
        description: "How to write prompts that get the most out of Kling video generation on Onyx Reelz.",
        path: "/learn/kling-prompting",
      }}
    >
      <Link to="/learn" style={{ fontSize: 13, color: "var(--onyx-text-faint)", textDecoration: "none", display: "inline-block", marginBottom: 16 }}>&larr; Back to Learn</Link>
      <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 8 }}>Kling Prompting Guide</h1>
      <p style={{ color: "var(--onyx-text-dim)", fontSize: 15, marginBottom: 32 }}>
        How to write prompts that get the most out of Kling video generation.
      </p>

      <h2 style={h2Style}>How Kling reads a prompt</h2>
      <p style={pStyle}>
        Kling responds best to natural, cinematic sentences — not comma-separated
        tags. Describe the scene the way you'd brief a camera operator: what's
        happening, how the camera moves, and what it looks like.
      </p>

      <h2 style={h2Style}>The structure that works</h2>
      <p style={pStyle}>Every strong Kling prompt covers, in this rough order:</p>
      <ol style={olStyle}>
        <li style={liStyle}>
          <strong style={{ color: "var(--onyx-text)" }}>Subject &amp; action</strong> — who or what is in frame, doing one clear thing. Put
          this first — Kling weights the opening of your prompt most heavily.
        </li>
        <li style={liStyle}>
          <strong style={{ color: "var(--onyx-text)" }}>Camera movement</strong> — how the camera itself moves (dolly in, slow pan,
          tracking shot, crash zoom).
        </li>
        <li style={liStyle}>
          <strong style={{ color: "var(--onyx-text)" }}>Shot composition</strong> — where the camera is relative to the subject
          (close-up, wide establishing shot, low angle, over-the-shoulder).
        </li>
        <li style={liStyle}>
          <strong style={{ color: "var(--onyx-text)" }}>Lighting &amp; style</strong> — the mood and visual language (golden hour rim
          lighting, dramatic side lighting, shot on Sony A7).
        </li>
      </ol>

      <h2 style={h2Style}>One action per scene</h2>
      <p style={pStyle}>
        Kling handles a single, clear action far better than several stacked
        together. "She walks to the window, turns, and smiles" is three separate
        beats competing for one short clip — pick the one that matters most.
      </p>

      <h2 style={h2Style}>Reference tags — @Element1, @Element2</h2>
      <p style={pStyle}>
        If you're using a Character from your library, tag them directly in your
        prompt with @Element1 (or @Element2 for a second reference, like a motion
        clip). Kling binds these tags to the actual reference image or video you've
        attached — they're never rendered as visible text, just used to lock in
        appearance or motion.
      </p>

      <h2 style={h2Style}>Character consistency</h2>
      <p style={{ ...pStyle, marginBottom: 0 }}>
        For a character to look the same across multiple scenes, use Character Lock
        and reference photos in the Character Library rather than repeating a
        written description — Kling reads real reference images far more reliably
        than adjectives.
      </p>
    </LearnPageLayout>
  );
}
