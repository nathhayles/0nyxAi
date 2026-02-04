import TrimBar from "../components/TrimBar.jsx";
import SceneStrip from "../components/SceneStrip.jsx";

export default function Editor() {
  const drafts = JSON.parse(localStorage.getItem("drafts") || "[]");
  const activeId = localStorage.getItem("activeDraftId");
  const draft = drafts.find(d => d.id === activeId) || null;

  if (draft) {
    window.__ACTIVE_DRAFT__ = draft;
  }

  return `
    <div class="editorRoot">
      <div class="editorStage">
        <div class="videoStage">Drop media here</div>
        ${TrimBar()}
      </div>

      <div class="editorTimeline">
        ${SceneStrip()}
      </div>
    </div>
  `;
}
