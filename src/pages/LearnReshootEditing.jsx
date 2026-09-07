import { Link } from "react-router-dom";
import LearnPageLayout from "../components/LearnPageLayout";
import { learnPages } from "../data/learnPagesSeo";

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

export default function LearnReshootEditing() {
  return (
    <LearnPageLayout
      seo={learnPages.find(p => p.path === "/learn/reshoot-editing")}
    >
      <p style={{ color: "var(--onyx-text-dim)", fontSize: 15, marginBottom: 32 }}>
        How Reshoot edits a clip you already have — instead of generating a new one from scratch.
      </p>

      <h2 style={h2Style}>Edit the footage, not the seed</h2>
      <p style={pStyle}>
        Every other tool on Onyx Reelz generates a new clip from a prompt or
        photo. Reshoot does something different: point it at a clip you
        already have — one you generated in Onyx, or something you
        uploaded — describe what you want changed, and it edits that actual
        footage instead of replacing it. The original composition and motion
        stay intact; only what you asked to change, changes. Find it on the{" "}
        <Link to="/create" style={{ color: "var(--onyx-cyan)" }}>Create page</Link>{" "}
        under "Reshoot," alongside Video to Reel and Audio to Video.
      </p>

      <h2 style={h2Style}>A real edit, before and after</h2>
      <p style={pStyle}>
        A genuine Reshoot edit run on Onyx Reelz — the same source clip, one
        instruction ("change the setting from a sunny summer meadow to a
        snowy winter field at dusk, keep the puppy and its running motion
        exactly the same"), nothing else touched:
      </p>
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
          <video src="https://pub-31e667ae894f4cddbf03ae6a7578eff1.r2.dev/kling_2836bb93-2501-4926-95e8-a3cbe1fe1341.mp4" controls loop muted playsInline preload="metadata" style={videoStyle} />
        </div>
        <div style={{ flex: "1 1 200px", minWidth: 160, maxWidth: 260 }}>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.4, textTransform: "uppercase", color: "var(--onyx-cyan)", marginBottom: 8 }}>
            After Reshoot
          </div>
          <video src="https://pub-31e667ae894f4cddbf03ae6a7578eff1.r2.dev/kling_452caf74-3655-4435-b62b-dd0593b24d21.mp4" controls loop muted playsInline preload="metadata" style={videoStyle} />
        </div>
      </div>
      <p style={{ ...pStyle, marginTop: 8 }}>
        Same puppy, same running motion, same camera framing — only the
        season, ground, and light actually changed, because that's the only
        thing the prompt asked for.
      </p>

      <h2 style={h2Style}>Fix instead of reroll</h2>
      <p style={pStyle}>
        A generated scene that's 90% right doesn't need to become a totally
        different scene to fix the 10%. If the framing's slightly off, a
        prop looks wrong, or you just want a different mood on the same
        shot, Reshoot changes that one thing rather than rolling a brand new
        generation and hoping the rest comes out the same.
      </p>

      <h2 style={h2Style}>Kling O1 vs O3 Pro: which to pick</h2>
      <p style={pStyle}>
        Reshoot runs on Kling's O1 and O3 Pro video-to-video edit models —
        pick O1 for fast edits, or O3 Pro when you want the higher-quality
        pass. There's no single right answer; it's a real speed-vs-quality
        tradeoff you make per edit, right there in the tool. A quick
        exploratory pass or a simple, well-defined change (a color grade,
        a straightforward background swap) is a good fit for O1. A more
        demanding edit — a change with a lot riding on getting the physical
        detail right, or footage headed straight to a final export — is
        where the extra time for O3 Pro tends to pay for itself.
      </p>

      <h2 style={h2Style}>Keep the audio if you want it</h2>
      <p style={pStyle}>
        Reshoot can carry the original clip's audio through the edit, so a
        voiceover or ambient sound doesn't need to be re-synced afterward.
        Leave it off (the default) when the edit changes something the
        original audio was tied to — a different environment usually means
        different ambient sound too.
      </p>

      <h2 style={h2Style}>Tag characters the same way you already do</h2>
      <p style={pStyle}>
        Reference images and Character Library <code>@Name</code> tags work
        in Reshoot exactly like they do in generation — type <code>@Name</code>{" "}
        in the prompt to bring in a saved Character Library element, or
        upload a plain reference image directly, up to 4 per edit. No
        second system to learn.
      </p>

      <h2 style={h2Style}>What Reshoot needs from your source clip</h2>
      <p style={pStyle}>
        The source video has to be an MP4 or MOV, 3–10 seconds long,
        720–2160px, and under 200MB — Onyx checks this before charging
        anything, so an out-of-range clip gets rejected up front rather than
        silently trimmed or degraded. If you're bringing in a reference
        image alongside the edit, it needs to match your source clip's
        aspect ratio.
      </p>

      <p style={{ ...pStyle, marginBottom: 0 }}>
        Ready to try it? Head to{" "}
        <Link to="/create" style={{ color: "var(--onyx-cyan)" }}>Create</Link> and
        pick Reshoot to edit a clip you already have on Onyx Reelz.
      </p>
    </LearnPageLayout>
  );
}
