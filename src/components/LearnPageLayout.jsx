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
            {seo?.path !== "/learn" && (
              <Link to="/learn" style={{ fontSize: 13, color: "rgba(255,255,255,0.75)", textDecoration: "none", display: "inline-block", marginBottom: 14 }}>&larr; Back to Learn</Link>
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
          {seo?.path !== "/learn" && (
            <Link to="/learn" style={{ fontSize: 13, color: "var(--onyx-text-faint)", textDecoration: "none", display: "inline-block", marginBottom: 16 }}>&larr; Back to Learn</Link>
          )}
          <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 8 }}>{seo?.title}</h1>
        </>
      )}
      {children}
    </div>
    </div>
  );
}
