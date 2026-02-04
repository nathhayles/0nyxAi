import Editor from "./Editor.jsx";

export default function App() {
  return `
    <div class="appShell">
      <div id="view">
        ${Editor()}
      </div>
    </div>
  `;
}
