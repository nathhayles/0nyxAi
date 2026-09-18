// Native-shell wiring for the Capacitor-wrapped app (iOS/Android app store
// builds) -- everything here is a no-op on the regular web/PWA build.
// Capacitor.isNativePlatform() is false there, so importing this module
// from main.jsx doesn't change web behavior at all; the @capacitor/*
// packages are still bundled into the web build (Vite has no way to know
// they're unused there), but this file guarantees none of their native
// bridge calls ever actually fire outside the native shell.
import { Capacitor } from "@capacitor/core";
import { StatusBar, Style } from "@capacitor/status-bar";
import { SplashScreen } from "@capacitor/splash-screen";

export async function initNativeShell() {
  if (!Capacitor.isNativePlatform()) return;

  try {
    // Dark content, matching the app's own dark theme (--onyx-bg #06080d,
    // same color already used for the PWA manifest and this native splash
    // screen) -- Style.Dark means dark BACKGROUND with light icons/text,
    // Capacitor's naming is the inverse of what it sounds like at a glance.
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setBackgroundColor({ color: "#06080d" });
    // overlaysWebView(false): the status bar reserves its own space rather
    // than floating on top of the web content -- simpler and safer than
    // teaching every page's top padding about a native status bar height
    // that doesn't exist in the web/PWA build at all.
    await StatusBar.setOverlaysWebView({ overlay: false });
  } catch (err) {
    // StatusBar can throw on platforms/OS versions with restricted APIs --
    // never let a cosmetic failure block the app from loading.
    console.warn("[capacitor] StatusBar setup failed:", err.message);
  }
}

// Called once the real app has actually mounted (see main.jsx) -- see
// capacitor.config.ts's launchAutoHide:false for why this is manual rather
// than Capacitor's own default timer.
export async function hideSplashScreen() {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await SplashScreen.hide();
  } catch (err) {
    console.warn("[capacitor] SplashScreen.hide failed:", err.message);
  }
}
