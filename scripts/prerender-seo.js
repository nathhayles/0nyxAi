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
import { staticPages } from "../src/data/staticPagesSeo.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST = join(__dirname, "..", "dist");
const SITE_URL = "https://onyx-reelz.com";
const DEFAULT_OG_IMAGE = `${SITE_URL}/onyx-logo.png`;

const template = readFileSync(join(DIST, "index.html"), "utf-8");

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
    CollectionPage: () => ({ "@context": "https://schema.org", "@type": "CollectionPage", name: page.title, description, url, publisher }),
    WebSite: () => ({ "@context": "https://schema.org", "@type": "WebSite", name: page.title, description, url, publisher }),
    WebPage: () => ({ "@context": "https://schema.org", "@type": "WebPage", name: page.title, description, url }),
    Article: () => ({
      "@context": "https://schema.org", "@type": "Article", headline: page.title, description, url, image: ogImage,
      mainEntityOfPage: { "@type": "WebPage", "@id": url }, publisher,
    }),
  };
  const jsonLd = (jsonLdBuilders[page.schemaType] || jsonLdBuilders.Article)();
  const jsonLdTag = `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>`;

  html = html.replace("</head>", `    ${twitterTags}\n    ${jsonLdTag}\n  </head>`);

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
for (const page of staticPages) writeRoute(page);

const total = 1 + learnPages.length + staticPages.length;
console.log(`Done: ${total} static routes prerendered.`);
