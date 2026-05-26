import React from "react";

export default function ExportButton({ disabled, exporting, onClick, help, trialExpired, daysRemaining }) {
  const blocked = trialExpired;

  function handleClick() {
    if (blocked) {
      window.location.href = "/pricing";
      return;
    }
    onClick();
  }

  return (
    <div style={{ marginTop: 12 }}>
      {daysRemaining != null && daysRemaining <= 3 && !blocked && (
        <div style={{ fontSize: 11, color: "#fbbf24", marginBottom: 6 }}>
          Trial ends in {daysRemaining} day{daysRemaining !== 1 ? "s" : ""}
        </div>
      )}
      <button
        disabled={disabled || exporting}
        onClick={handleClick}
        style={{
          opacity: disabled || exporting ? 0.6 : 1,
          cursor: disabled || exporting ? "not-allowed" : "pointer",
          padding: "10px 14px",
          borderRadius: 10,
          border: blocked ? "1px solid rgba(239,68,68,0.4)" : "none",
          background: blocked ? "rgba(239,68,68,0.12)" : undefined,
          color: blocked ? "#f87171" : undefined,
        }}
      >
        {blocked ? "Trial Expired — Upgrade" : exporting ? "Exporting…" : "Export Video"}
      </button>
      {help && !blocked && (
        <div style={{ fontSize: 12, opacity: 0.7, marginTop: 6 }}>
          {help}
        </div>
      )}
    </div>
  );
}
