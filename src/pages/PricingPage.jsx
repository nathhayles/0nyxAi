import "../styles/pricing.css";
import React, { useState } from "react";
import { supabase } from "../supabaseClient.js";
import SEO from "../components/SEO";

const PRICE_IDS = {
  student_monthly: "price_1TfBBoAjJ51auCbILJR43Jwo",
  starter_monthly: "price_1Sj8MXAjJ51auCbIlIG2D1Vw",
  creator_monthly: "price_1Sv9dYAjJ51auCbI722YseS8",
  pro_monthly:     "price_1SvDvlAjJ51auCbI7KrLiyCl",
  agency_monthly:  "price_1TfB9yAjJ51auCbI2jOqnk3n",
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

const PricingCard = ({ planKey, plan, price, desc, features, highlighted, busy, setBusy }) => {
  const priceKey = `${planKey}_monthly`;
  const isBusy = busy === priceKey;
  return (
    <div style={{
      borderRadius:16, padding:28, position:"relative",
      background:"var(--onyx-surface)",
      border: highlighted ? "1px solid var(--onyx-cyan)" : "0.5px solid var(--onyx-hairline-strong)",
      boxShadow: highlighted ? "0 0 0 1px var(--onyx-cyan), 0 18px 48px rgba(77,208,255,0.12)" : "none",
      backdropFilter:"blur(18px)",
    }}>
      {highlighted && (
        <div style={{ position:"absolute", top:-12, right:22, padding:"4px 12px", borderRadius:999,
          background:"linear-gradient(180deg,#5edcff,#2db8ee)", color:"var(--btn-primary-text)", fontSize:11.5, fontWeight:600 }}>Most Popular</div>
      )}
      <h3 style={{ fontSize:19, fontWeight:600, margin:"0 0 8px", color:"var(--onyx-text)" }}>{plan}</h3>
      <p style={{ fontSize:13.5, lineHeight:1.5, color:"var(--onyx-text-dim)", margin:"0 0 22px", minHeight:40 }}>{desc}</p>
      <div style={{ display:"flex", alignItems:"baseline", gap:4, marginBottom:22 }}>
        <span style={{ fontSize:44, fontWeight:700, letterSpacing:"-0.03em", color:"var(--onyx-text)" }}>
          {price}
        </span>
      </div>
      <ul style={{ listStyle:"none", padding:0, margin:"0 0 22px", display:"flex", flexDirection:"column", gap:10 }}>
        {features.map((f,i) => (
          <li key={i} style={{ display:"flex", gap:10, alignItems:"flex-start" }}>
            <span style={{ color:"var(--onyx-success)", fontWeight:700, flexShrink:0 }}>✔</span>
            <span style={{ fontSize:13, lineHeight:1.45, color:"var(--onyx-text)" }}>{f}</span>
          </li>
        ))}
      </ul>
      <button
        disabled={isBusy}
        onClick={() => startCheckout(priceKey, setBusy)}
        style={{
          width:"100%", padding:11, fontWeight:600, borderRadius:10, cursor:"pointer", fontSize:14,
          background: highlighted ? "linear-gradient(180deg,#5edcff,#2db8ee)" : "var(--chip-bg)",
          color: highlighted ? "var(--btn-primary-text)" : "var(--onyx-text)",
          border: highlighted ? "none" : "0.5px solid var(--onyx-hairline-strong)",
        }}
      >{isBusy ? "Redirecting…" : "Start Now"}</button>
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

export default function PricingPage() {
  const [busy, setBusy] = useState(null);

  const plans = [
    { planKey:"student", plan:"Student", price:"$7/mo",
      desc:"For students and learners",
      features:["200 mins/month stock video","Standard AI voiceover included","Stock video & images — free","Stock music library — free","1 brand preset","Unlimited projects","Campaign Generator","MP4 download — no watermark","AI video generation — credits only","Avatar presenter — credits only","Reel translation — credits only","No auto-posting","Email support"] },

    { planKey:"starter", plan:"Starter", price:"$19/mo",
      desc:"For solo creators",
      features:["500 credits/month","600 mins/month stock video","Standard AI voiceover — 400 mins/month","Stock video & images — free","Stock music library — free","1 brand preset","Unlimited projects","Campaign Generator","MP4 download — no watermark","AI video generation — 50 credits/scene","Premium voiceover — credits only","Avatar presenter — credits only","Reel translation — credits only","Email support"] },

    { planKey:"creator", plan:"Creator", price:"$39/mo",
      desc:"For growing creators", highlighted: true,
      features:["1,500 credits/month","1,200 mins/month stock video","Standard AI voiceover — 800 mins/month","Stock video & images — free","Stock music library — free","3 brand presets","Unlimited projects","Campaign Generator","MP4 download — no watermark","AI video generation — 50 credits/scene","Premium voiceover — credits only","Avatar presenter — credits only","Reel translation — credits only","Priority support"] },

    { planKey:"pro", plan:"Pro", price:"$99/mo",
      desc:"For power users",
      features:["4,000 credits/month","Unlimited stock video","Standard AI voiceover — 1,500 mins/month","Stock video & images — free","Stock music library — free","8 brand presets","Unlimited projects","Campaign Generator","Auto-posting — Instagram, YouTube, LinkedIn","MP4 download — no watermark","AI video generation — 50 credits/scene","Reel translation — credits only","Priority support + onboarding call"] },

    { planKey:"agency", plan:"Agency", price:"$199/mo",
      desc:"For agencies managing multiple clients",
      features:["10,000 credits/month","Unlimited stock video","Standard AI voiceover — unlimited","Stock video & images — free","Stock music library — free","Unlimited brand presets","Unlimited projects","Campaign Generator","Auto-posting — Instagram, YouTube, LinkedIn","MP4 download — no watermark","AI video generation — 50 credits/scene","Reel translation — credits only","Dedicated support"] },
  ];

  return (
    <div style={{ minHeight:"100vh", background:"var(--bg-page)", color:"var(--onyx-text)",
      fontFamily:"-apple-system, BlinkMacSystemFont, system-ui, sans-serif", padding:"72px 40px 80px" }}>
      <SEO
        title="Pricing — AI Video Editing Software"
        description="Plans for Onyx Reelz, the AI video editing software with AI generation, voiceover, captions, and auto-posting. Plans from $7/month, billed via Stripe."
        path="/pricing"
      />
      <div style={{ maxWidth:1120, margin:"0 auto" }}>

        {/* Hero */}
        <div style={{ textAlign:"center", marginBottom:44 }}>
          <h1 className="page-title" style={{ margin:"0 0 16px" }}>
            Simple, scalable pricing
          </h1>
          <p style={{ fontSize:18, color:"var(--onyx-text-dim)", margin:"0 0 8px" }}>
            Create, edit and publish AI videos faster than ever.
          </p>
        </div>


        {/* Plans */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(5, 1fr)", gap:20, marginBottom:48 }}>
          {plans.map(p => <PricingCard key={p.planKey} {...p} busy={busy} setBusy={setBusy} />)}
        </div>

        {/* Auto-posting add-on */}
        <div style={{ marginBottom:48 }}>
          <h2 style={{ fontSize:24, fontWeight:600, margin:"0 0 16px", color:"var(--onyx-text)" }}>Add-ons</h2>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
            padding:"24px 28px", borderRadius:16,
            background:"var(--onyx-surface)", border:"0.5px solid var(--onyx-hairline-strong)" }}>
            <div style={{ flex:1 }}>
              <h4 style={{ fontSize:17, fontWeight:600, margin:"0 0 6px", color:"var(--onyx-text)" }}>Auto-posting</h4>
              <p style={{ fontSize:13.5, color:"var(--onyx-text-dim)", margin:"0 0 10px", lineHeight:1.5 }}>
                Auto-publish to Instagram, YouTube Shorts & LinkedIn. Includes scheduler, retry logic & analytics.
              </p>
              <span style={{ padding:"3px 10px", borderRadius:999, fontSize:11, fontWeight:600,
                background:"rgba(77,208,255,0.12)", color:"var(--onyx-cyan)",
                border:"0.5px solid rgba(77,208,255,0.3)" }}>14-day free trial</span>
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:16, marginLeft:24, flexShrink:0 }}>
              <span style={{ fontSize:22, fontWeight:700, color:"var(--onyx-text)" }}>$15/mo</span>
              <button disabled={busy==="autopost"} onClick={() => startCheckout("autopost", setBusy)}
                style={{ padding:"10px 20px", borderRadius:10, fontWeight:600, fontSize:14, cursor:"pointer",
                  background:"linear-gradient(180deg,#5edcff,#2db8ee)", color:"var(--btn-primary-text)", border:"none" }}>
                {busy==="autopost" ? "Redirecting…" : "Add to plan"}
              </button>
            </div>
          </div>
        </div>

        {/* Credit packs */}
        <div style={{ marginBottom:48 }}>
          <h2 style={{ fontSize:24, fontWeight:600, margin:"0 0 8px", color:"var(--onyx-text)" }}>Top up credits</h2>
          <p style={{ fontSize:14, color:"var(--onyx-text-dim)", margin:"0 0 20px" }}>Used for AI video generation, extra storage & more.</p>
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            <CreditPack label="Starter pack"  priceKey="credits_500"  price="$5"  credits="500"   busy={busy} setBusy={setBusy} />
            <CreditPack label="Popular"       priceKey="credits_1000" price="$10" credits="1,000" busy={busy} setBusy={setBusy} />
            <CreditPack label="Best value"    priceKey="credits_2500" price="$25" credits="2,500" busy={busy} setBusy={setBusy} />
            <CreditPack label="Agency"        priceKey="credits_5000" price="$50" credits="5,000" busy={busy} setBusy={setBusy} />
          </div>
        </div>

        {/* Credit costs */}
        <div>
          <h2 style={{ fontSize:24, fontWeight:600, margin:"0 0 8px", color:"var(--onyx-text)" }}>What do credits buy?</h2>
          <p style={{ fontSize:14, color:"var(--onyx-text-dim)", margin:"0 0 20px" }}>Credits are used for AI-powered features. Stock content is always free.</p>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(220px, 1fr))", gap:16 }}>
            {[
              { feature:"AI Video Scene",      cost:"50 credits",        note:"Kling 2.6 Pro via fal.ai" },
              { feature:"Premium Voiceover",   cost:"3 credits/scene",   note:"ElevenLabs voices" },
              { feature:"AI Music",            cost:"10 credits",         note:"Google Lyria 3 Pro" },
              { feature:"Avatar Standard",     cost:"200 credits/min",    note:"HeyGen presenter" },
              { feature:"Avatar IV",            cost:"600 credits/min",    note:"Photorealistic" },
              { feature:"Reel Translation",    cost:"300 credits/min",    note:"AI lip sync" },
            ].map(item => (
              <div key={item.feature} style={{ background:"var(--onyx-surface)", border:"0.5px solid var(--onyx-hairline-strong)", borderRadius:10, padding:"16px 20px" }}>
                <div style={{ fontSize:15, fontWeight:600, color:"var(--onyx-text)", marginBottom:4 }}>{item.feature}</div>
                <div style={{ fontSize:20, fontWeight:700, color:"var(--onyx-cyan)", marginBottom:4 }}>{item.cost}</div>
                <div style={{ fontSize:12, color:"var(--onyx-text-faint)" }}>{item.note}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
