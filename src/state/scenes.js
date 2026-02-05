export const scenes = [
  { id: 1, media: null, uploads: [] },
  { id: 2, media: null, uploads: [] },
  { id: 3, media: null, uploads: [] }
];

let activeSceneId = 1;

export function setActiveScene(id) {
  activeSceneId = id;
  renderPreview();
  renderUploadThumbnails();
}

export function addMediaToScene(media) {
  const scene = scenes.find(s => s.id === activeSceneId);
  if (!scene) return;

  scene.media = media;
  renderPreview();
}

export function addUpload(media) {
  const scene = scenes.find(s => s.id === activeSceneId);
  if (!scene) return;

  scene.uploads.push(media);
  scene.media = media;
  renderUploadThumbnails();
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

export function renderUploadThumbnails() {
  const grid = document.getElementById("uploadsGrid");
  if (!grid) return;

  const scene = scenes.find(s => s.id === activeSceneId);
  grid.innerHTML = "";

  scene.uploads.forEach((media, index) => {
    const card = document.createElement("div");
    card.className = "mediaCard";
    card.dataset.index = index;

    if (media.type === "image") {
      const img = document.createElement("img");
      img.src = media.url;
      card.appendChild(img);
    } else {
      card.textContent = "Video";
    }

    card.addEventListener("click", () => {
      addMediaToScene(media);
    });

    grid.appendChild(card);
  });
}

window.setActiveScene = setActiveScene;
