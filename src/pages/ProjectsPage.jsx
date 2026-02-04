import App from "./App.jsx";
import { renderRouter } from "../router.js";

export default function ProjectsPage() {
  // Render legacy shell to create #view
  const html = App();

  // Force legacy router to drafts route
  setTimeout(() => {
    if (window.location.pathname !== "/app/drafts") {
      history.replaceState(null, "", "/app/drafts");
    }
    renderRouter();
  }, 0);

  return html;
}
