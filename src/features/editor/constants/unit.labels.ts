import { isCompoundUnit, splitCompoundUnit } from '../lib/compound-units';

/** Spanish display names for unit keys. Unit keys + acronyms live in the DB;
 *  the full human-readable name is translated here (used in the metrics dialog). */
export const UNIT_LABELS: Record<string, string> = {
  KILOGRAMS: 'Kilogramos',
  POUNDS: 'Libras',
  METERS: 'Metros',
  KILOMETERS: 'Kilómetros',
  MILES: 'Millas',
  SECONDS: 'Segundos',
  MINUTES: 'Minutos',
  HOURS: 'Horas',
  KCAL: 'Kilocalorías',
  REVOLUTIONS: 'Revoluciones',
};

/** A unit as the denominator of a compound one: "por hora", not "por Horas". */
const PER_UNIT_LABELS: Record<string, string> = {
  METERS: 'metro',
  KILOMETERS: 'kilómetro',
  MILES: 'milla',
  SECONDS: 'segundo',
  MINUTES: 'minuto',
  HOURS: 'hora',
};

/** Spanish name for a unit key, falling back to the key itself. A compound
 *  unit (a composite metric's) reads "Kilómetros por hora". */
export const unitLabel = (key: string): string => {
  if (!isCompoundUnit(key)) return UNIT_LABELS[key] ?? key;
  const { numerator, denominator } = splitCompoundUnit(key);
  const per =
    PER_UNIT_LABELS[denominator] ?? unitLabel(denominator).toLowerCase();
  return `${unitLabel(numerator)} por ${per}`;
};
