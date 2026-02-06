export function mountAiStudioUI() {
  const section = document.querySelector('.toolSection[data-section="ai"]');
  if (!section) return;

  // Idempotent mount
  if (section.dataset.mounted === "1") return;
  section.dataset.mounted = "1";

  section.innerHTML = "";

  const h = document.createElement("h4");
  h.textContent = "AI Studio";

  const p = document.createElement("div");
  p.style.color = "#9aa4b2";
  p.style.fontSize = "13px";
  p.style.marginBottom = "10px";
  p.textContent = "Type a prompt. Next step will generate output cards you can click-to-add.";

  const ta = document.createElement("textarea");
  ta.placeholder = "e.g. Cut this into 3 scenes with captions and punchy music…";
  ta.style.width = "100%";
  ta.style.height = "120px";
  ta.style.padding = "10px";
  ta.style.borderRadius = "10px";
  ta.style.border = "1px solid rgba(255,255,255,0.12)";
  ta.style.background = "rgba(0,0,0,0.25)";
  ta.style.color = "white";
  ta.style.resize = "vertical";

  const row = document.createElement("div");
  row.style.display = "flex";
  row.style.gap = "10px";
  row.style.marginTop = "10px";

  const btn = document.createElement("button");
  btn.textContent = "Generate";
  btn.disabled = true; // UI-only for now
  btn.style.opacity = "0.6";

  const note = document.createElement("div");
  note.style.color = "#9aa4b2";
  note.style.fontSize = "12px";
  note.style.marginTop = "12px";
  note.textContent = "AI wiring comes next (no editor risk).";

  row.appendChild(btn);

  section.appendChild(h);
  section.appendChild(p);
  section.appendChild(ta);
  section.appendChild(row);
  section.appendChild(note);
}
