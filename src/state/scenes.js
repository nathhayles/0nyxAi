import { stockMedia } from "./stock";
import { pushHistory, undo, redo } from "./history";

export let editorState = {
  ratio: "16:9",
  activeSceneId: 1,
  scenes: [
    { id: 1, media: null, uploads: [] },
    { id: 2, media: null, uploads: [] },
    { id: 3, media: null, uploads: [] }
  ]
};

export function setRatio(ratio) {
  pushHistory(editorState);
  editorState = { ...editorState, ratio };
  renderPreview();
}

export function setActiveScene(id) {
  pushHistory(editorState);
  editorState = { ...editorState, activeSceneId: id };
  renderPreview();
  renderUploadThumbnails();
}

export function addMediaToScene(media) {
  pushHistory(editorState);
  editorState = {
    ...editorState,
    scenes: editorState.scenes.map(s =>
      s.id === editorState.activeSceneId ? { ...s, media } : s
    )
  };
  renderPreview();
}

export function addUpload(media) {
  pushHistory(editorState);
  editorState = {
    ...editorState,
    scenes: editorState.scenes.map(s =>
      s.id === editorState.activeSceneId
        ? { ...s, uploads: [...s.uploads, media], media }
        : s
    )
  };
  renderUploadThumbnails();
  renderPreview();
}

export function undoAction() {
  editorState = undo(editorState);
  renderUploadThumbnails();
  renderPreview();
}

export function redoAction() {
  editorState = redo(editorState);
  renderUploadThumbnails();
  renderPreview();
}

export function renderPreview() {
  const stage = document.getElementById("previewStage");
  if (!stage) return;

  const scene = editorState.scenes.find(s => s.id === editorState.activeSceneId);
  stage.innerHTML = "";
  stage.dataset.ratio = editorState.ratio;

  if (!scene || !scene.media) {
    stage.innerHTML = '<div class="emptyPreview">No media</div>';
    return;
  }

  if (scene.media.type === "image") {
    const img = document.createElement("img");
    img.src = scene.media.url;
    stage.appendChild(img);
    return;
  }

  if (scene.media.type === "video") {
    const vid = document.createElement("video");
    vid.src = scene.media.url;
    vid.controls = true;
    stage.appendChild(vid);
    return;
  }
}

function makeDraggableCard(card, media) {
  card.draggable = true;
  card.dataset.dragMedia = JSON.stringify({ type: media.type, url: media.url, thumbnail: media.thumbnail });
}

export function renderUploadThumbnails() {
  const grid = document.getElementById("uploadsGrid");
  if (!grid) return;

  const scene = editorState.scenes.find(s => s.id === editorState.activeSceneId);
  grid.innerHTML = "";

  scene.uploads.forEach(media => {
    const card = document.createElement("div");
    card.className = "mediaCard";

    const img = document.createElement("img");
    img.src = media.thumbnail;
    card.appendChild(img);

    makeDraggableCard(card, media);

    card.onclick = () => addMediaToScene(media);
    grid.appendChild(card);
  });
}

export function renderStockThumbnails() {
  const grid = document.getElementById("libraryGrid");
  if (!grid) return;

  grid.innerHTML = "";
  stockMedia.forEach(media => {
    const card = document.createElement("div");
    card.className = "mediaCard";

    const img = document.createElement("img");
    img.src = media.thumbnail;
    card.appendChild(img);

    // for stock, thumbnail is remote; url is remote
    makeDraggableCard(card, { ...media, thumbnail: media.thumbnail });

    card.onclick = () => addMediaToScene(media);
    grid.appendChild(card);
  });
}

window.editorUndo = undoAction;
window.editorRedo = redoAction;
window.setRatio = setRatio;
