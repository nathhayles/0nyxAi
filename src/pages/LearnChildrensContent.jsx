import { Link } from "react-router-dom";
import LearnPageLayout from "../components/LearnPageLayout";

const h2Style = { fontSize: 20, fontWeight: 700, color: "var(--onyx-text)", marginTop: 36, marginBottom: 12 };
const pStyle = { color: "var(--onyx-text-dim)", fontSize: 15, marginBottom: 16 };

export default function LearnChildrensContent() {
  return (
    <LearnPageLayout
      seo={{
        title: "Creating Kids & Animated Content",
        description: "How to create bright, family-friendly animated video content with Onyx Reelz.",
        path: "/learn/childrens-content",
      }}
    >
      <Link to="/learn" style={{ fontSize: 13, color: "var(--onyx-text-faint)", textDecoration: "none", display: "inline-block", marginBottom: 16 }}>&larr; Back to Learn</Link>
      <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 8 }}>Creating Kids &amp; Animated Content</h1>
      <p style={{ color: "var(--onyx-text-dim)", fontSize: 15, marginBottom: 32 }}>
        How to create bright, family-friendly animated video content.
      </p>

      <h2 style={h2Style}>Bright, simple, and character-driven</h2>
      <p style={pStyle}>
        Content for young audiences works best with simple, friendly
        characters, one clear action per scene, and warm, uncomplicated
        visuals — no dramatic tension or scary imagery.
      </p>

      <h2 style={h2Style}>Build a consistent mascot or character</h2>
      <p style={pStyle}>
        Use the Character Library to create a recurring character — upload
        reference images, and Onyx Reelz keeps their appearance consistent
        across every scene and every episode.
      </p>

      <h2 style={h2Style}>Prompt for a lighter visual style</h2>
      <p style={pStyle}>
        Describe the look you want directly in your scene text — bright, flat
        colors, simple backgrounds, cartoon or illustrated style. The more
        specific your description, the more consistently it carries through.
      </p>

      <h2 style={h2Style}>Keep scenes short and simple</h2>
      <p style={pStyle}>
        Shorter scenes with one clear beat hold a young viewer's attention
        better than longer, more complex shots. Favor simple camera moves — a
        gentle pan or static shot — over dramatic motion.
      </p>

      <h2 style={h2Style}>Dedicated Kids Mode (coming soon)</h2>
      <p style={{ ...pStyle, marginBottom: 0 }}>
        We're building a dedicated Animated Content Mode that automatically
        tunes pacing, tone, and visual style for young audiences in one click.
        Check back soon.
      </p>
    </LearnPageLayout>
  );
}
