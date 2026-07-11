// timelineReducer.js
// Drop into: src/reducers/timelineReducer.js
//
// Single source of truth for all sequencer track / clip / join state.
// Used by EditorV2.jsx (parallel build) — does NOT touch Editor.jsx.

export const TRACK_TYPES = {
  VIDEO:     { id: 0, key: "video",     label: "Video",    icon: "🎬", color: "#7c3aed", kind: "video" },
  BROLL:     { id: 1, key: "broll",     label: "B-Roll",   icon: "📽",  color: "#3b82f6", kind: "video" },
  FX:        { id: 2, key: "fx",        label: "FX",       icon: "✨",  color: "#ec4899", kind: "fx"    },
  AVATAR:    { id: 3, key: "avatar",    label: "Avatar",   icon: "👤",  color: "#06b6d4", kind: "avatar" },
  VOICEOVER: { id: 4, key: "voiceover", label: "Voice",    icon: "🎤",  color: "#22c55e", kind: "audio" },
  MUSIC:     { id: 5, key: "music",     label: "Music",    icon: "🎵",  color: "#8b5cf6", kind: "audio" },
  SFX:       { id: 6, key: "sfx",       label: "SFX",      icon: "🔊",  color: "#f59e0b", kind: "audio" },
};

// ─── helpers ─────────────────────────────────────────────────────────────────

let _idCounter = Date.now();
export function newId(prefix = "clip") {
  return `${prefix}_${(++_idCounter).toString(36)}`;
}

/** Make a blank clip on a given track */
export function makeClip(overrides = {}) {
  return {
    id:         newId("clip"),
    trackKey:   "video",        // key from TRACK_TYPES
    startTime:  0,              // position on timeline (seconds)
    duration:   3,              // after trim
    trimStart:  0,              // seconds trimmed from head
    trimEnd:    3,              // = original duration minus tail trim
    src:        "",
    type:       "video",        // 'video' | 'audio' | 'image' | 'fx'
    volume:     100,            // 0–100
    fadeIn:     0,              // px (matches existing FadeHandle contract)
    fadeOut:    0,
    speed:      1,              // 0.5 | 1 | 1.5 | 2
    muted:      false,
    // Volume automation: null = flat `volume` applies as-is (unchanged legacy
    // behavior). When length >= 2, each point's `v` (0-100) is a percentage of
    // `volume` (the ceiling), not an absolute level — see SET_VOLUME_POINTS.
    // `t` is seconds local to the clip's trimmed span (0 = trimStart).
    volumePoints: null,
    thumbnail:  "",
    label:      "",
    // legacy scene compat fields (populated when importing from scenes[])
    sceneId:    null,
    captionsEnabled: true,
    voiceoverUrl:    "",
    narration:       "",
    // Position/size for broll clips (same xPct/yPct/sizePct convention as fx
    // clips — see TextPanel.jsx/EditorV2.jsx). Deliberately NOT defaulted
    // here: undefined means "full-frame" (today's only behavior) in both the
    // live preview and the ffmpeg export. Only set via UPDATE_CLIP once a
    // user actually drags/resizes a broll clip in the preview canvas.
    ...overrides,
  };
}

/** Make a join (transition) between two clips */
export function makeJoin(overrides = {}) {
  return {
    id:          newId("join"),
    afterClipId: "",            // id of the clip this transition follows
    type:        "cut",         // 'cut'|'dissolve'|'wipe-left'|'wipe-right'|'zoom-in'|'zoom-out'|'fade-black'
    duration:    0.5,           // seconds
    ...overrides,
  };
}

/** Initial empty timeline state */
export function makeInitialState() {
  return {
    tracks: Object.values(TRACK_TYPES).map(t => ({
      key:    t.key,
      label:  t.label,
      icon:   t.icon,
      color:  t.color,
      kind:   t.kind,
      clips:  [],
    })),
    joins:    [],               // transition objects
    playhead: 0,                // seconds
    selected: null,             // selected clip id
    snap:     true,             // magnetic snap enabled
  };
}

