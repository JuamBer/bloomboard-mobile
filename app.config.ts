import type { ConfigContext, ExpoConfig } from 'expo/config';
import {
  WarningAggregator,
  withAppBuildGradle,
  type ConfigPlugin,
} from 'expo/config-plugins';
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
const EAS_PROJECT_ID = '4ee08910-fb31-4fda-b84a-c0d5de67c175';
const EAS_OWNER = 'juamber';
const projectId = process.env.EAS_PROJECT_ID || EAS_PROJECT_ID || undefined;
const owner = process.env.EAS_OWNER || EAS_OWNER || undefined;

// The splash sits on the brand's deep navy — the dark Bloom background — in
// both modes, as the manual's app tile does.
const NAVY = '#020c1c';

// The icon says which build it is, as the web's favicon does per environment:
// the brand's blue in production, amber on beta, green in development
// (drawn by scripts/app-icons.mjs; the splash keeps the full lockup).
const ICON_SUFFIX: Record<AppEnv, string> = {
  development: '-dev',
  beta: '-beta',
  production: '',
};
const ICON_COLOR: Record<AppEnv, string> = {
  development: '#15803d',
  beta: '#b45309',
  production: '#1345a8',
};
const icon = ICON_SUFFIX[APP_ENV];

/**
 * R8's optimizations on for release builds. The React Native template uses
 * `proguard-android.txt`, which says `-dontoptimize`: with R8 on, a release
 * scored ~91% obfuscation and shrinking but no optimization, the third of
 * Play's 25% minimums. `proguard-android-optimize.txt` is Android's own
 * default for new projects. A template that already uses it is left alone.
 */
const withR8Optimizations: ConfigPlugin = (cfg) =>
  withAppBuildGradle(cfg, (gradle) => {
    const from = 'getDefaultProguardFile("proguard-android.txt")';
    const to = 'getDefaultProguardFile("proguard-android-optimize.txt")';
    const { contents } = gradle.modResults;
    if (contents.includes(from)) {
      gradle.modResults.contents = contents.replace(from, to);
    } else if (!contents.includes(to)) {
      WarningAggregator.addWarningAndroid(
        'withR8Optimizations',
        'app/build.gradle names neither ProGuard default; R8 optimizations not set',
      );
    }
    return gradle;
  });

export default ({ config }: ConfigContext): ExpoConfig =>
  withR8Optimizations({
    ...config,
    name: NAME[APP_ENV],
    slug: 'bloomboard',
    owner,
    version,
    scheme: 'bloomboard',
    orientation: 'portrait',
    userInterfaceStyle: 'automatic',
    icon: `./assets/images/icon${icon}.png`,
    backgroundColor: NAVY,
    ios: {
      bundleIdentifier: `${BASE_ID}${SUFFIX[APP_ENV]}`,
      supportsTablet: true,
      infoPlist: {
        // Only HTTPS to our own API: exempt from export-compliance paperwork.
        ITSAppUsesNonExemptEncryption: false,
        // The share page saves a workout's image to Photos (add only).
        NSPhotoLibraryAddUsageDescription:
          'Bloom Board guarda en tus fotos la imagen de un entrenamiento cuando la descargas.',
      },
    },
    android: {
      package: `${ANDROID_BASE}${SUFFIX[APP_ENV]}`,
      // The share page only saves an image (expo-media-library, without its
      // config plugin): it never reads the gallery, so none of the photo /
      // video reading permissions the module's own manifest brings — Play asks
      // apps that hold them to justify it. Saving needs none on Android 13+,
      // and WRITE_EXTERNAL_STORAGE (maxSdk 32, from the module) before that.
      blockedPermissions: [
        'android.permission.READ_MEDIA_IMAGES',
        'android.permission.READ_MEDIA_VIDEO',
        'android.permission.READ_MEDIA_AUDIO',
        'android.permission.READ_MEDIA_VISUAL_USER_SELECTED',
        'android.permission.ACCESS_MEDIA_LOCATION',
      ],
      adaptiveIcon: {
        backgroundColor: ICON_COLOR[APP_ENV],
        foregroundImage: './assets/images/android-icon-foreground.png',
        backgroundImage: `./assets/images/android-icon-background${icon}.png`,
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
        // R8 on release builds: Play requires at least 25% obfuscation,
        // optimization and shrinking from February 2027 (2.5.0 scored 1%
        // obfuscation, R8 being off). Debug builds never run it, so a change
        // here is only proven by a release build (docs/RELEASING.md).
        'expo-build-properties',
        {
          android: {
            enableMinifyInReleaseBuilds: true,
            // Classes R8 cannot see being used. Expo starts the JavaScript
            // with the app closed (the workout notification's background
            // task) through a loader named only in the manifest's metadata
            // and created by reflection: without this, R8 removed it.
            extraProguardRules:
              '-keep class * implements expo.modules.apploader.HeadlessAppLoader { <init>(); }',
          },
        },
      ],
      [
        // The workout under way in the shade (specs/member-app.md, decision
        // 17): the status-bar icon is the mark, white, tinted with the build's
        // colour in the shade.
        'expo-notifications',
        {
          icon: './assets/images/notification-icon.png',
          color: ICON_COLOR[APP_ENV],
        },
      ],
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
    // An over-the-air update reaches only binaries of the same app version
    // (package.json); bump it with any native change (docs/RELEASING.md).
    // Not `fingerprint`: the native-code hash comes out different on a Windows
    // machine and on EAS's Linux builders, which fails every build with
    // "Runtime version mismatch" — and resolving it in the dev server crashed
    // Metro on Windows. Store builds only: a development build never updates.
    ...(projectId && APP_ENV !== 'development'
      ? {
          runtimeVersion: { policy: 'appVersion' as const },
          updates: { url: `https://u.expo.dev/${projectId}` },
        }
      : {}),
    extra: {
      appEnv: APP_ENV,
      ...(projectId ? { eas: { projectId } } : {}),
    },
  });
