import '@/i18n';
import {
  IBMPlexMono_400Regular,
  IBMPlexMono_500Medium_Italic,
  IBMPlexMono_700Bold,
  IBMPlexMono_700Bold_Italic,
} from '@expo-google-fonts/ibm-plex-mono';
import {
  IBMPlexSansArabic_400Regular,
  IBMPlexSansArabic_500Medium,
  IBMPlexSansArabic_600SemiBold,
  IBMPlexSansArabic_700Bold,
} from '@expo-google-fonts/ibm-plex-sans-arabic';
import { QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import {
  DarkTheme,
  DefaultTheme,
  Stack,
  ThemeProvider as NavigationThemeProvider,
} from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect, useSyncExternalStore, type ReactNode } from 'react';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAuthStore } from '@features/auth/auth.store';
import { AppEffects } from '@features/auth/AppEffects';
import { useLanguageStore } from '@/i18n/language.store';
import { queryClient, wireQueryClientToApp } from '@shared/lib/query-client';
import { ThemeProvider, useTheme } from '@shared/theme/ThemeProvider';
import { useThemeStore } from '@shared/theme/theme.store';
import { Toaster } from '@shared/ui/toast/Toaster';

void SplashScreen.preventAutoHideAsync();
wireQueryClientToApp();

/** Whether a persisted zustand store has read its value from the device. */
const useHydrated = (store: {
  persist: {
    hasHydrated: () => boolean;
    onFinishHydration: (fn: () => void) => () => void;
  };
}) =>
  useSyncExternalStore(
    store.persist.onFinishHydration,
    store.persist.hasHydrated,
    store.persist.hasHydrated,
  );

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    IBMPlexMono_400Regular,
    IBMPlexMono_500Medium_Italic,
    IBMPlexMono_700Bold,
    IBMPlexMono_700Bold_Italic,
    IBMPlexSansArabic_400Regular,
    IBMPlexSansArabic_500Medium,
    IBMPlexSansArabic_600SemiBold,
    IBMPlexSansArabic_700Bold,
  });
  const authStatus = useAuthStore((s) => s.status);
  const themeReady = useHydrated(useThemeStore);
  const languageReady = useHydrated(useLanguageStore);

  useEffect(() => {
    void useAuthStore.getState().hydrate();
  }, []);

  // The splash stays until the first screen can be the right one: fonts in,
  // the stored session read (signed in or not), the theme and language known.
  // A font that fails to load falls back to the system face rather than
  // holding the app on its splash.
  const ready =
    (fontsLoaded || !!fontError) &&
    authStatus !== 'loading' &&
    themeReady &&
    languageReady;

  useEffect(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    <SafeAreaProvider>
      <KeyboardProvider>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <NavigationTheme>
              <AppEffects />
              <RootNavigator />
              <Toaster />
            </NavigationTheme>
          </ThemeProvider>
        </QueryClientProvider>
      </KeyboardProvider>
    </SafeAreaProvider>
  );
}

/**
 * The member area is only reachable signed in; the public screens only
 * signed out. When the session ends (sign-out, a refused refresh) the guard
 * flips and the navigator drops the member's history and lands on the login.
 * The activation link works either way: it may be opened on a phone already
 * signed in as someone else.
 */
function RootNavigator() {
  const signedIn = useAuthStore((s) => s.status === 'signedIn');
  const theme = useTheme();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.colors.background },
        animation: 'default',
      }}
    >
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="login" />
        <Stack.Screen name="register" />
        <Stack.Screen name="activate/index" />
      </Stack.Protected>
      <Stack.Protected guard={signedIn}>
        <Stack.Screen name="(member)" />
      </Stack.Protected>
      <Stack.Screen name="activate/[token]" />
    </Stack>
  );
}

/** Native chrome (navigator backgrounds, status bar, the root view behind
 *  everything) in the app's colours, so no white flashes between screens. */
function NavigationTheme({ children }: { children: ReactNode }) {
  const theme = useTheme();
  const base = theme.dark ? DarkTheme : DefaultTheme;
  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(theme.colors.background);
  }, [theme.colors.background]);
  return (
    <NavigationThemeProvider
      value={{
        ...base,
        colors: {
          ...base.colors,
          primary: theme.colors.accentInk,
          background: theme.colors.background,
          card: theme.colors.surface,
          text: theme.colors.foreground,
          border: theme.line(0.08),
        },
      }}
    >
      <StatusBar style={theme.dark ? 'light' : 'dark'} />
      {children}
    </NavigationThemeProvider>
  );
}
