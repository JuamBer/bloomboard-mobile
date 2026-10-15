import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowRight,
  Dumbbell,
  Flag,
  ListChecks,
  Timer,
  Trophy,
} from 'lucide-react-native';
import { useState, type ReactNode } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useUnitSystem } from '@features/units/useUnitSystem';
import { workoutQueryKey } from '@features/editor/lib/editor-source';
import { flattenExercises, progressSummary } from '@shared/lib/sessionProgress';
import { radius } from '@shared/theme/theme';
import { makeStyles, useTheme } from '@shared/theme/ThemeProvider';
import type { RecordDetail, Workout } from '@shared/types/api.types';
import { Button } from '@shared/ui/Button';
import { Sheet } from '@shared/ui/Sheet';
import { Text } from '@shared/ui/Text';
import { workoutQuery } from '../hooks';
import { useFinishFlow } from '../lib/finish-flow';
import { formatKg } from '../lib/records';
import { workoutTotals } from '../lib/totals';
import { EditWorkoutSheet } from './EditWorkoutSheet';
import { RecordList } from './RecordList';

/** Each exercise's records, in workout order. */
function recordsByExercise(workout: Workout) {
  const out: { id: string; name: string; records: RecordDetail[] }[] = [];
  for (const block of workout.blocks ?? []) {
    for (const entry of block.exercises) {
      const records = [
        ...entry.sets.flatMap((set) => set.recordDetails ?? []),
        ...(entry.recordDetails ?? []),
      ];
      if (records.length)
        out.push({
          id: entry.id,
          name: entry.customName || entry.exercise.name,
          records,
        });
    }
  }
  return out;
}

/**
 * The two steps after Finish, one after the other: what the workout added up
 * to, then a word on how it went (notes, and the name and times if they need
 * fixing). Either step closed by any means moves on; the wrap-up can be
 * skipped. Mounted once by the member layout: finishing a session's workout
 * ends the session screen, and the flow carries on over wherever the member
 * lands.
 */
export function WorkoutFinishFlow() {
  const workoutId = useFinishFlow((s) => s.workoutId);
  return workoutId ? (
    <FinishSteps key={workoutId} workoutId={workoutId} />
  ) : null;
}

function FinishSteps({ workoutId }: { workoutId: string }) {
  const close = useFinishFlow((s) => s.close);
  const queryClient = useQueryClient();
  const [step, setStep] = useState<'summary' | 'wrapUp'>('summary');
  // Already cached: the screen that finished it wrote the result there.
  const { data: workout } = useQuery(workoutQuery(queryClient, workoutId));
  if (!workout) return null;
  return (
    <>
      <WorkoutSummarySheet
        open={step === 'summary'}
        workout={workout}
        onContinue={() => setStep('wrapUp')}
      />
      <EditWorkoutSheet
        open={step === 'wrapUp'}
        workout={workout}
        wrapUp
        onClose={close}
        onSaved={(updated) => {
          queryClient.setQueryData(workoutQueryKey(workoutId), updated);
          void queryClient.invalidateQueries({ queryKey: ['me', 'workouts'] });
          close();
        }}
      />
    </>
  );
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  const styles = useStyles();
  return (
    <View style={styles.stat}>
      <View style={styles.statHead}>
        {icon}
        <Text variant="micro" muted={0.45} uppercase>
          {label}
        </Text>
      </View>
      <Text variant="heading" style={styles.tabular}>
        {value}
      </Text>
    </View>
  );
}

/**
 * What a member sees the moment they finish: how long it took, what got
 * done, the kilos moved and every personal record it set — the records only
 * when there are some.
 */
function WorkoutSummarySheet({
  open,
  workout,
  onContinue,
}: {
  open: boolean;
  workout: Workout;
  onContinue: () => void;
}) {
  const { t } = useTranslation(['workouts']);
  const styles = useStyles();
  const theme = useTheme();
  const { done, total } = progressSummary(flattenExercises(workout));
  const { sets, volume } = workoutTotals(workout);
  const unitSystem = useUnitSystem();
  const records = recordsByExercise(workout);
  const recordCount = records.reduce((n, e) => n + e.records.length, 0);
  const minutes = workout.finishedAt
    ? Math.max(
        0,
        Math.round(
          (Date.parse(workout.finishedAt) - Date.parse(workout.startedAt)) /
            60_000,
        ),
      )
    : 0;
  const icon = (Icon: typeof Timer) => (
    <Icon size={13} color={theme.text(0.45)} />
  );
  return (
    <Sheet
      open={open}
      onClose={onContinue}
      full
      footer={
        <Button
          label={t('workouts:summary.continue')}
          iconRight={ArrowRight}
          flex
          size="lg"
          onPress={onContinue}
        />
      }
    >
      <View style={styles.hero}>
        <View style={styles.flag}>
          <Flag size={26} color={theme.colors.accentInk} />
        </View>
        <Text variant="title" center>
          {t('workouts:summary.title')}
        </Text>
        <Text variant="bodySmall" muted={0.5} center>
          {workout.name}
        </Text>
      </View>
      <View style={styles.grid}>
        <Stat
          icon={icon(Timer)}
          label={t('workouts:summary.duration')}
          value={t('workouts:summary.minutes', { count: minutes })}
        />
        <Stat
          icon={icon(ListChecks)}
          label={t('workouts:summary.exercises')}
          value={`${done}/${total}`}
        />
        <Stat
          icon={icon(Dumbbell)}
          label={t('workouts:summary.sets')}
          value={String(sets)}
        />
        <Stat
          icon={icon(Dumbbell)}
          label={t('workouts:summary.volume')}
          value={formatKg(volume, unitSystem)}
        />
      </View>
      {recordCount > 0 && (
        <View style={styles.records}>
          <View style={styles.statHead}>
            <Trophy size={16} color={theme.colors.warning} />
            <Text variant="subheading">
              {t('workouts:summary.records', { count: recordCount })}
            </Text>
          </View>
          {records.map((exercise) => (
            <View key={exercise.id} style={styles.recordGroup}>
              <Text variant="caption" weight="bold" muted={0.6}>
                {exercise.name}
              </Text>
              <RecordList records={exercise.records} />
            </View>
          ))}
        </View>
      )}
    </Sheet>
  );
}

const useStyles = makeStyles((t) => ({
  hero: { alignItems: 'center', gap: 8, paddingVertical: 8 },
  flag: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: t.ink(0.1),
    alignItems: 'center',
    justifyContent: 'center',
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  stat: {
    width: '48%',
    flexGrow: 1,
    gap: 4,
    padding: 12,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: t.line(0.08),
    backgroundColor: t.colors.surface,
  },
  statHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  tabular: { fontVariant: ['tabular-nums'] },
  records: { gap: 12 },
  recordGroup: { gap: 6 },
}));
