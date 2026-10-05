import type { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LANGUAGES, useLanguageStore } from '@/i18n/language.store';
import { radius } from '@shared/theme/theme';
import { makeStyles, useTheme } from '@shared/theme/ThemeProvider';
import { BrandLogo } from '@shared/ui/BrandLogo';
import { Text } from '@shared/ui/Text';

/**
 * The frame every public screen shares: the language switch, the isotype on
 * its accent tile, a title, and the form — as the web's login, register and
 * activation pages draw it.
 */
export function AuthFrame({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const styles = useStyles();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const language = useLanguageStore((s) => s.language);
  const setLanguage = useLanguageStore((s) => s.setLanguage);
  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.scroll,
          {
            paddingTop: insets.top + 12,
            paddingBottom: insets.bottom + 24,
          },
        ]}
      >
        <View style={styles.languages}>
          {LANGUAGES.map(({ value, label }) => (
            <Pressable
              key={value}
              onPress={() => setLanguage(value)}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityState={{ selected: language === value }}
            >
              <Text
                variant="caption"
                weight="bold"
                color={
                  language === value ? theme.colors.accentInk : theme.text(0.3)
                }
              >
                {label}
              </Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.column}>
          <View style={styles.brand}>
            <View style={styles.tile}>
              <BrandLogo
                variant="isotype"
                width={34}
                color={theme.colors.accentInk}
              />
            </View>
            <Text variant="title" center accessibilityRole="header">
              {title}
            </Text>
            {subtitle ? (
              <Text variant="bodySmall" muted={0.5} center>
                {subtitle}
              </Text>
            ) : null}
          </View>
          {children}
          {footer ? <View style={styles.footer}>{footer}</View> : null}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/** "¿Ya tienes cuenta? Inicia sesión" — a line of text and a link in it. */
export function AuthLink({
  prompt,
  label,
  onPress,
}: {
  prompt: string;
  label: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Text variant="bodySmall" muted={0.5} center>
      {prompt}{' '}
      <Text
        variant="bodySmall"
        weight="bold"
        color={theme.colors.accentInk}
        onPress={onPress}
        accessibilityRole="link"
        suppressHighlighting
      >
        {label}
      </Text>
    </Text>
  );
}

/** An inline error under a form — the web's red box. */
export function FormError({ message }: { message: string }) {
  const styles = useStyles();
  const theme = useTheme();
  return (
    <View style={styles.error} accessibilityRole="alert">
      <Text variant="bodySmall" color={theme.colors.dangerInk}>
        {message}
      </Text>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  root: { flex: 1, backgroundColor: t.colors.background },
  scroll: { flexGrow: 1, paddingHorizontal: 20 },
  languages: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginBottom: 12,
  },
  column: {
    flex: 1,
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  brand: { alignItems: 'center', gap: 10, marginBottom: 20 },
  tile: {
    width: 64,
    height: 64,
    borderRadius: radius['2xl'],
    borderWidth: 1,
    borderColor: t.ink(0.2),
    backgroundColor: t.ink(0.1),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  footer: { gap: 8, marginTop: 12 },
  error: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.2)',
    backgroundColor: 'rgba(239,68,68,0.1)',
  },
}));
