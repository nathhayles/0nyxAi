import { Link } from "react-router-dom";
import LearnPageLayout from "../components/LearnPageLayout";

const h2Style = { fontSize: 20, fontWeight: 700, color: "var(--onyx-text)", marginTop: 36, marginBottom: 12 };
const pStyle = { color: "var(--onyx-text-dim)", fontSize: 15, marginBottom: 16 };

export default function LearnHistoricalCinematic() {
  return (
    <LearnPageLayout
      seo={{
        title: "Historical & Cinematic Storytelling",
        description: "How to create dramatic, film-quality historical and narrative content with Onyx Reelz.",
        path: "/learn/historical-cinematic",
      }}
    >
      <Link to="/learn" style={{ fontSize: 13, color: "var(--onyx-text-faint)", textDecoration: "none", display: "inline-block", marginBottom: 16 }}>&larr; Back to Learn</Link>
      <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 8 }}>Historical &amp; Cinematic Storytelling</h1>
      <p style={{ color: "var(--onyx-text-dim)", fontSize: 15, marginBottom: 32 }}>
        How to create dramatic, film-quality historical and narrative content.
      </p>

      <h2 style={h2Style}>Built for narrative from the ground up</h2>
      <p style={pStyle}>
        Cinematic is Onyx Reelz's default creative mode — tuned for dramatic
        lighting, considered camera work, and a genuine film look.
      </p>

      <h2 style={h2Style}>Use the full camera vocabulary</h2>
      <p style={pStyle}>
        Low angles for power, high angles for vulnerability, tracking shots
        for immersion, crash zooms for urgency. See our{" "}
        <Link to="/learn/camera-glossary" style={{ color: "var(--onyx-cyan)" }}>Camera Glossary</Link>{" "}
        for the full toolkit and when to reach for each one.
      </p>

      <h2 style={h2Style}>Keep characters consistent across a scene</h2>
      <p style={pStyle}>
        Historical and narrative content often needs the same character
        across many scenes. Use the Character Library and Character Lock to
        hold their appearance steady from the opening shot to the last.
      </p>

      <h2 style={h2Style}>Chain scenes for continuity</h2>
      <p style={{ ...pStyle, marginBottom: 0 }}>
        Multi-scene pipelines carry visual continuity forward automatically —
        lighting, setting, and character appearance flow from one scene into
        the next rather than resetting each time.
      </p>
    </LearnPageLayout>
  );
}
