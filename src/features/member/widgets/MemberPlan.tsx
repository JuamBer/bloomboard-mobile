import { useRouter } from 'expo-router';
import { Check, Crown, Sparkles } from 'lucide-react-native';
import type { TFunction } from 'i18next';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { formatEuros } from '@shared/lib/format';
import { radius } from '@shared/theme/theme';
import { makeStyles, useTheme } from '@shared/theme/ThemeProvider';
import type {
  MemberLimitKey,
  MemberLimits,
  MemberPlan,
} from '@shared/types/api.types';
import { Button } from '@shared/ui/Button';
import { Badge, ProgressBar, Section } from '@shared/ui/controls';
import { Sheet } from '@shared/ui/Sheet';
import { Text } from '@shared/ui/Text';
import { useMemberPlan } from '../hooks';

const LIMIT_ORDER: MemberLimitKey[] = ['routines', 'workouts', 'exercises'];

/** The profile's plan section: the plan, what is used of each limit, and Pro. */
export function MemberPlanCard() {
  const { t } = useTranslation(['member']);
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
            label={t(`member:limits.label.${key}`)}
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

const describeLimit = (
  t: TFunction,
  key: MemberLimitKey,
  limits: MemberLimits,
) =>
  limits[key] === null
    ? t(`member:limits.unlimited.${key}`)
    : t(`member:limits.upTo.${key}`, { count: limits[key] as number });

/**
 * Pro, as it is offered today: what it unlocks and its price, with the button
 * saying it is coming — members cannot pay yet (the business chose to show it
 * rather than hide it). Store rules: when it can be bought, on iOS it has to
 * be an in-app purchase (docs/ENVIRONMENTS.md).
 */
function ProOffer({ plan }: { plan: MemberPlan }) {
  const { t, i18n } = useTranslation(['member']);
  const styles = useStyles();
  const theme = useTheme();
  const { upgrade } = plan;
  return (
    <View style={styles.pro}>
      <View style={styles.proHead}>
        <Crown size={17} color={theme.colors.accentInk} />
        <Text variant="bodySmall" weight="bold" accent style={styles.flex}>
          {upgrade.name}
        </Text>
        <Text variant="bodySmall" weight="bold" style={styles.tabular}>
          {t('member:plan.perMonth', {
            price: formatEuros(upgrade.monthlyCents, i18n.language),
          })}
        </Text>
      </View>
      {LIMIT_ORDER.map((key) => (
        <View key={key} style={styles.proLine}>
          <Check size={15} color={theme.colors.accentInk} strokeWidth={2.5} />
          <Text variant="caption" muted={0.7}>
            {describeLimit(t, key, upgrade.limits)}
          </Text>
        </View>
      ))}
      <Button
        icon={Sparkles}
        disabled={!upgrade.available}
        label={
          upgrade.available
            ? t('member:plan.upgrade', { plan: upgrade.name })
            : t('member:plan.comingSoon')
        }
        fullWidth
      />
    </View>
  );
}

/**
 * What a member sees on trying to create past their plan: which limit, and
 * what Pro would give them. Opened by useLimitGuard before the request.
 */
export function UpgradeSheet({
  limit,
  onClose,
}: {
  limit: MemberLimitKey | null;
  onClose: () => void;
}) {
  const { t } = useTranslation(['member', 'common']);
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
              router.navigate('/profile');
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
            noun: t(`member:limits.noun.${limit}`, { count: max }),
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
  proLine: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  flex: { flex: 1 },
}));
