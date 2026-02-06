let panelEl = null;
let prevVisibleSections = [];

function fmt(t) {
  if (!isFinite(t)) return "00:00.000";
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  const ms = Math.floor((t - Math.floor(t)) * 1000);
  return (
    String(m).padStart(2, "0") +
    ":" +
    String(s).padStart(2, "0") +
    "." +
    String(ms).padStart(3, "0")
  );
}

function findVisualsPanel() {
  // safest: tool panel that contains Library / Uploads tabs
  const panels = document.querySelectorAll(".toolPanel");
  for (const p of panels) {
    if (p.textContent.includes("Library") && p.textContent.includes("Uploads")) {
      return p;
    }
  }
  return null;
}

export function openTrimModal({
  start = 0,
  end = 1,
  video = null,
  onApply
} = {}) {
  if (panelEl) return;

  const visualsPanel = findVisualsPanel();
  if (!visualsPanel) {
    console.warn("Trim: Visuals panel not found");
    return;
  }

  // hide existing tool sections
  prevVisibleSections = [];
  visualsPanel.querySelectorAll(".toolSection").forEach(sec => {
    if (sec.style.display !== "none") {
      prevVisibleSections.push(sec);
      sec.style.display = "none";
    }
  });

  panelEl = document.createElement("div");
  panelEl.className = "toolSection";
  panelEl.style.display = "block";
  panelEl.style.padding = "12px";
  panelEl.style.color = "#fff";

  panelEl.innerHTML = `
    <div style="font-weight:700;margin-bottom:12px">Trim Clip</div>

    <div style="display:flex;justify-content:space-between;font-size:12px;opacity:.8">
      <span>Start</span>
      <span id="startTime">00:00.000</span>
    </div>
    <input id="trimStart" type="range" min="0" max="100" value="${Math.round(start * 100)}" style="width:100%">

    <div style="display:flex;justify-content:space-between;font-size:12px;opacity:.8;margin-top:12px">
      <span>End</span>
      <span id="endTime">00:00.000</span>
    </div>
    <input id="trimEnd" type="range" min="0" max="100" value="${Math.round(end * 100)}" style="width:100%">

    <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:14px">
      <button id="trimCancel">Cancel</button>
      <button id="trimApply">Apply</button>
    </div>
  `;

  visualsPanel.appendChild(panelEl);

  const startEl = panelEl.querySelector("#trimStart");
  const endEl = panelEl.querySelector("#trimEnd");
  const startLbl = panelEl.querySelector("#startTime");
  const endLbl = panelEl.querySelector("#endTime");

  const duration = video?.duration || 0;

  function updateLabels() {
    startLbl.textContent = fmt((startEl.value / 100) * duration);
    endLbl.textContent = fmt((endEl.value / 100) * duration);
  }

  function scrub(time) {
    if (!video || !isFinite(time)) return;
    try {
      video.pause();
      video.currentTime = time;
    } catch {}
  }

  const clamp = () => {
    if (+startEl.value > +endEl.value) {
      startEl.value = endEl.value;
    }
  };

  startEl.oninput = () => {
    clamp();
    scrub((startEl.value / 100) * duration);
    updateLabels();
  };

  endEl.oninput = () => {
    clamp();
    scrub((endEl.value / 100) * duration);
    updateLabels();
  };

  updateLabels();

  panelEl.querySelector("#trimCancel").onclick = close;
  panelEl.querySelector("#trimApply").onclick = () => {
    const s = Math.min(startEl.value, endEl.value) / 100;
    const e = Math.max(startEl.value, endEl.value) / 100;
    onApply && onApply({ start: s, end: e });
    close();
  };

  function close() {
    panelEl.remove();
    panelEl = null;
    prevVisibleSections.forEach(sec => (sec.style.display = ""));
    prevVisibleSections = [];
  }
}
