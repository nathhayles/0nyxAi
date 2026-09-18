import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.onyxreelz.app',
  appName: 'Onyx Reelz',
  webDir: 'dist',
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
