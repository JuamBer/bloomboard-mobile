import { useMutation, useQueryClient } from '@tanstack/react-query';
import { KeyRound, Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { GoogleCancelled, googleIdToken } from '@features/auth/google';
import { GoogleSignInButton } from '@features/auth/GoogleSignInButton';
import {
  MEMBER_PROFILE_KEY,
  useMemberLogout,
  useMemberProfile,
} from '@features/member/hooks';
import { errorBody } from '@shared/api/errors';
import { meService } from '@shared/api/services/me.service';
import { makeStyles, useTheme } from '@shared/theme/ThemeProvider';
import { Button } from '@shared/ui/Button';
import { Screen, StackHeader } from '@shared/ui/layout';
import { Sheet } from '@shared/ui/Sheet';
import { QueryState } from '@shared/ui/states';
import { Text } from '@shared/ui/Text';
import { TextField } from '@shared/ui/TextField';
import { toast } from '@shared/ui/toast/toast.store';
import { SettingsGroup, SettingsRow } from './widgets/SettingsList';

/** The backend's minimum (ChangePasswordDto, SetPasswordDto). */
const MIN_PASSWORD = 8;

/**
 * Ajustes › Cuenta: the password — changed with the current one, or, for an
 * account that signs in with Google only, created after confirming with
 * Google — and deleting the account, which Google Play requires inside the
 * app (the privacy policy points here).
 */
export function AccountSettingsScreen() {
  const { t } = useTranslation(['app', 'member']);
  const styles = useStyles();
  const { data: profile, isLoading, isError, refetch } = useMemberProfile();
  const [changing, setChanging] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const hasPassword = profile?.hasPassword ?? true;

  return (
    <View style={styles.root}>
      <StackHeader title={t('app:settings.account.account')} />
      <Screen safeTop={false} contentStyle={styles.content}>
        <QueryState isLoading={isLoading} isError={isError} onRetry={refetch} />
        {profile && (
          <>
            <SettingsGroup
              title={t('app:password.section')}
              footer={
                hasPassword ? undefined : t('app:password.googleOnlyHint')
              }
            >
              <SettingsRow
                icon={KeyRound}
                title={
                  hasPassword
                    ? t('app:password.change')
                    : t('app:password.create')
                }
                onPress={() => setChanging(true)}
              />
            </SettingsGroup>
            <SettingsGroup footer={t('member:profile.deleteHint')}>
              <SettingsRow
                icon={Trash2}
                title={t('member:profile.deleteAccount')}
                destructive
                onPress={() => setDeleting(true)}
              />
            </SettingsGroup>
          </>
        )}
      </Screen>
      <ChangePasswordSheet
        open={changing}
        onClose={() => setChanging(false)}
        hasPassword={hasPassword}
      />
      <DeleteAccountSheet
        open={deleting}
        onClose={() => setDeleting(false)}
        hasPassword={hasPassword}
      />
    </View>
  );
}

const CONFIRM_ERRORS: Record<string, string> = {
  WRONG_PASSWORD: 'app:password.wrong',
  GOOGLE_CONFIRMATION_REQUIRED: 'app:password.googleRequired',
  GOOGLE_CONFIRMATION_MISMATCH: 'member:profile.deleteGoogleMismatch',
};

/** Confirming it is them with Google, for an account without a password. */
function useGoogleConfirmation(onError: (message: string) => void) {
  const { t } = useTranslation(['member']);
  const [token, setToken] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const confirm = async () => {
    setConfirming(true);
    try {
      setToken(await googleIdToken());
    } catch (e) {
      if (!(e instanceof GoogleCancelled)) {
        onError(t('member:profile.deleteError'));
      }
    } finally {
      setConfirming(false);
    }
  };
  return { token, setToken, confirming, confirm };
}

/**
 * A new password, typed twice. With a password: the current one confirms it.
 * Without (Google only): a fresh Google sign-in of the same account does, and
 * the account gains email + password as a second way in.
 */
function ChangePasswordSheet({
  open,
  onClose,
  hasPassword,
}: {
  open: boolean;
  onClose: () => void;
  hasPassword: boolean;
}) {
  const { t } = useTranslation(['app', 'member', 'common']);
  const theme = useTheme();
  const queryClient = useQueryClient();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [repeat, setRepeat] = useState('');
  const [error, setError] = useState<string | null>(null);
  const google = useGoogleConfirmation(setError);

  const tooShort = next.length > 0 && next.length < MIN_PASSWORD;
  const mismatch = repeat.length > 0 && repeat !== next;
  const confirmed = hasPassword ? !!current : !!google.token;
  const ready =
    confirmed && next.length >= MIN_PASSWORD && repeat === next && !error;

  const change = useMutation({
    mutationFn: () =>
      meService.changePassword({
        newPassword: next,
        ...(hasPassword
          ? { currentPassword: current }
          : { googleIdToken: google.token! }),
      }),
    onSuccess: () => {
      toast.success(
        hasPassword ? t('app:password.changed') : t('app:password.created'),
      );
      void queryClient.invalidateQueries({ queryKey: MEMBER_PROFILE_KEY });
      close(true);
    },
    onError: (e) => {
      const code = errorBody(e)?.code;
      if (code === 'GOOGLE_CONFIRMATION_MISMATCH') google.setToken(null);
      setError(
        t(
          (typeof code === 'string' && CONFIRM_ERRORS[code]) ||
            'app:password.error',
        ),
      );
    },
  });

  const close = (force = false) => {
    if (change.isPending && !force) return;
    setCurrent('');
    setNext('');
    setRepeat('');
    setError(null);
    google.setToken(null);
    onClose();
  };

  return (
    <Sheet
      open={open}
      onClose={() => close()}
      title={hasPassword ? t('app:password.change') : t('app:password.create')}
      dismissable={!change.isPending}
      footer={
        <>
          <Button
            label={t('common:cancel')}
            variant="secondary"
            flex
            disabled={change.isPending}
            onPress={() => close()}
          />
          <Button
            label={t('app:password.save')}
            flex
            disabled={!ready}
            loading={change.isPending}
            onPress={() => {
              setError(null);
              change.mutate();
            }}
          />
        </>
      }
    >
      {hasPassword ? (
        <TextField
          label={t('app:password.current')}
          value={current}
          onChangeText={(v) => {
            setCurrent(v);
            setError(null);
          }}
          secret
          autoComplete="current-password"
          textContentType="password"
          autoCapitalize="none"
          editable={!change.isPending}
        />
      ) : google.token ? (
        <Text variant="bodySmall" weight="bold" color={theme.colors.successInk}>
          {t('member:profile.deleteGoogleConfirmed')}
        </Text>
      ) : (
        <>
          <Text variant="caption" weight="bold" muted={0.7}>
            {t('app:password.withGoogle')}
          </Text>
          <GoogleSignInButton
            onPress={() => {
              setError(null);
              void google.confirm();
            }}
            loading={google.confirming}
          />
        </>
      )}
      <TextField
        label={t('app:password.new')}
        hint={t('app:password.rule', { count: MIN_PASSWORD })}
        error={
          tooShort ? t('app:password.tooShort', { count: MIN_PASSWORD }) : null
        }
        value={next}
        onChangeText={(v) => {
          setNext(v);
          setError(null);
        }}
        secret
        autoComplete="new-password"
        textContentType="newPassword"
        autoCapitalize="none"
        editable={!change.isPending}
      />
      <TextField
        label={t('app:password.repeat')}
        error={mismatch ? t('app:password.mismatch') : null}
        value={repeat}
        onChangeText={(v) => {
          setRepeat(v);
          setError(null);
        }}
        secret
        autoComplete="new-password"
        textContentType="newPassword"
        autoCapitalize="none"
        editable={!change.isPending}
      />
      {error ? (
        <Text variant="bodySmall" color={theme.colors.dangerInk}>
          {error}
        </Text>
      ) : null}
    </Sheet>
  );
}

/**
 * Deleting the account: what goes, then the password — the one step that
 * makes an irreversible action deliberate (and that a borrowed, unlocked phone
 * cannot pass). An account that signs in with Google only has no password: it
 * confirms with Google instead. Google Play requires it in the app; the privacy
 * policy describes where it is. DELETE /me removes everything at once, then the
 * member is signed out.
 */
const DELETE_ERRORS: Record<string, string> = {
  WRONG_PASSWORD: 'member:profile.deleteWrongPassword',
  GOOGLE_CONFIRMATION_REQUIRED: 'member:profile.deleteGoogleRequired',
  GOOGLE_CONFIRMATION_MISMATCH: 'member:profile.deleteGoogleMismatch',
};

function DeleteAccountSheet({
  open,
  onClose,
  hasPassword,
}: {
  open: boolean;
  onClose: () => void;
  hasPassword: boolean;
}) {
  const { t } = useTranslation(['member', 'common']);
  const styles = useStyles();
  const theme = useTheme();
  const logout = useMemberLogout();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const google = useGoogleConfirmation(setError);
  const confirmed = hasPassword ? !!password : !!google.token;

  const remove = useMutation({
    mutationFn: () =>
      meService.deleteAccount(
        hasPassword ? { password } : { googleIdToken: google.token! },
      ),
    onSuccess: async () => {
      await logout();
      toast.success(t('member:profile.deleted'));
    },
    onError: (e) => {
      const code = errorBody(e)?.code;
      if (code === 'GOOGLE_CONFIRMATION_MISMATCH') google.setToken(null);
      setError(
        t(
          (typeof code === 'string' && DELETE_ERRORS[code]) ||
            'member:profile.deleteError',
        ),
      );
    },
  });

  const close = () => {
    if (remove.isPending) return;
    setPassword('');
    google.setToken(null);
    setError(null);
    onClose();
  };

  return (
    <Sheet
      open={open}
      onClose={close}
      title={t('member:profile.deleteTitle')}
      dismissable={!remove.isPending}
      footer={
        <>
          <Button
            label={t('common:cancel')}
            variant="secondary"
            flex
            disabled={remove.isPending}
            onPress={close}
          />
          <Button
            label={t('member:profile.deleteConfirm')}
            variant="danger"
            flex
            disabled={!confirmed}
            loading={remove.isPending}
            onPress={() => {
              setError(null);
              remove.mutate();
            }}
          />
        </>
      }
    >
      <Text variant="bodySmall">{t('member:profile.deleteIntro')}</Text>
      <View style={styles.deleteList}>
        {t('member:profile.deleteItems')
          .split('\n')
          .map((item) => (
            <View key={item} style={styles.deleteItem}>
              <Trash2 size={14} color={theme.colors.dangerInk} />
              <Text variant="bodySmall" muted={0.7} style={styles.flex}>
                {item}
              </Text>
            </View>
          ))}
      </View>
      <Text variant="caption" muted={0.55}>
        {t('member:profile.deleteCenters')}
      </Text>
      {hasPassword ? (
        <TextField
          label={t('member:profile.deletePassword')}
          value={password}
          onChangeText={(next) => {
            setPassword(next);
            setError(null);
          }}
          secret
          autoComplete="current-password"
          textContentType="password"
          autoCapitalize="none"
          editable={!remove.isPending}
        />
      ) : google.token ? (
        <Text variant="bodySmall" weight="bold" color={theme.colors.successInk}>
          {t('member:profile.deleteGoogleConfirmed')}
        </Text>
      ) : (
        <>
          <Text variant="caption" weight="bold" muted={0.7}>
            {t('member:profile.deleteWithGoogle')}
          </Text>
          <GoogleSignInButton
            onPress={() => {
              setError(null);
              void google.confirm();
            }}
            loading={google.confirming}
          />
        </>
      )}
      {error ? (
        <Text variant="bodySmall" color={theme.colors.dangerInk}>
          {error}
        </Text>
      ) : null}
    </Sheet>
  );
}

const useStyles = makeStyles((t) => ({
  root: { flex: 1, backgroundColor: t.colors.background },
  content: { gap: 22, paddingTop: 16 },
  flex: { flex: 1, minWidth: 0 },
  deleteList: { gap: 8 },
  deleteItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
}));
