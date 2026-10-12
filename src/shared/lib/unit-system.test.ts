import { describe, expect, it } from '@jest/globals';
import type { Metric, SetMetrics } from '@shared/types/api.types';
import {
  convertMetricValue,
  metricForSystem,
  systemUnit,
  toDisplayMetrics,
  toStoredMetrics,
  toStoredValue,
  unitsForSystem,
} from './unit-system';

describe('unit system', () => {
  it('maps units to their counterpart, compound ones part by part', () => {
    expect(systemUnit('KILOGRAMS', 'IMPERIAL')).toBe('POUNDS');
    expect(systemUnit('kg', 'IMPERIAL')).toBe('POUNDS');
    expect(systemUnit('KILOMETERS/HOURS', 'IMPERIAL')).toBe('MILES/HOURS');
    expect(systemUnit('MINUTES/MILES', 'METRIC')).toBe('MINUTES/KILOMETERS');
    expect(systemUnit('METERS', 'IMPERIAL')).toBe('METERS');
  });

  it('converts a value, a range and a pace', () => {
    expect(
      convertMetricValue({ value: 100, unit: 'KILOGRAMS' }, 'IMPERIAL'),
    ).toEqual({ value: 220.5, unit: 'POUNDS' });
    expect(
      convertMetricValue(
        { mode: 'RANGE', min: 135, max: 155, unit: 'POUNDS' },
        'METRIC',
      ),
    ).toEqual({ mode: 'RANGE', min: 61.2, max: 70.3, unit: 'KILOGRAMS' });
    expect(
      convertMetricValue({ value: 5, unit: 'MINUTES/KILOMETERS' }, 'IMPERIAL'),
    ).toEqual({ value: 8.05, unit: 'MINUTES/MILES' });
  });

  it('gives back an untouched value exactly as stored, an edited one as typed', () => {
    const stored: SetMetrics = {
      WEIGHT: { mode: 'EXACT', value: 60, unit: 'KILOGRAMS' },
      REPS: { mode: 'EXACT', value: 8 },
    };
    const shown = toDisplayMetrics(stored, 'IMPERIAL');
    expect(shown.WEIGHT).toEqual({
      mode: 'EXACT',
      value: 132.3,
      unit: 'POUNDS',
    });

    // Nothing touched: the stored values come back, not 132.3 lb.
    expect(toStoredMetrics({ ...shown })).toEqual(stored);
    // An edit is a new value object, saved as typed.
    const edited = { ...shown, WEIGHT: { ...shown.WEIGHT!, value: 135 } };
    expect(toStoredMetrics(edited).WEIGHT).toEqual({
      mode: 'EXACT',
      value: 135,
      unit: 'POUNDS',
    });
    expect(toStoredValue(shown.WEIGHT!)).toBe(stored.WEIGHT);
  });

  it("offers only the system's units", () => {
    expect(unitsForSystem(['KILOGRAMS', 'POUNDS'], 'IMPERIAL')).toEqual([
      'POUNDS',
    ]);
    expect(unitsForSystem(['METERS', 'KILOMETERS', 'MILES'], 'METRIC')).toEqual(
      ['METERS', 'KILOMETERS'],
    );
    const weight = {
      key: 'WEIGHT',
      units: ['KILOGRAMS', 'POUNDS'],
      defaultUnit: 'KILOGRAMS',
    } as Metric;
    expect(metricForSystem(weight, 'IMPERIAL')).toMatchObject({
      units: ['POUNDS'],
      defaultUnit: 'POUNDS',
    });
  });
});
