import { addUpload, addMediaToScene, setActiveScene } from "./state/scenes";

let sceneCount = 3;

export function initEditorEvents() {

  document.addEventListener("click", (e) => {

    if (e.target.classList.contains("toolTab")) {
      document.querySelectorAll(".toolTab").forEach(t => t.classList.remove("active"));
      document.querySelectorAll(".toolSection").forEach(s => s.classList.remove("active"));

      e.target.classList.add("active");
      const tab = e.target.dataset.tab;
      document.querySelector(`.toolSection[data-section="${tab}"]`)?.classList.add("active");
    }

    if (e.target.dataset.action === "upload") {
      document.getElementById("mediaUploadInput")?.click();
    }

    if (e.target.dataset.action === "media") {
      const type = e.target.dataset.mediaType;
      const url =
        type === "video"
          ? "https://www.w3schools.com/html/mov_bbb.mp4"
          : "https://picsum.photos/1200/800";

      addMediaToScene({ type, url, thumbnail: url });
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

      if (type === "image") {
        addUpload({ type, url, thumbnail: url });
        return;
      }

      // VIDEO THUMBNAIL GENERATION
      const video = document.createElement("video");
      video.src = url;
      video.muted = true;
      video.currentTime = 0.1;

      video.addEventListener("loadeddata", () => {
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        const ctx = canvas.getContext("2d");
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        const thumb = canvas.toDataURL("image/jpeg");
        addUpload({ type: "video", url, thumbnail: thumb });
      });
    }
  });

}
