import React from "react";

export default function ExportButton({ disabled, exporting, onClick, help }) {
  return (
    <div style={{ marginTop: 12 }}>
      <button
        disabled={disabled || exporting}
        onClick={onClick}
        style={{
          opacity: disabled || exporting ? 0.6 : 1,
          cursor: disabled || exporting ? "not-allowed" : "pointer",
          padding: "10px 14px",
          borderRadius: 10,
          border: "none",
        }}
      >
        {exporting ? "Exporting…" : "Export Video"}
      </button>
      {help && (
        <div style={{ fontSize: 12, opacity: 0.7, marginTop: 6 }}>
          {help}
        </div>
      )}
    </div>
  );
}
