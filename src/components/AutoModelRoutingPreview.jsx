import React, { useState, useMemo } from "react";

// Auto-Model-Routing's pre-flight per-scene review screen
// (docs/margin-and-feature-scoping-2026-09-08.md Task 2 #3) -- inserted
// between the /api/analyse call and the real /api/kling/ pipeline
// submission in Create.jsx's handleGenerate(). Shows, per scene: the
// prompt/narration, the auto-picked model, a one-line reason, an editable
// override, and the real per-scene cost (already computed server-side by
// POST /api/kling/preview-auto-model using the exact same heuristic the
// real pipeline submission will use for billing). Nothing here spends
// credits or calls a provider -- purely a review/confirm step, always
// cancelable back to editing the script or picking a different model.
export default function AutoModelRoutingPreview({ preview, modelOptions, onConfirm, onCancel }) {
  const [overrides, setOverrides] = useState({}); // { [sceneIndex]: modelId }

  const effectiveScenes = useMemo(() => preview.scenes.map(s => ({
    ...s,
    effectiveModel: overrides[s.sceneIndex] || s.model,
  })), [preview.scenes, overrides]);

  function modelLabel(id) {
    return modelOptions.find(m => m.id === id)?.label || id;
  }

  function setOverride(sceneIndex, modelId) {
    setOverrides(prev => ({ ...prev, [sceneIndex]: modelId }));
  }

  return (
    <div className="auto-model-overlay" onClick={e => e.target === e.currentTarget && onCancel()}>
      <div className="auto-model-modal">
        <div className="auto-model-header">
          <span>Review the auto-picked models</span>
          <button className="auto-model-close" onClick={onCancel} aria-label="Close">✕</button>
        </div>
        <div className="auto-model-body">
          <p className="auto-model-hint">
            Auto routing picked a model for each scene based on its content (character references, dialogue,
            motion, audio). Override any scene below before generating.
          </p>

          <div className="auto-model-scenes">
            {effectiveScenes.map(s => (
              <div key={s.sceneIndex} className="auto-model-scene-row">
                <div className="auto-model-scene-num">{s.sceneIndex + 1}</div>
                <div className="auto-model-scene-main">
                  <div className="auto-model-scene-text">{s.narration || s.visual_direction || "(no narration)"}</div>
                  <div className="auto-model-scene-reason">{s.reason}</div>
                </div>
                <div className="auto-model-scene-controls">
                  <select
                    className="auto-model-select"
                    value={s.effectiveModel}
                    onChange={(e) => setOverride(s.sceneIndex, e.target.value)}
                  >
                    {modelOptions.filter(m => m.id !== "auto").map(m => (
                      <option key={m.id} value={m.id}>{m.label}</option>
                    ))}
                  </select>
                  {/* s.cost is the auto-picked model's real server-computed
                      cost -- once overridden to a different model, the exact
                      new cost isn't known client-side without a second round
                      trip, so this is marked an estimate rather than shown
                      as if it were precise. The real charge always matches
                      what actually generates, per the total note below. */}
                  <div className="auto-model-scene-cost">
                    {overrides[s.sceneIndex] ? "cost varies by model" : `${s.cost} cr`}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="auto-model-total">
            {Object.keys(overrides).length > 0 ? (
              <span>Estimated total (auto picks): <strong>{preview.totalCost} credits</strong> — some scenes overridden above, real total may differ</span>
            ) : (
              <span>Total: <strong>{preview.totalCost} credits</strong></span>
            )}
            <span className="auto-model-total-note">The final charge always matches what actually generates, not this estimate.</span>
          </div>

          <div className="auto-model-actions">
            <button className="btn btn-ghost" onClick={onCancel}>Cancel</button>
            <button className="btn btn-primary" onClick={() => onConfirm(overrides)}>Generate</button>
          </div>
        </div>
      </div>

      <style>{`
        .auto-model-overlay {
          position: fixed; inset: 0; z-index: 9999;
          background: rgba(0,0,0,0.75);
          display: flex; align-items: center; justify-content: center;
          padding: 20px;
        }
        .auto-model-modal {
          background: #161616; border: 1px solid #2a2a2a; border-radius: 16px;
          width: 100%; max-width: 640px; max-height: 85vh; overflow-y: auto;
          display: flex; flex-direction: column;
        }
        .auto-model-header {
          display: flex; align-items: center; gap: 10px;
          padding: 16px 20px; border-bottom: 1px solid #222;
          font-weight: 700; font-size: 16px; color: #fff;
          position: sticky; top: 0; background: #161616; z-index: 1;
        }
        .auto-model-close { margin-left: auto; background: none; border: none; color: #666; cursor: pointer; font-size: 14px; }
        .auto-model-close:hover { color: #fff; }
        .auto-model-body { padding: 20px; display: flex; flex-direction: column; gap: 16px; }
        .auto-model-hint { margin: 0; font-size: 12.5px; line-height: 1.5; color: #999; }
        .auto-model-scenes { display: flex; flex-direction: column; gap: 8px; }
        .auto-model-scene-row {
          display: flex; align-items: flex-start; gap: 10px;
          padding: 10px 12px; border: 1px solid #262626; border-radius: 10px;
        }
        .auto-model-scene-num {
          width: 20px; height: 20px; border-radius: 50%; background: #222;
          color: #aaa; font-size: 11px; font-weight: 700;
          display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 2px;
        }
        .auto-model-scene-main { flex: 1; min-width: 0; }
        .auto-model-scene-text { font-size: 13px; color: #eee; line-height: 1.4; }
        .auto-model-scene-reason { font-size: 11.5px; color: #4dd0ff; margin-top: 4px; }
        .auto-model-scene-controls { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; flex-shrink: 0; }
        .auto-model-select {
          background: #1e1e1e; border: 1px solid #2a2a2a; color: #eee;
          border-radius: 6px; padding: 4px 8px; font-size: 12px; max-width: 160px;
        }
        .auto-model-scene-cost { font-size: 11px; color: #888; }
        .auto-model-total {
          font-size: 13px; color: #ccc; padding-top: 8px; border-top: 1px solid #222;
          display: flex; flex-direction: column; gap: 4px;
        }
        .auto-model-total strong { color: #fff; }
        .auto-model-total-note { font-size: 11px; color: #777; }
        .auto-model-actions { display: flex; gap: 10px; justify-content: flex-end; }
        .auto-model-actions .btn {
          padding: 9px 16px; border-radius: 8px; font-size: 13.5px; font-weight: 700;
          cursor: pointer; border: 1px solid transparent;
        }
        .auto-model-actions .btn-primary { background: #4dd0ff; color: #06121b; }
        .auto-model-actions .btn-primary:hover { background: #7de0ff; }
        .auto-model-actions .btn-ghost { background: transparent; border-color: #2a2a2a; color: #aaa; }
        .auto-model-actions .btn-ghost:hover { color: #fff; }
      `}</style>
    </div>
  );
}
