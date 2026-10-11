import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { MailCheck } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { authService } from '@shared/api/services/auth.service';
import { Button } from '@shared/ui/Button';
import { Text } from '@shared/ui/Text';
import { TextField } from '@shared/ui/TextField';
import { AuthFrame, AuthLink, FormError } from './AuthFrame';
import { googleAvailable } from './google';
import {
  GoogleDivider,
  GoogleSignInButton,
  useGoogleSignIn,
} from './GoogleSignInButton';
import { SentNotice } from './SentNotice';

const EMAIL = /^\S+@\S+\.\S+$/;

/**
 * A member a gym or trainer already has — synced from Timp or created by the
 * staff — getting their activation link without anyone pressing *Invitar*.
 * Only the email: the business already has their name. Nothing is created for
 * an unknown email (that is the register screen), and the screen says the same
 * whether or not a link went out.
 *
 * Or continue with Google: when its email is the one the business has, that
 * account is claimed and linked at once — no email to wait for.
 */
export function RequestActivationScreen() {
  const { t } = useTranslation(['auth']);
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const google = useGoogleSignIn(setError);

  const request = useMutation({
    mutationFn: () => authService.requestActivation(email.trim()),
    onError: () => setError(t('auth:requestActivation.errors.generic')),
  });

  const submit = () => {
    setError(null);
    if (!EMAIL.test(email.trim()))
      return setError(t('auth:requestActivation.errors.email'));
    request.mutate();
  };

  return (
    <AuthFrame
      title={t('auth:requestActivation.title')}
      subtitle={t('auth:requestActivation.subtitle')}
      footer={
        <>
          <AuthLink
            prompt={t('auth:requestActivation.havePassword')}
            label={t('auth:login.submit')}
            onPress={() =>
              router.canGoBack() ? router.back() : router.replace('/login')
            }
          />
          <AuthLink
            prompt={t('auth:requestActivation.noBusiness')}
            label={t('auth:register.submit')}
            onPress={() => router.replace('/register')}
          />
        </>
      }
    >
      {request.isSuccess ? (
        <>
          <SentNotice
            icon={MailCheck}
            title={t('auth:requestActivation.sentTitle')}
            body={t('auth:requestActivation.sent', { email: email.trim() })}
          />
          <Text variant="bodySmall" muted={0.5} center>
            {t('auth:requestActivation.notReceived')}
          </Text>
          <Button
            label={t('auth:requestActivation.otherEmail')}
            variant="ghost"
            onPress={() => request.reset()}
          />
        </>
      ) : (
        <>
          <GoogleSignInButton onPress={google.start} loading={google.pending} />
          <GoogleDivider label={t('auth:google.orEmail')} />
          <TextField
            label={t('auth:login.emailLabel')}
            hint={t('auth:requestActivation.emailHint')}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            textContentType="emailAddress"
            // The keyboard would cover the Google button.
            autoFocus={!googleAvailable}
            returnKeyType="send"
            onSubmitEditing={submit}
          />
          {error ? <FormError message={error} /> : null}
          <Button
            label={t('auth:requestActivation.submit')}
            loading={request.isPending}
            onPress={submit}
            size="lg"
            fullWidth
          />
        </>
      )}
    </AuthFrame>
  );
}
