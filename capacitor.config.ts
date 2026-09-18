import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.onyxreelz.app',
  appName: 'Onyx Reelz',
  webDir: 'dist',
  // Critical, easy to miss: the built app is bundled locally (webDir above),
  // not loaded from a remote URL -- deliberate, see the scaffolding commit's
  // message for why (avoids the "this is just a website in a wrapper" App
  // Store rejection risk). But every one of this app's 212 fetch("/api/...")
  // call sites is a RELATIVE path, which on the web resolves against
  // onyx-reelz.com automatically (same-origin) -- inside the bundled native
  // shell, the webview's own default origin is a synthetic local one
  // (capacitor://localhost / https://localhost), so every relative fetch
  // would silently 404 against nothing, breaking the entire app's API layer.
  // hostname here doesn't load anything remote -- it makes the LOCAL bundled
  // webview report its own origin as the real domain, so relative fetches
  // resolve to the real backend exactly like they do on the web. Explicit
  // https scheme on both platforms (not Capacitor's default capacitor://
  // scheme) for consistency and to avoid any scheme-specific edge cases in
  // secure-context-gated web APIs (Clipboard, getUserMedia) the app uses.
  server: {
    hostname: 'onyx-reelz.com',
    androidScheme: 'https',
    iosScheme: 'https',
  },
  plugins: {
    // Manual hide (see src/capacitor.js) once the real app has mounted,
    // rather than Capacitor's own default auto-hide timer -- avoids both a
    // premature reveal of a blank/loading screen and an unnecessarily long
    // fixed wait once the app is actually ready. Matches the real brand
    // background (--onyx-bg / the PWA manifest's own background_color,
    // confirmed Phase 0) so there's no color flash between this native
    // splash and the web content loading in underneath it.
    SplashScreen: {
      launchAutoHide: false,
      backgroundColor: '#06080d',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
    },
  },
};

export default config;
