import type {
  RecordDetail,
  UnitSystem,
  Workout,
  WorkoutExerciseSet,
} from '@shared/types/api.types';
import { formatSetMetrics } from '@features/editor/lib/metric-format';
import { workoutInUnits } from '@shared/lib/workout-display';
import { workoutTotals } from '../lib/totals';

/**
 * What the share page draws and writes about a workout (app 2.6.0): the
 * numbers on the images and the text to paste into a chat or an AI. Pure, in
 * the member's units, so both read the same.
 */
export interface ShareExercise {
  name: string;
  /** Each set done, as "80 kg · 8 Reps". */
  sets: string[];
  records: number;
}

export interface ShareRecord {
  exercise: string;
  detail: RecordDetail;
}

export interface ShareSummary {
  name: string;
  startedAt: string;
  /** Null while under way (the page is for finished ones). */
  minutes: number | null;
  /** Kilos moved (working sets), as the finish summary counts them. */
  volumeKg: number;
  sets: number;
  /** Exercises with at least one set done. */
  exercises: number;
  records: ShareRecord[];
  list: ShareExercise[];
}

const bySetOrder = (a: { order: number }, b: { order: number }) =>
  a.order - b.order;

/** The sets worth telling: the ones ticked — or, in a workout logged
 *  without ticks (an import), the ones with something written. */
const doneSets = (sets: WorkoutExerciseSet[]) => {
  const ticked = sets.filter((s) => s.completedAt);
  if (ticked.length) return ticked;
  return sets.filter((s) =>
    Object.values(s.metrics ?? {}).some(
      (v) => v?.value !== null && v?.value !== undefined && v?.value !== '',
    ),
  );
};

export function shareSummary(
  workout: Workout,
  system: UnitSystem,
  unitAcronym: (key: string) => string,
): ShareSummary {
  const shown = workoutInUnits(workout, system);
  const { sets, volume } = workoutTotals(workout);
  const list: ShareExercise[] = [];
  const records: ShareRecord[] = [];
  for (const block of [...shown.blocks].sort((a, b) => a.index - b.index)) {
    for (const entry of [...block.exercises].sort(bySetOrder)) {
      const name = entry.customName?.trim() || entry.exercise.name;
      const done = doneSets([...entry.sets].sort(bySetOrder));
      const own = [
        ...done.flatMap((s) => s.recordDetails ?? []),
        ...(entry.recordDetails ?? []),
      ];
      for (const detail of own) records.push({ exercise: name, detail });
      if (!done.length) continue;
      list.push({
        name,
        sets: done.map((s) =>
          formatSetMetrics(
            s.metrics,
            entry.metrics,
            entry.compositeMetrics ?? [],
            unitAcronym,
            entry.resolvedMetricOrder,
          ).join(' · '),
        ),
        records: own.length,
      });
    }
  }
  return {
    name: workout.name,
    startedAt: workout.startedAt,
    minutes: workout.finishedAt
      ? Math.max(
          0,
          Math.round(
            (Date.parse(workout.finishedAt) - Date.parse(workout.startedAt)) /
              60_000,
          ),
        )
      : null,
    volumeKg: volume,
    sets,
    exercises: list.length,
    records,
    list,
  };
}

/** The workout as plain text: a chat message, or a question for an AI. */
export function shareText(
  summary: ShareSummary,
  words: {
    /** "mié, 15 oct 2026 · 1 h 05 min" */
    when: string;
    /** "Volumen 5.240 kg · 18 series" */
    totals: string;
    /** "Récords: …", one line per record. */
    records: string[];
    /** The closing line, with the handle. */
    footer: string;
  },
): string {
  const lines = [summary.name, words.when, words.totals];
  for (const exercise of summary.list) {
    lines.push('', exercise.name);
    exercise.sets.forEach((set, i) => lines.push(`${i + 1}. ${set || '—'}`));
  }
  if (words.records.length) lines.push('', ...words.records);
  lines.push('', words.footer);
  return lines.join('\n');
}
