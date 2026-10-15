import { useEffect, useRef } from 'react';
import { create } from 'zustand';
import type { PreviousSet } from '@shared/types/api.types';
import { withPlaceholderValues } from '@features/editor/lib/workout-cells';
import type { EditableWorkoutSet } from '@features/editor/types/workout-set.types';

/**
 * What the Work/Rest player trained, handed to the sets that hold it (app
 * 2.6.0). The player does not write the workout itself: the exercise cards
 * own their sets' drafts and autosave them, and a write behind their backs
 * would be overwritten by the next save of a card with an edit pending. So
 * the player leaves the times here when it closes, and each card takes its
 * own into its draft — as if ticked by hand — and saves at once.
 */
export interface WorkRestTime {
  entryId: string;
  /** The set's id when the player read it… */
  setId: string;
  /** …and its place among its exercise's sets (by order), for a card whose
   *  draft has not taken the server's new ids in yet. */
  setIndex: number;
  seconds: number;
}

interface WorkRestLogState {
  pending: WorkRestTime[];
  push: (times: WorkRestTime[]) => void;
  /** Removes and returns the times of these exercises. */
  take: (entryIds: string[]) => WorkRestTime[];
}

export const useWorkRestLog = create<WorkRestLogState>((set, get) => ({
  pending: [],
  push: (times) =>
    times.length && set({ pending: [...get().pending, ...times] }),
  take: (entryIds) => {
    const mine = get().pending.filter((p) => entryIds.includes(p.entryId));
    if (mine.length)
      set({
        pending: get().pending.filter((p) => !entryIds.includes(p.entryId)),
      });
    return mine;
  },
}));

/**
 * Hands a card the times of its exercises as the player leaves them — from
 * the store's own notification, so the card sets its draft in a callback,
 * not in an effect's body. `onTimes` is read when they arrive (the card's
 * latest draft and metrics).
 */
export function useWorkRestTimes(
  entryIds: string[],
  enabled: boolean,
  onTimes: (times: WorkRestTime[]) => void,
) {
  const handler = useRef(onTimes);
  useEffect(() => {
    handler.current = onTimes;
  });
  const key = entryIds.join(',');
  useEffect(() => {
    if (!enabled) return;
    const ids = key.split(',');
    return useWorkRestLog.subscribe((state) => {
      if (!state.pending.some((p) => ids.includes(p.entryId))) return;
      const times = useWorkRestLog.getState().take(ids);
      if (times.length) handler.current(times);
    });
  }, [key, enabled]);
}

const SECONDS_PER_UNIT: Record<string, number> = {
  SECONDS: 1,
  MINUTES: 60,
  HOURS: 3600,
};

/** Where a time lands: the set with its id, else the one at its place. */
export const setIndexFor = (
  sets: { id?: string }[],
  time: Pick<WorkRestTime, 'setId' | 'setIndex'>,
) => {
  const byId = sets.findIndex((s) => s.id === time.setId);
  if (byId >= 0) return byId;
  return time.setIndex < sets.length ? time.setIndex : -1;
};

/**
 * One set with the time it was trained: TIME takes it (in the unit the set
 * already uses, seconds by default) and the set is ticked the way a tick in
 * the table does — the other empty fields take their hints (the plan's,
 * else last time's). A set already ticked keeps its tick and only takes the
 * time.
 */
export function withWorkedTime(
  set: EditableWorkoutSet,
  seconds: number,
  opts: {
    /** The columns a tick fills (not the plan-only ones). */
    keys: string[];
    previousSets?: PreviousSet[];
    /** This set's place among its exercise's, for last time's hints. */
    index: number;
    unitOf: (key: string) => string | undefined;
  },
): EditableWorkoutSet {
  const unit =
    set.metrics.TIME?.unit ?? set.targetMetrics?.TIME?.unit ?? 'SECONDS';
  const per = SECONDS_PER_UNIT[unit] ?? 1;
  const timed: EditableWorkoutSet = {
    ...set,
    metrics: {
      ...set.metrics,
      TIME: { value: Math.round((seconds / per) * 100) / 100, unit },
    },
  };
  if (set.completed) return timed;
  const filled = withPlaceholderValues(timed, opts.keys, {
    previousSets: opts.previousSets,
    index: opts.index,
    unitOf: opts.unitOf,
  });
  return {
    ...filled,
    completed: true,
    subSets: filled.subSets?.map((sub) => ({ ...sub, completed: true })),
  };
}
