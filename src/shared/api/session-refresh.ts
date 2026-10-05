import axios from 'axios';
import { useAuthStore } from '@features/auth/auth.store';
import { API_URL } from '@shared/config/env';

// Bare instance: a refresh must never go through apiClient's 401 handling,
// which is what calls this in the first place.
const refreshHttp = axios.create({ baseURL: API_URL, timeout: 20_000 });

let inFlight: Promise<string | null> | null = null;

/**
 * Trades the stored refresh token for a new pair. Concurrent callers share one
 * request — the session control firing three polls at once on an expired
 * token must not burn three refreshes. Resolves to the new access token, or
 * null when the session is over (no refresh token, or the server refused it).
 * Network failures reject, so callers can tell "logged out" from "offline".
 */
export function refreshSession(): Promise<string | null> {
  if (inFlight) return inFlight;

  const refreshToken = useAuthStore.getState().refreshToken;
  if (!refreshToken) return Promise.resolve(null);

  inFlight = refreshHttp
    .post<{ accessToken: string; refreshToken: string }>('/auth/refresh', {
      refreshToken,
    })
    .then(async ({ data }) => {
      await useAuthStore
        .getState()
        .setTokens(data.accessToken, data.refreshToken);
      return data.accessToken;
    })
    .catch((error) => {
      const status = error?.response?.status;
      if (status === 401 || status === 400) return null;
      throw error;
    })
    .finally(() => {
      inFlight = null;
    });
  return inFlight;
}

/** Seconds until a JWT's `exp`, or 0 if it cannot be read. Not a
 *  verification — just enough to avoid handing out a token about to lapse. */
export function secondsUntilExpiry(token: string): number {
  try {
    const part = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(globalThis.atob(part)) as { exp?: number };
    return payload.exp ? payload.exp - Date.now() / 1000 : 0;
  } catch {
    return 0;
  }
}

/**
 * The current access token, refreshed first if it is expired or about to be.
 * For consumers that cannot retry on a 401 the way apiClient does — the
 * socket handshake, which authenticates once per connection.
 */
export async function getValidAccessToken(): Promise<string | null> {
  const token = useAuthStore.getState().accessToken;
  if (!token) return null;
  if (secondsUntilExpiry(token) > 60) return token;
  try {
    return await refreshSession();
  } catch {
    return token;
  }
}
