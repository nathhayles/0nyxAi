export function mountTimeline() {
  const host = document.getElementById("timelineHost");
  if (!host) return;

  host.innerHTML = "";

  const label = document.createElement("div");
  label.textContent = "Trim";
  label.className = "timelineLabel";

  const range = document.createElement("input");
  range.type = "range";
  range.min = 0;
  range.max = 100;
  range.value = 0;
  range.className = "timelineRange";

  const out = document.createElement("div");
  out.className = "timelineValue";
  out.textContent = "Start: 0%";

  range.oninput = () => {
    out.textContent = `Start: ${range.value}%`;
  };

  host.appendChild(label);
  host.appendChild(range);
  host.appendChild(out);
}
