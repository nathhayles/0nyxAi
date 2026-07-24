import SEO from "./SEO";

// Shared wrapper for every Learn page — theming (background/color), spacing,
// and typography live here once so a new guide page can't independently
// reintroduce the hardcoded-color bug found in the first two Learn pages
// (and already present in TermsPage.jsx/PrivacyPage.jsx, which copy the same
// pattern without this shared layout).
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
      <SEO {...seo} />
      {children}
    </div>
  );
}
