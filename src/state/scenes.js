// src/state/scenes.js
// SAFE WRAPPER: provides ALL exports editorEvents expects.
// Goal: NO whitescreen (no missing exports), keep baseline usable (dnd/ratio/uploads/undo/redo).

import { stockMedia } from "./stock";

/* -----------------------------
   Utilities
----------------------------- */
function deepClone(obj) {
  if (typeof structuredClone === "function") return structuredClone(obj);
  return JSON.parse(JSON.stringify(obj));
}

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

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

function makeDraggable(card, media) {
  card.draggable = true;
  card.dataset.dragMedia = JSON.stringify(media);
}

/* -----------------------------
   Permanent uploads store (NOT undoable)
----------------------------- */
const uploadsStore = {
  items: []
};

function addUploadPermanent(media) {
  uploadsStore.items.push(media);
}

/* -----------------------------
   Editor state (undoable)
----------------------------- */
let editorState = {
  ratio: "16:9",
  activeSceneId: 1,
  scenes: [
    { id: 1, items: [], media: null, trim: { start: 0, end: 1 } }
  ]
};

/* -----------------------------
   History (undo/redo) — DOES NOT include uploads
----------------------------- */
const history = {
  past: [],
  future: [],
  limit: 80
};

function pushHistory() {
  history.past.push(deepClone(editorState));
  if (history.past.length > history.limit) history.past.shift();
  history.future = [];
}

/* -----------------------------
   Scene helpers
----------------------------- */
export function getScenes() {
  return editorState.scenes;
}

export function getActiveScene() {
  return editorState.scenes.find(s => s.id === editorState.activeSceneId) || null;
}

export function setActiveScene(id) {
  if (!id || id === editorState.activeSceneId) return;
  pushHistory();
  editorState.activeSceneId = id;
  renderPreview();
  renderUploadThumbnails();
  renderStockThumbnails();
}

export function addScene() {
  pushHistory();
  const nextId = Date.now();
  editorState.scenes.push({ id: nextId, items: [], media: null, trim: { start: 0, end: 1 } });
  editorState.activeSceneId = nextId;
  renderPreview();
  return nextId;
}

/* -----------------------------
   REQUIRED by editorEvents.js
----------------------------- */
export function addMediaToScene(media) {
  const scene = getActiveScene();
  if (!scene) return;
  pushHistory();
  scene.items.push(media);
  scene.media = media; // select it for preview
  renderPreview();
}

export function addUpload(media) {
  // Permanent: uploads must never be undone
  addUploadPermanent(media);
  // Optional: selecting upload should be done by user click/drag.
  // If you want auto-select on upload, uncomment next line:
  // addMediaToScene(media);
  renderUploadThumbnails();
}

export function setRatio(ratio) {
  if (!ratio || ratio === editorState.ratio) return;
  pushHistory();
  editorState.ratio = ratio;
  renderPreview();
}

export function undoAction() {
  if (!history.past.length) return;
  history.future.push(deepClone(editorState));
  editorState = deepClone(history.past.pop());
  renderPreview();
  renderUploadThumbnails();
  renderStockThumbnails();
}

export function redoAction() {
  if (!history.future.length) return;
  history.past.push(deepClone(editorState));
  editorState = deepClone(history.future.pop());
  renderPreview();
  renderUploadThumbnails();
  renderStockThumbnails();
}

/* -----------------------------
   Thumbnails
----------------------------- */
export function renderStockThumbnails() {
  const grid = document.getElementById("libraryGrid");
  if (!grid) return;

  grid.innerHTML = "";
  (stockMedia || []).forEach(media => {
    const card = document.createElement("div");
    card.className = "mediaCard";

    const img = document.createElement("img");
    img.src = media.thumbnail || media.url;
    img.style.width = "100%";
    img.style.height = "100%";
    img.style.objectFit = "cover";

    card.appendChild(img);
    makeDraggable(card, media);
    card.onclick = () => addMediaToScene(media);

    grid.appendChild(card);
  });
}

export function renderUploadThumbnails() {
  const grid = document.getElementById("uploadsGrid");
  if (!grid) return;

  grid.innerHTML = "";
  uploadsStore.items.forEach(media => {
    const card = document.createElement("div");
    card.className = "mediaCard";

    const img = document.createElement("img");
    img.src = media.thumbnail || media.url;
    img.style.width = "100%";
    img.style.height = "100%";
    img.style.objectFit = "cover";

    card.appendChild(img);
    makeDraggable(card, media);
    card.onclick = () => addMediaToScene(media);

    grid.appendChild(card);
  });
}

/* -----------------------------
   Preview (ratio frame + media fill)
----------------------------- */
export function renderPreview() {
  const stage = document.getElementById("previewStage");
  if (!stage) return;

  stage.innerHTML = "";
  stage.style.display = "flex";
  stage.style.alignItems = "center";
  stage.style.justifyContent = "center";
  stage.style.overflow = "hidden";

  const maxW = Math.max(1, stage.clientWidth) * 0.96;
  const maxH = Math.max(1, stage.clientHeight) * 0.96;
  const { width, height } = ratioToWH(editorState.ratio, maxW, maxH);

  const frame = document.createElement("div");
  frame.style.width = `${Math.round(width)}px`;
  frame.style.height = `${Math.round(height)}px`;
  frame.style.position = "relative";
  frame.style.background = "#05070c";
  frame.style.border = "1px solid rgba(255,255,255,0.08)";
  frame.style.borderRadius = "12px";
  frame.style.overflow = "hidden";

  stage.appendChild(frame);

  const scene = getActiveScene();
  const media = scene?.media || null;

  if (!media) {
    const empty = document.createElement("div");
    empty.textContent = "No media";
    empty.style.color = "#9aa4b2";
    empty.style.fontSize = "14px";
    empty.style.width = "100%";
    empty.style.height = "100%";
    empty.style.display = "flex";
    empty.style.alignItems = "center";
    empty.style.justifyContent = "center";
    frame.appendChild(empty);
    return;
  }

  const isVideo = media.type === "video" || (typeof media.url === "string" && media.url.match(/\.(mp4|webm|mov)(\?|$)/i));
  const el = document.createElement(isVideo ? "video" : "img");
  el.src = media.url;

  if (isVideo) {
    el.controls = true;
    el.playsInline = true;

    // Non-destructive trim clamp if present
    const trim = scene.trim || { start: 0, end: 1 };
    el.addEventListener("loadedmetadata", () => {
      const d = Number(el.duration || 0);
      if (!d) return;
      const s = clamp(trim.start ?? 0, 0, 1) * d;
      const e = clamp(trim.end ?? 1, 0, 1) * d;
      const start = Math.min(s, e);
      const end = Math.max(s, e);
      try { el.currentTime = start; } catch {}
      el.addEventListener("timeupdate", () => {
        if (el.currentTime > end) {
          el.pause();
          try { el.currentTime = start; } catch {}
        }
      });
    }, { once: true });
  }

  el.style.position = "absolute";
  el.style.inset = "0";
  el.style.width = "100%";
  el.style.height = "100%";
  el.style.objectFit = "cover";
  el.style.objectPosition = "center";
  el.style.display = "block";

  frame.appendChild(el);
}

/* -----------------------------
   Global hooks (compat)
----------------------------- */
window.renderStockThumbnails = renderStockThumbnails;
window.renderUploadThumbnails = renderUploadThumbnails;
window.renderPreview = renderPreview;

window.setRatio = setRatio;
window.setActiveScene = setActiveScene;

window.editorUndo = undoAction;
window.editorRedo = redoAction;
