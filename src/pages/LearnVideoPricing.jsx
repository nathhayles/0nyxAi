import { Link } from "react-router-dom";
import LearnPageLayout from "../components/LearnPageLayout";
import { learnPages } from "../data/learnPagesSeo";

const h2Style = { fontSize: 20, fontWeight: 700, color: "var(--onyx-text)", marginTop: 36, marginBottom: 12 };
const pStyle = { color: "var(--onyx-text-dim)", fontSize: 15, marginBottom: 16 };
const bulletStyle = { ...pStyle, marginBottom: 8, paddingLeft: 16 };

export default function LearnVideoPricing() {
  return (
    <LearnPageLayout
      seo={learnPages.find(p => p.path === "/learn/ai-video-pricing")}
    >
      <p style={{ color: "var(--onyx-text-dim)", fontSize: 15, marginBottom: 32 }}>
        AI video pricing is confusing on purpose, or at least it ends up that
        way. Credit systems, subscription tiers, "unlimited" plans with
        asterisks, and pricing pages that don't match what you're actually
        charged — it's a lot to untangle before you've generated a single
        clip. Here's a straight answer: what AI video generation actually
        costs, what drives the price up or down, and what to watch out for.
      </p>

      <h2 style={h2Style}>What actually determines the cost of one clip</h2>
      <p style={pStyle}>Three factors do almost all the work:</p>
      <p style={bulletStyle}>
        <strong style={{ color: "var(--onyx-text)" }}>Which model you use.</strong>{" "}
        Budget-tier models can cost a fraction of premium ones for the same
        clip length — the underlying AI model matters more than almost
        anything else.
      </p>
      <p style={bulletStyle}>
        <strong style={{ color: "var(--onyx-text)" }}>Resolution.</strong>{" "}
        Going from a budget resolution to full 1080p commonly doubles or
        triples the price of the exact same clip.
      </p>
      <p style={bulletStyle}>
        <strong style={{ color: "var(--onyx-text)" }}>Duration.</strong> Longer
        clips cost more, obviously — but <em>how</em> pricing scales matters.
        Some platforms charge per-second (so an 8-second clip costs
        proportionally more than a 5-second one); others bucket you into
        fixed tiers regardless of the exact length you asked for.
      </p>

      <h2 style={h2Style}>The subscription trap to watch for</h2>
      <p style={pStyle}>
        A lot of AI video platforms sell subscription tiers with monthly
        credit allotments that <strong style={{ color: "var(--onyx-text)" }}>don't roll over</strong> —
        use them or lose them at renewal. If your usage is inconsistent month
        to month, you can end up paying for capacity you never touch.
      </p>
      <p style={pStyle}>Watch for these specific patterns before committing to a plan:</p>
      <p style={bulletStyle}>— Credits that expire and reset every billing cycle, even if unused</p>
      <p style={bulletStyle}>— "Unlimited" tiers that quietly exclude certain tools (automation, API access, batch generation) from the unlimited pool</p>
      <p style={bulletStyle}>— Annual billing presented as the default option, with monthly buried as a smaller link</p>
      <p style={pStyle}>
        None of these are dealbreakers on their own — but they add up to
        real, avoidable cost if you're not watching for them.
      </p>

      <h2 style={h2Style}>A rough real-world cost range</h2>
      <p style={pStyle}>
        Based on current market rates across major AI video providers, a
        single 5-second clip typically runs anywhere from a few cents to a
        couple of dollars, depending entirely on which model and resolution
        you choose. The gap between the cheapest and most expensive options
        for the <em>same length clip</em> can be 10x or more — which is
        exactly why comparing models matters more than comparing platforms.
      </p>

      <h2 style={h2Style}>How Onyx Reelz prices video generation</h2>
      <p style={pStyle}>
        We built Onyx Reelz around flat, transparent per-model credit pricing
        — no expiring monthly allotments, no "unlimited" tier with hidden
        exclusions. What you see is what you pay:
      </p>
      <p style={bulletStyle}>— Credits never expire on a monthly cycle</p>
      <p style={bulletStyle}>— Every model's real cost is shown before you generate — including the exact credit range across duration and resolution options</p>
      <p style={bulletStyle}>— No subscription required to start — Onyx Reelz has a genuinely free tier with full editor access; you only spend credits on the AI generation itself</p>
      <p style={pStyle}>
        If you've been burned by a platform where the "starting at" price on
        the homepage didn't match your actual bill, transparent
        per-generation pricing is worth prioritizing over a flashy
        subscription tier.
      </p>

      <p style={{ ...pStyle, marginBottom: 0 }}>
        See real, current pricing for every model on Onyx Reelz — no
        guessing, no expiring credits. <Link to="/pricing" style={{ color: "var(--onyx-cyan)" }}>View pricing &rarr;</Link>
      </p>
    </LearnPageLayout>
  );
}
