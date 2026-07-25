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

      <h2 style={h2Style}>Onyx Reelz's premium model — native audio, sharper motion</h2>
      <p style={pStyle}>
        Seedance 2.0 is our highest-quality video model, generating video and audio
        together in a single pass — no separate lip-sync or sound step required. It
        costs more than our other engines, but delivers noticeably better motion
        physics and detail, especially for complex scenes.
      </p>

      <h2 style={h2Style}>Structure your prompt the same way as any strong video prompt</h2>
      <p style={pStyle}>
        Subject and action first — Seedance weights the opening of your prompt most
        heavily, same as our other models. Follow with environment, camera, and
        lighting — see our{" "}
        <Link to="/learn/camera-glossary" style={{ color: "var(--onyx-cyan)" }}>Camera Glossary</Link>{" "}
        for the full vocabulary. Aim for real detail, not just length — 60-100 words
        of specifics beats a much longer, vaguer prompt.
      </p>

      <h2 style={h2Style}>One action per scene</h2>
      <p style={pStyle}>
        Pick a single, clear motion. Stacking multiple actions into one clip
        produces muddier, less predictable results than one well-described beat.
      </p>

      <h2 style={h2Style}>Native audio, included</h2>
      <p style={pStyle}>
        Unlike our other engines, Seedance 2.0 generates audio — dialogue, ambient
        sound, music — as part of the same generation, matched to the visuals
        automatically. You don't need a separate voiceover or sound pass for scenes
        that just need atmosphere.
      </p>

      <h2 style={h2Style}>When to reach for Seedance 2.0</h2>
      <p style={pStyle}>
        Choose it for scenes with complex movement — action, dancing, sports,
        physical interactions — where motion realism matters most, or when you want
        audio baked directly into the clip rather than added afterward.
      </p>

      <p style={{ ...pStyle, marginBottom: 0 }}>
        Ready to try it? <Link to="/create" style={{ color: "var(--onyx-cyan)" }}>Start creating</Link> with Seedance 2.0 on Onyx Reelz.
      </p>
    </LearnPageLayout>
  );
}
