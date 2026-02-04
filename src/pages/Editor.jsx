import SceneStrip from "../components/SceneStrip.jsx";
import { MediaPanel } from "../components/MediaPanel.jsx";

export default function Editor() {
  return `
    <div class="editorRoot">
      <div class="editorLeft">
        <div class="editorLeftPanel">
          ${MediaPanel()}
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
