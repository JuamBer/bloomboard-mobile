import type {
  EditorBlock,
  EditorSet,
  MetricValue,
  SetMetrics,
  UnitSystem,
} from '@shared/types/api.types';
import { convertSetMetrics } from './unit-system';

/**
 * A workout's set holds two maps: what was logged (`metrics`, exact) and the
 * plan's target (`targetMetrics`, any mode). Where only one value fits — the
 * TV, the board's card, a Work/Rest clock — it shows what was logged, and the
 * plan for any metric nothing was logged in yet. The server times a run by the
 * same rule (backend workout-tree.ts → effectiveMetrics).
 */

const hasValue = (v: MetricValue | null | undefined) =>
  !!v &&
  [v.value, v.min, v.max].some(
    (x) => x !== null && x !== undefined && x !== '',
  );

export function effectiveMetrics(set: {
  metrics: SetMetrics;
  targetMetrics?: SetMetrics | null;
}): SetMetrics {
  const merged: SetMetrics = { ...(set.targetMetrics ?? {}) };
  for (const [key, value] of Object.entries(set.metrics ?? {})) {
    if (hasValue(value) || !(key in merged)) merged[key] = value;
  }
  return merged;
}

const displaySet = <S extends EditorSet>(set: S): S => ({
  ...set,
  metrics: effectiveMetrics(set),
  subSets: set.subSets?.map(displaySet),
});

/** A copy of the workout with every set's `metrics` as it should read. */
export function displayWorkout<W extends { blocks?: EditorBlock[] | null }>(
  workout: W,
): W;
export function displayWorkout<W extends { blocks?: EditorBlock[] | null }>(
  workout: W | null | undefined,
): W | null;
export function displayWorkout<W extends { blocks?: EditorBlock[] | null }>(
  workout: W | null | undefined,
): W | null {
  if (!workout) return null;
  return {
    ...workout,
    blocks: (workout.blocks ?? []).map((block) => ({
      ...block,
      exercises: block.exercises.map((entry) => ({
        ...entry,
        sets: entry.sets.map(displaySet),
      })),
    })),
  };
}

const setInUnits = <S extends EditorSet>(set: S, system: UnitSystem): S => ({
  ...set,
  metrics: convertSetMetrics(set.metrics, system),
  ...(set.targetMetrics
    ? { targetMetrics: convertSetMetrics(set.targetMetrics, system) }
    : {}),
  ...(set.subSets
    ? { subSets: set.subSets.map((sub) => setInUnits(sub, system)) }
    : {}),
});

/**
 * A copy of the workout with every value read in `system` (kg or lb, km or
 * mi), for the views that only show it: the wall, the Work/Rest player.
 * Editors convert on their own, keeping what was stored (see SetsEditor).
 */
export function workoutInUnits<W extends { blocks?: EditorBlock[] | null }>(
  workout: W,
  system: UnitSystem,
): W;
export function workoutInUnits<W extends { blocks?: EditorBlock[] | null }>(
  workout: W | null | undefined,
  system: UnitSystem,
): W | null;
export function workoutInUnits<W extends { blocks?: EditorBlock[] | null }>(
  workout: W | null | undefined,
  system: UnitSystem,
): W | null {
  if (!workout) return null;
  return {
    ...workout,
    blocks: (workout.blocks ?? []).map((block) => ({
      ...block,
      exercises: block.exercises.map((entry) => ({
        ...entry,
        sets: entry.sets.map((set) => setInUnits(set, system)),
      })),
    })),
  };
}
