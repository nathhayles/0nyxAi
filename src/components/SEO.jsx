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

function setJsonLd(data) {
  let el = document.querySelector('script[data-seo-jsonld="true"]');
  if (!data) {
    if (el) el.remove();
    return;
  }
  if (!el) {
    el = document.createElement("script");
    el.setAttribute("type", "application/ld+json");
    el.setAttribute("data-seo-jsonld", "true");
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(data);
}

export default function SEO({ title, description, path = "/", ogImage = DEFAULT_OG_IMAGE, ogType = "website", schemaType }) {
  useEffect(() => {
    const fullTitle = title ? `${title} | Onyx Reelz` : "Onyx Reelz";
    const url = `${SITE_URL}${path}`;
    document.title = fullTitle;

    setMetaTag("name", "description", description);
    setMetaTag("property", "og:title", fullTitle);
    setMetaTag("property", "og:description", description);
    setMetaTag("property", "og:image", ogImage);
    setMetaTag("property", "og:url", url);
    setMetaTag("property", "og:type", ogType);
    setMetaTag("name", "twitter:card", "summary_large_image");
    setMetaTag("name", "twitter:title", fullTitle);
    setMetaTag("name", "twitter:description", description);
    setMetaTag("name", "twitter:image", ogImage);
    setCanonicalTag(url);

    const publisher = { "@type": "Organization", name: "Onyx Reelz", logo: { "@type": "ImageObject", url: DEFAULT_OG_IMAGE } };
    const jsonLd = schemaType === "Article" ? {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: title,
      description,
      url,
      image: ogImage,
      mainEntityOfPage: { "@type": "WebPage", "@id": url },
      publisher,
    } : schemaType === "CollectionPage" ? {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: title,
      description,
      url,
      publisher,
    } : null;
    setJsonLd(jsonLd);
  }, [title, description, path, ogImage, ogType, schemaType]);

  return null;
}
