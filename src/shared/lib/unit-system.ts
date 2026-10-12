import type {
  CompositeMetric,
  Metric,
  MetricValue,
  SetMetrics,
  UnitSystem,
} from '@shared/types/api.types';

// A person's unit system (their Configuration) and showing values in it.
//
// Values are stored in the unit they were entered in; this is only how they
// read: kg ↔ lb and km ↔ mi, compound units part by part (km/h ↔ mi/h,
// min/km ↔ min/mi), and the body's cm ↔ in. Metres, seconds, kcal… read the
// same in both. Mirrors the backend's src/metrics/unit-system.ts.

const COMPOUND = '/';

/** Each convertible unit's size in its base (kilograms, metres). */
const SIZE: Record<string, number> = {
  KILOGRAMS: 1,
  POUNDS: 0.45359237,
  KILOMETERS: 1000,
  MILES: 1609.344,
};

/** Older plans stored acronyms ("kg") instead of keys. */
const ALIASES: Record<string, string> = {
  kg: 'KILOGRAMS',
  lb: 'POUNDS',
  km: 'KILOMETERS',
  mi: 'MILES',
};

/** In each system, the units of the other one and what they become. */
const COUNTERPART: Record<UnitSystem, Record<string, string>> = {
  METRIC: { POUNDS: 'KILOGRAMS', MILES: 'KILOMETERS' },
  IMPERIAL: { KILOGRAMS: 'POUNDS', KILOMETERS: 'MILES' },
};

/** Decimals a converted number keeps: a load to 0.1, anything else to 0.01. */
const DECIMALS: Record<string, number> = { KILOGRAMS: 1, POUNDS: 1 };

const canonical = (unit: string) => ALIASES[unit] ?? unit;

/** The unit a value in `unit` reads in for `system` — itself when it already
 *  belongs, or has no counterpart (seconds, metres…). */
export function systemUnit(unit: string, system: UnitSystem): string {
  if (unit.includes(COMPOUND)) {
    const parts = unit.split(COMPOUND);
    const mapped = parts.map((p) => systemUnit(p, system));
    return mapped.some((p, i) => p !== parts[i]) ? mapped.join(COMPOUND) : unit;
  }
  return COUNTERPART[system][canonical(unit)] ?? unit;
}

const ratio = (from: string, to: string) =>
  (SIZE[canonical(from)] ?? 1) / (SIZE[canonical(to)] ?? 1);

/** A number in `from` expressed in `to` (same quantity), unrounded. */
export function convertNumber(n: number, from: string, to: string): number {
  if (from === to) return n;
  if (!from.includes(COMPOUND)) return n * ratio(from, to);
  const [fromTop, fromBottom] = from.split(COMPOUND);
  const [toTop, toBottom] = to.split(COMPOUND);
  return (n * ratio(fromTop, toTop)) / ratio(fromBottom, toBottom);
}

const round = (n: number, decimals: number) => {
  const factor = 10 ** decimals;
  return Math.round(n * factor) / factor;
};

const toNumber = (v: unknown): number | null => {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v !== 'string' || v.trim() === '') return null;
  const n = Number(v.trim().replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};

/** One stored metric value as it reads in `system`: the same object when
 *  nothing changes, else a copy with its numbers and unit converted. */
export function convertMetricValue<T extends MetricValue>(
  value: T,
  system: UnitSystem,
): T {
  if (!value?.unit) return value;
  const from = value.unit;
  const to = systemUnit(from, system);
  if (to === from) return value;
  const convert = <V>(raw: V): V | number => {
    const n = toNumber(raw);
    return n === null
      ? raw
      : round(convertNumber(n, from, to), DECIMALS[to] ?? 2);
  };
  return {
    ...value,
    ...('value' in value ? { value: convert(value.value) } : {}),
    ...('min' in value ? { min: convert(value.min) } : {}),
    ...('max' in value ? { max: convert(value.max) } : {}),
    unit: to,
  };
}

/** A set's metrics as they read in `system`. */
export function convertSetMetrics<T extends SetMetrics | null | undefined>(
  metrics: T,
  system: UnitSystem,
): T {
  if (!metrics || typeof metrics !== 'object') return metrics;
  return Object.fromEntries(
    Object.entries(metrics).map(([key, v]) => [
      key,
      v ? convertMetricValue(v, system) : v,
    ]),
  ) as T;
}

// ─── Editing in a unit system ────────────────────────────────────────────────
// An editor shows every value converted and saves what was typed in the
// viewer's units. A value nobody touched must go back exactly as it was
// stored — opening a plan in lb must never rewrite it — so each converted
// value remembers its original. Keyed by identity: the editor replaces a
// value's object when it is edited, and only then.

