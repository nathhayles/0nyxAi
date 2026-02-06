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

function ratioToWH(ratio, maxW, maxH) {
  let w = 16, h = 9;
  if (ratio === "9:16") { w = 9; h = 16; }
  else if (ratio === "1:1") { w = 1; h = 1; }
  else if (ratio === "4:5") { w = 4; h = 5; }

  let width = maxW;
  let height = (width * h) / w;

  if (height > maxH) {
    height = maxH;
    width = (height * w) / h;
  }

  return { width, height };
}

export function setRatio(ratio) {
  if (!ratio || ratio === editorState.ratio) return;
  pushHistory(editorState);
  editorState = { ...editorState, ratio };
  renderPreview();
}

export function setActiveScene(id) {
  if (!id || id === editorState.activeSceneId) return;
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
  stage.style.display = "flex";
  stage.style.alignItems = "center";
  stage.style.justifyContent = "center";
  stage.style.width = "100%";
  stage.style.height = "100%";
  stage.style.overflow = "hidden";

  const maxW = Math.max(1, stage.clientWidth) * 0.92;
  const maxH = Math.max(1, stage.clientHeight) * 0.92;

  const { width, height } = ratioToWH(editorState.ratio, maxW, maxH);

  const frame = document.createElement("div");
  frame.className = "previewFrame";
  frame.style.width = `${Math.round(width)}px`;
  frame.style.height = `${Math.round(height)}px`;
  frame.style.position = "relative";
  frame.style.background = "#070a0f";
  frame.style.border = "1px solid rgba(255,255,255,0.08)";
  frame.style.borderRadius = "12px";
  frame.style.overflow = "hidden";
  stage.appendChild(frame);

  if (!scene || !scene.media) {
    const empty = document.createElement("div");
    empty.className = "emptyPreview";
    empty.textContent = "No media";
    empty.style.color = "#9aa4b2";
    empty.style.fontSize = "14px";
    frame.appendChild(empty);
    return;
  }

  const el = document.createElement(scene.media.type === "video" ? "video" : "img");
  el.src = scene.media.url;
  if (scene.media.type === "video") el.controls = true;

  // media out of layout flow + FILL FRAME (fixes “9:16 looks wrong”)
  el.style.position = "absolute";
  el.style.inset = "0";
  el.style.width = "100%";
  el.style.height = "100%";
  el.style.objectFit = "cover";
  el.style.objectPosition = "center";
  el.style.display = "block";
  frame.appendChild(el);
}

function makeDraggableCard(card, media) {
  card.draggable = true;
  card.dataset.dragMedia = JSON.stringify({
    type: media.type,
    url: media.url,
    thumbnail: media.thumbnail
  });
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
    img.style.width = "100%";
    img.style.height = "100%";
    img.style.objectFit = "cover";
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
    img.style.width = "100%";
    img.style.height = "100%";
    img.style.objectFit = "cover";
    card.appendChild(img);

    makeDraggableCard(card, { ...media, thumbnail: media.thumbnail });
    card.onclick = () => addMediaToScene(media);

    grid.appendChild(card);
  });
}

window.editorUndo = undoAction;
window.editorRedo = redoAction;
window.setRatio = setRatio;
window.renderPreview = renderPreview;
