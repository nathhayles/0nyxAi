import Editor, { bindEditor } from "./pages/Editor.jsx";

export default function App() {
  return `
    <div id="appShell">
      <div id="view">${Editor()}</div>
    </div>
  `;
}

export function bindApp() {
  if (typeof bindEditor === "function") bindEditor();
}
