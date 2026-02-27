import React from "react";

const TRANSITIONS = [
  { value: "cut", label: "Cut" },
  { value: "fade", label: "Fade" },
  { value: "slide", label: "Slide" },
  { value: "zoom", label: "Zoom" },
];

function thumbText(scene) {
  const a = (scene.narration || "").trim();
  const b = (scene.action || "").trim();
  const t = (a || b || "").slice(0, 36);
  return t.length ? t : `Scene ${scene.id}`;
}

export default function SceneStrip({
  scenes,
  activeScene,
  setActiveScene,
  onDuplicate,
  onDelete,
  onTransitionChange,
}) {
  return (
    <div className="sceneStrip">
      {scenes.map((sc, idx) => (
        <React.Fragment key={sc.id}>
          <div
            className={"sceneThumb" + (sc.id === activeScene ? " active" : "")}
            onClick={() => setActiveScene(sc.id)}
            title={`Scene ${sc.id}`}
          >
            <div className="sceneThumbTop">
              <div className="sceneThumbTitle">Scene {sc.id}</div>
              <div className="sceneThumbBtns">
                <button
                  className="thumbBtn"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDuplicate(sc.id);
                  }}
                >
                  Duplicate
                </button>
                <button
                  className="thumbBtn danger"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(sc.id);
                  }}
                >
                  Delete
                </button>
              </div>
            </div>

            <div className="sceneThumbMedia">
              {sc.thumbnail ? (
                <img src={sc.thumbnail} alt={`Scene ${sc.id}`} />
              ) : (
                <div className="thumbPlaceholder">
                  <div className="thumbPlaceholderText">{thumbText(sc)}</div>
                </div>
              )}
            </div>

            <div className="sceneThumbMeta">
              <span>{sc.isAiGenerated ? "AI" : (sc.mode || "ai").toUpperCase()}</span>
              <span>{sc.generatedAt ? "Generated" : "—"}</span>
            </div>
          </div>

          {idx < scenes.length - 1 && (
            <div className="transitionChip" title="Transition to next scene">
              <div className="transitionLabel">Transition</div>
              <select
                value={sc.transitionToNext || "cut"}
                onChange={(e) => onTransitionChange(sc.id, e.target.value)}
              >
                {TRANSITIONS.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}
