import Constants from 'expo-constants';
import { Image } from 'expo-image';
import { Globe, Mail, ShieldCheck } from 'lucide-react-native';
import { Linking, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { radius } from '@shared/theme/theme';
import { makeStyles } from '@shared/theme/ThemeProvider';
import { BrandLogo } from '@shared/ui/BrandLogo';
import { Screen, StackHeader } from '@shared/ui/layout';
import { Text } from '@shared/ui/Text';
import { BLOOM_LINKS, privacyUrl } from './links';
import { SettingsGroup, SettingsRow } from './widgets/SettingsList';
import {
  FacebookIcon,
  InstagramIcon,
  LinkedinIcon,
} from './widgets/SocialIcons';

const ICON = require('@assets/images/icon.png');

const open = (url: string) => void Linking.openURL(url);

/** Ajustes › Sobre Bloom Board: who makes the app, where to find them, the
 *  privacy policy, and which version this is. */
export function AboutScreen() {
  const { t, i18n } = useTranslation(['app']);
  const styles = useStyles();
  const version = Constants.expoConfig?.version ?? '—';
  const build =
    Constants.expoConfig?.android?.versionCode ??
    Constants.expoConfig?.ios?.buildNumber;

  return (
    <View style={styles.root}>
      <StackHeader title={t('app:settings.help.about')} />
      <Screen safeTop={false} contentStyle={styles.content}>
        <View style={styles.hero}>
          <Image
            source={ICON}
            style={styles.icon}
            contentFit="cover"
            accessibilityIgnoresInvertColors
          />
          <BrandLogo width={150} />
          <Text variant="bodySmall" muted={0.55} center>
            {t('app:about.tagline')}
          </Text>
        </View>

        <SettingsGroup>
          <SettingsRow
            icon={Globe}
            title={t('app:about.web')}
            value="bloomboard.pro"
            onPress={() => open(BLOOM_LINKS.web)}
          />
          <SettingsRow
            icon={Mail}
            title={t('app:about.email')}
            subtitle={BLOOM_LINKS.email}
            onPress={() => open(`mailto:${BLOOM_LINKS.email}`)}
          />
          <SettingsRow
            icon={ShieldCheck}
            title={t('app:about.privacy')}
            onPress={() => open(privacyUrl(i18n.language))}
          />
        </SettingsGroup>

        <SettingsGroup title={t('app:about.follow')}>
          <SettingsRow
            icon={InstagramIcon}
            title="Instagram"
            value="@bloomboard.pro"
            onPress={() => open(BLOOM_LINKS.instagram)}
          />
          <SettingsRow
            icon={FacebookIcon}
            title="Facebook"
            onPress={() => open(BLOOM_LINKS.facebook)}
          />
          <SettingsRow
            icon={LinkedinIcon}
            title="LinkedIn"
            onPress={() => open(BLOOM_LINKS.linkedin)}
          />
        </SettingsGroup>

        <Text variant="caption" muted={0.4} center>
          {build
            ? t('app:about.versionBuild', { version, build })
            : t('app:about.version', { version })}
        </Text>
      </Screen>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  root: { flex: 1, backgroundColor: t.colors.background },
  content: { gap: 22, paddingTop: 20 },
  hero: { alignItems: 'center', gap: 12 },
  icon: {
    width: 84,
    height: 84,
    borderRadius: radius['2xl'],
    borderWidth: 1,
    borderColor: t.line(0.08),
  },
}));
