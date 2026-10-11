import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Trans, useTranslation } from 'react-i18next';
import { useLanguageStore } from '@/i18n/language.store';
import { errorBody, errorStatus } from '@shared/api/errors';
import { authService } from '@shared/api/services/auth.service';
import { LANDING_URL } from '@shared/config/env';
import { makeStyles, useTheme } from '@shared/theme/ThemeProvider';
import { Text } from '@shared/ui/Text';
import { useAuthStore } from './auth.store';
import {
  GoogleCancelled,
  GoogleUnavailable,
  googleAvailable,
  googleIdToken,
} from './google';

/** The API's coded refusals of a Google sign-in (as the web's). */
const API_CODES = [
  'ACCOUNT_DISABLED',
  'GOOGLE_EMAIL_UNVERIFIED',
  'GOOGLE_ACCOUNT_MISMATCH',
  'GOOGLE_NOT_CONFIGURED',
];

/**
 * Continue with Google, start to end: Google's account picker, then
 * POST /auth/google, then into the member area — the same landing as a
 * password. A staff account is told to use the web, as on the password form
 * (its Google account stays linked for when they do).
 */
export function useGoogleSignIn(onError: (message: string | null) => void) {
  const { t } = useTranslation(['auth', 'app', 'common']);
  const language = useLanguageStore((s) => s.language);
  const signIn = useAuthStore((s) => s.signIn);
  const [pending, setPending] = useState(false);

  const start = async () => {
    onError(null);
    setPending(true);
    try {
      const idToken = await googleIdToken();
      const response = await authService.google({ idToken, language });
      if (response.user.role !== 'CLIENT') {
        onError(
          `${t('app:auth.staffTitle')}. ${t('app:auth.staffDescription')}`,
        );
        return;
      }
      await signIn(response.user, response.accessToken, response.refreshToken);
    } catch (error) {
      if (error instanceof GoogleCancelled) return;
      if (error instanceof GoogleUnavailable) {
        onError(t('auth:google.errors.playServices'));
        return;
      }
      const code = errorBody(error)?.code;
      onError(
        typeof code === 'string' && API_CODES.includes(code)
          ? t(`auth:google.errors.${code}`)
          : errorStatus(error) === 429
            ? t('app:auth.tooManyAttempts')
            : t('auth:google.errors.generic'),
      );
    } finally {
      setPending(false);
    }
  };

  return { start, pending };
}

/**
 * Google's "Continue with Google" button, drawn to its branding guidelines
 * (the four-colour G, the neutral outline / dark fill). Renders nothing where
 * Google sign-in is not available.
 */
export function GoogleSignInButton({
  onPress,
  loading,
  label,
}: {
  onPress: () => void;
  loading?: boolean;
  label?: string;
}) {
  const { t } = useTranslation(['auth']);
  const styles = useStyles();
  const theme = useTheme();
  if (!googleAvailable) return null;
  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      accessibilityRole="button"
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
    >
      {loading ? (
        <ActivityIndicator color={theme.dark ? '#E3E3E3' : '#1F1F1F'} />
      ) : (
        <>
          <GoogleG />
          <Text variant="label" weight="semibold" style={styles.label}>
            {label ?? t('auth:google.continue')}
          </Text>
        </>
      )}
    </Pressable>
  );
}

/** "o" between Google and the email form — only when Google is offered. */
export function GoogleDivider({ label }: { label: string }) {
  const styles = useStyles();
  if (!googleAvailable) return null;
  return (
    <View style={styles.divider}>
      <View style={styles.rule} />
      <Text variant="caption" muted={0.4}>
        {label}
      </Text>
      <View style={styles.rule} />
    </View>
  );
}

/** What continuing with Google accepts — said before the button is used. */
export function GoogleConsent() {
  const { t } = useTranslation(['auth']);
  const theme = useTheme();
  const language = useLanguageStore((s) => s.language);
  if (!googleAvailable) return null;
  const privacyUrl = `${LANDING_URL}${language === 'en' ? '/en' : ''}/privacy/`;
  return (
    <Text variant="caption" muted={0.5} center>
      <Trans
        t={t}
        i18nKey="auth:google.consent"
        components={{
          1: (
            <Text
              variant="caption"
              weight="bold"
              color={theme.colors.accentInk}
              onPress={() => void WebBrowser.openBrowserAsync(privacyUrl)}
              accessibilityRole="link"
            />
          ),
        }}
      />
    </Text>
  );
}

function GoogleG() {
  return (
    <Svg width={18} height={18} viewBox="0 0 48 48">
      <Path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <Path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <Path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <Path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </Svg>
  );
}

const useStyles = makeStyles((t) => ({
  // Google's own colours, not the app's palette: its branding asks for them.
  button: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: t.dark ? '#8E918F' : '#747775',
    backgroundColor: t.dark ? '#131314' : '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    alignSelf: 'stretch',
  },
  pressed: { opacity: 0.85 },
  label: { color: t.dark ? '#E3E3E3' : '#1F1F1F' },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rule: { flex: 1, height: 1, backgroundColor: t.line(0.1) },
}));