// ─── import from legacy scenes[] ─────────────────────────────────────────────

/**
 * Convert the existing scenes[] array into timeline state.
 * Main video track gets one clip per scene, placed sequentially.
 * Voice track gets one clip per scene that has a voiceoverUrl.
 * Music track gets one spanning clip if globalMusicUrl is set.
 */
export function importFromScenes(scenes = [], globalMusicUrl = "", globalMusicName = "") {
  const state = makeInitialState();
  let cursor = 0;

  const videoTrack     = state.tracks.find(t => t.key === "video");
  const avatarTrack    = state.tracks.find(t => t.key === "avatar");
  const voiceTrack     = state.tracks.find(t => t.key === "voiceover");
  const musicTrack     = state.tracks.find(t => t.key === "music");
  const sfxTrack       = state.tracks.find(t => t.key === "sfx");

  scenes.forEach((sc, i) => {
    const rawDur = Number(sc.duration) || 3;
    const voDur  = Number(sc.voiceoverDuration) || 0;
    // Mirror render.js's Part 1 fix: when a voiceover exists, its live duration
    // (+1.5s buffer) is what actually determines this scene's length in the
    // export. sc.duration is a separate, often-stale field (legacy clip-length
    // default) and must not override it.
    const dur = voDur > 0 ? voDur + 1.5 : rawDur;
    const clip = makeClip({
      trackKey:        "video",
      startTime:       cursor,
      duration:        dur,
      trimStart:       Number(sc.trimStart) || 0,
      trimEnd:         Number(sc.trimEnd)   || dur,
      src:             sc.mediaUrl || sc.url || "",
      type:            "video",
      volume:          Number(sc.volume   ?? 100),
      fadeIn:          Number(sc.fadeIn   || 0),
      fadeOut:         Number(sc.fadeOut  || 0),
      muted:           !!sc.muted,
      thumbnail:       sc.thumbnail || sc.mediaUrl || "",
      label:           `S${i + 1}`,
      sceneId:         sc.id,
      captionsEnabled: sc.captionsEnabled !== false,
      voiceoverUrl:    sc.voiceoverUrl || "",
      narration:       sc.narration   || sc.action || "",
    });
    videoTrack.clips.push(clip);

    if (sc.avatar_video_url && sc.avatar_status === "completed") {
      avatarTrack.clips.push(makeClip({
        trackKey:  "avatar",
        startTime: cursor,
        duration:  dur,
        trimStart: 0,
        trimEnd:   dur,
        src:       sc.avatar_video_url,
        type:      "video",
        volume:    0,
        label:     `AV S${i + 1}`,
        sceneId:   sc.id,
        avatarPosition: sc.avatar_position || "bottom-right",
      }));
    }

    if (sc.voiceoverUrl) {
      voiceTrack.clips.push(makeClip({
        trackKey:  "voiceover",
        startTime: cursor + 0.15,
        duration:  voDur > 0 ? voDur : dur,
        trimStart: 0,
        trimEnd:   voDur > 0 ? voDur : dur,
        src:       sc.voiceoverUrl,
        type:      "audio",
        volume:    100,
        label:     `VO S${i + 1}`,
        sceneId:   sc.id,
      }));
    }

    if (sc.sfxUrl) {
      sfxTrack.clips.push(makeClip({
        trackKey:  "sfx",
        startTime: cursor,
        duration:  dur,
        trimStart: 0,
        trimEnd:   dur,
        src:       sc.sfxUrl,
        type:      "audio",
        volume:    80,
        label:     sc.sfxName || "SFX",
        sceneId:   sc.id,
      }));
    }

    cursor += dur;
  });

  if (globalMusicUrl) {
    musicTrack.clips.push(makeClip({
      trackKey:  "music",
      startTime: 0,
      duration:  cursor || 1,
      trimStart: 0,
      trimEnd:   cursor || 1,
      src:       globalMusicUrl,
      type:      "audio",
      volume:    60,
      label:     globalMusicName || "Music",
    }));
  }

  return state;
}

