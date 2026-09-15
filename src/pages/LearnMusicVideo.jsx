import { Link } from "react-router-dom";
import LearnPageLayout from "../components/LearnPageLayout";
import { learnPages } from "../data/learnPagesSeo";

const h2Style = { fontSize: 20, fontWeight: 700, color: "var(--onyx-text)", marginTop: 36, marginBottom: 12 };
const pStyle = { color: "var(--onyx-text-dim)", fontSize: 15, marginBottom: 16 };

export default function LearnMusicVideo() {
  return (
    <LearnPageLayout
      seo={learnPages.find(p => p.path === "/learn/music-video")}
    >
      <p style={{ color: "var(--onyx-text-dim)", fontSize: 15, marginBottom: 32 }}>
        Generate a song, then turn it into a complete music video with one
        click — no manual scene-building, no separate editing pass.
      </p>

      <h2 style={h2Style}>Start with a song</h2>
      <p style={pStyle}>
        Head to{" "}
        <Link to="/music" style={{ color: "var(--onyx-cyan)" }}>Music Studio</Link>{" "}
        and generate a track with vocals and real lyrics — either AI Rapper
        (MiniMax Music 2.0, purpose-built for rap/hip-hop with vocals and
        instrumental generated together in one pass) or the Generate tab's
        Lyria 3 Pro model with Vocals On. Both give you a finished song with
        actual lyric text attached, not just an instrumental — that lyric
        text is what the next step needs.
      </p>

      <h2 style={h2Style}>Turn it into a video</h2>
      <p style={pStyle}>
        Once a track is saved to My Music, any track with lyrics shows a{" "}
        <strong style={{ color: "var(--onyx-text)" }}>Turn into Music Video</strong>{" "}
        button. Click it, and Onyx reads your song's actual lyrics — including
        its [Verse]/[Chorus]/[Bridge] structure — and splits them into 4 to 8
        scenes, each with its own short narration excerpt and a matching
        visual description generated from what that section of the song is
        actually about.
      </p>
      <svg viewBox="0 0 500 160" role="img" aria-labelledby="mv-split-title" style={{ width: "100%", maxWidth: 500, margin: "24px auto", display: "block" }}>
        <title id="mv-split-title">A song's lyrics being split into scenes for a music video</title>
        <rect x="10" y="60" width="110" height="40" rx="6" fill="var(--onyx-text-dim)" />
        <text x="65" y="115" textAnchor="middle" fill="var(--onyx-text-faint)" fontSize="10">Song lyrics</text>
        <line x1="125" y1="80" x2="175" y2="40" stroke="var(--onyx-cyan)" strokeWidth="1.5" />
        <line x1="125" y1="80" x2="175" y2="80" stroke="var(--onyx-cyan)" strokeWidth="1.5" />
        <line x1="125" y1="80" x2="175" y2="120" stroke="var(--onyx-cyan)" strokeWidth="1.5" />
        {[0, 1, 2].map(i => (
          <g key={i}>
            <rect x="180" y={25 + i * 40} width="90" height="26" rx="5" fill="none" stroke="var(--onyx-hairline-strong)" />
            <text x="225" y={42 + i * 40} textAnchor="middle" fill="var(--onyx-text-faint)" fontSize="9">Scene {i + 1}</text>
          </g>
        ))}
        <text x="290" y="20" textAnchor="middle" fill="var(--onyx-text)" fontSize="11">4-8 scenes, one per section</text>
      </svg>
      <p style={pStyle}>
        You'll see the full scene split before anything is generated —
        review each scene's lyric line and its visual direction, then
        confirm.
      </p>

      <h2 style={h2Style}>A complete, synced video — automatically</h2>
      <p style={pStyle}>
        Confirming builds the video right away: each scene is matched to
        real stock footage based on its visual description, timed evenly
        across your song's full length, with your lyrics as on-screen
        captions and your brand's logo applied. Your song is the reel's only
        audio — there's no separate voiceover layered on top of it. The
        whole thing is free to generate, and it lands as a normal reel in
        the editor, ready to watch, trim, or publish as-is.
      </p>

      <h2 style={h2Style}>Upgrade any scene to real AI video</h2>
      <p style={pStyle}>
        Stock footage gets you a finished video fast, but it's a starting
        point, not the ceiling. Once you're in the editor, any scene can be
        regenerated with a real AI video model — Kling, Wan, Seedance, or
        Veo — the same per-scene Regenerate flow used everywhere else on
        Onyx Reelz. Swap in a scene built specifically around your song's
        lyrics, your brand, or a Character Library reference, one scene at a
        time, without rebuilding the rest of the video.
      </p>

      <h2 style={h2Style}>Getting started</h2>
      <p style={{ ...pStyle, marginBottom: 0 }}>
        Generate a track in{" "}
        <Link to="/music" style={{ color: "var(--onyx-cyan)" }}>Music Studio</Link>,
        save it, and look for the Turn into Music Video button on any track
        with lyrics. From there, upgrade individual scenes in{" "}
        <Link to="/create" style={{ color: "var(--onyx-cyan)" }}>Create</Link>{" "}
        whenever you want to move beyond stock footage.
      </p>
    </LearnPageLayout>
  );
}
