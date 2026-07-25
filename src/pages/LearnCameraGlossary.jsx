import { Link } from "react-router-dom";
import LearnPageLayout from "../components/LearnPageLayout";

const h2Style = { fontSize: 20, fontWeight: 700, color: "var(--onyx-text)", marginTop: 36, marginBottom: 12 };
const pStyle = { color: "var(--onyx-text-dim)", fontSize: 15, marginBottom: 16 };
const termStyle = { marginBottom: 10 };
const termLabel = { color: "var(--onyx-text)" };

export default function LearnCameraGlossary() {
  return (
    <LearnPageLayout
      seo={{
        title: "Camera Movement & Shot Composition Glossary",
        description: "A plain-English glossary of camera movements and shot compositions you can use in your Onyx Reelz video prompts.",
        path: "/learn/camera-glossary",
      }}
    >
      <Link to="/learn" style={{ fontSize: 13, color: "var(--onyx-text-faint)", textDecoration: "none", display: "inline-block", marginBottom: 16 }}>&larr; Back to Learn</Link>
      <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 8 }}>Camera Movement &amp; Shot Composition Glossary</h1>
      <p style={{ color: "var(--onyx-text-dim)", fontSize: 15, marginBottom: 32 }}>
        A plain-English glossary of camera movements and shot compositions you can use in your Onyx Reelz video prompts.
      </p>

      <h2 style={h2Style}>Camera movement — how the camera itself moves</h2>
      <p style={{ ...pStyle, ...termStyle }}>
        <strong style={termLabel}>Dolly in / pull back</strong> — the camera physically moves toward or away from the subject, changing perspective as it goes.
      </p>
      <p style={{ ...pStyle, ...termStyle }}>
        <strong style={termLabel}>Pan</strong> — a sideways sweep, left or right, without moving position.
      </p>
      <p style={{ ...pStyle, ...termStyle }}>
        <strong style={termLabel}>Tilt up / down</strong> — a vertical sweep on a fixed axis.
      </p>
      <p style={{ ...pStyle, ...termStyle }}>
        <strong style={termLabel}>Tracking shot</strong> — the camera moves alongside a subject, following their motion through the frame.
      </p>
      <p style={{ ...pStyle, ...termStyle }}>
        <strong style={termLabel}>Crash zoom</strong> — a fast, punchy zoom in, used for urgency or surprise.
      </p>
      <p style={{ ...pStyle, ...termStyle }}>
        <strong style={termLabel}>Handheld follow</strong> — a loose, human-feeling following motion, less smooth than tracking.
      </p>
      <p style={{ ...pStyle, ...termStyle }}>
        <strong style={termLabel}>Whip pan</strong> — an extremely fast pan, often used as a transition.
      </p>
      <p style={{ ...pStyle, ...termStyle }}>
        <strong style={termLabel}>Camera roll</strong> — the frame rotates around its center axis, disorienting or dramatic.
      </p>
      <p style={pStyle}>
        <strong style={termLabel}>Rack focus</strong> — focus shifts from one subject or depth to another within the shot.
      </p>

      <h2 style={h2Style}>Shot composition — where the camera sits relative to the subject</h2>
      <p style={{ ...pStyle, ...termStyle }}>
        <strong style={termLabel}>Close-up</strong> — tight framing on a face or object, for emotion or detail.
      </p>
      <p style={{ ...pStyle, ...termStyle }}>
        <strong style={termLabel}>Wide / establishing shot</strong> — shows the full environment, for scale or context.
      </p>
      <p style={{ ...pStyle, ...termStyle }}>
        <strong style={termLabel}>Low angle</strong> — camera looks up at the subject, making them feel powerful or imposing.
      </p>
      <p style={{ ...pStyle, ...termStyle }}>
        <strong style={termLabel}>High angle</strong> — camera looks down, making the subject feel small or vulnerable.
      </p>
      <p style={{ ...pStyle, ...termStyle }}>
        <strong style={termLabel}>Over-the-shoulder</strong> — frames from behind one subject, looking at another — common for dialogue.
      </p>
      <p style={pStyle}>
        <strong style={termLabel}>Dutch angle</strong> — a tilted horizon line, for tension or unease.
      </p>

      <h2 style={h2Style}>Using these in your own prompts</h2>
      <p style={{ ...pStyle, marginBottom: 0 }}>
        You can specify either directly in your scene description — Onyx Reelz
        will use exactly what you write. If you don't specify one, the system
        automatically applies a fitting camera movement and composition for
        you.
      </p>
    </LearnPageLayout>
  );
}
