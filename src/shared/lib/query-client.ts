import NetInfo from '@react-native-community/netinfo';
import {
  focusManager,
  onlineManager,
  QueryClient,
} from '@tanstack/react-query';
import { AppState, Platform, type AppStateStatus } from 'react-native';

/**
 * Server state, as on the web: TanStack Query with the API client toasting
 * every failure, so a query needs no error handling of its own.
 *
 * Two things a phone needs that a browser gets for free:
 * - focus is the app coming back to the foreground (refetch what is stale,
 *   restart the polls that the OS paused);
 * - online is the network, so a member in a basement gym is not toasted once
 *   per poll — queries pause and resume when the connection does.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 20_000,
      retry: (failureCount, error) => {
        const status = (error as { response?: { status?: number } })?.response
          ?.status;
        // A refusal will not change on a second try; a timeout might.
        if (status && status < 500) return false;
        return failureCount < 2;
      },
    },
    mutations: {
      retry: false,
    },
  },
});

let wired = false;

/** Ties the query client to the app's lifecycle. Idempotent. */
export function wireQueryClientToApp() {
  if (wired) return;
  wired = true;

  onlineManager.setEventListener((setOnline) =>
    NetInfo.addEventListener((state) => {
      // `isInternetReachable` is null while unknown: count that as online.
      setOnline(!!state.isConnected && state.isInternetReachable !== false);
    }),
  );

  if (Platform.OS !== 'web') {
    AppState.addEventListener('change', (status: AppStateStatus) => {
      focusManager.setFocused(status === 'active');
    });
  }
}
