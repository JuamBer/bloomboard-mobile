import { describe, expect, it } from '@jest/globals';
import type { Metric } from '@shared/types/api.types';
import { createDefaultSet } from '../constants/metric-field-config';
import type { EditableWorkoutSet } from '../types/workout-set.types';
import { metricsIn, toDisplaySet, toStoredSet } from './display-sets';

const weight = {
  id: 'w',
  key: 'WEIGHT',
  name: 'Peso',
  valueType: 'NUMBER',
  units: ['KILOGRAMS', 'POUNDS'],
  defaultUnit: 'KILOGRAMS',
  format: null,
  source: null,
  options: [],
} as Metric;

describe('sets in a unit system', () => {
  it('stamps a new value with the reader’s unit, even a single one', () => {
    const set = createDefaultSet(metricsIn([weight], 'IMPERIAL'), []);
    expect(set.metrics.WEIGHT).toEqual({
      mode: 'EXACT',
      value: null,
      unit: 'POUNDS',
    });
  });

  it('shows a plan and its sub-sets converted, and gives them back as stored', () => {
    const stored: EditableWorkoutSet = {
      setType: 'DROP',
      metrics: { WEIGHT: { mode: 'EXACT', value: 100, unit: 'KILOGRAMS' } },
      subSets: [
        {
          setType: 'NORMAL',
          metrics: { WEIGHT: { mode: 'EXACT', value: 80, unit: 'kg' } },
        },
      ],
    };
    const shown = toDisplaySet(stored, 'IMPERIAL');
    expect(shown.metrics.WEIGHT?.value).toBe(220.5);
    expect(shown.subSets?.[0].metrics.WEIGHT).toMatchObject({
      value: 176.4,
      unit: 'POUNDS',
    });
    expect(toStoredSet(shown)).toEqual(stored);
  });
});
