import { getSelectedScene, attachMediaToScene } from "./store/appState.js";

export function initStockUI(selector) {
  const root = document.querySelector(selector);
  if (!root) return;

  root.innerHTML = `
    <div class="stock-ui">
      <input id="stockSearch" placeholder="Search stock media…" />
      <div id="stockResults" style="margin-top:10px;display:grid;gap:8px"></div>
    </div>
  `;

  const input = document.getElementById("stockSearch");
  const results = document.getElementById("stockResults");

  input.onchange = () => {
    const q = input.value || "";
    results.innerHTML = `
      <div class="btn secondary" data-add="img">Attach image: "${q}"</div>
      <div class="btn secondary" data-add="vid">Attach video: "${q}"</div>
    `;
    results.querySelectorAll("[data-add]").forEach(btn => {
      btn.onclick = () => {
        const sceneId = getSelectedScene();
        if (!sceneId) {
          alert("Select a scene in the timeline first.");
          return;
        }
        attachMediaToScene(sceneId, {
          type: btn.getAttribute("data-add"),
          query: q,
          attachedAt: new Date().toISOString()
        });
        alert("Media attached to scene " + sceneId);
      };
    });
  };
}
