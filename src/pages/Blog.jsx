import { useState } from "react";
import { Link } from "react-router-dom";
import BlogPageLayout from "../components/BlogPageLayout";
import { blogHub, blogPosts } from "../data/blogPostsSeo";

// Search is client-side over title+description only (no backend needed for
// a handful of posts) — the point per the original ask is "one click to
// find what they want," not a full search backend for a blog that's just
// getting started.
export default function Blog() {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const filtered = q
    ? blogPosts.filter((p) => (p.title + " " + p.description).toLowerCase().includes(q))
    : blogPosts;

  return (
    <BlogPageLayout seo={blogHub}>
      <p style={{ color: "var(--onyx-text-dim)", fontSize: 15, marginBottom: 24 }}>
        Practical answers to real questions about AI video generation.
      </p>

      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search the blog…"
        style={{
          width: "100%", padding: "12px 16px", borderRadius: 10, marginBottom: 28,
          border: "1px solid var(--onyx-hairline-strong)", background: "var(--onyx-surface)",
          color: "var(--onyx-text)", fontSize: 15,
        }}
      />

      {filtered.length === 0 ? (
        <p style={{ color: "var(--onyx-text-faint)", fontSize: 14 }}>
          No posts match "{query}" yet — try{" "}
          <Link to="/learn" style={{ color: "var(--onyx-cyan)" }}>the full Learn library</Link>{" "}
          instead, or check back soon.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {filtered.map((post) => (
            <Link
              key={post.path}
              to={post.path}
              style={{
                display: "block", padding: "18px 20px", borderRadius: 10,
                border: "1px solid var(--onyx-hairline-strong)", background: "var(--onyx-surface)",
                textDecoration: "none", color: "inherit",
              }}
            >
              <div style={{ fontSize: 17, fontWeight: 600, color: "var(--onyx-text)", marginBottom: 6 }}>{post.title}</div>
              <div style={{ fontSize: 14, color: "var(--onyx-text-faint)" }}>{post.description}</div>
            </Link>
          ))}
        </div>
      )}
    </BlogPageLayout>
  );
}
