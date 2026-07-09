import "./styles/onyx.css";
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { CreditsProvider } from "./state/CreditsContext.jsx";

ReactDOM.createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <CreditsProvider>
      <App />
    </CreditsProvider>
  </BrowserRouter>
);
