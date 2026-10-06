import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * Where the API is. EAS builds compile EXPO_PUBLIC_API_URL / _WS_URL in
 * (eas.json, per profile). A local run without them talks to port 3000 of the
 * machine serving Metro — its LAN address, read from the dev server's host —
 * so a phone on the same Wi-Fi reaches a local backend with no setup.
 */
const devHost = (): string => {
  if (Platform.OS === 'web') {
    return globalThis.location?.hostname || 'localhost';
  }
  const host = Constants.expoConfig?.hostUri?.split(':')[0];
  if (host) return host;
  // The Android emulator reaches the host machine through this alias.
  return Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
};

export const API_URL: string =
  process.env.EXPO_PUBLIC_API_URL ?? `http://${devHost()}:3000/api`;

export const WS_URL: string =
  process.env.EXPO_PUBLIC_WS_URL ?? API_URL.replace(/\/api\/?$/, '');

export type AppEnv = 'development' | 'beta' | 'production';

export const APP_ENV: AppEnv =
  (Constants.expoConfig?.extra?.appEnv as AppEnv | undefined) ?? 'development';

/** The marketing site: privacy policy and terms the register form links to. */
export const LANDING_URL = 'https://bloomboard.pro';

/** The web app — where staff work, and where a member's emailed links land. */
export const WEB_APP_URL =
  APP_ENV === 'production'
    ? 'https://app.bloomboard.pro'
    : 'https://beta.app.bloomboard.pro';
