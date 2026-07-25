import { Link } from "react-router-dom";
import LearnPageLayout from "../components/LearnPageLayout";

const h2Style = { fontSize: 20, fontWeight: 700, color: "var(--onyx-text)", marginTop: 36, marginBottom: 12 };
const pStyle = { color: "var(--onyx-text-dim)", fontSize: 15, marginBottom: 16 };

export default function LearnMarketingBranding() {
  return (
    <LearnPageLayout
      seo={{
        title: "AI Video for Marketing & Brand Content",
        description: "How to create branded, on-message video content for your business with Onyx Reelz.",
        path: "/learn/marketing-branding",
      }}
    >
      <Link to="/learn" style={{ fontSize: 13, color: "var(--onyx-text-faint)", textDecoration: "none", display: "inline-block", marginBottom: 16 }}>&larr; Back to Learn</Link>
      <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 8 }}>AI Video for Marketing &amp; Brand Content</h1>
      <p style={{ color: "var(--onyx-text-dim)", fontSize: 15, marginBottom: 32 }}>
        How to create branded, on-message video content for your business.
      </p>

      <h2 style={h2Style}>Consistent branding, every time</h2>
      <p style={pStyle}>
        Set up a Brand in Onyx Reelz to apply a consistent visual identity —
        colors, captions, and style — across every reel you create under that
        brand. This matters more than it might seem: audiences recognize a
        brand's content partly through consistent visual language, and
        manually recreating that consistency scene by scene is both slow and
        error-prone.
      </p>
      <svg viewBox="0 0 400 120" role="img" aria-labelledby="marketing-brand-title" style={{ width: "100%", maxWidth: 400, margin: "24px auto", display: "block" }}>
        <title id="marketing-brand-title">Consistent brand color palette and identity applied across every marketing video</title>
        <rect x="10" y="10" width="20" height="80" fill="var(--onyx-cyan)" />
        {[0, 1, 2].map(i => (
          <rect key={i} x={60 + i * 110} y="10" width="90" height="80" rx="6" fill="none" stroke="var(--onyx-cyan)" strokeWidth="2" />
        ))}
        <text x="200" y="110" textAnchor="middle" fill="var(--onyx-text-faint)" fontSize="10">Same palette, every reel</text>
      </svg>

      <h2 style={h2Style}>A recurring brand presenter</h2>
      <p style={pStyle}>
        Many businesses benefit from a consistent on-screen presenter —
        someone who becomes recognizable as the face of the brand's content
        over time. Build a Character in your{" "}
        <Link to="/characters" style={{ color: "var(--onyx-cyan)" }}>Character Library</Link>{" "}
        to serve that role: consistent face, consistent presentation, across
        as much content as you need, without the scheduling and cost overhead
        of working with a real person for every single video. See our{" "}
        <Link to="/learn/character-consistency" style={{ color: "var(--onyx-cyan)" }}>Character Consistency Guide</Link>{" "}
        for the full walkthrough.
      </p>

      <h2 style={h2Style}>Publish with the right disclosures built in</h2>
      <p style={pStyle}>
        If your content promotes your own brand or a third party's product,
        Onyx Reelz's publishing flow includes a built-in Branded Content
        declaration for TikTok and other platforms — the disclosure toggles,
        the required labeling text, and the privacy restrictions that come
        with promotional content are all handled for you, so you stay
        compliant without manually tracking each platform's individual rules.
      </p>

      <h2 style={h2Style}>Keep the message clear</h2>
      <p style={pStyle}>
        The same "one clear action per scene" discipline that improves any AI
        video prompt applies directly to marketing content: one product, one
        message, one call to action per scene. Stacking multiple selling
        points into a single shot usually dilutes all of them — better to let
        each scene do one job well.
      </p>
      <svg viewBox="0 0 400 100" role="img" aria-labelledby="marketing-message-title" style={{ width: "100%", maxWidth: 400, margin: "24px auto", display: "block" }}>
        <title id="marketing-message-title">One clear product message and call to action per marketing video scene</title>
        <rect x="10" y="20" width="380" height="30" rx="6" fill="none" stroke="var(--onyx-hairline-strong)" />
        <text x="200" y="40" textAnchor="middle" fill="var(--onyx-text-faint)" fontSize="10">Multiple messages = diluted</text>
        <rect x="10" y="60" width="380" height="30" rx="6" fill="none" stroke="var(--onyx-cyan)" strokeWidth="2" />
        <text x="200" y="80" textAnchor="middle" fill="var(--onyx-text)" fontSize="10">One message = clear</text>
      </svg>

      <h2 style={h2Style}>Choosing a model for commercial content</h2>
      <p style={pStyle}>
        For most brand content, Kling's balance of quality and character
        consistency makes it the practical default, especially for anything
        built around a recurring presenter. Reserve Veo 3.1 for hero shots —
        a product reveal, a key visual moment — where the extra visual
        fidelity genuinely earns its cost. See our full{" "}
        <Link to="/learn/choosing-a-model" style={{ color: "var(--onyx-cyan)" }}>model guide</Link>{" "}
        for the complete breakdown.
      </p>

      <h2 style={h2Style}>A dedicated mode is coming</h2>
      <p style={pStyle}>
        We're building a dedicated Marketing Content Mode that will
        automatically tune visual style and pacing for commercial, ad-style
        content in a single click. Check back soon.
      </p>

      <h2 style={h2Style}>Getting started</h2>
      <p style={{ ...pStyle, marginBottom: 0 }}>
        Set up your Brand identity, build a presenter Character if your
        content calls for one, and start structuring scenes on{" "}
        <Link to="/create" style={{ color: "var(--onyx-cyan)" }}>Create</Link>{" "}
        around a single clear message each.
      </p>
    </LearnPageLayout>
  );
}
