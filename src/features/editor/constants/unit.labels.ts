/** Spanish display names for unit keys. Unit keys + acronyms live in the DB;
 *  the full human-readable name is translated here (used in the metrics dialog). */
export const UNIT_LABELS: Record<string, string> = {
  KILOGRAMS: 'Kilogramos',
  BODY_WEIGHT_PERCENT: '% del peso corporal',
  ONE_REP_MAX_PERCENT: '% del 1RM',
  METERS: 'Metros',
  KILOMETERS: 'Kilómetros',
  SECONDS: 'Segundos',
  MINUTES: 'Minutos',
  HOURS: 'Horas',
  KCAL: 'Kilocalorías',
  WATTS: 'Vatios',
  RPM: 'Revoluciones por minuto',
  // Compound units — used by composite metrics (Velocidad, Ritmo, ...).
  KILOMETERS_PER_HOUR: 'Kilómetros por hora',
  METERS_PER_SECOND: 'Metros por segundo',
  MINUTES_PER_KILOMETER: 'Minutos por kilómetro',
  MINUTES_PER_100_METERS: 'Minutos por 100 metros',
  KCAL_PER_MINUTE: 'Kilocalorías por minuto',
  KCAL_PER_HOUR: 'Kilocalorías por hora',
  WATTS_PER_KILOGRAM: 'Vatios por kilogramo',
  REVOLUTIONS_PER_SECOND: 'Revoluciones por segundo',
  REVOLUTIONS_PER_MINUTE: 'Revoluciones por minuto',
  REVOLUTIONS_PER_HOUR: 'Revoluciones por hora',
};

/** Spanish name for a unit key, falling back to the key itself. */
export const unitLabel = (key: string): string => UNIT_LABELS[key] ?? key;
