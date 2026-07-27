// Single source of truth for every Learn page's SEO metadata — imported by
// each page component (for the live SPA) AND by scripts/prerender-seo.js
// (for the build-time static <head> prerender). Keeping one copy avoids the
// exact metadata-drift problem that caused Facebook/Twitter/etc. crawlers to
// see stale, generic tags instead of each page's real title/image/alt-text:
// those crawlers don't execute JS, so they only ever see whatever is baked
// into the static HTML at build time, not what SEO.jsx sets at runtime.

export const learnHub = {
  title: "Learn",
  description: "Guides and tips for getting the most out of Onyx Reelz — prompting techniques, video generation models, and more.",
  path: "/learn",
  ogType: "website",
  schemaType: "CollectionPage",
};

export const learnPages = [
  {
    title: "Kling Prompting Guide",
    description: "How to write prompts that get the most out of Kling video generation on Onyx Reelz.",
    path: "/learn/kling-prompting",
    ogImage: "https://pub-31e667ae894f4cddbf03ae6a7578eff1.r2.dev/learn-hero-images/kling-ai-video-prompting-guide-illustration.png",
    imageAlt: "Kling AI video prompting guide illustration — cyan film camera with a glowing cyan light beam and amber sparkle accents, Onyx Reelz",
  },
  {
    title: "Camera Movement & Shot Composition Glossary",
    description: "A plain-English glossary of camera movements and shot compositions you can use in your Onyx Reelz video prompts.",
    path: "/learn/camera-glossary",
    ogImage: "https://pub-31e667ae894f4cddbf03ae6a7578eff1.r2.dev/learn-hero-images/camera-movement-shot-composition-glossary-illustration.png",
    imageAlt: "Camera movement and shot composition glossary illustration — camera with amber motion arrows on a violet dolly track, Onyx Reelz",
  },
  {
    title: "Character Consistency Guide",
    description: "How to keep an AI-generated character looking the same across every scene, using Onyx Reelz's Character Library.",
    path: "/learn/character-consistency",
    ogImage: "https://pub-31e667ae894f4cddbf03ae6a7578eff1.r2.dev/learn-hero-images/character-consistency-ai-video-guide-illustration.png",
    imageAlt: "Character consistency guide illustration — three identical cyan character faces in violet film frames linked by an amber chain and checkmark, Onyx Reelz",
  },
  {
    title: "Creating Kids & Animated Content",
    description: "How to create bright, family-friendly animated video content with Onyx Reelz.",
    path: "/learn/childrens-content",
    ogImage: "https://pub-31e667ae894f4cddbf03ae6a7578eff1.r2.dev/learn-hero-images/kids-animated-content-ai-video-illustration.png",
    imageAlt: "Kids and animated content guide illustration — smiling cyan star character next to amber and violet building blocks with a cyan play button, Onyx Reelz",
  },
  {
    title: "Choosing the Right AI Video Model",
    description: "A guide to Onyx Reelz's AI video models — Wan, Kling, Veo, and Seedance — and when to use each one.",
    path: "/learn/choosing-a-model",
    ogImage: "https://pub-31e667ae894f4cddbf03ae6a7578eff1.r2.dev/learn-hero-images/choosing-ai-video-model-guide-illustration.png",
    imageAlt: "Choosing an AI video model guide illustration — cyan signpost splitting into an amber path and a violet path, Onyx Reelz",
  },
  {
    title: "Historical & Cinematic Storytelling",
    description: "How to create dramatic, film-quality historical and narrative content with Onyx Reelz.",
    path: "/learn/historical-cinematic",
    ogImage: "https://pub-31e667ae894f4cddbf03ae6a7578eff1.r2.dev/learn-hero-images/historical-cinematic-storytelling-illustration.png",
    imageAlt: "Historical and cinematic storytelling illustration — large cyan film camera center stage with violet curtains and a narrow amber spotlight beam, Onyx Reelz",
  },
  {
    title: "AI Video for Influencers & Content Creators",
    description: "How creators use Onyx Reelz to build a consistent on-screen presence and publish faster.",
    path: "/learn/influencer-content",
    ogImage: "https://pub-31e667ae894f4cddbf03ae6a7578eff1.r2.dev/learn-hero-images/ai-video-influencers-content-creators-illustration.png",
    imageAlt: "AI video for influencers and content creators illustration — cyan smartphone on a violet tripod with an amber ring light and like icon, Onyx Reelz",
  },
  {
    title: "AI Video for Marketing & Brand Content",
    description: "How to create branded, on-message video content for your business with Onyx Reelz.",
    path: "/learn/marketing-branding",
    ogImage: "https://pub-31e667ae894f4cddbf03ae6a7578eff1.r2.dev/learn-hero-images/ai-video-marketing-branding-illustration.png",
    imageAlt: "AI video for marketing and brand content illustration — cyan megaphone with amber sound waves, a price tag, and a shopping bag, Onyx Reelz",
  },
  {
    title: "AI Video for Musicians & Music Promotion",
    description: "How musicians use Onyx Reelz to create music videos, lyric videos, and promotional content.",
    path: "/learn/music-promotion",
    ogImage: "https://pub-31e667ae894f4cddbf03ae6a7578eff1.r2.dev/learn-hero-images/ai-video-musicians-music-promotion-illustration.png",
    imageAlt: "AI video for musicians and music promotion illustration — cyan camera merged with an amber musical note beside a dark violet vinyl record, Onyx Reelz",
  },
  {
    title: "Seedance 2.0 Prompting Guide",
    description: "How to get the best results from Seedance 2.0, our premium AI video model with native audio generation, on Onyx Reelz.",
    path: "/learn/seedance-prompting",
    ogImage: "https://pub-31e667ae894f4cddbf03ae6a7578eff1.r2.dev/learn-hero-images/seedance-2-ai-video-prompting-guide-illustration.png",
    imageAlt: "Seedance 2.0 prompting guide illustration — violet film camera with a cyan light beam and amber audio waveform bars, Onyx Reelz",
  },
  {
    title: "Veo 3.1 Prompting Guide",
    description: "How to get the best results from Google's Veo 3.1, our highest-fidelity AI video model on Onyx Reelz.",
    path: "/learn/veo-prompting",
    ogImage: "https://pub-31e667ae894f4cddbf03ae6a7578eff1.r2.dev/learn-hero-images/veo-3-1-ai-video-prompting-guide-illustration.png",
    imageAlt: "Veo 3.1 prompting guide illustration — cyan camera lens ring with a faceted amber diamond and sparkle accents at its center, Onyx Reelz",
  },
  {
    title: "Wan Prompting Guide",
    description: "How to write prompts for Wan, our fast and affordable AI video model on Onyx Reelz.",
    path: "/learn/wan-prompting",
    ogImage: "https://pub-31e667ae894f4cddbf03ae6a7578eff1.r2.dev/learn-hero-images/wan-ai-video-prompting-guide-illustration.png",
    imageAlt: "Wan prompting guide illustration — cyan camera with an amber lightning bolt and speed-lines symbolizing fast generation, Onyx Reelz",
  },
];
