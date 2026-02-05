export default function Editor() {
  return `
    <div class="editorRoot">

      <div class="editorTopBar">
        <div class="leftControls">
          <select class="ratioSelect">
            <option>16:9</option>
            <option>9:16</option>
            <option>1:1</option>
            <option>4:5</option>
          </select>
          <button class="iconBtn">↶</button>
          <button class="iconBtn">↷</button>
        </div>
        <div class="rightControls">
          <button>Preview</button>
          <button>Download</button>
          <button>Earn</button>
          <span class="credits">Credits: 120</span>
        </div>
      </div>

      <div class="editorBody">

        <div class="editorSidebar">
          <div class="sidebarIcon active">🖼️</div>
          <div class="sidebarIcon">🙂</div>
          <div class="sidebarIcon">🔊</div>
          <div class="sidebarIcon">📐</div>
          <div class="sidebarIcon">✏️</div>
          <div class="sidebarIcon">⭐</div>
          <div class="sidebarIcon">🎨</div>
        </div>

        <div class="editorToolPanel">
          <h3>Visuals</h3>

          <div class="toolTabs">
            <div class="toolTab active" data-tab="library">Library</div>
            <div class="toolTab" data-tab="ai">AI Studio</div>
            <div class="toolTab" data-tab="uploads">Uploads</div>
          </div>

          <div class="toolBody">

            <div class="toolSection active" data-section="library">
              <div class="visualsGrid">
                <div class="mediaCard" data-action="media" data-media-type="image">Stock Image</div>
                <div class="mediaCard" data-action="media" data-media-type="video">Stock Video</div>
              </div>
            </div>

            <div class="toolSection" data-section="ai">
              <div class="mediaActions">
                <button data-action="ai-generate">✨ AI Generate</button>
              </div>
            </div>

            <div class="toolSection" data-section="uploads">
              <div class="mediaActions">
                <button data-action="upload">⬆ Upload Image / Video</button>
              </div>
              <div id="uploadsGrid" class="visualsGrid"></div>
            </div>

          </div>
        </div>

        <div class="editorPreview">
          <div id="previewStage">
            <div class="emptyPreview">No media</div>
          </div>
        </div>

      </div>

      <div class="editorScenes">
        <button data-action="add-scene">+ Add Scene</button>
        <span data-action="scene" data-scene-id="1">Scene 1</span>
        <span data-action="scene" data-scene-id="2">Scene 2</span>
        <span data-action="scene" data-scene-id="3">Scene 3</span>
      </div>

      <input
        id="mediaUploadInput"
        type="file"
        accept="image/*,video/*"
        style="display:none"
      />

    </div>
  `;
}
