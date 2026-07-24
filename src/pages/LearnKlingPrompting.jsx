import { Link } from "react-router-dom";
import LearnPageLayout from "../components/LearnPageLayout";

// Placeholder body content -- real copy to follow. This just gets the
// route/page shell rendering correctly end to end.
export default function LearnKlingPrompting() {
  return (
    <LearnPageLayout
      seo={{
        title: "Kling Prompting Guide",
        description: "How to write prompts that get the most out of Kling video generation on Onyx Reelz.",
        path: "/learn/kling-prompting",
      }}
    >
      <Link to="/learn" style={{ fontSize: 13, color: "var(--onyx-text-faint)", textDecoration: "none", display: "inline-block", marginBottom: 16 }}>&larr; Back to Learn</Link>
      <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 8 }}>Kling Prompting Guide</h1>
      <p style={{ color: "var(--onyx-text-dim)", fontSize: 15, marginBottom: 32 }}>
        Guide content coming soon.
      </p>
    </LearnPageLayout>
  );
}
