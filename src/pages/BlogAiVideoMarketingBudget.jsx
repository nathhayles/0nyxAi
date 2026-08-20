import { Link } from "react-router-dom";
import BlogPageLayout from "../components/BlogPageLayout";
import PromptResultShowcase from "../components/PromptResultShowcase";
import { blogPosts } from "../data/blogPostsSeo";

const h2Style = { fontSize: 20, fontWeight: 700, color: "var(--onyx-text)", marginTop: 36, marginBottom: 12 };
const pStyle = { color: "var(--onyx-text-dim)", fontSize: 15, marginBottom: 16 };
const bulletStyle = { ...pStyle, marginBottom: 8, paddingLeft: 16 };

export default function BlogAiVideoMarketingBudget() {
  return (
    <BlogPageLayout
      seo={blogPosts.find((p) => p.path === "/blog/ai-video-marketing-budget")}
    >
      <p style={{ color: "var(--onyx-text-dim)", fontSize: 15, marginBottom: 32 }}>
        "AI video for marketing" usually turns up two kinds of answer: vague
        advice with no real numbers, or a pricing page you have to reverse-
        engineer yourself. Here's the actual model-by-model tradeoff — with
        real generations, not mockups, at each price point.
      </p>

      <h2 style={h2Style}>Budget tier: fast, cheap, genuinely usable</h2>
      <p style={pStyle}>
        Budget-tier models like Wan 2.5 are the right default for anything
        you're iterating on — testing a hook, trying five variations of an
        opening shot, or producing volume content where every clip doesn't
        need to be a hero shot. The tradeoff isn't "looks bad" so much as
        slightly less fine detail and motion coherence than premium models —
        for a lot of marketing content, that's a tradeoff worth making.
      </p>
      <PromptResultShowcase
        label="Real Wan 2.5 generation"
        videoUrl="https://pub-31e667ae894f4cddbf03ae6a7578eff1.r2.dev/kling_d0e769e8-63e0-41c6-bf39-787930bda3b4.mp4"
        prompt="Sleek smartphone on a dark studio table, screen glowing with vibrant short-form video content, camera slowly pushes in, cinematic lighting, shallow depth of field, subtle particle dust in the light beams, premium tech aesthetic, dramatic side lighting, shot on Sony A7, shallow depth of field, film grain, vertical portrait format, mobile-first framing, tight compositional focus."
      />

      <h2 style={h2Style}>Mid-tier: where most brand content lands</h2>
      <p style={pStyle}>
        For content that's actually going out under your brand name —
        product features, recurring social content, anything a customer
        might screenshot — a balanced model like Kling earns its higher cost
        with sharper detail, steadier motion, and support for character
        consistency across scenes if you're using a recurring presenter.
      </p>
      <PromptResultShowcase
        label="Real Kling generation"
        videoUrl="https://pub-31e667ae894f4cddbf03ae6a7578eff1.r2.dev/kling_c57d6f8d-577d-40d7-9f42-93476a8dbd23.mp4"
        prompt="Overhead shot of hands typing quickly and energetically on a sleek laptop keyboard, the screen glowing softly out of focus in the background, fingers moving with purpose and speed. Slow dolly pull back, over-the-shoulder composition with dramatic side lighting, shot on Sony A7, shallow depth of field, film grain, vertical portrait format, mobile-first framing, tight compositional focus."
      />

      <h2 style={h2Style}>The real budget move: match the model to the shot, not the whole video</h2>
      <p style={pStyle}>
        The biggest cost mistake isn't picking an expensive model — it's
        using ONE model for every scene in a reel regardless of what that
        scene actually needs. A five-scene marketing reel rarely needs five
        premium generations:
      </p>
      <p style={bulletStyle}>— B-roll and transitional shots: budget tier</p>
      <p style={bulletStyle}>— Your one hero shot — a product reveal, the opening hook: premium tier</p>
      <p style={bulletStyle}>— Anything with a recurring on-screen presenter: whichever tier supports character consistency, since re-generating a mismatched face costs more than the tier upgrade would have</p>
      <p style={pStyle}>
        Mixing tiers scene-by-scene inside one reel is normal, not a
        compromise — it's how the cost-to-quality tradeoff is actually meant
        to work.
      </p>

      <h2 style={h2Style}>What actually drives the bill up</h2>
      <p style={pStyle}>
        Beyond which model you pick, two other factors matter more than most
        people expect:
      </p>
      <p style={bulletStyle}>
        <strong style={{ color: "var(--onyx-text)" }}>Resolution.</strong>{" "}
        Jumping to full 1080p can double or triple the cost of the identical
        clip — worth it for a hero shot, rarely worth it for background
        b-roll no one is pausing to inspect.
      </p>
      <p style={bulletStyle}>
        <strong style={{ color: "var(--onyx-text)" }}>Re-generations.</strong>{" "}
        A vague prompt that needs three attempts to get right costs more
        than a specific prompt that nails it once — see our{" "}
        <Link to="/learn/kling-prompting" style={{ color: "var(--onyx-cyan)" }}>Kling Prompting Guide</Link>{" "}
        for the structure that gets a usable result on the first try more
        often.
      </p>

      <h2 style={h2Style}>Avoid the subscription trap</h2>
      <p style={pStyle}>
        A lot of AI video platforms sell monthly credit allotments that
        don't roll over — use them or lose them at renewal. For marketing
        work specifically, where output volume swings with your campaign
        calendar, that structure quietly costs you for capacity you don't
        use in a slow month. Flat, non-expiring credits — pay for what you
        actually generate — line up much better with how marketing content
        actually gets made: in bursts, not a steady monthly drip.
      </p>

      <p style={{ ...pStyle, marginBottom: 0 }}>
        See real, current per-model pricing and try the tier mix yourself on{" "}
        <Link to="/create" style={{ color: "var(--onyx-cyan)" }}>Create</Link>.
      </p>
    </BlogPageLayout>
  );
}
