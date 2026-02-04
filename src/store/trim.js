const KEY = "editor_trim";

function load() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || { start: 0, end: 10 };
  } catch {
    return { start: 0, end: 10 };
  }
}

function save(v) {
  localStorage.setItem(KEY, JSON.stringify(v));
}

export function getTrim() {
  return load();
}

export function setTrim(start, end) {
  save({ start, end });
}

export function resetTrim() {
  save({ start: 0, end: 10 });
}
