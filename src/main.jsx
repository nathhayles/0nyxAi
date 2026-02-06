import "./styles/editor.css";
import "./styles/editorSidebar.css";
import "./styles/onyx.css";

import Editor from "./pages/Editor";
import { initEditorEvents } from "./editorEvents";

const app = document.getElementById("app");

app.innerHTML = `
  <header class="mainNav">
    <nav class="mainMenu">
      <a href="/">Home</a>
      <a href="/editor">Editor</a>
      <a href="/scheduler">Scheduler</a>
      <a href="/projects">Projects</a>
      <a href="/affiliate">Affiliate</a>
      <a href="/pricing">Pricing</a>
      <a href="/earn">Earn</a>
      <a href="/admin">Admin</a>
      <span class="credits">Credits: 120</span>
    </nav>
  </header>

  <main id="editorMount"></main>
`;

document.getElementById("editorMount").innerHTML = Editor();

initEditorEvents();

import { initEditorEnhancements } from "./editorEnhancements";
initEditorEnhancements();

