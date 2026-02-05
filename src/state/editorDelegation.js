import { scenes, setActiveScene, addMediaToScene, renderPreview } from "./scenes.js";

let installed = false;

const TOOL_TITLES = {
  visuals: "Visuals",
  avatars: "Avatars",
  audio: "Audio",
  layouts: "Layouts",
  text: "Text",
  elements: "Elements",
  styles: "Styles",
  branding: "Branding",
};

function setToolUI(tool) {
  const title = document.querySelector(".editorToolPanel h3");
  const body = document.querySelector(".toolBody");
  const tabs = document.querySelector(".toolTabs");

  if (title) title.textContent = TOOL_TITLES[tool] || tool;

  // Only Visuals shows sub-tabs for now
  if (tabs) tabs.style.display = tool === "visuals" ? "flex" : "none";

  if (body) body.textContent = tool === "visuals" ? "" : `${TOOL_TITLES[tool] || tool} settings coming next`;
}

export function installEditorDelegation() {
  if (installed) return;
  installed = true;

  document.addEventListener("click", (e) => {
    const toolEl = e.target.closest('[data-action="tool"][data-tool]');
    if (toolEl) {
      document.querySelectorAll(".sidebarIcon").forEach(x => x.classList.remove("active"));
      toolEl.classList.add("active");
      setToolUI(toolEl.dataset.tool);
      return;
    }

    const tabEl = e.target.closest('[data-action="tab"]');
    if (tabEl) {
      document.querySelectorAll(".toolTab").forEach(x => x.classList.remove("active"));
      tabEl.classList.add("active");
      return;
    }

    const addBtn = e.target.closest('[data-action="add-scene"]');
    if (addBtn) {
      const nextId = scenes.length ? Math.max(...scenes.map(s => s.id)) + 1 : 1;
      scenes.push({ id: nextId, media: null });
      const bar = document.querySelector(".editorScenes");
      if (bar) {
        const el = document.createElement("span");
        el.dataset.action = "scene";
        el.dataset.sceneId = String(nextId);
        el.textContent = `Scene ${nextId}`;
        bar.appendChild(el);
      }
      setActiveScene(nextId);
      return;
    }

    const sceneEl = e.target.closest('[data-action="scene"][data-scene-id]');
    if (sceneEl) {
      setActiveScene(Number(sceneEl.dataset.sceneId));
      return;
    }

    const mediaEl = e.target.closest('[data-action="media"][data-media-label]');
    if (mediaEl) {
      addMediaToScene(mediaEl.dataset.mediaLabel);
      return;
    }
  });

  setTimeout(() => {
    // init tool UI from current active icon
    const activeTool = document.querySelector('.sidebarIcon.active')?.dataset.tool || "visuals";
    setToolUI(activeTool);
    renderPreview();
  }, 0);
}
