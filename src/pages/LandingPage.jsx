import { useNavigate } from "react-router-dom";
import "../style.css";

const features = [
  "Faceless promotional videos",
  "Product showcases",
  "Service explainers",
  "Before-and-after reels",
  "Offer announcements",
  "Educational tips",
  "Brand awareness reels",
  "Voiceover narration",
  "Music and captions",
  "Stock video and image content",
  "Branded colours and text style",
  "Local business adverts",
];

const problems = [
  "Not knowing what to post",
  "Not having time to film",
  "Poor-quality phone footage",
  "Inconsistent posting",
  "Expensive videographers",
  "Weak captions and hooks",
  "No clear content strategy",
  "Social pages that look inactive",
];

const industries = [
  "Restaurants and cafés", "Bars and nightlife venues", "Barbers and salons",
  "Gyms and fitness coaches", "Cleaning companies", "Builders and tradespeople",
  "Estate agents", "Clinics and wellness businesses", "Local shops",
  "Car detailers", "Travel and tour companies", "Coaches and consultants",
  "Online service providers",
];

const benefits = [
  { title: "Look more professional", desc: "A polished social presence helps your business look established, active, and credible." },
  { title: "Save time", desc: "No filming, editing, scripting, or content planning. We handle the heavy lifting." },
  { title: "Stay consistent", desc: "Consistent content keeps your business visible and gives customers a reason to remember you." },
  { title: "Promote offers faster", desc: "Launch a discount, new service, event, or seasonal offer with fast reel content." },
  { title: "No camera needed", desc: "Perfect if you don't want to appear on video or don't have staff comfortable being filmed." },
  { title: "Affordable monthly content", desc: "Regular video content without agency-level prices or hiring an in-house editor." },
];

const steps = [
  { n: "1", title: "Tell us about your business", desc: "Send your business name, services, offers, location, website, social links, and any images or videos you already have." },
  { n: "2", title: "We create your reel concepts", desc: "We plan short, clear video ideas that promote your business, explain your services, build trust, and attract attention." },
  { n: "3", title: "We produce the reels", desc: "Using faceless video editing, stock visuals, captions, music, voiceover, and branded styling, we create finished reels ready to post." },
  { n: "4", title: "You approve and post", desc: "You receive polished videos that you can post across your social media accounts." },
  { n: "5", title: "Stay consistent every month", desc: "Choose a monthly package so your business keeps showing up online without you constantly chasing content." },
];

