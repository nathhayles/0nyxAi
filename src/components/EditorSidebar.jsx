import { getActiveTool, setActiveTool } from "../store/editorUI.js";

export default function EditorSidebar() {
  const active = getActiveTool();

  return `
    <button class="${active==="storyboard"?"active":""}" data-tool="storyboard" title="Storyboard">📝</button>
    <button class="${active==="visuals"?"active":""}" data-tool="visuals" title="Visuals">🖼️</button>
    <button class="${active==="sound"?"active":""}" data-tool="sound" title="Sound">🔊</button>
    <button class="${active==="styles"?"active":""}" data-tool="styles" title="Styles">🎨</button>
    <button class="${active==="branding"?"active":""}" data-tool="branding" title="Branding">🏷️</button>
  `;
}

export function bindEditorSidebar(render) {
  document.querySelectorAll("[data-tool]").forEach(btn => {
    btn.onclick = () => {
      setActiveTool(btn.dataset.tool);
      render();
    };
  });
}
