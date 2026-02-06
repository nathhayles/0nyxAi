// src/state/scenes.js
// Stable core: DnD + uploads not undone + ratio frame preview + ratio dropdown wiring

import { stockMedia } from "./stock";

/* -----------------------------
   Stores
----------------------------- */
const uploadsStore = { items: [] };

let editorState = {
  ratio: "16:9",
  activeSceneId: 1,
  scenes: [
    { id: 1, items: [], media: null, trim: { start: 0, end: 1 } },
    { id: 2, items: [], media: null, trim: { start: 0, end: 1 } },
    { id: 3, items: [], media: null, trim: { start: 0, end: 1 } }
  ]
};

const history = { past: [], future: [], limit: 80 };

function clone(v) {
  return typeof structuredClone === "function"
    ? structuredClone(v)
    : JSON.parse(JSON.stringify(v));
}

function pushHistory() {
  history.past.push(clone(editorState));
  if (history.past.length > history.limit) history.past.shift();
  history.future = [];
}

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function ratioWH(ratio) {
  if (ratio === "9:16") return [9, 16];
  if (ratio === "1:1") return [1, 1];
  if (ratio === "4:5") return [4, 5];
  return [16, 9];
}

/* -----------------------------
   Drag helper (RESTORES DnD)
----------------------------- */
function makeDraggable(el, media) {
  el.draggable = true;
  el.dataset.dragMedia = JSON.stringify(media);

  el.addEventListener("dragstart", (e) => {
    try {
      e.dataTransfer.effectAllowed = "copy";
      e.dataTransfer.setData("application/json", el.dataset.dragMedia);
      e.dataTransfer.setData("text/plain", el.dataset.dragMedia);
    } catch {}
  });
}

/* -----------------------------
   Scene API (exports expected by editorEvents)
----------------------------- */
export function getScenes() {
  return editorState.scenes;
}

export function getActiveScene() {
  return editorState.scenes.find(s => s.id === editorState.activeSceneId) || null;
}

export function setActiveScene(id) {
  if (!id) return;
  pushHistory();
  editorState.activeSceneId = id;
  renderPreview();
}

export function addScene() {
  pushHistory();
  const id = Date.now();
  editorState.scenes.push({ id, items: [], media: null, trim: { start: 0, end: 1 } });
  editorState.activeSceneId = id;
  renderPreview();
  return id;
}

export function addMediaToScene(media) {
  const scene = getActiveScene();
  if (!scene) return;
  pushHistory();
  scene.items.push(media);
  scene.media = media;
  renderPreview();
}

export function addUpload(media) {
  // Permanent: uploads must NEVER be undone
  uploadsStore.items.push(media);
  renderUploadThumbnails();
}

export function setRatio(ratio) {
  if (!ratio) return;
  pushHistory();
  editorState.ratio = ratio;
  renderPreview();
}

export function undoAction() {
  if (!history.past.length) return;
  history.future.push(clone(editorState));
  editorState = clone(history.past.pop());
  renderPreview();
  renderUploadThumbnails();
  renderStockThumbnails();
}

export function redoAction() {
  if (!history.future.length) return;
  history.past.push(clone(editorState));
  editorState = clone(history.future.pop());
  renderPreview();
  renderUploadThumbnails();
  renderStockThumbnails();
}

/* -----------------------------
   Thumbnails (DnD payloads)
----------------------------- */
export function renderStockThumbnails() {
  const grid = document.getElementById("libraryGrid");
  if (!grid) return;

  grid.innerHTML = "";
  (stockMedia || []).forEach((m) => {
    const card = document.createElement("div");
    card.className = "mediaCard";

    const img = document.createElement("img");
    img.src = m.thumbnail || m.url;
    img.style.width = "100%";
    img.style.height = "100%";
    img.style.objectFit = "cover";

    card.appendChild(img);
    makeDraggable(card, m);
    card.onclick = () => addMediaToScene(m);
    grid.appendChild(card);
  });
}

export function renderUploadThumbnails() {
  const grid = document.getElementById("uploadsGrid");
  if (!grid) return;

  grid.innerHTML = "";
  uploadsStore.items.forEach((m) => {
    const card = document.createElement("div");
    card.className = "mediaCard";

    const img = document.createElement("img");
    img.src = m.thumbnail || m.url;
    img.style.width = "100%";
    img.style.height = "100%";
    img.style.objectFit = "cover";

    card.appendChild(img);
    makeDraggable(card, m);
    card.onclick = () => addMediaToScene(m);
    grid.appendChild(card);
  });
}

/* -----------------------------
   Preview (RATIO FRAME + NO OVERFLOW)
----------------------------- */
export function renderPreview() {
  const stage = document.getElementById("previewStage");
  if (!stage) return;

  stage.innerHTML = "";
  stage.style.display = "flex";
  stage.style.alignItems = "center";
  stage.style.justifyContent = "center";
  stage.style.overflow = "hidden";

  const scene = getActiveScene();
  if (!scene || !scene.media) {
    const empty = document.createElement("div");
    empty.textContent = "No media";
    empty.style.color = "#9aa4b2";
    stage.appendChild(empty);
    return;
  }

  const ratio = editorState.ratio || "16:9";
  const [rw, rh] = ratioWH(ratio);

  const maxW = Math.max(1, stage.clientWidth) * 0.96;
  const maxH = Math.max(1, stage.clientHeight) * 0.96;

  let width = maxW;
  let height = (width * rh) / rw;
  if (height > maxH) {
    height = maxH;
    width = (height * rw) / rh;
  }

  const frame = document.createElement("div");
  frame.style.width = `${Math.round(width)}px`;
  frame.style.height = `${Math.round(height)}px`;
  frame.style.position = "relative";
  frame.style.overflow = "hidden";
  frame.style.background = "#05070c";
  frame.style.border = "1px solid rgba(255,255,255,0.08)";
  frame.style.borderRadius = "12px";

  stage.appendChild(frame);

  const isVideo =
    scene.media.type === "video" ||
    (typeof scene.media.url === "string" && /\.(mp4|webm|mov)(\?|$)/i.test(scene.media.url));

  const el = document.createElement(isVideo ? "video" : "img");
  el.src = scene.media.url;

  if (isVideo) {
    el.controls = true;
    el.playsInline = true;

    // keep trim clamp support (safe)
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

  frame.appendChild(el);
}

/* -----------------------------
   Global exposure (what your UI expects)
----------------------------- */
window.getScenes = getScenes;
window.getActiveScene = getActiveScene;
window.addScene = addScene;
window.setActiveScene = setActiveScene;

window.addMediaToScene = addMediaToScene;
window.addUpload = addUpload;

window.setRatio = setRatio;
window.editorUndo = undoAction;
window.editorRedo = redoAction;

window.renderStockThumbnails = renderStockThumbnails;
window.renderUploadThumbnails = renderUploadThumbnails;
window.renderPreview = renderPreview;

/* -----------------------------
   UI wiring: ratio dropdown -> setRatio
----------------------------- */
function bindRatioSelect() {
  const sel = document.querySelector(".ratioSelect");
  if (!sel) return;

  // sync UI to state
  try { sel.value = editorState.ratio; } catch {}

  sel.onchange = (e) => {
    const v = e.target.value;
    setRatio(v);
  };
}

/* Kick initial render/binds after DOM exists */
setTimeout(() => {
  bindRatioSelect();
  renderStockThumbnails();
  renderUploadThumbnails();
  renderPreview();
}, 0);
