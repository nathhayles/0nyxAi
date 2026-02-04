import { renderTimeline } from "../api/timeline.js";
import { setSelectedScene, getSelectedScene } from "../store/appState.js";

export default function TimelinePanel() {
  return `
    <div class="timelinePanel">
      <h3>Timeline</h3>
      <button id="renderTimelineBtn" class="btn primary">Render timeline</button>
      <div id="timelineTracks" style="margin-top:12px;display:grid;gap:10px"></div>
    </div>
  `;
}

export function bindTimelineHandlers() {
  const btn = document.getElementById("renderTimelineBtn");
  const tracksEl = document.getElementById("timelineTracks");
  if (!btn || !tracksEl) return;

  btn.onclick = async () => {
    const data = await renderTimeline();
    const selected = getSelectedScene();
    tracksEl.innerHTML = data.tracks.map(t => `
      <div style="background:#161922;border:1px solid #2a2f3a;border-radius:10px;padding:10px">
        <div style="font-weight:700;margin-bottom:6px">${t.id}</div>
        ${t.items.map(i => `
          <div data-scene="${i.id}"
               style="cursor:pointer;font-size:13px;padding:6px;border-radius:6px;
               ${selected===i.id?'background:#2a2f3a;':''}">
            [${i.start}s–${i.start + i.duration}s] ${i.label}
          </div>
        `).join("")}
      </div>
    `).join("");

    tracksEl.querySelectorAll("[data-scene]").forEach(el => {
      el.onclick = () => {
        setSelectedScene(el.getAttribute("data-scene"));
        btn.click();
      };
    });
  };
}
