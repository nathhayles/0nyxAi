import "./styles/app.css";
import "./styles/editor.css";
import Router from "./router.jsx";

function render() {
  document.body.innerHTML = Router(window.location.pathname);
}

window.addEventListener("popstate", render);

document.addEventListener("click", (e) => {
  const a = e.target.closest("a[href]");
  if (!a) return;

  const href = a.getAttribute("href");
  if (
    href.startsWith("http") ||
    href.startsWith("mailto:") ||
    href.startsWith("#")
  ) return;

  e.preventDefault();
  history.pushState({}, "", href);
  render();
});

render();
