import { useMutation, useQueryClient } from '@tanstack/react-query';
import Constants from 'expo-constants';
import {
  Building2,
  Laptop,
  LogOut,
  Mail,
  MapPin,
  Monitor,
  Moon,
  Sun,
} from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { CONFIGURATION_QUERY_KEY } from '@features/auth/AppEffects';
import {
  MEMBER_PROFILE_KEY,
  useMemberLogout,
  useMemberProfile,
} from '@features/member/hooks';
import { MemberPlanCard } from '@features/member/widgets/MemberPlan';
import {
  LANGUAGES,
  useLanguageStore,
  type Language,
} from '@/i18n/language.store';
import { configurationsService } from '@shared/api/services/configurations.service';
import { meService } from '@shared/api/services/me.service';
import { fromDateOnly, toDateOnly } from '@shared/lib/format';
import { makeStyles, useTheme } from '@shared/theme/ThemeProvider';
import { useThemeStore, type ThemeMode } from '@shared/theme/theme.store';
import type { MemberProfile } from '@shared/types/api.types';
import { Button } from '@shared/ui/Button';
import { ConfirmDialog } from '@shared/ui/ConfirmDialog';
import { Card, Divider, Section, Segmented } from '@shared/ui/controls';
import { PageHeader, Screen } from '@shared/ui/layout';
import { Avatar } from '@shared/ui/misc';
import { DateField, SelectField } from '@shared/ui/pickers';
import { QueryState } from '@shared/ui/states';
import { Text } from '@shared/ui/Text';
import { TextField } from '@shared/ui/TextField';
import { toast } from '@shared/ui/toast/toast.store';

// The values staff pick from (EditClientModal): male, female, unspecified.
const GENDERS = ['M', 'F', 'N'] as const;

/**
 * The member's own profile: their plan and what they have used of it, then
 * who they are and where they train, their appearance and language, and —
 * the app has no other place for it — signing out.
 *
 * The account is theirs, so they keep the details a business holds about them
 * — nickname (what their centers' TVs show), phone, birthday, gender.
 * Someone who trains with no business has nobody those details are for, so
 * they aren't offered. Name and email stay as they are.
 */
export function ProfileScreen() {
  const { t } = useTranslation(['member', 'app']);
  const styles = useStyles();
  const theme = useTheme();
  const { data: profile, isLoading, isError, refetch } = useMemberProfile();
  const queryClient = useQueryClient();
  const logout = useMemberLogout();
  const [confirmLogout, setConfirmLogout] = useState(false);
  const hasCompanies = (profile?.affiliations.length ?? 0) > 0;

  return (
    <Screen
      onRefresh={() =>
        Promise.all([
          refetch(),
          queryClient.invalidateQueries({ queryKey: ['me', 'plan'] }),
        ])
      }
    >
      <PageHeader
        title={t('member:profile.title')}
        subtitle={t('member:profile.subtitle')}
      />
      <QueryState isLoading={isLoading} isError={isError} onRetry={refetch} />
      {profile && (
        <>
          <Card style={styles.identity}>
            <Avatar
              firstName={profile.firstName}
              lastName={profile.lastName}
              url={profile.avatarUrl}
            />
            <View style={styles.flex}>
              <Text variant="heading" numberOfLines={2}>
                {profile.firstName} {profile.lastName}
              </Text>
              {hasCompanies && profile.alias ? (
                <Text variant="bodySmall" muted={0.5} numberOfLines={1}>
                  “{profile.alias}”
                </Text>
              ) : null}
            </View>
          </Card>

          <MemberPlanCard />

          <Section title={t('member:profile.companies')}>
            {profile.affiliations.length === 0 ? (
              <Text variant="bodySmall" muted={0.5}>
                {t('member:profile.noCompanies')}
              </Text>
            ) : (
              profile.affiliations.map((a, i) => (
                <View key={a.company.id}>
                  {i > 0 && <Divider style={styles.rule} />}
                  <View style={styles.company}>
                    <Building2 size={16} color={theme.text(0.3)} />
                    <View style={styles.flex}>
                      <Text variant="bodySmall" weight="semibold">
                        {a.company.commercialName}
                      </Text>
                      <View style={styles.centers}>
                        {a.centers.length === 0 ? (
                          <Place
                            icon={Laptop}
                            label={t('member:profile.online')}
                          />
                        ) : (
                          a.centers.map((c) => (
                            <Place key={c.id} icon={MapPin} label={c.name} />
                          ))
                        )}
                      </View>
                    </View>
                  </View>
                </View>
              ))
            )}
          </Section>

          <Section
            title={t('member:profile.details')}
            subtitle={
              hasCompanies ? t('member:profile.detailsNote') : undefined
            }
          >
            <View style={styles.emailRow}>
              <Mail size={16} color={theme.text(0.3)} />
              <Text variant="bodySmall" muted={0.5} style={styles.emailLabel}>
                {t('member:profile.email')}
              </Text>
              <Text
                variant="bodySmall"
                weight="medium"
                numberOfLines={1}
                style={styles.flex}
              >
                {profile.email || '—'}
              </Text>
            </View>
            {hasCompanies && <PersonalDetailsForm profile={profile} />}
          </Section>

          <AppearanceSection />

          <Section title={t('member:profile.language')}>
            <LanguagePicker />
          </Section>

          <Button
            label={t('member:nav.logout')}
            icon={LogOut}
            variant="dangerSoft"
            size="lg"
            fullWidth
            onPress={() => setConfirmLogout(true)}
          />
          <Text variant="caption" muted={0.3} center>
            Bloom Board {Constants.expoConfig?.version ?? ''}
          </Text>
        </>
      )}
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
    </Screen>
  );
}

