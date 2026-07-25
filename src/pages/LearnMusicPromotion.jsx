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
      }}
    >
      <Link to="/learn" style={{ fontSize: 13, color: "var(--onyx-text-faint)", textDecoration: "none", display: "inline-block", marginBottom: 16 }}>&larr; Back to Learn</Link>
      <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 8 }}>AI Video for Musicians &amp; Music Promotion</h1>
      <p style={{ color: "var(--onyx-text-dim)", fontSize: 15, marginBottom: 32 }}>
        How musicians use Onyx Reelz to create music videos, lyric videos, and promotional content.
      </p>

      <h2 style={h2Style}>Original hip-hop content, start to finish</h2>
      <p style={pStyle}>
        Onyx Reelz's AI Rapper feature generates an instrumental beat and
        matching lyrics, then performs them in your chosen voice — a complete
        track built from a single prompt.
      </p>

      <h2 style={h2Style}>Turn a song into a promo video</h2>
      <p style={pStyle}>
        Use Fadr's stem separation to isolate vocals or instrumentals from an
        existing track, then build visuals around them — lyric videos,
        backing-track content, or remix material.
      </p>

      <h2 style={h2Style}>Sync visuals to your music's energy</h2>
      <p style={pStyle}>
        Match camera movement and pacing to your track's tempo — quicker cuts
        and more dynamic camera work for high-energy sections, slower and
        steadier for a ballad or bridge.
      </p>

      <h2 style={h2Style}>Consistent artist presence</h2>
      <p style={{ ...pStyle, marginBottom: 0 }}>
        If you're featuring yourself or a consistent artist persona across
        content, use the Character Library to keep their appearance steady
        across every video.
      </p>
    </LearnPageLayout>
  );
}
