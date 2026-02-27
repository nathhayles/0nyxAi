import React from "react";
import ReactDOM from "react-dom/client";
import Editor from "./pages/Editor.jsx";
import "./styles/editor.css";

function getMountEl() {
  let el = document.getElementById("root");
  if (el) return el;

  el = document.getElementById("app");
  if (el) return el;

  el = document.createElement("div");
  el.id = "root";
  document.body.appendChild(el);
  return el;
}

ReactDOM.createRoot(getMountEl()).render(
  <React.StrictMode>
    <Editor />
  </React.StrictMode>
);
