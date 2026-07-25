import { Link } from "react-router-dom";
import LearnPageLayout from "../components/LearnPageLayout";

const h2Style = { fontSize: 20, fontWeight: 700, color: "var(--onyx-text)", marginTop: 36, marginBottom: 12 };
const pStyle = { color: "var(--onyx-text-dim)", fontSize: 15, marginBottom: 16 };

export default function LearnInfluencerContent() {
  return (
    <LearnPageLayout
      seo={{
        title: "AI Video for Influencers & Content Creators",
        description: "How creators use Onyx Reelz to build a consistent on-screen presence and publish faster.",
        path: "/learn/influencer-content",
      }}
    >
      <Link to="/learn" style={{ fontSize: 13, color: "var(--onyx-text-faint)", textDecoration: "none", display: "inline-block", marginBottom: 16 }}>&larr; Back to Learn</Link>
      <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 8 }}>AI Video for Influencers &amp; Content Creators</h1>
      <p style={{ color: "var(--onyx-text-dim)", fontSize: 15, marginBottom: 32 }}>
        How creators use Onyx Reelz to build a consistent on-screen presence and publish faster.
      </p>

      <h2 style={h2Style}>A consistent on-screen presence</h2>
      <p style={pStyle}>
        Build a Character in your Character Library as your recurring
        on-screen persona — the same face and appearance held consistently,
        reel after reel. See our{" "}
        <Link to="/learn/character-consistency" style={{ color: "var(--onyx-cyan)" }}>Character Consistency Guide</Link>{" "}
        for the full walkthrough.
      </p>

      <h2 style={h2Style}>From idea to published post</h2>
      <p style={pStyle}>
        Generate your video, add voiceover and captions, then publish directly
        to TikTok and other platforms from inside Onyx Reelz — no manual
        export-and-reupload step.
      </p>

      <h2 style={h2Style}>Motion reference for signature moves</h2>
      <p style={pStyle}>
        Attach a motion reference clip to carry a specific movement or camera
        style into a new generation — useful for building a recognizable
        visual signature across your content.
      </p>

      <h2 style={h2Style}>Stay compliant automatically</h2>
      <p style={pStyle}>
        Onyx Reelz's TikTok publishing includes AI-content labeling, Music
        Usage Confirmation, and privacy controls pulled live from your
        connected account — built to keep your content compliant without you
        having to think about it.
      </p>

      <p style={{ ...pStyle, marginBottom: 0 }}>
        Ready to try it? <Link to="/characters" style={{ color: "var(--onyx-cyan)" }}>Build your Character Library</Link> on Onyx Reelz.
      </p>
    </LearnPageLayout>
  );
}
