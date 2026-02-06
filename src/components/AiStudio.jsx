export function mountAiStudio() {
  const panel = document.querySelector('.toolPanel[data-tool-panel="ai"]');
  if (!panel) return;

  panel.innerHTML = "";

  const h = document.createElement("h3");
  h.textContent = "AI Studio";

  const p = document.createElement("p");
  p.textContent = "Describe what you want to generate or edit.";

  const textarea = document.createElement("textarea");
  textarea.placeholder = "e.g. cinematic lighting, faster cuts, subtitles…";
  textarea.style.width = "100%";
  textarea.style.height = "120px";

  const btn = document.createElement("button");
  btn.textContent = "Generate";
  btn.onclick = () => {
    alert("AI pipeline will hook here next.");
  };

  panel.appendChild(h);
  panel.appendChild(p);
  panel.appendChild(textarea);
  panel.appendChild(btn);
}
