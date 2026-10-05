import type { TFunction } from 'i18next';
import type { RecordKind } from '@shared/types/api.types';

/**
 * Personal records, as the app says them. The backend decides what is a record
 * (src/workouts/personal-records.ts); this is how each kind and its value read.
 * Values arrive in kilograms, metres, seconds and seconds per kilometre.
 */

export const recordLabel = (t: TFunction, kind: RecordKind) =>
  t(`workouts:records.kinds.${kind}`);

const trim = (n: number, digits = 1) =>
  Number.isInteger(n) ? String(n) : n.toFixed(digits).replace(/\.0+$/, '');

export const formatKg = (kg: number) => `${trim(kg)} kg`;

export const formatDistance = (m: number) =>
  m >= 1000 ? `${trim(m / 1000, 2)} km` : `${trim(m, 0)} m`;

export const formatDuration = (seconds: number) => {
  const total = Math.round(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
};

/** Seconds per km as "4:35 /km". */
export const formatPace = (secondsPerKm: number) =>
  `${formatDuration(secondsPerKm)} /km`;

/** Which unit a record kind's value is in. */
const KIND_UNIT: Record<
  RecordKind,
  'kg' | 'reps' | 'rpe' | 'm' | 's' | 'pace'
> = {
  MAX_WEIGHT: 'kg',
  BEST_E1RM: 'kg',
  BEST_SET_VOLUME: 'kg',
  BEST_SESSION_VOLUME: 'kg',
  REPS_AT_WEIGHT: 'reps',
  EFFORT_AT_LOAD: 'rpe',
  MAX_REPS: 'reps',
  MAX_DURATION: 's',
  MAX_DISTANCE: 'm',
  BEST_SESSION_DISTANCE: 'm',
  DISTANCE_AT_TIME: 'm',
  TIME_AT_DISTANCE: 's',
  BEST_PACE: 'pace',
};

export function formatRecordValue(
  t: TFunction,
  kind: RecordKind,
  value: number,
) {
  switch (KIND_UNIT[kind]) {
    case 'kg':
      return formatKg(value);
    case 'reps':
      return t('workouts:records.reps', { count: value });
    case 'rpe':
      return `RPE ${trim(value)}`;
    case 'm':
      return formatDistance(value);
    case 's':
      return formatDuration(value);
    case 'pace':
      return formatPace(value);
  }
}

/** The load, time or distance a keyed record was set at — "a 100 kg". */
export function formatRecordAt(
  t: TFunction,
  kind: RecordKind,
  at: number | undefined,
) {
  if (at === undefined) return null;
  switch (kind) {
    case 'REPS_AT_WEIGHT':
    case 'EFFORT_AT_LOAD':
      return t('workouts:records.atLoad', { load: formatKg(at) });
    case 'DISTANCE_AT_TIME':
      return t('workouts:records.inTime', { time: formatDuration(at) });
    case 'TIME_AT_DISTANCE':
      return t('workouts:records.overDistance', {
        distance: formatDistance(at),
      });
    default:
      return null;
  }
}

/** Kinds where a lower number is the better one (backend LOWER_IS_BETTER). */
export const lowerIsBetter = (kind: RecordKind) =>
  kind === 'EFFORT_AT_LOAD' ||
  kind === 'TIME_AT_DISTANCE' ||
  kind === 'BEST_PACE';

/**
 * How much a record beat the previous best, signed the way it reads: "+5 kg",
 * "+2 reps.", "−0:05 /km", "−1 RPE". Null when there was nothing before.
 */
export function formatRecordGain(
  t: TFunction,
  kind: RecordKind,
  value: number,
  previous: number | null,
) {
  if (previous === null) return null;
  const diff = Math.abs(value - previous);
  const sign = lowerIsBetter(kind) ? '−' : '+';
  if (KIND_UNIT[kind] === 'rpe') return `${sign}${trim(diff)} RPE`;
  return `${sign}${formatRecordValue(t, kind, diff)}`;
}
