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
        Whatever your content niche, a recognizable, consistent on-screen
        presence is often what turns casual viewers into a real following.
        Build a Character in your{" "}
        <Link to="/characters" style={{ color: "var(--onyx-cyan)" }}>Character Library</Link>{" "}
        as your recurring on-screen persona — the same face and appearance
        held consistently across every reel, without needing to film new
        footage of yourself for every single piece of content. See our{" "}
        <Link to="/learn/character-consistency" style={{ color: "var(--onyx-cyan)" }}>Character Consistency Guide</Link>{" "}
        for the full walkthrough.
      </p>
      <svg viewBox="0 0 400 120" role="img" aria-labelledby="influencer-presence-title" style={{ width: "100%", maxWidth: 400, margin: "24px auto", display: "block" }}>
        <title id="influencer-presence-title">A consistent creator persona held the same across every published reel</title>
        {[0, 1, 2, 3].map(i => (
          <g key={i} transform={`translate(${i * 95 + 15}, 10)`}>
            <circle cx="35" cy="35" r="22" fill="var(--onyx-cyan)" opacity={0.6 + i * 0.1} />
            <text x="35" y="85" textAnchor="middle" fill="var(--onyx-text-faint)" fontSize="9">Reel {i + 1}</text>
          </g>
        ))}
      </svg>

      <h2 style={h2Style}>From idea to published post, in one place</h2>
      <p style={pStyle}>
        Generate your video, add voiceover and captions, then publish
        directly to TikTok and other connected platforms from inside Onyx
        Reelz — no manual export, no re-uploading, no switching between
        separate tools for creation and publishing. This matters most at
        volume: creators publishing daily or near-daily benefit enormously
        from cutting the manual steps between an idea and a live post.
      </p>
      <svg viewBox="0 0 500 100" role="img" aria-labelledby="influencer-pipeline-title" style={{ width: "100%", maxWidth: 500, margin: "24px auto", display: "block" }}>
        <title id="influencer-pipeline-title">From AI video generation to publishing on TikTok, all in one platform</title>
        {["Generate", "Voice & captions", "Publish to TikTok"].map((label, i) => (
          <g key={label} transform={`translate(${i * 170 + 5}, 20)`}>
            <rect width="150" height="55" rx="6" fill="none" stroke="var(--onyx-cyan)" />
            <text x="75" y="32" textAnchor="middle" fill="var(--onyx-text)" fontSize="11">{label}</text>
            {i < 2 && <text x="160" y="35" fill="var(--onyx-text-faint)" fontSize="16">→</text>}
          </g>
        ))}
      </svg>

      <h2 style={h2Style}>Motion reference for a signature style</h2>
      <p style={pStyle}>
        Attach a motion reference clip to carry a specific movement, gesture,
        or camera style into a new generation. If you've established a
        particular visual signature — a specific way you move, a
        recognizable camera style — motion reference lets you carry that
        signature forward into new content rather than reinventing it from
        scratch each time.
      </p>

      <h2 style={h2Style}>Stay compliant automatically</h2>
      <p style={pStyle}>
        Onyx Reelz's TikTok publishing flow includes AI-content labeling, the
        required Music Usage Confirmation, and privacy controls pulled live
        from your connected account — built to keep your content compliant
        with platform rules without you having to manually track
        requirements that change over time.
      </p>

      <h2 style={h2Style}>Choosing the right model for your content type</h2>
      <p style={pStyle}>
        High-volume, low-stakes content benefits from Wan's speed and low
        cost. Anything built around your consistent on-screen character
        benefits from Kling's Character Library integration. A single hero
        piece meant to be your best work benefits from Veo 3.1's extra
        fidelity. Our full{" "}
        <Link to="/learn/choosing-a-model" style={{ color: "var(--onyx-cyan)" }}>model guide</Link>{" "}
        walks through the complete tradeoffs.
      </p>

      <h2 style={h2Style}>Getting started</h2>
      <p style={{ ...pStyle, marginBottom: 0 }}>
        Build your Character, connect your TikTok account, and start creating
        on{" "}
        <Link to="/create" style={{ color: "var(--onyx-cyan)" }}>Create</Link>{" "}
        — from first generation to published post, without leaving the
        platform.
      </p>
    </LearnPageLayout>
  );
}
