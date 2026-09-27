// A lip-synced video (the Lip-sync button's Sync.so output, or a Talking
// presenter scene) carries the voiceover in its own audio track, which is
// why render.js skips muxing scene.voiceoverUrl for lipSynced scenes. When
// such a scene gets a NEW voiceover, lipSynced is cleared so the new one is
// muxed -- and the clip's own (old) audio must be muted too, or export plays
// the old narration under the new one. The scene card then shows
// "Voiceover changed -- regenerate to re-sync" until it's re-synced.

// Changes to merge into a scene that is getting voiceover `newVoiceoverUrl`.
// autoMutedForVoiceover records that WE muted it, so a re-sync only unmutes
// a clip the user hadn't muted themselves.
export function voiceoverReplacedChanges(scene, newVoiceoverUrl) {
  if (!newVoiceoverUrl || newVoiceoverUrl === scene?.voiceoverUrl) return {};
  if (!scene?.lipSynced) return { lipSynced: false };
  return {
    lipSynced: false,
    voiceoverChangedAfterLipSync: true,
    sourceAudioMuted: true,
    autoMutedForVoiceover: !scene.sourceAudioMuted,
  };
}

// Changes to merge when the scene gets a new video (regenerated, lip-synced
// again, a Talking presenter result): clears the note and undoes our mute.
export function resyncedChanges(scene) {
  if (!scene?.voiceoverChangedAfterLipSync && !scene?.autoMutedForVoiceover) return {};
  return {
    voiceoverChangedAfterLipSync: false,
    autoMutedForVoiceover: false,
    ...(scene.autoMutedForVoiceover ? { sourceAudioMuted: false } : {}),
  };
}
