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

      <h2 style={h2Style}>Built for speed and iteration</h2>
      <p style={pStyle}>
        Wan is Onyx Reelz's fastest and most affordable video model — the right
        tool when you want to test an idea quickly, generate a high volume of
        content, or draft several variations before committing real credits to
        a final, polished render.
      </p>

      <h2 style={h2Style}>The same prompt structure, kept concrete</h2>
      <p style={pStyle}>
        Subject and action first, then camera, then lighting and style — the
        same order that works across every model on Onyx Reelz. See our{" "}
        <Link to="/learn/camera-glossary" style={{ color: "var(--onyx-cyan)" }}>Camera Glossary</Link>{" "}
        for camera movement and shot composition terms. Because Wan is often
        used for rapid iteration, it's worth being especially concrete rather
        than relying on the model to fill in vague gaps: specific nouns and
        verbs consistently outperform mood-only language like "epic" or
        "cinematic" on their own.
      </p>

      <h2 style={h2Style}>Seed-locking: Wan's real advantage</h2>
      <p style={pStyle}>
        Unlike Kling, Wan supports a reproducible seed — a number that
        determines the specific random variation the model uses to generate a
        clip. Generate a rough draft first without worrying about final
        quality. Once you're happy with the composition, camera movement, and
        overall feel, reuse that exact seed on a longer or higher-resolution
        re-run. You get the same underlying shot, refined — not a fresh roll of
        the dice that might land somewhere completely different.
      </p>
      <p style={pStyle}>
        This workflow is genuinely useful for anyone iterating on a specific
        look: draft cheap on Wan, lock the seed the moment something clicks,
        then decide whether to finalize on Wan itself or carry the same seed
        into Veo for a quality upgrade.
      </p>

      <h2 style={h2Style}>One action per scene</h2>
      <p style={pStyle}>
        Same principle as every model here — a single, clearly described motion
        produces sharper, more predictable results than several actions
        competing for the same few seconds of clip.
      </p>

      <h2 style={h2Style}>When to reach for Wan</h2>
      <p style={pStyle}>
        Choose Wan for early-stage drafts, testing whether a scene's
        composition and pacing work before spending more on a higher tier, or
        for high-volume content where the lowest generation cost matters more
        than maximum visual fidelity. It's also the natural starting point for
        the seed-lock workflow described above.
      </p>

      <p style={{ ...pStyle, marginBottom: 0 }}>
        Ready to try it? <Link to="/create" style={{ color: "var(--onyx-cyan)" }}>Start creating</Link> with Wan on Onyx Reelz.
      </p>
    </LearnPageLayout>
  );
}
