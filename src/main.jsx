import "./styles/onyx.css";
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { CreditsProvider } from "./state/CreditsContext.jsx";
import { registerServiceWorker, captureInstallPrompt } from "./pwa.js";

// PWA Phase 0: register the service worker and start listening for the
// install-availability event as early as possible -- see src/pwa.js for
// why the actual install-prompt UI isn't built yet (Phase 1).
registerServiceWorker();
captureInstallPrompt();

ReactDOM.createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <CreditsProvider>
      <App />
    </CreditsProvider>
  </BrowserRouter>
);
