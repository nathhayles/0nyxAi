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
import { Browser } from "@capacitor/browser";
import { App as CapacitorApp } from "@capacitor/app";

export function isNative() {
  return Capacitor.isNativePlatform();
}

// Real production origin -- needed to turn a relative authUrl (YouTube's
// own /api/auth/youtube path, see routes/social.js) into the fully-
// qualified URL @capacitor/browser's Browser.open() requires (it opens a
// system browser tab, which has no "current page" to resolve a relative
// path against the way a same-tab redirect would).
const PRODUCTION_ORIGIN = "https://onyx-reelz.com";

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

// Required, not optional, for OAuth (social connects) and Stripe checkout:
// both need to leave the app's own embedded WebView. Google explicitly
// blocks sign-in from embedded WebViews (returns disallowed_useragent),
// and Capacitor's default navigation policy doesn't allow the webview to
// follow a same-tab redirect to an arbitrary external origin anyway (no
// server.allowNavigation entries configured, deliberately -- allow-listing
// every OAuth provider's domain is more surface area than just not
// navigating the embedded webview there at all). Browser.open() launches a
// real system browser tab (SFSafariViewController on iOS, Chrome Custom
// Tabs on Android) instead. On web this is a plain same-tab redirect,
// identical to the original behavior.
//
// url may be relative (YouTube's own authUrl, see routes/social.js) --
// resolved against the real production origin, never the app's own
// (possibly synthetic) location.
export async function openExternal(url) {
  const absolute = url.startsWith("http") ? url : `${PRODUCTION_ORIGIN}${url.startsWith("/") ? "" : "/"}${url}`;
  if (!isNative()) {
    window.location.href = absolute;
    return;
  }
  await Browser.open({ url: absolute });
}

// Catches the app being reopened via its custom URL scheme
// (com.onyxreelz.app://..., registered by hand -- android/app/src/main/
// AndroidManifest.xml's intent-filter and ios/App/App/Info.plist's
// CFBundleURLTypes. `cap add` on its own only generates a custom_url_scheme
// string in Android's strings.xml, which nothing actually reads by default
// -- confirmed by checking both files rather than assuming the scaffold
// already wired this up) -- this is how control returns to the app
// after the system browser tab above finishes an OAuth or Stripe flow (see
// routes/social.js's buildRedirectUrl and routes/stripe.js's
// create-checkout, both of which redirect here instead of the website when
// the flow was opened via openExternal). navigate is react-router's
// useNavigate() from the caller (App.jsx), passed in rather than imported
// here to keep this module free of a react-router dependency.
export function listenForDeepLinks(navigate) {
  if (!isNative()) return;
  CapacitorApp.addListener("appUrlOpen", (event) => {
    try {
      // event.url looks like "com.onyxreelz.app://publish?linkedin=connected"
      // -- new URL() needs a real scheme it recognizes to parse pathname/
      // search correctly, so the custom scheme is swapped for https before
      // parsing, purely as a parsing trick (never actually used to fetch).
      const parsed = new URL(event.url.replace("com.onyxreelz.app://", "https://placeholder/"));
      navigate(`${parsed.pathname}${parsed.search}`, { replace: true });
    } catch (err) {
      console.warn("[capacitor] failed to parse deep link:", event.url, err.message);
    }
  });
}
