import "./styles/editor.css";
import "./styles/editorSidebar.css";
import "./styles/onyx.css";
import { installEditorDelegation } from "./state/editorDelegation.js";
installEditorDelegation();
import { bindEditorInteractions } from "./state/bindEditorInteractions.js";
import { setActiveScene, addMediaToScene, renderPreview } from "./state/scenes.js";
window.setActiveScene = setActiveScene;
window.addMediaToScene = addMediaToScene;
window.renderPreview = renderPreview;
import { bindEditorUi } from "./state/editorUi.js";
import AppShell from "./app/AppShell.jsx";
import App from "./pages/App.jsx";
import { renderRouter } from "./router.js";

function isModifiedClick(e) {
  return e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0;
}

function render() {
  const path = window.location.pathname;
  const root = document.getElementById("app");

  // Always render AppShell so TopBar (and Earn) are always visible
  root.innerHTML = AppShell(path);

  // If we are on legacy scheduler routes, mount legacy app inside #page and run legacy router
  if (path.startsWith("/app")) {
    const page = document.getElementById("page");
    if (page) page.innerHTML = App(); bindEditorInteractions(); renderPreview(); bindEditorUi(); // creates #view for legacy router
    renderRouter();
  }
}

window.addEventListener("popstate", render);

document.addEventListener("click", (e) => {
  if (isModifiedClick(e)) return;

  const a = e.target.closest("a[href]");
  if (!a) return;

  const href = a.getAttribute("href");
  if (!href) return;

  // ignore external links
  if (href.startsWith("http") || href.startsWith("mailto:") || href.startsWith("#")) return;

  // SPA handle any internal route
  e.preventDefault();
  history.pushState(null, "", href);
  render();
});

render();