const packages = [
  {
    name: "Starter",
    price: "$19",
    desc: "For businesses that want to begin posting consistently.",
    features: ["4 reels per month", "Basic captions", "Stock visuals or supplied media", "Simple music and text overlays", "1 revision per reel"],
    cta: "Start with Starter",
    highlight: false,
  },
  {
    name: "Creator",
    price: "$39",
    desc: "For businesses that want stronger visibility and regular promotion.",
    features: ["8 reels per month", "Stronger hooks and captions", "Branded visual style", "Voiceover options", "Product/service promotion reels", "2 revisions per reel"],
    cta: "Choose Creator",
    highlight: true,
  },
  {
    name: "Pro / Agency",
    price: "$99",
    desc: "For businesses that want a serious short-form content engine.",
    features: ["12–16 reels per month", "Full content planning", "Branded templates", "Promotional campaign reels", "Voiceover and music selection", "Priority delivery", "2 revisions per reel"],
    cta: "Go Pro",
    highlight: false,
  },
];

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="landing">

      {/* NAV */}
      <nav className="landing-nav">
        <span className="landing-logo">ONYX</span>
        <div className="landing-nav-links">
          <a href="/pricing">Pricing</a>
          <a href="/login">Login</a>
          <button className="landing-btn-primary" onClick={() => navigate("/signup")}>Get started</button>
        </div>
      </nav>

      {/* HERO */}
      <section className="landing-hero">
        <div className="landing-hero-inner">
          <h1>Turn your business into daily scroll-stopping reels</h1>
          <p className="landing-hero-sub">Onyx Reelz helps small businesses create professional faceless reels, promo videos, product clips, and social media content — without hiring a full production team.</p>
          <div className="landing-hero-ctas">
            <button className="landing-btn-primary landing-btn-lg" onClick={() => navigate("/signup")}>Get my first reel package</button>
            <button className="landing-btn-ghost landing-btn-lg" onClick={() => navigate("/pricing")}>See how it works</button>
          </div>
          <p className="landing-trust">Built for small businesses that need consistent, affordable video content without the stress of filming, editing, or figuring out what to post.</p>
        </div>
      </section>

      {/* PROBLEM */}
      <section className="landing-section landing-problem">
        <div className="landing-container">
          <h2>Your business needs reels. But creating them is a nightmare.</h2>
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
          <h2>Professional reels made for your business — without you having to be on camera</h2>
          <p className="landing-section-sub">Onyx Reelz creates clean, engaging, faceless video content for small businesses. We turn your services, products, offers, and brand message into short-form reels designed for Instagram, Facebook, TikTok, YouTube Shorts, and more.</p>
          <div className="landing-solution-points">
            {["You don't need to record yourself.", "You don't need to edit anything.", "You don't need to learn complicated software.", "You just give us the details — we create the content."].map(p => (
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
          <h2>Why small businesses use Onyx Reelz</h2>
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
          <h2>The truth is simple: an empty social page costs you trust</h2>
          <p>When a potential customer checks your Instagram, Facebook, or TikTok and sees old posts, weak visuals, or no video content, it creates doubt. They may not say it out loud, but they are asking:</p>
          <div className="landing-doubts">
            {["Is this business active?", "Can I trust them?", "Are they professional?", "Is someone else better?"].map(q => (
              <div key={q} className="landing-doubt">"{q}"</div>
            ))}
          </div>
          <p className="landing-truth-close">Your social media doesn't need to be perfect. But it needs to look alive. <strong>Onyx Reelz helps you fix that.</strong></p>
        </div>
      </section>

      {/* PRICING */}
      <section className="landing-section" id="pricing">
        <div className="landing-container">
          <h2>Choose a reel package that fits your business</h2>
          <div className="landing-grid-3">
            {packages.map(pkg => (
              <div key={pkg.name} className={`landing-card landing-pkg${pkg.highlight ? " landing-pkg-highlight" : ""}`}>
                {pkg.highlight && <div className="landing-popular">Most popular</div>}
                <h3>{pkg.name}</h3>
                <div className="landing-price">{pkg.price}<span>/mo</span></div>
                <p className="landing-pkg-desc">{pkg.desc}</p>
                <ul className="landing-pkg-features">
                  {pkg.features.map(f => <li key={f}><span className="landing-check">✓</span>{f}</li>)}
                </ul>
                <button className="landing-btn-primary landing-btn-full" onClick={() => navigate("/signup")}>{pkg.cta}</button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* INDUSTRIES */}
      <section className="landing-section landing-dark-section">
        <div className="landing-container">
          <h2>Perfect for local and small businesses</h2>
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
          <h2>"But I don't have any videos or photos."</h2>
          <p>That is fine. We can create faceless reels using stock visuals, animated text, AI-assisted creative tools, music, captions, and your business information.</p>
          <div className="landing-solution-points">
            {["You don't need a studio.", "You don't need a camera crew.", "You don't need to be on screen.", "You just need a clear message and a consistent content system."].map(p => (
              <div key={p} className="landing-solution-point"><span className="landing-check">✓</span><span>{p}</span></div>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="landing-section landing-final-cta">
        <div className="landing-container landing-container-narrow">
          <h2>Start showing up like a serious business</h2>
          <p>Your customers are scrolling every day. Your competitors are trying to get their attention. Your business needs content that makes people stop, notice, and remember you.</p>
          <button className="landing-btn-primary landing-btn-lg" onClick={() => navigate("/signup")}>Start my reel package today</button>
          <p className="landing-final-sub">Simple monthly packages. No complicated contracts. Built for small businesses.</p>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="landing-footer">
        <span>© 2026 Onyx Reelz</span>
        <div className="landing-footer-links">
          <a href="/terms">Terms</a>
          <a href="/pricing">Pricing</a>
          <a href="/login">Login</a>
        </div>
      </footer>

    </div>
  );
}
