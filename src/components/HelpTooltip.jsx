import React, { useState, useEffect, useCallback } from "react";

const CONTENT = {
  kling: {
    title: "Kling AI — Prompting Guide",
    sections: [
      {
        heading: "Quick Reference",
        body: "[Location + Time of Day + Lighting] [Subject Description] [Action — step by step] [Camera Movement] [Style Keywords]\n\nExample: \"Sunlit modern office, midday. A woman in a navy blazer sits at a glass desk. She opens a laptop and smiles at the screen. Slow push in from medium to close-up. Clean corporate, bright and airy, 4K cinematic.\""
      },
      {
        heading: "Top Tips",
        items: [
          "Always include a camera directive — slow push in, wide shot, low angle, overhead drone, static locked",
          "Break action into steps: \"she turns, smiles, raises the cup\" — not one vague summary",
          "Walking: add \"heel strikes first, natural arm swing, visible weight transfer\" to prevent the moonwalk effect",
          "Hands: be very specific — vague hand instructions cause distorted fingers",
          "Steam / liquids: describe explicitly or Kling won't generate them",
          "Want a locked shot? Say \"completely static camera, locked off tripod, no movement\""
        ]
      },
      {
        heading: "Style Keywords",
        body: "cinematic, shallow depth of field, 4K • shot on 35mm, warm grain • clean corporate, bright and airy • golden hour, lifestyle • moody, desaturated, film noir • vibrant, high contrast, energetic"
      }
    ]
  },
  heygen: {
    title: "HeyGen Avatar — Script Guide",
    sections: [
      {
        heading: "Quick Reference",
        body: "Hook (5s) → Problem (10s) → Solution (20s) → CTA (10s)\n\nAim for 130–150 words per minute. A 60-second reel needs roughly 130 words."
      },
      {
        heading: "Top Tips",
        items: [
          "Write short, punchy sentences — avatars breathe naturally at full stops; long run-ons sound robotic",
          "Add tone keywords: \"speak with confidence and warmth\" or \"conversational, friendly tone\"",
          "Use [pause] or a period to create natural breathing room between key points",
          "Avoid: tongue twisters, complex jargon, multiple numbers in a row — avatars stumble on these",
          "Mispronouncing a word? Use phonetic spelling in the script"
        ]
      },
      {
        heading: "Best Niches",
        body: "Product explainers, how-to guides, testimonial-style content, training videos"
      }
    ]
  },
  lyria: {
    title: "Google Lyria — Music Prompting Guide",
    sections: [
      {
        heading: "Key Elements to Include",
        items: [
          "Genre & Style — electronic dance, classical, jazz, ambient, lo-fi",
          "Mood & Emotion — energetic, melancholy, peaceful, tense",
          "Instrumentation — piano, synthesizer, acoustic guitar, string orchestra, electronic drums",
          "Tempo & Rhythm — fast tempo, slow ballad, 120 BPM, driving beat, gentle waltz",
          "Arrangement (optional) — \"starts with solo piano, strings enter, crescendo into chorus\""
        ]
      },
      {
        heading: "Copy-Paste Templates",
        items: [
          "Corporate: \"Uplifting corporate, moderate tempo, clean piano and light strings, professional and motivating\"",
          "Social media: \"Upbeat pop, fast tempo, bright synths, driving beat, positive and energetic, Instagram Reels\"",
          "Real estate: \"Warm acoustic, gentle guitar, slow tempo, optimistic mood, lifestyle brand feel\"",
          "Fitness: \"High energy electronic, 128 BPM, driving bass, intense and motivating, gym workout\"",
          "Luxury: \"Elegant minimal piano, slow tempo, sophisticated and calm, luxury brand aesthetic\""
        ]
      },
      {
        heading: "Note",
        body: "Lyria follows genre, mood, energy, and theme instructions very well. Avoid referencing specific artists or songs — it will block generation."
      }
    ]
  }
};

const overlayStyle = {
  position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
  display: "flex", alignItems: "center", justifyContent: "center",
  zIndex: 9999, padding: 16
};

const modalStyle = {
  background: "#0f141b", border: "1px solid #2b3442", borderRadius: 12,
  maxWidth: 520, width: "100%", maxHeight: "85vh", overflowY: "auto",
  padding: "20px 24px", color: "#e2e8f0", position: "relative"
};

export default function HelpTooltip({ topic }) {
  const [open, setOpen] = useState(false);
  const content = CONTENT[topic];

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, close]);

  if (!content) return null;

  return (
    <>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(true); }}
        title="Prompting guide"
        style={{
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          width: 16, height: 16, borderRadius: "50%", fontSize: 10, fontWeight: 700,
          background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.4)",
          color: "#a78bfa", cursor: "pointer", flexShrink: 0, lineHeight: 1,
          padding: 0, verticalAlign: "middle"
        }}
      >
        ?
      </button>

      {open && (
        <div style={overlayStyle} onClick={close}>
          <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
            <button
              onClick={close}
              style={{ position: "absolute", top: 12, right: 14, background: "none", border: "none", color: "#64748b", fontSize: 18, cursor: "pointer", lineHeight: 1 }}
            >
              ×
            </button>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#c4b5fd", marginBottom: 16, paddingRight: 24 }}>
              {content.title}
            </div>
            {content.sections.map((s, i) => (
              <div key={i} style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 6 }}>
                  {s.heading}
                </div>
                {s.body && (
                  <div style={{ fontSize: 12, color: "#cbd5e1", lineHeight: 1.6, whiteSpace: "pre-wrap", background: "#06070a", borderRadius: 6, padding: "8px 10px", border: "1px solid #1f2937" }}>
                    {s.body}
                  </div>
                )}
                {s.items && (
                  <ul style={{ margin: 0, paddingLeft: 16 }}>
                    {s.items.map((item, j) => (
                      <li key={j} style={{ fontSize: 12, color: "#cbd5e1", lineHeight: 1.6, marginBottom: 4 }}>
                        {item}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
