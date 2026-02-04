import { getCurrent } from "../store/appState.js";

export async function renderTimeline() {
  const cur = getCurrent() || {};
  const scenes = Array.isArray(cur.scenes) ? cur.scenes : [];

  return {
    fps: cur.timeline?.fps || 30,
    tracks: [
      {
        id: "scenes",
        items: scenes.map((s, i) => ({
          id: s.id || "scene_" + i,
          type: s.type || "unknown",
          label: s.text || s.query || "Scene " + (i + 1),
          start: i * 3,
          duration: 3,
        })),
      },
      cur.voiceover?.enabled
        ? {
            id: "voiceover",
            items: [
              {
                id: "vo_1",
                type: "voiceover",
                label: "Voiceover",
                start: 0,
                duration: scenes.length * 3,
              },
            ],
          }
        : null,
    ].filter(Boolean),
  };
}
