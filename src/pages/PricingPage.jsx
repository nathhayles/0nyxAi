import "../styles/pricing.css";
import React, { useState } from "react";
import { supabase } from "../supabaseClient.js";

const PRICE_IDS = {
  starter_monthly: "price_1Sj8MXAjJ51auCbIlIG2D1Vw",
  creator_monthly: "price_1Sv9dYAjJ51auCbI722YseS8",
  pro_monthly:     "price_1SvDvlAjJ51auCbI7KrLiyCl",
  autopost:        "price_1SvDwjAjJ51auCbIjSF5FOeb",
  credits_500:     "price_1TR0Y5AjJ51auCbIrjMQ0ghJ",
  credits_1000:    "price_1TR0YcAjJ51auCbI6mJvj0BM",
  credits_2500:    "price_1TR0ZbAjJ51auCbIYT4JY2a9",
  credits_5000:    "price_1TR0a3AjJ51auCbIQ3m0Xpqo",
};

async function startCheckout(priceKey, setBusy) {
  setBusy(priceKey);
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) { window.location.href = "/login"; return; }

    const res = await fetch("/api/stripe/create-checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ priceId: PRICE_IDS[priceKey], mode: "subscription" }),
    });
    const data = await res.json();
    if (data.url) window.location.href = data.url;
    else alert("Something went wrong. Please try again.");
  } catch (e) {
    console.error(e);
    alert("Checkout failed. Please try again.");
  } finally {
    setBusy(null);
  }
}

const PricingCard = ({ planKey, plan, price, yearlyPrice, desc, features, highlighted, busy, setBusy, isYearly }) => {
  const priceKey = `${planKey}_monthly`; // extend for yearly when ready
  const isBusy = busy === priceKey;

  return (
    <div className={`card ${highlighted ? "card-highlight" : ""}`}>
      {highlighted && <div className="badge">Most Popular</div>}
      <h3>{plan}</h3>
      <p className="desc">{desc}</p>
      <div className="price">{isYearly && yearlyPrice ? yearlyPrice : price}</div>
      <ul>
        {features.map((f, i) => <li key={i}>✔ {f}</li>)}
      </ul>
      <button
        className="cta"
        disabled={isBusy}
        onClick={() => startCheckout(priceKey, setBusy)}
      >
        {isBusy ? "Redirecting…" : "Start Free Trial"}
      </button>
    </div>
  );
};

const CreditPack = ({ label, priceKey, price, credits, busy, setBusy }) => {
  const isBusy = busy === priceKey;
  return (
    <div className="credit-pack">
      <div className="credit-pack-info">
        <span className="credit-pack-label">{label}</span>
        <span className="credit-pack-credits">{credits} credits</span>
      </div>
      <div className="credit-pack-right">
        <span className="credit-pack-price">{price}</span>
        <button
          className="cta cta-sm"
          disabled={isBusy}
          onClick={() => startCheckout(priceKey, setBusy)}
        >
          {isBusy ? "…" : "Buy"}
        </button>
      </div>
    </div>
  );
};

