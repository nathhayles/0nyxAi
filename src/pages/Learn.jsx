import { Link } from "react-router-dom";
import LearnPageLayout from "../components/LearnPageLayout";
import { learnHub, learnPages } from "../data/learnPagesSeo";

// Reuses each guide's own hero image (already generated per-page in
// learnPagesSeo.js) as its index-card thumbnail, rather than generating or
// storing a second copy of the same artwork.
const imageByPath = Object.fromEntries(learnPages.map((p) => [p.path, p.ogImage]));

// Placeholder list -- expand as more guides get added. Each entry just needs
// a title/description/to; the actual guide page components are added
// separately (see LearnKlingPrompting.jsx for the first real one).
const GUIDES = [
  {
    title: "Onyx Editor Tools: A Complete Tour",
    description: "A tool-by-tool guide to the Onyx Reelz editor — Split, Trim, Text, B-Roll, Transitions, Voiceover, and more, with real screen recordings of each one.",
    to: "/learn/editor-tools",
  },
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
  {
    title: "How Much Does AI Video Generation Really Cost? (2026 Breakdown)",
    description: "A real breakdown of what AI video generation actually costs — what drives the price up or down, and what to watch out for.",
    to: "/learn/ai-video-pricing",
  },
  {
    title: "AI Video Model Comparison: Duration, Resolution & Aspect Ratio (2026 Guide)",
    description: "A real breakdown of what today's leading AI video models actually support — duration limits, resolution, and aspect ratio.",
    to: "/learn/model-comparison",
  },
  {
    title: "Do You Need an AI Disclosure Label on Your Videos? The EU AI Act, Explained",
    description: "What the EU AI Act's Article 50 actually requires for AI-generated video, who it applies to, and how Onyx Reelz helps you stay compliant.",
    to: "/learn/eu-ai-act-disclosure",
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

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
        {GUIDES.map((guide) => (
          <Link
            key={guide.to}
            to={guide.to}
            className="onyx-learn-guide-card"
            style={{
              display: "block",
              borderRadius: 10,
              border: "1px solid var(--onyx-hairline-strong)",
              background: "var(--onyx-surface)",
              textDecoration: "none",
              color: "inherit",
              overflow: "hidden",
              transition: "border-color 0.2s, transform 0.2s, background 0.2s",
            }}
          >
            {imageByPath[guide.to] && (
              <div style={{ width: "100%", aspectRatio: "16/9", overflow: "hidden" }}>
                <img
                  src={imageByPath[guide.to]}
                  alt=""
                  loading="eager"
                  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                />
              </div>
            )}
            <div style={{ padding: "16px 20px" }}>
              <div style={{ fontSize: 16, fontWeight: 600, color: "var(--onyx-text)", marginBottom: 4 }}>{guide.title}</div>
              <div style={{ fontSize: 13, color: "var(--onyx-text-faint)" }}>{guide.description}</div>
            </div>
          </Link>
        ))}
      </div>
    </LearnPageLayout>
  );
}
