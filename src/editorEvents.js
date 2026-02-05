import {
  addUpload,
  setActiveScene,
  renderStockThumbnails
} from "./state/scenes";

let sceneCount = 3;

export function initEditorEvents() {

  document.addEventListener("click", (e) => {

    if (e.target.classList.contains("toolTab")) {
      document.querySelectorAll(".toolTab").forEach(t => t.classList.remove("active"));
      document.querySelectorAll(".toolSection").forEach(s => s.classList.remove("active"));

      e.target.classList.add("active");
      const tab = e.target.dataset.tab;
      document.querySelector(`.toolSection[data-section="${tab}"]`)?.classList.add("active");

      if (tab === "library") renderStockThumbnails();
    }

    if (e.target.dataset.action === "upload") {
      document.getElementById("mediaUploadInput")?.click();
    }

    if (e.target.dataset.action === "add-scene") {
      sceneCount++;
      const bar = document.querySelector(".editorScenes");
      const span = document.createElement("span");
      span.textContent = `Scene ${sceneCount}`;
      span.dataset.action = "scene";
      span.dataset.sceneId = sceneCount;
      bar.appendChild(span);
    }

    if (e.target.dataset.action === "scene") {
      setActiveScene(Number(e.target.dataset.sceneId));
    }
  });

  document.addEventListener("change", (e) => {
    if (e.target.id === "mediaUploadInput") {
      const file = e.target.files[0];
      if (!file) return;

      const url = URL.createObjectURL(file);
      const type = file.type.startsWith("video") ? "video" : "image";
      addUpload({ type, url, thumbnail: url });
    }
  });

}
