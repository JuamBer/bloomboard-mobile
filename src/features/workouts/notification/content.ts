import {
  isCompoundUnit,
  splitCompoundUnit,
} from '@features/editor/lib/compound-units';
import { canonicalUnit } from '@features/editor/lib/logged-values';
import { formatSetMetrics } from '@features/editor/lib/metric-format';
import { withPlaceholderValues } from '@features/editor/lib/workout-cells';
import {
  toEditableSet,
  toWorkoutSetPayload,
} from '@features/editor/types/workout-set.types';
import type { UpsertWorkoutExercisePayload } from '@shared/api/services/workouts.service';
import { flattenExercises } from '@shared/lib/sessionProgress';
import { convertSetMetrics } from '@shared/lib/unit-system';
import { effectiveMetrics } from '@shared/lib/workout-display';
import type {
  EditorExercise,
  EditorSet,
  SetMetrics,
  UnitSystem,
  Workout,
} from '@shared/types/api.types';

/**
 * What the "workout under way" notification is about: the exercise that is
 * up and its next set — the same "current" as the workout screen (the first
 * exercise not done or skipped, in training order), so the shade and the
 * screen never disagree. Pure: the background task runs it too, with no React.
 */
export interface WorkoutStep {
  blockId: string;
  entry: EditorExercise;
  /** 1-based, among the workout's exercises. */
  exerciseNumber: number;
  exerciseCount: number;
  /** The first set not ticked; null when the exercise has none left. */
  set: EditorSet | null;
  setNumber: number;
  setCount: number;
  /** A super-set's sets are saved as one sequence: no button for them. */
  inSuperSet: boolean;
}

const bySetOrder = (a: EditorSet, b: EditorSet) => a.order - b.order;

/** The step, or null once every exercise is done or skipped. */
export function currentStep(workout: Workout): WorkoutStep | null {
  const flat = flattenExercises(workout);
  const index = flat.findIndex((f) => f.status === 'PENDING');
  if (index < 0) return null;
  const entry = flat[index].exercise;
  const block = (workout.blocks ?? []).find((b) =>
    b.exercises.some((e) => e.id === entry.id),
  );
  const sets = [...entry.sets].sort(bySetOrder);
  const next = sets.findIndex((s) => !s.completedAt);
  return {
    blockId: block?.id ?? '',
    entry,
    exerciseNumber: index + 1,
    exerciseCount: flat.length,
    set: next >= 0 ? sets[next] : null,
    setNumber: next >= 0 ? next + 1 : sets.length,
    setCount: sets.length,
    inSuperSet: !!entry.superSetGroupId,
  };
}

// A notification is drawn with no catalog at hand (the background task has
// none): the acronyms the catalog gives these keys.
const UNIT_ACRONYMS: Record<string, string> = {
  KILOGRAMS: 'kg',
  POUNDS: 'lb',
  METERS: 'm',
  KILOMETERS: 'km',
  MILES: 'mi',
  SECONDS: 's',
  MINUTES: 'min',
  HOURS: 'h',
  KCAL: 'kcal',
  REVOLUTIONS: 'rev',
};

export const unitAcronym = (key: string): string => {
  if (!isCompoundUnit(key)) return UNIT_ACRONYMS[key] ?? key.toLowerCase();
  const { numerator, denominator } = splitCompoundUnit(key);
  return `${unitAcronym(numerator)}/${unitAcronym(denominator)}`;
};

/** What the set is about to be: what was logged, else the plan, else last
 *  time — the hints the set's fields show. */
function setValues(entry: EditorExercise, set: EditorSet): SetMetrics {
  const metrics = effectiveMetrics(set);
  const index = [...entry.sets].sort(bySetOrder).indexOf(set);
  const previous = entry.previousSets?.[index] ?? entry.previousSets?.at(-1);
  for (const [key, value] of Object.entries(previous?.metrics ?? {})) {
    if (metrics[key]?.value == null && metrics[key]?.min == null) {
      metrics[key] = value;
    }
  }
  return metrics;
}

export interface NotificationText {
  title: string;
  body: string;
  subtitle: string;
}

type Translate = (key: string, options?: Record<string, unknown>) => string;

/** The notification's words: the exercise, the set and its values in the
 *  member's units, and the workout it belongs to. */
export function notificationText(
  workout: Workout,
  step: WorkoutStep | null,
  t: Translate,
  unitSystem: UnitSystem,
): NotificationText {
  if (!step) {
    return {
      title: workout.name,
      body: t('app:workoutNotification.allDone'),
      subtitle: workout.name,
    };
  }
  const { entry, set } = step;
  const name = entry.customName || entry.exercise.name;
  const values = set
    ? formatSetMetrics(
        convertSetMetrics(setValues(entry, set), unitSystem),
        entry.metrics,
        entry.compositeMetrics ?? [],
        unitAcronym,
        entry.resolvedMetricOrder,
      ).join(' · ')
    : '';
  const where = set
    ? t('app:workoutNotification.set', {
        number: step.setNumber,
        count: step.setCount,
      })
    : t('app:workoutNotification.exercise', {
        number: step.exerciseNumber,
        count: step.exerciseCount,
      });
  return {
    title: name,
    body: values ? `${where} · ${values}` : where,
    subtitle: workout.name,
  };
}

/** Whether "Completar serie" applies: a set to tick, outside a super-set. */
export const canCompleteSet = (step: WorkoutStep | null) =>
  !!step?.set && !step.inSuperSet;

/**
 * The save that ticks one set the way the sets table does: its empty fields
 * take the values they hinted (the plan's, else last time's), then it is
 * marked done — PATCH /workouts/:id/blocks/:blockId/exercises/:entryId with
 * every set of the exercise, the others as they are. Null when the set is
 * gone or already done (the shade and the screen can both tick it).
 */
export function completeSetPayload(
  entry: EditorExercise,
  setId: string,
): UpsertWorkoutExercisePayload | null {
  const sets = [...entry.sets].sort(bySetOrder).map(toEditableSet);
  const index = sets.findIndex((s) => s.id === setId);
  if (index < 0 || sets[index].completed) return null;

  // A plan-only metric (tempo, rest…) logs nothing.
  const keys = [
    ...entry.metrics.filter((m) => !m.isPlanOnly).map((m) => m.key),
    ...(entry.compositeMetrics ?? []).map((m) => m.key),
  ];
  const unitOf = (key: string) => {
    for (const s of sets) {
      const unit = s.metrics[key]?.unit ?? s.targetMetrics?.[key]?.unit;
      if (unit) return canonicalUnit(unit) ?? undefined;
    }
    return entry.metrics.find((m) => m.key === key)?.defaultUnit ?? undefined;
  };
  const filled = withPlaceholderValues(sets[index], keys, {
    previousSets: entry.previousSets,
    index,
    unitOf,
  });
  sets[index] = {
    ...filled,
    completed: true,
    // A compound set is done as a whole.
    subSets: filled.subSets?.map((sub) => ({ ...sub, completed: true })),
  };

  return {
    exerciseId: entry.exerciseId,
    notes: entry.notes ?? '',
    customName: entry.customName ?? '',
    superSetGroupId: entry.superSetGroupId,
    metricKeys: entry.metrics.map((m) => m.key),
    compositeMetricKeys: (entry.compositeMetrics ?? []).map((m) => m.key),
    metricOrder: entry.metricOrder ?? [],
    sets: sets.map(toWorkoutSetPayload),
  };
}
