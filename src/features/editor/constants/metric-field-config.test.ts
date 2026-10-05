import { describe, expect, it } from '@jest/globals';
import type { EditableWorkoutSet } from '../types/workout-set.types';
import { createDefaultSet } from './metric-field-config';

const reps = (value: number) => ({
  REPS: { mode: 'EXACT' as const, value },
});

describe('createDefaultSet', () => {
  it('copies the previous set, values and type', () => {
    const previous: EditableWorkoutSet = {
      id: 'a',
      setType: 'WARMUP',
      metrics: reps(12),
    };
    const next = createDefaultSet([], [], previous);
    expect(next.setType).toBe('WARMUP');
    expect(next.metrics).toEqual(reps(12));
    expect(next.id).not.toBe('a');
  });

  it('never copies a compound set as one: the next is a plain set', () => {
    const previous: EditableWorkoutSet = {
      id: 'c',
      setType: 'CLUSTER',
      metrics: reps(5),
      subSets: [{ id: 's', setType: 'NORMAL', metrics: reps(3) }],
    };
    const next = createDefaultSet([], [], previous);
    expect(next.setType).toBe('NORMAL');
    expect(next.subSets).toBeUndefined();
    expect(next.metrics).toEqual(reps(5));
  });
});