const storedOf = new WeakMap<MetricValue, MetricValue>();

/** A set's metrics for an editor in `system`, each remembering its stored self. */
export function toDisplayMetrics<T extends SetMetrics | null | undefined>(
  metrics: T,
  system: UnitSystem,
): T {
  if (!metrics || typeof metrics !== 'object') return metrics;
  return Object.fromEntries(
    Object.entries(metrics).map(([key, v]) => {
      if (!v) return [key, v];
      const shown = convertMetricValue(v, system);
      if (shown !== v) storedOf.set(shown, storedOf.get(v) ?? v);
      return [key, shown];
    }),
  ) as T;
}

/** One value back in stored form: as stored if untouched, else as is. */
export const toStoredValue = (value: MetricValue): MetricValue =>
  storedOf.get(value) ?? value;

/** What to save: an untouched value as it was stored, an edited one as is. */
export function toStoredMetrics<T extends SetMetrics | null | undefined>(
  metrics: T,
): T {
  if (!metrics || typeof metrics !== 'object') return metrics;
  return Object.fromEntries(
    Object.entries(metrics).map(([key, v]) => [
      key,
      v ? (storedOf.get(v) ?? v) : v,
    ]),
  ) as T;
}

// ─── Metric definitions in a unit system ─────────────────────────────────────

/** A metric's units without the other system's: WEIGHT is kg or lb, never
 *  both; DISTANCE is m and km, or m and mi. */
export const unitsForSystem = (units: string[], system: UnitSystem) =>
  units.filter((u) => !(canonical(u) in COUNTERPART[system]));

const mapDefault = (unit: string | null, system: UnitSystem) =>
  unit ? systemUnit(unit, system) : unit;

/** A metric as an editor in `system` offers it: its units and default in it. */
export const metricForSystem = (m: Metric, system: UnitSystem): Metric => ({
  ...m,
  units: unitsForSystem(m.units, system),
  defaultUnit: mapDefault(m.defaultUnit, system),
});

/** A composite whose components (and so its compound units) are in `system`. */
export const compositeForSystem = (
  cm: CompositeMetric,
  system: UnitSystem,
): CompositeMetric => ({
  ...cm,
  units: undefined,
  defaultUnit: mapDefault(cm.defaultUnit, system),
  numerator: {
    ...cm.numerator,
    units: unitsForSystem(cm.numerator.units, system),
    defaultUnit: mapDefault(cm.numerator.defaultUnit, system),
  },
  denominator: {
    ...cm.denominator,
    units: unitsForSystem(cm.denominator.units, system),
    defaultUnit: mapDefault(cm.denominator.defaultUnit, system),
  },
});

// ─── Base units (records, measurements) ──────────────────────────────────────
// Records arrive in kilograms, metres and seconds per kilometre; measurements
// are stored in kilograms and centimetres.

const KG_PER_LB = 0.45359237;
const CM_PER_IN = 2.54;
const M_PER_MI = 1609.344;

/** A weight in kilograms, as a number in the system's unit. */
export const weightIn = (kg: number, system: UnitSystem) =>
  system === 'IMPERIAL' ? kg / KG_PER_LB : kg;

/** A typed weight in the system's unit, back to kilograms for storing. */
export const weightToKg = (n: number, system: UnitSystem) =>
  system === 'IMPERIAL' ? n * KG_PER_LB : n;

/** A length in centimetres, as a number in the system's unit. */
export const lengthIn = (cm: number, system: UnitSystem) =>
  system === 'IMPERIAL' ? cm / CM_PER_IN : cm;

/** A typed length in the system's unit, back to centimetres for storing. */
export const lengthToCm = (n: number, system: UnitSystem) =>
  system === 'IMPERIAL' ? n * CM_PER_IN : n;

export const weightUnitLabel = (system: UnitSystem) =>
  system === 'IMPERIAL' ? 'lb' : 'kg';

export const lengthUnitLabel = (system: UnitSystem) =>
  system === 'IMPERIAL' ? 'in' : 'cm';

/** A long distance's unit: km, or mi. Short ones stay in metres. */
export const longDistanceUnitLabel = (system: UnitSystem) =>
  system === 'IMPERIAL' ? 'mi' : 'km';

/** Metres as a number of the long distance unit (km or mi). */
export const longDistanceIn = (m: number, system: UnitSystem) =>
  m / (system === 'IMPERIAL' ? M_PER_MI : 1000);

/** Seconds per kilometre as seconds per the system's long distance unit. */
export const paceIn = (secondsPerKm: number, system: UnitSystem) =>
  system === 'IMPERIAL' ? (secondsPerKm * M_PER_MI) / 1000 : secondsPerKm;
