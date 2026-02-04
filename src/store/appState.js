const KEY = "onyx_app_state_v1";

function nowId() {
  return "d_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8);
}

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { drafts: [], current: null, selectedSceneId: null };
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return { drafts: [], current: null, selectedSceneId: null };
    if (!Array.isArray(parsed.drafts)) parsed.drafts = [];
    return parsed;
  } catch {
    return { drafts: [], current: null, selectedSceneId: null };
  }
}

function save(state) {
  localStorage.setItem(KEY, JSON.stringify(state));
}

export function getState() {
  return load();
}

export function setCurrent(doc) {
  const state = load();
  state.current = doc;
  save(state);
}

export function getCurrent() {
  return load().current;
}

export function setSelectedScene(sceneId) {
  const state = load();
  state.selectedSceneId = sceneId;
  save(state);
}

export function getSelectedScene() {
  return load().selectedSceneId;
}

export function attachMediaToScene(sceneId, media) {
  const state = load();
  if (!state.current || !Array.isArray(state.current.scenes)) return;
  const idx = state.current.scenes.findIndex(s => s.id === sceneId);
  if (idx < 0) return;
  const scene = state.current.scenes[idx];
  scene.media = scene.media || [];
  scene.media.push(media);
  state.current.scenes[idx] = scene;
  save(state);
}

export function upsertDraft({ id, title, data }) {
  const state = load();
  const draftId = id || nowId();
  const existingIndex = state.drafts.findIndex((d) => d.id === draftId);

  const entry = {
    id: draftId,
    title: title || "Untitled",
    updatedAt: new Date().toISOString(),
    data: data || {},
  };

  if (existingIndex >= 0) state.drafts[existingIndex] = entry;
  else state.drafts.unshift(entry);

  state.current = { draftId, ...entry.data };
  save(state);
  return draftId;
}

export function deleteDraft(id) {
  const state = load();
  state.drafts = state.drafts.filter((d) => d.id !== id);
  if (state.current?.draftId === id) state.current = null;
  save(state);
}

export function getDrafts() {
  return load().drafts;
}

export function getDraft(id) {
  return load().drafts.find((d) => d.id === id) || null;
}
