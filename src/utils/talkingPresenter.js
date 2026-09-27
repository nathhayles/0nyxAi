// Talking presenter scene mode: one tagged character, in a start frame of
// the scene's setting, speaking the scene's voiceover (backend
// routes/presenter.js, fal's H3 Max Lip Sync). Not a VIDEO_MODELS entry --
// it has its own route -- so the editor's model picker carries it as a
// local option with its own capability row.
export const TALKING_PRESENTER = "talking-presenter";

// Merged into EditorV2's modelCapabilities. supportsRefs: tags drive it (the
// character's photos make the start frame). No duration picker (the length
// follows the voiceover), no start/end image. Aspect ratios: the ones the
// start frame can be made at; H3's output follows the start frame.
export const PRESENTER_CAPABILITIES = {
  id: TALKING_PRESENTER,
  label: "Talking presenter",
  supportsRefs: true,
  supportsEndFrame: false,
  supportsStartImage: false,
  requiresStartAndEnd: false,
  supports1080pUpgrade: false,
  resolutionOptions: null,
  duration: null,
  aspectRatio: { values: ["9:16", "16:9", "1:1", "4:5", "4:3", "3:4", "21:9"], default: "9:16" },
};

export const DEFAULT_PRESENTER_RESOLUTION = "768P";

// What the backend needs about a scene, for both the estimate and Generate.
// A stale voiceover (narration edited since it was made) isn't sent, so the
// backend makes a fresh one from the current narration.
export function presenterSceneBody(scene) {
  const voiceoverUrl = scene?.voiceoverStale ? null : (scene?.voiceoverUrl || null);
  return {
    prompt: [scene?.stylePromptPrefix, scene?.action].filter(Boolean).join(" "),
    narration: scene?.narration || "",
    voiceoverUrl,
    voiceoverDuration: voiceoverUrl ? (scene?.voiceoverDuration ?? null) : null,
    voiceoverMultiSpeaker: !!voiceoverUrl && (scene?.voiceoverSegments?.length || 0) > 1,
    start_frame_model: scene?.startFrameModel || null,
    resolution: scene?.presenterResolution || DEFAULT_PRESENTER_RESOLUTION,
  };
}
