import TopBar from "./components/TopBar.jsx";
import Editor from "./pages/Editor.jsx";
import Pricing from "./pages/Pricing.jsx";

function Landing() {
  return `
    <div style="max-width:900px;margin:80px auto;padding:0 20px">
      <h1 style="font-size:48px;margin-bottom:12px">Create videos fast.</h1>
      <p style="opacity:.8;font-size:18px;margin-bottom:32px">
        Scene‑based AI video editor. Simple. Fast. Built to ship.
      </p>
      <a href="/app/editor" class="btnPrimary">Open Editor</a>
    </div>
  `;
}

export default function Router(path) {
  let page = "";

  if (path === "/pricing") page = Pricing();
  else if (path.startsWith("/app/editor")) page = Editor();
  else page = Landing();

  return `
    ${TopBar()}
    <main class="appMain">
      ${page}
    </main>
  `;
}
