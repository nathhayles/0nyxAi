// Dropping a visual onto the A-roll track replaces the visual of the scene
// under the pointer. A-roll is wall-to-wall scene clips, so it never takes a
// second clip on top of one, and a drop that misses every clip is refused.
import { resyncedChanges } from "./lipSyncState.js";

const clipSpan = (c) => (c.trimEnd ?? c.duration ?? 0) - (c.trimStart ?? 0);

export function findArollDropTarget(videoClips, time) {
  return (videoClips || []).find((c) => {
    const start = c.startTime || 0;
    return time >= start && time < start + clipSpan(c);
  }) || null;
}

// The drag source's own kind wins: proxy URLs may have no file extension.
export function droppedMediaType(media, url) {
  const kind = media?.mediaType || media?.type;
  if (kind === "image" || kind === "video") return kind;
  return /\.(mp4|webm|mov|m4v)(\?|$)/i.test(url) ? "video" : "image";
}

// Scene changes for a replaced visual. Anything that described the old one
// (lip-sync, bleed fade, paint mask, upscale, short-clip warning) is cleared.
// lipSynced matters most: render.js skips the voiceover for lipSynced scenes.
export function sceneMediaReplacement(scene, { url, thumbnail, mediaType }) {
  const thumb = thumbnail || url;
  return {
    mediaUrl: url,
    url,
    thumbnail: thumb,
    stockThumb: thumb,
    mediaType,
    lipSynced: false,
    needsBleedFade: false,
    paintMaskUrl: null,
    upscaledMediaUrl: null,
    durationShortfall: false,
    ...(scene?.trimStart != null || scene?.trimEnd != null ? { trimStart: null, trimEnd: null } : {}),
    ...resyncedChanges(scene),
  };
}

// Per-clip changes for every A-roll clip of the replaced scene. Timeline
// positions and lengths stay put; the new media plays from its start. A split
// scene's pieces carry on from each other instead of each restarting.
export function replacedSceneClipChanges(videoClips, sceneId, { url, thumbnail }) {
  let offset = 0;
  return (videoClips || [])
    .filter((c) => c.sceneId === sceneId)
    .sort((a, b) => (a.startTime || 0) - (b.startTime || 0))
    .map((c) => {
      const span = clipSpan(c);
      // Same meaning as SPEED_CLIP's anchor: seconds of source this clip uses.
      const sourceDuration = span * (c.speed || 1);
      const changes = {
        src: url,
        url,
        mediaUrl: url,
        thumbnail: thumbnail || url,
        paintMaskUrl: null,
        needsBleedFade: false,
        trimStart: offset,
        trimEnd: offset + span,
        duration: span,
        sourceDuration,
      };
      offset += sourceDuration;
      return { clipId: c.id, changes };
    });
}
