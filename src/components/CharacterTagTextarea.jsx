import { useState, useRef } from "react";

// Textarea with "@"-triggered autocomplete over the user's saved characters.
// Selecting a character inserts "@Name" as literal text — no separate
// "attach" control, per spec (tag resolution happens server-side at fal.ai
// submit time; see backend/lib/resolveTaggedEntities.js).
//
// Extracted out of StoryboardPanel.jsx (Reshoot Phase 2, 2026-09-01) so the
// Edit Video flow's reference-image UI can reuse the exact same @Tag
// mechanism instead of re-implementing it — same component, same matching
// regex as resolveTaggedEntities.js's TAG_RE, so a tag typed here resolves
// identically regardless of which page it was typed on.
export default function CharacterTagTextarea({ value, onChange, placeholder, onClick, characters, autocompleteDisabled, rows, style }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [triggerPos, setTriggerPos] = useState(null);
  const taRef = useRef(null);

  const matches = open && !autocompleteDisabled
    ? characters.filter((c) => c.name.toLowerCase().includes(query.toLowerCase())).slice(0, 8)
    : [];

  const handleChange = (e) => {
    const text = e.target.value;
    const caret = e.target.selectionStart;
    onChange(text);

    // Textarea itself always stays editable (the model may still ignore any
    // @tags typed here, but nothing stops the user typing them by hand) --
    // autocompleteDisabled only suppresses the assisted popover below.
    if (autocompleteDisabled) {
      setOpen(false);
      return;
    }

    const upToCaret = text.slice(0, caret);
    const m = upToCaret.match(/@([A-Za-z0-9_]*)$/);
    if (m) {
      setOpen(true);
      setQuery(m[1]);
      setTriggerPos(caret - m[0].length);
    } else {
      setOpen(false);
    }
  };

  const selectCharacter = (name) => {
    if (triggerPos == null) return;
    const before = value.slice(0, triggerPos);
    const after = value.slice(triggerPos + 1 + query.length);
    const next = `${before}@${name} ${after}`;
    onChange(next);
    setOpen(false);
    requestAnimationFrame(() => {
      if (taRef.current) {
        const pos = before.length + name.length + 2;
        taRef.current.focus();
        taRef.current.setSelectionRange(pos, pos);
      }
    });
  };

  return (
    <div style={{ position: "relative" }}>
      <textarea
        ref={taRef}
        placeholder={placeholder}
        value={value}
        onChange={handleChange}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onClick={onClick}
        rows={rows}
        style={style}
      />
      {open && matches.length > 0 && (
        <div
          style={{
            position: "absolute", zIndex: 20, top: "100%", left: 0, right: 0,
            background: "var(--onyx-surface)", border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 8, marginTop: 2, maxHeight: 160, overflowY: "auto",
            boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
          }}
          onMouseDown={(e) => e.preventDefault()}
        >
          {matches.map((c) => (
            <div
              key={c.id}
              onClick={() => selectCharacter(c.name)}
              style={{ padding: "6px 10px", fontSize: 12, cursor: "pointer" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.08)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              @{c.name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
