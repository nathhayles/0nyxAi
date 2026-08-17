import { useNavigate } from "react-router-dom";
import SEO from "../components/SEO";
import { staticPages } from "../data/staticPagesSeo";
import PromptResultShowcase from "../components/PromptResultShowcase";
import "../style.css";

const R2_POSTER_BASE = "https://pub-31e667ae894f4cddbf03ae6a7578eff1.r2.dev/content-pipeline/landing-showcase";

const showcaseClips = [
  {
    label: "1. Describe your idea",
    videoUrl: "https://pub-31e667ae894f4cddbf03ae6a7578eff1.r2.dev/kling_b95ee040-92a9-4298-bf50-f42538e7fb09.mp4",
    posterUrl: `${R2_POSTER_BASE}/clip1-poster.jpg`,
    prompt: "Close-up of the laptop screen showing Onyx's interface, with ideas being typed and instantly transformed into visual elements.",
  },
  {
    label: "2. Generate the storyboard",
    videoUrl: "https://pub-31e667ae894f4cddbf03ae6a7578eff1.r2.dev/kling_5c6a89a7-f60c-4272-98f1-2c57643b4e4a_1.mp4",
    posterUrl: `${R2_POSTER_BASE}/clip2-poster.jpg`,
    prompt: "Split screen showing a script being written on one side and the corresponding video visuals forming on the other.",
  },
  {
    label: "3. Add voice and music",
    videoUrl: "https://pub-31e667ae894f4cddbf03ae6a7578eff1.r2.dev/kling_5c6a89a7-f60c-4272-98f1-2c57643b4e4a_2.mp4",
    posterUrl: `${R2_POSTER_BASE}/clip3-poster.jpg`,
    prompt: "A visual of a soundwave forming as a voiceover is generated, followed by a logo animation appearing on screen.",
  },
  {
    label: "4. Export and post",
    videoUrl: "https://pub-31e667ae894f4cddbf03ae6a7578eff1.r2.dev/kling_5c6a89a7-f60c-4272-98f1-2c57643b4e4a_3.mp4",
    posterUrl: `${R2_POSTER_BASE}/clip4-poster.jpg`,
    prompt: "A smartphone screen showing the final video being uploaded to a social media platform with a single tap.",
  },
];

const features = [
  "AI-generated video scenes",
  "Talking AI avatar presenters",
  "Product and service showcases",
  "Before-and-after content",
  "Educational and explainer reels",
  "Promotional and offer announcements",
  "Brand awareness content",
  "Multi-platform campaign reels",
];

const problems = [
  "Hours lost fighting clunky editing software",
  "Stock footage that looks generic and lifeless",
  "Hiring a videographer for every single post",
  "AI tools that only do one thing, so you juggle five apps",
  "Voiceovers and avatars that cost a fortune elsewhere",
  "No way to keep your brand consistent across reels",
  "Posting inconsistently because content takes too long",
  "Watching competitors stay visible while you fall behind",
];

const industries = [
  "Small businesses", "Real estate agents", "Recruiters", "Marketing teams",
  "Influencers", "Content creators", "Filmmakers", "Affiliate marketers",
  "Coaches & consultants", "Agencies",
];

const benefits = [
  { title: "Look professional, instantly", desc: "AI-generated visuals, avatars, and voiceover give every reel a polished, on-brand finish — no filming required." },
  { title: "Save hours every week", desc: "What used to take a videographer or editor days now takes you minutes, inside one editor." },
  { title: "Stay consistent", desc: "Unlimited projects and saved brand presets mean every reel looks like it belongs to you." },
  { title: "Scale your content", desc: "Generate as many reels as your plan allows — perfect for agencies, creators, and growing brands managing multiple accounts." },
  { title: "No camera, no crew", desc: "AI avatars and voiceovers mean you never have to appear on screen if you don't want to." },
  { title: "Affordable for every stage", desc: "From solo creators to full agencies, plans start at $7/month with credit-based AI features that scale with you." },
];

const steps = [
  { n: "1", title: "Describe your idea", desc: "Type a short brief, script, or story idea — Onyx Reelz turns it into a full scene-by-scene storyboard." },
  { n: "2", title: "Generate your scenes", desc: "Pick AI-generated video, stock footage, your own uploads, or an AI avatar presenter for each scene." },
  { n: "3", title: "Add voice, music, and captions", desc: "Layer in AI voiceover, music, and on-brand animated captions — all inside the same editor." },
  { n: "4", title: "Export and post", desc: "Download your finished reel in any format, or auto-publish straight to YouTube and LinkedIn (more platforms coming soon)." },
];

