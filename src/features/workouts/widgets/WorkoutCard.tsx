import { Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { radius } from '@shared/theme/theme';
import { makeStyles, useTheme } from '@shared/theme/ThemeProvider';
import type { WorkoutSummary } from '@shared/types/api.types';
import { Text } from '@shared/ui/Text';
import { formatMinutes, formatTime, formatWorkoutDate } from '../lib/dates';

/**
 * One workout of the member's history — the profile's list and a calendar
 * day: when, its name and description, and three numbers: how long it took,
 * the exercises done and the sets done. A tap opens it.
 */
export function WorkoutCard({
  workout: w,
  onPress,
}: {
  workout: WorkoutSummary;
  onPress: () => void;
}) {
  const { t, i18n } = useTranslation(['app']);
  const styles = useStyles();
  const theme = useTheme();
  const live = !w.finishedAt;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.card,
        pressed && { borderColor: theme.line(0.2) },
      ]}
    >
      <Text variant="micro" muted={0.45} uppercase>
        {formatWorkoutDate(w.startedAt, i18n.language)} ·{' '}
        {formatTime(w.startedAt, i18n.language)}
      </Text>
      <Text variant="heading" numberOfLines={2}>
        {w.name}
      </Text>
      {w.description ? (
        <Text variant="bodySmall" muted={0.55} numberOfLines={2}>
          {w.description}
        </Text>
      ) : null}
      <View style={styles.stats}>
        <Stat
          label={t('app:workoutCard.duration')}
          value={
            live
              ? t('app:workoutCard.inProgress')
              : w.durationMinutes != null
                ? formatMinutes(w.durationMinutes)
                : '—'
          }
          accent={live}
        />
        <Stat
          label={t('app:workoutCard.exercises')}
          value={String(w.exercisesDone)}
        />
        <Stat label={t('app:workoutCard.sets')} value={String(w.setsDone)} />
      </View>
    </Pressable>
  );
}

function Stat({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  const styles = useStyles();
  return (
    <View style={styles.stat}>
      <Text variant="caption" muted={0.45} numberOfLines={1}>
        {label}
      </Text>
      <Text
        variant="bodySmall"
        weight="bold"
        accent={accent}
        numberOfLines={1}
        style={styles.tabular}
      >
        {value}
      </Text>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  card: {
    gap: 4,
    padding: 16,
    borderRadius: radius['2xl'],
    borderWidth: 1,
    borderColor: t.line(0.08),
    backgroundColor: t.colors.surface,
  },
  stats: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: t.line(0.06),
  },
  stat: { flex: 1, minWidth: 0, gap: 1 },
  tabular: { fontVariant: ['tabular-nums'] },
}));
