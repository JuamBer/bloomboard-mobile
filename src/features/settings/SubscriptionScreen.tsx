import { Gift } from 'lucide-react-native';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useMemberPlan } from '@features/member/hooks';
import { MemberPlanCard } from '@features/member/widgets/MemberPlan';
import { makeStyles, useTheme } from '@shared/theme/ThemeProvider';
import { Screen, StackHeader } from '@shared/ui/layout';
import { QueryState } from '@shared/ui/states';
import { Text } from '@shared/ui/Text';

/**
 * Ajustes › Suscripción: the member's plan, each of its limits beside what
 * they have used, and Pro. Members cannot pay yet (specs/member-app.md,
 * decision 16): Pro reads "coming soon" and there is nothing to cancel. When
 * it can be bought, upgrading and cancelling go here — through the stores'
 * billing on a phone.
 */
export function SubscriptionScreen() {
  const { t } = useTranslation(['app']);
  const styles = useStyles();
  const theme = useTheme();
  const { data, isLoading, isError, refetch } = useMemberPlan();
  return (
    <View style={styles.root}>
      <StackHeader title={t('app:settings.account.subscription')} />
      <Screen safeTop={false} onRefresh={refetch}>
        <QueryState isLoading={isLoading} isError={isError} onRetry={refetch} />
        {data?.comped && (
          <View style={styles.note}>
            <Gift size={16} color={theme.colors.accentInk} />
            <Text variant="bodySmall" muted={0.7} style={styles.flex}>
              {t('app:subscription.comped')}
            </Text>
          </View>
        )}
        <MemberPlanCard />
        {data && !data.comped && (
          <Text variant="caption" muted={0.45}>
            {data.upgrade.available
              ? t('app:subscription.manage')
              : t('app:subscription.comingSoon')}
          </Text>
        )}
      </Screen>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  root: { flex: 1, backgroundColor: t.colors.background },
  flex: { flex: 1, minWidth: 0 },
  note: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 16,
    backgroundColor: t.ink(0.08),
  },
}));
