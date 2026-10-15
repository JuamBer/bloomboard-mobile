import { describe, expect, it } from '@jest/globals';
import type { Workout } from '@shared/types/api.types';
import { shareSummary, shareText } from './share-data';

const metric = (key: string, acronym: string) =>
  ({
    id: key,
    key,
    name: key,
    acronym,
    valueType: 'NUMBER',
    units: [],
  }) as never;

const set = (
  order: number,
  weight: number | null,
  reps: number | null,
  done: boolean,
  extra: object = {},
) => ({
  id: `s${order}`,
  order,
  superSetOrder: null,
  setType: 'NORMAL',
  metrics: {
    WEIGHT: { value: weight, unit: 'KILOGRAMS' },
    REPS: { value: reps },
  },
  targetMetrics: null,
  completedAt: done ? '2026-10-15T10:10:00Z' : null,
  ...extra,
});

const workout = {
  id: 'w',
  name: 'Pierna',
  startedAt: '2026-10-15T10:00:00Z',
  finishedAt: '2026-10-15T11:05:00Z',
  blocks: [
    {
      id: 'b',
      index: 0,
      name: null,
      exercises: [
        {
          id: 'e1',
          order: 0,
          customName: null,
          exercise: { name: 'Sentadilla' },
          metrics: [metric('WEIGHT', 'Peso'), metric('REPS', 'Reps')],
          compositeMetrics: [],
          resolvedMetricOrder: ['WEIGHT', 'REPS'],
          sets: [
            set(0, 80, 8, true, {
              recordDetails: [{ kind: 'MAX_WEIGHT', value: 80, previous: 75 }],
            }),
            set(1, 80, 6, true),
            set(2, null, null, false),
          ],
        },
        {
          id: 'e2',
          order: 1,
          customName: null,
          exercise: { name: 'Prensa' },
          metrics: [metric('WEIGHT', 'Peso')],
          compositeMetrics: [],
          resolvedMetricOrder: ['WEIGHT'],
          sets: [set(0, null, null, false)],
        },
      ],
    },
  ],
} as unknown as Workout;

describe('shareSummary', () => {
  const summary = shareSummary(workout, 'METRIC', (u) =>
    u === 'KILOGRAMS' ? 'kg' : u,
  );

  it('counts what was done: time, volume, sets, exercises, records', () => {
    expect(summary.minutes).toBe(65);
    expect(summary.volumeKg).toBe(80 * 8 + 80 * 6);
    expect(summary.sets).toBe(2);
    expect(summary.exercises).toBe(1);
    expect(summary.records).toHaveLength(1);
    expect(summary.records[0].exercise).toBe('Sentadilla');
  });

  it('lists only the sets done, each as its values', () => {
    expect(summary.list).toEqual([
      {
        name: 'Sentadilla',
        sets: ['80 kg · 8 Reps', '80 kg · 6 Reps'],
        records: 1,
      },
    ]);
  });

  it('writes the workout as plain text', () => {
    expect(
      shareText(summary, {
        when: 'mié, 15 oct 2026 · 1 h 05 min',
        totals: 'Volumen 1120 kg · 2 series',
        records: ['Récord · Sentadilla: Peso máximo 80 kg'],
        footer: 'Registrado con Bloom Board · @bloomboard.pro',
      }),
    ).toBe(
      [
        'Pierna',
        'mié, 15 oct 2026 · 1 h 05 min',
        'Volumen 1120 kg · 2 series',
        '',
        'Sentadilla',
        '1. 80 kg · 8 Reps',
        '2. 80 kg · 6 Reps',
        '',
        'Récord · Sentadilla: Peso máximo 80 kg',
        '',
        'Registrado con Bloom Board · @bloomboard.pro',
      ].join('\n'),
    );
  });
});
