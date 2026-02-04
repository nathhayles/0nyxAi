import SceneStrip from "../components/SceneStrip.jsx";
import { MediaPanel } from "../components/MediaPanel.jsx";
import { exportProject } from "../api/export.js";

export default function Editor() {
  return `
    <div class="editorRoot">
      <div class="editorLeft">
        <div class="editorLeftPanel">
          ${MediaPanel()}
          <button id="exportBtn" class="btnPrimary fullWidth" style="margin-top:12px">
            Export Video
          </button>
        </div>
      </div>

      <div class="editorCanvas">
        <div class="previewDrop">
          <div class="dropZone">Drop media here</div>
        </div>
        ${SceneStrip()}
      </div>
    </div>
  `;
}

document.addEventListener("click", async (e) => {
  if (e.target?.id === "exportBtn") {
    e.target.textContent = "Rendering...";
    e.target.disabled = true;

    const result = await exportProject();

    e.target.textContent = "Export Video";
    e.target.disabled = false;

    if (result?.success) {
      alert("Export complete! (stub)");
    } else {
      alert("Export failed");
    }
  }
});
