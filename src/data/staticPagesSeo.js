// Single source of truth for the 6 static/public non-Learn pages that are
// safe to prerender (no per-user data): homepage, pricing, support, login,
// signup, reset-password. Same pattern as src/data/learnPagesSeo.js — one
// copy imported by both the live SPA page and scripts/prerender-seo.js.
//
// Note: /terms and /privacy are NOT here -- they're already served as
// separate hand-maintained static HTML files directly by nginx
// (location = /terms / = /privacy, see /etc/nginx/sites-available/onyx-reelz.com),
// bypassing the SPA entirely. TermsPage.jsx/PrivacyPage.jsx are dead code in
// production, so there's nothing to prerender for those two routes.

export const staticPages = [
  {
    title: "AI Video Editor & Maker",
    description: "Onyx Reelz is an AI video editor and AI video maker with multi-track editing, AI voiceover, captions, and auto-posting to YouTube & LinkedIn.",
    path: "/",
    ogType: "website",
    schemaType: "WebSite",
  },
  {
    title: "Pricing — AI Video Editing Software",
    description: "Plans for Onyx Reelz, the AI video editing software with AI generation, voiceover, captions, and auto-posting. Plans from $7/month, billed via Stripe.",
    path: "/pricing",
    ogType: "website",
    schemaType: "WebPage",
  },
  {
    title: "Support & FAQ",
    description: "Find answers about getting started, brand kits, captions, and audio features in Onyx Reelz.",
    path: "/support",
    ogType: "website",
    schemaType: "WebPage",
  },
  {
    title: "Log In",
    description: "Log in to your Onyx Reelz account to access your video projects and dashboard.",
    path: "/login",
    ogType: "website",
    schemaType: "WebPage",
  },
  {
    title: "Sign Up",
    description: "Create a free Onyx Reelz account to start making AI-generated videos.",
    path: "/signup",
    ogType: "website",
    schemaType: "WebPage",
  },
  {
    title: "Reset Password",
    description: "Reset the password for your Onyx Reelz account.",
    path: "/reset-password",
    ogType: "website",
    schemaType: "WebPage",
  },
];
