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

export function addMediaToScene(type) {
  const scene = scenes.find(s => s.id === activeSceneId);
  if (!scene) return;
  scene.media = { type };
  renderPreview();
}

export function renderPreview() {
  const stage = document.getElementById("previewStage");
  if (!stage) return;

  const scene = scenes.find(s => s.id === activeSceneId);
  stage.innerHTML = "";

  if (!scene || !scene.media) {
    const empty = document.createElement("div");
    empty.className = "emptyPreview";
    empty.textContent = "No media";
    stage.appendChild(empty);
    return;
  }

  const box = document.createElement("div");
  box.className = "previewMedia";
  box.textContent = scene.media.type + " PREVIEW";
  stage.appendChild(box);
}
