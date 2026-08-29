import React, { useState } from "react";
import SEO from "../components/SEO";
import { staticPages } from "../data/staticPagesSeo";
import { SECTIONS } from "../data/supportSections.js";


function AccordionItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderBottom: "0.5px solid var(--onyx-hairline)", overflow: "hidden" }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ width: "100%", textAlign: "left", padding: "14px 0", background: "none", border: "none", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, color: "var(--onyx-text)" }}
      >
        <span style={{ fontSize: 14, fontWeight: 600 }}>{q}</span>
        <span style={{ fontSize: 18, color: "var(--onyx-cyan)", flexShrink: 0, transform: open ? "rotate(45deg)" : "none", transition: "transform 0.2s" }}>+</span>
      </button>
      {open && (
        <div style={{ paddingBottom: 14, fontSize: 13, lineHeight: 1.7, color: "var(--onyx-text-dim)" }}>
          {a}
        </div>
      )}
    </div>
  );
}

export default function Support() {
  const [activeSection, setActiveSection] = useState(0);
  const [search, setSearch] = useState("");

  const filtered = search.trim()
    ? SECTIONS.map(s => ({
        ...s,
        items: s.items.filter(i =>
          i.q.toLowerCase().includes(search.toLowerCase()) ||
          i.a.toLowerCase().includes(search.toLowerCase())
        )
      })).filter(s => s.items.length > 0)
    : null;

  return (
    <div style={{ minHeight: "100vh", background: "var(--onyx-bg)", color: "var(--onyx-text)" }}>
      <SEO {...staticPages.find(p => p.path === "/support")} />
      {/* Header */}
      <div style={{ background: "var(--onyx-bg)", padding: "48px 24px 40px", textAlign: "center", borderBottom: "0.5px solid var(--onyx-hairline)" }}>
        <h1 className="page-title" style={{ marginBottom: 8 }}>Help Centre</h1>
        <p style={{ color: "var(--onyx-text-dim)", fontSize: 16, marginBottom: 24 }}>Find answers to common questions about Onyx Reelz</p>
        <div style={{ maxWidth: 480, margin: "0 auto" }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search help articles..."
            style={{ width: "100%", boxSizing: "border-box", padding: "12px 16px", borderRadius: 10, border: "0.5px solid var(--onyx-hairline-strong)", fontSize: 14, background: "var(--onyx-surface)", color: "var(--onyx-text)", outline: "none" }}
          />
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "40px 24px", display: "flex", gap: 40, alignItems: "flex-start" }}>
        {/* Sidebar nav — hidden when searching */}
        {!search && (
          <div style={{ width: 200, flexShrink: 0, position: "sticky", top: 24 }}>
            {SECTIONS.map((s, i) => (
              <button key={i} onClick={() => setActiveSection(i)}
                style={{ display: "block", width: "100%", textAlign: "left", padding: "8px 12px", borderRadius: 7, border: "none", cursor: "pointer", marginBottom: 2, fontSize: 13, fontWeight: activeSection === i ? 700 : 400, background: activeSection === i ? "var(--chip-bg-strong)" : "transparent", color: activeSection === i ? "var(--onyx-cyan)" : "var(--onyx-text-dim)" }}>
                {s.title}
              </button>
            ))}
            <div style={{ marginTop: 32, padding: "16px 12px", borderRadius: 10, background: "var(--onyx-surface)", border: "0.5px solid var(--onyx-hairline)" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--onyx-text-faint)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "1px" }}>Still stuck?</div>
              <a href="mailto:support@onyx-reelz.com" style={{ fontSize: 13, color: "var(--onyx-cyan)", textDecoration: "none" }}>support@onyx-reelz.com</a>
            </div>
          </div>
        )}

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {filtered ? (
            filtered.length === 0 ? (
              <div style={{ textAlign: "center", color: "var(--onyx-text-faint)", padding: "40px 0" }}>No results for "{search}"</div>
            ) : (
              filtered.map((s, i) => (
                <div key={i} style={{ marginBottom: 32 }}>
                  <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--onyx-cyan)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "1px" }}>{s.title}</h2>
                  {s.items.map((item, j) => <AccordionItem key={j} {...item} />)}
                </div>
              ))
            )
          ) : (
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20, color: "var(--onyx-text)" }}>{SECTIONS[activeSection].title}</h2>
              {SECTIONS[activeSection].items.map((item, j) => <AccordionItem key={j} {...item} />)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
