import React, { useEffect, useRef, useState } from "react";

export default function ModalPrompt({ open, title, label, defaultValue, onCancel, onConfirm }) {
  const [value, setValue] = useState(defaultValue || "");
  const inputRef = useRef(null);

  useEffect(() => {
    setValue(defaultValue || "");
  }, [defaultValue]);

  useEffect(() => {
    if (open) {
      setTimeout(() => {
        if (inputRef.current) inputRef.current.focus();
      }, 10);
    }
  }, [open]);

  if (!open) return null;

  return (
    <div className="modalBackdrop" onMouseDown={onCancel}>
      <div className="modalCard" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modalTitle">{title || "Name"}</div>
        <div className="modalLabel">{label || "Name"}</div>
        <input
          ref={inputRef}
          className="modalInput"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") onCancel();
            if (e.key === "Enter") onConfirm(value);
          }}
        />
        <div className="modalActions">
          <button className="smallBtn" onClick={onCancel}>Cancel</button>
          <button className="smallBtn primary" onClick={() => onConfirm(value)}>Save</button>
        </div>
      </div>
    </div>
  );
}
