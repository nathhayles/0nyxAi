import { Link } from "react-router-dom";
import LearnPageLayout from "../components/LearnPageLayout";

const h2Style = { fontSize: 20, fontWeight: 700, color: "var(--onyx-text)", marginTop: 36, marginBottom: 12 };
const pStyle = { color: "var(--onyx-text-dim)", fontSize: 15, marginBottom: 16 };
const olStyle = { color: "var(--onyx-text-dim)", fontSize: 15, marginBottom: 16, paddingLeft: 20 };
const liStyle = { marginBottom: 10 };

export default function LearnKlingPrompting() {
  return (
    <LearnPageLayout
      seo={{
        title: "Kling Prompting Guide",
        description: "How to write prompts that get the most out of Kling video generation on Onyx Reelz.",
        path: "/learn/kling-prompting",
      }}
    >
      <Link to="/learn" style={{ fontSize: 13, color: "var(--onyx-text-faint)", textDecoration: "none", display: "inline-block", marginBottom: 16 }}>&larr; Back to Learn</Link>
      <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 8 }}>Kling Prompting Guide</h1>
      <p style={{ color: "var(--onyx-text-dim)", fontSize: 15, marginBottom: 32 }}>
        How to write prompts that get the most out of Kling video generation.
      </p>

      <h2 style={h2Style}>How Kling reads a prompt</h2>
      <p style={pStyle}>
        Kling is built to understand natural, cinematic language rather than
        keyword tags or comma-separated descriptors. Think of it less like
        typing search terms and more like handing a director a shot list. The
        clearer and more concrete your sentence, the more reliably Kling
        translates it into motion, framing, and mood.
      </p>
      <p style={pStyle}>
        This matters because Kling — like most video models — weights the
        beginning of a prompt more heavily than the end. If your subject and
        action are buried under a long style preamble, the model has less
        "room" to prioritize them. Lead with what's happening, then layer in
        how it looks.
      </p>

      <h2 style={h2Style}>The four-part structure</h2>
      <p style={pStyle}>Every strong Kling prompt covers four things, roughly in this order:</p>
      <ol style={olStyle}>
        <li style={liStyle}>
          <strong style={{ color: "var(--onyx-text)" }}>Subject &amp; action.</strong> Who or what is in frame, and what single
          thing are they doing? Avoid vague verbs — "walks purposefully toward
          the door" gives Kling more to work with than "walks."
        </li>
        <li style={liStyle}>
          <strong style={{ color: "var(--onyx-text)" }}>Camera movement.</strong> How does the camera itself move during the
          shot? A dolly-in reads very differently from a static locked shot,
          even with an identical subject.
        </li>
        <li style={liStyle}>
          <strong style={{ color: "var(--onyx-text)" }}>Shot composition.</strong> Where is the camera relative to the subject —
          close-up, wide establishing shot, low angle, high angle? This is a
          separate decision from camera movement, and both matter. See our{" "}
          <Link to="/learn/camera-glossary" style={{ color: "var(--onyx-cyan)" }}>Camera Glossary</Link>{" "}
          for the full list.
        </li>
        <li style={liStyle}>
          <strong style={{ color: "var(--onyx-text)" }}>Lighting &amp; style.</strong> The mood and visual language — "golden hour
          rim lighting," "harsh fluorescent overhead light," "shot on 35mm
          film, shallow depth of field."
        </li>
      </ol>
      <p style={pStyle}>
        Onyx Reelz automatically fills in camera movement and shot composition
        if you don't specify them yourself, rotating through a real set of
        cinematic techniques so your scenes don't all look the same. But if you
        have a specific vision, naming it directly in your prompt always takes
        priority — the system detects and preserves any camera or composition
        language you've already written.
      </p>

      <h2 style={h2Style}>Why one action per scene matters</h2>
      <p style={pStyle}>
        Kling generates short clips, typically 5 or 10 seconds. Cramming
        multiple actions into that window — "she walks to the window, turns,
        and smiles" — forces the model to compress three distinct beats into a
        handful of seconds, which usually produces something rushed or
        ambiguous rather than three clean moments. Pick the single beat that
        matters most for this scene, and let the next scene in your reel carry
        the story forward.
      </p>

      <h2 style={h2Style}>Reference tags: @Element1, @Element2</h2>
      <p style={pStyle}>
        When you tag a Character from your library directly in a prompt —
        @Element1 — Kling doesn't render that text on screen. Instead, it binds
        the tag to the actual reference photo or video you've attached, using
        it to anchor appearance or motion. If you're combining a character
        reference with a separate motion reference clip, they get separate tags
        (@Element1, @Element2), each pointing to its own source material.
      </p>
      <p style={pStyle}>
        This is a fundamentally different mechanism from typing a physical
        description. A written description like "tall woman with curly brown
        hair" gets reinterpreted by the model on every single generation —
        subtly different each time. A tagged reference photo gives Kling
        something concrete and consistent to work from.
      </p>

      <h2 style={h2Style}>Character consistency across scenes</h2>
      <p style={pStyle}>
        For a character to genuinely look the same from scene to scene, use the
        Character Library rather than repeated text descriptions. Upload two or
        more real reference photos to a Character, then tag them in your scene
        prompts. Turn on Character Lock for multi-scene pipelines, and Onyx
        Reelz automatically carries the character's appearance forward —
        including a real extracted frame from the previous scene — so
        continuity holds without you managing it manually.
      </p>

      <h2 style={h2Style}>A note on negative space</h2>
      <p style={pStyle}>
        Kling — like every model on Onyx Reelz — is instructed never to render
        visible text, words, or on-screen signage, since AI video models tend
        to render text as garbled nonsense. If your scene genuinely needs a
        sign or label, it's usually better handled in post as a caption overlay
        rather than requested in the prompt itself.
      </p>

      <h2 style={h2Style}>When to reach for Kling</h2>
      <p style={pStyle}>
        Kling is our balanced, default model — strong general quality across
        most content types, with full support for character consistency and
        motion reference. It's the model most Onyx Reelz reels are built on. It
        doesn't support seed-locking (see our Wan and Veo guides for that
        workflow), so treat each generation as its own attempt rather than
        something to fine-tune iteratively with a fixed seed.
      </p>

      <p style={{ ...pStyle, marginBottom: 0 }}>
        Ready to try it? <Link to="/create" style={{ color: "var(--onyx-cyan)" }}>Start creating</Link> with Kling on Onyx Reelz.
      </p>
    </LearnPageLayout>
  );
}
