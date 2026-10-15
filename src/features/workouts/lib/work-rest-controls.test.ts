import { describe, expect, it } from '@jest/globals';
import {
  phaseStarts,
  RESTART_AFTER_MS,
  runElapsedMs,
  skipTarget,
  withRunAt,
  withRunPaused,
  workedSeconds,
} from './work-rest-controls';
import { LEAD_IN_MS, type WorkRestSlot } from './work-rest-timeline';

const slot = (id: string, workS: number, restS: number): WorkRestSlot => ({
  id,
  exerciseEntryId: id.split(':')[0],
  name: id,
  media: null,
  letter: null,
  label: id,
  workMs: workS * 1000,
  restMs: restS * 1000,
  extraMetrics: {},
  metricDefs: [],
  compositeDefs: [],
  metricOrder: [],
});

// 30 s on / 15 s off, then 20 s with no rest.
const slots = [slot('a:1', 30, 15), slot('b:1', 20, 0)];
const L = LEAD_IN_MS;

describe('phaseStarts', () => {
  it('lists the lead-in, each work and rest, and the end', () => {
    expect(phaseStarts(slots)).toEqual([
      0,
      L,
      L + 30_000,
      L + 45_000,
      L + 65_000,
    ]);
  });
});

describe('skipTarget', () => {
  it('goes forward to the next interval, and to the end from the last', () => {
    expect(skipTarget(L + 5_000, slots, 'forward')).toBe(L + 30_000);
    expect(skipTarget(L + 50_000, slots, 'forward')).toBe(L + 65_000);
  });

  it('restarts the interval under way, or goes to the one before near its start', () => {
    expect(skipTarget(L + 10_000, slots, 'back')).toBe(L);
    expect(skipTarget(L + 30_000 + RESTART_AFTER_MS - 500, slots, 'back')).toBe(
      L,
    );
    expect(skipTarget(500, slots, 'back')).toBe(0);
  });
});

describe('workedSeconds', () => {
  it('counts a work interval run to its end as planned', () => {
    const done = workedSeconds(slots, [[0, L + 65_000]]);
    expect(done.map((d) => [d.slot.id, d.seconds])).toEqual([
      ['a:1', 30],
      ['b:1', 20],
    ]);
  });

  it('counts what was done of one skipped with "next"', () => {
    // 12 s into the first, skipped to its rest, then run to the end.
    const done = workedSeconds(slots, [
      [0, L + 12_000],
      [L + 30_000, L + 65_000],
    ]);
    expect(done.map((d) => d.seconds)).toEqual([12, 20]);
  });

  it('keeps the longer run of an interval done twice', () => {
    const done = workedSeconds(slots, [
      [0, L + 8_000],
      [L, L + 30_000],
    ]);
    expect(done[0].seconds).toBe(30);
  });

  it('leaves out what was never worked', () => {
    expect(workedSeconds(slots, [[0, L - 500]])).toEqual([]);
  });
});

// A session's 60 s run started at t = 0: the server's pause and skip, as the
// phone's optimistic copy applies them (backend work-rest.util.ts).
const at = (n: number) => new Date(n).toISOString();
const run = (pausedAt: number | null = null) => ({
  workRestStartedAt: at(0),
  workRestEndsAt: at(60_000),
  workRestPausedAt: pausedAt === null ? null : at(pausedAt),
});

describe('the run clock', () => {
  it('stands still while paused and carries on from the same second', () => {
    const paused = withRunPaused(run(), true, 20_000);
    expect(runElapsedMs(paused, 45_000)).toBe(20_000);
    const resumed = withRunPaused(paused, false, 50_000);
    expect(resumed.workRestPausedAt).toBeNull();
    expect(runElapsedMs(resumed, 50_000)).toBe(20_000);
    expect(resumed.workRestEndsAt).toBe(at(90_000));
  });

  it('lands on the interval asked for, staying paused if it was', () => {
    expect(runElapsedMs(withRunAt(run(), 33_000, 20_000), 20_000)).toBe(33_000);
    const paused = withRunAt(run(20_000), 8_000, 40_000);
    expect(paused.workRestPausedAt).toBe(at(20_000));
    expect(runElapsedMs(paused, 40_000)).toBe(8_000);
  });

  it('plays the finish when skipped to the end, even from a pause', () => {
    const end = withRunAt(run(20_000), 90_000, 40_000);
    expect(end.workRestPausedAt).toBeNull();
    expect(runElapsedMs(end, 40_000)).toBe(60_000);
  });
});
