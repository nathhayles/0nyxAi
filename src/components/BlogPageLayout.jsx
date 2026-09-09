import { Link } from "react-router-dom";
import LearnPageLayout from "./LearnPageLayout";
import { learnPages } from "../data/learnPagesSeo";

// Thin wrapper around LearnPageLayout — Blog and Learn share one visual
// language (hero header, typography, spacing, SEO scaffolding) now instead
// of two near-duplicate implementations that drifted apart (see git history:
// Blog used to render a small inset image below the h1 instead of the same
// full-bleed hero Learn pages got). Unified 2026-09-10.
//
// Two things this adds on top of the shared layout, both requested directly
// (2026-08-21): a "Related Learn Guide" box carrying real context pulled
// from the linked Learn page's own SEO description (not a rewritten
// summary — see blogPostsSeo.js's comment on relatedLearnPath), and a
// closing dual call-to-action so a reader can either keep browsing or go
// straight to signup in one click, instead of the single "start creating"
// link Learn pages end on. Both are passed via afterContent so
// LearnPageLayout itself stays generic.
export default function BlogPageLayout({ seo, children }) {
  const relatedLearn = seo?.relatedLearnPath
    ? learnPages.find((p) => p.path === seo.relatedLearnPath)
    : null;

  const afterContent = (
    <>
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
    </>
  );

  return (
    <LearnPageLayout seo={seo} hubPath="/blog" hubLabel="Blog" afterContent={afterContent}>
      {children}
    </LearnPageLayout>
  );
}
