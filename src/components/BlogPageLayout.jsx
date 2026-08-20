import { Link } from "react-router-dom";
import SEO from "./SEO";
import { learnPages } from "../data/learnPagesSeo";

// Shared wrapper for every Blog post — deliberately mirrors
// LearnPageLayout.jsx (same background, spacing, typography) rather than
// inventing a second visual language, since a reader clicking from a blog
// post into a Learn guide (or the reverse) should feel like one site, not
// two bolted-together sections.
//
// Two things this adds on top of the Learn layout, both requested directly
// (2026-08-21): a "Related Learn Guide" box carrying real context pulled
// from the linked Learn page's own SEO description (not a rewritten
// summary — see blogPostsSeo.js's comment on relatedLearnPath), and a
// closing dual call-to-action so a reader can either keep browsing or go
// straight to signup in one click, instead of the single "start creating"
// link Learn pages end on.
export default function BlogPageLayout({ seo, children }) {
  const relatedLearn = seo?.relatedLearnPath
    ? learnPages.find((p) => p.path === seo.relatedLearnPath)
    : null;

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(ellipse 60% 40% at 12% 0%, rgba(77,208,255,0.10), transparent 55%)," +
          "radial-gradient(ellipse 55% 35% at 90% 8%, rgba(180,141,255,0.09), transparent 55%)," +
          "var(--onyx-bg)",
      }}
    >
      <div
        className="page"
        style={{
          maxWidth: 800,
          margin: "0 auto",
          padding: "40px 24px",
          color: "var(--onyx-text)",
          fontFamily: "sans-serif",
          lineHeight: 1.7,
        }}
      >
        <SEO ogType="article" schemaType="Article" {...seo} />
        {seo?.path !== "/blog" && (
          <Link to="/blog" style={{ fontSize: 13, color: "var(--onyx-text-faint)", textDecoration: "none", display: "inline-block", marginBottom: 16 }}>&larr; Back to Blog</Link>
        )}
        <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 8 }}>{seo?.title}</h1>
        {seo?.ogImage && (
          <div style={{ width: "100%", aspectRatio: "16/9", overflow: "hidden", borderRadius: 12, marginBottom: 24 }}>
            <img
              src={seo.ogImage}
              alt={seo.imageAlt || ""}
              width={1280}
              height={720}
              loading="eager"
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            />
          </div>
        )}

        {children}

        {relatedLearn && (
          <div
            style={{
              marginTop: 40,
              padding: 20,
              borderRadius: 12,
              border: "1px solid var(--onyx-hairline-strong)",
              background: "var(--onyx-surface)",
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.4, textTransform: "uppercase", color: "var(--onyx-cyan)", marginBottom: 8 }}>
              Go deeper
            </div>
            <Link to={relatedLearn.path} style={{ fontSize: 17, fontWeight: 600, color: "var(--onyx-text)", textDecoration: "none" }}>
              {relatedLearn.title} &rarr;
            </Link>
            <p style={{ fontSize: 14, color: "var(--onyx-text-dim)", marginTop: 8, marginBottom: 0 }}>
              {relatedLearn.description}
            </p>
          </div>
        )}

        <div
          style={{
            marginTop: 24,
            padding: "24px 20px",
            borderRadius: 12,
            textAlign: "center",
            background: "linear-gradient(135deg, rgba(77,208,255,0.10), rgba(180,141,255,0.10))",
            border: "1px solid var(--onyx-hairline-strong)",
          }}
        >
          <p style={{ fontSize: 15, color: "var(--onyx-text)", marginBottom: 16 }}>
            Ready to try it yourself, or want to read more first?
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <Link
              to="/signup"
              className="btn-teal"
              style={{ display: "inline-block", textDecoration: "none", padding: "10px 22px", borderRadius: 8, fontWeight: 600 }}
            >
              Sign up & start generating
            </Link>
            <Link
              to="/blog"
              style={{
                display: "inline-block", textDecoration: "none", padding: "10px 22px", borderRadius: 8,
                fontWeight: 600, border: "1px solid var(--onyx-hairline-strong)", color: "var(--onyx-text-dim)",
              }}
            >
              Search more posts
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
