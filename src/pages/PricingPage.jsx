import React, { useState } from "react";
import { supabase } from "../supabaseClient.js";
import SEO from "../components/SEO";
import { staticPages } from "../data/staticPagesSeo";

// Single source of truth for the 6 real Stripe price IDs this page can
// check out with -- cross-checked directly against routes/stripe.js's
// PLANS map (not copied from memory) before writing this file. The two
// add-ons are each their own $15/mo subscription; the four credit packs
// are one-time purchases (mode: "payment") -- the backend's create-checkout
// route already forces "payment" for any credits>0/plan:null price id
// regardless of what's sent, but sending the correct mode explicitly here
// avoids relying on that override silently doing the right thing.
const PRICE_IDS = {
  autopost:         { id: "price_1SvDwjAjJ51auCbIjSF5FOeb", mode: "subscription" },
  unlimited_brands: { id: "price_1U0SizAjJ51auCbIOtp1CDDA", mode: "subscription" },
  credits_500:      { id: "price_1TR0Y5AjJ51auCbIrjMQ0ghJ", mode: "payment" },
  credits_1000:     { id: "price_1TR0YcAjJ51auCbI6mJvj0BM", mode: "payment" },
  credits_2500:     { id: "price_1TR0ZbAjJ51auCbIYT4JY2a9", mode: "payment" },
  credits_5000:     { id: "price_1TR0a3AjJ51auCbIQ3m0Xpqo", mode: "payment" },
};

async function startCheckout(priceKey, setBusy) {
  setBusy(priceKey);
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) { window.location.href = "/login"; return; }
    const { id: priceId, mode } = PRICE_IDS[priceKey];
    const res = await fetch("/api/stripe/create-checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ priceId, mode }),
    });
    const data = await res.json();
    if (data.url) {
      sessionStorage.setItem("returning_from_checkout", "1");
      window.location.href = data.url;
    } else {
      alert("Something went wrong. Please try again.");
    }
  } catch (e) {
    console.error(e);
    alert("Checkout failed. Please try again.");
  } finally {
    setBusy(null);
  }
}

const AddonCard = ({ priceKey, title, desc, price, busy, setBusy }) => {
  const isBusy = busy === priceKey;
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 24,
      padding: "24px 28px", borderRadius: 16,
      background: "var(--onyx-surface)", border: "0.5px solid var(--onyx-hairline-strong)" }}>
      <div style={{ flex: 1 }}>
        <h4 style={{ fontSize: 17, fontWeight: 600, margin: "0 0 6px", color: "var(--onyx-text)" }}>{title}</h4>
        <p style={{ fontSize: 13.5, color: "var(--onyx-text-dim)", margin: 0, lineHeight: 1.5 }}>{desc}</p>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 16, flexShrink: 0 }}>
        <span style={{ fontSize: 22, fontWeight: 700, color: "var(--onyx-text)" }}>{price}</span>
        <button
          disabled={isBusy}
          onClick={() => startCheckout(priceKey, setBusy)}
          style={{ padding: "10px 20px", borderRadius: 10, fontWeight: 600, fontSize: 14, cursor: "pointer",
            background: "linear-gradient(180deg,#5edcff,#2db8ee)", color: "var(--btn-primary-text)", border: "none" }}
        >{isBusy ? "Redirecting…" : "Add"}</button>
      </div>
    </div>
  );
};

const CreditPack = ({ label, priceKey, price, credits, busy, setBusy }) => {
  const isBusy = busy === priceKey;
  return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
      padding:"14px 18px", borderRadius:12,
      background:"var(--onyx-surface)", border:"0.5px solid var(--onyx-hairline-strong)" }}>
      <div style={{ display:"flex", flexDirection:"column", gap:2 }}>
        <span style={{ fontSize:13, fontWeight:600, color:"var(--onyx-text)" }}>{label}</span>
        <span style={{ fontSize:12, color:"var(--onyx-text-dim)" }}>{credits} credits</span>
      </div>
      <div style={{ display:"flex", alignItems:"center", gap:12 }}>
        <span style={{ fontSize:16, fontWeight:700, color:"var(--onyx-text)" }}>{price}</span>
        <button
          disabled={isBusy}
          onClick={() => startCheckout(priceKey, setBusy)}
          style={{ padding:"6px 16px", borderRadius:8, fontWeight:600, fontSize:13, cursor:"pointer",
            background:"linear-gradient(180deg,#5edcff,#2db8ee)", color:"var(--btn-primary-text)", border:"none" }}
        >{isBusy ? "…" : "Buy"}</button>
      </div>
    </div>
  );
};

const CHECKLIST_ITEMS = [
  "Full editor — unlimited projects & scenes",
  "Unlimited stock video, images & music",
  "Learn/Academy content — full access",
  "Share watermarked reels — unlimited",
  "Pay only for AI generation & downloads",
];

const Checklist = ({ style }) => (
  <div style={{ display:"flex", flexDirection:"column", gap:10, padding:"20px 24px", borderRadius:12,
    background:"rgba(77,208,255,0.08)", border:"0.5px solid rgba(77,208,255,0.2)", ...style }}>
    {CHECKLIST_ITEMS.map(item => (
      <div key={item} style={{ display:"flex", alignItems:"center", gap:10, fontSize:13.5, color:"var(--onyx-cyan)" }}>
        <span style={{ color:"#22c55e", fontWeight:700, flexShrink:0 }}>✓</span> {item}
      </div>
    ))}
  </div>
);

