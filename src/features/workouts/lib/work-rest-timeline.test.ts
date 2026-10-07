import { describe, expect, it } from '@jest/globals';
import type {
  SetMetrics,
  EditorSet,
  EditorBlock,
  EditorExercise,
} from '@shared/types/api.types';
import {
  CELEBRATION_MS,
  LEAD_IN_MS,
  buildWorkRestSlots,
  countdownSeconds,
  currentWorkRestBlock,
  isRunOver,
  totalWorkRestMs,
  workRestStateAt,
  type WorkRestSlot,
} from './work-rest-timeline';

// The whole mode rests on this module: the TV writes nothing, so what the room
// is told to do next is purely `elapsedMs` fed through these functions. Every
// fixture below is the smallest object the code actually reads — the casts are
// confined to these three factories so the tests themselves stay honest.

const seconds = (n: number) => ({
  mode: 'EXACT' as const,
  value: n,
  unit: 'SECONDS',
});

const set = (
  id: string,
  order: number,
  metrics: SetMetrics,
  superSetOrder?: number,
): EditorSet => ({ id, order, metrics, superSetOrder }) as EditorSet;

const entry = (
  id: string,
  order: number,
  name: string,
  sets: EditorSet[],
  superSetGroupId?: string,
): EditorExercise =>
  ({
    id,
    order,
    customName: null,
    superSetGroupId: superSetGroupId ?? null,
    metrics: [],
    compositeMetrics: [],
    resolvedMetricOrder: [],
    exercise: { id: `ex-${id}`, name, gifUrls: [], imageUrls: [] },
    sets,
  }) as unknown as EditorExercise;

const block = (
  exercises: EditorExercise[],
  opts: {
    mode?: 'NORMAL' | 'WORK_REST';
    index?: number;
    groups?: { id: string }[];
  } = {},
): EditorBlock =>
  ({
    id: 'block-1',
    name: 'Bloque',
    index: opts.index ?? 0,
    mode: opts.mode ?? 'WORK_REST',
    exercises,
    superSetGroups: opts.groups ?? [],
  }) as unknown as EditorBlock;

/** Slots straight from numbers, for the state tests that don't care about shape. */
const slotsOf = (...pairs: [number, number][]): WorkRestSlot[] =>
  pairs.map(
    ([workMs, restMs], i) =>
      ({
        id: `s${i}`,
        exerciseEntryId: `e${i}`,
        name: `Ex ${i}`,
        label: String(i + 1),
        workMs,
        restMs,
      }) as WorkRestSlot,
  );

