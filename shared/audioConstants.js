// Single source of truth for the per-track-type audio ceiling multipliers.
// Both backend/routes/render.js (ffmpeg volume= scaling, authoritative for what
// actually gets rendered) and frontend SequencerPanel.jsx (volume envelope UI,
// which needs these to draw/invert the "true absolute volume" axis) import
// this so the two can never drift apart again.
//
// ceilingFraction = (sliderVolume / 100) * AUDIO_CEILING_MULTIPLIERS[trackType]
//
// - voiceover: narration boost, so voiceover can play louder than its slider's
//   face value (100% slider -> 250% of "true max" headroom).
// - music: hard ducking cap, so background music can never overpower other
//   audio even at 100% slider.
// - sfx: small headroom boost similar to voiceover, smaller magnitude.
export const AUDIO_CEILING_MULTIPLIERS = {
  voiceover: 2.5,
  music: 0.3,
  sfx: 1.2,
};