export default function PricingPage() {
  const [isYearly, setIsYearly] = useState(false);
  const [busy, setBusy] = useState(null);

  const plans = [
    {
      planKey: "starter",
      plan: "Starter",
      price: "$19/mo",
      yearlyPrice: "$15/mo",
      desc: "Everything a small business needs to create professional video content.",
      features: [
        "100 credits per month",
        "600 mins/month stock video",
        "Standard AI voiceover — 400 mins/month included",
        "Stock video & images — free, unlimited browsing",
        "Stock music library — free, unlimited",
        "1 brand preset",
        "Unlimited projects",
        "MP4 download — no watermark",
        "Watermarked share link",
        "Premium voiceover — credits only",
        "AI video generation — credits only (10/scene)",
        "Avatar presenter — credits only",
        "Email support",
      ],
      highlighted: false,
    },
    {
      planKey: "creator",
      plan: "Creator",
      price: "$39/mo",
      yearlyPrice: "$31/mo",
      desc: "For creators producing content regularly across multiple platforms.",
      features: [
        "150 credits per month",
        "1,200 mins/month stock video",
        "Standard AI voiceover — 800 mins/month included",
        "Stock video & images — free, unlimited browsing",
        "Stock music library — free, unlimited",
        "3 brand presets",
        "Unlimited projects",
        "Campaign Generator — multi-reel campaigns",
        "MP4 download — no watermark",
        "Premium voiceover — credits only",
        "AI video generation — credits only (10/scene)",
        "Avatar presenter — credits only",
        "Priority support",
      ],
      highlighted: true,
    },
    {
      planKey: "pro",
      plan: "Pro / Agency",
      price: "$99/mo",
      yearlyPrice: "$79/mo",
      desc: "For agencies and power users managing multiple clients.",
      features: [
        "200 credits per month",
        "Unlimited stock video",
        "Standard AI voiceover — 1,500 mins/month included",
        "Stock video & images — free, unlimited browsing",
        "Stock music library — free, unlimited",
        "8 brand presets",
        "Unlimited projects",
        "Campaign Generator — multi-reel campaigns",
        "Auto-posting — Instagram, TikTok, YouTube Shorts ✅ free",
        "MP4 download — no watermark",
        "Premium voiceover — credits only",
        "AI video generation — credits only (10/scene)",
        "Avatar presenter — credits only",
        "Reel translation — credits only",
        "Priority support + onboarding call",
      ],
      highlighted: false,
    },
  ];

  return (
    <div className="pricing-page">
      <h1>Simple, scalable pricing</h1>
      <p className="subtitle">Start your 14-day free trial. No credit card required.</p>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 24, marginBottom: 32, flexWrap: "wrap" }}>
        {["✓ 14-day free trial", "✓ Full feature access", "✓ No credit card required"].map(item => (
          <span key={item} style={{ fontSize: 13, color: "#a78bfa", fontWeight: 600 }}>{item}</span>
        ))}
      </div>

      <div className="toggle-wrap">
        <span className={!isYearly ? "active" : ""}>Monthly</span>
        <label className="toggle">
          <input type="checkbox" checked={isYearly} onChange={() => setIsYearly(v => !v)} />
          <span className="slider" />
        </label>
        <span className={isYearly ? "active" : ""}>Yearly <em className="save-badge">Save 20%</em></span>
      </div>

      <div className="cards">
        {plans.map(p => (
          <PricingCard key={p.planKey} {...p} busy={busy} setBusy={setBusy} isYearly={isYearly} />
        ))}
      </div>

      {/* Auto-posting add-on */}
      <div className="addon-section">
        <h2>Add-ons</h2>
        <div className="addon-card">
          <div className="addon-info">
            <h4>Auto-posting</h4>
            <p>Auto-publish to Instagram, TikTok, YouTube Shorts & Facebook. Includes scheduler, retry logic & analytics.</p>
            <span className="trial-badge">14-day free trial</span>
          </div>
          <div className="addon-right">
            <span className="addon-price">$15/mo</span>
            <button
              className="cta"
              disabled={busy === "autopost"}
              onClick={() => startCheckout("autopost", setBusy)}
            >
              {busy === "autopost" ? "Redirecting…" : "Add to plan"}
            </button>
          </div>
        </div>
      </div>

      {/* Credit packs */}
      <div className="credits-section">
        <h2>Top up credits</h2>
        <p className="subtitle">Used for AI video generation, extra storage & more.</p>
        <div className="credit-packs">
          <CreditPack label="Starter pack"  priceKey="credits_500"  price="$5"  credits="500"   busy={busy} setBusy={setBusy} />
          <CreditPack label="Popular"       priceKey="credits_1000" price="$10" credits="1,000" busy={busy} setBusy={setBusy} />
          <CreditPack label="Best value"    priceKey="credits_2500" price="$25" credits="2,500" busy={busy} setBusy={setBusy} />
          <CreditPack label="Agency"        priceKey="credits_5000" price="$50" credits="5,000" busy={busy} setBusy={setBusy} />
        </div>
      </div>

      {/* Credit costs reference */}
      <div className="credits-section" style={{ marginTop: 48 }}>
        <h2>What do credits buy?</h2>
        <p className="subtitle">Credits are used for AI-powered features. Stock content is always free.</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginTop: 24 }}>
          {[
            { feature: "🎬 AI Video Scene", cost: "10 credits", note: "Powered by Kling AI" },
            { feature: "🎙️ Premium Voiceover", cost: "3 credits/scene", note: "ElevenLabs voices" },
            { feature: "🎵 Music Generation", cost: "10 credits", note: "Google Lyria — 2 tracks" },
            { feature: "🧑‍💼 Avatar Standard", cost: "200 credits/min", note: "HeyGen presenter" },
            { feature: "✨ Avatar IV", cost: "600 credits/min", note: "Photorealistic" },
            { feature: "🌍 Reel Translation", cost: "300 credits/min", note: "AI lip sync" },
          ].map(item => (
            <div key={item.feature} style={{
              background: "#0c1016", border: "1px solid #1f2937", borderRadius: 10,
              padding: "16px 20px",
            }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: "#f1f5f9", marginBottom: 4 }}>{item.feature}</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: "#a78bfa", marginBottom: 4 }}>{item.cost}</div>
              <div style={{ fontSize: 12, color: "#94a3b8" }}>{item.note}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
