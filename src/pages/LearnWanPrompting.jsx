import { Link } from "react-router-dom";
import LearnPageLayout from "../components/LearnPageLayout";
import PromptResultShowcase from "../components/PromptResultShowcase";
import { learnPages } from "../data/learnPagesSeo";

const h2Style = { fontSize: 20, fontWeight: 700, color: "var(--onyx-text)", marginTop: 36, marginBottom: 12 };
const pStyle = { color: "var(--onyx-text-dim)", fontSize: 15, marginBottom: 16 };

export default function LearnWanPrompting() {
  return (
    <LearnPageLayout
      seo={learnPages.find(p => p.path === "/learn/wan-prompting")}
    >
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
      <svg viewBox="0 0 400 140" role="img" aria-labelledby="wan-cost-title" style={{ width: "100%", maxWidth: 400, margin: "24px auto", display: "block" }}>
        <title id="wan-cost-title">Wan is Onyx Reelz's fastest and most affordable AI video generation model</title>
        {[["Wan", 30, "var(--onyx-cyan)"], ["Kling", 60, "var(--onyx-text-dim)"], ["Veo 3.1", 100, "var(--onyx-text-dim)"]].map(([label, w, color], i) => (
          <g key={label} transform={`translate(10, ${i * 40 + 10})`}>
            <text x="0" y="14" fill="var(--onyx-text)" fontSize="10">{label}</text>
            <rect x="60" y="2" width={w} height="16" rx="3" fill={color} />
          </g>
        ))}
        <text x="10" y="135" fill="var(--onyx-text-faint)" fontSize="9">Relative generation cost</text>
      </svg>

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

      <h2 style={h2Style}>A real Wan prompt and result</h2>
      <p style={pStyle}>
        A genuine prompt sent to Wan 2.5 on Onyx Reelz, next to what it
        actually produced:
      </p>
      <PromptResultShowcase
        label="Real Wan 2.5 generation"
        videoUrl="https://pub-31e667ae894f4cddbf03ae6a7578eff1.r2.dev/kling_d0e769e8-63e0-41c6-bf39-787930bda3b4.mp4"
        prompt="Sleek smartphone on a dark studio table, screen glowing with vibrant short-form video content, camera slowly pushes in, cinematic lighting, shallow depth of field, subtle particle dust in the light beams, premium tech aesthetic, dramatic side lighting, shot on Sony A7, shallow depth of field, film grain, vertical portrait format, mobile-first framing, tight compositional focus."
      />
      <p style={pStyle}>
        Notice the concrete nouns doing the real work — "dark studio table,"
        "particle dust in the light beams," "camera slowly pushes in" — rather
        than relying on adjectives like "premium" or "cinematic" alone to
        carry the shot.
      </p>

      <h2 style={h2Style}>Seed-locking: Wan's real advantage</h2>
      <svg viewBox="0 0 500 100" role="img" aria-labelledby="wan-seedlock-title" style={{ width: "100%", maxWidth: 500, margin: "24px auto", display: "block" }}>
        <title id="wan-seedlock-title">Wan seed-locking workflow: draft cheaply, lock the seed, then upgrade quality without losing the composition</title>
        {["Draft (cheap)", "Lock seed", "Upgrade quality"].map((label, i) => (
          <g key={label} transform={`translate(${i * 170 + 5}, 20)`}>
            <rect width="150" height="55" rx="6" fill="none" stroke="var(--onyx-cyan)" />
            <text x="75" y="32" textAnchor="middle" fill="var(--onyx-text)" fontSize="11">{label}</text>
            {i < 2 && <text x="160" y="35" fill="var(--onyx-text-faint)" fontSize="16">→</text>}
          </g>
        ))}
      </svg>
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
