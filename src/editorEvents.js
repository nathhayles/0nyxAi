import {
  addUpload,
  addMediaToScene,
  setActiveScene,
  renderStockThumbnails,
  renderUploadThumbnails
} from "./state/scenes";

let sceneCount = 3;

function fileToDataURL(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

function videoToThumbDataURL(videoURL) {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.src = videoURL;
    video.muted = true;
    video.playsInline = true;

    const snap = () => {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || 320;
      canvas.height = video.videoHeight || 180;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg"));
    };

    video.addEventListener("loadeddata", () => {
      try { video.currentTime = 0.1; } catch {}
      setTimeout(snap, 120);
    }, { once: true });

    video.addEventListener("seeked", snap, { once: true });
  });
}

export function initEditorEvents() {
  setTimeout(() => {
    renderStockThumbnails();
    renderUploadThumbnails();
    wirePreviewDropZone();
  }, 0);

  document.addEventListener("click", (e) => {
    if (e.target.classList.contains("undoBtn")) {
      window.editorUndo?.();
      return;
    }

    if (e.target.classList.contains("redoBtn")) {
      window.editorRedo?.();
      return;
    }

    // LEFT TOOLBAR SWITCH
    const toolIcon = e.target.closest(".sidebarIcon");
    if (toolIcon && toolIcon.dataset.tool) {
      document.querySelectorAll(".sidebarIcon").forEach(i => i.classList.remove("active"));
      document.querySelectorAll(".toolPanel").forEach(p => p.classList.remove("active"));

      toolIcon.classList.add("active");
      document
        .querySelector(`.toolPanel[data-tool-panel="${toolIcon.dataset.tool}"]`)
        ?.classList.add("active");
      return;
    }

    // TABS (inside Visuals)
    if (e.target.classList.contains("toolTab")) {
      document.querySelectorAll(".toolTab").forEach(t => t.classList.remove("active"));
      document.querySelectorAll(".toolSection").forEach(s => s.classList.remove("active"));

      e.target.classList.add("active");
      const tab = e.target.dataset.tab;
      document.querySelector(`.toolSection[data-section="${tab}"]`)?.classList.add("active");

      if (tab === "library") renderStockThumbnails();
      if (tab === "uploads") renderUploadThumbnails();
      return;
    }

    // UPLOAD
    if (e.target.dataset.action === "upload") {
      const input = document.getElementById("mediaUploadInput");
      if (input) input.multiple = true;
      input?.click();
      return;
    }

    // SCENES
    if (e.target.dataset.action === "add-scene") {
      sceneCount++;
      const bar = document.querySelector(".editorScenes");
      const span = document.createElement("span");
      span.textContent = `Scene ${sceneCount}`;
      span.dataset.action = "scene";
      span.dataset.sceneId = String(sceneCount);
      bar?.appendChild(span);
      return;
    }

    if (e.target.dataset.action === "scene") {
      setActiveScene(Number(e.target.dataset.sceneId));
      return;
    }
  });

  // Ratio + Upload change handlers
  document.addEventListener("change", async (e) => {
    if (e.target.classList?.contains("ratioSelect")) {
      window.setRatio?.(e.target.value);
      return;
    }

    if (e.target.id === "mediaUploadInput") {
      const files = Array.from(e.target.files || []);
      if (!files.length) return;

      for (const file of files) {
        const blobURL = URL.createObjectURL(file);
        const isVideo = file.type.startsWith("video");

        if (!isVideo) {
          const thumb = await fileToDataURL(file);
          addUpload({ type: "image", url: blobURL, thumbnail: thumb });
        } else {
          const thumb = await videoToThumbDataURL(blobURL);
          addUpload({ type: "video", url: blobURL, thumbnail: thumb });
        }
      }

      renderUploadThumbnails();
      e.target.value = "";
      return;
    }
  });

  // Drag start payload from any mediaCard
  document.addEventListener("dragstart", (e) => {
    const card = e.target.closest(".mediaCard");
    if (!card || !card.dataset.dragMedia) return;
    e.dataTransfer.setData("application/json", card.dataset.dragMedia);
    e.dataTransfer.effectAllowed = "copy";
  });
}

function wirePreviewDropZone() {
  const stage = document.getElementById("previewStage");
  if (!stage) return;

  stage.addEventListener("dragover", (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  });

  stage.addEventListener("drop", (e) => {
    e.preventDefault();
    const payload = e.dataTransfer.getData("application/json");
    if (!payload) return;

    try {
      const media = JSON.parse(payload);
      addMediaToScene(media);
    } catch {}
  });
}
