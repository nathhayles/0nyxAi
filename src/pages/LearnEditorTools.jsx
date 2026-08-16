import LearnPageLayout from "../components/LearnPageLayout";
import { learnPages } from "../data/learnPagesSeo";

const R2_BASE = "https://pub-31e667ae894f4cddbf03ae6a7578eff1.r2.dev/content-pipeline/tool-tutorials";

const h2Style = { fontSize: 20, fontWeight: 700, color: "var(--onyx-text)", marginTop: 40, marginBottom: 8 };
const pStyle = { color: "var(--onyx-text-dim)", fontSize: 15, marginBottom: 16, lineHeight: 1.6 };
const videoStyle = {
  width: "100%", maxWidth: 380, display: "block", borderRadius: 12,
  border: "0.5px solid var(--onyx-hairline-strong)", background: "#000",
};

// Real, DB-verified screen recordings of each tool actually working, captured
// during the tool tutorial campaign (docs/tool-tutorial-campaign.md in the
// backend repo) — not staged, not stock footage.
const TOOLS = [
  {
    id: "slow-motion",
    title: "Slow Motion",
    file: "01-slow-motion.webm",
    body: "Select any clip on the timeline and the speed controls (0.25x–2x) appear in the sequencer toolbar. The clip visibly widens or narrows on the timeline as you change speed — that's the real effective duration updating, not just a label.",
  },
  {
    id: "split",
    title: "Split / Cut",
    file: "02-split.webm",
    body: "Select a clip, scrub the playhead to where you want the cut, then hit \"Split at playhead\" in the sequencer toolbar. The clip becomes two independent clips you can trim, delete, or re-speed separately.",
  },
  {
    id: "delete-scene",
    title: "Deleting Scenes",
    file: "03-delete-scene.webm",
    body: "Every scene in the Scenes panel has a small ✕ button. Deleting a scene removes it from both the storyboard and the timeline in one step — no orphaned clips left behind.",
  },
  {
    id: "trim",
    title: "Trimming Clips",
    file: "04-trim.webm",
    body: "Every clip on the timeline has a drag handle on each edge. Drag the right handle inward to shorten a clip from the end — the same handle works from the left edge to trim the start.",
  },
  {
    id: "text",
    title: "Text Overlays",
    file: "05-text.webm",
    body: "Add a text layer from the Text panel, then edit its content, color, font, and animation (Fade In, Slide, Typewriter, and more) live in the same panel — changes reflect on the canvas immediately.",
  },
  {
    id: "emoji",
    title: "Emoji Layer",
    file: "06-emoji.webm",
    body: "Drop emoji directly onto the canvas from the FX panel's Emoji tab, then drag each one to its own spot — you can stack as many as you want, each independently positioned and timed.",
  },
  {
    id: "shapes",
    title: "Shapes",
    file: "07-shape.webm",
    body: "The Shapes tab in the FX panel gives you rectangles, circles, and more, with full control over fill color, opacity, border, and corner radius — placed and resized the same way as any other overlay.",
  },
  {
    id: "broll",
    title: "B-Roll: Add, Resize & Animate",
    file: "09-broll-add.webm",
    file2: "09b-broll-resize-animate.webm",
    body: "Search real stock footage right inside the editor and drag a result onto the B-Roll track. Once it's placed, resize it on the canvas and add an enter/exit animation (Slide, Fade) from the B-Roll panel.",
  },
  {
    id: "transitions",
    title: "Transitions",
    file: "10-transitions.webm",
    body: "Drag any transition — Fade, Dissolve, Wipe, Zoom, and more — from the Transitions panel directly onto the boundary between two clips to apply it.",
  },
  {
    id: "voiceover",
    title: "Voiceover",
    file: "11-voiceover-ux-walkthrough.webm",
    body: "Choose between Standard and Premium voice tiers, filter by gender/accent/language, preview any voice before committing, then apply it to one scene or the whole reel from the per-scene list.",
  },
];

export default function LearnEditorTools() {
  return (
    <LearnPageLayout seo={learnPages.find(p => p.path === "/learn/editor-tools")}>
      <p style={{ color: "var(--onyx-text-dim)", fontSize: 15, marginBottom: 32 }}>
        A tool-by-tool tour of the Onyx Reelz editor — real screen recordings
        of every core feature, so you know exactly where to click before you
        open your own project.
      </p>

      {TOOLS.map(tool => (
        <div key={tool.id} id={tool.id}>
          <h2 style={h2Style}>{tool.title}</h2>
          <p style={pStyle}>{tool.body}</p>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 16 }}>
            <video style={videoStyle} src={`${R2_BASE}/${tool.file}`} controls muted playsInline preload="metadata" />
            {tool.file2 && (
              <video style={videoStyle} src={`${R2_BASE}/${tool.file2}`} controls muted playsInline preload="metadata" />
            )}
          </div>
        </div>
      ))}
    </LearnPageLayout>
  );
}
