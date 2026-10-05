import type {
  MetricValue,
  EditorSet,
  EditorBlock,
  EditorExercise,
} from '@shared/types/api.types';

// How long a block actually takes, derived from the TIME (work) and REST values
// already stored in each set's metrics JSON. Nothing in the schema records a
// duration, so this is the only source.
//
// Callers should only surface these totals for a WORK_REST block. There every
// set is guaranteed a TIME and a REST (see applyWorkRestDefaults), so the sum is
// the real length of the run — the same numbers the TV's clock counts down. On a
// NORMAL block the sets carry a REST but rarely a TIME, so the sum would
// advertise the rest time as the block's length.

const SECONDS_PER_UNIT: Record<string, number> = {
  SECONDS: 1,
  MINUTES: 60,
  HOURS: 3600,
};

/**
 * Seconds a single metric value represents, honouring the same mode semantics
 * the TV renders (see widgets/tv/metric-format.ts):
 *  - EXACT        → the value
 *  - RANGE        → the upper bound, because a block must be budgeted for its
 *                   longest run, not its shortest
 *  - LESS_THAN    → the bound (a ceiling is a usable budget)
 *  - GREATER_THAN → the bound (the floor is all we know)
 *
 * Non-numeric or empty values contribute nothing rather than NaN.
 */
export function metricSeconds(value: MetricValue | undefined | null): number {
  if (!value) return 0;

  const raw =
    value.mode === 'RANGE' ? (value.max ?? value.min) : (value.value ?? null);
  const n = typeof raw === 'string' ? Number(raw) : raw;
  if (n == null || !Number.isFinite(n)) return 0;

  return n * (SECONDS_PER_UNIT[value.unit ?? 'SECONDS'] ?? 1);
}

/** Work + rest for one set, including any sub-sets (drop / rest-pause / cluster
 *  sets are performed inside their parent's slot, so their time counts too). */
export function setSeconds(set: EditorSet): number {
  const own =
    metricSeconds(set.metrics?.TIME) + metricSeconds(set.metrics?.REST);
  const subs = (set.subSets ?? []).reduce((acc, s) => acc + setSeconds(s), 0);
  return own + subs;
}

/** Total seconds for one exercise entry, summed across its top-level sets. */
export function exerciseSeconds(entry: EditorExercise): number {
  return (entry.sets ?? []).reduce((acc, set) => acc + setSeconds(set), 0);
}

/**
 * Total seconds for a block.
 *
 * A super-set is *not* a multiplier here: the flexible model stores one row per
 * performed slot (see lib/superset-sequence.ts), so summing every entry's sets
 * already counts each slot exactly once.
 */
export function blockSeconds(block: EditorBlock): number {
  return (block.exercises ?? []).reduce(
    (acc, entry) => acc + exerciseSeconds(entry),
    0,
  );
}

/** True when a timed block still has a set with no work time — the editor flags
 *  these rather than blocking the save (autosave must never fail mid-edit). */
export function hasIncompleteWorkRest(block: EditorBlock): boolean {
  return (block.exercises ?? []).some((entry) =>
    (entry.sets ?? []).some(
      (set) =>
        metricSeconds(set.metrics?.TIME) <= 0 ||
        metricSeconds(set.metrics?.REST) <= 0,
    ),
  );
}

/**
 * Compact duration for a dense editor row: "45s", "4:30", "1:02:00".
 * Minutes are zero-padded only when they follow an hour, so a four-and-a-half
 * minute block reads "4:30" rather than "04:30".
 */
export function formatDuration(totalSeconds: number): string {
  const total = Math.max(0, Math.round(totalSeconds));
  if (total < 60) return `${total}s`;

  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const pad = (n: number) => String(n).padStart(2, '0');

  return hours > 0
    ? `${hours}:${pad(minutes)}:${pad(seconds)}`
    : `${minutes}:${pad(seconds)}`;
}
