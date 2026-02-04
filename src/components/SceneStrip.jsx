import { getScenes, addScene, deleteScene, duplicateScene } from "../store/scenes.js";

export default function SceneStrip() {
  const scenes = getScenes();

  return `
    <div class="sceneStrip">
      <button
        style="margin-bottom:10px"
        onclick="(function(){
          const scene = { id: Date.now(), clips: [] };
          window.__addScene(scene);
        })()"
      >
        + Add Scene
      </button>

      <div class="scenes">
        ${scenes.map((s, i) => `
          <div class="sceneItem">
            <span>Scene ${i + 1}</span>
            <button onclick="window.__deleteScene(${i})">🗑</button>
            <button onclick="window.__duplicateScene(${i})">⧉</button>
          </div>
        `).join("")}
      </div>
    </div>
  `;
}

/* global helpers */
window.__addScene = function (scene) {
  addScene(scene);
  window.location.reload();
};

window.__deleteScene = function (i) {
  deleteScene(i);
  window.location.reload();
};

window.__duplicateScene = function (i) {
  duplicateScene(i);
  window.location.reload();
};
