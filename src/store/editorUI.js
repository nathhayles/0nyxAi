let activeTool = "storyboard";
let panelTabs = { visuals: "stock" };
let listeners = [];

function notify() {
  listeners.forEach(fn => fn());
}

export function getActiveTool() {
  return activeTool;
}

export function setActiveTool(tool) {
  activeTool = tool;
  notify();
}

export function getActivePanelTab(tool) {
  return panelTabs[tool] || (tool === "visuals" ? "stock" : "");
}

export function setActivePanelTab(tool, tab) {
  panelTabs[tool] = tab;
  notify();
}

export function subscribeUI(fn) {
  listeners.push(fn);
}
