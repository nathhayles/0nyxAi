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
    title: "How to Create AI-Generated Videos for Marketing Without Breaking the Budget",
    description: "A real, model-by-model breakdown of what AI video generation for marketing actually costs — with real examples across budget and premium models, not vague pricing advice.",
    path: "/blog/ai-video-marketing-budget",
    ogType: "article",
    schemaType: "Article",
    relatedLearnPath: "/learn/ai-video-pricing",
  },
];
