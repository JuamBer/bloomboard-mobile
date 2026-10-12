import { describe, expect, it } from '@jest/globals';
import type { CompositeMetric } from '@shared/types/api.types';
import { unitLabel } from '../constants/unit.labels';
import {
  compositeDefaultUnit,
  compositeUnits,
  splitCompoundUnit,
} from './compound-units';

const side = (key: string, units: string[]) => ({
  id: key,
  key,
  name: key,
  units,
  defaultUnit: units[0] ?? null,
});

const speed = {
  numerator: side('DISTANCE', ['METERS', 'KILOMETERS', 'MILES']),
  denominator: side('TIME', ['SECONDS', 'MINUTES', 'HOURS']),
  defaultUnit: 'KILOMETERS/HOURS',
} as Pick<CompositeMetric, 'numerator' | 'denominator' | 'defaultUnit'>;

describe('compound units', () => {
  it('are every numerator unit over every denominator unit', () => {
    expect(compositeUnits(speed)).toHaveLength(9);
    expect(compositeUnits(speed)).toContain('MILES/HOURS');
  });

  it('start in the default while it is still a combination', () => {
    expect(compositeDefaultUnit(speed)).toBe('KILOMETERS/HOURS');
    expect(
      compositeDefaultUnit({ ...speed, defaultUnit: 'KILOMETERS_PER_HOUR' }),
    ).toBe('METERS/SECONDS');
  });

  it('split into their two halves', () => {
    expect(splitCompoundUnit('MINUTES/KILOMETERS')).toEqual({
      numerator: 'MINUTES',
      denominator: 'KILOMETERS',
    });
  });

  it('read as "x por y"', () => {
    expect(unitLabel('KILOMETERS/HOURS')).toBe('Kilómetros por hora');
    expect(unitLabel('MINUTES/MILES')).toBe('Minutos por milla');
    expect(unitLabel('POUNDS')).toBe('Libras');
  });
});
