import { Link } from "react-router-dom";
import LearnPageLayout from "../components/LearnPageLayout";
import PromptResultShowcase from "../components/PromptResultShowcase";
import { learnPages } from "../data/learnPagesSeo";

const h2Style = { fontSize: 20, fontWeight: 700, color: "var(--onyx-text)", marginTop: 36, marginBottom: 12 };
const pStyle = { color: "var(--onyx-text-dim)", fontSize: 15, marginBottom: 16 };

export default function LearnVeoPrompting() {
  return (
    <LearnPageLayout
      seo={learnPages.find(p => p.path === "/learn/veo-prompting")}
    >
      <p style={{ color: "var(--onyx-text-dim)", fontSize: 15, marginBottom: 32 }}>
        How to get the best results from Google's Veo 3.1, our highest-fidelity AI video model.
      </p>

      <h2 style={h2Style}>Google's highest-fidelity model on Onyx Reelz</h2>
      <p style={pStyle}>
        Veo 3.1 is our top-tier model for raw visual quality — sharper detail,
        genuinely native vertical framing (rather than a landscape shot cropped
        to fit), and support for longer, more continuous scenes than our other
        engines typically handle well.
      </p>
      <svg viewBox="0 0 400 140" role="img" aria-labelledby="veo-fidelity-title" style={{ width: "100%", maxWidth: 400, margin: "24px auto", display: "block" }}>
        <title id="veo-fidelity-title">Veo 3.1 offers the highest visual fidelity of Onyx Reelz's AI video models, with native vertical framing</title>
        {[["Wan", 40], ["Kling", 65], ["Veo 3.1", 95]].map(([label, w], i) => (
          <g key={label} transform={`translate(10, ${i * 40 + 10})`}>
            <text x="0" y="14" fill="var(--onyx-text)" fontSize="10">{label}</text>
            <rect x="60" y="2" width={w} height="16" rx="3" fill={label === "Veo 3.1" ? "var(--onyx-cyan)" : "var(--onyx-text-dim)"} />
          </g>
        ))}
        <text x="10" y="135" fill="var(--onyx-text-faint)" fontSize="9">Relative visual fidelity</text>
      </svg>

      <h2 style={h2Style}>Prompt with real intention</h2>
      <p style={pStyle}>
        The same subject-then-{" "}
        <Link to="/learn/camera-glossary" style={{ color: "var(--onyx-cyan)" }}>camera movement, shot composition</Link>
        -then-lighting structure applies, but Veo rewards precision more than
        most. Naming the actual lighting condition — "overcast diffuse
        daylight" rather than just "nice lighting" — or the actual lens
        behavior — "shallow depth of field, soft background blur" rather than
        "cinematic" — tends to produce noticeably more controlled,
        intentional-looking results.
      </p>

      <p style={pStyle}>
        Here's a real Veo 3.1 prompt built around exactly that kind of
        precision, next to what it actually produced:
      </p>
      <PromptResultShowcase
        label="Real Veo 3.1 generation"
        videoUrl="https://pub-31e667ae894f4cddbf03ae6a7578eff1.r2.dev/kling_5039585a-5e90-48d6-9e0c-194bf76cce4b.mp4"
        prompt="A single bright red apple slowly rotating on a plain white background, soft studio lighting, minimal and clean, shallow depth of field, no text, no logos, no watermark, close-up, slow tilt down, shot on Sony A7, shallow depth of field, film grain, vertical portrait format, mobile-first framing, tight compositional focus, soft diffused key light with subtle rim highlights."
      />
      <p style={pStyle}>
        "Soft diffused key light with subtle rim highlights" is a real lighting
        setup, not a mood word — that specificity is exactly what separates a
        controlled, intentional-looking Veo result from a generic one.
      </p>

      <h2 style={h2Style}>Seed-locking, same as Wan</h2>
      <svg viewBox="0 0 500 100" role="img" aria-labelledby="veo-seedlock-title" style={{ width: "100%", maxWidth: 500, margin: "24px auto", display: "block" }}>
        <title id="veo-seedlock-title">Veo 3.1 supports seed-locking, letting you finalize a composition drafted on Wan at higher quality</title>
        {["Draft on Wan", "Lock seed", "Finish on Veo 3.1"].map((label, i) => (
          <g key={label} transform={`translate(${i * 170 + 5}, 20)`}>
            <rect width="150" height="55" rx="6" fill="none" stroke="var(--onyx-cyan)" />
            <text x="75" y="32" textAnchor="middle" fill="var(--onyx-text)" fontSize="11">{label}</text>
            {i < 2 && <text x="160" y="35" fill="var(--onyx-text-faint)" fontSize="16">→</text>}
          </g>
        ))}
      </svg>
      <p style={pStyle}>
        Veo 3.1 also supports a reproducible seed, the same workflow described
        in our Wan guide: draft a composition, lock in the seed once it's
        right, then re-run at higher settings without losing the specific shot
        you liked. This makes Veo a natural "finishing" step after drafting on
        Wan — carry the seed forward, upgrade the quality.
      </p>

      <h2 style={h2Style}>One action per scene</h2>
      <p style={pStyle}>
        As with every model, a single well-described motion outperforms
        several actions stacked into one short clip.
      </p>

      <h2 style={h2Style}>When to reach for Veo 3.1</h2>
      <p style={pStyle}>
        Choose Veo when visual quality is genuinely the priority — a hero shot
        in a reel, a key narrative beat, or any clip meant to be the
        best-looking moment in your video. It costs more than Kling, and the
        difference is most visible in detail-heavy or texture-heavy scenes —
        skin, fabric, water, reflective surfaces — where Veo's extra fidelity
        actually shows.
      </p>

      <p style={{ ...pStyle, marginBottom: 0 }}>
        Ready to try it? <Link to="/create" style={{ color: "var(--onyx-cyan)" }}>Start creating</Link> with Veo 3.1 on Onyx Reelz.
      </p>
    </LearnPageLayout>
  );
}
