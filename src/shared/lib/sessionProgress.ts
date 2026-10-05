import type {
  EditorBlock,
  EditorExercise,
  ExerciseProgressStatus,
} from '@shared/types/api.types';
import {
  groupedExercises,
  memberLetter,
  superSetMembers,
  superSetSlotLabels,
} from '@features/editor/lib/superset-sequence';

export interface FlatExercise {
  exercise: EditorExercise;
  /** Null for loose exercises (no block). */
  blockName: string | null;
  blockColor: string | null;
  status: ExerciseProgressStatus;
  /** Set when the exercise belongs to a super-set: the group's colour and this
   *  exercise's letter within it. Both are what tie it to its partners. */
  superSet?: { color: string; letter: string };
  /** setId → "A1" for this exercise's sets, so every surface can show which
   *  position of the sequence each set is. Empty when not in a super-set. */
  slotLabels: Map<string, string>;
}

/** Just what the flattening reads: a workout (or any tree with blocks). Each
 *  exercise carries its own status; none means not started. */
export interface SessionWorkout {
  blocks?: EditorBlock[] | null;
}

/** The status of an exercise of a workout — PENDING until marked. */
export const statusOf = (exercise: EditorExercise): ExerciseProgressStatus =>
  exercise.status ?? 'PENDING';

// Flattens a workout into a single ordered exercise list (by block.index, then
// exercise.order), each with its status — the order it is trained in.
export function flattenExercises(
  workout: SessionWorkout | null | undefined,
): FlatExercise[] {
  const blocks = workout?.blocks ?? [];
  return [...blocks]
    .sort((a, b) => a.index - b.index)
    .flatMap((block) => {
      const ordered = [...block.exercises].sort((a, b) => a.order - b.order);
      const groups = block.superSetGroups ?? [];
      const slotLabels = superSetSlotLabels(
        ordered,
        groups.map((g) => g.id),
      );
      // Super-set members are kept adjacent, so a group is never split by
      // whatever else sits between them in the block order — and a windowed
      // view (the TV) never shows half a super-set.
      return groupedExercises(ordered).map((exercise) => {
        const group = groups.find((g) => g.id === exercise.superSetGroupId);
        return {
          exercise,
          blockName: block.name,
          blockColor: block.color,
          status: statusOf(exercise),
          superSet: group && {
            color: group.color,
            letter: memberLetter(
              exercise.id,
              superSetMembers(ordered, group.id),
            ),
          },
          slotLabels,
        };
      });
    });
}

/** The exercises a mark lands on. A super-set is completed as one, so marking
 *  any member marks the whole group — the server expands it the same way
 *  (applyExerciseStatus); anything else is just itself. Hosts use it to
 *  mirror the write optimistically and to judge what it finishes. */
export function markTargetIds(
  workout: SessionWorkout | null | undefined,
  exerciseId: string,
): string[] {
  for (const block of workout?.blocks ?? []) {
    const entry = block.exercises.find((e) => e.id === exerciseId);
    if (!entry) continue;
    return entry.superSetGroupId
      ? block.exercises
          .filter((e) => e.superSetGroupId === entry.superSetGroupId)
          .map((e) => e.id)
      : [exerciseId];
  }
  return [exerciseId];
}

/**
 * The workout as a mark leaves it, for an optimistic update: the targets take
 * the status, and their sets the tick that goes with it (completing ticks the
 * open sets, reopening unticks all, skipping leaves them) — the server's rule.
 */
export function withMarked<W extends SessionWorkout>(
  workout: W,
  exerciseId: string,
  status: ExerciseProgressStatus,
): W {
  const targets = new Set(markTargetIds(workout, exerciseId));
  const now = new Date().toISOString();
  const tick = <S extends { completedAt?: string | null }>(set: S): S =>
    status === 'COMPLETED'
      ? { ...set, completedAt: set.completedAt ?? now }
      : status === 'PENDING'
        ? { ...set, completedAt: null }
        : set;
  return {
    ...workout,
    blocks: (workout.blocks ?? []).map((block) => ({
      ...block,
      exercises: block.exercises.map((e) =>
        targets.has(e.id)
          ? {
              ...e,
              status,
              completedAt: status === 'COMPLETED' ? now : null,
              sets: e.sets.map((set) => ({
                ...tick(set),
                subSets: set.subSets?.map(tick),
              })),
            }
          : e,
      ),
    })),
  };
}

// Index of the current exercise: the first one still PENDING (completed/skipped
// ones are considered done). Returns -1 when every exercise is resolved.
export function currentExerciseIndex(flat: FlatExercise[]): number {
  return flat.findIndex((f) => f.status === 'PENDING');
}

export interface ProgressSummary {
  done: number;
  total: number;
}

export function progressSummary(flat: FlatExercise[]): ProgressSummary {
  const done = flat.filter((f) => f.status !== 'PENDING').length;
  return { done, total: flat.length };
}
