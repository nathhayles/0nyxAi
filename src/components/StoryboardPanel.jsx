import React from "react";

export default function StoryboardPanel({
  scenes,
  activeScene,
  setActiveScene,
  updateScenes,
  onSaveScene,
  onGenerateScene,
}) {
  const updateField = (sceneId, field, value) => {
    const next = scenes.map((sc) => (sc.id === sceneId ? { ...sc, [field]: value } : sc));
    updateScenes(next);
  };

  return (
    <div>
      {scenes.map((sc) => (
        <div
          key={sc.id}
          className={"sceneCard" + (sc.id === activeScene ? " active" : "")}
          onClick={() => setActiveScene(sc.id)}
        >
          <div className="sceneHeaderRow">
            <div className="sceneTitle">Scene {sc.id}</div>

            <select
              value={sc.mode || "ai"}
              onChange={(e) => updateField(sc.id, "mode", e.target.value)}
              onClick={(e) => e.stopPropagation()}
            >
              <option value="ai">AI</option>
              <option value="manual">Manual</option>
            </select>

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
              onClick={(e) => {
                e.stopPropagation();
                onGenerateScene(sc.id);
              }}
            >
              Generate
            </button>
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

          <div className="sceneMetaRow">
            <span className="meta">
              {sc.savedAt ? `Saved: ${new Date(sc.savedAt).toLocaleTimeString()}` : "Not saved"}
            </span>
            <span className="meta">
              {sc.generatedAt ? `Generated: ${new Date(sc.generatedAt).toLocaleTimeString()}` : "Not generated"}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
