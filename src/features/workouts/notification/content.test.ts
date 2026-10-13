import { describe, expect, it } from '@jest/globals';
import type {
  EditorExercise,
  EditorSet,
  Metric,
  Workout,
} from '@shared/types/api.types';
import {
  canCompleteSet,
  completeSetPayload,
  currentStep,
  notificationText,
  unitAcronym,
} from './content';

const metric = (key: string, extra: Partial<Metric> = {}) =>
  ({ key, name: key, acronym: null, defaultUnit: null, ...extra }) as Metric;

const WEIGHT = metric('WEIGHT', { defaultUnit: 'KILOGRAMS' });
const REPS = metric('REPS', { acronym: 'reps' });
const TEMPO = metric('TEMPO', { isPlanOnly: true });

const set = (
  id: string,
  order: number,
  extra: Partial<EditorSet> = {},
): EditorSet =>
  ({
    id,
    order,
    superSetOrder: null,
    setType: 'NORMAL',
    metrics: {},
    targetMetrics: {
      WEIGHT: { mode: 'EXACT', value: 50, unit: 'KILOGRAMS' },
      REPS: { mode: 'RANGE', min: 8, max: 10 },
    },
    completedAt: null,
    ...extra,
  }) as EditorSet;

const entry = (
  id: string,
  order: number,
  sets: EditorSet[],
  extra: Partial<EditorExercise> = {},
): EditorExercise =>
  ({
    id,
    exerciseId: `ex-${id}`,
    order,
    notes: null,
    customName: null,
    superSetGroupId: null,
    metrics: [WEIGHT, REPS, TEMPO],
    compositeMetrics: [],
    metricOrder: [],
    resolvedMetricOrder: ['WEIGHT', 'REPS'],
    exercise: { id: `ex-${id}`, name: `Exercise ${id}`, imageUrls: [] },
    sets,
    status: 'PENDING',
    ...extra,
  }) as EditorExercise;

const workout = (exercises: EditorExercise[]): Workout =>
  ({
    id: 'w1',
    name: 'Día A · Empuje',
    finishedAt: null,
    blocks: [
      {
        id: 'b1',
        index: 0,
        name: null,
        color: null,
        superSetGroups: [],
        exercises,
      },
    ],
  }) as unknown as Workout;

const t = (key: string, options?: Record<string, unknown>) =>
  `${key}${options ? JSON.stringify(options) : ''}`;

describe('currentStep', () => {
  it('is the first exercise not done, at its first set not ticked', () => {
    const w = workout([
      entry('a', 0, [set('a1', 0)], { status: 'COMPLETED' }),
      entry('b', 1, [
        set('b2', 1),
        set('b1', 0, { completedAt: '2026-10-13T10:00:00Z' }),
        set('b3', 2),
      ]),
    ]);
    const step = currentStep(w)!;
    expect(step.entry.id).toBe('b');
    expect(step.set?.id).toBe('b2');
    expect([step.setNumber, step.setCount]).toEqual([2, 3]);
    expect([step.exerciseNumber, step.exerciseCount]).toEqual([2, 2]);
    expect(step.blockId).toBe('b1');
  });

  it('is null once every exercise is done or skipped', () => {
    const w = workout([
      entry('a', 0, [set('a1', 0)], { status: 'COMPLETED' }),
      entry('b', 1, [], { status: 'SKIPPED' }),
    ]);
    expect(currentStep(w)).toBeNull();
  });
});

describe('notificationText', () => {
  it('names the exercise, the set and the values in the member units', () => {
    const w = workout([entry('a', 0, [set('a1', 0), set('a2', 1)])]);
    const text = notificationText(w, currentStep(w), t, 'IMPERIAL');
    expect(text.title).toBe('Exercise a');
    expect(text.subtitle).toBe('Día A · Empuje');
    expect(text.body).toContain('app:workoutNotification.set');
    expect(text.body).toContain('"number":1');
    expect(text.body).toMatch(/110\.2 lb|110 lb/);
    expect(text.body).toContain('8/10 reps');
  });

  it('says all is done when nothing is left', () => {
    const w = workout([entry('a', 0, [], { status: 'COMPLETED' })]);
    expect(notificationText(w, null, t, 'METRIC').body).toBe(
      'app:workoutNotification.allDone',
    );
  });
});

describe('completeSetPayload', () => {
  it('ticks the set with the plan values, the others as they are', () => {
    const e = entry('a', 0, [
      set('a1', 0, {
        completedAt: '2026-10-13T10:00:00Z',
        metrics: { WEIGHT: { value: 55, unit: 'KILOGRAMS' } },
      }),
      set('a2', 1),
    ]);
    const payload = completeSetPayload(e, 'a2')!;
    expect(payload.sets).toHaveLength(2);
    expect(payload.sets![0]).toMatchObject({
      completed: true,
      metrics: { WEIGHT: { value: 55, unit: 'KILOGRAMS' } },
    });
    expect(payload.sets![1]).toMatchObject({
      completed: true,
      metrics: {
        WEIGHT: { value: 50, unit: 'KILOGRAMS' },
        // A range logs its low end, as a tick in the table does.
        REPS: { value: 8 },
      },
    });
    expect(payload.metricKeys).toEqual(['WEIGHT', 'REPS', 'TEMPO']);
  });

  it('falls back on last time when the plan says nothing', () => {
    const e = entry('a', 0, [set('a1', 0, { targetMetrics: {} })], {
      previousSets: [
        {
          setType: 'NORMAL',
          metrics: {
            WEIGHT: { value: 40, unit: 'KILOGRAMS' },
            REPS: { value: 12 },
          },
        },
      ],
    });
    expect(completeSetPayload(e, 'a1')!.sets![0].metrics).toMatchObject({
      WEIGHT: { value: 40, unit: 'KILOGRAMS' },
      REPS: { value: 12 },
    });
  });

  it('leaves a set already ticked — or gone — alone', () => {
    const e = entry('a', 0, [
      set('a1', 0, { completedAt: '2026-10-13T10:00:00Z' }),
    ]);
    expect(completeSetPayload(e, 'a1')).toBeNull();
    expect(completeSetPayload(e, 'nope')).toBeNull();
  });
});

describe('canCompleteSet', () => {
  it('offers the button for a plain set, not inside a super-set', () => {
    const plain = workout([entry('a', 0, [set('a1', 0)])]);
    expect(canCompleteSet(currentStep(plain))).toBe(true);
    const grouped = workout([
      entry('a', 0, [set('a1', 0)], { superSetGroupId: 'g1' }),
    ]);
    expect(canCompleteSet(currentStep(grouped))).toBe(false);
    expect(canCompleteSet(null)).toBe(false);
  });
});

describe('unitAcronym', () => {
  it('reads simple and compound units', () => {
    expect(unitAcronym('KILOGRAMS')).toBe('kg');
    expect(unitAcronym('KILOMETERS/HOURS')).toBe('km/h');
  });
});
