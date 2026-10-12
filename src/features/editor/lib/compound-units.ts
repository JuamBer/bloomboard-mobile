import type { CompositeMetric } from '@shared/types/api.types';

// A composite metric's unit is its components' units combined: any unit of the
// numerator over any unit of the denominator, stored as one string,
// "NUMERATOR_UNIT/DENOMINATOR_UNIT" ("KILOMETERS/HOURS" — km/h). Mirrors the
// backend's src/metrics/compound-units.ts.

export const COMPOUND_UNIT_SEPARATOR = '/';

type Components = Pick<CompositeMetric, 'numerator' | 'denominator'>;

export const compoundUnitKey = (numerator: string, denominator: string) =>
  `${numerator}${COMPOUND_UNIT_SEPARATOR}${denominator}`;

export const isCompoundUnit = (key: string) =>
  key.includes(COMPOUND_UNIT_SEPARATOR);

/** The two halves of a compound unit key. */
export function splitCompoundUnit(key: string): {
  numerator: string;
  denominator: string;
} {
  const [numerator = '', denominator = ''] = key.split(COMPOUND_UNIT_SEPARATOR);
  return { numerator, denominator };
}

/** Every unit a composite can be recorded in, numerator unit first. A side
 *  with no units (a bare count) contributes an empty part. */
export function compositeUnits(cm: Components): string[] {
  const top = cm.numerator.units.length ? cm.numerator.units : [''];
  const bottom = cm.denominator.units.length ? cm.denominator.units : [''];
  return top.flatMap((n) => bottom.map((d) => compoundUnitKey(n, d)));
}

/** The unit a composite starts in: its default when it is still one of its
 *  combinations, else the first. */
export function compositeDefaultUnit(
  cm: Components & Pick<CompositeMetric, 'defaultUnit'>,
): string | undefined {
  const units = compositeUnits(cm);
  return cm.defaultUnit && units.includes(cm.defaultUnit)
    ? cm.defaultUnit
    : units[0];
}
