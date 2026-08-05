import { Link } from "react-router-dom";
import LearnPageLayout from "../components/LearnPageLayout";
import { learnPages } from "../data/learnPagesSeo";

const h2Style = { fontSize: 20, fontWeight: 700, color: "var(--onyx-text)", marginTop: 36, marginBottom: 12 };
const pStyle = { color: "var(--onyx-text-dim)", fontSize: 15, marginBottom: 16 };
const bulletStyle = { ...pStyle, marginBottom: 8, paddingLeft: 16 };

export default function LearnEuAiActDisclosure() {
  return (
    <LearnPageLayout
      seo={learnPages.find(p => p.path === "/learn/eu-ai-act-disclosure")}
    >
      <p style={{ color: "var(--onyx-text-dim)", fontSize: 15, marginBottom: 32 }}>
        If you're creating AI-generated video for social media, marketing, or
        content — especially if any of your audience is in the EU — the
        rules just changed. As of <strong style={{ color: "var(--onyx-text)" }}>August 2, 2026</strong>,
        Article 50 of the EU AI Act is in force, and it requires disclosure
        when AI-generated content could be mistaken for something real.
        Here's what actually changed, who it applies to, and what Onyx Reelz
        does to help you stay compliant automatically.
      </p>

      <h2 style={h2Style}>What the EU AI Act actually requires</h2>
      <p style={pStyle}>
        Article 50 covers two separate obligations, and it's worth knowing
        the difference:
      </p>
      <p style={pStyle}>
        <strong style={{ color: "var(--onyx-text)" }}>Deepfake disclosure (in force now).</strong>{" "}
        If your video depicts a real, identifiable person, place, or event in
        a way a viewer could reasonably believe is authentic, you're required
        to disclose that it's AI-generated or AI-manipulated. This has to be
        clear and visible — not buried in a caption, description, or terms of
        service.
      </p>
      <p style={pStyle}>
        <strong style={{ color: "var(--onyx-text)" }}>Machine-readable marking (grace period until December 2, 2026).</strong>{" "}
        Content also needs to carry a technical marker — metadata or a
        watermark — that lets platforms and tools detect it was AI-made.
        Tools already on the market before August 2, 2026 get a grace period
        on this specific requirement, but the disclosure obligation above
        does <strong style={{ color: "var(--onyx-text)" }}>not</strong> have a
        grace period.
      </p>
      <p style={pStyle}>
        This isn't limited to celebrities or public figures. The rule covers{" "}
        <em>any</em> real person — including someone's likeness uploaded as a
        reference photo, not just a name typed into a prompt.
      </p>

      <h2 style={h2Style}>Who this applies to</h2>
      <p style={pStyle}>
        If your audience includes anyone in the EU, this applies to you —
        regardless of where your business is based. Penalties can reach €15
        million or 3% of global annual revenue, whichever is higher, so this
        isn't a rule to treat as optional.
      </p>
      <p style={pStyle}>
        There are real exceptions: clearly artistic, satirical, or fictional
        content gets lighter treatment, and content that's obviously not real
        (impossible scenarios, stylized animation) generally doesn't count as
        a "deepfake" under the Act's definition.
      </p>

      <h2 style={h2Style}>How Onyx Reelz handles this for you</h2>
      <p style={pStyle}>
        Onyx Reelz includes a built-in Real-Person Disclosure system designed
        around these requirements:
      </p>
      <p style={bulletStyle}>
        <strong style={{ color: "var(--onyx-text)" }}>Consent gating</strong> —
        before generating content involving a real, identifiable person,
        you're required to confirm you have the right to use their likeness.
      </p>
      <p style={bulletStyle}>
        <strong style={{ color: "var(--onyx-text)" }}>Automatic disclaimer insertion</strong> —
        flagged content gets a mandatory disclosure scene inserted into the
        export, so the disclosure travels with the video wherever it's
        shared.
      </p>
      <p style={bulletStyle}>
        <strong style={{ color: "var(--onyx-text)" }}>Hard blocklist enforcement</strong> —
        certain high-risk categories (sexual content, financial fraud
        impersonation, political figures near an election) are blocked
        outright, not just flagged.
      </p>
      <p style={pStyle}>
        We built this because we'd rather you never have to think about it —
        but it's still worth understanding the rules yourself, since you're
        the one publishing the content.
      </p>

      <h2 style={h2Style}>The bottom line</h2>
      <p style={pStyle}>
        If you're making AI video that includes real people, disclosure
        isn't optional anymore in the EU — and the safest approach is to
        disclose clearly regardless of where your audience is, since content
        travels. Tools that handle this automatically (rather than leaving it
        entirely on you to remember) are worth prioritizing if compliance
        matters to your business.
      </p>

      <p style={{ ...pStyle, marginBottom: 0 }}>
        Onyx Reelz is an AI-powered video creation platform built for
        creators and marketers who need to move fast without cutting corners
        on compliance. <Link to="/create" style={{ color: "var(--onyx-cyan)" }}>Start creating &rarr;</Link>
      </p>
    </LearnPageLayout>
  );
}
