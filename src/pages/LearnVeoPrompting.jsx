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

      <h2 style={h2Style}>Google's highest-fidelity model on Onyx Reelz</h2>
      <p style={pStyle}>
        Veo 3.1 is our top-tier model for raw visual quality — sharper detail,
        genuinely native vertical framing (rather than a landscape shot cropped
        to fit), and support for longer, more continuous scenes than our other
        engines typically handle well.
      </p>

      <h2 style={h2Style}>Prompt with real intention</h2>
      <p style={pStyle}>
        The same subject-then-{" "}
        <Link to="/learn/camera-glossary" style={{ color: "var(--onyx-cyan)" }}>camera movement, shot composition</Link>
        -then-lighting structure applies, but Veo rewards precision more than
        most. Naming the actual lighting condition — "overcast diffuse
        daylight" rather than just "nice lighting" — or the actual lens
        behavior — "shallow depth of field, soft background blur" rather than
        "cinematic" — tends to produce noticeably more controlled,
        intentional-looking results.
      </p>

      <h2 style={h2Style}>Seed-locking, same as Wan</h2>
      <p style={pStyle}>
        Veo 3.1 also supports a reproducible seed, the same workflow described
        in our Wan guide: draft a composition, lock in the seed once it's
        right, then re-run at higher settings without losing the specific shot
        you liked. This makes Veo a natural "finishing" step after drafting on
        Wan — carry the seed forward, upgrade the quality.
      </p>

      <h2 style={h2Style}>One action per scene</h2>
      <p style={pStyle}>
        As with every model, a single well-described motion outperforms
        several actions stacked into one short clip.
      </p>

      <h2 style={h2Style}>When to reach for Veo 3.1</h2>
      <p style={pStyle}>
        Choose Veo when visual quality is genuinely the priority — a hero shot
        in a reel, a key narrative beat, or any clip meant to be the
        best-looking moment in your video. It costs more than Kling, and the
        difference is most visible in detail-heavy or texture-heavy scenes —
        skin, fabric, water, reflective surfaces — where Veo's extra fidelity
        actually shows.
      </p>

      <p style={{ ...pStyle, marginBottom: 0 }}>
        Ready to try it? <Link to="/create" style={{ color: "var(--onyx-cyan)" }}>Start creating</Link> with Veo 3.1 on Onyx Reelz.
      </p>
    </LearnPageLayout>
  );
}
