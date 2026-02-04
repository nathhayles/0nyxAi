import { getSelectedScene } from "../store/selection.js";
import { setSceneVoiceover, setSceneMusic } from "../store/scenesAudio.js";
import { getVoiceovers, getMusic } from "../store/audioStore.js";

export default function SceneAudioPanel(scene) {
  const voices = getVoiceovers();
  const music = getMusic();

  if (!scene) return "<p>Select a scene</p>";

  return `
    <h3>Scene Audio</h3>

    <label>Voiceover</label>
    <select id="sceneVoice">
      <option value="">None</option>
      ${voices.map(v=>`
        <option value="${v.src}" ${scene.voiceover===v.src?"selected":""}>
          ${v.name}
        </option>
      `).join("")}
    </select>

    <label>Music</label>
    <select id="sceneMusic">
      <option value="">None</option>
      ${music.map(m=>`
        <option value="${m.src}" ${scene.music===m.src?"selected":""}>
          ${m.name}
        </option>
      `).join("")}
    </select>
  `;
}

export function bindSceneAudio(scene) {
  const v = document.getElementById("sceneVoice");
  if (v) v.onchange = e =>
    setSceneVoiceover(getSelectedScene(), e.target.value);

  const m = document.getElementById("sceneMusic");
  if (m) m.onchange = e =>
    setSceneMusic(getSelectedScene(), e.target.value);
}
