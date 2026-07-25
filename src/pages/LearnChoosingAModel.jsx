import { Link } from "react-router-dom";
import LearnPageLayout from "../components/LearnPageLayout";

const h2Style = { fontSize: 20, fontWeight: 700, color: "var(--onyx-text)", marginTop: 36, marginBottom: 12 };
const pStyle = { color: "var(--onyx-text-dim)", fontSize: 15, marginBottom: 16 };

export default function LearnChoosingAModel() {
  return (
    <LearnPageLayout
      seo={{
        title: "Choosing the Right AI Video Model",
        description: "A guide to Onyx Reelz's AI video models — Wan, Kling, Veo, and Seedance — and when to use each one.",
        path: "/learn/choosing-a-model",
      }}
    >
      <Link to="/learn" style={{ fontSize: 13, color: "var(--onyx-text-faint)", textDecoration: "none", display: "inline-block", marginBottom: 16 }}>&larr; Back to Learn</Link>
      <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 8 }}>Choosing the Right AI Video Model</h1>
      <p style={{ color: "var(--onyx-text-dim)", fontSize: 15, marginBottom: 32 }}>
        A guide to Onyx Reelz's AI video models — Wan, Kling, Veo, and Seedance — and when to use each one.
      </p>

      <h2 style={h2Style}>Four models, four different jobs</h2>
      <p style={pStyle}>
        Onyx Reelz gives you a choice of AI video models rather than locking
        you into one. Each has real, distinct tradeoffs in cost, speed, and
        output quality — picking the right one for a given scene saves credits
        and usually produces better results than defaulting to the same model
        every time out of habit.
      </p>

      <svg viewBox="0 0 400 400" style={{ width: "100%", maxWidth: 400, margin: "24px auto", display: "block" }}>
        <line x1="40" y1="20" x2="40" y2="360" stroke="var(--onyx-hairline-strong)" />
        <line x1="40" y1="360" x2="380" y2="360" stroke="var(--onyx-hairline-strong)" />
        <text x="20" y="15" fill="var(--onyx-text-faint)" fontSize="11">High Quality</text>
        <text x="20" y="378" fill="var(--onyx-text-faint)" fontSize="11">Low Quality</text>
        <text x="330" y="378" fill="var(--onyx-text-faint)" fontSize="11">Fast/Cheap</text>
        <text x="330" y="392" fill="var(--onyx-text-faint)" fontSize="11" textAnchor="end">→</text>
        {/* Wan - fast, budget */}
        <circle cx="320" cy="300" r="10" fill="var(--onyx-cyan)" />
        <text x="320" y="325" textAnchor="middle" fill="var(--onyx-text)" fontSize="12">Wan</text>
        {/* Kling - balanced */}
        <circle cx="220" cy="200" r="10" fill="var(--onyx-cyan)" />
        <text x="220" y="225" textAnchor="middle" fill="var(--onyx-text)" fontSize="12">Kling</text>
        {/* Veo - high quality, premium */}
        <circle cx="120" cy="90" r="10" fill="var(--onyx-cyan)" />
        <text x="120" y="115" textAnchor="middle" fill="var(--onyx-text)" fontSize="12">Veo 3.1</text>
        {/* Seedance - highest quality+audio, premium */}
        <circle cx="90" cy="60" r="10" fill="var(--onyx-cyan)" />
        <text x="90" y="45" textAnchor="middle" fill="var(--onyx-text)" fontSize="12">Seedance 2.0</text>
      </svg>

      <h2 style={h2Style}>Wan — fastest and most affordable</h2>
      <p style={pStyle}>
        Wan is the model to reach for when you're testing an idea, iterating on
        composition, or generating a high volume of content where the cheapest
        possible generation cost matters more than maximum polish. Its real
        advantage is seed-locking — Wan lets you fix the specific random
        variation behind a generation, so you can draft cheap, find a
        composition you like, then reuse that exact seed on a longer or
        higher-quality re-run without losing the shot. Read our full{" "}
        <Link to="/learn/wan-prompting" style={{ color: "var(--onyx-cyan)" }}>Wan Prompting Guide</Link>{" "}
        for the seed-lock workflow in detail.
      </p>

      <h2 style={h2Style}>Kling — our balanced default</h2>
      <p style={pStyle}>
        Kling is the model most Onyx Reelz reels are actually built on. It
        offers strong general-purpose quality, full support for character
        consistency through reference photos, and motion-reference clips for
        carrying a specific movement style into a new scene. It doesn't support
        seed-locking, so each generation is its own independent attempt rather
        than something to fine-tune iteratively — but its Character Library
        integration makes it the natural choice for any content built around a
        recurring, recognizable character. See our full{" "}
        <Link to="/learn/kling-prompting" style={{ color: "var(--onyx-cyan)" }}>Kling Prompting Guide</Link>{" "}
        for the details on reference tagging and Character Lock.
      </p>

      <h2 style={h2Style}>Veo 3.1 — highest visual fidelity</h2>
      <p style={pStyle}>
        Google's Veo 3.1 is our top-tier model for raw image quality — sharper
        detail, genuinely native vertical framing, and support for longer
        continuous scenes. It costs more than Kling, and like Wan, it supports
        seed-locking — making it a natural "finishing" step: draft on Wan, lock
        the seed, then upgrade to Veo once you know the shot is right.{" "}
        <Link to="/learn/veo-prompting" style={{ color: "var(--onyx-cyan)" }}>Full guide here</Link>.
      </p>

      <h2 style={h2Style}>Seedance 2.0 — premium quality with native audio</h2>
      <p style={pStyle}>
        Seedance 2.0 is our most expensive model, and the only one that
        generates audio and video together in a single pass — no separate
        lip-sync step required. It's the strongest choice for scenes with
        complex physical motion — action, dance, sports — where realistic
        movement is what the shot depends on, or any time you want sound baked
        directly into the clip. It doesn't currently support Kling's
        character-reference tagging system, so it's better suited to
        standalone, motion-driven shots than character-consistent
        storytelling.{" "}
        <Link to="/learn/seedance-prompting" style={{ color: "var(--onyx-cyan)" }}>Full guide here</Link>.
      </p>

      <h2 style={h2Style}>A simple rule of thumb</h2>
      <p style={pStyle}>
        Draft and iterate on Wan. Build the bulk of your reel on Kling,
        especially anything involving a consistent character. Upgrade your
        single most important shot to Veo when visual quality needs to carry
        the moment. Reach for Seedance specifically when a scene's motion or
        audio genuinely calls for it — not as a default, but as a deliberate
        choice for the shots that need it most.
      </p>
      <svg viewBox="0 0 500 100" style={{ width: "100%", maxWidth: 500, margin: "24px auto", display: "block" }}>
        {["Draft (Wan)", "Build (Kling)", "Finish (Veo)"].map((label, i) => (
          <g key={label} transform={`translate(${i * 170 + 10}, 20)`}>
            <rect width="150" height="60" rx="8" fill="none" stroke="var(--onyx-cyan)" />
            <text x="75" y="35" textAnchor="middle" fill="var(--onyx-text)" fontSize="13">{label}</text>
            {i < 2 && <text x="160" y="40" fill="var(--onyx-text-faint)" fontSize="18">→</text>}
          </g>
        ))}
      </svg>

      <h2 style={h2Style}>Mixing models within one reel</h2>
      <p style={pStyle}>
        There's no requirement to use a single model for an entire reel. A
        common, effective pattern: draft every scene on Wan first to lock
        pacing and composition, finalize the character-driven dialogue scenes
        on Kling, and reserve Veo or Seedance for the one or two shots that
        need to look or sound exceptional.
      </p>

      <p style={{ ...pStyle, marginBottom: 0 }}>
        Ready to start? Head to <Link to="/create" style={{ color: "var(--onyx-cyan)" }}>Create</Link> and pick a model per scene as you build.
      </p>
    </LearnPageLayout>
  );
}
