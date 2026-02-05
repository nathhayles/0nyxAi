export default function Editor() {
  return `
    <div class="editorRoot">

      <div class="editorSidebar">
        <div class="sidebarIcon active" data-tool="visuals">🖼</div>
        <div class="sidebarIcon" data-tool="avatars">🙂</div>
        <div class="sidebarIcon" data-tool="audio">🔊</div>
        <div class="sidebarIcon" data-tool="layouts">📐</div>
        <div class="sidebarIcon" data-tool="text">✏️</div>
        <div class="sidebarIcon" data-tool="elements">⭐</div>
        <div class="sidebarIcon" data-tool="styles">🎨</div>
        <div class="sidebarIcon" data-tool="branding">🏷</div>
      </div>

      <div class="editorToolPanel" id="toolPanel">
        <div class="collapseBtn" id="collapseBtn">‹</div>

        <h3>Visuals</h3>

        <div class="toolTabs">
          <div class="toolTab active">Library</div>
          <div class="toolTab">AI Studio</div>
          <div class="toolTab">Uploads</div>
        </div>

        <div class="toolBody">
          Tool content goes here
        </div>
      </div>

      <div class="editorMain">
        <div class="editorPreview">
          PREVIEW AREA
        </div>

        <div class="editorScenes">
          <button>+ Add Scene</button>
          <span>Scene 1</span>
          <span>Scene 2</span>
          <span>Scene 3</span>
        </div>
      </div>

    </div>
  `;
}
