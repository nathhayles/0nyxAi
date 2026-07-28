import { Link } from "react-router-dom";
import LearnPageLayout from "../components/LearnPageLayout";
import { learnPages } from "../data/learnPagesSeo";

const h2Style = { fontSize: 20, fontWeight: 700, color: "var(--onyx-text)", marginTop: 36, marginBottom: 12 };
const pStyle = { color: "var(--onyx-text-dim)", fontSize: 15, marginBottom: 16 };

export default function LearnHistoricalCinematic() {
  return (
    <LearnPageLayout
      seo={learnPages.find(p => p.path === "/learn/historical-cinematic")}
    >
      <p style={{ color: "var(--onyx-text-dim)", fontSize: 15, marginBottom: 32 }}>
        How to create dramatic, film-quality historical and narrative content.
      </p>

      <h2 style={h2Style}>Built for narrative from the ground up</h2>
      <p style={pStyle}>
        Cinematic is Onyx Reelz's default creative mode, tuned for dramatic
        lighting, considered camera work, and a genuine film look rather than
        a flat, commercial aesthetic. For historical drama, period
        storytelling, or any narrative content where visual atmosphere
        carries real weight, this is the natural starting point.
      </p>

      <h2 style={h2Style}>Use the full camera vocabulary deliberately</h2>
      <p style={pStyle}>
        Cinematic storytelling depends on camera choices that mean something,
        not just movement for its own sake. A low angle makes a figure feel
        powerful or imposing — useful for a commanding historical leader or a
        moment of triumph. A high angle does the opposite, making a subject
        feel small or overwhelmed — fitting for a moment of defeat or
        vulnerability. A slow tracking shot pulls a viewer into a scene's
        motion; a static wide establishing shot lets a moment breathe. See
        our full{" "}
        <Link to="/learn/camera-glossary" style={{ color: "var(--onyx-cyan)" }}>Camera Glossary</Link>{" "}
        for the complete toolkit and when each choice actually earns its
        place in a scene.
      </p>
      <svg viewBox="0 0 400 140" role="img" aria-labelledby="historical-angle-title" style={{ width: "100%", maxWidth: 400, margin: "24px auto", display: "block" }}>
        <title id="historical-angle-title">Low camera angle conveys power in historical storytelling, high camera angle conveys vulnerability</title>
        <g transform="translate(20,10)">
          <polygon points="60,10 45,40 75,40" fill="var(--onyx-cyan)" />
          <circle cx="60" cy="70" r="16" fill="var(--onyx-text-dim)" />
          <text x="60" y="115" textAnchor="middle" fill="var(--onyx-text)" fontSize="10">Low angle</text>
          <text x="60" y="130" textAnchor="middle" fill="var(--onyx-text-faint)" fontSize="9">powerful, heroic</text>
        </g>
        <g transform="translate(220,10)">
          <circle cx="60" cy="40" r="16" fill="var(--onyx-text-dim)" />
          <polygon points="60,100 45,70 75,70" fill="var(--onyx-cyan)" />
          <text x="60" y="115" textAnchor="middle" fill="var(--onyx-text)" fontSize="10">High angle</text>
          <text x="60" y="130" textAnchor="middle" fill="var(--onyx-text-faint)" fontSize="9">vulnerable, small</text>
        </g>
      </svg>

      <h2 style={h2Style}>Keep a character consistent across a long story</h2>
      <p style={pStyle}>
        Historical and narrative content often follows the same character
        across many scenes — sometimes an entire arc. Use the Character
        Library and Character Lock to hold their appearance steady from the
        opening shot to the last, rather than relying on a text description
        that reinterprets them slightly differently each time. Our{" "}
        <Link to="/learn/character-consistency" style={{ color: "var(--onyx-cyan)" }}>Character Consistency Guide</Link>{" "}
        covers the full setup.
      </p>

      <h2 style={h2Style}>Chain scenes for real continuity</h2>
      <p style={pStyle}>
        A multi-scene pipeline with Character Lock enabled carries visual
        continuity forward automatically — lighting, setting, and character
        appearance flow from one scene into the next the way a real
        continuous story would, rather than resetting with each new
        generation. This matters especially for historical content, where
        maintaining a believable, consistent world across many scenes is
        often what separates something that feels like a real story from a
        series of disconnected clips.
      </p>
      <svg viewBox="0 0 500 100" role="img" aria-labelledby="historical-chain-title" style={{ width: "100%", maxWidth: 500, margin: "24px auto", display: "block" }}>
        <title id="historical-chain-title">Character Lock chains multiple scenes together for continuous historical narrative storytelling</title>
        {[0, 1, 2, 3].map(i => (
          <g key={i} transform={`translate(${i * 125 + 10}, 20)`}>
            <rect width="100" height="55" rx="6" fill="none" stroke="var(--onyx-cyan)" />
            <text x="50" y="32" textAnchor="middle" fill="var(--onyx-text)" fontSize="10">Scene {i + 1}</text>
            {i < 3 && <text x="108" y="35" fill="var(--onyx-text-faint)" fontSize="14">→</text>}
          </g>
        ))}
      </svg>

      <h2 style={h2Style}>Choosing the right model for dramatic weight</h2>
      <p style={pStyle}>
        Not every scene in a historical narrative needs the same visual
        fidelity. Draft your pacing and composition cheaply on Wan, build the
        character-driven dialogue scenes on Kling with Character Lock, and
        reserve Veo 3.1 for the single hero shot that needs to carry real
        dramatic weight — a defining moment, a striking landscape, a
        close-up meant to linger. Our full{" "}
        <Link to="/learn/choosing-a-model" style={{ color: "var(--onyx-cyan)" }}>model comparison</Link>{" "}
        walks through when each choice earns its cost.
      </p>

      <h2 style={h2Style}>Getting started</h2>
      <p style={{ ...pStyle, marginBottom: 0 }}>
        Build your central character in the{" "}
        <Link to="/characters" style={{ color: "var(--onyx-cyan)" }}>Character Library</Link>,
        then start structuring your narrative scene by scene on{" "}
        <Link to="/create" style={{ color: "var(--onyx-cyan)" }}>Create</Link>{" "}
        — naming camera movement and composition deliberately where the
        story calls for it, and letting the system fill in fitting choices
        where it doesn't.
      </p>
    </LearnPageLayout>
  );
}
