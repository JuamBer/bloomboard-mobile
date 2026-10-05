import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * Where the session's tokens live: the iOS Keychain / Android Keystore through
 * SecureStore. Never AsyncStorage — that is a plain file any backup can read.
 *
 * The web build (development checks only) has no secure store, so it falls
 * back to localStorage, which is what the web app does anyway.
 */
const isWeb = Platform.OS === 'web';

const local = {
  get: (key: string): string | null => {
    try {
      return globalThis.localStorage?.getItem(key) ?? null;
    } catch {
      return null;
    }
  },
  set: (key: string, value: string) => {
    try {
      globalThis.localStorage?.setItem(key, value);
    } catch {
      // Storage blocked (private mode): the session lasts the tab.
    }
  },
  remove: (key: string) => {
    try {
      globalThis.localStorage?.removeItem(key);
    } catch {
      // Nothing to remove.
    }
  },
};

export const secureStorage = {
  get: async (key: string): Promise<string | null> =>
    isWeb ? local.get(key) : SecureStore.getItemAsync(key),
  set: async (key: string, value: string): Promise<void> =>
    isWeb ? local.set(key, value) : SecureStore.setItemAsync(key, value),
  remove: async (key: string): Promise<void> =>
    isWeb ? local.remove(key) : SecureStore.deleteItemAsync(key),
};
