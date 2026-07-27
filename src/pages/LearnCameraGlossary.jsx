import { Link } from "react-router-dom";
import LearnPageLayout from "../components/LearnPageLayout";
import { learnPages } from "../data/learnPagesSeo";

const h2Style = { fontSize: 20, fontWeight: 700, color: "var(--onyx-text)", marginTop: 36, marginBottom: 12 };
const pStyle = { color: "var(--onyx-text-dim)", fontSize: 15, marginBottom: 16 };
const termStyle = { marginBottom: 10 };
const termLabel = { color: "var(--onyx-text)" };

export default function LearnCameraGlossary() {
  return (
    <LearnPageLayout
      seo={learnPages.find(p => p.path === "/learn/camera-glossary")}
    >
      <Link to="/learn" style={{ fontSize: 13, color: "var(--onyx-text-faint)", textDecoration: "none", display: "inline-block", marginBottom: 16 }}>&larr; Back to Learn</Link>
      <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 8 }}>Camera Movement &amp; Shot Composition Glossary</h1>
      <p style={{ color: "var(--onyx-text-dim)", fontSize: 15, marginBottom: 32 }}>
        A plain-English glossary of camera movements and shot compositions you can use in your Onyx Reelz video prompts.
      </p>

      <h2 style={h2Style}>Why two separate concepts, not one</h2>
      <p style={pStyle}>
        Camera movement and shot composition answer two different questions.
        Movement asks: how does the camera physically move during the shot?
        Composition asks: where is the camera positioned relative to the
        subject, and at what angle? A shot can combine any movement with any
        composition — a slow dolly-in on a wide establishing shot reads
        completely differently from a slow dolly-in on a tight close-up, even
        though the movement itself is identical. Understanding both, and
        choosing them deliberately, is what separates a prompt that produces
        generic footage from one that produces something genuinely cinematic.
      </p>

      <h2 style={h2Style}>Camera movement — how the camera itself moves</h2>
      <svg viewBox="0 0 500 160" style={{ width: "100%", maxWidth: 500, margin: "24px auto", display: "block" }}>
        <circle cx="250" cy="90" r="16" fill="var(--onyx-text-dim)" />
        <text x="250" y="95" textAnchor="middle" fill="var(--onyx-bg)" fontSize="10">SUBJ</text>
        {/* Dolly */}
        <line x1="250" y1="30" x2="250" y2="55" stroke="var(--onyx-cyan)" strokeWidth="2" markerEnd="url(#arrow)" />
        <text x="250" y="20" textAnchor="middle" fill="var(--onyx-text)" fontSize="11">Dolly in / out</text>
        {/* Pan */}
        <line x1="130" y1="90" x2="90" y2="90" stroke="var(--onyx-cyan)" strokeWidth="2" markerEnd="url(#arrow)" />
        <line x1="370" y1="90" x2="410" y2="90" stroke="var(--onyx-cyan)" strokeWidth="2" markerEnd="url(#arrow)" />
        <text x="60" y="94" textAnchor="middle" fill="var(--onyx-text)" fontSize="11">Pan</text>
        <text x="440" y="94" textAnchor="middle" fill="var(--onyx-text)" fontSize="11">Pan</text>
        {/* Tilt */}
        <text x="250" y="150" textAnchor="middle" fill="var(--onyx-text-faint)" fontSize="10">Tilt moves on a vertical axis, same idea rotated 90°</text>
        <defs>
          <marker id="arrow" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
            <path d="M0,0 L8,4 L0,8 Z" fill="var(--onyx-cyan)" />
          </marker>
        </defs>
      </svg>
      <p style={{ ...pStyle, ...termStyle }}>
        <strong style={termLabel}>Dolly in / pull back</strong> — the camera physically moves toward or away from the subject, changing perspective and depth as it travels, distinct from a zoom (which changes framing without moving position).
      </p>
      <p style={{ ...pStyle, ...termStyle }}>
        <strong style={termLabel}>Pan</strong> — a sideways sweep, left or right, from a fixed point, often used to reveal something outside the original frame or follow lateral motion.
      </p>
      <p style={{ ...pStyle, ...termStyle }}>
        <strong style={termLabel}>Tilt up / tilt down</strong> — the same idea as a pan, but on a vertical axis — useful for revealing scale (tilting up a tall building) or shifting emphasis.
      </p>
      <p style={{ ...pStyle, ...termStyle }}>
        <strong style={termLabel}>Tracking shot</strong> — the camera moves alongside a subject as they move through space, staying roughly parallel to them — different from handheld follow, which is looser and more human-feeling.
      </p>
      <p style={{ ...pStyle, ...termStyle }}>
        <strong style={termLabel}>Crash zoom</strong> — a fast, punchy zoom in, typically used for a moment of urgency, surprise, or comedic emphasis.
      </p>
      <p style={{ ...pStyle, ...termStyle }}>
        <strong style={termLabel}>Handheld follow</strong> — a loose, slightly unsteady following motion that reads as more immediate and human than a smooth tracking shot.
      </p>
      <p style={{ ...pStyle, ...termStyle }}>
        <strong style={termLabel}>Whip pan</strong> — an extremely fast pan, often used as a transition device between two shots rather than to reveal something within one.
      </p>
      <p style={{ ...pStyle, ...termStyle }}>
        <strong style={termLabel}>Camera roll</strong> — the frame itself rotates around its center axis — disorienting, often used for dramatic or surreal moments.
      </p>
      <p style={pStyle}>
        <strong style={termLabel}>Rack focus</strong> — the focal point shifts from one subject or depth to another within a single continuous shot, redirecting the viewer's attention without cutting.
      </p>

      <h2 style={h2Style}>Shot composition — where the camera sits relative to the subject</h2>
      <svg viewBox="0 0 500 180" style={{ width: "100%", maxWidth: 500, margin: "24px auto", display: "block" }}>
        {/* Low angle */}
        <g transform="translate(10,10)">
          <rect x="0" y="0" width="140" height="160" rx="8" fill="none" stroke="var(--onyx-hairline-strong)" />
          <circle cx="70" cy="120" r="18" fill="var(--onyx-text-dim)" />
          <rect x="55" y="138" width="30" height="20" fill="var(--onyx-text-dim)" />
          <polygon points="70,10 55,45 85,45" fill="var(--onyx-cyan)" />
          <text x="70" y="70" textAnchor="middle" fill="var(--onyx-text)" fontSize="11">camera looks UP</text>
          <text x="70" y="175" textAnchor="middle" fill="var(--onyx-text-faint)" fontSize="10">Low angle — powerful</text>
        </g>
        {/* Eye level */}
        <g transform="translate(180,10)">
          <rect x="0" y="0" width="140" height="160" rx="8" fill="none" stroke="var(--onyx-hairline-strong)" />
          <circle cx="70" cy="80" r="18" fill="var(--onyx-text-dim)" />
          <rect x="55" y="98" width="30" height="45" fill="var(--onyx-text-dim)" />
          <circle cx="70" cy="80" r="4" fill="var(--onyx-cyan)" />
          <text x="70" y="175" textAnchor="middle" fill="var(--onyx-text-faint)" fontSize="10">Eye level — neutral</text>
        </g>
        {/* High angle */}
        <g transform="translate(350,10)">
          <rect x="0" y="0" width="140" height="160" rx="8" fill="none" stroke="var(--onyx-hairline-strong)" />
          <circle cx="70" cy="60" r="18" fill="var(--onyx-text-dim)" />
          <rect x="55" y="78" width="30" height="60" fill="var(--onyx-text-dim)" />
          <polygon points="70,150 55,115 85,115" fill="var(--onyx-cyan)" />
          <text x="70" y="30" textAnchor="middle" fill="var(--onyx-text)" fontSize="11">camera looks DOWN</text>
          <text x="70" y="175" textAnchor="middle" fill="var(--onyx-text-faint)" fontSize="10">High angle — vulnerable</text>
        </g>
      </svg>
      <p style={{ ...pStyle, ...termStyle }}>
        <strong style={termLabel}>Close-up</strong> — tight framing on a face or object, used to convey emotion, tension, or fine detail that a wider shot would lose.
      </p>
      <p style={{ ...pStyle, ...termStyle }}>
        <strong style={termLabel}>Wide / establishing shot</strong> — shows the full environment, used to set a scene, establish scale, or convey isolation or grandeur.
      </p>
      <p style={{ ...pStyle, ...termStyle }}>
        <strong style={termLabel}>Low angle</strong> — the camera looks up at the subject, making them read as powerful, imposing, or heroic.
      </p>
      <p style={{ ...pStyle, ...termStyle }}>
        <strong style={termLabel}>High angle</strong> — the camera looks down at the subject, making them read as small, vulnerable, or overwhelmed.
      </p>
      <p style={{ ...pStyle, ...termStyle }}>
        <strong style={termLabel}>Over-the-shoulder</strong> — frames from behind one subject toward another, commonly used for dialogue or to convey a character's point of view.
      </p>
      <p style={pStyle}>
        <strong style={termLabel}>Dutch angle</strong> — a deliberately tilted horizon line, used to signal unease, tension, or that something isn't quite right.
      </p>

      <h2 style={h2Style}>Using these in your own prompts</h2>
      <p style={pStyle}>
        You can name either directly in your scene description — Onyx Reelz
        will use exactly what you write, and won't override a movement or
        composition you've already specified. If you leave either unspecified,
        the system automatically applies a fitting choice for you, rotating
        through the full set above so consecutive scenes in a reel don't all
        default to the same look.
      </p>

      <h2 style={h2Style}>Combining movement and composition deliberately</h2>
      <p style={pStyle}>
        A few pairings worth knowing: a slow dolly-in on a close-up builds
        intimacy and tension gradually. A static wide establishing shot with no
        movement at all lets a scene breathe and sets context without
        distraction. A handheld follow on an over-the-shoulder shot creates
        urgency and a sense of being physically present in the action. There's
        no universally "correct" pairing — the right combination depends
        entirely on what the moment in your story needs to feel like.
      </p>

      <p style={{ ...pStyle, marginBottom: 0 }}>
        Ready to put this into practice? Start a new scene on the{" "}
        <Link to="/create" style={{ color: "var(--onyx-cyan)" }}>Create</Link>{" "}
        page and try naming a specific movement and composition directly in
        your prompt — you'll notice the difference immediately compared to
        leaving the system to choose automatically.
      </p>
    </LearnPageLayout>
  );
}
