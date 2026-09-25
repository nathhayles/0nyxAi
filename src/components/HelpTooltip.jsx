import React, { useState, useEffect, useCallback } from "react";

// Each entry: { title, sections: [{ heading, body? , items? }], video? }
// video is optional: { src, poster?, caption? } -- rendered above the
// sections when present. Keep facts in sync with the backend's
// routes/support.js SYSTEM_PROMPT (maintained by hand, not shared).
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
      },
      {
        heading: "Cost",
        body: "Each AI scene costs 18–150 credits depending on the model. Regenerating a scene in the editor with narration attached also lip-syncs it, which adds a surcharge."
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
  sequencer: {
    title: "Sequencer — How It Works",
    sections: [
      { heading: "Tracks", body: "VIDEO — your main scene clips. B-ROLL — overlays and cutaways. FX — visual effects. VOICE — AI voiceover per scene. MUSIC — background music. SFX — sound effects." },
      { heading: "Clip editing", items: ["Drag clips left/right to reposition", "Drag the edges to trim", "Click a clip to select it, then use the toolbar to split, delete or mute", "Ctrl+scroll to zoom in/out on the timeline"] },
      { heading: "Height modes", body: "Use the ▁▄█ buttons in the toolbar to collapse, resize or expand the sequencer to fit your workflow." },
      { heading: "Keyboard shortcuts", items: ["Space — play/pause", "[ — toggle sidebar", "] — toggle inspector", "Cmd+S — save now", "Delete — remove selected clip"] },
    ],
  },
  colorGrade: {
    title: "Colour Grade",
    sections: [
      { heading: "What it does", body: "Brightness, Contrast and Saturation for the active scene. Changes show in the preview straight away and are applied when you export." },
      { heading: "Tips", items: ["50 on each slider leaves the scene unchanged", "Each scene has its own grade — select another scene to grade it separately", "Apply to all scenes copies this scene's grade to every scene in the reel"] },
    ],
  },
  export: {
    title: "Exporting Your Reel",
    sections: [
      { heading: "What Export does", body: "Renders all your scenes, voiceover, music and captions into a single MP4 file and downloads it to your device." },
      { heading: "Requirements", items: ["A clean, watermark-free download costs 1 credit per minute of video — check your balance on the Account page and top up on Pricing", "Your reel must have at least one scene with a video clip", "Rendering usually takes 1–3 minutes depending on reel length and captions"] },
      { heading: "After export", body: "Share creates a watermarked preview link and never costs credits. Publish posts to your connected Instagram, YouTube, LinkedIn and TikTok accounts." },
    ],
  },
  voiceover: {
    title: "AI Voiceover Guide",
    sections: [
      { heading: "Standard voices (free)", body: "A mix of OpenAI and Google voices across many languages. No credits required." },
      { heading: "Premium voices (credits)", body: "ElevenLabs and Google Chirp3-HD voices, with a wide range of accents, emotions and styles. Costs 3 credits per scene." },
      { heading: "How to apply", items: ["Select a voice with the ▶ preview button", "Click Apply to generate voiceover for the active scene", "The clip appears on the VOICE track in the sequencer", "Re-apply after editing the narration text to regenerate", "Use ★ Favourites to show only the voices you've starred"] },
    ],
  },
  broll: {
    title: "B-Roll & Media",
    sections: [
      { heading: "What is B-Roll?", body: "B-Roll overlays your main scene for as long as the clip lasts, then the scene continues underneath. Works with stock video, uploads, PNGs and APNGs." },
      { heading: "Adding B-Roll", items: ["Go to Media tab → Uploads or Stock", "Drag a clip or image onto the B-ROLL track in the sequencer", "Drag the clip's edges in the sequencer to set how long it overlays"] },
      { heading: "Position & animation", items: ["Click the clip in the timeline, or on the canvas while it's showing, to open this panel", "Drag on the canvas or use the Position X/Y and Size sliders — leave them untouched to stay full-frame", "Enter and Exit animations (Slide or Fade) are set independently"] },
      { heading: "Stock footage", body: "Pexels stock clips are always free. AI-generated scenes cost 18–150 credits each depending on the model." },
    ],
  },
  music: {
    title: "Music Studio Guide",
    sections: [
      { heading: "Stock music", body: "Free Pixabay tracks. Search by mood or genre, preview, then click Apply to add to your reel's MUSIC track." },
      { heading: "AI-generated music", body: "Powered by Google Lyria. Generate a track matched to your reel's mood. Costs 10 credits and returns 2 track options." },
      { heading: "Score My Reel", body: "Auto-generates music perfectly matched to your reel's content and length. 10 credits. Find it in the Music Studio page." },
      { heading: "Volume", body: "Use the Music Volume slider in the Audio panel to balance music against voiceover. 20–40% is usually right when voiceover is present." },
    ],
  },
  create: {
    title: "Creating a Reel",
    sections: [
      { heading: "How it works", body: "Type what your business does → AI writes a script → generates scenes with voiceover, visuals and music → ready to publish. Under 10 minutes." },
      { heading: "Creation flows", items: ["Create — AI script from scratch", "Video to Reel — upload your own clips", "URL to Video — paste a webpage URL", "Audio to Video — upload a podcast or audio file"] },
      { heading: "Tips", items: ["Be specific in your brief — mention your niche, tone and audience", "Use 3–5 scenes for social media, 8–12 for longer content", "Choose 9:16 for TikTok/Reels/Shorts, 16:9 for YouTube"] },
    ],
  },
  dashboard: {
    title: "Your Projects Dashboard",
    sections: [
      { heading: "Reels", body: "All your saved reels appear here. Click any reel to open it in the editor. Use folders to organise campaigns." },
      { heading: "Status badges", items: ["Draft — saved but not published", "Rendered — ready to download or share", "Published — live on at least one platform"] },
      { heading: "Quick actions", body: "The ··· menu on each reel card lets you rename, duplicate, move to folder or delete." },
    ],
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
  },
  videoToReel: {
    title: "Video to Reel",
    sections: [
      { heading: "How it works", body: "Upload your own footage and AI edits it into a polished short-form reel with captions and music." },
      { heading: "Uploads", items: ["MP4, MOV or WEBM", "Up to 200 MB per file"] },
      { heading: "After it's done", body: "The reel opens in the editor, so you can trim clips, change captions or swap the music before exporting." },
    ],
  },
  campaign: {
    title: "Campaign Generator",
    sections: [
      { heading: "How it works", body: "Write one brief and generate 5–10 reels for a social media campaign in one go." },
      { heading: "Tips", items: ["Fill in product, audience and tone so each reel stays on-message", "Pick the target platform so formats and pacing fit", "The estimated credit cost is shown before you generate"] },
    ],
  },
  urlToVideo: {
    title: "URL to Video",
    sections: [
      { heading: "How it works", body: "Paste any webpage URL. AI reads the page and turns its content into a ready-to-edit reel." },
      { heading: "Tips", items: ["Works best on pages with clear written content — product pages, blog posts, announcements", "Everything lands in the editor, so you can adjust any scene afterwards"] },
    ],
  },
  audioToVideo: {
    title: "Audio to Video",
    sections: [
      { heading: "How it works", body: "Upload an audio file or podcast clip and get a video reel with visuals matched to what's being said." },
      { heading: "Tips", items: ["Clear speech with little background noise gives the best matches", "Short clips (under a few minutes) work best for social reels"] },
    ],
  },
  pptToVideo: {
    title: "PPT to Video",
    sections: [
      { heading: "How it works", body: "Upload a presentation and each slide becomes an animated scene in a video reel." },
      { heading: "Uploads", items: [".pptx or .ppt files"] },
    ],
  },
  screenRecorder: {
    title: "Screen Recording",
    sections: [
      { heading: "How it works", body: "Record your screen and turn it into a video reel with AI voiceover and captions." },
      { heading: "Steps", items: ["Choose your recording options", "Click Start — you'll get a 3-second countdown", "Pick which screen, window or tab to share", "Stop when you're done and the recording opens as a reel"] },
    ],
  },
  webcamRecorder: {
    title: "Webcam Recording",
    sections: [
      { heading: "How it works", body: "Record yourself to camera and get a polished reel with AI captions and music." },
      { heading: "Tips", items: ["Allow camera and microphone access when your browser asks", "Face a window or light source, not away from it", "Keep takes short — you can combine scenes in the editor"] },
    ],
  },
  viralHooks: {
    title: "Viral Hooks Generator",
    sections: [
      { heading: "How it works", body: "Generates 10 scroll-stopping opening lines using proven viral frameworks. Turn any hook into a reel in one click." },
      { heading: "Cost", body: "2 credits per generation — the current cost is always shown on the Generate button." },
      { heading: "Tip", body: "Dictate your topic instead of typing it using the microphone button (Chrome or Edge only)." },
    ],
  },
  characters: {
    title: "Character Library",
    sections: [
      { heading: "What it's for", body: "Save a reusable character — name, optional details (build, age, hair, eyes, wardrobe and more) and 2–4 reference images — so they look the same across every generation." },
      { heading: "Using a character", body: "Type @CharacterName in a scene's Action or Background field. Autocomplete shows your saved characters." },
      { heading: "Reference mode", items: ["Character Consistency — anchors to the reference photo; best for a recognisable recurring character", "Scene Accuracy — follows the prompt text, prioritising action, setting and camera over an exact face match", "Each character has a default mode, overridable per scene"] },
      { heading: "Good to know", items: ["A brief fade (under 1 second) at the start of a Character Consistency clip is expected, not a bug", "Characters flagged as a real person get an automatic AI-disclosure clip at the start of the export (EU AI Act)"] },
    ],
  },
  autoRouting: {
    title: "Auto Model Routing",
    sections: [
      { heading: "How it works", body: "Pick ✨ Auto and Onyx chooses the best AI video model for each scene — for example, scenes with a tagged character route differently from scenes without one." },
      { heading: "No surprises", body: "Before anything is charged, a preview shows the model and cost picked for each scene, and you can override any of them." },
      { heading: "Limits", items: ["Only on the Create page's multi-scene flow — not the editor's single-scene Regenerate", "Can't be combined with a motion reference image — pick a model manually for that"] },
    ],
  },
  captions: {
    title: "Captions",
    sections: [
      { heading: "Two toggles", body: "A scene's captions only appear on export if BOTH are on: this CC button (whole reel) and the \"Show captions on canvas\" checkbox in the scene panel. The scene also needs narration text." },
      { heading: "Karaoke", items: ["Generate voiceover for the scene first", "Turn captions on, then pick Karaoke once word timings are available", "Words highlight as they're spoken, and the highlight is burned into the export"] },
      { heading: "Styles & colours", body: "Choose from 14 styles in the Captions tab, and set text, background and highlight colours in the Custom tab. Apply to one scene or all." },
    ],
  },
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
        title={`Help: ${content.title}`}
        style={{
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          width: 16, height: 16, borderRadius: "50%", fontSize: 10, fontWeight: 700,
          background: "rgba(77,208,255,0.15)", border: "1px solid rgba(77,208,255,0.4)",
          color: "var(--onyx-cyan)", cursor: "pointer", flexShrink: 0, lineHeight: 1,
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
            {content.video && (
              <div style={{ marginBottom: 14 }}>
                <video
                  src={content.video.src}
                  poster={content.video.poster}
                  controls
                  preload="none"
                  playsInline
                  style={{ width: "100%", display: "block", borderRadius: 8, background: "#000", border: "1px solid #1f2937" }}
                />
                {content.video.caption && (
                  <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 6 }}>{content.video.caption}</div>
                )}
              </div>
            )}
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
