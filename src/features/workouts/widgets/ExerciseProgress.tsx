import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Trophy } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { workoutsService } from '@shared/api/services/workouts.service';
import { radius } from '@shared/theme/theme';
import { makeStyles, useTheme } from '@shared/theme/ThemeProvider';
import type {
  BestValue,
  ExerciseBests,
  ExerciseSessionPoint,
} from '@shared/types/api.types';
import { Chip } from '@shared/ui/controls';
import { CenteredSpinner } from '@shared/ui/Spinner';
import { Text } from '@shared/ui/Text';
import { formatWorkoutDate } from '../lib/dates';
import {
  formatDistance,
  formatDuration,
  formatKg,
  formatPace,
  formatRecordAt,
  formatRecordValue,
  recordLabel,
} from '../lib/records';
import { ProgressChart, type ProgressMeasure } from './ProgressChart';

const trim = (n: number) =>
  Number.isInteger(n) ? String(n) : n.toFixed(1).replace(/\.0$/, '');

/**
 * One exercise, for the member: their standing bests, a chart of how it has
 * moved, the heaviest load at each rep count, and every record they set —
 * narrowed to one plan when asked ("how is my bench going in Push A").
 * Each best and record opens the workout it came from.
 */
export function ExerciseProgress({ exerciseId }: { exerciseId: string }) {
  const { t, i18n } = useTranslation(['workouts']);
  const styles = useStyles();
  const theme = useTheme();
  const router = useRouter();
  const [templateId, setTemplateId] = useState<string>();
  const openWorkout = (workoutId: string) =>
    router.push({ pathname: '/workouts/[workoutId]', params: { workoutId } });

  const { data, isLoading } = useQuery({
    queryKey: ['me', 'progress', 'exercise', exerciseId, templateId ?? null],
    queryFn: () => workoutsService.mine.exercise(exerciseId, templateId),
    placeholderData: (prev) => prev,
  });
  // The plans it was done in, from the unfiltered history, for the filter.
  const { data: all } = useQuery({
    queryKey: ['me', 'progress', 'exercise', exerciseId, null],
    queryFn: () => workoutsService.mine.exercise(exerciseId),
    enabled: !!templateId,
  });

  if (isLoading || !data) return <CenteredSpinner />;
  if (data.workouts === 0) {
    return (
      <Text variant="bodySmall" muted={0.45} center style={styles.never}>
        {t('workouts:progress.neverDone')}
      </Text>
    );
  }

  const source = templateId ? (all ?? data) : data;
  const plans = new Map<string, string>();
  for (const p of source.series)
    if (p.workoutTemplate)
      plans.set(p.workoutTemplate.id, p.workoutTemplate.name);
  const date = (iso: string) => formatWorkoutDate(iso, i18n.language);

  const measures: ProgressMeasure<ExerciseSessionPoint>[] = [
    {
      key: 'maxWeight',
      label: t('workouts:measures.maxWeight'),
      value: (p) => p.maxWeight,
      format: formatKg,
    },
    {
      key: 'bestE1rm',
      label: t('workouts:measures.bestE1rm'),
      value: (p) => p.bestE1rm,
      format: formatKg,
    },
    {
      key: 'bestSetVolume',
      label: t('workouts:measures.bestSetVolume'),
      value: (p) => p.bestSetVolume,
      format: formatKg,
    },
    {
      key: 'volume',
      label: t('workouts:measures.volume'),
      value: (p) => p.volume,
      format: formatKg,
    },
    {
      key: 'totalReps',
      label: t('workouts:measures.totalReps'),
      value: (p) => p.totalReps,
      format: trim,
    },
    {
      key: 'maxReps',
      label: t('workouts:measures.maxReps'),
      value: (p) => p.maxReps,
      format: trim,
    },
    {
      key: 'totalDistance',
      label: t('workouts:measures.totalDistance'),
      value: (p) => p.totalDistance,
      format: formatDistance,
    },
    {
      key: 'totalDuration',
      label: t('workouts:measures.totalDuration'),
      value: (p) => p.totalDuration,
      format: formatDuration,
    },
    {
      key: 'bestPace',
      label: t('workouts:measures.bestPace'),
      value: (p) => p.bestPace,
      format: formatPace,
      lowerIsBetter: true,
    },
    {
      key: 'avgRpe',
      label: t('workouts:measures.avgRpe'),
      value: (p) => p.avgRpe,
      format: trim,
    },
  ];

  const best = (
    key: keyof Omit<ExerciseBests, 'repMaxes'>,
    format: (v: number) => string,
    detail?: (b: BestValue) => string | null,
  ) => {
    const b = data.bests[key];
    if (!b) return null;
    return (
      <Pressable
        key={key}
        onPress={() => openWorkout(b.workoutId)}
        accessibilityRole="button"
        style={({ pressed }) => [
          styles.best,
          pressed && { borderColor: theme.line(0.2) },
        ]}
      >
        <Text variant="micro" muted={0.45} uppercase numberOfLines={1}>
          {t(`workouts:bests.${key}`)}
        </Text>
        <Text variant="heading" style={styles.tabular}>
          {format(b.value)}
        </Text>
        <Text variant="caption" muted={0.45} numberOfLines={2}>
          {[detail?.(b), date(b.performedAt)].filter(Boolean).join(' · ')}
        </Text>
      </Pressable>
    );
  };
  const withReps = (b: BestValue) =>
    b.reps ? t('workouts:records.reps', { count: b.reps }) : null;
  const weightTimesReps = (b: BestValue) =>
    b.weightKg != null && b.reps ? `${trim(b.weightKg)} kg × ${b.reps}` : null;
  const bests = [
    best('maxWeight', formatKg, withReps),
    best('bestE1rm', formatKg, weightTimesReps),
    best('bestSetVolume', formatKg, weightTimesReps),
    best('bestSessionVolume', formatKg),
    best('maxReps', trim),
    best('maxDuration', formatDuration),
    best('maxDistance', formatDistance),
    best('bestSessionDistance', formatDistance),
    best('bestPace', formatPace),
  ].filter(Boolean);

  return (
    <View style={styles.wrap}>
      <Text variant="caption" muted={0.5}>
        {t('workouts:progress.timesDone', { count: data.workouts })}
      </Text>

      {plans.size > 0 && (
        <View style={styles.chips}>
          {[
            { id: undefined, name: t('workouts:progress.allWorkouts') },
            ...[...plans].map(([id, name]) => ({ id, name })),
          ].map((plan) => (
            <Chip
              key={plan.id ?? 'all'}
              label={plan.name}
              selected={plan.id === templateId}
              onPress={() => setTemplateId(plan.id)}
            />
          ))}
        </View>
      )}

      {bests.length > 0 && (
        <View style={styles.section}>
          <Text variant="subheading">{t('workouts:progress.bests')}</Text>
          <View style={styles.grid}>{bests}</View>
        </View>
      )}

      <View style={[styles.section, styles.card]}>
        <Text variant="subheading">{t('workouts:progress.evolution')}</Text>
        <ProgressChart
          points={data.series}
          measures={measures}
          pointLabel={(p) => p.workoutName}
        />
      </View>

      {data.bests.repMaxes.length > 0 && (
        <View style={styles.section}>
          <Text variant="subheading">{t('workouts:progress.repMaxes')}</Text>
          <Text variant="caption" muted={0.45}>
            {t('workouts:progress.repMaxesHint')}
          </Text>
          <View style={styles.list}>
            {data.bests.repMaxes.map((r, i) => (
              <View key={r.reps} style={[styles.listRow, i > 0 && styles.rule]}>
                <Text
                  variant="bodySmall"
                  weight="bold"
                  muted={0.7}
                  style={styles.flex}
                >
                  {t('workouts:progress.repMax', { count: r.reps })}
                </Text>
                <Text variant="bodySmall" weight="bold" style={styles.tabular}>
                  {formatKg(r.weightKg)}
                </Text>
                <Text variant="caption" muted={0.45} style={styles.repDate}>
                  {date(r.performedAt)}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      <View style={styles.section}>
        <Text variant="subheading">{t('workouts:progress.recordHistory')}</Text>
        {data.records.length ? (
          <View style={styles.list}>
            {data.records.map((r, i) => (
              <Pressable
                key={i}
                onPress={() => openWorkout(r.workoutId)}
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.listRow,
                  i > 0 && styles.rule,
                  pressed && { backgroundColor: theme.fill(0.04) },
                ]}
              >
                <Trophy size={15} color={theme.colors.warning} />
                <View style={styles.flex}>
                  <Text variant="bodySmall" weight="bold">
                    {recordLabel(t, r.kind)}
                    {formatRecordAt(t, r.kind, r.at)
                      ? ` ${formatRecordAt(t, r.kind, r.at)}`
                      : ''}
                  </Text>
                  <Text variant="caption" muted={0.45} numberOfLines={1}>
                    {date(r.performedAt)}
                    {r.workoutName ? ` · ${r.workoutName}` : ''}
                  </Text>
                </View>
                <View style={styles.right}>
                  <Text
                    variant="bodySmall"
                    weight="bold"
                    style={styles.tabular}
                  >
                    {formatRecordValue(t, r.kind, r.value)}
                  </Text>
                  {r.previous != null && (
                    <Text variant="caption" muted={0.4} style={styles.tabular}>
                      {t('workouts:records.before', {
                        value: formatRecordValue(t, r.kind, r.previous),
                      })}
                    </Text>
                  )}
                </View>
              </Pressable>
            ))}
          </View>
        ) : (
          <Text variant="bodySmall" muted={0.4} style={styles.emptyBox}>
            {t('workouts:progress.noRecords')}
          </Text>
        )}
      </View>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  wrap: { gap: 18 },
  never: {
    padding: 20,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: t.line(0.1),
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  section: { gap: 8 },
  card: {
    padding: 14,
    borderRadius: radius['2xl'],
    borderWidth: 1,
    borderColor: t.line(0.08),
    backgroundColor: t.colors.surface,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  best: {
    width: '47%',
    flexGrow: 1,
    gap: 2,
    padding: 12,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: t.line(0.08),
    backgroundColor: t.colors.surface,
  },
  tabular: { fontVariant: ['tabular-nums'] },
  list: {
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: t.line(0.08),
    backgroundColor: t.colors.surface,
    overflow: 'hidden',
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  rule: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: t.line(0.06),
  },
  flex: { flex: 1, minWidth: 0 },
  right: { alignItems: 'flex-end' },
  repDate: { width: 90, textAlign: 'right' },
  emptyBox: {
    padding: 14,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: t.line(0.1),
  },
}));
