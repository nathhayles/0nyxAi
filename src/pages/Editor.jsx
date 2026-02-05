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
          <button class="iconBtn undoBtn" title="Undo">↶</button>
          <button class="iconBtn redoBtn" title="Redo">↷</button>
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
          <div class="sidebarIcon active" data-tool="visuals" title="Visuals">🖼️</div>
          <div class="sidebarIcon" data-tool="audio" title="Audio">🔊</div>
          <div class="sidebarIcon" data-tool="text" title="Text">✏️</div>
          <div class="sidebarIcon" data-tool="shapes" title="Shapes">📐</div>
          <div class="sidebarIcon" data-tool="styles" title="Styles">⭐</div>
          <div class="sidebarIcon" data-tool="branding" title="Branding">🎨</div>
        </div>

        <div class="editorToolPanel">

          <div class="toolPanel active" data-tool-panel="visuals">
            <h3>Visuals</h3>

            <div class="toolTabs">
              <div class="toolTab active" data-tab="library">Library</div>
              <div class="toolTab" data-tab="ai">AI Studio</div>
              <div class="toolTab" data-tab="uploads">Uploads</div>
            </div>

            <div class="toolBody">
              <div class="toolSection active" data-section="library">
                <div id="libraryGrid" class="visualsGrid"></div>
              </div>

              <div class="toolSection" data-section="ai">
                <p>AI Studio coming next</p>
              </div>

              <div class="toolSection" data-section="uploads">
                <div class="mediaActions">
                  <button data-action="upload">⬆ Upload Image / Video</button>
                </div>
                <div id="uploadsGrid" class="visualsGrid"></div>
              </div>
            </div>
          </div>

          <div class="toolPanel" data-tool-panel="audio">
            <h3>Audio</h3>
            <div class="toolBody"><p>Add music, voiceover, SFX (next)</p></div>
          </div>

          <div class="toolPanel" data-tool-panel="text">
            <h3>Text</h3>
            <div class="toolBody"><p>Add titles, captions, subtitles (next)</p></div>
          </div>

          <div class="toolPanel" data-tool-panel="shapes">
            <h3>Shapes</h3>
            <div class="toolBody"><p>Add shapes & overlays (next)</p></div>
          </div>

          <div class="toolPanel" data-tool-panel="styles">
            <h3>Styles</h3>
            <div class="toolBody"><p>Filters & presets (next)</p></div>
          </div>

          <div class="toolPanel" data-tool-panel="branding">
            <h3>Branding</h3>
            <div class="toolBody"><p>Logos, brand kits (next)</p></div>
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

      <input id="mediaUploadInput" type="file" accept="image/*,video/*" hidden />
    </div>
  `;
}
