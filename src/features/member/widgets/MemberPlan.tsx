import { useRouter } from 'expo-router';
import { Crown } from 'lucide-react-native';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { radius } from '@shared/theme/theme';
import { makeStyles, useTheme } from '@shared/theme/ThemeProvider';
import type { MemberLimitKey, MemberPlan } from '@shared/types/api.types';
import { Button } from '@shared/ui/Button';
import { Badge, ProgressBar, Section } from '@shared/ui/controls';
import { Sheet } from '@shared/ui/Sheet';
import { Text } from '@shared/ui/Text';
import { useMemberPlan } from '../hooks';

// Folders (the API's routines) are free and unlimited in the app: never shown
// as a limit (app 2.6.0). What the app calls a routine is the API's
// `workouts` (a workout template), so the words are the app's (`app:limits`).
const LIMIT_ORDER: MemberLimitKey[] = ['workouts', 'exercises'];

/** The profile's plan section: the plan, what is used of each limit, and Pro. */
export function MemberPlanCard() {
  const { t } = useTranslation(['member', 'app']);
  const styles = useStyles();
  const { data } = useMemberPlan();
  if (!data) return null;
  return (
    <Section
      title={t('member:plan.title')}
      subtitle={t('member:plan.subtitle')}
      aside={<Badge label={data.plan.name} tone="accent" />}
    >
      <View style={styles.rows}>
        {LIMIT_ORDER.map((key) => (
          <UsageRow
            key={key}
            label={t(`app:limits.label.${key}`)}
            used={data.usage[key]}
            max={data.limits[key]}
          />
        ))}
      </View>
      {/* Already on Pro (given by Bloom Board): nothing to offer. */}
      {data.plan.key !== data.upgrade.key && <ProOffer plan={data} />}
    </Section>
  );
}

function UsageRow({
  label,
  used,
  max,
}: {
  label: string;
  used: number;
  max: number | null;
}) {
  const { t } = useTranslation(['member']);
  const styles = useStyles();
  const theme = useTheme();
  const full = max !== null && used >= max;
  return (
    <View style={styles.usage}>
      <View style={styles.usageHead}>
        <Text variant="bodySmall" muted={0.7}>
          {label}
        </Text>
        <Text
          variant="bodySmall"
          weight="bold"
          color={full ? theme.colors.warningInk : theme.text(0.6)}
          style={styles.tabular}
        >
          {max === null
            ? t('member:plan.unlimited', { used })
            : t('member:plan.usage', { used, max })}
        </Text>
      </View>
      {max !== null && (
        <View style={styles.bar}>
          <ProgressBar
            value={max ? used / max : 0}
            color={full ? theme.colors.warning : theme.colors.accent}
          />
        </View>
      )}
    </View>
  );
}

/**
 * Pro, as it stands: in development — no price and no list of what it
 * unlocks until the business decides them (2026-10-15: the 4,99 € shown
 * until then was never set). Store rules: when it can be bought, on iOS it
 * has to be an in-app purchase (docs/ENVIRONMENTS.md).
 */
function ProOffer({ plan }: { plan: MemberPlan }) {
  const { t } = useTranslation(['member']);
  const styles = useStyles();
  const theme = useTheme();
  return (
    <View style={styles.pro}>
      <View style={styles.proHead}>
        <Crown size={17} color={theme.colors.accentInk} />
        <Text variant="bodySmall" weight="bold" accent style={styles.flex}>
          {plan.upgrade.name}
        </Text>
        <Badge label={t('member:plan.inDevelopment')} tone="accent" />
      </View>
      <Text variant="caption" muted={0.7}>
        {t('member:plan.developing')}
      </Text>
    </View>
  );
}

/**
 * What a member sees on trying to create past their plan: which limit, and
 * that Pro is on its way. Opened by useLimitGuard before the request.
 */
export function UpgradeSheet({
  limit,
  onClose,
}: {
  limit: MemberLimitKey | null;
  onClose: () => void;
}) {
  const { t } = useTranslation(['member', 'common', 'app']);
  const router = useRouter();
  const { data } = useMemberPlan();
  const max = (limit && data?.limits[limit]) ?? 0;
  return (
    <Sheet
      open={!!limit}
      onClose={onClose}
      title={t('member:limits.reachedTitle')}
      footer={
        <>
          <Button
            label={t('member:plan.see')}
            variant="ghost"
            flex
            onPress={() => {
              onClose();
              router.push('/settings/subscription');
            }}
          />
          <Button
            label={t('common:close')}
            variant="secondary"
            flex
            onPress={onClose}
          />
        </>
      }
    >
      {limit && (
        <Text variant="bodySmall" muted={0.7}>
          {t('member:limits.reached', {
            max,
            noun: t(`app:limits.noun.${limit}`, { count: max }),
          })}
        </Text>
      )}
      {data && <ProOffer plan={data} />}
    </Sheet>
  );
}

const useStyles = makeStyles((t) => ({
  rows: { gap: 14 },
  usage: { gap: 6 },
  usageHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bar: { flexDirection: 'row' },
  tabular: { fontVariant: ['tabular-nums'] },
  pro: {
    gap: 10,
    padding: 14,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: t.ink(0.2),
    backgroundColor: t.ink(0.1),
  },
  proHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  flex: { flex: 1 },
}));
