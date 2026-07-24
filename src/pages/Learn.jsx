import { Link } from "react-router-dom";
import LearnPageLayout from "../components/LearnPageLayout";

// Placeholder list -- expand as more guides get added. Each entry just needs
// a title/description/to; the actual guide page components are added
// separately (see LearnKlingPrompting.jsx for the first real one).
const GUIDES = [
  {
    title: "Kling Prompting Guide",
    description: "How to write prompts that get the most out of Kling video generation.",
    to: "/learn/kling-prompting",
  },
];

export default function Learn() {
  return (
    <LearnPageLayout
      seo={{
        title: "Learn",
        description: "Guides and tips for getting the most out of Onyx Reelz — prompting techniques, video generation models, and more.",
        path: "/learn",
      }}
    >
      <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 8 }}>Learn</h1>
      <p style={{ color: "var(--onyx-text-dim)", fontSize: 15, marginBottom: 32 }}>
        Guides and tips for getting the most out of Onyx Reelz.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {GUIDES.map((guide) => (
          <Link
            key={guide.to}
            to={guide.to}
            style={{
              display: "block",
              padding: "16px 20px",
              borderRadius: 10,
              border: "1px solid var(--onyx-hairline-strong)",
              background: "var(--onyx-surface)",
              textDecoration: "none",
              color: "inherit",
            }}
          >
            <div style={{ fontSize: 16, fontWeight: 600, color: "var(--onyx-text)", marginBottom: 4 }}>{guide.title}</div>
            <div style={{ fontSize: 13, color: "var(--onyx-text-faint)" }}>{guide.description}</div>
          </Link>
        ))}
      </div>
    </LearnPageLayout>
  );
}
