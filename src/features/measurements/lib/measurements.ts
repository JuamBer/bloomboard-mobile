import type {
  BodyMeasurement,
  MeasurementField,
  UnitSystem,
} from '@shared/types/api.types';
import {
  lengthIn,
  lengthToCm,
  lengthUnitLabel,
  weightIn,
  weightToKg,
  weightUnitLabel,
} from '@shared/lib/unit-system';

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

// Values are stored in kilograms and centimetres (the columns say so) and
// read in the person's unit system: lb and in for imperial. Body fat is a
// percentage either way.

export const unitOf = (
  field: MeasurementField,
  system: UnitSystem = 'METRIC',
) =>
  field === 'weightKg'
    ? weightUnitLabel(system)
    : field === 'bodyFatPercent'
      ? '%'
      : lengthUnitLabel(system);

/** A stored value (kg, cm, %) as a number in the system's unit. */
export const measurementIn = (
  field: MeasurementField,
  stored: number,
  system: UnitSystem = 'METRIC',
) =>
  field === 'weightKg'
    ? weightIn(stored, system)
    : field === 'bodyFatPercent'
      ? stored
      : lengthIn(stored, system);

/** A number in the system's unit, back to what is stored (kg, cm, %). */
export const measurementToStored = (
  field: MeasurementField,
  n: number,
  system: UnitSystem = 'METRIC',
) =>
  field === 'weightKg'
    ? weightToKg(n, system)
    : field === 'bodyFatPercent'
      ? n
      : lengthToCm(n, system);

const locale = (language: string) => (language === 'en' ? 'en-GB' : 'es-ES');

/** A number already in the system's unit: "181,9 lb", "18,2 %", "16,1 in" */
export function formatMeasurementValue(
  field: MeasurementField,
  n: number,
  language: string,
  system: UnitSystem = 'METRIC',
) {
  const text = n.toLocaleString(locale(language), {
    maximumFractionDigits: system === 'IMPERIAL' ? 1 : 2,
  });
  return `${text} ${unitOf(field, system)}`;
}

/** A stored value, read in the system: "82,5 kg" or "181,9 lb" */
export function formatMeasurement(
  field: MeasurementField,
  value: number,
  language: string,
  system: UnitSystem = 'METRIC',
) {
  return formatMeasurementValue(
    field,
    measurementIn(field, value, system),
    language,
    system,
  );
}

/** A stored change: "+1,2 kg" / "−0,5 cm" / "±0 cm" (or lb, in) */
export function formatChange(
  field: MeasurementField,
  change: number,
  language: string,
  system: UnitSystem = 'METRIC',
) {
  const shown = measurementIn(field, change, system);
  const rounded = Math.round(shown * 100) / 100;
  if (rounded === 0) return `±0 ${unitOf(field, system)}`;
  const sign = rounded > 0 ? '+' : '−';
  return `${sign}${formatMeasurementValue(field, Math.abs(rounded), language, system)}`;
}

/** A stored value as the text of its form field, in the system's unit. */
export const toMeasurementText = (
  field: MeasurementField,
  stored: number | null | undefined,
  system: UnitSystem = 'METRIC',
) =>
  stored == null
    ? ''
    : String(Math.round(measurementIn(field, stored, system) * 100) / 100);

const pad = (n: number) => String(n).padStart(2, '0');

/** 'HH:mm' of a local date — what a time picker shows. */
export const toTime = (date: Date) =>
  `${pad(date.getHours())}:${pad(date.getMinutes())}`;

/** The same day at a given 'HH:mm', local time. */
export const withTime = (date: Date, time: string) => {
  const [h, m] = time.split(':').map(Number);
  const out = new Date(date);
  out.setHours(h || 0, m || 0, 0, 0);
  return out;
};

/** "10 oct 2026" — the day of an instant, in the viewer's time zone. */
export const formatDate = (iso: string, language: string) =>
  new Date(iso).toLocaleDateString(locale(language), {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

/** "10 oct 2026, 8:30" — when a measurement was taken. */
export const formatDateTime = (iso: string, language: string) =>
  new Date(iso).toLocaleString(locale(language), {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

export interface LatestValue {
  field: MeasurementField;
  value: number;
  measuredAt: string;
  /** The value before it, when there is one — what "change" is measured from. */
  previous: { value: number; measuredAt: string } | null;
}

/**
 * The most recent value of every measurement the person has ever taken, and
 * the one before it. A field is read on its own: weight from yesterday and
 * waist from a month ago both count as "latest".
 */
export function latestValues(rows: BodyMeasurement[]): LatestValue[] {
  const ordered = [...rows].sort(
    (a, b) =>
      b.measuredAt.localeCompare(a.measuredAt) ||
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
      measuredAt: latest.measuredAt,
      previous: previous
        ? { value: previous[field]!, measuredAt: previous.measuredAt }
        : null,
    });
  }
  return out;
}

/**
 * A typed value: empty is "not measured", a comma works as the decimal mark,
 * and anything that is not a number in range is invalid. Typed in the
 * system's unit, it comes back as stored (kg, cm), kept precise enough that
 * reading it back shows exactly what was typed.
 */
export function parseMeasurementInput(
  field: MeasurementField,
  raw: string,
  system: UnitSystem = 'METRIC',
): { ok: true; value: number | null } | { ok: false } {
  const text = raw.trim().replace(',', '.');
  if (!text) return { ok: true, value: null };
  const n = Number(text);
  const stored = measurementToStored(field, n, system);
  if (!Number.isFinite(n) || n <= 0 || stored > MEASUREMENT_MAX[field]) {
    return { ok: false };
  }
  const decimals = system === 'IMPERIAL' ? 4 : 2;
  const factor = 10 ** decimals;
  return { ok: true, value: Math.round(stored * factor) / factor };
}
