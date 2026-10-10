import type {
  MetricValue,
  PreviousSet,
  SetMetrics,
} from '@shared/types/api.types';
import type { EditableWorkoutSet } from '../types/workout-set.types';
import { canonicalUnit, formatTarget, targetToLogged } from './logged-values';

/** The set of the last time a row's hints come from: its own, or the last
 *  one for a row beyond what was done then. */
const previousSetFor = (
  previousSets: PreviousSet[] | undefined,
  index: number,
) =>
  previousSets?.length
    ? previousSets[Math.min(index, previousSets.length - 1)]
    : undefined;

/** One row's hint from the last time (see previousSetFor). */
export const previousPlaceholder = (
  previousSets: PreviousSet[] | undefined,
  index: number,
  key: string,
) => formatTarget(previousSetFor(previousSets, index)?.metrics[key]);

const isEmpty = (value: MetricValue | undefined) =>
  value?.value === null || value?.value === undefined || value.value === '';

/**
 * A set ticked as done keeps what its empty fields were showing: each takes
 * its placeholder as a logged value — the plan's (a range's low end, as "copy
 * the plan" does), else what was done in that row the last time. Whatever was
 * typed stays, a field with no hint stays empty, and a compound set's sub-sets
 * take their own plan values.
 *
 * Only a set's tick does this. Marking a whole exercise done (the trainer's
 * tick on the board) fills nothing: it says "they did it", not what they did.
 */
export function withPlaceholderValues(
  set: EditableWorkoutSet,
  keys: string[],
  {
    previousSets,
    index,
    unitOf,
  }: {
    /** The exercise's last time, and this row's place in it. */
    previousSets?: PreviousSet[];
    index: number;
    /** The column's unit, for a value whose hint says none. */
    unitOf: (key: string) => string | undefined;
  },
): EditableWorkoutSet {
  const fill = (row: EditableWorkoutSet, previous?: PreviousSet) => {
    let metrics: SetMetrics | null = null;
    for (const key of keys) {
      const current = row.metrics[key];
      if (!isEmpty(current)) continue;
      const target = row.targetMetrics?.[key];
      const source =
        targetToLogged(target) !== null ? target : previous?.metrics[key];
      const value = targetToLogged(source);
      if (value === null) continue;
      const unit =
        canonicalUnit(source?.unit) ?? current?.unit ?? unitOf(key) ?? null;
      metrics ??= { ...row.metrics };
      metrics[key] = { value, ...(unit ? { unit } : {}) };
    }
    return metrics ? { ...row, metrics } : row;
  };

  const filled = fill(set, previousSetFor(previousSets, index));
  return set.subSets
    ? { ...filled, subSets: set.subSets.map((sub) => fill(sub)) }
    : filled;
}
