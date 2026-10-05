import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { secureStorage } from '@shared/storage/secure';
import type { User } from '@shared/types/api.types';

const ACCESS_KEY = 'bloom.accessToken';
const REFRESH_KEY = 'bloom.refreshToken';
const USER_KEY = 'bloom-user';

export type AuthStatus = 'loading' | 'signedOut' | 'signedIn';

interface AuthState {
  /** `loading` until the stored session has been read — the splash screen
   *  stays up until then, so no screen ever renders signed out by mistake. */
  status: AuthStatus;
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  hydrate: () => Promise<void>;
  signIn: (
    user: User,
    accessToken: string,
    refreshToken: string,
  ) => Promise<void>;
  /** A refreshed pair for the same session (shared/api/session-refresh). */
  setTokens: (accessToken: string, refreshToken: string) => Promise<void>;
  /** The same session's user, re-read from the server. */
  setUser: (user: User) => void;
  signOut: () => Promise<void>;
}

/**
 * The member's session. Tokens live in the Keychain / Keystore (secureStorage)
 * and are mirrored in memory, because the API client reads them on every
 * request and cannot wait for an async store. The profile is plain
 * AsyncStorage: it is shown on the first frame, before /auth/me answers.
 *
 * Custom JWT, not Supabase Auth: the access token lives an hour, the refresh
 * token 30 days and is re-issued on every refresh, so an app opened at least
 * once a month never asks for the password again.
 */
export const useAuthStore = create<AuthState>()((set, get) => ({
  status: 'loading',
  user: null,
  accessToken: null,
  refreshToken: null,

  hydrate: async () => {
    try {
      const [accessToken, refreshToken, rawUser] = await Promise.all([
        secureStorage.get(ACCESS_KEY),
        secureStorage.get(REFRESH_KEY),
        AsyncStorage.getItem(USER_KEY),
      ]);
      const user = rawUser ? (JSON.parse(rawUser) as User) : null;
      if (accessToken && refreshToken && user) {
        set({ status: 'signedIn', user, accessToken, refreshToken });
        return;
      }
    } catch {
      // A corrupt or unreadable store is a signed-out device.
    }
    set({
      status: 'signedOut',
      user: null,
      accessToken: null,
      refreshToken: null,
    });
  },

  signIn: async (user, accessToken, refreshToken) => {
    await Promise.all([
      secureStorage.set(ACCESS_KEY, accessToken),
      secureStorage.set(REFRESH_KEY, refreshToken),
      AsyncStorage.setItem(USER_KEY, JSON.stringify(user)),
    ]);
    set({ status: 'signedIn', user, accessToken, refreshToken });
  },

  setTokens: async (accessToken, refreshToken) => {
    set({ accessToken, refreshToken });
    await Promise.all([
      secureStorage.set(ACCESS_KEY, accessToken),
      secureStorage.set(REFRESH_KEY, refreshToken),
    ]);
  },

  setUser: (user) => {
    // A sign-out while /auth/me was in flight: the answer is someone else's.
    if (get().user?.id !== user.id) return;
    set({ user });
    void AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
  },

  signOut: async () => {
    set({
      status: 'signedOut',
      user: null,
      accessToken: null,
      refreshToken: null,
    });
    await Promise.all([
      secureStorage.remove(ACCESS_KEY),
      secureStorage.remove(REFRESH_KEY),
      AsyncStorage.removeItem(USER_KEY),
    ]);
  },
}));
