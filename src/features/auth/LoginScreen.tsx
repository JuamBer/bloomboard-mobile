import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import type { TextInput } from 'react-native';
import { useTranslation } from 'react-i18next';
import { errorBody, errorStatus } from '@shared/api/errors';
import { authService } from '@shared/api/services/auth.service';
import { Button } from '@shared/ui/Button';
import { Text } from '@shared/ui/Text';
import { TextField } from '@shared/ui/TextField';
import { useAuthStore } from './auth.store';
import { AuthFrame, AuthLink, FormError } from './AuthFrame';

const EMAIL = /^\S+@\S+\.\S+$/;

/**
 * Sign-in. Only members get in: a staff account is told to use the web app
 * (its portal is the trainer's tool, not this one) and nothing is stored.
 * No center to pick either — a member may train with several companies.
 */
export function LoginScreen() {
  const { t } = useTranslation(['auth', 'common', 'app']);
  const router = useRouter();
  const signIn = useAuthStore((s) => s.signIn);
  const passwordRef = useRef<TextInput>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
    root?: string;
  }>({});
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    const next: typeof errors = {};
    if (!EMAIL.test(email.trim()))
      next.email = t('auth:login.errors.invalidEmail');
    if (password.length < 6) next.password = t('auth:login.errors.passwordMin');
    setErrors(next);
    if (next.email || next.password) return;

    setSubmitting(true);
    try {
      const response = await authService.login({
        email: email.trim(),
        password,
      });
      if (response.user.role !== 'CLIENT') {
        setErrors({
          root: `${t('app:auth.staffTitle')}. ${t('app:auth.staffDescription')}`,
        });
        return;
      }
      // The navigator's guard takes it from here: the member area opens.
      await signIn(response.user, response.accessToken, response.refreshToken);
    } catch (error) {
      // No response at all means the request never reached the API, so the
      // credentials were never checked — saying they're invalid would send
      // the member chasing their password instead of their connection.
      const status = errorStatus(error);
      const message = errorBody(error)?.message;
      setErrors({
        root: !status
          ? t('common:errors.network')
          : status === 429
            ? t('app:auth.tooManyAttempts')
            : typeof message === 'string'
              ? message
              : t('auth:login.errors.fallback'),
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthFrame
      title={t('auth:login.title')}
      subtitle={t('app:login.subtitle')}
      footer={
        <>
          <AuthLink
            prompt={t('auth:login.memberNoAccount')}
            label={t('auth:login.memberActivate')}
            onPress={() => router.push('/activate')}
          />
          <AuthLink
            prompt={t('app:login.noAccount')}
            label={t('auth:register.submit')}
            onPress={() => router.push('/register')}
          />
          <Text variant="caption" muted={0.25} center style={{ marginTop: 16 }}>
            {t('auth:login.footer')}
          </Text>
        </>
      }
    >
      <TextField
        label={t('auth:login.emailLabel')}
        value={email}
        onChangeText={setEmail}
        error={errors.email}
        placeholder={t('app:login.emailPlaceholder')}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        textContentType="username"
        returnKeyType="next"
        onSubmitEditing={() => passwordRef.current?.focus()}
        submitBehavior="submit"
      />
      <TextField
        ref={passwordRef}
        label={t('auth:login.passwordLabel')}
        value={password}
        onChangeText={setPassword}
        error={errors.password}
        placeholder="••••••••"
        secret
        autoCapitalize="none"
        autoComplete="current-password"
        textContentType="password"
        returnKeyType="go"
        onSubmitEditing={submit}
      />
      {errors.root ? <FormError message={errors.root} /> : null}
      <Button
        label={submitting ? t('auth:login.submitting') : t('auth:login.submit')}
        loading={submitting}
        onPress={submit}
        size="lg"
        fullWidth
      />
    </AuthFrame>
  );
}
