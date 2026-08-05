import { Link } from "react-router-dom";
import LearnPageLayout from "../components/LearnPageLayout";
import { learnPages } from "../data/learnPagesSeo";

const h2Style = { fontSize: 20, fontWeight: 700, color: "var(--onyx-text)", marginTop: 36, marginBottom: 12 };
const pStyle = { color: "var(--onyx-text-dim)", fontSize: 15, marginBottom: 16 };
const bulletStyle = { ...pStyle, marginBottom: 8, paddingLeft: 16 };
const tdStyle = { padding: "10px 14px", borderBottom: "1px solid var(--onyx-hairline-strong)", color: "var(--onyx-text-dim)", fontSize: 14, textAlign: "left" };
const thStyle = { ...tdStyle, color: "var(--onyx-text)", fontWeight: 700, borderBottom: "1px solid var(--onyx-hairline-strong)" };

const DECISION_ROWS = [
  ["Fast, cheap social clips", "480p, fixed 5s/10s duration"],
  ["Precise timing to match audio/voiceover", "Continuous or fine-grained duration control"],
  ["Cinematic widescreen shots", "A model with 21:9 support, not just 16:9/9:16"],
  ["Portfolio-quality output", "1080p, even at a higher per-second cost"],
];

export default function LearnModelComparison() {
  return (
    <LearnPageLayout
      seo={learnPages.find(p => p.path === "/learn/model-comparison")}
    >
      <p style={{ color: "var(--onyx-text-dim)", fontSize: 15, marginBottom: 32 }}>
        Not all AI video models are built the same — and the differences
        matter more than most comparisons let on. Duration limits,
        resolution, and aspect ratio support vary widely between models, and
        picking the wrong one for your shot can mean paying for a resolution
        you didn't need, or hitting a hard limit mid-project you didn't know
        existed. Here's a real breakdown of what today's leading AI video
        models actually support.
      </p>

      <h2 style={h2Style}>Duration: how long can a single generation actually be?</h2>
      <p style={pStyle}>
        Most AI video models don't give you a free choice of length — they're
        built around fixed durations or a narrow range:
      </p>
      <p style={bulletStyle}>
        <strong style={{ color: "var(--onyx-text)" }}>Fixed 5s/10s models</strong>{" "}
        (common across several major providers) only generate in two
        discrete lengths — nothing in between.
      </p>
      <p style={bulletStyle}>
        <strong style={{ color: "var(--onyx-text)" }}>Wider-range models</strong>{" "}
        can generate anywhere from 2 to 12+ seconds in one-second
        increments, giving you much finer control over pacing.
      </p>
      <p style={bulletStyle}>
        <strong style={{ color: "var(--onyx-text)" }}>Continuous-range models</strong>{" "}
        allow any duration within a broad window (commonly 1–16 seconds),
        which is ideal when you need a shot to match a specific beat in your
        edit.
      </p>
      <p style={pStyle}>
        If your workflow depends on hitting exact timing — matching a
        voiceover, syncing to a music beat — a model with continuous or
        fine-grained duration control will save you editing time later, even
        if the per-second cost is slightly higher.
      </p>

      <h2 style={h2Style}>Resolution: 480p vs 720p vs 1080p</h2>
      <p style={pStyle}>
        Resolution differences aren't just about sharpness — they usually
        come with real price differences too:
      </p>
      <p style={bulletStyle}>
        <strong style={{ color: "var(--onyx-text)" }}>480p</strong> is the
        budget tier across most providers, typically a fraction of the cost
        of higher resolutions, and genuinely fine for draft iterations,
        vertical mobile content, or fast social clips where absolute
        sharpness isn't the priority.
      </p>
      <p style={bulletStyle}>
        <strong style={{ color: "var(--onyx-text)" }}>720p</strong> sits in a
        strong middle ground — noticeably crisper than 480p without the
        premium pricing of full HD.
      </p>
      <p style={bulletStyle}>
        <strong style={{ color: "var(--onyx-text)" }}>1080p</strong> delivers
        the cleanest output, ideal for anything you'll upscale, feature in a
        portfolio, or use in paid advertising — but expect a real price jump,
        often 2–3x the cost of the budget tier from the same provider.
      </p>
      <p style={pStyle}>
        A smart workflow: generate drafts at a cheaper resolution to lock in
        your composition and prompt, then only spend on the higher tier once
        you know the shot works.
      </p>

      <h2 style={h2Style}>Aspect ratio: don't assume every model supports every format</h2>
      <p style={pStyle}>
        This is the one most people overlook. Vertical 9:16 (for Reels,
        TikTok, Shorts) is near-universal, but wider formats aren't
        guaranteed:
      </p>
      <p style={bulletStyle}>
        — Most current-generation models support the core trio:{" "}
        <strong style={{ color: "var(--onyx-text)" }}>16:9</strong> (landscape),{" "}
        <strong style={{ color: "var(--onyx-text)" }}>9:16</strong> (vertical), and{" "}
        <strong style={{ color: "var(--onyx-text)" }}>1:1</strong> (square).
      </p>
      <p style={bulletStyle}>
        — Some newer models go further, adding{" "}
        <strong style={{ color: "var(--onyx-text)" }}>21:9</strong> (cinematic
        ultrawide), <strong style={{ color: "var(--onyx-text)" }}>4:3</strong>,
        and <strong style={{ color: "var(--onyx-text)" }}>3:4</strong> — useful
        if you're going for a specific cinematic look rather than standard
        social formats.
      </p>
      <p style={bulletStyle}>
        — A few models are locked to a narrower set — commonly just 16:9 and
        9:16, with no square option at all.
      </p>
      <p style={pStyle}>
        If you're building a true widescreen/cinematic sequence, check aspect
        ratio support before you commit to a model — not every "AI video
        generator" actually gives you the format you need.
      </p>

      <h2 style={h2Style}>Quick decision guide</h2>
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 16 }}>
        <thead>
          <tr>
            <th style={thStyle}>If you need...</th>
            <th style={thStyle}>Look for</th>
          </tr>
        </thead>
        <tbody>
          {DECISION_ROWS.map(([need, look]) => (
            <tr key={need}>
              <td style={tdStyle}>{need}</td>
              <td style={tdStyle}>{look}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2 style={h2Style}>How Onyx Reelz handles this</h2>
      <p style={pStyle}>
        Onyx Reelz gives you real, model-aware controls — the duration and
        aspect ratio options you see are pulled directly from what each model
        actually supports, not a generic one-size-fits-all picker. That means
        no silent clamping, no surprise mismatches between what you selected
        and what you get. See our{" "}
        <Link to="/learn/choosing-a-model" style={{ color: "var(--onyx-cyan)" }}>model comparison guide</Link>{" "}
        for how to pick the right one for a given shot.
      </p>

      <p style={{ ...pStyle, marginBottom: 0 }}>
        Ready to try it yourself? Onyx Reelz gives you access to today's
        leading AI video models — Kling, Veo, Wan, Seedance, and Vidu — in
        one place, with transparent per-model pricing.{" "}
        <Link to="/create" style={{ color: "var(--onyx-cyan)" }}>Start creating &rarr;</Link>
      </p>
    </LearnPageLayout>
  );
}
