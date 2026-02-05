import { setActiveScene, addMediaToScene } from "./scenes.js";

export function bindEditorInteractions() {
  // Scene buttons
  document.querySelectorAll(".editorScenes span").forEach((el, i) => {
    el.onclick = () => setActiveScene(i + 1);
  });

  // Media cards
  document.querySelectorAll(".mediaCard").forEach(card => {
    const label = card.textContent.trim();
    card.onclick = () => addMediaToScene(label);
  });
}
