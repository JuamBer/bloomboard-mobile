import type {
  CompositeMetric,
  Metric,
  SetMetrics,
  EditorBlock,
  EditorExercise,
} from '@shared/types/api.types';
import {
  buildSlots,
  memberLetter,
  slotLabel,
  superSetMembers,
} from '@features/editor/lib/superset-sequence';
import { metricSeconds } from '@features/editor/lib/workout-time';
import { exerciseMedia } from '@shared/lib/exercise-media';

// Ported from the web (bloomboard-frontend src/widgets/tv/work-rest-timeline.ts),
// where the TV runs on it; the member's Work/Rest player runs on this copy.
// Keep the two in step — the same block must time the same on the wall and on
// a phone. Only the demo's size differs: 'large' (720p) is plenty on a phone,
// where the wall's 'full' (1080p) gif would only cost data.
function demoMedia(exercise: {
  gifUrls?: string[];
  imageUrls?: string[];
}): string | null {
  return (
    exerciseMedia(exercise.gifUrls, 'large') ??
    exerciseMedia(exercise.imageUrls, 'large') ??
    null
  );
}

// The clock a WORK_REST block runs on.
//
// Everything here is a pure function of elapsed milliseconds, exactly like the
// gif spotlight (tv-gif-spotlight.ts). Nothing chains timers and nothing is
// stored per-tick, which is what lets a TV that reloads mid-run — or one that
// joins the room late — land on the right exercise with the right seconds
// remaining, from a single server timestamp.
//
// See specs/work-rest-mode.md.

/** Seconds of "3… 2… 1… ¡VAMOS!" before the first work interval.
 *  Mirrored by WORK_REST_LEAD_IN_MS on the server, which prices a run. */
export const LEAD_IN_MS = 3_000;

/** How long the completion flourish holds before the card moves on. Mirrored by
 *  WORK_REST_CELEBRATION_MS on the server, which waits it out before retiring
 *  the run — so the write lands just after the room stops celebrating. */
export const CELEBRATION_MS = 3_000;

export interface WorkRestSlot {
  /** Stable id for animation keys: entry + set. */
  id: string;
  exerciseEntryId: string;
  name: string;
  media: string | null;
  /** Super-set member letter (A, B, C…), or null for a plain exercise. */
  letter: string | null;
  /** What the rail prints: "A1" in a super-set, "3" otherwise. */
  label: string;
  workMs: number;
  restMs: number;
  /** Everything that is not TIME/REST: reps, RPE, weight… Rendered as chips
   *  beside the demo, so a timed block can still carry a load or a target. */
  extraMetrics: SetMetrics;
  /** The owning entry's metric definitions + resolved column order, so the
   *  chips are labelled and ordered exactly as everywhere else on the wall
   *  (see formatSetMetricChips). */
  metricDefs: Metric[];
  compositeDefs: CompositeMetric[];
  metricOrder: string[];
}

export type WorkRestPhase =
  /** Block is up but the trainer has not started it — the wall shows the first
   *  exercise and tells the room to wait. */
  'WAITING' | 'LEAD_IN' | 'WORK' | 'REST' | 'DONE';

export interface WorkRestState {
  phase: WorkRestPhase;
  /** Index into the slot list; -1 during the lead-in and when done. */
  slotIndex: number;
  /** Milliseconds left in the current phase (0 when done). */
  remainingMs: number;
  /** The slot that follows the current one — what the rest screen previews. */
  next: WorkRestSlot | null;
}

const OMITTED_METRICS = new Set(['TIME', 'REST']);

function extraMetricsOf(metrics: SetMetrics | undefined): SetMetrics {
  const out: SetMetrics = {};
  for (const [key, value] of Object.entries(metrics ?? {})) {
    if (!OMITTED_METRICS.has(key)) out[key] = value;
  }
  return out;
}

function exerciseName(entry: EditorExercise): string {
  return entry.customName?.trim() || entry.exercise.name;
}

/**
 * Flattens a block into the ordered list of intervals the room performs.
 *
 * A super-set contributes its *sequence*, not its exercises: the flexible model
 * stores one set per performed slot with a `superSetOrder`, so
 * "Ex1-set1, Ex2-set2, Ex3-set3, Ex1-set4…" is already in the data and only has
 * to be read out (see lib/superset-sequence.ts). That is the 80% case for this
 * mode, so getting it from the same helper the editor and the wall use is what
 * keeps the three surfaces from drifting.
 *
 * Plain exercises contribute their sets in order. Groups are emitted at the
 * position of their first member, so a block can mix both.
 */