describe('buildWorkRestSlots', () => {
  it('turns a plain exercise into one slot per set, in set order', () => {
    const slots = buildWorkRestSlots(
      block([
        entry('e1', 0, 'Sentadilla', [
          set('s2', 1, { TIME: seconds(20), REST: seconds(5) }),
          set('s1', 0, { TIME: seconds(30), REST: seconds(15) }),
        ]),
      ]),
    );

    expect(slots.map((s) => s.label)).toEqual(['1', '2']);
    expect(slots.map((s) => [s.workMs, s.restMs])).toEqual([
      [30_000, 15_000],
      [20_000, 5_000],
    ]);
    expect(slots[0].name).toBe('Sentadilla');
    expect(slots[0].letter).toBeNull();
  });

  it('converts minutes, and treats a missing TIME/REST as zero', () => {
    const slots = buildWorkRestSlots(
      block([
        entry('e1', 0, 'Plancha', [
          set('s1', 0, { TIME: { mode: 'EXACT', value: 2, unit: 'MINUTES' } }),
        ]),
      ]),
    );

    expect(slots[0].workMs).toBe(120_000);
    expect(slots[0].restMs).toBe(0);
  });

  it('keeps every metric except TIME and REST as chips', () => {
    const slots = buildWorkRestSlots(
      block([
        entry('e1', 0, 'Remo', [
          set('s1', 0, {
            TIME: seconds(30),
            REST: seconds(15),
            REPS: { mode: 'EXACT', value: 12 },
            RPE: { mode: 'EXACT', value: 8 },
          }),
        ]),
      ]),
    );

    expect(Object.keys(slots[0].extraMetrics).sort()).toEqual(['REPS', 'RPE']);
  });

  it('reads a super set out in superSetOrder, not exercise by exercise', () => {
    // A1, B1, C1, A2 — the sequence lives on superSetOrder, so the flat list
    // must interleave the members rather than run each one to exhaustion.
    const slots = buildWorkRestSlots(
      block(
        [
          entry(
            'a',
            0,
            'Press',
            [
              set('a1', 0, { TIME: seconds(30) }, 0),
              set('a2', 1, { TIME: seconds(30) }, 3),
            ],
            'g1',
          ),
          entry(
            'b',
            1,
            'Fondos',
            [set('b1', 0, { TIME: seconds(30) }, 1)],
            'g1',
          ),
          entry(
            'c',
            2,
            'Dominadas',
            [set('c1', 0, { TIME: seconds(30) }, 2)],
            'g1',
          ),
        ],
        { groups: [{ id: 'g1' }] },
      ),
    );

    expect(slots.map((s) => s.label)).toEqual(['A1', 'B1', 'C1', 'A2']);
    expect(slots.map((s) => s.name)).toEqual([
      'Press',
      'Fondos',
      'Dominadas',
      'Press',
    ]);
    expect(slots.map((s) => s.letter)).toEqual(['A', 'B', 'C', 'A']);
  });

  it('emits a group once, at the position of its first member', () => {
    const slots = buildWorkRestSlots(
      block(
        [
          entry('solo', 0, 'Calentar', [set('x1', 0, { TIME: seconds(60) })]),
          entry(
            'a',
            1,
            'Press',
            [set('a1', 0, { TIME: seconds(30) }, 0)],
            'g1',
          ),
          entry(
            'b',
            2,
            'Fondos',
            [set('b1', 0, { TIME: seconds(30) }, 1)],
            'g1',
          ),
          entry('after', 3, 'Estirar', [set('y1', 0, { TIME: seconds(45) })]),
        ],
        { groups: [{ id: 'g1' }] },
      ),
    );

    expect(slots.map((s) => s.name)).toEqual([
      'Calentar',
      'Press',
      'Fondos',
      'Estirar',
    ]);
  });

  it('gives every slot a distinct id, which is what keyed animations need', () => {
    const slots = buildWorkRestSlots(
      block([
        entry('e1', 0, 'Sentadilla', [
          set('s1', 0, { TIME: seconds(30) }),
          set('s2', 1, { TIME: seconds(30) }),
        ]),
      ]),
    );

    expect(new Set(slots.map((s) => s.id)).size).toBe(slots.length);
  });

  it('returns nothing for a missing block', () => {
    expect(buildWorkRestSlots(null)).toEqual([]);
    expect(buildWorkRestSlots(undefined)).toEqual([]);
  });
});

describe('workRestStateAt', () => {
  const twoSlots = slotsOf([30_000, 15_000], [20_000, 10_000]);

  it('counts the room in before the first interval', () => {
    expect(workRestStateAt(0, twoSlots)).toMatchObject({
      phase: 'LEAD_IN',
      slotIndex: -1,
      remainingMs: LEAD_IN_MS,
    });
    expect(workRestStateAt(LEAD_IN_MS - 1, twoSlots).phase).toBe('LEAD_IN');
  });

  it('previews the first exercise during the lead-in', () => {
    expect(workRestStateAt(0, twoSlots).next).toBe(twoSlots[0]);
  });

  it('starts work exactly when the lead-in ends', () => {
    expect(workRestStateAt(LEAD_IN_MS, twoSlots)).toMatchObject({
      phase: 'WORK',
      slotIndex: 0,
      remainingMs: 30_000,
    });
  });

  it('moves into rest at the end of the work interval, not a tick later', () => {
    expect(workRestStateAt(LEAD_IN_MS + 29_999, twoSlots).phase).toBe('WORK');
    expect(workRestStateAt(LEAD_IN_MS + 30_000, twoSlots)).toMatchObject({
      phase: 'REST',
      slotIndex: 0,
      remainingMs: 15_000,
    });
  });

  it('names the next exercise while resting, so the room can get to it', () => {
    expect(workRestStateAt(LEAD_IN_MS + 30_000, twoSlots).next).toBe(
      twoSlots[1],
    );
  });

  it('advances to the next slot when its rest runs out', () => {
    expect(workRestStateAt(LEAD_IN_MS + 45_000, twoSlots)).toMatchObject({
      phase: 'WORK',
      slotIndex: 1,
      remainingMs: 20_000,
    });
  });

  it('has no next slot on the last one', () => {
    expect(workRestStateAt(LEAD_IN_MS + 45_000, twoSlots).next).toBeNull();
  });

  it('is DONE once the last rest has elapsed', () => {
    expect(workRestStateAt(LEAD_IN_MS + 75_000, twoSlots)).toMatchObject({
      phase: 'DONE',
      slotIndex: -1,
      remainingMs: 0,
    });
  });

  it('rolls straight from work into the next work when rest is zero', () => {
    // "30 on, no rest" has to stay unbroken — a zero-length rest must not
    // surface as a REST phase the room would see flash past.
    const unbroken = slotsOf([30_000, 0], [30_000, 0]);

    expect(workRestStateAt(LEAD_IN_MS + 29_999, unbroken)).toMatchObject({
      phase: 'WORK',
      slotIndex: 0,
    });
    expect(workRestStateAt(LEAD_IN_MS + 30_000, unbroken)).toMatchObject({
      phase: 'WORK',
      slotIndex: 1,
      remainingMs: 30_000,
    });
  });

  it('walks slots of different lengths rather than assuming a uniform round', () => {
    const ragged = slotsOf([10_000, 5_000], [40_000, 5_000], [20_000, 0]);

    expect(workRestStateAt(LEAD_IN_MS + 15_000, ragged)).toMatchObject({
      phase: 'WORK',
      slotIndex: 1,
      remainingMs: 40_000,
    });
    expect(workRestStateAt(LEAD_IN_MS + 59_999, ragged)).toMatchObject({
      phase: 'REST',
      slotIndex: 1,
    });
    expect(workRestStateAt(LEAD_IN_MS + 60_000, ragged)).toMatchObject({
      phase: 'WORK',
      slotIndex: 2,
    });
  });

  it('is DONE, not stuck in the lead-in, when a block has no slots', () => {
    expect(workRestStateAt(0, [])).toMatchObject({
      phase: 'DONE',
      slotIndex: -1,
      next: null,
    });
  });

  it('skips a zero-length work interval instead of hanging on it', () => {
    const withEmpty = slotsOf([0, 0], [30_000, 0]);

    expect(workRestStateAt(LEAD_IN_MS, withEmpty)).toMatchObject({
      phase: 'WORK',
      slotIndex: 1,
    });
  });
});

