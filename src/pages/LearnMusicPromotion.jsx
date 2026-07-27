import { Link } from "react-router-dom";
import LearnPageLayout from "../components/LearnPageLayout";

const h2Style = { fontSize: 20, fontWeight: 700, color: "var(--onyx-text)", marginTop: 36, marginBottom: 12 };
const pStyle = { color: "var(--onyx-text-dim)", fontSize: 15, marginBottom: 16 };

export default function LearnMusicPromotion() {
  return (
    <LearnPageLayout
      seo={{
        title: "AI Video for Musicians & Music Promotion",
        description: "How musicians use Onyx Reelz to create music videos, lyric videos, and promotional content.",
        path: "/learn/music-promotion",
        ogImage: "https://pub-31e667ae894f4cddbf03ae6a7578eff1.r2.dev/learn-hero-images/ai-video-musicians-music-promotion-illustration.png",
        imageAlt: "AI video for musicians and music promotion illustration — cyan camera merged with an amber musical note beside a dark violet vinyl record, Onyx Reelz",
      }}
    >
      <Link to="/learn" style={{ fontSize: 13, color: "var(--onyx-text-faint)", textDecoration: "none", display: "inline-block", marginBottom: 16 }}>&larr; Back to Learn</Link>
      <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 8 }}>AI Video for Musicians &amp; Music Promotion</h1>
      <p style={{ color: "var(--onyx-text-dim)", fontSize: 15, marginBottom: 32 }}>
        How musicians use Onyx Reelz to create music videos, lyric videos, and promotional content.
      </p>

      <h2 style={h2Style}>Original content, start to finish</h2>
      <p style={pStyle}>
        Onyx Reelz's AI Rapper feature generates an instrumental beat and
        matching lyrics, then performs them in your chosen voice — a complete
        original track built from a single prompt, without needing a
        producer, a studio session, or a separate vocalist.
      </p>

      <h2 style={h2Style}>Turn an existing song into a promo video</h2>
      <p style={pStyle}>
        Beyond original tracks, Onyx Reelz's Fadr stem-separation integration
        lets you isolate the vocal or instrumental stem from an existing
        song. Use an isolated instrumental as the backing track for new
        visual content, or build a lyric video around isolated vocals —
        genuinely useful for promoting a release without needing separate
        audio production tools.
      </p>
      <svg viewBox="0 0 400 120" role="img" aria-labelledby="music-stems-title" style={{ width: "100%", maxWidth: 400, margin: "24px auto", display: "block" }}>
        <title id="music-stems-title">Fadr stem separation splits a song into isolated vocal and instrumental tracks</title>
        <rect x="10" y="40" width="80" height="30" rx="6" fill="var(--onyx-text-dim)" />
        <text x="50" y="90" textAnchor="middle" fill="var(--onyx-text-faint)" fontSize="9">Original track</text>
        <line x1="95" y1="55" x2="160" y2="30" stroke="var(--onyx-cyan)" strokeWidth="1.5" />
        <line x1="95" y1="55" x2="160" y2="80" stroke="var(--onyx-cyan)" strokeWidth="1.5" />
        <rect x="165" y="15" width="90" height="30" rx="6" fill="none" stroke="var(--onyx-cyan)" />
        <text x="210" y="34" textAnchor="middle" fill="var(--onyx-text)" fontSize="9">Vocals</text>
        <rect x="165" y="65" width="90" height="30" rx="6" fill="none" stroke="var(--onyx-cyan)" />
        <text x="210" y="84" textAnchor="middle" fill="var(--onyx-text)" fontSize="9">Instrumental</text>
      </svg>

      <h2 style={h2Style}>Sync visuals to your music's energy</h2>
      <p style={pStyle}>
        Camera movement and pacing should match a track's actual energy.
        Quicker cuts and more dynamic camera work — crash zooms, whip pans,
        tracking shots — suit high-energy sections; slower, steadier shots
        suit a ballad or a quieter bridge. Naming the right movement
        deliberately, rather than leaving it to chance, is what makes a music
        video actually feel synced to its soundtrack rather than just cut to
        length. Our{" "}
        <Link to="/learn/camera-glossary" style={{ color: "var(--onyx-cyan)" }}>Camera Glossary</Link>{" "}
        covers the full vocabulary.
      </p>
      <svg viewBox="0 0 400 100" role="img" aria-labelledby="music-tempo-title" style={{ width: "100%", maxWidth: 400, margin: "24px auto", display: "block" }}>
        <title id="music-tempo-title">Matching camera cut pace and movement to a music track's tempo and energy</title>
        <text x="10" y="20" fill="var(--onyx-text-faint)" fontSize="9">Slow section</text>
        <rect x="10" y="30" width="170" height="20" rx="4" fill="var(--onyx-text-dim)" />
        <text x="220" y="20" fill="var(--onyx-cyan)" fontSize="9">High-energy section</text>
        {[0, 1, 2, 3, 4].map(i => (
          <rect key={i} x={220 + i * 33} y="30" width="28" height="20" rx="3" fill="var(--onyx-cyan)" />
        ))}
      </svg>

      <h2 style={h2Style}>Consistent artist presence</h2>
      <p style={pStyle}>
        If you're featuring yourself or a consistent artist persona across
        your content, use the{" "}
        <Link to="/characters" style={{ color: "var(--onyx-cyan)" }}>Character Library</Link>{" "}
        to keep their appearance steady across every video — the same face,
        the same presence, whether it's a lyric video, a promotional clip, or
        behind-the-scenes content. See our{" "}
        <Link to="/learn/character-consistency" style={{ color: "var(--onyx-cyan)" }}>Character Consistency Guide</Link>{" "}
        for the full walkthrough.
      </p>

      <h2 style={h2Style}>Choosing a model for music content</h2>
      <p style={pStyle}>
        Seedance 2.0's native audio generation is worth knowing about here
        specifically — it's the one Onyx Reelz model that generates audio and
        video together, which can be useful for atmosphere or ambient sound
        layered around your actual track, though your primary music should
        still come from AI Rapper or your own source audio. For visual-only
        content synced to existing music, Kling's balance of quality and
        Character Library support usually fits best.
      </p>

      <h2 style={h2Style}>Getting started</h2>
      <p style={{ ...pStyle, marginBottom: 0 }}>
        Try AI Rapper for an original track, or bring your own song through
        Fadr's stem separation, then build your visuals on{" "}
        <Link to="/create" style={{ color: "var(--onyx-cyan)" }}>Create</Link>{" "}
        — matching camera energy to the music as you go.
      </p>
    </LearnPageLayout>
  );
}
