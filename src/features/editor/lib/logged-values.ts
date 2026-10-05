import type { MetricValue, SetMetrics } from '@shared/types/api.types';

/**
 * Values in a workout: what was logged is one exact number per metric, the
 * plan's target can be anything a template holds. Shared by the sets table,
 * the references sheet and "copy these values".
 */

// Older plans wrote a unit by its acronym ("kg"); the catalog's key is what a
// logged value carries (the server translates the same aliases).
const UNIT_ALIASES: Record<string, string> = {
  kg: 'KILOGRAMS',
  m: 'METERS',
  km: 'KILOMETERS',
  s: 'SECONDS',
  min: 'MINUTES',
  h: 'HOURS',
};

export const canonicalUnit = (unit: string | null | undefined) =>
  unit ? (UNIT_ALIASES[unit] ?? unit) : unit;

const present = (v: unknown) => v !== null && v !== undefined && v !== '';

/** A plan's value as a short hint — "60", "8–12", "<10", ">5". Undefined when
 *  the plan says nothing for this metric. */
export function formatTarget(value: MetricValue | null | undefined) {
  if (!value) return undefined;
  switch (value.mode) {
    case 'RANGE':
      if (!present(value.min) && !present(value.max)) return undefined;
      if (!present(value.max)) return `≥${value.min}`;
      if (!present(value.min)) return `≤${value.max}`;
      return `${value.min}–${value.max}`;
    case 'LESS_THAN':
      return present(value.value) ? `<${value.value}` : undefined;
    case 'GREATER_THAN':
      return present(value.value) ? `>${value.value}` : undefined;
    default:
      return present(value.value) ? String(value.value) : undefined;
  }
}

/**
 * The one value to log from a plan's target: the value itself, or — for a
 * range or a bound — the end a person aims at first (the low end of a range,
 * the bound of an inequality).
 */
export function targetToLogged(value: MetricValue | null | undefined) {
  if (!value) return null;
  const pick =
    value.mode === 'RANGE'
      ? present(value.min)
        ? value.min
        : value.max
      : value.value;
  return present(pick) ? (pick as number | string) : null;
}

/** Whether a set has anything logged in it. */
export const hasLogged = (metrics: SetMetrics) =>
  Object.values(metrics).some((v) => present(v?.value));
