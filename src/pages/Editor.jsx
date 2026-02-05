export default function Editor() {
  return `
    <div class="editorRoot">

      <div class="editorSidebar">
        <div class="sidebarIcon active" data-tool="visuals" data-action="tool">🖼</div>
        <div class="sidebarIcon" data-tool="avatars" data-action="tool">🙂</div>
        <div class="sidebarIcon" data-tool="audio" data-action="tool">🔊</div>
        <div class="sidebarIcon" data-tool="layouts" data-action="tool">📐</div>
        <div class="sidebarIcon" data-tool="text" data-action="tool">✏️</div>
        <div class="sidebarIcon" data-tool="elements" data-action="tool">⭐</div>
        <div class="sidebarIcon" data-tool="styles" data-action="tool">🎨</div>
        <div class="sidebarIcon" data-tool="branding" data-action="tool">🏷</div>
      </div>

      <div class="editorToolPanel" id="toolPanel">
        <div class="collapseBtn" id="collapseBtn">‹</div>

        <h3>Visuals</h3>

        <div class="toolTabs">
          <div class="toolTab active" data-action="tab" data-tab="library">Library</div>
          <div class="toolTab" data-action="tab" data-tab="ai">AI Studio</div>
          <div class="toolTab" data-action="tab" data-tab="uploads">Uploads</div>
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
          <button data-action="add-scene">+ Add Scene</button>
          <span data-scene-id="1">Scene 1</span>
          <span data-scene-id="2">Scene 2</span>
          <span data-scene-id="3">Scene 3</span>
        </div>
      </div>

    </div>
  `;
}
