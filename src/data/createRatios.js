// Aspect ratios offered by Create's Format section. Rendered through
// filterRatios (src/utils/ambassador.js), so an ambassador only ever sees
// ratios their exports support -- adding a ratio here can't offer an
// ambassador one the server would refuse at export.
export const CREATE_RATIO_OPTIONS = Object.freeze([
  { value: "16:9", label: "16:9 — Landscape (YouTube, Facebook)" },
  { value: "9:16", label: "9:16 — Portrait (Reels, TikTok, Shorts)" },
  { value: "1:1", label: "1:1 — Square (Instagram)" },
]);
