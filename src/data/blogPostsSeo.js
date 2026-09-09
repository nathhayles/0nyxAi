// Single source of truth for every Blog post's SEO metadata — same pattern
// as src/data/learnPagesSeo.js (see that file's comment for why: social
// crawlers don't execute JS, so scripts/prerender-seo.js needs this exact
// shape at build time, and the live SPA page needs the identical data so
// the two never drift apart).
//
// `relatedLearnPath` is blog-specific: every post exists to answer a real
// search query, then hand the reader straight to the Learn guide that goes
// deeper on the same subject — BlogPageLayout renders a real excerpt pulled
// from that Learn page's own SEO description, not a rewritten summary, so
// the two pages can't quietly drift out of sync with each other.

export const blogHub = {
  title: "Blog",
  description: "AI video generation, explained — practical answers to real questions about creating video content with AI, from Onyx Reelz.",
  path: "/blog",
  ogType: "website",
  schemaType: "CollectionPage",
};

export const blogPosts = [
  {
    title: "What's New: Edit an Existing Clip, and Two New Ways to Shape How Your Footage Looks",
    description: "Two features just shipped on Onyx Reelz — Reshoot, for editing a clip you already have instead of regenerating it, and the Style System, for shaping how your generated footage actually looks.",
    path: "/blog/reshoot-and-style-system-launch",
    ogType: "article",
    schemaType: "Article",
    relatedLearnPath: "/learn/reshoot-editing",
    // Reuses the linked Learn page's own hero image rather than storing a
    // second copy of the same artwork — same real Reshoot before/after
    // still this post's own embedded video shows, not a stock illustration.
    ogImage: "https://pub-31e667ae894f4cddbf03ae6a7578eff1.r2.dev/uploads/d7c733c8-31dd-49b2-bffa-655b7d13ce11/image/d631e0976a78ee5784ed2ea69f9aa377__reshoot_hero2.jpg",
    imageAlt: "Real Reshoot before/after — the same golden retriever puppy in a sunny meadow, then edited into a snowy dusk field, Onyx Reelz",
  },
  {
    title: "How to Create AI-Generated Videos for Marketing Without Breaking the Budget",
    description: "A real, model-by-model breakdown of what AI video generation for marketing actually costs — with real examples across budget and premium models, not vague pricing advice.",
    path: "/blog/ai-video-marketing-budget",
    ogType: "article",
    schemaType: "Article",
    relatedLearnPath: "/learn/ai-video-pricing",
    ogImage: "https://pub-31e667ae894f4cddbf03ae6a7578eff1.r2.dev/learn-hero-images/ai-video-pricing-breakdown-illustration.png",
    imageAlt: "AI video pricing breakdown illustration — cyan price tag with a glowing amber dollar sign beside a stack of violet coins, Onyx Reelz",
  },
];
