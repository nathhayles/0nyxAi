import { Link } from "react-router-dom";
import LearnPageLayout from "../components/LearnPageLayout";
import { learnPages } from "../data/learnPagesSeo";

const h2Style = { fontSize: 20, fontWeight: 700, color: "var(--onyx-text)", marginTop: 36, marginBottom: 12 };
const pStyle = { color: "var(--onyx-text-dim)", fontSize: 15, marginBottom: 16 };
const bulletStyle = { ...pStyle, marginBottom: 8, paddingLeft: 16 };

export default function LearnMagicResize() {
  return (
    <LearnPageLayout
      seo={learnPages.find(p => p.path === "/learn/magic-resize")}
    >
      <p style={{ color: "var(--onyx-text-dim)", fontSize: 15, marginBottom: 32 }}>
        How to re-export a finished reel at other aspect ratios with Magic
        Resize — without generating any new AI video.
      </p>

      <h2 style={h2Style}>What Magic Resize actually does</h2>
      <p style={pStyle}>
        Magic Resize takes a reel you've already rendered and re-exports it at
        one or more different aspect ratios — 9:16, 16:9, 1:1, 4:3, or 3:4. It
        reuses the exact same render pipeline as the normal Export button, so
        there's no new AI generation involved: it's a render-and-crop pass on
        footage you already have, charged the same 1 credit/minute download
        cost as a normal export, per format you export.
      </p>
      <p style={pStyle}>
        You'll find it in the editor's top toolbar as the{" "}
        <strong style={{ color: "var(--onyx-text)" }}>Other formats</strong>{" "}
        button, next to Export.
      </p>

      <h2 style={h2Style}>Picking your formats</h2>
      <p style={pStyle}>
        Open Magic Resize and check off every ratio you want, besides the one
        your reel is already in. Each checked ratio gets its own tab, and each
        format is rendered and downloaded one at a time — not in parallel —
        so the status next to each format (Rendering…, ✓ Downloaded, ✗
        Failed) always reflects what actually happened for that specific
        export.
      </p>

      <h2 style={h2Style}>Setting the crop: manual focal points</h2>
      <p style={pStyle}>
        Changing aspect ratio means cropping, and the default crop is simply
        centered. If your subject isn't centered in the frame — off to one
        side, say — the default crop can cut them off. For each format tab,
        click anywhere on a scene's thumbnail to place a focal point; that's
        where the crop centers for that scene, in that format. Leave a scene
        untouched and it keeps the default center crop. Focal points are set
        per format, so a 9:16 crop and a 1:1 crop of the same reel can center
        on completely different points without affecting each other, or your
        reel's own saved default.
      </p>

      <h2 style={h2Style}>Auto-crop with AI (beta)</h2>
      <p style={pStyle}>
        Rather than clicking every scene by hand, the{" "}
        <strong style={{ color: "var(--onyx-text)" }}>✨ Auto-crop with AI
        (beta)</strong> button runs AI subject detection across every scene in
        the active format tab and fills in a focal point for each one
        automatically — centered on the detected subject rather than the
        literal middle of the frame.
      </p>
      <p style={bulletStyle}>
        Auto-crop is additive, not exclusive — it prefills the same focal
        points a manual click would set. You can still click any scene
        afterward to override its auto-detected point by hand.
      </p>
      <p style={bulletStyle}>
        It runs once per button click, for whichever format tab is active at
        the time. Switch tabs and want the same treatment on that format too?
        Run it again there.
      </p>
      <p style={bulletStyle}>
        If detection fails for a scene, the button reports the error and
        leaves that scene on its default center crop — you can always set it
        manually from there.
      </p>
      <p style={pStyle}>
        It's marked "beta" for a reason: subject detection works well on
        clear, single-subject shots, but won't always agree with your own eye
        on busier compositions. Treat its picks as a fast starting point, and
        nudge anything that looks off with a manual click.
      </p>

      <h2 style={h2Style}>When to reach for Magic Resize</h2>
      <p style={pStyle}>
        Build and finalize your reel once, in whatever ratio suits its primary
        platform, then use Magic Resize to spin off the other formats you
        need for cross-posting — a 9:16 Reel that also needs a 16:9 YouTube
        cut, or a square 1:1 version for a feed post — without touching your
        original storyboard or spending any AI generation credits on scenes
        you've already generated.
      </p>

      <p style={{ ...pStyle, marginBottom: 0 }}>
        Ready to try it? Finish a reel in the{" "}
        <Link to="/create" style={{ color: "var(--onyx-cyan)" }}>editor</Link>,
        then look for Other formats next to Export.
      </p>
    </LearnPageLayout>
  );
}
