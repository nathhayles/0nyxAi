import React, { useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "../supabaseClient.js";
import SEO from "../components/SEO";
import { staticPages } from "../data/staticPagesSeo";

const EASE_OUT = [0.23, 1, 0.32, 1];
const fadeUp = {
  hidden: { opacity: 0, y: 10 },
  show: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.28, ease: EASE_OUT, delay: i * 0.05 } }),
};

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

const AddonCard = ({ priceKey, title, desc, price, accent, busy, setBusy, index }) => {
  const isBusy = busy === priceKey;
  return (
    <motion.div
      custom={index} initial="hidden" animate="show" variants={fadeUp}
      style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 24,
      padding: "24px 28px", borderRadius: 16,
      background: "var(--onyx-surface)", border: `0.5px solid ${accent}40`,
      borderLeft: `3px solid ${accent}` }}>
      <div style={{ flex: 1 }}>
        <h4 style={{ fontSize: 17, fontWeight: 600, margin: "0 0 6px", color: "var(--onyx-text)" }}>{title}</h4>
        <p style={{ fontSize: 13.5, color: "var(--onyx-text-dim)", margin: 0, lineHeight: 1.5 }}>{desc}</p>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 16, flexShrink: 0 }}>
        <span style={{ fontSize: 22, fontWeight: 700, color: accent }}>{price}</span>
        <button
          className="press-btn"
          disabled={isBusy}
          onClick={() => startCheckout(priceKey, setBusy)}
          style={{ padding: "10px 20px", borderRadius: 10, fontWeight: 600, fontSize: 14, cursor: "pointer",
            background: "linear-gradient(180deg,#5edcff,#2db8ee)", color: "var(--btn-primary-text)", border: "none" }}
        >{isBusy ? "Redirecting…" : "Add"}</button>
      </div>
    </motion.div>
  );
};

const CreditPack = ({ label, priceKey, price, credits, accent, busy, setBusy, index }) => {
  const isBusy = busy === priceKey;
  return (
    <motion.div
      custom={index} initial="hidden" animate="show" variants={fadeUp}
      style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
      padding:"14px 18px", borderRadius:12,
      background:"var(--onyx-surface)", border:`0.5px solid ${accent}40`,
      borderLeft: `3px solid ${accent}` }}>
      <div style={{ display:"flex", flexDirection:"column", gap:2 }}>
        <span style={{ fontSize:13, fontWeight:600, color:"var(--onyx-text)" }}>{label}</span>
        <span style={{ fontSize:12, color:"var(--onyx-text-dim)" }}>{credits} credits</span>
      </div>
      <div style={{ display:"flex", alignItems:"center", gap:12 }}>
        <span style={{ fontSize:16, fontWeight:700, color:accent }}>{price}</span>
        <button
          className="press-btn"
          disabled={isBusy}
          onClick={() => startCheckout(priceKey, setBusy)}
          style={{ padding:"6px 16px", borderRadius:8, fontWeight:600, fontSize:13, cursor:"pointer",
            background:"linear-gradient(180deg,#5edcff,#2db8ee)", color:"var(--btn-primary-text)", border:"none" }}
        >{isBusy ? "…" : "Buy"}</button>
      </div>
    </motion.div>
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

const FEATURE_ITEMS = [
  { feature:"Clean Download",      cost:"1 credit/min",      note:"Watermark-free export",                             accent:"var(--onyx-cyan)" },
  { feature:"AI Video Scene",      cost:"75-149 credits",    note:"Kling 3 Pro via fal.ai, based on scene length",      accent:"var(--onyx-amber)" },
  { feature:"Premium Voiceover",   cost:"3 credits/scene",   note:"ElevenLabs voices",                                 accent:"var(--onyx-violet)" },
  { feature:"AI Music",            cost:"10 credits",        note:"Google Lyria 3 Pro",                                accent:"var(--onyx-rose)" },
  { feature:"Avatar Standard",     cost:"200 credits/min",   note:"HeyGen presenter",                                  accent:"var(--onyx-cyan)" },
  { feature:"Avatar IV",           cost:"600 credits/min",   note:"Photorealistic",                                    accent:"var(--onyx-amber)" },
  { feature:"Reel Translation",    cost:"300 credits/min",   note:"AI lip sync",                                       accent:"var(--onyx-violet)" },
];

const CREDIT_PACKS = [
  { label:"Starter pack", priceKey:"credits_500",  price:"$5",  credits:"500",   accent:"var(--onyx-cyan)" },
  { label:"Popular",      priceKey:"credits_1000", price:"$10", credits:"1,000", accent:"var(--onyx-amber)" },
  { label:"Best value",   priceKey:"credits_2500", price:"$25", credits:"2,500", accent:"var(--onyx-violet)" },
  { label:"Agency",       priceKey:"credits_5000", price:"$50", credits:"5,000", accent:"var(--onyx-rose)" },
];

