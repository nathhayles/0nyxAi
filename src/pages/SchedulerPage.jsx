import App from "./App.jsx";
import { renderRouter } from "../router.js";

export default function SchedulerPage() {
  const html = App();

  setTimeout(() => {
    renderRouter();
  }, 0);

  return html;
}
