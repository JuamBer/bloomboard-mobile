import { useMutation, useQueryClient } from '@tanstack/react-query';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import {
  CircleHelp,
  Crown,
  Download,
  Info,
  KeyRound,
  Languages,
  LogOut,
  MessageSquare,
  Ruler,
  SunMoon,
  UserRound,
} from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { CONFIGURATION_QUERY_KEY } from '@features/auth/AppEffects';
import { useMemberLogout, useMemberPlan } from '@features/member/hooks';
import { useSetUnitSystem, useUnitSystem } from '@features/units/useUnitSystem';
import {
  LANGUAGES,
  useLanguageStore,
  type Language,
} from '@/i18n/language.store';
import { configurationsService } from '@shared/api/services/configurations.service';
import { makeStyles } from '@shared/theme/ThemeProvider';
import { useThemeStore, type ThemeMode } from '@shared/theme/theme.store';
import type { UnitSystem } from '@shared/types/api.types';
import { ConfirmDialog } from '@shared/ui/ConfirmDialog';
import { Screen, StackHeader } from '@shared/ui/layout';
import { Text } from '@shared/ui/Text';
import {
  OptionSheet,
  SettingsGroup,
  SettingsRow,
} from './widgets/SettingsList';

type Picker = 'units' | 'language' | 'theme' | null;

const THEMES: ThemeMode[] = ['SYSTEM', 'LIGHT', 'DARK'];
const UNIT_SYSTEMS: UnitSystem[] = ['METRIC', 'IMPERIAL'];

/**
 * Ajustes, from the profile's gear: the account (details, password and
 * deletion, plan), the app's preferences (units, language, light or dark, a
 * Hevy import) and help (FAQ, contact, about). Signing out closes it.
 */
export function SettingsScreen() {
  const { t } = useTranslation(['app', 'common', 'member', 'imports']);
  const styles = useStyles();
  const router = useRouter();
  const queryClient = useQueryClient();
  const logout = useMemberLogout();
  const { data: plan } = useMemberPlan();
  const [picker, setPicker] = useState<Picker>(null);
  const [confirmLogout, setConfirmLogout] = useState(false);

  const unitSystem = useUnitSystem();
  const { setUnitSystem } = useSetUnitSystem();
  const language = useLanguageStore((s) => s.language);
  const setLanguage = useLanguageStore((s) => s.setLanguage);
  const mode = useThemeStore((s) => s.mode);
  const setMode = useThemeStore((s) => s.setMode);
  // Light, dark or the device's — stored on the server, shared with the web.
  const saveTheme = useMutation({
    mutationFn: (theme: ThemeMode) => configurationsService.update({ theme }),
    onSuccess: (config) =>
      queryClient.setQueryData(CONFIGURATION_QUERY_KEY, config),
  });

  const unitLabel = (value: UnitSystem) =>
    t(`common:unitSystem.options.${value}.label`);
  const themeLabel = (value: ThemeMode) =>
    t(`app:theme.${value.toLowerCase() as 'system' | 'light' | 'dark'}`);

  return (
    <View style={styles.root}>
      <StackHeader title={t('app:settings.title')} />
      <Screen safeTop={false} contentStyle={styles.content}>
        <SettingsGroup title={t('app:settings.account.title')}>
          <SettingsRow
            icon={UserRound}
            title={t('app:settings.account.profile')}
            onPress={() => router.push('/settings/profile')}
          />
          <SettingsRow
            icon={KeyRound}
            title={t('app:settings.account.account')}
            onPress={() => router.push('/settings/account')}
          />
          <SettingsRow
            icon={Crown}
            title={t('app:settings.account.subscription')}
            value={plan?.plan.name}
            onPress={() => router.push('/settings/subscription')}
          />
        </SettingsGroup>

        <SettingsGroup title={t('app:settings.preferences.title')}>
          <SettingsRow
            icon={Ruler}
            title={t('common:unitSystem.title')}
            value={unitLabel(unitSystem)}
            onPress={() => setPicker('units')}
          />
          <SettingsRow
            icon={Languages}
            title={t('app:settings.preferences.language')}
            value={t(`common:language.${language}`)}
            onPress={() => setPicker('language')}
          />
          <SettingsRow
            icon={SunMoon}
            title={t('member:profile.appearance')}
            value={themeLabel(mode)}
            onPress={() => setPicker('theme')}
          />
          <SettingsRow
            icon={Download}
            title={t('imports:profileCard.import')}
            onPress={() => router.push('/import')}
          />
        </SettingsGroup>

        <SettingsGroup title={t('app:settings.help.title')}>
          <SettingsRow
            icon={CircleHelp}
            title={t('app:settings.help.faq')}
            onPress={() => router.push('/settings/faq')}
          />
          <SettingsRow
            icon={MessageSquare}
            title={t('app:settings.help.contact')}
            onPress={() => router.push('/settings/contact')}
          />
          <SettingsRow
            icon={Info}
            title={t('app:settings.help.about')}
            onPress={() => router.push('/settings/about')}
          />
        </SettingsGroup>

        <SettingsGroup>
          <SettingsRow
            icon={LogOut}
            title={t('member:nav.logout')}
            destructive
            chevron={false}
            onPress={() => setConfirmLogout(true)}
          />
        </SettingsGroup>

        <Text variant="caption" muted={0.3} center>
          Bloom Board {Constants.expoConfig?.version ?? ''}
        </Text>
      </Screen>

      <OptionSheet<UnitSystem>
        open={picker === 'units'}
        onClose={() => setPicker(null)}
        title={t('common:unitSystem.title')}
        value={unitSystem}
        onChange={setUnitSystem}
        options={UNIT_SYSTEMS.map((value) => ({
          value,
          label: unitLabel(value),
          hint: t(`common:unitSystem.options.${value}.hint`),
        }))}
      />
      <OptionSheet<Language>
        open={picker === 'language'}
        onClose={() => setPicker(null)}
        title={t('app:settings.preferences.language')}
        value={language}
        onChange={setLanguage}
        options={LANGUAGES.map(({ value }) => ({
          value,
          label: t(`common:language.${value}`),
        }))}
      />
      <OptionSheet<ThemeMode>
        open={picker === 'theme'}
        onClose={() => setPicker(null)}
        title={t('member:profile.appearance')}
        value={mode}
        onChange={(next) => {
          setMode(next); // applied at once; the server follows
          saveTheme.mutate(next);
        }}
        options={THEMES.map((value) => ({
          value,
          label: themeLabel(value),
          hint:
            value === 'SYSTEM'
              ? t('app:settings.preferences.systemHint')
              : undefined,
        }))}
      />
      <ConfirmDialog
        open={confirmLogout}
        onClose={() => setConfirmLogout(false)}
        title={t('app:profile.logoutTitle')}
        description={t('app:profile.logoutDescription')}
        confirmLabel={t('member:nav.logout')}
        onConfirm={() => {
          setConfirmLogout(false);
          void logout();
        }}
      />
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  root: { flex: 1, backgroundColor: t.colors.background },
  content: { gap: 22, paddingTop: 16 },
}));
