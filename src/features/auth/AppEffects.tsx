import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import i18n from '@/i18n';
import { useLanguageStore } from '@/i18n/language.store';
import { authService } from '@shared/api/services/auth.service';
import { configurationsService } from '@shared/api/services/configurations.service';
import { useThemeStore } from '@shared/theme/theme.store';
import { toast } from '@shared/ui/toast/toast.store';
import { useAuthStore } from './auth.store';

export const CONFIGURATION_QUERY_KEY = ['configurations', 'me'] as const;

/**
 * What keeps the app in step with the member's account while it runs. Mounted
 * once, at the root; renders nothing.
 */
export function AppEffects() {
  const signedIn = useAuthStore((s) => s.status === 'signedIn');
  const queryClient = useQueryClient();

  // The language: a device preference (as a browser one on the web).
  const language = useLanguageStore((s) => s.language);
  useEffect(() => {
    if (i18n.language !== language) void i18n.changeLanguage(language);
  }, [language]);

  // The theme lives on the server, shared with the web: adopt its value when
  // it differs (the member changed it on another device).
  const { data: configuration } = useQuery({
    queryKey: CONFIGURATION_QUERY_KEY,
    queryFn: configurationsService.getMine,
    enabled: signedIn,
    staleTime: Infinity,
  });
  useEffect(() => {
    const theme = configuration?.theme;
    if (theme && theme !== useThemeStore.getState().mode) {
      useThemeStore.getState().setMode(theme);
    }
  }, [configuration?.theme]);

  // The stored user is as old as the last sign-in: re-read it once per run.
  // This app is the members' — a staff account signed in from an old build or
  // a shared device is sent to the web app instead of a screen of 403s.
  const userId = useAuthStore((s) => s.user?.id);
  useEffect(() => {
    if (!signedIn || !userId) return;
    let cancelled = false;
    authService
      .me()
      .then((user) => {
        if (cancelled) return;
        if (user.role !== 'CLIENT') {
          void useAuthStore.getState().signOut();
          queryClient.clear();
          toast.info(
            i18n.t('app:auth.staffTitle'),
            i18n.t('app:auth.staffDescription'),
          );
          return;
        }
        useAuthStore.getState().setUser(user);
      })
      .catch(() => {
        // Offline: carry on with the stored user; the next run re-reads it.
      });
    return () => {
      cancelled = true;
    };
  }, [signedIn, userId, queryClient]);

  return null;
}
