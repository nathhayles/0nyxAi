import { Link } from "react-router-dom";
import LearnPageLayout from "../components/LearnPageLayout";
import { learnPages } from "../data/learnPagesSeo";

const h2Style = { fontSize: 20, fontWeight: 700, color: "var(--onyx-text)", marginTop: 36, marginBottom: 12 };
const pStyle = { color: "var(--onyx-text-dim)", fontSize: 15, marginBottom: 16 };

export default function LearnAudioToVideo() {
  return (
    <LearnPageLayout
      seo={learnPages.find(p => p.path === "/learn/audio-to-video")}
    >
      <p style={{ color: "var(--onyx-text-dim)", fontSize: 15, marginBottom: 32 }}>
        How to turn a voice recording, podcast clip, or any audio file into a
        video reel with Onyx Reelz's Audio to Video tool.
      </p>

      <h2 style={h2Style}>What it does</h2>
      <p style={pStyle}>
        Audio to Video starts from audio instead of a written script. Upload
        an MP3, WAV, M4A, or OGG file — a voice memo, a podcast clip, a
        recorded narration — and Onyx Reelz transcribes it, then breaks the
        transcript into scenes with visuals matched to what's actually being
        said in each one. You end up with a full storyboard, built from your
        own spoken words, without typing a script by hand.
      </p>

      <h2 style={h2Style}>How the flow works</h2>
      <p style={pStyle}>
        From Studio, open Audio to Video, then drag in your file (or click to
        browse). Hit{" "}
        <strong style={{ color: "var(--onyx-text)" }}>Transcribe & Generate
        Scenes</strong> and the audio is transcribed and split into scenes —
        each one shown with its own narration line so you can see exactly how
        your audio was broken up before committing to anything.
      </p>
      <p style={pStyle}>
        From there you can optionally attach a saved Brand, then hit{" "}
        <strong style={{ color: "var(--onyx-text)" }}>Open in Editor</strong>{" "}
        to hand the whole storyboard off to the full editor — scenes,
        narration, and a 9:16 aspect ratio by default — where it behaves like
        any other reel: pick visuals per scene, adjust voiceover and music
        levels, swap in an AI-generated clip for any scene, and export when
        you're happy with it.
      </p>

      <h2 style={h2Style}>When to reach for it</h2>
      <p style={pStyle}>
        Audio to Video is the fastest path when the content already exists as
        audio — a podcast excerpt you want to clip into a Reel, a voice memo
        you recorded on the fly, a recorded narration you don't want to
        re-type as a script. Skip the "write a script, then generate" flow
        entirely and start straight from the recording.
      </p>

      <p style={{ ...pStyle, marginBottom: 0 }}>
        Ready to try it? Open{" "}
        <Link to="/audio-to-video" style={{ color: "var(--onyx-cyan)" }}>Audio to Video</Link>{" "}
        from Studio and upload a file.
      </p>
    </LearnPageLayout>
  );
}
