import { describe, expect, it } from '@jest/globals';
import type { EditorBlock, EditorExercise } from '@shared/types/api.types';
import {
  currentExerciseIndex,
  flattenExercises,
  withMarked,
} from '@shared/lib/sessionProgress';
import { displayWorkout, effectiveMetrics } from '@shared/lib/workout-display';
import {
  canonicalUnit,
  formatTarget,
  targetToLogged,
} from '@features/editor/lib/logged-values';
import { toWorkoutSetPayload } from '@features/editor/types/workout-set.types';

const entry = (
  id: string,
  order: number,
  extra: Partial<EditorExercise> = {},
): EditorExercise =>
  ({
    id,
    exerciseId: `ex-${id}`,
    order,
    notes: null,
    customName: null,
    superSetGroupId: null,
    metrics: [],
    compositeMetrics: [],
    metricOrder: [],
    resolvedMetricOrder: [],
    exercise: { id: `ex-${id}`, name: id },
    sets: [
      {
        id: `${id}-s1`,
        order: 0,
        superSetOrder: null,
        setType: 'NORMAL',
        metrics: {},
        targetMetrics: { REPS: { mode: 'RANGE', min: 8, max: 12 } },
        completedAt: null,
      },
    ],
    ...extra,
  }) as EditorExercise;

const workout = (exercises: EditorExercise[]) => ({
  blocks: [
    {
      id: 'b1',
      name: null,
      index: 0,
      color: null,
      mode: 'NORMAL',
      exercises,
      superSetGroups: [{ id: 'g1', color: '#000', order: 0 }],
    } as EditorBlock,
  ],
});

describe('a workout in training order', () => {
  it('takes each exercise status from the workout itself', () => {
    const flat = flattenExercises(
      workout([entry('a', 0, { status: 'COMPLETED' }), entry('b', 1)]),
    );
    expect(flat.map((f) => f.status)).toEqual(['COMPLETED', 'PENDING']);
    expect(currentExerciseIndex(flat)).toBe(1);
  });

  it('marks a super-set as one, ticking the sets that go with it', () => {
    const w = workout([
      entry('a', 0, { superSetGroupId: 'g1' }),
      entry('b', 1, { superSetGroupId: 'g1' }),
      entry('c', 2),
    ]);
    const marked = withMarked(w, 'b', 'COMPLETED');
    const [a, b, c] = marked.blocks[0].exercises;
    expect([a.status, b.status, c.status]).toEqual([
      'COMPLETED',
      'COMPLETED',
      undefined,
    ]);
    expect(a.sets[0].completedAt).toBeTruthy();
    expect(c.sets[0].completedAt).toBeNull();
  });

  it('reopening unticks every set; skipping leaves them be', () => {
    const done = withMarked(workout([entry('a', 0)]), 'a', 'COMPLETED');
    const reopened = withMarked(done, 'a', 'PENDING');
    expect(reopened.blocks[0].exercises[0].sets[0].completedAt).toBeNull();
    const skipped = withMarked(done, 'a', 'SKIPPED');
    expect(skipped.blocks[0].exercises[0].sets[0].completedAt).toBeTruthy();
  });
});

describe('what a set shows where one value fits', () => {
  it('is what was logged, and the plan where nothing was', () => {
    expect(
      effectiveMetrics({
        metrics: {
          WEIGHT: { value: 62.5, unit: 'KILOGRAMS' },
          REPS: { value: null },
        },
        targetMetrics: {
          WEIGHT: { mode: 'EXACT', value: 60 },
          REPS: { mode: 'RANGE', min: 8, max: 12 },
        },
      }),
    ).toEqual({
      WEIGHT: { value: 62.5, unit: 'KILOGRAMS' },
      REPS: { mode: 'RANGE', min: 8, max: 12 },
    });
  });

  it('applies to every set of a workout, sub-sets included', () => {
    const shown = displayWorkout(workout([entry('a', 0)]));
    expect(shown?.blocks?.[0].exercises[0].sets[0].metrics).toEqual({
      REPS: { mode: 'RANGE', min: 8, max: 12 },
    });
  });
});

describe('plan values', () => {
  it('read as short hints', () => {
    expect(formatTarget({ mode: 'EXACT', value: 60 })).toBe('60');
    expect(formatTarget({ mode: 'RANGE', min: 8, max: 12 })).toBe('8–12');
    expect(formatTarget({ mode: 'LESS_THAN', value: 10 })).toBe('<10');
    expect(formatTarget({ mode: 'GREATER_THAN', value: 5 })).toBe('>5');
    expect(formatTarget({ mode: 'EXACT', value: null })).toBeUndefined();
  });

  it('copy as one value: a range by its lower end', () => {
    expect(targetToLogged({ mode: 'RANGE', min: 8, max: 12 })).toBe(8);
    expect(targetToLogged({ mode: 'RANGE', min: null, max: 12 })).toBe(12);
    expect(targetToLogged({ mode: 'LESS_THAN', value: 10 })).toBe(10);
  });

  it('translate the unit acronyms older plans stored', () => {
    expect(canonicalUnit('kg')).toBe('KILOGRAMS');
    expect(canonicalUnit('KILOGRAMS')).toBe('KILOGRAMS');
  });
});

describe('a workout set as it is saved', () => {
  it('logs values without a mode and carries the target and the tick', () => {
    expect(
      toWorkoutSetPayload({
        setType: 'NORMAL',
        metrics: {
          WEIGHT: { mode: 'EXACT', value: 60, unit: 'KILOGRAMS' },
          REPS: { mode: 'EXACT', value: '' },
        },
        targetMetrics: { REPS: { mode: 'RANGE', min: 8, max: 12 } },
        completed: true,
        notes: '  ',
      }),
    ).toEqual({
      setType: 'NORMAL',
      metrics: {
        WEIGHT: { value: 60, unit: 'KILOGRAMS' },
        REPS: { value: null },
      },
      targetMetrics: { REPS: { mode: 'RANGE', min: 8, max: 12 } },
      notes: null,
      completed: true,
      subSets: undefined,
    });
  });
});
