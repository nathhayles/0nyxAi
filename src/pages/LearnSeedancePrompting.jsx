import { Link } from "react-router-dom";
import LearnPageLayout from "../components/LearnPageLayout";

const h2Style = { fontSize: 20, fontWeight: 700, color: "var(--onyx-text)", marginTop: 36, marginBottom: 12 };
const pStyle = { color: "var(--onyx-text-dim)", fontSize: 15, marginBottom: 16 };

export default function LearnSeedancePrompting() {
  return (
    <LearnPageLayout
      seo={{
        title: "Seedance 2.0 Prompting Guide",
        description: "How to get the best results from Seedance 2.0, our premium AI video model with native audio generation, on Onyx Reelz.",
        path: "/learn/seedance-prompting",
      }}
    >
      <Link to="/learn" style={{ fontSize: 13, color: "var(--onyx-text-faint)", textDecoration: "none", display: "inline-block", marginBottom: 16 }}>&larr; Back to Learn</Link>
      <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 8 }}>Seedance 2.0 Prompting Guide</h1>
      <p style={{ color: "var(--onyx-text-dim)", fontSize: 15, marginBottom: 32 }}>
        How to get the best results from Seedance 2.0, our premium AI video model with native audio generation.
      </p>

      <h2 style={h2Style}>Onyx Reelz's premium model</h2>
      <p style={pStyle}>
        Seedance 2.0 is our highest-quality video model — the only one on Onyx
        Reelz that generates video and audio together, in a single pass, rather
        than requiring a separate lip-sync or sound step afterward. It costs
        more per generation than our other engines, and the difference shows up
        most clearly in scenes with complex motion: physical action, dance,
        sports, and anything where realistic movement is the whole point of the
        shot.
      </p>

      <h2 style={h2Style}>The same core structure, with real specificity rewarded</h2>
      <p style={pStyle}>
        Like every model on Onyx Reelz, Seedance responds best to a clear
        structure: subject and action first, then environment, camera, and
        lighting — see our{" "}
        <Link to="/learn/camera-glossary" style={{ color: "var(--onyx-cyan)" }}>Camera Glossary</Link>{" "}
        for the full vocabulary. Seedance in particular rewards genuine detail —
        aim for 60 to 100 words of real, concrete description rather than a much
        longer prompt padded with vague mood language. "A woman sprints across
        wet pavement, rain streaking past the frame, streetlights blurring
        behind her" gives Seedance far more to work with than "a dramatic
        action scene."
      </p>

      <h2 style={h2Style}>One action per scene, still</h2>
      <p style={pStyle}>
        The same discipline that makes any AI video prompt work applies here
        too. Stack two or three actions into one clip and you'll usually get a
        muddier, less predictable result than committing to one well-described
        beat.
      </p>

      <h2 style={h2Style}>Native audio, genuinely included</h2>
      <p style={pStyle}>
        This is Seedance 2.0's real differentiator. Dialogue, ambient sound, and
        music are generated as part of the same pass as the video — matched to
        what's happening on screen automatically, at no extra cost regardless of
        whether you request it. For a scene that just needs atmosphere — wind,
        footsteps, distant traffic — you don't need a separate voiceover or
        sound-design step the way you would with our other models.
      </p>
      <p style={pStyle}>
        If your scene involves a character speaking specific dialogue, describe
        both what they're doing and roughly what kind of vocal delivery you
        want — "she speaks urgently, low and controlled" — since Seedance is
        interpreting tone from your description, not from a separate script
        field.
      </p>

      <h2 style={h2Style}>Where Seedance fits relative to our other models</h2>
      <p style={pStyle}>
        Seedance 2.0 sits above Kling in both cost and typical output quality,
        particularly for motion-heavy content. It doesn't currently support the
        character-reference tagging system Kling uses (@Element1), so it's not
        the right choice for a scene that depends on a specific recurring
        character's appearance — use Kling with Character Lock for that, and
        reach for Seedance when the scene's own motion or audio is what matters
        most.
      </p>

      <h2 style={h2Style}>When to reach for Seedance 2.0</h2>
      <p style={pStyle}>
        Choose it for scenes with genuine physical complexity — a dance
        sequence, an action beat, sports footage, anything where realistic
        movement is the star of the shot — or any time you want audio baked
        directly into the clip rather than layered on afterward. For
        straightforward dialogue scenes or character-driven storytelling where
        consistency matters more than raw motion fidelity, Kling with Character
        Lock is usually the better fit.
      </p>

      <p style={{ ...pStyle, marginBottom: 0 }}>
        Ready to try it? <Link to="/create" style={{ color: "var(--onyx-cyan)" }}>Start creating</Link> with Seedance 2.0 on Onyx Reelz.
      </p>
    </LearnPageLayout>
  );
}
