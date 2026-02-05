export const scenes = [
  { id: 1, media: null },
  { id: 2, media: null },
  { id: 3, media: null }
];

let activeSceneId = 1;

export function setActiveScene(id) {
  activeSceneId = id;
  renderPreview();
}

export function addMediaToScene(media) {
  const scene = scenes.find(s => s.id === activeSceneId);
  if (!scene) return;

  scene.media = media;
  renderPreview();
}

export function renderPreview() {
  const stage = document.getElementById("previewStage");
  if (!stage) return;

  const scene = scenes.find(s => s.id === activeSceneId);
  stage.innerHTML = "";

  if (!scene || !scene.media) {
    stage.innerHTML = '<div class="emptyPreview">No media</div>';
    return;
  }

  if (scene.media.type === "image") {
    const img = document.createElement("img");
    img.src = scene.media.url;
    img.style.maxWidth = "100%";
    img.style.maxHeight = "100%";
    stage.appendChild(img);
  }

  if (scene.media.type === "video") {
    const vid = document.createElement("video");
    vid.src = scene.media.url;
    vid.controls = true;
    vid.style.maxWidth = "100%";
    vid.style.maxHeight = "100%";
    stage.appendChild(vid);
  }
}

window.setActiveScene = setActiveScene;
