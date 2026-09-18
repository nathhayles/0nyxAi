import "./styles/onyx.css";
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import App from "./App";
import { CreditsProvider } from "./state/CreditsContext.jsx";
import { registerServiceWorker, captureInstallPrompt } from "./pwa.js";
import { initNativeShell, hideSplashScreen } from "./capacitor.js";

// PWA-specific wiring only makes sense in an actual browser tab -- a
// Capacitor build is already "installed" via the app store, so there's no
// install prompt to capture, and a service worker's main value (caching
// across page loads over the network) barely applies to a native shell
// whose web assets are already bundled in, not fetched. Both are no-ops
// on the web build (Capacitor.isNativePlatform() is false there).
if (!Capacitor.isNativePlatform()) {
  registerServiceWorker();
  captureInstallPrompt();
}

// Native-only: status bar styling. See src/capacitor.js -- no-op on web.
initNativeShell();

ReactDOM.createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <CreditsProvider>
      <App />
    </CreditsProvider>
  </BrowserRouter>
);

// Hands off from the native splash screen (capacitor.config.ts:
// launchAutoHide false) right after the real app's render has been kicked
// off, rather than Capacitor's own fixed-timer default -- no-op on web.
hideSplashScreen();
