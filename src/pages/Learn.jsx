import { Link } from "react-router-dom";
import LearnPageLayout from "../components/LearnPageLayout";
import { learnHub } from "../data/learnPagesSeo";

// Placeholder list -- expand as more guides get added. Each entry just needs
// a title/description/to; the actual guide page components are added
// separately (see LearnKlingPrompting.jsx for the first real one).
const GUIDES = [
  {
    title: "Kling Prompting Guide",
    description: "How to write prompts that get the most out of Kling video generation.",
    to: "/learn/kling-prompting",
  },
  {
    title: "Seedance 2.0 Prompting Guide",
    description: "How to get the best results from Seedance 2.0, our premium AI video model with native audio generation.",
    to: "/learn/seedance-prompting",
  },
  {
    title: "Wan Prompting Guide",
    description: "How to write prompts for Wan, our fast and affordable AI video model.",
    to: "/learn/wan-prompting",
  },
  {
    title: "Veo 3.1 Prompting Guide",
    description: "How to get the best results from Google's Veo 3.1, our highest-fidelity AI video model.",
    to: "/learn/veo-prompting",
  },
  {
    title: "Choosing the Right AI Video Model",
    description: "A guide to Onyx Reelz's AI video models — Wan, Kling, Veo, and Seedance — and when to use each one.",
    to: "/learn/choosing-a-model",
  },
  {
    title: "Character Consistency Guide",
    description: "How to keep an AI-generated character looking the same across every scene, using the Character Library.",
    to: "/learn/character-consistency",
  },
  {
    title: "Camera Movement & Shot Composition Glossary",
    description: "A plain-English glossary of camera movements and shot compositions for your video prompts.",
    to: "/learn/camera-glossary",
  },
  {
    title: "Creating Kids & Animated Content",
    description: "How to create bright, family-friendly animated video content.",
    to: "/learn/childrens-content",
  },
  {
    title: "Historical & Cinematic Storytelling",
    description: "How to create dramatic, film-quality historical and narrative content.",
    to: "/learn/historical-cinematic",
  },
  {
    title: "AI Video for Marketing & Brand Content",
    description: "How to create branded, on-message video content for your business.",
    to: "/learn/marketing-branding",
  },
  {
    title: "AI Video for Influencers & Content Creators",
    description: "How creators use Onyx Reelz to build a consistent on-screen presence and publish faster.",
    to: "/learn/influencer-content",
  },
  {
    title: "AI Video for Musicians & Music Promotion",
    description: "How musicians use Onyx Reelz to create music videos, lyric videos, and promotional content.",
    to: "/learn/music-promotion",
  },
];

export default function Learn() {
  return (
    <LearnPageLayout
      seo={learnHub}
    >
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