describe('totalWorkRestMs / isRunOver', () => {
  const slots = slotsOf([30_000, 15_000], [20_000, 10_000]);

  it('counts the lead-in as part of the run', () => {
    expect(totalWorkRestMs(slots)).toBe(LEAD_IN_MS + 75_000);
  });

  it('holds the celebration before calling the run over', () => {
    const end = totalWorkRestMs(slots);

    expect(isRunOver(end, slots)).toBe(false);
    expect(isRunOver(end + CELEBRATION_MS - 1, slots)).toBe(false);
    expect(isRunOver(end + CELEBRATION_MS, slots)).toBe(true);
  });
});

describe('countdownSeconds', () => {
  it('shows a partial second as the second it still is', () => {
    expect(countdownSeconds(200)).toBe(1);
    expect(countdownSeconds(1_000)).toBe(1);
    expect(countdownSeconds(1_001)).toBe(2);
  });

  it('never goes below zero', () => {
    expect(countdownSeconds(0)).toBe(0);
    expect(countdownSeconds(-500)).toBe(0);
  });
});

describe('currentWorkRestBlock', () => {
  const timed = block([entry('e1', 0, 'Burpee', [set('s1', 0, {})])], {
    mode: 'WORK_REST',
    index: 1,
  });
  const normal = {
    ...block([entry('n1', 0, 'Press', [set('ns1', 0, {})])], {
      mode: 'NORMAL',
      index: 0,
    }),
    id: 'block-0',
  };

  /** The two blocks with these statuses on their exercises (n1, e1). */
  const withStatus = (statuses: Record<string, string>) => ({
    blocks: [normal, timed].map((b) => ({
      ...b,
      exercises: b.exercises.map((e) => ({
        ...e,
        status: (statuses[e.id] ?? 'PENDING') as 'PENDING',
      })),
    })),
  });

  it('picks the timed block once the earlier block is finished', () => {
    const found = currentWorkRestBlock(withStatus({ n1: 'COMPLETED' }));

    expect(found?.id).toBe('block-1');
  });

  it('does not run ahead to a timed block while an earlier one is pending', () => {
    // The card would otherwise show one block's table and another's clock.
    expect(currentWorkRestBlock(withStatus({}))).toBeNull();
  });

  it('returns null when the current block is a normal one', () => {
    expect(currentWorkRestBlock({ blocks: [normal] })).toBeNull();
  });

  it('treats a skipped exercise as resolved, like the rest of the wall', () => {
    const found = currentWorkRestBlock(withStatus({ n1: 'SKIPPED' }));

    expect(found?.id).toBe('block-1');
  });

  it('is null once every block is done', () => {
    const done = currentWorkRestBlock(
      withStatus({ n1: 'COMPLETED', e1: 'COMPLETED' }),
    );

    expect(done).toBeNull();
  });

  it('handles a missing template or progress', () => {
    expect(currentWorkRestBlock(null)).toBeNull();
    expect(currentWorkRestBlock({ blocks: [] })).toBeNull();
  });
});
