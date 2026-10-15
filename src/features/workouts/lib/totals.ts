import { canonicalUnit } from '@features/editor/lib/logged-values';
import type { Workout } from '@shared/types/api.types';

/** Warm-ups and approach sets prepare the work: not volume (as the server). */
const NOT_WORK = new Set(['WARMUP', 'APPROACH']);
const KG_PER: Record<string, number> = { KILOGRAMS: 1, POUNDS: 0.45359237 };
const number = (v: unknown) => {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : NaN;
  return Number.isFinite(n) ? n : null;
};

/** Sets ticked and kilos moved — the same sums the history list shows (the
 *  finish summary and the share page read them). */
export function workoutTotals(workout: Pick<Workout, 'blocks'>) {
  let sets = 0;
  let volume = 0;
  for (const block of workout.blocks ?? []) {
    for (const entry of block.exercises) {
      for (const set of entry.sets) {
        if (!set.completedAt) continue;
        sets++;
        if (NOT_WORK.has(set.setType)) continue;
        const weight = set.metrics.WEIGHT;
        const kg = number(weight?.value);
        const reps = number(set.metrics.REPS?.value);
        const factor = KG_PER[canonicalUnit(weight?.unit) ?? 'KILOGRAMS'];
        if (kg != null && reps != null && factor) volume += kg * factor * reps;
      }
    }
  }
  return { sets, volume: Math.round(volume * 10) / 10 };
}
