// Runs after `vite build` (see package.json's postbuild), writing
// dist/sitemap.xml from the same SEO data files prerender-seo.js reads —
// replaces the old hand-maintained public/sitemap.xml, which had silently
// drifted (every Blog post was missing from it; nobody edits a static XML
// file by hand every time a page ships). With daily blog posts starting,
// a sitemap that isn't regenerated from source data will drift again on
// day one — so this makes the sitemap a template-level guarantee instead
// of a per-post checklist item.
//
// Deliberately excludes /login, /signup, /reset-password (no SEO value,
// matches the previous hand-maintained sitemap's own omission) and
// /terms + /privacy are hand-maintained static HTML served directly by
// nginx (see staticPagesSeo.js's own comment) — included here by URL only,
// not sourced from any data file.

import { writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { learnHub, learnPages } from "../src/data/learnPagesSeo.js";
import { blogHub, blogPosts } from "../src/data/blogPostsSeo.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST = join(__dirname, "..", "dist");
const SITE_URL = "https://onyx-reelz.com";

const urls = [
  "/",
  "/pricing",
  "/support",
  "/terms",
  "/privacy",
  learnHub.path,
  ...learnPages.map((p) => p.path),
  blogHub.path,
  ...blogPosts.map((p) => p.path),
];

const body = urls.map((path) => `  <url>\n    <loc>${SITE_URL}${path}</loc>\n  </url>`).join("\n");
const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;

writeFileSync(join(DIST, "sitemap.xml"), xml);
console.log(`sitemap.xml regenerated with ${urls.length} URLs -> dist/sitemap.xml`);
