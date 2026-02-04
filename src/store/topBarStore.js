let projectName = "Untitled Project";
let ratio = "16:9";
let credits = 120;
let listeners = [];

function notify() {
  listeners.forEach(fn => fn());
}

export function getTopBarState() {
  return { projectName, ratio, credits };
}

export function setProjectName(name) {
  projectName = (name || "").slice(0, 80) || "Untitled Project";
  notify();
}

export function setRatio(r) {
  ratio = r;
  notify();
}

export function subscribeTopBar(fn) {
  listeners.push(fn);
}
