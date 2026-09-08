import { Link } from "react-router-dom";
import BlogPageLayout from "../components/BlogPageLayout";
import { blogPosts } from "../data/blogPostsSeo";

const h2Style = { fontSize: 20, fontWeight: 700, color: "var(--onyx-text)", marginTop: 36, marginBottom: 12 };
const pStyle = { color: "var(--onyx-text-dim)", fontSize: 15, marginBottom: 16 };

const videoStyle = {
  width: "100%",
  aspectRatio: "9 / 16",
  objectFit: "cover",
  borderRadius: 8,
  display: "block",
  background: "linear-gradient(160deg, var(--onyx-surface-3), #000)",
};

function BeforeAfter({ beforeSrc, afterSrc, afterLabel }) {
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 16,
        background: "var(--onyx-surface)",
        border: "1px solid var(--onyx-hairline-strong)",
        borderRadius: 12,
        padding: 20,
        margin: "24px 0 8px",
      }}
    >
      <div style={{ flex: "1 1 200px", minWidth: 160, maxWidth: 260 }}>
        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.4, textTransform: "uppercase", color: "var(--onyx-text-faint)", marginBottom: 8 }}>
          Before
        </div>
        <video src={beforeSrc} controls loop muted playsInline preload="metadata" style={videoStyle} />
      </div>
      <div style={{ flex: "1 1 200px", minWidth: 160, maxWidth: 260 }}>
        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.4, textTransform: "uppercase", color: "var(--onyx-cyan)", marginBottom: 8 }}>
          {afterLabel}
        </div>
        <video src={afterSrc} controls loop muted playsInline preload="metadata" style={videoStyle} />
      </div>
    </div>
  );
}

export default function BlogReshootAndStyleSystemLaunch() {
  return (
    <BlogPageLayout
      seo={blogPosts.find((p) => p.path === "/blog/reshoot-and-style-system-launch")}
    >
      <p style={{ color: "var(--onyx-text-dim)", fontSize: 15, marginBottom: 32 }}>
        Two things shipped on Onyx Reelz recently that are easy to miss if
        you're not watching the Create page closely. Both are live now.
      </p>

      <h2 style={h2Style}>Reshoot: stop rerolling the whole scene to fix one thing</h2>
      <p style={pStyle}>
        Every AI video tool treats a finished clip as final — if the
        framing's slightly off, or a prop looks wrong, or you just want a
        different mood on the same shot, the only option has been: throw it
        away and generate again, new seed, new roll of the dice, new credits
        spent.
      </p>
      <p style={pStyle}>
        Reshoot is different: point it at a clip you already have, describe
        what you want changed, and it edits that actual footage instead of
        replacing it. Under the hood it runs through Kling's O1 and O3 Pro
        video-to-video edit models — pick O1 for fast edits, or O3 Pro when
        you want the higher-quality pass. The original composition and
        motion stay intact; only what you asked to change, changes.
        Reference images and Character Library <code>@Name</code> tags work
        exactly like they do in generation, so there's no second system to
        learn.
      </p>
      <p style={pStyle}>
        A real edit, before and after (same source clip, one instruction —
        "change the setting from a sunny summer meadow to a snowy winter
        field at dusk, keep the puppy and its running motion exactly the
        same" — nothing else touched):
      </p>
      <BeforeAfter
        beforeSrc="https://pub-31e667ae894f4cddbf03ae6a7578eff1.r2.dev/kling_2836bb93-2501-4926-95e8-a3cbe1fe1341.mp4"
        afterSrc="https://pub-31e667ae894f4cddbf03ae6a7578eff1.r2.dev/kling_452caf74-3655-4435-b62b-dd0593b24d21.mp4"
        afterLabel="After Reshoot"
      />
      <p style={{ ...pStyle, marginTop: 8 }}>
        Find it on the Create page under "Reshoot." Full guide:{" "}
        <Link to="/learn/reshoot-editing" style={{ color: "var(--onyx-cyan)" }}>
          Reshoot: Editing an Existing Clip
        </Link>.
      </p>

      <h2 style={h2Style}>The Style System: shape how your footage actually looks</h2>
      <p style={pStyle}>
        A lot of what makes AI-generated footage look distinctly
        AI-generated isn't the generation quality — it's the absence of the
        small, deliberate imperfections a real camera and a real color
        grade introduce. The Style System tackles that in two parts:{" "}
        <strong style={{ color: "var(--onyx-text)" }}>style chips</strong>{" "}
        on the Create page prompt box (seven one-tap modifiers —
        Documentary Honest, Human First, Controlled Chaos, Analog/VHS,
        Maximalist, Surreal, Americana — that shape{" "}
        <em>what gets generated</em>), and{" "}
        <strong style={{ color: "var(--onyx-text)" }}>style presets</strong>{" "}
        in the editor's color-grade panel (five full look treatments — VHS
        Analog, Direct Flash, Grunge/Scrapbook, Maximalist, Cyber Goth —
        that shape <em>how the final footage looks</em>, whether it came
        from a fresh generation or a Reshoot edit).
      </p>
      <p style={pStyle}>Use either alone, or stack both together.</p>
      <p style={pStyle}>
        A real VHS Analog pass, same clean/graded before-after pattern as
        the Reshoot embed above — the same source clip, straight through
        the editor's color-grade panel with VHS Analog (90s) applied,
        nothing else touched:
      </p>
      <BeforeAfter
        beforeSrc="https://pub-31e667ae894f4cddbf03ae6a7578eff1.r2.dev/kling_2836bb93-2501-4926-95e8-a3cbe1fe1341.mp4"
        afterSrc="https://pub-31e667ae894f4cddbf03ae6a7578eff1.r2.dev/renders/render_1788900906828_d7c733c8_tagged.mp4"
        afterLabel="After VHS Analog"
      />

      <h2 style={h2Style}>Try them</h2>
      <p style={{ ...pStyle, marginBottom: 0 }}>
        Both are live on{" "}
        <Link to="/create" style={{ color: "var(--onyx-cyan)" }}>Create</Link>{" "}
        right now — no separate opt-in, no waitlist.
      </p>
    </BlogPageLayout>
  );
}
