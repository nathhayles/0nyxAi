// Runs after `vite build`. Writes a static dist/<route>/index.html per Learn
// page with the real per-page <head> tags (title, description, canonical,
// og:*, twitter:*, JSON-LD) baked in at build time.
//
// Why: this app is a client-rendered SPA (ReactDOM.createRoot, no SSR/
// hydration) and SEO.jsx sets meta tags via useEffect, which only runs after
// JS executes in a real browser. Social-platform crawlers (Facebook,
// Twitter, LinkedIn, Slack, etc.) generally do NOT execute JS -- they only
// ever see dist/index.html's static tags, which are the generic homepage's,
// identical for every route. This script fixes that for the Learn pages by
// pre-baking a route-specific static file that nginx's existing
// `try_files $uri $uri/index.html /index.html;` will serve automatically --
// no nginx config change needed (verified live 2026-07-28).
//
// Safe because <body> is untouched (just the empty #root div + script
// tags) -- React mounts into it exactly as it does for the generic
// dist/index.html, so there's no hydration mismatch to worry about.

import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { learnHub, learnPages } from "../src/data/learnPagesSeo.js";
import { blogHub, blogPosts } from "../src/data/blogPostsSeo.js";
import { staticPages } from "../src/data/staticPagesSeo.js";
import { SECTIONS as SUPPORT_SECTIONS } from "../src/data/supportSections.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST = join(__dirname, "..", "dist");
const SITE_URL = "https://onyx-reelz.com";
const DEFAULT_OG_IMAGE = `${SITE_URL}/onyx-logo.png`;
const ORG_ID = `${SITE_URL}/#organization`;

const template = readFileSync(join(DIST, "index.html"), "utf-8");

// Real, verified data (footer of LandingPage.jsx + PricingPage.jsx's actual
// Stripe-linked price list, cross-checked 2026-08-19) -- never invent
// figures here; if the real product changes, these must be updated to match
// or removed, not left stale (see the earlier "$7/month" bug this file's
// sibling staticPagesSeo.js had).
function buildOrganization() {
  return {
    "@type": "Organization",
    "@id": ORG_ID,
    name: "Onyx Reelz",
    legalName: "ONYX REELZ LTD",
    url: SITE_URL,
    logo: { "@type": "ImageObject", url: DEFAULT_OG_IMAGE },
    address: {
      "@type": "PostalAddress",
      streetAddress: "128 City Road",
      addressLocality: "London",
      postalCode: "EC1V 2NX",
      addressCountry: "GB",
    },
    sameAs: [
      "https://www.tiktok.com/@onyxreelz",
      "https://www.youtube.com/@OnyxReelz",
      "https://www.instagram.com/onyxreelz/",
      "https://www.facebook.com/profile.php?id=61590002537395",
    ],
  };
}

function buildSoftwareApplication() {
  return {
    "@type": "SoftwareApplication",
    "@id": `${SITE_URL}/#software`,
    name: "Onyx Reelz",
    url: SITE_URL,
    applicationCategory: "MultimediaApplication",
    operatingSystem: "Web",
    description: "AI video editor and AI video maker with multi-track editing, AI voiceover, captions, and auto-posting to YouTube, Instagram, and LinkedIn.",
    publisher: { "@id": ORG_ID },
    offers: [
      { "@type": "Offer", name: "Free — full editor, no card required", price: "0", priceCurrency: "USD", url: `${SITE_URL}/pricing` },
      { "@type": "Offer", name: "Credits — 500", price: "5.00", priceCurrency: "USD", url: `${SITE_URL}/pricing` },
      { "@type": "Offer", name: "Credits — 1,000", price: "10.00", priceCurrency: "USD", url: `${SITE_URL}/pricing` },
      { "@type": "Offer", name: "Credits — 2,500", price: "25.00", priceCurrency: "USD", url: `${SITE_URL}/pricing` },
      { "@type": "Offer", name: "Credits — 5,000", price: "50.00", priceCurrency: "USD", url: `${SITE_URL}/pricing` },
      { "@type": "Offer", name: "Unlimited Brands add-on", price: "15.00", priceCurrency: "USD", priceSpecification: { "@type": "UnitPriceSpecification", price: "15.00", priceCurrency: "USD", unitCode: "MON" }, url: `${SITE_URL}/pricing` },
      { "@type": "Offer", name: "Auto-posting add-on", price: "15.00", priceCurrency: "USD", priceSpecification: { "@type": "UnitPriceSpecification", price: "15.00", priceCurrency: "USD", unitCode: "MON" }, url: `${SITE_URL}/pricing` },
    ],
  };
}

// Built directly from Support.jsx's own SECTIONS array (imported, not
// copied) so this can never drift out of sync with the real, user-visible
// FAQ content the way the old hand-written support.js system prompt did.
function buildFAQPage() {
  const mainEntity = SUPPORT_SECTIONS.flatMap((section) =>
    section.items.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    }))
  );
  return { "@context": "https://schema.org", "@type": "FAQPage", "@id": `${SITE_URL}/support#faq`, mainEntity };
}

