import { mountSceneStrip } from "./components/SceneStrip";
import { mountTimeline } from "./components/Timeline";
import { mountAiStudio } from "./components/AiStudio";

export function initEditorEnhancements() {
  setTimeout(() => {
    mountSceneStrip();
    mountTimeline();
    mountAiStudio();
  }, 0);
}
