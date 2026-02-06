export function mountTrimUI() {
  const host = document.getElementById("timelineHost");
  if (!host) return;

  host.innerHTML = "";

  const start = document.createElement("input");
  const end = document.createElement("input");

  start.type = end.type = "range";
  start.min = end.min = 0;
  start.max = end.max = 100;
  start.value = 0;
  end.value = 100;

  const label = document.createElement("div");
  label.style.color = "#9aa4b2";
  label.textContent = "Trim";

  function sync() {
    const a = Math.min(start.value, end.value) / 100;
    const b = Math.max(start.value, end.value) / 100;
    window.setTrim?.(a, b);
  }

  start.oninput = end.oninput = sync;

  host.appendChild(label);
  host.appendChild(start);
  host.appendChild(end);
}
