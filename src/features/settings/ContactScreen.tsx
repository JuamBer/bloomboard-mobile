import { useMutation } from '@tanstack/react-query';
import Constants from 'expo-constants';
import { Bug, Lightbulb, Mail } from 'lucide-react-native';
import { useState } from 'react';
import { Linking, Platform, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { meService } from '@shared/api/services/me.service';
import { makeStyles } from '@shared/theme/ThemeProvider';
import type { FeedbackKind } from '@shared/types/api.types';
import { Button } from '@shared/ui/Button';
import { Screen, StackHeader } from '@shared/ui/layout';
import { Sheet } from '@shared/ui/Sheet';
import { Text } from '@shared/ui/Text';
import { TextField } from '@shared/ui/TextField';
import { toast } from '@shared/ui/toast/toast.store';
import { BLOOM_LINKS } from './links';
import { SettingsGroup, SettingsRow } from './widgets/SettingsList';

const MAX_MESSAGE = 5000;

/**
 * Ajustes › Contáctanos: a suggestion or a problem, written here and read by
 * Bloom Board's team in the admin portal's Buzón (backend
 * specs/member-help.md) — with the app's version, the system and the language
 * attached, so a problem can be reproduced. Email stays as the other way.
 */
export function ContactScreen() {
  const { t } = useTranslation(['app']);
  const styles = useStyles();
  const [writing, setWriting] = useState<FeedbackKind | null>(null);

  return (
    <View style={styles.root}>
      <StackHeader title={t('app:settings.help.contact')} />
      <Screen safeTop={false} contentStyle={styles.content}>
        <Text variant="bodySmall" muted={0.6}>
          {t('app:contact.intro')}
        </Text>
        <SettingsGroup>
          <SettingsRow
            icon={Lightbulb}
            title={t('app:contact.suggestion')}
            subtitle={t('app:contact.suggestionHint')}
            onPress={() => setWriting('SUGGESTION')}
          />
          <SettingsRow
            icon={Bug}
            title={t('app:contact.bug')}
            subtitle={t('app:contact.bugHint')}
            onPress={() => setWriting('BUG')}
          />
        </SettingsGroup>
        <SettingsGroup title={t('app:contact.orEmail')}>
          <SettingsRow
            icon={Mail}
            title={BLOOM_LINKS.email}
            onPress={() => void Linking.openURL(`mailto:${BLOOM_LINKS.email}`)}
          />
        </SettingsGroup>
      </Screen>
      <FeedbackSheet kind={writing} onClose={() => setWriting(null)} />
    </View>
  );
}

function FeedbackSheet({
  kind,
  onClose,
}: {
  kind: FeedbackKind | null;
  onClose: () => void;
}) {
  const { t, i18n } = useTranslation(['app', 'common']);
  const [message, setMessage] = useState('');
  // Kept while the sheet closes, so its title does not flip mid-animation.
  const [shown, setShown] = useState<FeedbackKind>('SUGGESTION');
  if (kind && kind !== shown) setShown(kind);
  const bug = shown === 'BUG';

  const send = useMutation({
    mutationFn: () =>
      meService.sendFeedback({
        kind: shown,
        message: message.trim(),
        appVersion: Constants.expoConfig?.version ?? undefined,
        platform: `${Platform.OS} ${Platform.Version}`.slice(0, 60),
        lang: i18n.language,
      }),
    onSuccess: () => {
      toast.success(
        t('app:contact.sent'),
        bug ? t('app:contact.sentBug') : t('app:contact.sentSuggestion'),
      );
      setMessage('');
      onClose();
    },
  });

  return (
    <Sheet
      open={!!kind}
      onClose={() => !send.isPending && onClose()}
      title={bug ? t('app:contact.bug') : t('app:contact.suggestion')}
      dismissable={!send.isPending}
      footer={
        <>
          <Button
            label={t('common:cancel')}
            variant="secondary"
            flex
            disabled={send.isPending}
            onPress={onClose}
          />
          <Button
            label={t('app:contact.send')}
            flex
            disabled={!message.trim()}
            loading={send.isPending}
            onPress={() => send.mutate()}
          />
        </>
      }
    >
      <TextField
        label={
          bug ? t('app:contact.bugLabel') : t('app:contact.suggestionLabel')
        }
        hint={bug ? t('app:contact.bugHelp') : undefined}
        placeholder={
          bug
            ? t('app:contact.bugPlaceholder')
            : t('app:contact.suggestionPlaceholder')
        }
        value={message}
        onChangeText={setMessage}
        multiline
        maxLength={MAX_MESSAGE}
        editable={!send.isPending}
        autoFocus
      />
      <Text variant="caption" muted={0.4}>
        {t('app:contact.attached', {
          version: Constants.expoConfig?.version ?? '—',
        })}
      </Text>
    </Sheet>
  );
}

const useStyles = makeStyles((t) => ({
  root: { flex: 1, backgroundColor: t.colors.background },
  content: { gap: 22, paddingTop: 16 },
}));