// Archived plan tiers (Student/Starter/Creator/Pro/Agency subscriptions)
// were retired in Stripe when pricing moved to a single free tier +
// one-time credit packs + add-ons -- see PricingPage.jsx, the real,
// currently-maintained source of pricing content. This landing-page
// section had its own separate hardcoded copy of the old tiers that was
// never updated in that move (the "keep in sync" comment that used to be
// here was never enough on its own); it's collapsed to a plain summary
// that just routes to PricingPage.jsx instead of duplicating its content.

export default function LandingPage({ session }) {
  const navigate = useNavigate();
  const authed = !!session;

  return (
    <div className="landing">
      <SEO {...staticPages.find(p => p.path === "/")} />

      {/* NAV */}
      <nav className="landing-nav">
        <span className="landing-logo">
          <svg width={18} height={18} viewBox="0 0 24 24" className="landing-logo-mark">
            <defs>
              <linearGradient id="landingNavMark" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#9eecff" />
                <stop offset="55%" stopColor="#4dd0ff" />
                <stop offset="100%" stopColor="#1d7da8" />
              </linearGradient>
            </defs>
            <path d="M12 2L22 12L12 22L2 12Z" fill="url(#landingNavMark)" />
            <path d="M12 2L22 12L12 22L2 12Z" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="0.5" />
            <path d="M12 7L17 12L12 17L7 12Z" fill="rgba(8,12,20,0.5)" />
          </svg>
          ONYX
        </span>
        <div className="landing-nav-links">
          <a href="/pricing">Pricing</a>
          {authed ? (
            <button className="landing-btn-primary" onClick={() => navigate("/dashboard")}>Go to Dashboard</button>
          ) : (
            <>
              <a href="/login">Login</a>
              <button className="landing-btn-primary" onClick={() => navigate("/signup")}>Get started</button>
            </>
          )}
        </div>
      </nav>

      {/* HERO */}
      <section className="landing-hero">
        <div className="landing-hero-inner">
          <h1>The AI video editor that turns any idea into a scroll-stopping reel in minutes</h1>
          <p className="landing-hero-sub">Onyx Reelz is the AI video editor built for creators, agents, marketers, and small businesses — generate AI scenes, avatars, voiceovers, captions, and music, then export ready-to-post reels without filming a single second.</p>
          <div className="landing-hero-ctas">
            <button className="landing-btn-primary landing-btn-lg" onClick={() => navigate("/signup")}>Get Started Free</button>
            <button className="landing-btn-ghost landing-btn-lg" onClick={() => navigate("/pricing")}>See How It Works</button>
          </div>
          <p className="landing-trust">No card. No trial. No plan to pick.</p>
        </div>
      </section>

      {/* SEE IT IN ACTION */}
      <section className="landing-section">
        <div className="landing-container">
          <h2>See it in action</h2>
          <p className="landing-section-sub">Real reels generated inside Onyx Reelz — no stock footage, no staged demo. Here's the exact prompt behind each clip.</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 20 }}>
            {showcaseClips.map(c => (
              <PromptResultShowcase key={c.label} label={c.label} videoUrl={c.videoUrl} prompt={c.prompt} />
            ))}
          </div>
        </div>
      </section>

      {/* PROBLEM */}
      <section className="landing-section landing-problem">
        <div className="landing-container landing-split">
          <div className="landing-split-text">
            <h2>You know you need video content. The tools just aren't built for you.</h2>
            <p className="landing-section-sub">You already know you should be posting more video content. But between running your business, serving customers, managing staff, and keeping everything moving, content creation becomes another job you don't have time for.</p>
            <ul className="landing-problem-list">
              {problems.map(p => <li key={p}><span className="landing-check landing-check-x">✕</span>{p}</li>)}
            </ul>
            <p className="landing-section-callout">That is where Onyx Reelz comes in.</p>
          </div>
          <img
            className="landing-split-img"
            src="https://pub-31e667ae894f4cddbf03ae6a7578eff1.r2.dev/landing/problem-section-illustration.png"
            alt="A creator overwhelmed juggling multiple disconnected apps and browser tabs to make one video"
            loading="lazy"
          />
        </div>
      </section>

      {/* SOLUTION */}
      <section className="landing-section landing-solution">
        <div className="landing-container landing-split landing-split-reverse">
          <img
            className="landing-split-img"
            src="https://pub-31e667ae894f4cddbf03ae6a7578eff1.r2.dev/landing/solution-section-illustration.png"
            alt="A creator confidently using one unified Onyx Reelz editor with timeline and AI scenes"
            loading="lazy"
          />
          <div className="landing-split-text">
            <h2>One editor. Every AI tool you need. Built for speed.</h2>
            <p className="landing-section-sub">Onyx Reelz combines AI video generation, lifelike avatars, professional voiceover, music, and branded captions into a single self-serve editor — so you create the reel yourself, in minutes, exactly the way you want it.</p>
            <div className="landing-solution-points">
              {["Generate AI video scenes from a text prompt", "Add a talking AI avatar presenter — no camera needed", "Choose from premium AI voiceovers or clone your own voice", "Drop in AI-generated music scored to your reel", "Auto-caption with branded styles, fonts, and colours", "Export in any aspect ratio — 9:16, 1:1, 16:9", "Stay on-brand with saved brand presets across every reel"].map(p => (
                <div key={p} className="landing-solution-point"><span className="landing-check">✓</span><span>{p}</span></div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="landing-section">
        <div className="landing-container">
          <h2>How Onyx Reelz works</h2>
          <div className="landing-steps">
            {steps.map(s => (
              <div key={s.n} className="landing-step">
                <div className="landing-step-n">{s.n}</div>
                <div>
                  <h3>{s.title}</h3>
                  <p>{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* BENEFITS */}
      <section className="landing-section landing-dark-section">
        <div className="landing-container">
          <h2>Why creators and businesses use Onyx Reelz</h2>
          <div className="landing-grid-3">
            {benefits.map(b => (
              <div key={b.title} className="landing-card">
                <h3>{b.title}</h3>
                <p>{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TRUTH SECTION */}
      <section className="landing-section landing-truth">
        <div className="landing-container landing-container-narrow">
          <h2>An inactive social page costs you more than you think.</h2>
          <p>When a potential customer checks your Instagram, Facebook, or TikTok and sees old posts, weak visuals, or no video content, it creates doubt. They may not say it out loud, but they are asking:</p>
          <div className="landing-doubts">
            {["Are they still active?", "Is this a serious brand?", "Should I look elsewhere?"].map(q => (
              <div key={q} className="landing-doubt">"{q}"</div>
            ))}
          </div>
          <p className="landing-truth-close">Consistent, professional-looking video content builds trust before anyone even talks to you. <strong>Onyx Reelz makes that achievable without a production team.</strong></p>
        </div>
      </section>

      {/* PRICING */}
      <section className="landing-section" id="pricing">
        <div className="landing-container">
          <h2>Onyx is free</h2>
          <p className="landing-section-sub">No card. No trial. No plan to pick. Free stock content always included — credits are only spent on AI generation and clean (watermark-free) downloads.</p>
          <button className="landing-btn-primary landing-btn-lg" onClick={() => navigate("/pricing")}>See Full Pricing & Features →</button>
        </div>
      </section>

      {/* INDUSTRIES */}
      <section className="landing-section landing-dark-section">
        <div className="landing-container">
          <h2>Built for the people creating content every day</h2>
          <p className="landing-section-sub">Onyx Reelz is ideal for:</p>
          <div className="landing-industries">
            {industries.map(i => <span key={i} className="landing-industry-tag">{i}</span>)}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="landing-section">
        <div className="landing-container">
          <h2>What your reels can include</h2>
          <div className="landing-features-grid">
            {features.map(f => <div key={f} className="landing-feature-item"><span className="landing-check">✓</span>{f}</div>)}
          </div>
        </div>
      </section>

      {/* OBJECTION */}
      <section className="landing-section landing-objection">
        <div className="landing-container landing-container-narrow">
          <h2>"I don't have any footage or a script."</h2>
          <p>That's fine — describe your idea in a sentence and Onyx Reelz generates the full storyboard, scenes, voiceover, and captions for you to edit and refine.</p>
          <div className="landing-solution-points">
            {["No camera needed", "No editing experience needed", "No production team needed", "Just an idea and a few minutes"].map(p => (
              <div key={p} className="landing-solution-point"><span className="landing-check">✓</span><span>{p}</span></div>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="landing-section landing-final-cta">
        <div className="landing-container landing-container-narrow">
          <h2>Start creating reels that actually get watched</h2>
          <p>Join creators, agencies, and businesses already using Onyx Reelz to turn ideas into finished content in minutes.</p>
          <button className="landing-btn-primary landing-btn-lg" onClick={() => navigate("/signup")}>Get Started Free</button>
          <p className="landing-final-sub">No card. No trial. No plan to pick.</p>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="landing-footer">
        <div className="landing-footer-top">
          <div className="landing-footer-brand">
            <span className="landing-logo">
              <svg width={20} height={20} viewBox="0 0 24 24" className="landing-logo-mark">
                <defs>
                  <linearGradient id="landingFooterMark" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#9eecff" />
                    <stop offset="55%" stopColor="#4dd0ff" />
                    <stop offset="100%" stopColor="#1d7da8" />
                  </linearGradient>
                </defs>
                <path d="M12 2L22 12L12 22L2 12Z" fill="url(#landingFooterMark)" />
                <path d="M12 2L22 12L12 22L2 12Z" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="0.5" />
                <path d="M12 7L17 12L12 17L7 12Z" fill="rgba(8,12,20,0.5)" />
              </svg>
              ONYX
            </span>
            <p className="landing-footer-tagline">The AI content studio for creators, filmmakers, and brands.</p>
          </div>

          <div className="landing-footer-social">
            <a href="https://www.tiktok.com/@onyxreelz" target="_blank" rel="noopener noreferrer" aria-label="Onyx Reelz on TikTok" className="landing-social-icon">
              <svg width={20} height={20} viewBox="0 0 24 24" fill="currentColor"><path d="M12.53.02C13.84 0 15.14.01 16.44 0c.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>
            </a>
            <a href="https://www.youtube.com/@OnyxReelz" target="_blank" rel="noopener noreferrer" aria-label="Onyx Reelz on YouTube" className="landing-social-icon">
              <svg width={20} height={20} viewBox="0 0 24 24" fill="currentColor"><path d="M23.5 6.19a3.02 3.02 0 0 0-2.12-2.14C19.51 3.5 12 3.5 12 3.5s-7.51 0-9.38.55A3.02 3.02 0 0 0 .5 6.19 31.6 31.6 0 0 0 0 12a31.6 31.6 0 0 0 .5 5.81 3.02 3.02 0 0 0 2.12 2.14C4.49 20.5 12 20.5 12 20.5s7.51 0 9.38-.55a3.02 3.02 0 0 0 2.12-2.14A31.6 31.6 0 0 0 24 12a31.6 31.6 0 0 0-.5-5.81ZM9.6 15.6V8.4l6.27 3.6-6.27 3.6Z"/></svg>
            </a>
            <a href="https://www.instagram.com/onyxreelz/" target="_blank" rel="noopener noreferrer" aria-label="Onyx Reelz on Instagram" className="landing-social-icon">
              <svg width={20} height={20} viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.16c3.2 0 3.58.01 4.85.07 3.25.15 4.77 1.69 4.92 4.92.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.15 3.23-1.66 4.77-4.92 4.92-1.27.06-1.64.07-4.85.07s-3.58-.01-4.85-.07c-3.26-.15-4.77-1.7-4.92-4.92-.06-1.27-.07-1.65-.07-4.85s.01-3.58.07-4.85C2.38 3.92 3.9 2.38 7.15 2.23 8.42 2.17 8.8 2.16 12 2.16Zm0 2c-3.15 0-3.5.01-4.73.07-2.16.1-3.35 1.28-3.45 3.45C3.76 8.7 3.76 9.05 3.76 12s0 3.3.06 4.32c.1 2.17 1.29 3.35 3.45 3.45 1.23.06 1.58.07 4.73.07s3.5-.01 4.73-.07c2.16-.1 3.35-1.28 3.45-3.45.06-1.02.06-1.37.06-4.32s0-3.3-.06-4.32c-.1-2.17-1.29-3.35-3.45-3.45C15.5 4.17 15.15 4.16 12 4.16Zm0 3.4a4.44 4.44 0 1 1 0 8.88 4.44 4.44 0 0 1 0-8.88Zm0 2a2.44 2.44 0 1 0 0 4.88 2.44 2.44 0 0 0 0-4.88Zm4.65-2.65a1.04 1.04 0 1 1 0 2.08 1.04 1.04 0 0 1 0-2.08Z"/></svg>
            </a>
            <a href="https://www.facebook.com/profile.php?id=61590002537395" target="_blank" rel="noopener noreferrer" aria-label="Onyx Reelz on Facebook" className="landing-social-icon">
              <svg width={20} height={20} viewBox="0 0 24 24" fill="currentColor"><path d="M13.5 21.5v-8.05h2.7l.4-3.14h-3.1V8.3c0-.91.25-1.53 1.56-1.53h1.66V3.96C15.94 3.9 15.02 3.83 13.94 3.83c-2.24 0-3.78 1.37-3.78 3.87v2.6H7.45v3.15h2.71v8.05h3.34Z"/></svg>
            </a>
          </div>
        </div>

        <div className="landing-footer-bottom">
          <div className="landing-footer-legal-links">
            <a href="/privacy">Privacy Policy</a>
            <a href="/terms">Terms of Service</a>
          </div>
          <span>© {new Date().getFullYear()} Onyx Reelz. All rights reserved.</span>
          <span className="landing-footer-legal-text">ONYX REELZ LTD is a company registered in England & Wales. Company number: 17288776. Registered office: 128 City Road, London, EC1V 2NX, United Kingdom.</span>
        </div>
      </footer>


    </div>
  );
}
