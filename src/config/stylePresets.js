// Trend-Informed Style System, Build 1 (v1) -- frontend mirror of the
// backend catalog (backend/config/stylePresets.js). Hand-kept-in-sync, same
// pattern as utils/transitions.js's catalog (no shared package exists
// between the two deployables) -- only the UI-relevant fields live here
// (id/name/description/decadeOptions), never the actual ffmpeg filter
// chains, which stay backend-only. Adding a new preset later (Grunge/
// Scrapbook, Maximalism, Cyber Goth -- deferred past v1) means adding an
// entry here AND the matching backend entry, not new code in either place.
export const STYLE_PRESETS = [
  {
    id: "vhs-analog",
    name: "VHS Analog",
    description: "Grain, chroma bleed, scan lines, tape warble.",
    decadeOptions: ["80s", "90s", "2000s"],
    defaultOptions: { decade: "90s" },
  },
  {
    id: "direct-flash",
    name: "Direct Flash",
    description: "Raw on-camera flash: blown highlights, hard falloff.",
    decadeOptions: null,
    defaultOptions: {},
  },
];

export function getStylePreset(id) {
  return STYLE_PRESETS.find((p) => p.id === id) || null;
}