// ─── computed selectors ───────────────────────────────────────────────────────

/** Total duration = end of last clip across all tracks */
export function totalDuration(state) {
  let max = 0;
  for (const track of state.tracks) {
    for (const clip of track.clips) {
      const end = clip.startTime + (clip.trimEnd - clip.trimStart);
      if (end > max) max = end;
    }
  }
  return max;
}

/** Snap targets: playhead + all clip edges */
export function snapTargets(state, excludeClipId = null) {
  const targets = new Set([state.playhead]);
  for (const track of state.tracks) {
    for (const clip of track.clips) {
      if (clip.id === excludeClipId) continue;
      targets.add(clip.startTime);
      targets.add(clip.startTime + (clip.trimEnd - clip.trimStart));
    }
  }
  return [...targets].sort((a, b) => a - b);
}

/** Piecewise-linear interpolation of a volume envelope at time t (seconds,
 *  local to the clip). Holds flat before the first / after the last point.
 *  Returns 100 (no attenuation) when points is null/empty/length 1. */
export function evalVolumeEnvelope(points, t) {
  if (!points || points.length < 2) return points?.[0]?.v ?? 100;
  const pts = [...points].sort((a, b) => a.t - b.t);
  if (t <= pts[0].t) return pts[0].v;
  if (t >= pts[pts.length - 1].t) return pts[pts.length - 1].v;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    if (t >= a.t && t <= b.t) {
      const frac = b.t === a.t ? 0 : (t - a.t) / (b.t - a.t);
      return a.v + (b.v - a.v) * frac;
    }
  }
  return 100;
}

/** Overlap duration (seconds) between two ranges; <= 0 means no overlap. */
export function rangesOverlapDuration(aStart, aEnd, bStart, bEnd) {
  return Math.min(aEnd, bEnd) - Math.max(aStart, bStart);
}

/** True if a proposed [start, start+duration) span overlaps any clip already
 *  on the given track (excluding excludeClipId, e.g. the clip being moved). */
export function clipOverlapsTrack(track, start, duration, excludeClipId = null) {
  const end = start + duration;
  return (track?.clips || []).some(c => {
    if (c.id === excludeClipId) return false;
    const cStart = c.startTime || 0;
    const cEnd   = cStart + ((c.trimEnd ?? c.duration ?? 0) - (c.trimStart ?? 0));
    return rangesOverlapDuration(start, end, cStart, cEnd) > 0;
  });
}

/** Find nearest snap target within threshold (seconds) */
export function nearestSnap(value, targets, thresholdSec = 0.15) {
  let best = null, bestDist = Infinity;
  for (const t of targets) {
    const d = Math.abs(value - t);
    if (d < bestDist) { bestDist = d; best = t; }
  }
  return bestDist <= thresholdSec ? best : null;
}

/** Teleport a single VO clip's startTime to match its paired VIDEO clip */
function snapVoToScene(tracks, voClipId) {
  const voiceTrack = tracks.find(t => t.key === "voiceover");
  const videoTrack = tracks.find(t => t.key === "video");
  if (!voiceTrack || !videoTrack) return tracks;
  const voClip = voiceTrack.clips.find(c => c.id === voClipId);
  if (!voClip || !voClip.sceneId) return tracks;
  const videoClip = videoTrack.clips.find(c => c.sceneId === voClip.sceneId);
  if (!videoClip) return tracks;
  return tracks.map(t => {
    if (t.key !== "voiceover") return t;
    return { ...t, clips: t.clips.map(c => c.id === voClipId ? { ...c, startTime: videoClip.startTime } : c) };
  });
}

// ─── reducer ─────────────────────────────────────────────────────────────────

