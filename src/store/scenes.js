const STORAGE_KEY = "editor_scenes";

function load() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function save(scenes) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(scenes));
}

export function getScenes() {
  return load();
}

export function setScenes(next) {
  save(next);
}

export function addScene(scene) {
  const scenes = load();
  scenes.push(scene);
  save(scenes);
}

export function deleteScene(index) {
  const scenes = load();
  scenes.splice(index, 1);
  save(scenes);
}

export function duplicateScene(index) {
  const scenes = load();
  const s = scenes[index];
  if (!s) return;
  scenes.splice(index + 1, 0, { ...s, id: Date.now() });
  save(scenes);
}

export function resetScenes() {
  save([]);
}