export default function PricingPage() {
  const [busy, setBusy] = useState(null);

  return (
    <div style={{ minHeight:"100vh", color:"var(--onyx-text)",
      fontFamily:"-apple-system, BlinkMacSystemFont, system-ui, sans-serif",
      background:
        "radial-gradient(ellipse 55% 45% at 18% 0%, rgba(77,208,255,0.16), transparent 60%)," +
        "radial-gradient(ellipse 50% 40% at 85% 5%, rgba(255,181,71,0.12), transparent 60%)," +
        "radial-gradient(ellipse 60% 45% at 75% 90%, rgba(180,141,255,0.14), transparent 60%)," +
        "var(--bg-page, #06080d)",
    }}>
      <SEO {...staticPages.find(p => p.path === "/pricing")} />
      <div style={{ maxWidth:1120, margin:"0 auto", padding:"64px 24px 64px" }}>

        {/* Hero — one free tier, no card required */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: EASE_OUT }}
          style={{ marginBottom:40 }}>
          <h1 style={{ margin:"0 0 12px", textAlign:"center", fontSize:"clamp(2rem, 5vw, 3rem)", fontWeight:700,
            background:"linear-gradient(100deg, #fff 30%, #9eecff 55%, #ffcf8f 75%, #fff 95%)",
            WebkitBackgroundClip:"text", backgroundClip:"text", color:"transparent" }}>
            Onyx is free
          </h1>
          <p style={{ fontSize:18, color:"var(--onyx-text-dim)", margin:"0 0 20px", textAlign:"center" }}>
            No card. No trial. No plan to pick.
          </p>
          <Checklist style={{ maxWidth:420, margin:"0 auto 24px" }} />
          <div style={{ textAlign:"center" }}>
            <a href="/signup" className="press-btn" style={{ display:"inline-block", padding:"16px 40px", borderRadius:10, fontWeight:700, fontSize:16,
              background:"linear-gradient(180deg,#5edcff,#2db8ee)", color:"var(--btn-primary-text)", textDecoration:"none" }}>
              Get Started Free
            </a>
          </div>
        </motion.div>

        {/* What credits buy */}
        <div style={{ marginBottom:32 }}>
          <h2 style={{ fontSize:24, fontWeight:600, margin:"0 0 8px", color:"var(--onyx-text)", textAlign:"center" }}>What do credits buy?</h2>
          <p style={{ fontSize:14, color:"var(--onyx-text-dim)", margin:"0 0 20px", textAlign:"center" }}>
            Everything above is free. Credits are only spent on AI generation and clean (watermark-free) downloads.
          </p>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(220px, 1fr))", gap:20 }}>
            {FEATURE_ITEMS.map((item, i) => (
              <motion.div key={item.feature} custom={i} initial="hidden" animate="show" variants={fadeUp}
                style={{ background:"var(--onyx-surface)", border:"0.5px solid var(--onyx-hairline-strong)",
                  borderTop:`3px solid ${item.accent}`, borderRadius:12, padding:"20px 24px" }}>
                <div style={{ fontSize:15, fontWeight:600, color:"var(--onyx-text)", marginBottom:4 }}>{item.feature}</div>
                <div style={{ fontSize:20, fontWeight:700, color:item.accent, marginBottom:4 }}>{item.cost}</div>
                <div style={{ fontSize:12, color:"var(--onyx-text-faint)" }}>{item.note}</div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Credit packs */}
        <div id="buy-credits" style={{ marginBottom:32 }}>
          <h2 style={{ fontSize:24, fontWeight:600, margin:"0 0 8px", color:"var(--onyx-text)" }}>Buy credits</h2>
          <p style={{ fontSize:14, color:"var(--onyx-text-dim)", margin:"0 0 20px" }}>One-time purchase, never expires.</p>
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            {CREDIT_PACKS.map((pack, i) => (
              <CreditPack key={pack.priceKey} {...pack} index={i} busy={busy} setBusy={setBusy} />
            ))}
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
              accent="var(--onyx-violet)"
              index={0}
              busy={busy} setBusy={setBusy}
            />
            <AddonCard
              priceKey="autopost"
              title="Auto-posting"
              desc="Auto-publish to YouTube & LinkedIn today, with Instagram & TikTok Shorts coming once Meta app review clears. Includes scheduler, retry logic & analytics."
              price="$15/mo"
              accent="var(--onyx-amber)"
              index={1}
              busy={busy} setBusy={setBusy}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