// Section param is "Learn"/"/learn" or "Blog"/"/blog" -- same shape either
// way, just the hub name/path differ, so one function covers both instead
// of a near-duplicate buildBlogBreadcrumb.
function buildBreadcrumb(page, sectionName, sectionPath) {
  const items = [
    { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL + "/" },
    { "@type": "ListItem", position: 2, name: sectionName, item: `${SITE_URL}${sectionPath}` },
  ];
  if (page.path !== sectionPath) items.push({ "@type": "ListItem", position: 3, name: page.title, item: `${SITE_URL}${page.path}` });
  return { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: items };
}

function buildHead(page) {
  const fullTitle = page.title ? `${page.title} | Onyx Reelz` : "Onyx Reelz";
  const url = `${SITE_URL}${page.path}`;
  const ogImage = page.ogImage || DEFAULT_OG_IMAGE;
  const ogType = page.ogType || "article";
  const description = page.description || "";

  let html = template;

  html = html.replace(/<title>.*?<\/title>/, `<title>${escapeHtml(fullTitle)}</title>`);
  html = html.replace(/<meta name="description"[^>]*>/, `<meta name="description" content="${escapeHtml(description)}" />`);
  html = html.replace(/<meta property="og:title"[^>]*>/, `<meta property="og:title" content="${escapeHtml(fullTitle)}" />`);
  html = html.replace(/<meta property="og:description"[^>]*>/, `<meta property="og:description" content="${escapeHtml(description)}" />`);
  html = html.replace(/<meta property="og:image"[^>]*>/, `<meta property="og:image" content="${escapeHtml(ogImage)}" />\n    <meta property="og:image:alt" content="${escapeHtml(page.imageAlt || "")}" />`);
  html = html.replace(/<meta property="og:url"[^>]*>/, `<meta property="og:url" content="${escapeHtml(url)}" />`);
  html = html.replace(/<meta property="og:type"[^>]*>/, `<meta property="og:type" content="${escapeHtml(ogType)}" />`);

  const twitterTags = `<meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(fullTitle)}" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />
    <meta name="twitter:image" content="${escapeHtml(ogImage)}" />
    <meta name="twitter:image:alt" content="${escapeHtml(page.imageAlt || "")}" />
    <link rel="canonical" href="${escapeHtml(url)}" />`;

  const publisher = { "@type": "Organization", name: "Onyx Reelz", logo: { "@type": "ImageObject", url: DEFAULT_OG_IMAGE } };
  const jsonLdBuilders = {
    CollectionPage: () => [{ "@context": "https://schema.org", "@type": "CollectionPage", name: page.title, description, url, publisher }],
    WebSite: () => [
      { "@context": "https://schema.org", "@type": "WebSite", name: page.title, description, url, publisher: { "@id": ORG_ID } },
      { "@context": "https://schema.org", ...buildOrganization() },
      { "@context": "https://schema.org", ...buildSoftwareApplication() },
    ],
    WebPage: () => [{ "@context": "https://schema.org", "@type": "WebPage", name: page.title, description, url }],
    Article: () => [{
      "@context": "https://schema.org", "@type": "Article", headline: page.title, description, url, image: ogImage,
      mainEntityOfPage: { "@type": "WebPage", "@id": url }, publisher,
    }],
  };
  const jsonLdNodes = (jsonLdBuilders[page.schemaType] || jsonLdBuilders.Article)();

  // Support gets its FAQPage on top of its normal WebPage node -- built from
  // the real 109-item Support.jsx SECTIONS array, not hand-written.
  if (page.path === "/support") jsonLdNodes.push(buildFAQPage());

  // Every Learn/Blog subpage (not its own hub) gets a BreadcrumbList on top
  // of its Article node.
  if (page.path.startsWith("/learn/")) jsonLdNodes.push(buildBreadcrumb(page, "Learn", "/learn"));
  if (page.path.startsWith("/blog/")) jsonLdNodes.push(buildBreadcrumb(page, "Blog", "/blog"));

  const jsonLdTags = jsonLdNodes.map((node) => `<script type="application/ld+json">${JSON.stringify(node)}</script>`).join("\n    ");

  html = html.replace("</head>", `    ${twitterTags}\n    ${jsonLdTags}\n  </head>`);

  return html;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function writeRoute(page) {
  const html = buildHead(page);
  const routeDir = join(DIST, page.path.replace(/^\//, ""));
  mkdirSync(routeDir, { recursive: true });
  writeFileSync(join(routeDir, "index.html"), html);
  console.log(`prerendered ${page.path} -> dist${page.path}/index.html`);
}

writeRoute(learnHub);
for (const page of learnPages) writeRoute(page);
writeRoute(blogHub);
for (const page of blogPosts) writeRoute(page);
for (const page of staticPages) writeRoute(page);

const total = 1 + learnPages.length + 1 + blogPosts.length + staticPages.length;
console.log(`Done: ${total} static routes prerendered.`);
