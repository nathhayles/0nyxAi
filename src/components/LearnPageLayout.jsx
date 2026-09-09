import { Link } from "react-router-dom";
import SEO from "./SEO";
import { blogPosts } from "../data/blogPostsSeo";

// Shared wrapper for every Learn AND Blog page — theming (background/color),
// spacing, typography, and the full-bleed hero header all live here once so
// the two content types can't independently drift into two different-
// looking products (they used to: Blog had a smaller inset image below the
// h1 instead of this hero, and no per-template SEO scaffolding beyond
// meta tags — unified 2026-09-10, see BlogPageLayout.jsx for the thin
// wrapper that reuses this component instead of duplicating it).
//
// `hubPath`/`hubLabel` let a caller point the back-link and hub-relative
// checks at "/blog" instead of the "/learn" default, without forking this
// file. `afterContent` is extra JSX rendered after the article body and
// before the closing wrapper — Blog uses it for the "Go deeper" Learn
// cross-link + signup CTA; Learn pages have none.
//
// The back-link and <h1> used to be duplicated in every page's own JSX
// (identical markup, seo.title always matched the h1 text verbatim) --
// moved here so the hero image can sit strictly between the title and the
// rest of the content (the description paragraph onward) without touching
// all the individual pages every time this header area changes.
export default function LearnPageLayout({ seo, children, hubPath = "/learn", hubLabel = "Learn", afterContent = null }) {
  // Reverse-lookup: any Blog post that names this Learn page as its
  // relatedLearnPath gets surfaced here automatically, so a new blog post
  // doesn't need a matching manual edit on the Learn side to link back.
  // Only applies to real Learn article pages, not the /learn hub itself and
  // not when this component is being reused to render a Blog page.
  const isLearnArticle = hubPath === "/learn" && seo?.path && seo.path !== hubPath;
  const relatedBlog = isLearnArticle ? blogPosts.filter((p) => p.relatedLearnPath === seo.path) : [];

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
      {/* Full-bleed hero: the header IS the image, with a bottom-up gradient
          so the title reads clearly over any photo. Replaces the old
          flat-icon-illustration-in-a-small-box treatment (see git history on
          this file) -- Nathan's direct feedback 2026-09-04: pages read as
          "black page, bland, AI-obvious" and needed the hero photography to
          BE the vibrant color statement at the top of the page, not a small
          inset thumbnail below a plain white heading. */}
      {seo?.ogImage && (
        <div style={{ position: "relative", width: "100%", aspectRatio: "21/9", overflow: "hidden" }}>
          <img
            src={seo.ogImage}
            alt={seo.imageAlt || ""}
            width={1920}
            height={823}
            loading="eager"
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
          <div style={{
            position: "absolute", inset: 0,
            background: "linear-gradient(180deg, rgba(6,9,15,0.15) 0%, rgba(6,9,15,0.55) 55%, rgba(6,9,15,0.96) 100%)",
          }} />
          <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: "0 24px 32px", maxWidth: 848, margin: "0 auto" }}>
            {seo?.path !== hubPath && (
              <Link to={hubPath} style={{ fontSize: 13, color: "rgba(255,255,255,0.75)", textDecoration: "none", display: "inline-block", marginBottom: 14 }}>&larr; Back to {hubLabel}</Link>
            )}
            <h1 style={{
              fontSize: "clamp(28px, 5vw, 44px)", fontWeight: 800, margin: 0,
              color: "#fff", textShadow: "0 2px 24px rgba(0,0,0,0.5)", letterSpacing: "-0.01em",
            }}>{seo?.title}</h1>
          </div>
        </div>
      )}
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
      {!seo?.ogImage && (
        <>
          {seo?.path !== hubPath && (
            <Link to={hubPath} style={{ fontSize: 13, color: "var(--onyx-text-faint)", textDecoration: "none", display: "inline-block", marginBottom: 16 }}>&larr; Back to {hubLabel}</Link>
          )}
          <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 8 }}>{seo?.title}</h1>
        </>
      )}
      {children}

      {relatedBlog.length > 0 && (
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
            From the Blog
          </div>
          {relatedBlog.map((post) => (
            <div key={post.path} style={{ marginBottom: 12 }}>
              <Link to={post.path} style={{ fontSize: 17, fontWeight: 600, color: "var(--onyx-text)", textDecoration: "none" }}>
                {post.title} &rarr;
              </Link>
              <p style={{ fontSize: 14, color: "var(--onyx-text-dim)", marginTop: 4, marginBottom: 0 }}>
                {post.description}
              </p>
            </div>
          ))}
        </div>
      )}

      {afterContent}
    </div>
    </div>
  );
}