export default function PricingPage() {
  const [busy, setBusy] = useState(null);

  return (
    <div style={{ minHeight:"100vh", background:"var(--bg-page)", color:"var(--onyx-text)",
      fontFamily:"-apple-system, BlinkMacSystemFont, system-ui, sans-serif", padding:"48px 24px 64px" }}>
      <SEO {...staticPages.find(p => p.path === "/pricing")} />
      <div style={{ maxWidth:1120, margin:"0 auto" }}>

        {/* Hero — one free tier, no card required */}
        <div style={{ marginBottom:32 }}>
          <h1 className="page-title" style={{ margin:"0 0 12px", textAlign:"center" }}>
            Onyx is free
          </h1>
          <p style={{ fontSize:18, color:"var(--onyx-text-dim)", margin:"0 0 20px", textAlign:"center" }}>
            No card. No trial. No plan to pick.
          </p>
          <Checklist style={{ maxWidth:420, margin:"0 auto 24px" }} />
          <div style={{ textAlign:"center" }}>
            <a href="/signup" style={{ display:"inline-block", padding:"16px 40px", borderRadius:10, fontWeight:700, fontSize:16,
              background:"linear-gradient(180deg,#5edcff,#2db8ee)", color:"var(--btn-primary-text)", textDecoration:"none" }}>
              Get Started Free
            </a>
          </div>
        </div>

        {/* What credits buy */}
        <div style={{ marginBottom:24 }}>
          <h2 style={{ fontSize:24, fontWeight:600, margin:"0 0 8px", color:"var(--onyx-text)", textAlign:"center" }}>What do credits buy?</h2>
          <p style={{ fontSize:14, color:"var(--onyx-text-dim)", margin:"0 0 20px", textAlign:"center" }}>
            Everything above is free. Credits are only spent on AI generation and clean (watermark-free) downloads.
          </p>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(220px, 1fr))", gap:20 }}>
            {[
              { feature:"Clean Download",      cost:"1 credit/min",      note:"Watermark-free export" },
              { feature:"AI Video Scene",      cost:"50 credits",        note:"Kling 2.6 Pro via fal.ai" },
              { feature:"Premium Voiceover",   cost:"3 credits/scene",   note:"ElevenLabs voices" },
              { feature:"AI Music",            cost:"10 credits",        note:"Google Lyria 3 Pro" },
              { feature:"Avatar Standard",     cost:"200 credits/min",   note:"HeyGen presenter" },
              { feature:"Avatar IV",           cost:"600 credits/min",   note:"Photorealistic" },
              { feature:"Reel Translation",    cost:"300 credits/min",   note:"AI lip sync" },
            ].map(item => (
              <div key={item.feature} style={{ background:"var(--onyx-surface)", border:"0.5px solid var(--onyx-hairline-strong)", borderRadius:12, padding:"20px 24px" }}>
                <div style={{ fontSize:15, fontWeight:600, color:"var(--onyx-text)", marginBottom:4 }}>{item.feature}</div>
                <div style={{ fontSize:20, fontWeight:700, color:"var(--onyx-cyan)", marginBottom:4 }}>{item.cost}</div>
                <div style={{ fontSize:12, color:"var(--onyx-text-faint)" }}>{item.note}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Credit packs */}
        <div style={{ marginBottom:24 }}>
          <h2 style={{ fontSize:24, fontWeight:600, margin:"0 0 8px", color:"var(--onyx-text)" }}>Buy credits</h2>
          <p style={{ fontSize:14, color:"var(--onyx-text-dim)", margin:"0 0 20px" }}>One-time purchase, never expires.</p>
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            <CreditPack label="Starter pack"  priceKey="credits_500"  price="$5"  credits="500"   busy={busy} setBusy={setBusy} />
            <CreditPack label="Popular"       priceKey="credits_1000" price="$10" credits="1,000" busy={busy} setBusy={setBusy} />
            <CreditPack label="Best value"    priceKey="credits_2500" price="$25" credits="2,500" busy={busy} setBusy={setBusy} />
            <CreditPack label="Agency"        priceKey="credits_5000" price="$50" credits="5,000" busy={busy} setBusy={setBusy} />
          </div>
        </div>

        {/* Add-ons — separate purchasable items, not bundled into any tier */}
        <div>
          <h2 style={{ fontSize:24, fontWeight:600, margin:"0 0 16px", color:"var(--onyx-text)" }}>Add-ons</h2>
          <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
            <AddonCard
              priceKey="unlimited_brands"
              title="Unlimited Brands"
              desc="Removes the 1-brand limit — create as many brand presets as you need."
              price="$15/mo"
              busy={busy} setBusy={setBusy}
            />
            <AddonCard
              priceKey="autopost"
              title="Auto-posting"
              desc="Auto-publish to Instagram, YouTube Shorts & LinkedIn. Includes scheduler, retry logic & analytics."
              price="$15/mo"
              busy={busy} setBusy={setBusy}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
