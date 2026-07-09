import { useEffect, useState } from "react"
import { supabase } from "../supabaseClient"

const HELP_TOPICS = [
  {
    title: "Stem Tracks",
    content: [
      "Go to Music Studio → Tools → Separate Stems to split a track into Vocals, Drums, Bass, and Instrumental stems.",
      "After separation, click \"Assign All Stems to Reel\" to open the reel picker modal.",
      "Pick a reel — the stems appear as 4 new coloured tracks in the sequencer.",
      "Each stem track has its own volume slider and mute (M) button.",
      "Stems survive page refresh and auto-save.",
      "Cost: ~8 credits per separation.",
    ],
  },
  {
    title: "Stem Track Controls",
    content: [
      "In the sequencer, stem tracks appear below the MUSIC track.",
      "Each stem has: M (mute toggle), volume slider, and a coloured waveform.",
      "Vocals = pink, Drums = orange, Bass = purple, Instrumental = green.",
      "Volume and mute are independent per stem.",
    ],
  },
  {
    title: "Karaoke Captions",
    content: [
      "Generate a voiceover on any scene first.",
      "Switch the toolbar to Captions mode.",
      "Hit play — each word highlights in yellow as it is spoken.",
      "Word timing comes from Whisper AI transcription, which runs automatically after VO generation.",
      "If no word timings exist yet, the full narration text shows as a graceful fallback.",
      "Highlight colour is customisable via brand.caption_highlight_color.",
    ],
  },
  {
    title: "Transitions",
    content: [
      "Open the Transitions panel in the sidebar and drag any transition type onto a timeline clip.",
      "Right-click a clip to set or change the transition type and duration for that clip.",
      "Available types: Cut (instant), Fade, Slide, Zoom.",
      "Transitions are baked in at export via ffmpeg — they appear in the final video.",
      "Each clip can have a different transition type and duration independently.",
    ],
  },
  {
    title: "B-roll Track",
    content: [
      "The B-roll track sits below the A-roll (main clips) in the timeline.",
      "Add clips to the B-roll track to overlay them on top of the A-roll during playback and export.",
      "Supports transparent PNG images and video clips with alpha channels.",
      "B-roll clips are composited over the A-roll — useful for logos, lower-thirds, and cutaway footage.",
    ],
  },
  {
    title: "Uploads",
    content: [
      "Upload images or video clips from the Uploads tab in the Media panel.",
      "Double-click any uploaded file to assign it directly to the currently active scene.",
      "Uploads are per-user — you only see your own files.",
      "Files are stored in isolated per-user folders on R2 (Cloudflare CDN).",
    ],
  },
  {
    title: "Brand Kit",
    content: [
      "The Brand Kit page has 4 tabs: Brand Kit, Themes, Captions, and Custom.",
      "Brand Kit: set logo, colours, fonts, and tone of voice for AI generation.",
      "Themes: choose a visual preset that styles your reels.",
      "Captions: configure caption style, font, size, and highlight colour.",
      "Custom: advanced overrides for brand-specific settings.",
      "Each brand has its own independent social media connections — switching brands switches social accounts.",
    ],
  },
  {
    title: "Screen Recording",
    content: [
      "Go to /screen-recorder to record your screen directly in the browser.",
      "After recording, the reel is created automatically with scenes populated from the recording.",
      "No manual scene splitting needed — Onyx handles the assembly.",
      "Reel opens in the editor when processing is complete.",
    ],
  },
  {
    title: "R2 Storage & CDN",
    content: [
      "All user uploads (images, videos, audio) are stored on Cloudflare R2.",
      "Files are served via Cloudflare's global CDN for fast delivery worldwide.",
      "Upload URLs are isolated per user — other users cannot access your files.",
      "Generated reel exports are also stored on R2 and linked from your Projects page.",
    ],
  },
  {
    title: "Per-Brand Social Connections",
    content: [
      "Each brand in your Brand Kit has its own independent social media connections.",
      "Connect YouTube, TikTok, Instagram, LinkedIn separately per brand.",
      "Switching your active brand automatically switches which social accounts are used for publishing.",
      "Manage connections from the Brand Kit → Social tab for each brand.",
    ],
  },
  {
    title: "Admin Panel",
    content: [
      "Accessible at /admin — superadmin and admin roles only.",
      "Click any user row to expand full account details.",
      "Shows: last sign in, email verified, YouTube connected, recent reels, and credit history.",
      "Grant credits using the ± input on each user row.",
      "Credit history shows all transactions: admin_grant, tts_generate, fadr_stems, stripe_purchase.",
    ],
  },
  {
    title: "Free Trial",
    content: [
      "Every new account gets a 14-day free trial with full access.",
      "No credit card required to start.",
      "Trial status is shown on the Account page.",
      "After the trial, choose a plan at /pricing.",
    ],
  },
  {
    title: "Email Branding",
    content: [
      "All Supabase auth emails (confirmation, reset, magic link, invite) are branded with the Onyx dark theme.",
      "Emails are sent from noreply@mail.app.supabase.io until the custom domain (onyx-reelz.com) is verified via Resend.",
    ],
  },
  {
    title: "Mobile",
    content: [
      "The full editor requires a desktop browser (1024px+ width).",
      "Mobile users can: sign up, set brand presets, generate reels, and view previews.",
      "The brand setup wizard runs automatically for new mobile users.",
      "Generated reels open in preview mode on mobile.",
    ],
  },
  {
    title: "Loop Region (Sequencer → ruler drag)",
    content: [
      "Drag left-to-right on the ruler to set a loop region — a cyan highlighted band appears.",
      "Click the ⟳ button in the sequencer toolbar to enable looping.",
      "The time range badge (e.g. 0:02.8–0:06.2) shows your current loop region.",
      "While loop is active, playback repeats between the in and out points.",
      "Grab the left or right edge of the cyan band to adjust in/out points independently.",
      "Click outside the region to start a new region; click inside to scrub without resetting.",
      "Click ⟳ again to disable — playback resumes normal end-of-timeline behaviour.",
    ],
  },
  {
    title: "Track Mute and Volume (Sequencer)",
    content: [
      "M button on each track toggles mute — silences that track during playback.",
      "Volume slider (next to M) controls per-track level independently.",
      "Stem tracks (Vocals, Drums, Bass, Instrumental) each have their own M and slider.",
      "Global voiceover and music volume sliders are separate from per-track controls.",
    ],
  },
  {
    title: "Text Overlays (T icon in sidebar)",
    content: [
      "Click + Add Text to create a text overlay on the active scene.",
      "Set font, size, colour, background, opacity, alignment and position.",
      "Position grid (top/middle/bottom × left/center/right) places the overlay on the canvas.",
      "Text appears live on the preview canvas.",
      "Each scene can have multiple independent text overlays.",
    ],
  },
  {
    title: "AI Studio Tab (Media panel → AI Studio)",
    content: [
      "Shows all AI-generated video clips saved to your library.",
      "Click Use on Scene to apply a clip to the currently selected scene.",
      "Items persist across sessions and reels.",
    ],
  },
  {
    title: "Video to Reel (/video-to-reel)",
    content: [
      "Upload up to 8 clips (MP4, MOV, WEBM — max 200MB each).",
      "Onyx assembles them into a sequenced reel automatically.",
      "Processing takes 30–90 seconds depending on clip length.",
      "Reel opens in the editor when complete.",
    ],
  },
  {
    title: "Themes (Navbar toggle)",
    content: [
      "Click the sun/moon icon in the top navbar to switch between Onyx (dark) and Opal (light).",
      "Your preference is saved and restored on your next visit.",
      "The sequencer and timeline always stay dark regardless of theme — Pro-app pattern.",
    ],
  },
]

