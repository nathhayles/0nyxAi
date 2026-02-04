import { routes } from "./routes.jsx";
import TopBar from "../components/TopBar.jsx";

export default function AppShell(path) {
  const Page = routes[path] || routes["/"];

  return `
    ${TopBar()}
    <main class="appMain">
      <div id="page">
        ${Page()}
      </div>
    </main>
  `;
}
