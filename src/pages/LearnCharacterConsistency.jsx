import { Link } from "react-router-dom";
import LearnPageLayout from "../components/LearnPageLayout";

const h2Style = { fontSize: 20, fontWeight: 700, color: "var(--onyx-text)", marginTop: 36, marginBottom: 12 };
const pStyle = { color: "var(--onyx-text-dim)", fontSize: 15, marginBottom: 16 };

export default function LearnCharacterConsistency() {
  return (
    <LearnPageLayout
      seo={{
        title: "Character Consistency Guide",
        description: "How to keep an AI-generated character looking the same across every scene, using Onyx Reelz's Character Library.",
        path: "/learn/character-consistency",
      }}
    >
      <Link to="/learn" style={{ fontSize: 13, color: "var(--onyx-text-faint)", textDecoration: "none", display: "inline-block", marginBottom: 16 }}>&larr; Back to Learn</Link>
      <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 8 }}>Character Consistency Guide</h1>
      <p style={{ color: "var(--onyx-text-dim)", fontSize: 15, marginBottom: 32 }}>
        How to keep an AI-generated character looking the same across every scene, using Onyx Reelz's Character Library.
      </p>

      <h2 style={h2Style}>The problem with plain text descriptions</h2>
      <p style={pStyle}>
        Describing a character in words — "a woman with long dark hair,
        athletic build" — gives the AI a rough idea, but it reinterprets that
        description fresh every single generation. The result: a character who
        subtly changes between scenes.
      </p>

      <h2 style={h2Style}>The fix: real reference photos</h2>
      <p style={pStyle}>
        Upload 2 or more real reference photos to a Character in your Character
        Library. AI video models read actual images far more reliably than
        adjectives — the same face, the same features, held consistently
        across every scene that references them.
      </p>

      <h2 style={h2Style}>Tagging a character in your prompt</h2>
      <p style={pStyle}>
        Once a Character exists, tag them directly in your scene text. The tag
        binds to their reference photos automatically — you don't need to
        re-describe their appearance every time.
      </p>

      <h2 style={h2Style}>Character Lock for multi-scene reels</h2>
      <p style={pStyle}>
        Turn on Character Lock for a pipeline of scenes, and every scene
        automatically inherits the same character reference — including a real
        extracted frame from the previous scene, so appearance and setting
        carry forward naturally from shot to shot.
      </p>

      <h2 style={h2Style}>Reference mode: two settings, two purposes</h2>
      <p style={pStyle}>
        Scene Accuracy lets the character adapt naturally to each scene's
        described action and setting. Character Consistency locks appearance
        more tightly, prioritizing "always looks like them" over scene-specific
        variation. Choose based on whether visual continuity or scene
        flexibility matters more for a given reel.
      </p>

      <p style={{ ...pStyle, marginBottom: 0 }}>
        Ready to try it? <Link to="/characters" style={{ color: "var(--onyx-cyan)" }}>Build your Character Library</Link> on Onyx Reelz.
      </p>
    </LearnPageLayout>
  );
}
