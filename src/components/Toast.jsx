import React from "react";

export default function Toast({ toast }) {
  if (!toast) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 24,
        right: 24,
        padding: "12px 16px",
        borderRadius: 10,
        background:
          toast.type === "error" ? "#7f1d1d" :
          toast.type === "success" ? "#064e3b" :
          "#1f2937",
        color: "#fff",
        zIndex: 9999,
      }}
    >
      {toast.message}
    </div>
  );
}