function HelpTopic({ topic }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ marginTop: 8, background: "#0c1016", borderRadius: 10, overflow: "hidden" }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: "100%",
          textAlign: "left",
          padding: "12px 16px",
          background: "none",
          border: "none",
          color: "#e2e8f0",
          fontWeight: 600,
          fontSize: 14,
          cursor: "pointer",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        {topic.title}
        <span style={{ opacity: 0.5, fontSize: 12 }}>{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <ul style={{ margin: 0, padding: "0 16px 14px 32px", color: "#94a3b8", fontSize: 13, lineHeight: 1.7 }}>
          {topic.content.map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default function SupportPanel() {
  const [tickets, setTickets] = useState([])
  const [tab, setTab] = useState("help")

  useEffect(() => {
    async function load() {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData?.user) return
      const { data } = await supabase
        .from("support_tickets")
        .select("*")
        .eq("user_id", userData.user.id)
        .order("created_at", { ascending: false })
      if (data) setTickets(data)
    }
    load()
  }, [])

  const tabStyle = (active) => ({
    padding: "8px 18px",
    borderRadius: 8,
    border: "none",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: 13,
    background: active ? "#1e293b" : "transparent",
    color: active ? "#e2e8f0" : "#64748b",
  })

  return (
    <div style={{ marginTop: 24 }}>
      <div style={{ display: "flex", gap: 4, marginBottom: 20 }}>
        <button style={tabStyle(tab === "help")} onClick={() => setTab("help")}>Help &amp; Features</button>
        <button style={tabStyle(tab === "tickets")} onClick={() => setTab("tickets")}>My Tickets</button>
      </div>

      {tab === "help" && (
        <div>
          <p style={{ color: "#64748b", fontSize: 13, marginBottom: 16, marginTop: 0 }}>
            Browse the topics below to learn how features work.
          </p>
          {HELP_TOPICS.map((topic) => (
            <HelpTopic key={topic.title} topic={topic} />
          ))}
        </div>
      )}

      {tab === "tickets" && (
        <div>
          <h2 style={{ marginTop: 0 }}>Support Tickets</h2>
          {tickets.length === 0 && <p style={{ color: "#64748b" }}>No tickets yet.</p>}
          {tickets.map(t => (
            <div key={t.id} style={{ padding: 15, marginTop: 10, background: "#0c1016", borderRadius: 10 }}>
              <strong>{t.subject}</strong>
              <div style={{ color: "#64748b", fontSize: 13, marginTop: 4 }}>Status: {t.status}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
