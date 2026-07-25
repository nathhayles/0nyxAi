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
        colors, captions, and style — across every reel you create for that
        brand.
      </p>

      <h2 style={h2Style}>A recurring brand presenter</h2>
      <p style={pStyle}>
        Build a Character to act as your brand's on-screen presenter or
        spokesperson — consistent face, consistent presentation, across as
        much content as you need.
      </p>

      <h2 style={h2Style}>Publish with the right disclosures</h2>
      <p style={pStyle}>
        If your content promotes your own brand or a product, Onyx Reelz's
        publishing flow includes built-in Branded Content declaration for
        TikTok and other platforms, so you stay compliant without extra manual
        steps.
      </p>

      <h2 style={h2Style}>Keep the message clear</h2>
      <p style={pStyle}>
        One product, one message, one call to action per scene — the same
        "one clear action" principle that makes any AI video prompt work well
        also keeps marketing content focused.
      </p>

      <h2 style={h2Style}>Dedicated Marketing Mode (coming soon)</h2>
      <p style={{ ...pStyle, marginBottom: 0 }}>
        We're building a dedicated Marketing Content Mode that automatically
        tunes visual style and pacing for commercial, ad-style content in one
        click. Check back soon.
      </p>
    </LearnPageLayout>
  );
}