export function timelineReducer(state, action) {
  switch (action.type) {

    // ── clip CRUD ──────────────────────────────────────────────────────────

    case "ADD_CLIP": {
      // action: { clip } — clip.trackKey must be set
      const tracks = state.tracks.map(t =>
        t.key === action.clip.trackKey
          ? {
              ...t,
              clips: action.clip.sceneId == null
                ? [...t.clips, action.clip]
                : [
                    ...t.clips.filter(c => c.sceneId !== action.clip.sceneId),
                    action.clip,
                  ],
            }
          : t
      );
      return { ...state, tracks };
    }

    case "UPDATE_CLIP": {
      // action: { clipId, changes }
      const tracks = state.tracks.map(t => ({
        ...t,
        clips: t.clips.map(c =>
          c.id === action.clipId ? { ...c, ...action.changes } : c
        ),
      }));
      return { ...state, tracks };
    }

    // action: { clipId, changes } — like UPDATE_CLIP, but when `changes.duration`
    // differs from the clip's current duration, every clip on every track whose
    // startTime is at or after this clip's end gets shifted by the same delta.
    // Without this, scenes created with a placeholder duration (e.g. PPT-path
    // scenes default to 3s before their real voiceover/video duration is known)
    // get resized in place once the real duration arrives, but every later clip
    // keeps its stale cumulative startTime — producing visual overlap on the
    // timeline even though the render pipeline (which recomputes positions from
    // each scene's own duration, never trusting stored startTime) is unaffected.
    case "RESIZE_CLIP_REFLOW": {
      let oldClip = null;
      for (const t of state.tracks) {
        const found = t.clips.find(c => c.id === action.clipId);
        if (found) { oldClip = found; break; }
      }
      if (!oldClip) return state;

      const oldDuration = Number(oldClip.duration) || 0;
      const newDuration = action.changes.duration !== undefined ? Number(action.changes.duration) || 0 : oldDuration;
      const delta = newDuration - oldDuration;
      const threshold = oldClip.startTime + oldDuration - 0.05; // small epsilon for float rounding

      const tracks = state.tracks.map(t => ({
        ...t,
        clips: t.clips.map(c => {
          if (c.id === action.clipId) return { ...c, ...action.changes };
          if (delta !== 0 && c.startTime >= threshold) {
            return { ...c, startTime: Math.max(0, c.startTime + delta) };
          }
          return c;
        }),
      }));
      return { ...state, tracks };
    }

    case "UPDATE_TRACK": {
      // action: { trackKey, changes }
      const tracks = state.tracks.map(t =>
        t.key === action.trackKey ? { ...t, ...action.changes } : t
      );
      return { ...state, tracks };
    }

    case "TRACK_MUTE": {
      // action: { trackKey }
      const tracks = state.tracks.map(t =>
        t.key === action.trackKey ? { ...t, muted: !t.muted } : t
      );
      return { ...state, tracks };
    }

    case "TRACK_VOLUME": {
      // action: { trackKey, volume }
      const tracks = state.tracks.map(t =>
        t.key === action.trackKey ? { ...t, volume: action.volume } : t
      );
      return { ...state, tracks };
    }

    case "DELETE_CLIP": {
      // action: { clipId }
      const tracks = state.tracks.map(t => ({
        ...t,
        clips: t.clips.filter(c => c.id !== action.clipId),
      }));
      const joins = state.joins.filter(
        j => j.afterClipId !== action.clipId
      );
      const selected = state.selected === action.clipId ? null : state.selected;
      return { ...state, tracks, joins, selected };
    }

    case "DUPLICATE_CLIP": {
      // action: { clipId }
      const tracks = state.tracks.map(t => {
        const idx = t.clips.findIndex(c => c.id === action.clipId);
        if (idx < 0) return t;
        const orig = t.clips[idx];
        const clone = { ...orig, id: newId("clip"), startTime: orig.startTime + (orig.trimEnd - orig.trimStart) + 0.05 };
        const clips = [...t.clips];
        clips.splice(idx + 1, 0, clone);
        return { ...t, clips };
      });
      return { ...state, tracks };
    }

    case "SPLIT_CLIP": {
      // action: { clipId, atTime } — split clip at absolute timeline time
      const { clipId, atTime } = action;
      const tracks = state.tracks.map(t => {
        const idx = t.clips.findIndex(c => c.id === clipId);
        if (idx < 0) return t;
        const c = t.clips[idx];
        const localTime = atTime - c.startTime; // position within clip
        if (localTime <= 0.1 || localTime >= (c.trimEnd - c.trimStart) - 0.1) return t;
        const leftDur  = localTime;
        const rightDur = (c.trimEnd - c.trimStart) - localTime;
        const left  = { ...c, duration: leftDur, trimEnd: c.trimStart + leftDur };
        const right = { ...c, id: newId("clip"), startTime: atTime, duration: rightDur, trimStart: c.trimStart + leftDur, trimEnd: c.trimEnd };
        const clips = [...t.clips];
        clips.splice(idx, 1, left, right);
        return { ...t, clips };
      });
      return { ...state, tracks };
    }

    case "MOVE_CLIP": {
      // action: { clipId, startTime, trackKey? }
      const { clipId, startTime, trackKey } = action;

      if (!trackKey) {
        // same track move
        const tracks = state.tracks.map(t => ({
          ...t,
          clips: t.clips.map(c => c.id === clipId ? { ...c, startTime: Math.max(0, startTime) } : c),
        }));
        return { ...state, tracks };
      }

      // cross-track move
      let movedClip = null;
      let tracks = state.tracks.map(t => {
        const clip = t.clips.find(c => c.id === clipId);
        if (clip) movedClip = { ...clip, trackKey, startTime: Math.max(0, startTime) };
        return { ...t, clips: t.clips.filter(c => c.id !== clipId) };
      });
      if (movedClip) {
        tracks = tracks.map(t =>
          t.key === trackKey ? { ...t, clips: [...t.clips, movedClip] } : t
        );
      }
      return { ...state, tracks };
    }

    case "REORDER_CLIPS": {
      // action: { trackKey, fromIdx, toIdx }
      const { trackKey, fromIdx, toIdx } = action;
      const tracks = state.tracks.map(t => {
        if (t.key !== trackKey) return t;
        const clips = [...t.clips];
        const [moved] = clips.splice(fromIdx, 1);
        clips.splice(toIdx, 0, moved);
        // reflow startTimes after reorder
        let cursor = 0;
        const reflowed = clips.map(c => {
          const dur = c.trimEnd - c.trimStart;
          const next = { ...c, startTime: cursor };
          cursor += dur;
          return next;
        });
        return { ...t, clips: reflowed };
      });
      return { ...state, tracks };
    }

    // ── trim / fade / volume ───────────────────────────────────────────────

    case "TRIM_CLIP": {
      // action: { clipId, trimStart, trimEnd }
      return timelineReducer(state, {
        type: "UPDATE_CLIP",
        clipId: action.clipId,
        changes: { trimStart: action.trimStart, trimEnd: action.trimEnd },
      });
    }

    case "FADE_CLIP": {
      // action: { clipId, side: 'in'|'out', value }
      return timelineReducer(state, {
        type: "UPDATE_CLIP",
        clipId: action.clipId,
        changes: { [action.side === "in" ? "fadeIn" : "fadeOut"]: action.value },
      });
    }

    case "VOLUME_CLIP": {
      return timelineReducer(state, {
        type: "UPDATE_CLIP",
        clipId: action.clipId,
        changes: { volume: action.volume },
      });
    }

    case "SET_VOLUME_POINTS": {
      // action: { clipId, points } — points: Array<{t,v}>|null, full replace
      return timelineReducer(state, {
        type: "UPDATE_CLIP",
        clipId: action.clipId,
        changes: { volumePoints: action.points },
      });
    }

    case "SPEED_CLIP": {
      // action: { clipId, speed } — adjusts effective duration
      const speed = action.speed;
      const tracks = state.tracks.map(t => ({
        ...t,
        clips: t.clips.map(c => {
          if (c.id !== action.clipId) return c;
          const rawDur = (c.trimEnd - c.trimStart) / (c.speed || 1); // original raw
          const newDur = rawDur / speed;
          return { ...c, speed, duration: newDur, trimEnd: c.trimStart + newDur };
        }),
      }));
      return { ...state, tracks };
    }

    // ── joins (transitions) ────────────────────────────────────────────────

    case "SET_JOIN": {
      // action: { afterClipId, type, duration }
      const exists = state.joins.find(j => j.afterClipId === action.afterClipId);
      const join = exists
        ? { ...exists, type: action.joinType, duration: action.duration }
        : makeJoin({ afterClipId: action.afterClipId, type: action.joinType, duration: action.duration });
      const joins = exists
        ? state.joins.map(j => j.afterClipId === action.afterClipId ? join : j)
        : [...state.joins, join];
      return { ...state, joins };
    }

    case "REMOVE_JOIN": {
      return { ...state, joins: state.joins.filter(j => j.afterClipId !== action.afterClipId) };
    }

    // ── playhead / selection ───────────────────────────────────────────────

    case "SEEK": {
      return { ...state, playhead: Math.max(0, action.time) };
    }

    case "SELECT": {
      return { ...state, selected: action.clipId ?? null };
    }

    case "TOGGLE_SNAP": {
      return { ...state, snap: !state.snap };
    }

    case "SNAP_VO_TO_SCENE": {
      // action: { clipId }
      return { ...state, tracks: snapVoToScene(state.tracks, action.clipId) };
    }

    case "SNAP_ALL_VO_TO_SCENES": {
      const voiceTrack = state.tracks.find(t => t.key === "voiceover");
      if (!voiceTrack) return state;
      let tracks = state.tracks;
      for (const c of voiceTrack.clips) { tracks = snapVoToScene(tracks, c.id); }
      return { ...state, tracks };
    }

    // ── bulk import ────────────────────────────────────────────────────────

    case "IMPORT_SCENES": {
      // action: { scenes, globalMusicUrl, globalMusicName }
      return importFromScenes(action.scenes, action.globalMusicUrl, action.globalMusicName);
    }

    case "LOAD_STATE": {
      // action: { state } — hydrate from backend JSON
      // Normalize stem tracks saved by backend (use id field) to frontend format (key field).
      const incoming = (action.state?.tracks || []).map(t => {
        if (!t.key && t.id) return { ...t, key: t.id };
        return t;
      });

      // Ensure all 7 base tracks always exist — seed empty defaults if missing from DB.
      // This prevents a stem-only save from wiping base tracks on reload, and also
      // backfills tracks added after a reel was first saved (e.g. `avatar`, added
      // when the avatar-overlay feature shipped — reels saved before that only have
      // 6 tracks in `incoming`, and this per-key fallback seeds the missing one).
      const BASE_DEFAULTS = {
        video:     { key:'video',     id:'video',     label:'VIDEO',  type:'video',  clips:[], volume:100, muted:false },
        broll:     { key:'broll',     id:'broll',     label:'B-ROLL', type:'broll',  clips:[], volume:100, muted:false },
        fx:        { key:'fx',        id:'fx',        label:'FX',     type:'fx',     clips:[], volume:100, muted:false },
        avatar:    { key:'avatar',    id:'avatar',    label:'AVATAR', type:'avatar', clips:[], volume:100, muted:false },
        voiceover: { key:'voiceover', id:'voiceover', label:'VOICE',  type:'audio',  clips:[], volume:100, muted:false },
        music:     { key:'music',     id:'music',     label:'MUSIC',  type:'audio',  clips:[], volume:100, muted:false },
        sfx:       { key:'sfx',       id:'sfx',       label:'SFX',    type:'audio',  clips:[], volume:100, muted:false },
      };
      const REQUIRED_BASES = ['video','broll','fx','avatar','voiceover','music','sfx'];
      const stemTracks = incoming.filter(t => (t.key || '').startsWith('stem-') || t.type === 'stem');
      const baseTracks = REQUIRED_BASES.map(k => incoming.find(t => t.key === k) || BASE_DEFAULTS[k]);
      // Stems sit after music, sfx stays last — located by key, not a hardcoded
      // index, since the base track list's length/order can change (e.g. AVATAR
      // was inserted into TRACK_TYPES after this logic was first written, which
      // silently broke a fixed baseTracks.slice(0,5)/baseTracks[5] version of this).
      const musicIdx   = baseTracks.findIndex(t => t.key === "music");
      const sfxTrack    = baseTracks.find(t => t.key === "sfx");
      const withoutSfx  = baseTracks.filter(t => t.key !== "sfx");
      const loadedTracks = [
        ...withoutSfx.slice(0, musicIdx + 1),
        ...stemTracks,
        ...withoutSfx.slice(musicIdx + 1),
        sfxTrack,
      ];

      return { ...makeInitialState(), ...action.state, tracks: loadedTracks };
    }

    // ── dynamic stem tracks (added after Music Studio separation) ─────────
    case "ADD_STEM_TRACKS": {
      // action.stems = [{ type, label, color, url, duration? }] — see Music.jsx's
      // resolvedStems construction, which is what actually populates this action.
      // Replaces any existing stem tracks, inserts after music track.
      const nonStemTracks = state.tracks.filter(t => !t.key.startsWith("stem-"));
      const stemTracks = (action.stems || []).map(stem => ({
        key:      `stem-${stem.type}`,
        label:    stem.label,
        icon:     stem.label.split(" ")[0],
        color:    stem.color,
        kind:     "audio",
        type:     "stem",
        stemType: stem.type,
        volume:   100,
        muted:    false,
        clips:    [makeClip({
          trackKey:  `stem-${stem.type}`,
          startTime: 0,
          duration:  stem.duration || 180,
          trimStart: 0,
          trimEnd:   stem.duration || 180,
          src:       stem.url,
          type:      "audio",
          volume:    100,
          label:     stem.label,
        })],
      }));
      const musicIdx = nonStemTracks.findIndex(t => t.key === "music");
      const insertAt = musicIdx >= 0 ? musicIdx + 1 : nonStemTracks.length;
      return {
        ...state,
        tracks: [
          ...nonStemTracks.slice(0, insertAt),
          ...stemTracks,
          ...nonStemTracks.slice(insertAt),
        ],
      };
    }

    // ── avatar overlay clips ───────────────────────────────────────────────
    case "ADD_AVATAR_CLIP": {
      // action: { sceneId, src, startTime, duration, avatarPosition }
      const { sceneId, src, startTime, duration, avatarPosition = "bottom-right" } = action;
      const clip = makeClip({
        trackKey: "avatar",
        startTime,
        duration,
        trimStart: 0,
        trimEnd:   duration,
        src,
        type:      "video",
        volume:    0,
        label:     "Avatar",
        sceneId,
        avatarPosition,
      });
      const tracks = state.tracks.map(t =>
        t.key === "avatar"
          ? { ...t, clips: [...t.clips.filter(c => c.sceneId !== sceneId), clip] }
          : t
      );
      return { ...state, tracks };
    }

    case "REMOVE_AVATAR_CLIP": {
      // action: { sceneId }
      const tracks = state.tracks.map(t =>
        t.key === "avatar"
          ? { ...t, clips: t.clips.filter(c => c.sceneId !== action.sceneId) }
          : t
      );
      return { ...state, tracks };
    }

    default:
      return state;
  }
}
