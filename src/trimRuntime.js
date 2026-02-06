import { openTrimModal } from "./ui/TrimModal.js";

const STATE = {
  video: null,
  btn: null,
  trim: { start: 0, end: 1 }
};

function applyTrim(video) {
  if (!video) return;

  video.ontimeupdate = null;

  const onMeta = () => {
    const d = Number(video.duration || 0);
    if (!d) return;

    const start = STATE.trim.start * d;
    const end = STATE.trim.end * d;

    try { video.currentTime = start; } catch {}

    video.ontimeupdate = () => {
      if (video.currentTime > end) {
        video.pause();
        try { video.currentTime = start; } catch {}
      }
    };
  };

  if (video.readyState >= 1) onMeta();
  else video.addEventListener("loadedmetadata", onMeta, { once: true });
}

function ensureTrimButton(video) {
  const stage = document.getElementById("previewStage");
  if (!stage) return;

  if (getComputedStyle(stage).position === "static") {
    stage.style.position = "relative";
  }

  if (STATE.btn) STATE.btn.remove();

  const btn = document.createElement("button");
  btn.textContent = "Trim";
  btn.style.position = "absolute";
  btn.style.right = "16px";
  btn.style.bottom = "16px";
  btn.style.zIndex = "99999";

  btn.onclick = () => {
    openTrimModal({
      start: STATE.trim.start,
      end: STATE.trim.end,
      video,
      onApply: ({ start, end }) => {
        STATE.trim = { start, end };
        applyTrim(video);
      }
    });
  };

  stage.appendChild(btn);
  STATE.btn = btn;
}

function attachIfVideoChanged() {
  const stage = document.getElementById("previewStage");
  if (!stage) return;

  const video = stage.querySelector("video");
  if (!video) return;

  if (STATE.video !== video || video.src !== STATE.video?.src) {
    STATE.video = video;
    applyTrim(video);
    ensureTrimButton(video);
  }
}

const observer = new MutationObserver(attachIfVideoChanged);

window.addEventListener("DOMContentLoaded", () => {
  attachIfVideoChanged();
  observer.observe(document.body, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ["src"]
  });
});
