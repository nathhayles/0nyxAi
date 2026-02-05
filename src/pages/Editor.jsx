export default function Editor() {
  return `
    <div class="editorRoot">

      <!-- Editor top functions bar -->
      <div class="editorTopBar" id="editorTopBar">
        <div class="leftControls">
          <div class="ratioDropdown" data-action="ratio">16:9 ▾</div>
          <button class="iconBtn" data-action="undo" title="Undo">↶</button>
          <button class="iconBtn" data-action="redo" title="Redo">↷</button>
        </div>

        <div class="rightControls">
          <button data-action="preview">Preview</button>
          <button data-action="download">Download</button>
          <button data-action="earn">Earn</button>
          <span class="credits">Credits: 120</span>
        </div>
      </div>

      <!-- Main editor body row -->
      <div class="editorBody">

        <div class="editorSidebar">
          <div class="sidebarIcon active" data-action="tool" data-tool="visuals" title="Visuals">🖼️</div>
          <div class="sidebarIcon" data-action="tool" data-tool="avatars" title="Avatars">🙂</div>
          <div class="sidebarIcon" data-action="tool" data-tool="audio" title="Audio">🔊</div>
          <div class="sidebarIcon" data-action="tool" data-tool="layouts" title="Layouts">📐</div>
          <div class="sidebarIcon" data-action="tool" data-tool="text" title="Text">✏️</div>
          <div class="sidebarIcon" data-action="tool" data-tool="elements" title="Elements">⭐</div>
          <div class="sidebarIcon" data-action="tool" data-tool="styles" title="Styles">🎨</div>
          <div class="sidebarIcon" data-action="tool" data-tool="branding" title="Branding">🏷️</div>
        </div>

        <div class="editorToolPanel" id="toolPanel">
          <h3>Visuals</h3>

          <div class="toolTabs">
            <div class="toolTab active" data-action="tab" data-tab="library">Library</div>
            <div class="toolTab" data-action="tab" data-tab="ai">AI Studio</div>
            <div class="toolTab" data-action="tab" data-tab="uploads">Uploads</div>
          </div>

          <div class="toolBody">
            <div class="visualsGrid">
              <div class="mediaCard" data-action="media" data-media-label="Image">Image</div>
              <div class="mediaCard" data-action="media" data-media-label="Image">Image</div>
              <div class="mediaCard" data-action="media" data-media-label="Video">Video</div>
              <div class="mediaCard" data-action="media" data-media-label="Image">Image</div>
              <div class="mediaCard" data-action="media" data-media-label="Video">Video</div>
              <div class="mediaCard" data-action="media" data-media-label="Image">Image</div>
            </div>
          </div>
        </div>

        <div class="editorPreview">
          <div id="previewStage">
            <div class="emptyPreview">No media</div>
          </div>
        </div>

      </div>

      <!-- Scenes bar -->
      <div class="editorScenes">
        <button data-action="add-scene">+ Add Scene</button>
        <span data-action="scene" data-scene-id="1">Scene 1</span>
        <span data-action="scene" data-scene-id="2">Scene 2</span>
        <span data-action="scene" data-scene-id="3">Scene 3</span>
      </div>

    </div>
  `;
}
