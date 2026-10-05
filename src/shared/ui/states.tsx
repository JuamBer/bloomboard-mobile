import { RotateCcw, type LucideIcon } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { useTranslation } from 'react-i18next';
import { radius } from '@shared/theme/theme';
import { makeStyles, useTheme } from '@shared/theme/ThemeProvider';
import { Button } from './Button';
import { CenteredSpinner } from './Spinner';
import { Text } from './Text';

/**
 * Loading and error states, so every screen reads its query the same way —
 * the web's MemberQueryState, plus a retry: on a phone a failed load is
 * usually a dropped connection, and the member is not going to reload.
 */
export function QueryState({
  isLoading,
  isError,
  onRetry,
}: {
  isLoading: boolean;
  isError: boolean;
  onRetry?: () => void;
}) {
  const styles = useStyles();
  const theme = useTheme();
  const { t } = useTranslation(['member', 'app']);
  if (isLoading) return <CenteredSpinner />;
  if (isError) {
    return (
      <View style={styles.error}>
        <Text variant="bodySmall" color={theme.colors.dangerInk}>
          {t('member:errors.load')}
        </Text>
        {onRetry && (
          <Button
            label={t('app:actions.retry')}
            icon={RotateCcw}
            variant="secondary"
            size="sm"
            onPress={onRetry}
          />
        )}
      </View>
    );
  }
  return null;
}

/** Nothing to show yet — a dashed box with a word on what would go here. */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  style,
}: {
  icon?: LucideIcon;
  title?: string;
  description: string;
  action?: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const styles = useStyles();
  const theme = useTheme();
  return (
    <View style={[styles.empty, style]}>
      {Icon && <Icon size={28} color={theme.text(0.2)} strokeWidth={1.75} />}
      {title ? (
        <Text variant="body" weight="bold" center>
          {title}
        </Text>
      ) : null}
      <Text variant="bodySmall" muted={0.45} center style={styles.emptyText}>
        {description}
      </Text>
      {action}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  error: {
    gap: 10,
    alignItems: 'flex-start',
    padding: 14,
    borderRadius: radius['2xl'],
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.2)',
    backgroundColor: 'rgba(239,68,68,0.1)',
  },
  empty: {
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 36,
    borderRadius: radius['2xl'],
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: t.line(0.15),
  },
  emptyText: { maxWidth: 360 },
}));
