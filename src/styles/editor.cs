cat << 'EOF' > src/styles/editor.css
/* =========================
   GLOBAL
========================= */

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  background: #0b1020;
  color: #fff;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
}

/* =========================
   LAYOUT
========================= */

.editorRoot {
  display: flex;
  height: calc(100vh - 64px);
}

.editorLeft {
  width: 260px;
  display: flex;
  background: rgba(10,14,30,0.95);
}

.editorLeftIcons {
  width: 54px;
  display: flex;
  flex-direction: column;
  padding: 10px 6px;
  gap: 10px;
}

.editorLeftIcons button {
  background: none;
  border: none;
  color: #9bb3ff;
  font-size: 20px;
  cursor: pointer;
  border-radius: 10px;
  padding: 8px;
}

.editorLeftIcons button.active {
  background: rgba(80,120,255,0.25);
}

.editorLeftPanel {
  flex: 1;
  padding: 12px;
  overflow-y: auto;
}

.editorCanvas {
  flex: 1;
  padding: 16px;
  display: flex;
  flex-direction: column;
}

/* =========================
   PREVIEW
========================= */

.previewDrop {
  position: relative;
  border: 2px dashed rgba(120,160,255,0.5);
  border-radius: 18px;
  overflow: hidden;
  background: #000;
}

.previewVideo {
  width: 100%;
  height: auto;
  max-height: 420px;
  display: block;
}

.dropZone {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255,255,255,0.7);
  pointer-events: none;
}

#dropCatcher {
  position: absolute;
  inset: 0;
  z-index: 5;
}

/* =========================
   MEDIA PANEL
========================= */

#mediaList {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-top: 12px;
}

.mediaItem {
  background: rgba(20,30,60,0.9);
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
}

.mediaItem video {
  width: 100%;
  height: 120px;
  object-fit: cover;
  display: block;
}

.mediaName {
  padding: 6px 8px;
  font-size: 12px;
  opacity: 0.85;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* =========================
   TRIM BAR (FIXED)
========================= */

.trimBar {
  position: relative;
  margin-top: 14px;
  padding: 14px;
  background: rgba(255,255,255,0.04);
  border-radius: 14px;
}

.trimTrack {
  height: 6px;
  background: rgba(255,255,255,0.2);
  border-radius: 4px;
  margin-bottom: 16px;
}

.trimHandle {
  position: absolute;
  left: 14px;
  right: 14px;
  top: 24px;
  width: calc(100% - 28px);
  appearance: none;
  background: none;
  pointer-events: none;
}

.trimHandle::-webkit-slider-thumb {
  appearance: none;
  width: 14px;
  height: 14px;
  background: #4da3ff;
  border-radius: 50%;
  cursor: ew-resize;
  pointer-events: auto;
  position: relative;
}

/* IMPORTANT: END HANDLE ABOVE START */
.trimStart { z-index: 2; }
.trimEnd   { z-index: 3; }

.trimLabels {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  opacity: 0.85;
  margin-top: 22px;
}

/* =========================
   SCENES BAR (RESTORED)
========================= */

.scenesBar {
  display: flex;
  gap: 12px;
  margin-top: 16px;
}

.sceneItem {
  padding: 12px 18px;
  background: rgba(255,255,255,0.08);
  border-radius: 12px;
  cursor: pointer;
}

.scenesBar button {
  background: rgba(255,255,255,0.15);
  border: none;
  border-radius: 12px;
  padding: 12px 16px;
  font-size: 18px;
  cursor: pointer;
  color: #fff;
}
EOF

