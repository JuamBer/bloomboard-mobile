import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { MailCheck } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { Trans, useTranslation } from 'react-i18next';
import { useLanguageStore } from '@/i18n/language.store';
import { authService } from '@shared/api/services/auth.service';
import { LANDING_URL } from '@shared/config/env';
import { useTheme } from '@shared/theme/ThemeProvider';
import { Button } from '@shared/ui/Button';
import { Checkbox } from '@shared/ui/controls';
import { Text } from '@shared/ui/Text';
import { TextField } from '@shared/ui/TextField';
import { AuthFrame, AuthLink, FormError } from './AuthFrame';
import { SentNotice } from './SentNotice';

const EMAIL = /^\S+@\S+\.\S+$/;

/**
 * A person creating their own account — someone who trains, not a business
 * (that is the web's /signup). No password here: an emailed link sets it,
 * which proves the address is theirs before any gym can link them by it. The
 * screen says the same whether or not the email already had an account.
 */
export function RegisterScreen() {
  const { t } = useTranslation(['auth', 'app']);
  const router = useRouter();
  const theme = useTheme();
  const language = useLanguageStore((s) => s.language);
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '' });
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const register = useMutation({
    mutationFn: () =>
      authService.registerMember({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        acceptTerms,
        // Names the routine the account starts with: "Mi rutina".
        language,
      }),
    onError: () => setError(t('auth:register.errors.generic')),
  });

  const submit = () => {
    setError(null);
    if (!form.firstName.trim() || !form.lastName.trim())
      return setError(t('auth:register.errors.required'));
    if (!EMAIL.test(form.email.trim()))
      return setError(t('auth:register.errors.email'));
    if (!acceptTerms) return setError(t('auth:register.errors.terms'));
    register.mutate();
  };

  const set = (key: keyof typeof form) => (value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const privacyUrl = `${LANDING_URL}${language === 'en' ? '/en' : ''}/privacy/`;

  return (
    <AuthFrame
      title={t('auth:register.title')}
      subtitle={t('auth:register.subtitle')}
      footer={
        <AuthLink
          prompt={t('auth:register.haveAccount')}
          label={t('auth:login.submit')}
          onPress={() =>
            router.canGoBack() ? router.back() : router.replace('/login')
          }
        />
      }
    >
      {register.isSuccess ? (
        <SentNotice
          icon={MailCheck}
          title={t('auth:register.sentTitle')}
          body={t('auth:register.sent', { email: form.email.trim() })}
        />
      ) : (
        <>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <TextField
              containerStyle={{ flex: 1 }}
              label={t('auth:register.firstName')}
              value={form.firstName}
              onChangeText={set('firstName')}
              autoComplete="given-name"
              textContentType="givenName"
            />
            <TextField
              containerStyle={{ flex: 1 }}
              label={t('auth:register.lastName')}
              value={form.lastName}
              onChangeText={set('lastName')}
              autoComplete="family-name"
              textContentType="familyName"
            />
          </View>
          <TextField
            label={t('auth:login.emailLabel')}
            hint={t('auth:register.emailHint')}
            value={form.email}
            onChangeText={set('email')}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            textContentType="emailAddress"
          />
          <Checkbox
            checked={acceptTerms}
            onChange={setAcceptTerms}
            label={
              <Text variant="bodySmall" muted={0.7} style={{ flex: 1 }}>
                <Trans
                  i18nKey="auth:register.acceptTerms"
                  components={{
                    1: (
                      <Text
                        variant="bodySmall"
                        weight="bold"
                        color={theme.colors.accentInk}
                        onPress={() =>
                          void WebBrowser.openBrowserAsync(privacyUrl)
                        }
                        accessibilityRole="link"
                      />
                    ),
                  }}
                />
              </Text>
            }
          />
          {error ? <FormError message={error} /> : null}
          <Button
            label={t('auth:register.submit')}
            loading={register.isPending}
            onPress={submit}
            size="lg"
            fullWidth
          />
        </>
      )}
    </AuthFrame>
  );
}
