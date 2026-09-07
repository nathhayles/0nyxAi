import { Link } from "react-router-dom";
import LearnPageLayout from "../components/LearnPageLayout";
import PromptResultShowcase from "../components/PromptResultShowcase";
import { learnPages } from "../data/learnPagesSeo";

const h2Style = { fontSize: 20, fontWeight: 700, color: "var(--onyx-text)", marginTop: 36, marginBottom: 12 };
const pStyle = { color: "var(--onyx-text-dim)", fontSize: 15, marginBottom: 16 };

export default function LearnSeedance25Prompting() {
  return (
    <LearnPageLayout
      seo={learnPages.find(p => p.path === "/learn/seedance-2-5-prompting")}
    >
      <p style={{ color: "var(--onyx-text-dim)", fontSize: 15, marginBottom: 32 }}>
        How to get the best results from Seedance 2.5, our token-priced flagship model built for physically complex motion.
      </p>

      <h2 style={h2Style}>A different tier from Seedance 2.0</h2>
      <p style={pStyle}>
        Seedance 2.5 is a separate, newer model from{" "}
        <Link to="/learn/seedance-prompting" style={{ color: "var(--onyx-cyan)" }}>Seedance 2.0</Link>,
        not an upgrade toggle on it — the two are priced and specified
        differently, and it's worth knowing which one you're actually
        picking. 2.5 bills per token rather than per second, tops out at
        720p (there's no 1080p tier), and supports a wider reference-image
        and reference-video system for consistency across scenes. Reach for
        it specifically when a scene's physical motion is complex enough
        that you need the extra headroom — 2.0 remains the right default for
        most native-audio work.
      </p>

      <h2 style={h2Style}>The same core structure, with real specificity rewarded</h2>
      <p style={pStyle}>
        Like every model on Onyx Reelz, Seedance responds best to a clear
        structure: subject and action first, then environment, camera, and
        lighting — see our{" "}
        <Link to="/learn/camera-glossary" style={{ color: "var(--onyx-cyan)" }}>Camera Glossary</Link>{" "}
        for the full vocabulary. Aim for real, concrete description rather
        than mood words alone — name the specific motion you want ("a
        spinning headstand," "sneakers scuffing the concrete") rather than a
        general gesture at the scene ("an impressive dance move").
      </p>

      <h2 style={h2Style}>A real prompt, and what it actually produced</h2>
      <p style={pStyle}>
        A genuine Seedance 2.5 prompt from Onyx Reelz, built specifically to
        push the model's motion handling — fast rotation, a real physical
        landing, ambient sound cues — next to the actual clip it produced:
      </p>
      <PromptResultShowcase
        label="Real Seedance 2.5 generation"
        videoUrl="https://pub-31e667ae894f4cddbf03ae6a7578eff1.r2.dev/kling_73b8f525-c732-4707-9242-058aa65aaa5e.mp4"
        prompt="A young breakdancer performs a fast spinning windmill move on a sunlit outdoor basketball court, sneakers scuffing against the concrete with an audible squeak as he spins. A small crowd's cheering and clapping rises as he lands the move cleanly. His jacket flares out mid-spin, dust kicks up from the concrete beneath him. Camera holds a low tracking shot, following the rotation. Golden late-afternoon sunlight casts long shadows across the court, shot on Sony A7, shallow depth of field, film grain, vertical portrait format."
      />
      <p style={pStyle}>
        Notice the prompt names the exact motion (a spinning windmill, not
        just "breakdancing"), a specific physical detail to track (sneakers
        scuffing, dust kicking up), and a real sound cue (the crowd's
        cheering) — all things Seedance can actually render into the scene,
        rather than vague energy words with nothing concrete underneath them.
      </p>

      <h2 style={h2Style}>One action per scene, still</h2>
      <p style={pStyle}>
        The same discipline that makes any AI video prompt work applies here
        too. Stack two or three actions into one clip and you'll usually get
        a muddier, less predictable result than committing to one
        well-described beat — this matters even more at 2.5's price tier,
        where a wasted generation costs more to redo.
      </p>

      <h2 style={h2Style}>Reference images and videos, at a bigger scale than 2.0</h2>
      <p style={pStyle}>
        Seedance 2.5 supports its own reference system for keeping a subject
        consistent across scenes — larger limits than Seedance 2.0's, with
        room for more reference images and reference videos per generation.
        It does not use Kling's <code>@Element1</code>-style character-tagging
        syntax directly — if a scene depends on a specific recurring
        character's exact appearance and you want the Character Library's
        <code>@Name</code> tagging workflow, Kling with Character Lock is
        still the more direct path. Reach for Seedance 2.5's own reference
        system when the priority is complex motion fidelity with a
        consistent subject, not a tagged multi-character scene.
      </p>

      <h2 style={h2Style}>When to reach for Seedance 2.5 specifically</h2>
      <svg viewBox="0 0 400 100" role="img" aria-labelledby="seedance25-usecase-title" style={{ width: "100%", maxWidth: 400, margin: "24px auto", display: "block" }}>
        <title id="seedance25-usecase-title">Seedance 2.5 is best suited for scenes with the most physically demanding motion — fast rotation, real impact, athletic action</title>
        <line x1="20" y1="60" x2="380" y2="60" stroke="var(--onyx-hairline-strong)" />
        <text x="20" y="80" fill="var(--onyx-text-faint)" fontSize="9">Everyday motion (2.0 or Kling)</text>
        <text x="330" y="80" fill="var(--onyx-cyan)" fontSize="9">Athletic / high-speed motion</text>
        <circle cx="340" cy="60" r="8" fill="var(--onyx-cyan)" />
        <text x="200" y="40" textAnchor="middle" fill="var(--onyx-text)" fontSize="11">Motion complexity →</text>
      </svg>
      <p style={{ ...pStyle, marginBottom: 0 }}>
        Choose it for the scenes where 2.0 or Kling's motion still feels a
        step short of the real thing — fast rotation, athletic impact,
        anything where a viewer would immediately notice if the physics
        looked slightly wrong. For most other content, Seedance 2.0's
        native audio or Kling's Character Lock will usually be the better
        cost-to-quality fit. Ready to try it?{" "}
        <Link to="/create" style={{ color: "var(--onyx-cyan)" }}>Start creating</Link> with
        Seedance 2.5 on Onyx Reelz.
      </p>
    </LearnPageLayout>
  );
}
