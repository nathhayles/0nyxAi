import { Link } from "react-router-dom";
import SEO from "./SEO";

// Shared wrapper for every Learn page — theming (background/color), spacing,
// and typography live here once so a new guide page can't independently
// reintroduce the hardcoded-color bug found in the first two Learn pages
// (and already present in TermsPage.jsx/PrivacyPage.jsx, which copy the same
// pattern without this shared layout).
//
// The back-link and <h1> used to be duplicated in every page's own JSX
// (identical markup, seo.title always matched the h1 text verbatim) --
// moved here so the hero image can sit strictly between the title and the
// rest of the content (the description paragraph onward) without touching
// all 12 pages every time this header area changes.
export default function LearnPageLayout({ seo, children }) {
  return (
    <div
      className="page"
      style={{
        minHeight: "100vh",
        background: "var(--onyx-bg)",
        maxWidth: 800,
        margin: "0 auto",
        padding: "40px 24px",
        color: "var(--onyx-text)",
        fontFamily: "sans-serif",
        lineHeight: 1.7,
      }}
    >
      <SEO ogType="article" schemaType="Article" {...seo} />
      {seo?.path !== "/learn" && (
        <Link to="/learn" style={{ fontSize: 13, color: "var(--onyx-text-faint)", textDecoration: "none", display: "inline-block", marginBottom: 16 }}>&larr; Back to Learn</Link>
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
    </div>
  );
}
