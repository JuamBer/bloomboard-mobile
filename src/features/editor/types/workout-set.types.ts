import type {
  EditorSet,
  RecordDetail,
  RecordKind,
  SetMetrics,
  SetType,
} from '@shared/types/api.types';
import type { UpsertWorkoutSetPayload } from '@shared/api/services/workout-templates.service';
import type { UpsertWorkoutExerciseSetPayload } from '@shared/api/services/workouts.service';
import type { EditorKind } from '../lib/editor-source';
import { toStoredMetrics } from '@shared/lib/unit-system';

/** Working copy of a set/sub-set while it's being edited in the UI. */
export interface EditableWorkoutSet {
  id?: string;
  /** The row's identity on screen. The server recreates every set row on
   *  each save, so `id` changes under a field being typed in; keyed by it,
   *  the row remounted and the keyboard's focus fell elsewhere (the notes).
   *  Seeded from the id and carried across server copies (`withRowKeys`);
   *  never sent. */
  key?: string;
  setType: SetType;
  /** A plan's targets, or — in a workout — what was done (exact values). */
  metrics: SetMetrics;
  /** A coach's comment on this one set (a plan), or the trainee's (a
   *  workout); empty = none. */
  notes?: string;
  /** A workout's: the plan's comment, shown as the comment's placeholder. */
  planNotes?: string | null;
  subSets?: EditableWorkoutSet[];
  /** A workout's: the plan's value, shown as the placeholder. */
  targetMetrics?: SetMetrics | null;
  /** A workout's: ticked as done. */
  completed?: boolean;
  /** A workout's: the records it set, as last saved. */
  records?: RecordKind[];
  recordDetails?: RecordDetail[];
}

export const toEditableSet = (set: EditorSet): EditableWorkoutSet => ({
  id: set.id,
  key: set.id,
  setType: set.setType,
  metrics: set.metrics,
  notes: set.notes ?? '',
  subSets: set.subSets?.map(toEditableSet),
  ...(set.targetMetrics !== undefined || set.completedAt !== undefined
    ? {
        targetMetrics: set.targetMetrics ?? null,
        planNotes: set.planNotes ?? null,
        completed: !!set.completedAt,
        records: set.records ?? [],
        recordDetails: set.recordDetails ?? [],
      }
    : {}),
});

/** A row's key: its own, else its id (a set added here carries a client id). */
export const rowKey = (set: EditableWorkoutSet, index: number) =>
  set.key ?? set.id ?? `row-${index}`;

/**
 * A server copy taken into a draft keeps the draft's row keys, position by
 * position (a save never reorders), so no row remounts when the server hands
 * back new set ids — the same goes for sub-sets.
 */
export function withRowKeys(
  previous: EditableWorkoutSet[],
  next: EditableWorkoutSet[],
): EditableWorkoutSet[] {
  return next.map((set, i) => {
    const before = previous[i];
    if (!before) return set;
    return {
      ...set,
      key: rowKey(before, i),
      ...(set.subSets
        ? { subSets: withRowKeys(before.subSets ?? [], set.subSets) }
        : {}),
    };
  });
}

export const toUpsertPayload = (
  set: EditableWorkoutSet,
): UpsertWorkoutSetPayload => ({
  setType: set.setType,
  // An editor shows values in the viewer's units; what nobody touched is
  // saved exactly as it was stored (shared/lib/unit-system.ts).
  metrics: toStoredMetrics(set.metrics),
  notes: set.notes?.trim() || null,
  subSets: set.subSets?.map(toUpsertPayload),
});

/** What a workout logs per metric: the value and its unit, never a mode. */
export const loggedValues = (metrics: SetMetrics) =>
  Object.fromEntries(
    Object.entries(metrics).map(([key, v]) => [
      key,
      {
        value: v?.value === '' || v?.value === undefined ? null : v.value,
        ...(v?.unit ? { unit: v.unit } : {}),
      },
    ]),
  );

export const toWorkoutSetPayload = (
  set: EditableWorkoutSet,
): UpsertWorkoutExerciseSetPayload => ({
  setType: set.setType,
  metrics: loggedValues(toStoredMetrics(set.metrics)),
  targetMetrics: toStoredMetrics(set.targetMetrics ?? null),
  notes: set.notes?.trim() || null,
  planNotes: set.planNotes ?? null,
  completed: !!set.completed,
  subSets: set.subSets?.map(toWorkoutSetPayload),
});

/** The set payload for whichever document the editor is editing. */
export const toSetPayload = (kind: EditorKind) =>
  kind === 'workout' ? toWorkoutSetPayload : toUpsertPayload;
