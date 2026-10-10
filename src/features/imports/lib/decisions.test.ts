import { describe, expect, it } from '@jest/globals';
import type { HevyPreview, HevyPreviewExercise } from '@shared/types/api.types';
import {
  incomplete,
  initialDrafts,
  needsReview,
  quota,
  toDecisions,
} from './decisions';

const option = (id: string) => ({
  id,
  name: id,
  own: false,
  equipments: [],
  imageUrl: null,
});

const exercise = (
  title: string,
  status: HevyPreviewExercise['status'],
  sets: number,
): HevyPreviewExercise => ({
  title,
  key: title.toLowerCase(),
  workouts: 1,
  sets,
  metrics: ['WEIGHT', 'REPS'],
  equipments: [],
  lastDone: '2026-09-29T18:00:00Z',
  status,
  exercise: status === 'none' ? null : option(`ex-${title}`),
  candidates: [],
});

const preview = (
  exercises: HevyPreviewExercise[],
  limit: number | null,
  used = 0,
): HevyPreview => ({
  workouts: null,
  measurements: null,
  exercises,
  customExercises: { limit, used },
  skippedRows: 0,
  imperial: false,
});

describe('initialDrafts', () => {
  it('matches what was proposed and creates the rest while the plan has room', () => {
    const p = preview(
      [
        exercise('Bench', 'alias', 10),
        exercise('Rare', 'none', 2),
        exercise('Custom', 'none', 8),
        exercise('Fuzzy', 'suggested', 3),
      ],
      10,
      9,
    );
    const drafts = initialDrafts(p);
    expect(drafts.bench).toEqual({
      action: 'match',
      exercise: option('ex-Bench'),
    });
    expect(drafts.fuzzy.action).toBe('match');
    // One slot left: the most used gets it.
    expect(drafts.custom).toEqual({ action: 'create', name: 'Custom' });
    expect(drafts.rare).toEqual({ action: 'skip' });
  });

  it('creates every unmatched one on an unlimited plan', () => {
    const p = preview(
      [exercise('A', 'none', 1), exercise('B', 'none', 1)],
      null,
    );
    expect(
      Object.values(initialDrafts(p)).every((d) => d.action === 'create'),
    ).toBe(true);
  });
});

describe('quota', () => {
  it('counts one exercise per name and what goes over the plan', () => {
    const p = preview([], 10, 8);
    expect(
      quota(p, {
        a: { action: 'create', name: 'Press 2' },
        b: { action: 'create', name: 'press  2 ' },
        c: { action: 'create', name: 'Otro' },
        d: { action: 'create', name: 'Más' },
      }),
    ).toEqual({ count: 3, limit: 10, left: -1, over: 1 });
  });
});

describe('toDecisions / incomplete / needsReview', () => {
  it('turns the drafts into the API answers', () => {
    const p = preview(
      [
        exercise('A', 'alias', 1),
        exercise('B', 'none', 1),
        exercise('C', 'none', 1),
      ],
      10,
    );
    expect(
      toDecisions(p, {
        a: { action: 'match', exercise: option('x') },
        b: { action: 'create', name: ' Mine ' },
      }),
    ).toEqual([
      { title: 'A', action: 'match', exerciseId: 'x' },
      { title: 'B', action: 'create', name: 'Mine' },
      { title: 'C', action: 'skip' },
    ]);
  });

  it('knows what still needs an answer', () => {
    expect(incomplete({ action: 'match', exercise: null })).toBe(true);
    expect(incomplete({ action: 'create', name: ' ' })).toBe(true);
    expect(incomplete({ action: 'skip' })).toBe(false);
    expect(needsReview(exercise('A', 'suggested', 1))).toBe(true);
    expect(needsReview(exercise('A', 'linked', 1))).toBe(false);
  });
});
