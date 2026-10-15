import { describe, expect, it } from '@jest/globals';
import type { EditableWorkoutSet } from '@features/editor/types/workout-set.types';
import { setIndexFor, useWorkRestLog, withWorkedTime } from './work-rest-log';

const set = (extra: Partial<EditableWorkoutSet> = {}): EditableWorkoutSet => ({
  id: 's1',
  setType: 'NORMAL',
  metrics: { TIME: { value: null, unit: 'SECONDS' }, REPS: { value: null } },
  targetMetrics: {
    TIME: { mode: 'EXACT', value: 30, unit: 'SECONDS' },
    REPS: { mode: 'EXACT', value: 12 },
  },
  completed: false,
  ...extra,
});

const opts = { keys: ['TIME', 'REPS'], index: 0, unitOf: () => undefined };

describe('withWorkedTime — a Work/Rest interval logged on its set', () => {
  it('logs the time trained and ticks the set, hints filled as a tick does', () => {
    const out = withWorkedTime(set(), 22, opts);
    expect(out.metrics.TIME).toEqual({ value: 22, unit: 'SECONDS' });
    expect(out.metrics.REPS).toEqual({ value: 12 });
    expect(out.completed).toBe(true);
  });

  it('writes the time in the unit the set uses', () => {
    const out = withWorkedTime(
      set({ metrics: { TIME: { value: null, unit: 'MINUTES' } } }),
      90,
      opts,
    );
    expect(out.metrics.TIME).toEqual({ value: 1.5, unit: 'MINUTES' });
  });

  it('leaves a set already ticked as it was, but for the time', () => {
    const done = set({
      completed: true,
      metrics: { TIME: { value: 30, unit: 'SECONDS' }, REPS: { value: 10 } },
    });
    const out = withWorkedTime(done, 18, opts);
    expect(out.metrics).toEqual({
      TIME: { value: 18, unit: 'SECONDS' },
      REPS: { value: 10 },
    });
  });
});

describe('setIndexFor', () => {
  it('finds the set by id, else by its place', () => {
    const sets = [{ id: 'a' }, { id: 'b' }];
    expect(setIndexFor(sets, { setId: 'b', setIndex: 0 })).toBe(1);
    expect(setIndexFor(sets, { setId: 'gone', setIndex: 1 })).toBe(1);
    expect(setIndexFor(sets, { setId: 'gone', setIndex: 5 })).toBe(-1);
  });
});

describe('useWorkRestLog', () => {
  it('hands each exercise its own times, once', () => {
    const log = useWorkRestLog.getState();
    log.push([
      { entryId: 'e1', setId: 'a', setIndex: 0, seconds: 30 },
      { entryId: 'e2', setId: 'b', setIndex: 0, seconds: 20 },
    ]);
    expect(log.take(['e1']).map((t) => t.seconds)).toEqual([30]);
    expect(useWorkRestLog.getState().take(['e1'])).toEqual([]);
    expect(useWorkRestLog.getState().pending).toHaveLength(1);
  });
});
