import type { ConfigContext, ExpoConfig } from 'expo/config';
import { version } from './package.json';

/**
 * The app's native configuration. Nothing under ios/ or android/ is committed:
 * those folders are generated from this file (Continuous Native Generation),
 * so every native setting lives here or in a config plugin.
 *
 * APP_ENV picks the variant, set per EAS build profile in eas.json:
 *   development → "Bloom Board (dev)", a dev client talking to a local API
 *   beta        → "Bloom Board (beta)", the store app's id against the beta
 *                 API: what the Play internal testing track gets
 *   production  → "Bloom Board", the store app against production
 */
type AppEnv = 'development' | 'beta' | 'production';

const APP_ENV = (process.env.APP_ENV ?? 'development') as AppEnv;

// The store identifier: Google Play listing `pro.bloomboard.app` (a new app,
// not the earlier member app published outside this repo). A package name can
// never change once published. See docs/ENVIRONMENTS.md.
const BASE_ID = process.env.APP_BUNDLE_ID ?? 'pro.bloomboard.app';
const ANDROID_BASE = process.env.ANDROID_PACKAGE ?? BASE_ID;

const SUFFIX: Record<AppEnv, string> = {
  development: '.dev',
  // A Play testing track belongs to the store listing: same id.
  beta: '',
  production: '',
};

const NAME: Record<AppEnv, string> = {
  development: 'Bloom Board (dev)',
  beta: 'Bloom Board (beta)',
  production: 'Bloom Board',
};

// The EAS project on expo.dev and the account that owns it — neither is a
// secret. Filled in once, after `eas init` creates the project (see
// docs/ENVIRONMENTS.md); until then EAS builds and updates are not configured
// and everything local works as is. The env vars only override them for a
// one-off build under another account.
const EAS_PROJECT_ID = '';
const EAS_OWNER = '';
const projectId = process.env.EAS_PROJECT_ID || EAS_PROJECT_ID || undefined;
const owner = process.env.EAS_OWNER || EAS_OWNER || undefined;

// The splash and the Android adaptive icon sit on the brand's deep navy — the
// dark Bloom background — in both modes, as the manual's app tile does.
const NAVY = '#020c1c';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: NAME[APP_ENV],
  slug: 'bloomboard',
  owner,
  version,
  scheme: 'bloomboard',
  orientation: 'portrait',
  userInterfaceStyle: 'automatic',
  icon: './assets/images/icon.png',
  backgroundColor: NAVY,
  ios: {
    bundleIdentifier: `${BASE_ID}${SUFFIX[APP_ENV]}`,
    supportsTablet: true,
    infoPlist: {
      // Only HTTPS to our own API: exempt from export-compliance paperwork.
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    package: `${ANDROID_BASE}${SUFFIX[APP_ENV]}`,
    adaptiveIcon: {
      backgroundColor: NAVY,
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundImage: './assets/images/android-icon-background.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
  },
  web: {
    // Only for development checks in a browser (see docs/ARCHITECTURE.md);
    // members use app.bloomboard.pro on the web.
    output: 'single',
    favicon: './assets/images/favicon.png',
  },
  plugins: [
    'expo-router',
    'expo-font',
    'expo-image',
    'expo-localization',
    'expo-secure-store',
    'expo-web-browser',
    '@react-native-community/datetimepicker',
    [
      'expo-splash-screen',
      {
        backgroundColor: NAVY,
        image: './assets/images/splash-icon.png',
        imageWidth: 180,
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  // A JS-only update reaches exactly the binaries built from the same native
  // fingerprint; anything native needs a new store build (docs/RELEASING.md).
  // Only with EAS Updates configured: without them it is unused, and the dev
  // server would hash the whole project on every manifest request.
  ...(projectId
    ? {
        runtimeVersion: { policy: 'fingerprint' as const },
        updates: { url: `https://u.expo.dev/${projectId}` },
      }
    : {}),
  extra: {
    appEnv: APP_ENV,
    ...(projectId ? { eas: { projectId } } : {}),
  },
});
