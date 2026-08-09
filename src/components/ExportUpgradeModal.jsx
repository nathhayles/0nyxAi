// Real CTA modal for the export credit gate -- replaces the old bare
// alert("Please upgrade your plan to export reels.") from before the export
// gate was migrated to a credit-based model (see routes/render.js's
// "Gate clean download behind credits, not a plan" comment). Shown when
// POST /api/render returns 402 INSUFFICIENT_CREDITS.
export default function ExportUpgradeModal({ requiredCredits, onClose }) {
  return (
    <div className="export-upgrade-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="export-upgrade-modal">
        <div className="export-upgrade-header">
          <span>Not enough credits to export</span>
          <button className="export-upgrade-close" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="export-upgrade-body">
          <p>
            Exporting a watermark-free reel costs 1 credit per minute of
            rendered output{requiredCredits ? ` — this export needs ${requiredCredits} credit${requiredCredits === 1 ? "" : "s"}` : ""}.
            Your balance doesn't cover it yet.
          </p>
          <div className="export-upgrade-actions">
            <a href="/pricing#buy-credits" className="btn btn-primary">Buy credits</a>
            <button className="btn btn-ghost" onClick={onClose}>Not now</button>
          </div>
        </div>
      </div>

      <style>{`
        .export-upgrade-overlay {
          position: fixed; inset: 0; z-index: 9999;
          background: rgba(0,0,0,0.75);
          display: flex; align-items: center; justify-content: center;
          padding: 20px;
        }
        .export-upgrade-modal {
          background: #161616;
          border: 1px solid #2a2a2a;
          border-radius: 16px;
          width: 100%; max-width: 420px;
          display: flex; flex-direction: column;
          overflow: hidden;
        }
        .export-upgrade-header {
          display: flex; align-items: center; gap: 10px;
          padding: 16px 20px;
          border-bottom: 1px solid #222;
          font-weight: 700; font-size: 16px; color: #fff;
        }
        .export-upgrade-close {
          margin-left: auto; background: none; border: none;
          color: #666; cursor: pointer; font-size: 14px;
        }
        .export-upgrade-close:hover { color: #fff; }
        .export-upgrade-body {
          padding: 20px; display: flex; flex-direction: column; gap: 16px;
        }
        .export-upgrade-body p {
          margin: 0; font-size: 14px; line-height: 1.5; color: #ccc;
        }
        .export-upgrade-actions { display: flex; gap: 10px; }
        .export-upgrade-actions .btn {
          flex: 1; text-align: center; padding: 10px 14px; border-radius: 8px;
          font-size: 14px; font-weight: 700; cursor: pointer; text-decoration: none;
          border: 1px solid transparent;
        }
        .export-upgrade-actions .btn-primary {
          background: #4dd0ff; color: #0b0f17;
        }
        .export-upgrade-actions .btn-primary:hover { background: #7de0ff; }
        .export-upgrade-actions .btn-ghost {
          background: transparent; border-color: #2a2a2a; color: #aaa;
        }
        .export-upgrade-actions .btn-ghost:hover { color: #fff; }
      `}</style>
    </div>
  );
}
