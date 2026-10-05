import axios, { type InternalAxiosRequestConfig } from 'axios';
import i18n from '@/i18n';
import { useAuthStore } from '@features/auth/auth.store';
import { API_URL } from '@shared/config/env';
import { toast } from '@shared/ui/toast/toast.store';
import {
  HANDLED_BY_CALLER,
  codedErrorMessage,
  errorMessage,
  type ApiErrorBody,
} from './errors';
import { refreshSession } from './session-refresh';

declare module 'axios' {
  interface AxiosRequestConfig {
    /** The caller renders its own error (an inline form message): skip the
     *  automatic toast so the member is not told twice. */
    silentErrors?: boolean;
  }
}

export const apiClient = axios.create({
  baseURL: API_URL,
  // Gym basements and mobile data: generous, but a request must end.
  timeout: 20_000,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Endpoints where a 401 is an expected outcome (bad credentials, a used
// activation link) and must reach the caller instead of ending the session.
const isAuthEndpoint = (url = '') =>
  url.includes('/auth/login') ||
  url.includes('/auth/refresh') ||
  url.includes('/auth/activation') ||
  url.includes('/auth/set-password');

type RetriableConfig = InternalAxiosRequestConfig & { _retried?: boolean };

/**
 * An access token ran out: renew it so the request can be replayed once.
 * 'offline' when the renewal itself never reached the API — being offline is
 * not being signed out, so the session is left alone.
 */
const renewAfter401 = async (): Promise<'renewed' | 'refused' | 'offline'> => {
  try {
    return (await refreshSession()) !== null ? 'renewed' : 'refused';
  } catch {
    return 'offline';
  }
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status: number | undefined = error.response?.status;
    const config = error.config as RetriableConfig | undefined;

    let renewal: Awaited<ReturnType<typeof renewAfter401>> | null = null;
    if (
      status === 401 &&
      config &&
      !config._retried &&
      !isAuthEndpoint(config.url)
    ) {
      config._retried = true;
      renewal = await renewAfter401();
      if (renewal === 'renewed') return apiClient(config);
    }

    const sessionOver =
      status === 401 && renewal !== 'offline' && !isAuthEndpoint(config?.url);

    if (sessionOver) {
      // The navigator's guard sees the signed-out state and shows the login.
      if (useAuthStore.getState().status === 'signedIn') {
        void useAuthStore.getState().signOut();
        toast.info(i18n.t('app:session.expired'));
      }
      return Promise.reject(error);
    }

    // Every other failure is a toast — except cancellations, and errors the
    // caller explains itself.
    const data: ApiErrorBody | undefined = error.response?.data;
    const silent =
      config?.silentErrors || (data?.code && HANDLED_BY_CALLER.has(data.code));
    if (!axios.isCancel(error) && !silent) {
      const coded = codedErrorMessage(i18n.t, data);
      if (coded) {
        toast.error(coded.title, coded.description);
      } else {
        toast.error(
          i18n.t('common:errors.requestFailed', {
            status: status ?? i18n.t('common:errors.noStatus'),
          }),
          errorMessage(i18n.t, error),
        );
      }
    }
    return Promise.reject(error);
  },
);

/** Nest answers a `null` return with an empty body. */
export const orNull = <T>(data: T | ''): T | null => data || null;
