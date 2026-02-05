export function bindEditorUi() {
  const btn = document.getElementById("collapseBtn");
  const panel = document.getElementById("toolPanel");

  if (!btn || !panel) return;

  btn.onclick = () => {
    panel.classList.toggle("collapsed");
    btn.textContent = panel.classList.contains("collapsed") ? "›" : "‹";
  };
}
