import { useEffect } from "react";

const SITE_URL = "https://onyx-reelz.com";
const DEFAULT_OG_IMAGE = `${SITE_URL}/onyx-logo.png`;

function setMetaTag(attr, key, content) {
  if (!content) return;
  let el = document.querySelector(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function setCanonicalTag(href) {
  let el = document.querySelector('link[rel="canonical"]');
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", "canonical");
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

export default function SEO({ title, description, path = "/", ogImage = DEFAULT_OG_IMAGE }) {
  useEffect(() => {
    const fullTitle = title ? `${title} | Onyx Reelz` : "Onyx Reelz";
    document.title = fullTitle;

    setMetaTag("name", "description", description);
    setMetaTag("property", "og:title", fullTitle);
    setMetaTag("property", "og:description", description);
    setMetaTag("property", "og:image", ogImage);
    setMetaTag("property", "og:url", `${SITE_URL}${path}`);
    setMetaTag("property", "og:type", "website");
    setCanonicalTag(`${SITE_URL}${path}`);
  }, [title, description, path, ogImage]);

  return null;
}
