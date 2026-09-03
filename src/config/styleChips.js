// Trend-Informed Style System, Build 2 (v1) -- tappable prompt-modifier
// chips for the Create page. Each chip appends its modifier string to
// whatever the user already typed; it never replaces the prompt. Config-
// driven so the chip set can change without touching UI logic (Create.jsx
// just maps over this array).
export const STYLE_CHIPS = [
  { id: "documentary-honest", label: "Documentary Honest", modifier: "unpolished, candid, real, documentary-style" },
  { id: "human-first", label: "Human First", modifier: "real people, natural expressions, not idealized" },
  { id: "controlled-chaos", label: "Controlled Chaos", modifier: "dynamic energetic cuts, contrast between fast motion and stillness" },
  { id: "analog-vhs", label: "Analog/VHS", modifier: "shot on VHS, consumer camcorder, 90s home video aesthetic" },
  { id: "maximalist", label: "Maximalist", modifier: "saturated, layered, dense composition, bold color" },
  { id: "surreal", label: "Surreal", modifier: "dreamlike, impossible scale, unexpected juxtaposition" },
  { id: "americana", label: "Americana", modifier: "real landscapes, grit, authentic faces" },
];

// Appends a chip's modifier to the existing prompt text, comma-separated,
// without duplicating a chip already present (toggling a chip twice
// shouldn't stack the same modifier).
export function appendChipModifier(currentText, chip) {
  const text = String(currentText || "");
  if (text.includes(chip.modifier)) return text;
  if (!text.trim()) return chip.modifier;
  const sep = /[,.\s]$/.test(text.trim()) ? " " : ", ";
  return `${text.trimEnd()}${sep}${chip.modifier}`;
}
