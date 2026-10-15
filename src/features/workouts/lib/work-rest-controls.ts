import { LEAD_IN_MS, type WorkRestSlot } from './work-rest-timeline';

// The member's Work/Rest player on top of the TV's timeline (app 2.6.0): skip
// to the previous or next interval, how long each work interval was actually
// trained (to log as its set's TIME), and — in a session — the run's clock as
// the server keeps it, which the board and the TV read too. The web has the
// same skip and clock (bloomboard-frontend widgets/tv/work-rest-run.ts); the
// logging is the app's own.

/** Where each interval begins on the run's clock, in order: the lead-in,
 *  then each slot's work and (when it has one) rest; the run's end last. */
export function phaseStarts(slots: WorkRestSlot[]): number[] {
  const starts = [0];
  let at = LEAD_IN_MS;
  for (const slot of slots) {
    starts.push(at);
    at += slot.workMs;
    if (slot.restMs > 0) {
      starts.push(at);
      at += slot.restMs;
    }
  }
  starts.push(at);
  return [...new Set(starts)];
}

/** Into an interval this far, "back" restarts it; earlier, it goes to the
 *  one before — a music player's back button. */
export const RESTART_AFTER_MS = 2_000;

/** The clock position a skip lands on. */
export function skipTarget(
  elapsedMs: number,
  slots: WorkRestSlot[],
  direction: 'back' | 'forward',
): number {
  const starts = phaseStarts(slots);
  const end = starts[starts.length - 1];
  if (direction === 'forward') {
    return starts.find((s) => s > elapsedMs) ?? end;
  }
  const current = [...starts].reverse().find((s) => s <= elapsedMs) ?? 0;
  if (elapsedMs - current > RESTART_AFTER_MS) return current;
  return [...starts].reverse().find((s) => s < current) ?? 0;
}

/** A session's run as the API sends it (MemberSessionDetail.sessionUser). */
export interface RunFields {
  workRestStartedAt?: string | null;
  workRestEndsAt?: string | null;
  workRestPausedAt?: string | null;
}

const iso = (ms: number) => new Date(ms).toISOString();
const ms = (value: string) => new Date(value).getTime();

/** Milliseconds into the run at `now`, or null when there is none. */
export function runElapsedMs(run: RunFields, now: number): number | null {
  if (!run.workRestStartedAt) return null;
  const until = run.workRestPausedAt ? ms(run.workRestPausedAt) : now;
  return Math.max(0, until - ms(run.workRestStartedAt));
}

/** Paused at `now`, or resumed with its origin and end moved on by the
 *  pause — what the server does (backend work-rest.util.ts), for the
 *  optimistic copy. */
export function withRunPaused<T extends RunFields>(
  run: T,
  paused: boolean,
  now: number,
): T {
  const { workRestStartedAt: startedAt, workRestEndsAt: endsAt } = run;
  if (!startedAt || !endsAt) return run;
  if (paused) {
    return run.workRestPausedAt || ms(endsAt) <= now
      ? run
      : { ...run, workRestPausedAt: iso(now) };
  }
  if (!run.workRestPausedAt) return run;
  const stood = now - ms(run.workRestPausedAt);
  return {
    ...run,
    workRestStartedAt: iso(ms(startedAt) + stood),
    workRestEndsAt: iso(ms(endsAt) + stood),
    workRestPausedAt: null,
  };
}

/** Landed on `elapsedMs` of its timeline; paused it stays paused, landed on
 *  its end it runs again so the finish plays. */
export function withRunAt<T extends RunFields>(
  run: T,
  elapsedMs: number,
  now: number,
): T {
  const { workRestStartedAt: startedAt, workRestEndsAt: endsAt } = run;
  if (!startedAt || !endsAt) return run;
  const total = ms(endsAt) - ms(startedAt);
  const target = Math.min(Math.max(0, Math.round(elapsedMs)), total);
  const atEnd = target >= total;
  const base = atEnd || !run.workRestPausedAt ? now : ms(run.workRestPausedAt);
  return {
    ...run,
    workRestStartedAt: iso(base - target),
    workRestEndsAt: iso(base - target + total),
    workRestPausedAt: atEnd ? null : (run.workRestPausedAt ?? null),
  };
}

/** A stretch the clock ran without a skip: [from, to) on the run's clock. */
export type ClockRun = [from: number, to: number];

/**
 * Seconds of work trained in each slot, from the stretches the clock ran.
 * A work interval run to its end counts its planned length; one skipped
 * ("Siguiente") counts what was done. Gone through twice (back, then again),
 * the longer run counts — the member redid it, not added to it. Slots never
 * worked are left out.
 */
export function workedSeconds(
  slots: WorkRestSlot[],
  runs: ClockRun[],
): { slot: WorkRestSlot; seconds: number }[] {
  const out: { slot: WorkRestSlot; seconds: number }[] = [];
  let at = LEAD_IN_MS;
  for (const slot of slots) {
    const start = at;
    const end = at + slot.workMs;
    let best = 0;
    for (const [from, to] of runs) {
      best = Math.max(best, Math.min(to, end) - Math.max(from, start));
    }
    const seconds = Math.round(best / 1000);
    if (seconds > 0) out.push({ slot, seconds });
    at = end + slot.restMs;
  }
  return out;
}
