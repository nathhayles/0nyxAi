// Real "prompt -> result" proof-of-concept block for Learn pages: an actual
// generation from Onyx Reelz (video pulled to R2, not a provider URL) shown
// side-by-side with the exact prompt that produced it.
export default function PromptResultShowcase({ videoUrl, prompt, label }) {
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 24,
        alignItems: "stretch",
        background: "var(--onyx-surface)",
        border: "1px solid var(--onyx-hairline-strong)",
        borderRadius: 12,
        padding: 20,
        margin: "24px 0 32px",
      }}
    >
      <div style={{ flex: "0 0 220px" }}>
        <video
          src={videoUrl}
          controls
          loop
          muted
          playsInline
          style={{
            width: "100%",
            borderRadius: 8,
            display: "block",
            background: "#000",
          }}
        />
      </div>
      <div style={{ flex: "1 1 280px", minWidth: 240 }}>
        {label && (
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: 0.4,
              textTransform: "uppercase",
              color: "var(--onyx-cyan)",
              marginBottom: 8,
            }}
          >
            {label}
          </div>
        )}
        <div
          style={{
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: 0.4,
            textTransform: "uppercase",
            color: "var(--onyx-text-faint)",
            marginBottom: 6,
          }}
        >
          Actual prompt used
        </div>
        <p
          style={{
            fontSize: 14,
            lineHeight: 1.6,
            color: "var(--onyx-text-dim)",
            fontStyle: "italic",
            margin: 0,
          }}
        >
          "{prompt}"
        </p>
      </div>
    </div>
  );
}
