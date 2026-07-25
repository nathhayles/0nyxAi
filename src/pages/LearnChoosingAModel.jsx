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
        Onyx Reelz gives you a choice of AI video models, each with different
        strengths. Picking the right one for the job saves credits and gets
        better results than defaulting to the same model every time.
      </p>

      <h2 style={h2Style}>Wan — fastest and most affordable</h2>
      <p style={pStyle}>
        Best for drafts, testing ideas, and high-volume content. Supports
        seed-locking, so you can iterate cheaply before committing to a final
        render.
      </p>

      <h2 style={h2Style}>Kling — our balanced default</h2>
      <p style={pStyle}>
        Kling is the model most reels are built on — strong general quality,
        character consistency via reference photos, and support for motion
        reference clips. It doesn't support seed-locking, so treat each
        generation as a fresh attempt rather than something to fine-tune
        iteratively.
      </p>

      <h2 style={h2Style}>Veo 3.1 — highest visual fidelity</h2>
      <p style={pStyle}>
        Google's top-tier model. Sharper detail, native vertical framing, and
        seed-locking support. Costs more, and earns it for hero shots and key
        scenes.
      </p>

      <h2 style={h2Style}>Seedance 2.0 — premium quality with native audio</h2>
      <p style={pStyle}>
        Our most expensive model, and the only one that generates audio and
        video together in a single pass — no separate lip-sync step. Best for
        scenes with complex physical motion (action, dance, sports) or when you
        want sound baked directly into the clip.
      </p>

      <h2 style={h2Style}>A simple rule of thumb</h2>
      <p style={{ ...pStyle, marginBottom: 0 }}>
        Draft and iterate on Wan. Build your reel on Kling. Upgrade your best
        shot to Veo. Reach for Seedance when a scene's motion or audio
        genuinely needs it.
      </p>
    </LearnPageLayout>
  );
}
