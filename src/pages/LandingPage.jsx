import { useNavigate } from "react-router-dom";
import SEO from "../components/SEO";
import { staticPages } from "../data/staticPagesSeo";
import "../style.css";

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
  { n: "4", title: "Export and post", desc: "Download your finished reel in any format, or auto-publish straight to Instagram, YouTube, and LinkedIn." },
];

// Prices must match the plans defined in PricingPage.jsx — keep in sync.
const packages = [
  { name: "Student", price: "$7" },
  { name: "Starter", price: "$19" },
  { name: "Creator", price: "$39", highlight: true },
  { name: "Pro", price: "$99" },
  { name: "Agency", price: "$199" },
];

export default function LandingPage({ session }) {
  const navigate = useNavigate();
  const authed = !!session;

  return (
    <div className="landing">
      <SEO {...staticPages.find(p => p.path === "/")} />

      {/* NAV */}
      <nav className="landing-nav">
        <span className="landing-logo">ONYX</span>
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
            <button className="landing-btn-primary landing-btn-lg" onClick={() => navigate("/signup")}>Start Your Free Trial</button>
            <button className="landing-btn-ghost landing-btn-lg" onClick={() => navigate("/pricing")}>See How It Works</button>
          </div>
          <p className="landing-trust">14-day free trial · No credit card required · Cancel anytime</p>
        </div>
      </section>

      {/* PROBLEM */}
      <section className="landing-section landing-problem">
        <div className="landing-container">
          <h2>You know you need video content. The tools just aren't built for you.</h2>
          <p className="landing-section-sub">You already know you should be posting more video content. But between running your business, serving customers, managing staff, and keeping everything moving, content creation becomes another job you don't have time for.</p>
          <ul className="landing-problem-list">
            {problems.map(p => <li key={p}><span className="landing-check landing-check-x">✕</span>{p}</li>)}
          </ul>
          <p className="landing-section-callout">That is where Onyx Reelz comes in.</p>
        </div>
      </section>

      {/* SOLUTION */}
      <section className="landing-section landing-solution">
        <div className="landing-container">
          <h2>One editor. Every AI tool you need. Built for speed.</h2>
          <p className="landing-section-sub">Onyx Reelz combines AI video generation, lifelike avatars, professional voiceover, music, and branded captions into a single self-serve editor — so you create the reel yourself, in minutes, exactly the way you want it.</p>
          <div className="landing-solution-points">
            {["Generate AI video scenes from a text prompt", "Add a talking AI avatar presenter — no camera needed", "Choose from premium AI voiceovers or clone your own voice", "Drop in AI-generated music scored to your reel", "Auto-caption with branded styles, fonts, and colours", "Export in any aspect ratio — 9:16, 1:1, 16:9", "Stay on-brand with saved brand presets across every reel"].map(p => (
              <div key={p} className="landing-solution-point"><span className="landing-check">✓</span><span>{p}</span></div>
            ))}
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
          <h2>Plans for every stage — from solo creators to full agencies</h2>
          <p className="landing-section-sub">5 plans. Credit-based AI features. Free stock content always included.</p>
          <div className="landing-grid-3">
            {packages.map(pkg => (
              <div key={pkg.name} className={`landing-card landing-pkg${pkg.highlight ? " landing-pkg-highlight" : ""}`}>
                {pkg.highlight && <div className="landing-popular">Most popular</div>}
                <h3>{pkg.name}</h3>
                <div className="landing-price">{pkg.price}<span>/mo</span></div>
              </div>
            ))}
          </div>
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
          <button className="landing-btn-primary landing-btn-lg" onClick={() => navigate("/signup")}>Start Your Free Trial</button>
          <p className="landing-final-sub">14-day free trial · No credit card required · Cancel anytime</p>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="landing-footer">
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span>© {new Date().getFullYear()} Onyx Reelz. All rights reserved.</span>
          <span style={{ fontSize: 12, opacity: 0.6 }}>ONYX REELZ LTD is a company registered in England & Wales. Company number: 17288776. Registered office: 128 City Road, London, EC1V 2NX, United Kingdom.</span>
        </div>
        <div className="landing-footer-links">
          <a href="/features">Features</a>
          <a href="/learn">Learn</a>
          <a href="/privacy">Privacy Policy</a>
          <a href="/terms">Terms of Service</a>
          <a href="/pricing">Pricing</a>
          {authed ? <a href="/dashboard">Dashboard</a> : <a href="/login">Login</a>}
        </div>
      </footer>


    </div>
  );
}
