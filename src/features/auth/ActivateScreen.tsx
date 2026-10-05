import { useMutation, useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { authService } from '@shared/api/services/auth.service';
import { Button } from '@shared/ui/Button';
import { CenteredSpinner } from '@shared/ui/Spinner';
import { Text } from '@shared/ui/Text';
import { TextField } from '@shared/ui/TextField';
import { useAuthStore } from './auth.store';
import { AuthFrame, FormError } from './AuthFrame';

const MIN_PASSWORD = 8; // SetPasswordDto

/**
 * Where the welcome email's link lands when it opens in the app
 * (bloomboard://activate/<token>). The member picks their own password — the
 * moment they take ownership of the account — and is signed straight in.
 */
export function ActivateScreen({ token }: { token: string }) {
  const { t } = useTranslation(['member']);
  const router = useRouter();
  const signIn = useAuthStore((s) => s.signIn);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const link = useQuery({
    queryKey: ['auth', 'activation', token],
    queryFn: () => authService.validateActivation(token),
    retry: false,
  });

  const activate = useMutation({
    mutationFn: async () => {
      const tokens = await authService.setPassword(token, password);
      // The profile read needs the new session: hold the tokens first.
      await useAuthStore
        .getState()
        .setTokens(tokens.accessToken, tokens.refreshToken);
      const user = await authService.me();
      await signIn(user, tokens.accessToken, tokens.refreshToken);
    },
    onSuccess: () => router.replace('/'),
    onError: () => setFormError(t('member:activate.invalid')),
  });

  const submit = () => {
    if (password.length < MIN_PASSWORD)
      return setFormError(t('member:activate.tooShort'));
    if (password !== confirm)
      return setFormError(t('member:activate.mismatch'));
    setFormError(null);
    activate.mutate();
  };

  return (
    <AuthFrame title={t('member:activate.title')}>
      {link.isLoading ? (
        <CenteredSpinner />
      ) : link.isError ? (
        <>
          <Text variant="bodySmall" muted={0.6} center>
            {t('member:activate.invalid')}
          </Text>
          <Button
            label={t('member:activate.toLogin')}
            variant="ghost"
            onPress={() => router.replace('/login')}
          />
        </>
      ) : (
        <>
          <Text variant="bodySmall" muted={0.6} center>
            {t('member:activate.greeting', { name: link.data?.firstName })}
          </Text>
          {link.data?.email ? (
            <TextField
              value={link.data.email}
              editable={false}
              autoComplete="username"
              textContentType="username"
            />
          ) : null}
          <TextField
            value={password}
            onChangeText={setPassword}
            placeholder={t('member:activate.password')}
            secret
            autoComplete="new-password"
            textContentType="newPassword"
          />
          <TextField
            value={confirm}
            onChangeText={setConfirm}
            placeholder={t('member:activate.confirm')}
            secret
            autoComplete="new-password"
            textContentType="newPassword"
            returnKeyType="go"
            onSubmitEditing={submit}
          />
          <Text variant="caption" muted={0.45}>
            {t('member:activate.ownership')}
          </Text>
          {formError ? <FormError message={formError} /> : null}
          <Button
            label={
              activate.isPending
                ? t('member:activate.submitting')
                : t('member:activate.submit')
            }
            loading={activate.isPending}
            onPress={submit}
            size="lg"
            fullWidth
          />
        </>
      )}
    </AuthFrame>
  );
}
