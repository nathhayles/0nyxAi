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
        athletic build, mid-20s" — gives an AI video model a rough starting
        point, but it reinterprets that description completely fresh on every
        single generation. The result is a character who subtly shifts from
        scene to scene: different facial features, different build, sometimes
        different hair entirely, even though the text prompt never changed.
        For any content built around a recurring character, this
        inconsistency undermines the whole point.
      </p>

      <h2 style={h2Style}>The fix: real reference photos, not adjectives</h2>
      <p style={pStyle}>
        AI video models read actual reference images far more reliably than
        written descriptions. Upload two or more real photos to a Character in
        your Character Library, and every generation that references that
        Character draws from the same concrete visual source — the same face,
        the same features, held consistently rather than reimagined each time.
      </p>

      <h2 style={h2Style}>Tagging a character in your prompt</h2>
      <p style={pStyle}>
        Once a Character exists in your library, you can tag them directly
        inside a scene's prompt text. On Kling, this uses the @Element1 (or
        @Element2 for a second reference) tagging system — the tag binds to
        the actual reference photo, and Kling never renders the tag itself as
        visible text. You don't need to re-describe the character's
        appearance in every scene; the tag does that work for you,
        consistently.
      </p>

      <h2 style={h2Style}>Character Lock for multi-scene reels</h2>
      <p style={pStyle}>
        For a reel built across several connected scenes, turn on Character
        Lock. Every scene in the pipeline automatically inherits the same
        character reference — including a real extracted frame from the
        previous scene's own output, not just the original upload photo. This
        means appearance, lighting, and setting carry forward naturally from
        shot to shot, the way a real continuous scene would, rather than
        resetting with each new generation.
      </p>

      <h2 style={h2Style}>Reference mode: two settings, two real purposes</h2>
      <p style={pStyle}>
        Every Character has a reference mode setting with two options, and
        choosing the right one matters.
      </p>
      <p style={pStyle}>
        Scene Accuracy lets the character's appearance adapt naturally to
        whatever a given scene describes — different lighting, different
        angle, different context — while still drawing on the same underlying
        reference. This favors flexibility.
      </p>
      <p style={pStyle}>
        Character Consistency locks appearance more tightly across every
        generation, prioritizing "this always looks like the same specific
        person" over scene-by-scene visual variation. This favors continuity.
      </p>
      <p style={pStyle}>
        Neither is universally correct — a reel with dramatically different
        scene settings (a character at home, then outdoors, then at work) may
        benefit from Scene Accuracy's flexibility, while a tightly serialized
        piece of content (recurring host, recurring mascot) usually benefits
        from Character Consistency's stricter lock.
      </p>

      <h2 style={h2Style}>What this doesn't do</h2>
      <p style={pStyle}>
        Character consistency through reference photos anchors appearance —
        face, build, general look. It doesn't control wardrobe, expression, or
        pose on its own; those still come from what you describe in each
        scene's prompt text. A character can look like the same person while
        wearing different outfits or expressing different emotions scene to
        scene, which is usually exactly what you want for real storytelling.
      </p>

      <h2 style={h2Style}>Getting started</h2>
      <p style={{ ...pStyle, marginBottom: 0 }}>
        Head to your{" "}
        <Link to="/characters" style={{ color: "var(--onyx-cyan)" }}>Character Library</Link>{" "}
        to create your first Character, upload at least two clear reference
        photos, and choose a reference mode. From there, tag them directly in
        your scene prompts on the{" "}
        <Link to="/create" style={{ color: "var(--onyx-cyan)" }}>Create</Link>{" "}
        page and — for multi-scene reels — enable Character Lock to carry that
        consistency all the way through.
      </p>
    </LearnPageLayout>
  );
}
