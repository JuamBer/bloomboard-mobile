import type {
  BodyMeasurement,
  MeasurementField,
} from '@shared/types/api.types';

/**
 * The measurements, grouped the way a tape-measure session goes: composition
 * first, then top to bottom. Every list, form and chart reads this order.
 */
export const MEASUREMENT_GROUPS: {
  key: 'body' | 'upper' | 'core' | 'lower';
  fields: MeasurementField[];
}[] = [
  { key: 'body', fields: ['weightKg', 'bodyFatPercent'] },
  {
    key: 'upper',
    fields: [
      'neckCm',
      'shouldersCm',
      'chestCm',
      'leftBicepCm',
      'rightBicepCm',
      'leftForearmCm',
      'rightForearmCm',
    ],
  },
  { key: 'core', fields: ['abdomenCm', 'waistCm', 'hipsCm'] },
  {
    key: 'lower',
    fields: ['leftThighCm', 'rightThighCm', 'leftCalfCm', 'rightCalfCm'],
  },
];

export const MEASUREMENT_FIELDS: MeasurementField[] =
  MEASUREMENT_GROUPS.flatMap((g) => g.fields);

/** The upper bound the API accepts for each value. */
export const MEASUREMENT_MAX: Record<MeasurementField, number> = {
  weightKg: 400,
  bodyFatPercent: 75,
  neckCm: 100,
  shouldersCm: 250,
  chestCm: 250,
  leftBicepCm: 100,
  rightBicepCm: 100,
  leftForearmCm: 100,
  rightForearmCm: 100,
  abdomenCm: 250,
  waistCm: 250,
  hipsCm: 250,
  leftThighCm: 150,
  rightThighCm: 150,
  leftCalfCm: 100,
  rightCalfCm: 100,
};

export const unitOf = (field: MeasurementField) =>
  field === 'weightKg' ? 'kg' : field === 'bodyFatPercent' ? '%' : 'cm';

const locale = (language: string) => (language === 'en' ? 'en-GB' : 'es-ES');

/** "82,5 kg", "18,2 %", "41 cm" */
export function formatMeasurement(
  field: MeasurementField,
  value: number,
  language: string,
) {
  const n = value.toLocaleString(locale(language), {
    maximumFractionDigits: 2,
  });
  return `${n} ${unitOf(field)}`;
}

/** "+1,2 kg" / "−0,5 cm" / "±0 cm" */
export function formatChange(
  field: MeasurementField,
  change: number,
  language: string,
) {
  const rounded = Math.round(change * 100) / 100;
  if (rounded === 0) return `±0 ${unitOf(field)}`;
  const sign = rounded > 0 ? '+' : '−';
  return `${sign}${formatMeasurement(field, Math.abs(rounded), language)}`;
}

/** A day as a local date, so 'YYYY-MM-DD' never shows as the day before. */
export const dayToDate = (day: string) => new Date(`${day}T12:00:00`);

/** 'YYYY-MM-DD' of a local date. */
export const dateToDay = (date: Date) => {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

export const formatDay = (day: string, language: string) =>
  dayToDate(day).toLocaleDateString(locale(language), {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

export interface LatestValue {
  field: MeasurementField;
  value: number;
  measuredOn: string;
  /** The value before it, when there is one — what "change" is measured from. */
  previous: { value: number; measuredOn: string } | null;
}

/**
 * The most recent value of every measurement the person has ever taken, and
 * the one before it. A field is read on its own: weight from yesterday and
 * waist from a month ago both count as "latest".
 */
export function latestValues(rows: BodyMeasurement[]): LatestValue[] {
  const ordered = [...rows].sort(
    (a, b) =>
      b.measuredOn.localeCompare(a.measuredOn) ||
      b.createdAt.localeCompare(a.createdAt),
  );
  const out: LatestValue[] = [];
  for (const field of MEASUREMENT_FIELDS) {
    const withValue = ordered.filter((r) => r[field] != null);
    const [latest, previous] = withValue;
    if (!latest) continue;
    out.push({
      field,
      value: latest[field]!,
      measuredOn: latest.measuredOn,
      previous: previous
        ? { value: previous[field]!, measuredOn: previous.measuredOn }
        : null,
    });
  }
  return out;
}

/**
 * A typed value: empty is "not measured", a comma works as the decimal mark,
 * and anything that is not a number in range is invalid.
 */
export function parseMeasurementInput(
  field: MeasurementField,
  raw: string,
): { ok: true; value: number | null } | { ok: false } {
  const text = raw.trim().replace(',', '.');
  if (!text) return { ok: true, value: null };
  const n = Number(text);
  if (!Number.isFinite(n) || n <= 0 || n > MEASUREMENT_MAX[field]) {
    return { ok: false };
  }
  return { ok: true, value: Math.round(n * 100) / 100 };
}