export function buildWorkRestSlots(
  block: EditorBlock | null | undefined,
): WorkRestSlot[] {
  if (!block) return [];

  const entries = [...(block.exercises ?? [])].sort(
    (a, b) => a.order - b.order,
  );
  const groups = block.superSetGroups ?? [];
  const slots: WorkRestSlot[] = [];
  const emittedGroups = new Set<string>();

  for (const entry of entries) {
    const group = groups.find((g) => g.id === entry.superSetGroupId);

    if (group) {
      if (emittedGroups.has(group.id)) continue;
      emittedGroups.add(group.id);

      const members = superSetMembers(entries, group.id);
      const groupSlots = buildSlots(members);
      groupSlots.forEach((slot, index) => {
        const member = members.find((m) => m.id === slot.entryId);
        if (!member) return;
        slots.push({
          id: `${slot.entryId}:${slot.set.id ?? index}`,
          exerciseEntryId: slot.entryId,
          name: exerciseName(member),
          media: demoMedia(member.exercise),
          letter: memberLetter(slot.entryId, members),
          label: slotLabel(groupSlots, index, members),
          workMs: metricSeconds(slot.set.metrics?.TIME) * 1000,
          restMs: metricSeconds(slot.set.metrics?.REST) * 1000,
          extraMetrics: extraMetricsOf(slot.set.metrics),
          metricDefs: member.metrics ?? [],
          compositeDefs: member.compositeMetrics ?? [],
          metricOrder: member.resolvedMetricOrder ?? [],
        });
      });
      continue;
    }

    const sets = [...(entry.sets ?? [])].sort((a, b) => a.order - b.order);
    sets.forEach((set, i) => {
      slots.push({
        id: `${entry.id}:${set.id}`,
        exerciseEntryId: entry.id,
        name: exerciseName(entry),
        media: demoMedia(entry.exercise),
        letter: null,
        label: String(i + 1),
        workMs: metricSeconds(set.metrics?.TIME) * 1000,
        restMs: metricSeconds(set.metrics?.REST) * 1000,
        extraMetrics: extraMetricsOf(set.metrics),
        metricDefs: entry.metrics ?? [],
        compositeDefs: entry.compositeMetrics ?? [],
        metricOrder: entry.resolvedMetricOrder ?? [],
      });
    });
  }

  return slots;
}

/** Total run length including the lead-in, for the progress rail. */
export function totalWorkRestMs(slots: WorkRestSlot[]): number {
  return slots.reduce((acc, s) => acc + s.workMs + s.restMs, LEAD_IN_MS);
}

/**
 * Where the run is at `elapsedMs`.
 *
 * Walks the slot list rather than indexing arithmetically because every slot can
 * have its own work and rest length — a Tabata is uniform, but a trainer is free
 * to make the last round longer, and the room should still be in sync.
 *
 * A slot with `restMs` of 0 rolls straight into the next work interval, which is
 * what makes an unbroken "30s on, no rest" circuit behave correctly.
 */
export function workRestStateAt(
  elapsedMs: number,
  slots: WorkRestSlot[],
): WorkRestState {
  if (!slots.length) {
    return { phase: 'DONE', slotIndex: -1, remainingMs: 0, next: null };
  }

  if (elapsedMs < LEAD_IN_MS) {
    return {
      phase: 'LEAD_IN',
      slotIndex: -1,
      remainingMs: LEAD_IN_MS - elapsedMs,
      next: slots[0],
    };
  }

  let cursor = elapsedMs - LEAD_IN_MS;

  for (let i = 0; i < slots.length; i++) {
    const slot = slots[i];
    const next = slots[i + 1] ?? null;

    if (cursor < slot.workMs) {
      return {
        phase: 'WORK',
        slotIndex: i,
        remainingMs: slot.workMs - cursor,
        next,
      };
    }
    cursor -= slot.workMs;

    if (cursor < slot.restMs) {
      return {
        phase: 'REST',
        slotIndex: i,
        remainingMs: slot.restMs - cursor,
        next,
      };
    }
    cursor -= slot.restMs;
  }

  return { phase: 'DONE', slotIndex: -1, remainingMs: 0, next: null };
}

/**
 * The phase of a block at `elapsedMs`, or WAITING when idle.
 *
 * A convenience for callers that only need to know *which* state a card is in —
 * ClientCard paints the whole column green on DONE — without rebuilding the
 * full state the panel draws from.
 */
export function workRestPhaseAt(
  block: EditorBlock | null | undefined,
  elapsedMs: number | null,
): WorkRestPhase {
  if (!block) return 'WAITING';
  if (elapsedMs === null) return 'WAITING';
  return workRestStateAt(elapsedMs, buildWorkRestSlots(block)).phase;
}

/** True once the run has finished AND the celebration has been seen.
 *
 *  This is the TV's cue to refetch: the server retires a finished run on any
 *  ordinary read (see ControlService.finalizeFinishedRuns), so the refetch is
 *  what turns the client's local clock into the authoritative write. The TV
 *  never writes anything itself — it is public and unauthenticated. */
export function isRunOver(elapsedMs: number, slots: WorkRestSlot[]): boolean {
  return elapsedMs >= totalWorkRestMs(slots) + CELEBRATION_MS;
}

/** Whole seconds to show on a countdown: 0.2s left still reads "1". */
export function countdownSeconds(remainingMs: number): number {
  return Math.max(0, Math.ceil(remainingMs / 1000));
}

/**
 * The timed block a client is currently on, or null.
 *
 * "Current" is the first block that still holds a PENDING exercise — the same
 * rule the rest of the wall advances by (see tvVisibleExercises), so a card
 * cannot be showing one block's table and another block's clock. A run only
 * takes a card over when that block happens to be WORK_REST; everyone else on
 * the screen keeps their normal render.
 */
export function currentWorkRestBlock(
  workout: { blocks?: EditorBlock[] | null } | null | undefined,
): EditorBlock | null {
  const block = [...(workout?.blocks ?? [])]
    .sort((a, b) => a.index - b.index)
    .find((b) =>
      (b.exercises ?? []).some((e) => (e.status ?? 'PENDING') === 'PENDING'),
    );

  return block?.mode === 'WORK_REST' ? block : null;
}
