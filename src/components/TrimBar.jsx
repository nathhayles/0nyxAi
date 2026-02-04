import { getTrim, setTrim } from "../store/trim.js";

export default function TrimBar() {
  const { start, end } = getTrim();

  return `
    <div class="trimBar">
      <label>
        In:
        <input
          type="range"
          min="0"
          max="100"
          value="${start}"
          oninput="window.__setTrimStart(this.value)"
        />
        <span>${Number(start).toFixed(2)}s</span>
      </label>

      <label>
        Out:
        <input
          type="range"
          min="0"
          max="100"
          value="${end}"
          oninput="window.__setTrimEnd(this.value)"
        />
        <span>${Number(end).toFixed(2)}s</span>
      </label>
    </div>
  `;
}

/* global handlers */
window.__setTrimStart = function (v) {
  const { end } = getTrim();
  setTrim(Number(v), end);
};

window.__setTrimEnd = function (v) {
  const { start } = getTrim();
  setTrim(start, Number(v));
};
