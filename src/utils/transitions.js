// Mirrors /srv/onyx/backend/utils/transitions.js's TRANSITION_CATALOG
// and normalizeTransition() exactly (type strings, directional flags,
// legacy mapping) so a reel's saved transition always resolves to the
// same {type, direction} on both the editor preview and the real
// export. Not imported from the backend -- there's no shared package
// between the two deployables in this repo, so this is a deliberate,
// hand-kept-in-sync duplicate. Adds one frontend-only field per entry,
// `previewAnim`, naming the CSS keyframe used for this type's little
// preview swatch and the live in-editor scrub/playback simulation.

export const TRANSITION_CATALOG = {
  cut:       { label: "Cut",           directional: false, previewAnim: "cut" },
  fade:      { label: "Fade",          directional: false, previewAnim: "fade" },
  dissolve:  { label: "Dissolve",      directional: false, previewAnim: "fade" },
  slide:     { label: "Slide",         directional: true,  previewAnim: "slide" },
  wipe:      { label: "Wipe",          directional: true,  previewAnim: "wipe" },
  zoom:      { label: "Zoom",          directional: false, previewAnim: "zoom" },
  blur:      { label: "Blur",          directional: false, previewAnim: "blur" },
  circle:    { label: "Circle",        directional: false, previewAnim: "circle" },
  fadeblack: { label: "Fade to Black", directional: false, previewAnim: "fadeblack" },
  fadewhite: { label: "Fade to White", directional: false, previewAnim: "fadewhite" },
  pixelize:  { label: "Pixelize",      directional: false, previewAnim: "fade" },
  radial:    { label: "Radial",        directional: false, previewAnim: "fade" },
  whippan:   { label: "Whip Pan",      directional: true,  previewAnim: "whippan" },
};

const LEGACY_MAP = {
  slideLeft:     { type: "slide", direction: "left" },
  "slide-left":  { type: "slide", direction: "left" },
  slideRight:    { type: "slide", direction: "right" },
  "slide-right": { type: "slide", direction: "right" },
  zoomIn:        { type: "zoom", direction: null },
  "zoom-in":     { type: "zoom", direction: null },
  zoomOut:       { type: "zoom", direction: null },
  "zoom-out":    { type: "zoom", direction: null },
  spin:          { type: "circle", direction: null },
  push:          { type: "slide", direction: "left" },
  flash:         { type: "fade", direction: null },
};

export function normalizeTransition(transitionToNext, transitionDirection) {
  const raw = transitionToNext || "cut";
  if (LEGACY_MAP[raw]) return { ...LEGACY_MAP[raw] };
  const entry = TRANSITION_CATALOG[raw];
  if (entry) {
    return {
      type: raw,
      direction: entry.directional ? (transitionDirection || "left") : null,
    };
  }
  return { type: "cut", direction: null };
}
