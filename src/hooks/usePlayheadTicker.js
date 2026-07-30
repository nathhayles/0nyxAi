import { useState, useEffect } from "react";

// Live 60fps playhead value for leaf components that need per-frame visual
// sync (progress bar, playhead cursor line, timecode) WITHOUT forcing the
// large surrounding tree to re-render on every tick.
//
// Reads livePlayheadRef, which EditorV2's master rAF playback clock already
// updates every frame during playback (see the "Playback engine" effect in
// EditorV2.jsx) -- this hook doesn't reimplement any of that wallTime/
// loop-wrap arithmetic, it just mirrors the ref into local React state for
// whichever single leaf component calls it. Only that leaf re-renders at
// 60fps; everything above it (SequencerPanel, EditorV2 itself) no longer
// re-renders from playback ticking at all, since timelineState.playhead is
// now only updated at discrete checkpoints (seek/play-start/pause/loop-wrap),
// not every frame.
//
// Falls back to checkpointPlayhead (timelineState.playhead) whenever
// playback isn't active, since there's no live ref value worth polling then
// -- checkpointPlayhead is already exactly correct while paused/scrubbing.
export function usePlayheadTicker(livePlayheadRef, isPlaying, checkpointPlayhead) {
  const [live, setLive] = useState(checkpointPlayhead);

  useEffect(() => {
    if (!isPlaying) {
      setLive(checkpointPlayhead);
      return;
    }
    let rafId;
    function tick() {
      setLive(livePlayheadRef.current);
      rafId = requestAnimationFrame(tick);
    }
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [isPlaying, livePlayheadRef, checkpointPlayhead]);

  return live;
}
