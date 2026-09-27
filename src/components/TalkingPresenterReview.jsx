import React from "react";
import { purchasesAllowed, NO_CREDITS_TEXT } from "../utils/nativeApp.js";

// Speaker labels ("@Opal: ") are never spoken, and a mention reads as the
// name -- show the line the way it will sound.
function spokenText(text) {
  return String(text || "").replace(/@([A-Za-z0-9_]+):\s*/g, "").replace(/@([A-Za-z0-9_]+)/g, "$1").trim();
}

// The Create page's review step when Talking presenter is on: every scene
// with its mode (Talking presenter, or the chosen video model) and its exact
// cost, from POST /api/kling/review-pipeline -- the same plan the pipeline
// charges (routes/kling.js planPipeline). Presenter voiceovers were already
// made (or reused) for this review; nothing is charged until Generate.
//
// A presenter scene has a switch to use the video model instead; flipping it
// asks the server again (onToggle), since it can change other scenes' costs
// too (e.g. which scene opens the video chain and gets a start frame).
export default function TalkingPresenterReview({ review, loading, videoModelLabel, credits, onToggle, onConfirm, onCancel }) {
  const scenes = review?.scenes || [];
  const presenterCount = scenes.filter((s) => s.mode === "presenter").length;
  const notEnoughCredits = credits != null && review && review.totalCost > credits;

  return (
    <div className="tp-overlay" onClick={(e) => e.target === e.currentTarget && !loading && onCancel()}>
      <div className="tp-modal" role="dialog" aria-label="Review your reel">
        <div className="tp-header">
          <span>Review your reel</span>
          <button className="tp-close" onClick={onCancel} aria-label="Close">✕</button>
        </div>
        <div className="tp-body">
          <p className="tp-hint">
            {presenterCount
              ? `${presenterCount} scene${presenterCount > 1 ? "s" : ""} will be a Talking presenter: the character speaks the narration to camera, lip-synced. Their voiceovers are ready. Switch any of them to ${videoModelLabel} below.`
              : `Every scene will use ${videoModelLabel}.`}
          </p>

          <div className="tp-scenes">
            {scenes.map((s) => {
              const isPresenter = s.mode === "presenter";
              return (
                <div key={s.sceneIndex} className={"tp-row" + (isPresenter ? " tp-row-presenter" : "")}>
                  <div className="tp-num">{s.sceneIndex + 1}</div>
                  <div className="tp-main">
                    <div className="tp-mode">
                      {isPresenter
                        ? `🎙 Talking presenter · ${s.character} · ${Number(s.seconds).toFixed(1)}s${s.padded ? " (padded to 5s)" : ""}`
                        : videoModelLabel}
                    </div>
                    <div className="tp-text">{spokenText(s.narration) || s.visual_direction || "(no narration)"}</div>
                    {s.presenterNote && <div className="tp-note">{s.presenterNote}</div>}
                    {/* Only for a presenter scene, or one switched to the video
                        model here -- a scene that couldn't be a presenter
                        (its note says why) has nothing to switch. */}
                    {s.canUsePresenter && (isPresenter || s.usingVideoModelByChoice) && (
                      <label className="tp-switch">
                        <input
                          type="checkbox"
                          checked={!isPresenter}
                          disabled={loading}
                          onChange={(e) => onToggle(s.sceneIndex, e.target.checked)}
                        />
                        Use {videoModelLabel} instead
                      </label>
                    )}
                  </div>
                  <div className="tp-cost">
                    <div className="tp-cost-total">{s.cost} cr</div>
                    <div className="tp-cost-split">
                      {isPresenter
                        ? `${s.startFrameCredits} start frame + ${s.lipSyncCredits} lip-sync`
                        : s.startFrameCredits ? `incl. ${s.startFrameCredits} start frame` : ""}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="tp-total">
            <span>Total: <strong>{loading ? "updating…" : `${review?.totalCost ?? "—"} credits`}</strong></span>
            {review && !loading && (
              <span className="tp-total-split">
                {review.videoCredits} video · {review.startFrameCredits} start frames · {review.lipSyncCredits} lip-sync
              </span>
            )}
            {notEnoughCredits && <span className="tp-warn">{purchasesAllowed() ? `You have ${credits} credits — not enough for this reel.` : NO_CREDITS_TEXT}</span>}
            <span className="tp-total-note">Nothing is charged until you click Generate. You're never charged more than this total.</span>
          </div>

          <div className="tp-actions">
            <button className="btn btn-ghost" onClick={onCancel} disabled={loading}>Cancel</button>
            <button className="btn btn-primary" onClick={onConfirm} disabled={loading || !review || notEnoughCredits}>
              Generate · {review?.totalCost ?? "—"} cr
            </button>
          </div>
        </div>
      </div>

      <style>{`
        .tp-overlay { position: fixed; inset: 0; z-index: 9999; background: rgba(0,0,0,0.75); display: flex; align-items: center; justify-content: center; padding: 16px; }
        .tp-modal { background: #161616; border: 1px solid #2a2a2a; border-radius: 16px; width: 100%; max-width: 680px; max-height: 88vh; overflow-y: auto; display: flex; flex-direction: column; box-sizing: border-box; }
        .tp-header { display: flex; align-items: center; gap: 10px; padding: 16px 20px; border-bottom: 1px solid #222; font-weight: 700; font-size: 16px; color: #fff; position: sticky; top: 0; background: #161616; z-index: 1; }
        .tp-close { margin-left: auto; background: none; border: none; color: #666; cursor: pointer; font-size: 14px; }
        .tp-close:hover { color: #fff; }
        .tp-body { padding: 20px; display: flex; flex-direction: column; gap: 16px; }
        .tp-hint { margin: 0; font-size: 12.5px; line-height: 1.5; color: #999; }
        .tp-scenes { display: flex; flex-direction: column; gap: 8px; }
        .tp-row { display: flex; align-items: flex-start; gap: 10px; padding: 10px 12px; border: 1px solid #262626; border-radius: 10px; }
        .tp-row-presenter { border-color: rgba(77,208,255,0.35); background: rgba(77,208,255,0.04); }
        .tp-num { width: 20px; height: 20px; border-radius: 50%; background: #222; color: #aaa; font-size: 11px; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 2px; }
        .tp-main { flex: 1; min-width: 0; }
        .tp-mode { font-size: 12px; font-weight: 700; color: #4dd0ff; margin-bottom: 3px; }
        .tp-row:not(.tp-row-presenter) .tp-mode { color: #bbb; }
        .tp-text { font-size: 13px; color: #eee; line-height: 1.4; overflow-wrap: anywhere; }
        .tp-note { font-size: 11.5px; color: #f0b429; margin-top: 4px; line-height: 1.4; }
        .tp-switch { display: inline-flex; align-items: center; gap: 6px; margin-top: 6px; font-size: 11.5px; color: #aaa; cursor: pointer; }
        .tp-switch input { accent-color: #4dd0ff; }
        .tp-cost { text-align: right; flex-shrink: 0; min-width: 96px; }
        .tp-cost-total { font-size: 13px; font-weight: 700; color: #fbbf24; }
        .tp-cost-split { font-size: 10.5px; color: #888; margin-top: 2px; }
        .tp-total { font-size: 13px; color: #ccc; padding-top: 8px; border-top: 1px solid #222; display: flex; flex-direction: column; gap: 4px; }
        .tp-total strong { color: #fff; }
        .tp-total-split { font-size: 11.5px; color: #999; }
        .tp-total-note { font-size: 11px; color: #777; }
        .tp-warn { font-size: 12px; color: #ff5c5c; }
        .tp-actions { display: flex; gap: 10px; justify-content: flex-end; flex-wrap: wrap; }
        .tp-actions .btn { padding: 9px 16px; border-radius: 8px; font-size: 13.5px; font-weight: 700; cursor: pointer; border: 1px solid transparent; }
        .tp-actions .btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .tp-actions .btn-primary { background: #4dd0ff; color: #06121b; }
        .tp-actions .btn-ghost { background: transparent; border-color: #2a2a2a; color: #aaa; }
        @media (max-width: 520px) { .tp-row { flex-wrap: wrap; } .tp-cost { text-align: left; min-width: 0; width: 100%; padding-left: 30px; } }
      `}</style>
    </div>
  );
}
