import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Building2, Laptop, Mail, MapPin } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { MEMBER_PROFILE_KEY, useMemberProfile } from '@features/member/hooks';
import { meService } from '@shared/api/services/me.service';
import { fromDateOnly, toDateOnly } from '@shared/lib/format';
import { makeStyles, useTheme } from '@shared/theme/ThemeProvider';
import type { MemberProfile } from '@shared/types/api.types';
import { Button } from '@shared/ui/Button';
import { Card, Divider, Section } from '@shared/ui/controls';
import { Screen, StackHeader } from '@shared/ui/layout';
import { DateField, SelectField } from '@shared/ui/pickers';
import { QueryState } from '@shared/ui/states';
import { Text } from '@shared/ui/Text';
import { TextField } from '@shared/ui/TextField';
import { toast } from '@shared/ui/toast/toast.store';

// The values staff pick from (EditClientModal): male, female, unspecified.
const GENDERS = ['M', 'F', 'N'] as const;

/**
 * Ajustes › Perfil: the account's email (as it is: it is how they sign in),
 * the details they own — nickname, phone, birthday, gender — and where they
 * train. The nickname is also what the profile shows instead of their name.
 */
export function ProfileSettingsScreen() {
  const { t } = useTranslation(['app', 'member']);
  const styles = useStyles();
  const theme = useTheme();
  const { data: profile, isLoading, isError, refetch } = useMemberProfile();
  const hasCompanies = (profile?.affiliations.length ?? 0) > 0;

  return (
    <View style={styles.root}>
      <StackHeader title={t('app:settings.account.profile')} />
      <Screen safeTop={false} onRefresh={refetch}>
        <QueryState isLoading={isLoading} isError={isError} onRetry={refetch} />
        {profile && (
          <>
            <Card style={styles.email}>
              <Mail size={16} color={theme.text(0.35)} />
              <View style={styles.flex}>
                <Text variant="caption" muted={0.5}>
                  {t('member:profile.email')}
                </Text>
                <Text variant="bodySmall" weight="semibold" numberOfLines={1}>
                  {profile.email || '—'}
                </Text>
              </View>
            </Card>

            <Section
              title={t('member:profile.details')}
              subtitle={
                hasCompanies ? t('member:profile.detailsNote') : undefined
              }
            >
              <PersonalDetailsForm profile={profile} />
            </Section>

            {hasCompanies && (
              <Section title={t('member:profile.companies')}>
                {profile.affiliations.map((a, i) => (
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
                ))}
              </Section>
            )}
          </>
        )}
      </Screen>
    </View>
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

// The details the member owns: one form, one Save, sending only what changed.
function PersonalDetailsForm({ profile }: { profile: MemberProfile }) {
  const { t } = useTranslation(['app', 'member', 'profile']);
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
      <TextField
        label={t('member:profile.alias.title')}
        hint={t('app:settingsProfile.aliasHint')}
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

const useStyles = makeStyles((t) => ({
  root: { flex: 1, backgroundColor: t.colors.background },
  flex: { flex: 1, minWidth: 0, gap: 2 },
  email: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  rule: { marginVertical: 10 },
  company: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  centers: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: 12,
    rowGap: 2,
    marginTop: 2,
  },
  form: { gap: 16 },
  save: { alignSelf: 'flex-end' },
}));
