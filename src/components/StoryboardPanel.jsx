import React from "react";
import HelpTooltip from "./HelpTooltip.jsx";

function normalizeNarrationText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

export default function StoryboardPanel({
  scenes,
  activeScene,
  setActiveScene,
  updateScenes,
  onSaveScene,
  onGenerateScene,
  generatingScenes = {},
}) {
  const updateField = (sceneId, field, value) => {
    const next = scenes.map((sc) => {
      if (sc.id !== sceneId) return sc;

      if (field === "narration") {
        const prevText = normalizeNarrationText(sc.narration || "");
        const nextText = normalizeNarrationText(value);
        const narrationChanged = prevText !== nextText;

        if (narrationChanged) {
          return {
            ...sc,
            narration: value,
            voiceoverStale: !!nextText,
          };
        }
      }

      return { ...sc, [field]: value };
    });

    updateScenes(next);
  };

  return (
    <div>
      {scenes.map((sc, index) => (
        <div
          key={sc.id}
          className={"sceneCard" + (sc.id === activeScene ? " active" : "")}
          onClick={() => setActiveScene(sc.id)}
        >
          <div className="sceneHeaderRow">
            <div className="sceneTitle">{sc.name ?? `Scene ${index + 1}`}</div>

            <div style={{ display: "flex", alignItems: "center", gap: 4 }} onClick={(e) => e.stopPropagation()}>
              <select
                value={sc.mode || "ai"}
                onChange={(e) => updateField(sc.id, "mode", e.target.value)}
              >
                <option value="ai">AI</option>
                <option value="manual">Manual</option>
              </select>
              {(sc.mode || "ai") === "ai" && <HelpTooltip topic="kling" />}
            </div>

            <button
              className="sceneSmallBtn"
              onClick={(e) => {
                e.stopPropagation();
                onSaveScene(sc.id);
              }}
            >
              Save
            </button>

            <button
              className="sceneSmallBtn primary"
              disabled={!!generatingScenes[sc.id]}
              onClick={(e) => {
                e.stopPropagation();
                onGenerateScene(sc.id);
              }}
            >
              {generatingScenes[sc.id]?.status === "submitting"
                ? "Starting…"
                : generatingScenes[sc.id]?.status === "polling"
                ? "Generating…"
                : "Generate"}
            </button>
          </div>

          <div
            style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}
            onClick={(e) => e.stopPropagation()}
          >
            <span style={{ fontSize: 12, opacity: 0.7, marginRight: 2 }}>Duration:</span>
            {[3, 5, 8, 10].map((s) => (
              <button
                key={s}
                className={"sceneSmallBtn" + ((sc.duration || 5) === s ? " primary" : "")}
                onClick={(e) => { e.stopPropagation(); updateField(sc.id, "duration", s); }}
                style={{ minWidth: 34 }}
              >
                {s}s
              </button>
            ))}
          </div>

          <textarea
            placeholder="Narration"
            value={sc.narration || ""}
            onChange={(e) => updateField(sc.id, "narration", e.target.value)}
            onClick={(e) => e.stopPropagation()}
          />

          <textarea
            placeholder="Action / Background"
            value={sc.action || ""}
            onChange={(e) => updateField(sc.id, "action", e.target.value)}
            onClick={(e) => e.stopPropagation()}
          />

          <div
            style={{
              marginTop: 8,
              padding: "8px 10px",
              borderRadius: 8,
              background: "#0c1016",
              border: `1px solid ${(sc.endImageUrl || "").trim() ? "rgba(0,210,255,0.4)" : "rgba(255,255,255,0.08)"}`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: 11, opacity: 0.6, marginBottom: 4 }}>End Frame URL</div>
            <input
              type="url"
              value={sc.endImageUrl || ""}
              onChange={(e) => updateField(sc.id, "endImageUrl", e.target.value)}
              placeholder="https://example.com/end-frame.jpg"
              style={{
                width: "100%",
                padding: "6px 8px",
                borderRadius: 6,
                border: "1px solid rgba(255,255,255,0.1)",
                background: "#06070a",
                color: "#fff",
                fontSize: 12,
                boxSizing: "border-box",
              }}
            />
          </div>

          {sc.mediaType === "video" ? (
            <div
              style={{
                marginTop: 8,
                padding: 10,
                border: "1px solid #2b3442",
                borderRadius: 10,
                background: "#0f141b",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 6 }}>
                Clip Audio
              </div>

              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 8,
                  fontSize: 12,
                }}
              >
                <input
                  type="checkbox"
                  checked={!!sc.sourceAudioMuted}
                  onChange={(e) =>
                    updateField(sc.id, "sourceAudioMuted", e.target.checked)
                  }
                />
                Mute source clip audio
              </label>

              <input
                type="range"
                min="0"
                max="100"
                step="1"
                value={typeof sc.sourceAudioVolume === "number" ? sc.sourceAudioVolume : 100}
                onChange={(e) =>
                  updateField(sc.id, "sourceAudioVolume", Number(e.target.value))
                }
                disabled={!!sc.sourceAudioMuted}
                style={{ width: "100%" }}
              />

              <div style={{ fontSize: 12, opacity: 0.75, marginTop: 6 }}>
                {sc.sourceAudioMuted
                  ? "Muted"
                  : `${typeof sc.sourceAudioVolume === "number" ? sc.sourceAudioVolume : 100}%`}
              </div>
            </div>
          ) : null}

          {/* Captions toggle */}
            <div
              style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, fontSize: 12 }}
              onClick={(e) => e.stopPropagation()}
            >
              <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={sc.captionsEnabled ?? true}
                  onChange={(e) => updateField(sc.id, "captionsEnabled", e.target.checked)}
                />
                Show captions on canvas
              </label>
            </div>

            {/* Trim controls — video only */}
            {sc.mediaType === "video" && (
              <div
                style={{ marginTop: 8, padding: 10, border: "1px solid #2b3442", borderRadius: 10, background: "#0f141b", fontSize: 12 }}
                onClick={(e) => e.stopPropagation()}
              >
                <div style={{ opacity: 0.8, marginBottom: 6 }}>Trim Clip</div>
                <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  Start: {sc.trimStart ?? 0}s
                  <input
                    type="range"
                    min="0"
                    max={sc.trimEnd ?? 30}
                    step="0.1"
                    value={sc.trimStart ?? 0}
                    onChange={(e) => updateField(sc.id, "trimStart", Number(e.target.value))}
                    style={{ flex: 1 }}
                  />
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  End: {sc.trimEnd ?? "full"}s
                  <input
                    type="range"
                    min={sc.trimStart ?? 0}
                    max="120"
                    step="0.1"
                    value={sc.trimEnd ?? 30}
                    onChange={(e) => updateField(sc.id, "trimEnd", Number(e.target.value))}
                    style={{ flex: 1 }}
                  />
                </label>
              </div>
            )}

          <div className="sceneMetaRow">
            <span className="meta">
              {sc.savedAt ? `Saved: ${new Date(sc.savedAt).toLocaleTimeString()}` : "Not saved"}
            </span>
            <span className="meta">
              {sc.generatedAt
                ? `Generated: ${new Date(sc.generatedAt).toLocaleTimeString()}`
                : "Not generated"}
            </span>
            {sc.voiceoverStale ? <span className="meta">Voiceover out of date</span> : null}
          </div>
        </div>
      ))}
    </div>
  );
}