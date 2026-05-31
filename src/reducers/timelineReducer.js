// timelineReducer.js
// Drop into: src/reducers/timelineReducer.js
//
// Single source of truth for all sequencer track / clip / join state.
// Used by EditorV2.jsx (parallel build) — does NOT touch Editor.jsx.

export const TRACK_TYPES = {
  VIDEO:     { id: 0, key: "video",     label: "Video",    icon: "🎬", color: "#7c3aed", kind: "video" },
  BROLL:     { id: 1, key: "broll",     label: "B-Roll",   icon: "📽",  color: "#3b82f6", kind: "video" },
  FX:        { id: 2, key: "fx",        label: "FX",       icon: "✨",  color: "#ec4899", kind: "fx"    },
  VOICEOVER: { id: 3, key: "voiceover", label: "Voice",    icon: "🎤",  color: "#22c55e", kind: "audio" },
  MUSIC:     { id: 4, key: "music",     label: "Music",    icon: "🎵",  color: "#8b5cf6", kind: "audio" },
  SFX:       { id: 5, key: "sfx",       label: "SFX",      icon: "🔊",  color: "#f59e0b", kind: "audio" },
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
    thumbnail:  "",
    label:      "",
    // legacy scene compat fields (populated when importing from scenes[])
    sceneId:    null,
    captionsEnabled: true,
    voiceoverUrl:    "",
    narration:       "",
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
      volume: 100,
      muted:  false,
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
  const voiceTrack     = state.tracks.find(t => t.key === "voiceover");
  const musicTrack     = state.tracks.find(t => t.key === "music");

  scenes.forEach((sc, i) => {
    // Use sc.duration (intended play time) for clip width and cursor.
    // sc.videoDuration is the full file length — used only by trim handles.
    const dur = Number(sc.duration) || 3;
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

    if (sc.voiceoverUrl) {
      voiceTrack.clips.push(makeClip({
        trackKey:  "voiceover",
        startTime: cursor,
        duration:  dur,
        trimStart: 0,
        trimEnd:   dur,
        src:       sc.voiceoverUrl,
        type:      "audio",
        volume:    100,
        label:     `VO S${i + 1}`,
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
          ? { ...t, clips: [...t.clips, action.clip] }
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

    case "TRACK_VOLUME": {
      // action: { trackKey, volume }
      const tracks = state.tracks.map(t =>
        t.key === action.trackKey ? { ...t, volume: action.volume } : t
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

      // Ensure all 6 base tracks always exist — seed empty defaults if missing from DB.
      // This prevents a stem-only save from wiping base tracks on reload.
      const BASE_DEFAULTS = {
        video:     { key:'video',     id:'video',     label:'VIDEO',  type:'video',  clips:[], volume:100, muted:false },
        broll:     { key:'broll',     id:'broll',     label:'B-ROLL', type:'broll',  clips:[], volume:100, muted:false },
        fx:        { key:'fx',        id:'fx',        label:'FX',     type:'fx',     clips:[], volume:100, muted:false },
        voiceover: { key:'voiceover', id:'voiceover', label:'VOICE',  type:'audio',  clips:[], volume:100, muted:false },
        music:     { key:'music',     id:'music',     label:'MUSIC',  type:'audio',  clips:[], volume:100, muted:false },
        sfx:       { key:'sfx',       id:'sfx',       label:'SFX',    type:'audio',  clips:[], volume:100, muted:false },
      };
      const REQUIRED_BASES = ['video','broll','fx','voiceover','music','sfx'];
      const stemTracks = incoming.filter(t => (t.key || '').startsWith('stem-') || t.type === 'stem');
      const baseTracks = REQUIRED_BASES.map(k => incoming.find(t => t.key === k) || BASE_DEFAULTS[k]);
      // stems sit after music (index 4), sfx stays last
      const loadedTracks = [...baseTracks.slice(0,5), ...stemTracks, baseTracks[5]];

      console.log('[LOAD_STATE] tracks being set:', loadedTracks.map(t => t.key || t.id));
      return { ...makeInitialState(), ...action.state, tracks: loadedTracks };
    }

    case "ADD_STEM_TRACKS": {
      // action.stems = [{ type, label, color, url, duration? }]
      // Replaces any existing stem tracks, inserts after music track.
      const nonStemTracks = state.tracks.filter(t => !t.key.startsWith("stem-"));
      const stemTracks = action.stems.map(stem => ({
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

    default:
      return state;
  }
}