function Place({ icon: Icon, label }: { icon: typeof MapPin; label: string }) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <Icon size={12} color={theme.text(0.45)} />
      <Text variant="caption" muted={0.5}>
        {label}
      </Text>
    </View>
  );
}

// The details a business keeps about the member, which the member owns: one
// form, one Save, sending only what changed.
function PersonalDetailsForm({ profile }: { profile: MemberProfile }) {
  const { t } = useTranslation(['member', 'profile']);
  const styles = useStyles();
  const queryClient = useQueryClient();
  const [alias, setAlias] = useState(profile.alias ?? '');
  const [phone, setPhone] = useState(profile.phone ?? '');
  const [gender, setGender] = useState(profile.gender ?? '');
  const [birthday, setBirthday] = useState(fromDateOnly(profile.birthday));

  const original = profile.birthday?.slice(0, 10) ?? null;
  const picked = birthday ? toDateOnly(birthday) : null;
  const changes = {
    ...(alias.trim() !== (profile.alias ?? '') && {
      alias: alias.trim() || null,
    }),
    ...(phone.trim() !== (profile.phone ?? '') && {
      phone: phone.trim() || null,
    }),
    ...(gender !== (profile.gender ?? '') && { gender: gender || null }),
    ...(picked !== original && { birthday: picked }),
  };
  const dirty = Object.keys(changes).length > 0;

  const save = useMutation({
    mutationFn: () => meService.updateProfile(changes),
    onSuccess: (updated) => {
      queryClient.setQueryData(MEMBER_PROFILE_KEY, updated);
      toast.success(t('member:profile.saved'));
    },
    onError: () => toast.error(t('member:profile.error')),
  });

  return (
    <View style={styles.form}>
      <Divider />
      <TextField
        label={t('member:profile.alias.title')}
        hint={t('member:profile.alias.help')}
        value={alias}
        onChangeText={setAlias}
        maxLength={40}
        placeholder={t('member:profile.alias.placeholder')}
      />
      <TextField
        label={t('member:profile.phone')}
        value={phone}
        onChangeText={setPhone}
        maxLength={30}
        placeholder="+34 600 000 000"
        keyboardType="phone-pad"
        autoComplete="tel"
        textContentType="telephoneNumber"
      />
      <DateField
        label={t('member:profile.birthday')}
        value={birthday}
        onChange={setBirthday}
        placeholder={t('member:profile.birthdayPlaceholder')}
        maximumDate={new Date()}
        clearable
      />
      <SelectField
        label={t('member:profile.gender')}
        value={gender}
        onChange={setGender}
        options={GENDERS.map((value) => ({
          value,
          label: t(`profile:genders.${value}`),
        }))}
        placeholder={t('member:profile.genderPlaceholder')}
        clearable
      />
      <Button
        label={t('member:profile.save')}
        disabled={!dirty}
        loading={save.isPending}
        onPress={() => dirty && save.mutate()}
        style={styles.save}
      />
    </View>
  );
}

/** Light, dark or the device's — stored on the server, shared with the web. */
function AppearanceSection() {
  const { t } = useTranslation(['member', 'app']);
  const mode = useThemeStore((s) => s.mode);
  const setMode = useThemeStore((s) => s.setMode);
  const queryClient = useQueryClient();
  const save = useMutation({
    mutationFn: (theme: ThemeMode) => configurationsService.update({ theme }),
    onSuccess: (config) =>
      queryClient.setQueryData(CONFIGURATION_QUERY_KEY, config),
  });
  return (
    <Section title={t('member:profile.appearance')}>
      <Segmented<ThemeMode>
        value={mode}
        onChange={(next) => {
          setMode(next); // applied at once; the server follows
          save.mutate(next);
        }}
        options={[
          { value: 'SYSTEM', label: t('app:theme.system'), icon: Monitor },
          { value: 'LIGHT', label: t('app:theme.light'), icon: Sun },
          { value: 'DARK', label: t('app:theme.dark'), icon: Moon },
        ]}
      />
    </Section>
  );
}

function LanguagePicker() {
  const { t } = useTranslation(['common']);
  const language = useLanguageStore((s) => s.language);
  const setLanguage = useLanguageStore((s) => s.setLanguage);
  return (
    <Segmented<Language>
      value={language}
      onChange={setLanguage}
      options={LANGUAGES.map(({ value }) => ({
        value,
        label: t(`common:language.${value}`),
      }))}
    />
  );
}

const useStyles = makeStyles(() => ({
  identity: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  flex: { flex: 1, minWidth: 0 },
  rule: { marginVertical: 10 },
  company: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  centers: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: 12,
    rowGap: 2,
    marginTop: 2,
  },
  emailRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  emailLabel: { width: 64 },
  form: { gap: 16 },
  save: { alignSelf: 'flex-end' },
}));
