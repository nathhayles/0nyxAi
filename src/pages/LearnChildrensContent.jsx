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
        Content for young audiences rewards a different set of choices than
        dramatic or cinematic storytelling. Simple, friendly characters, one
        clear action per scene, and warm, uncomplicated visuals hold a young
        viewer's attention far better than dense plotting or dramatic tension.
        Scary imagery, real-world danger, or anything genuinely intense works
        against the tone this content needs — keep threats light, keep stakes
        low, keep the mood consistently warm.
      </p>

      <h2 style={h2Style}>Build a consistent mascot or character</h2>
      <p style={pStyle}>
        A recurring character — a mascot, a host, a cartoon protagonist — is
        often the backbone of children's content, and it depends entirely on
        that character looking and feeling the same episode after episode.
        Use the Character Library to create them: upload reference images
        once, and every scene that tags that character draws consistently
        from the same visual source. For a full walkthrough of how this
        works, see our{" "}
        <Link to="/learn/character-consistency" style={{ color: "var(--onyx-cyan)" }}>Character Consistency Guide</Link>.
      </p>

      <h2 style={h2Style}>Prompt for a lighter visual style</h2>
      <p style={pStyle}>
        Describe the look you want directly in your scene text — bright, flat
        colors, simple uncluttered backgrounds, a cartoon or illustrated
        style rather than photorealism. The more specific your description,
        the more consistently it carries through: "bright flat-color
        animation, bold clean linework, simple rounded shapes" gives the
        model a much clearer target than "cartoon style" alone.
      </p>

      <h2 style={h2Style}>Keep scenes short and simple</h2>
      <p style={pStyle}>
        Shorter scenes built around one clear beat work better for young
        viewers than longer, more complex shots — the same "one action per
        scene" principle that improves any AI video prompt matters even more
        here, since a young audience's attention naturally favors clarity and
        simplicity over density. Favor gentle camera movement — a soft pan, a
        static locked shot — over dramatic moves like crash zooms or whip
        pans, which read as intense rather than playful.
      </p>

      <h2 style={h2Style}>Narration and voice matter too</h2>
      <p style={pStyle}>
        If your content includes narration, choose a voice that matches the
        tone — warm, clear, and expressive rather than flat or overly
        serious. Onyx Reelz's voice library includes options suited to
        storytelling and narration; pick one that feels like it belongs
        reading to the audience you're making this for.
      </p>

      <h2 style={h2Style}>A dedicated mode is coming</h2>
      <p style={pStyle}>
        We're building a dedicated Animated Content Mode that will
        automatically tune pacing, tone, and visual style for young audiences
        in a single click — handling much of what's described above without
        you needing to specify it manually every time. Check back soon.
      </p>

      <h2 style={h2Style}>Getting started</h2>
      <p style={{ ...pStyle, marginBottom: 0 }}>
        Head to your{" "}
        <Link to="/characters" style={{ color: "var(--onyx-cyan)" }}>Character Library</Link>{" "}
        to build a consistent mascot or host character, then start a scene on{" "}
        <Link to="/create" style={{ color: "var(--onyx-cyan)" }}>Create</Link>{" "}
        describing the bright, simple visual style you're after. For the full
        toolkit of camera language that still applies here — just used more
        gently — see our{" "}
        <Link to="/learn/camera-glossary" style={{ color: "var(--onyx-cyan)" }}>Camera Glossary</Link>.
      </p>
    </LearnPageLayout>
  );
}
