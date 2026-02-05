export const scenes = [
  { id: 1, media: null },
  { id: 2, media: null },
  { id: 3, media: null },
];

let activeSceneId = 1;

export function setActiveScene(id) {
  activeSceneId = id;
  renderPreview();
}

export function addMediaToScene(label) {
  const scene = scenes.find(s => s.id === activeSceneId);
  if (!scene) return;
  scene.media = label;
  renderPreview();
}

export function renderPreview() {
  const el = document.getElementById("previewContent");
  const scene = scenes.find(s => s.id === activeSceneId);
  if (!el) return;

  el.textContent = scene?.media
    ? `Scene ${scene.id}: ${scene.media}`
    : `Scene ${scene.id}: Empty`;
}
