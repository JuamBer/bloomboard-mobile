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

/** Working copy of a set/sub-set while it's being edited in the UI. */
export interface EditableWorkoutSet {
  id?: string;
  setType: SetType;
  /** A plan's targets, or — in a workout — what was done (exact values). */
  metrics: SetMetrics;
  /** A coach's comment on this one set; empty = none. */
  notes?: string;
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
  setType: set.setType,
  metrics: set.metrics,
  notes: set.notes ?? '',
  subSets: set.subSets?.map(toEditableSet),
  ...(set.targetMetrics !== undefined || set.completedAt !== undefined
    ? {
        targetMetrics: set.targetMetrics ?? null,
        completed: !!set.completedAt,
        records: set.records ?? [],
        recordDetails: set.recordDetails ?? [],
      }
    : {}),
});

export const toUpsertPayload = (
  set: EditableWorkoutSet,
): UpsertWorkoutSetPayload => ({
  setType: set.setType,
  metrics: set.metrics,
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
  metrics: loggedValues(set.metrics),
  targetMetrics: set.targetMetrics ?? null,
  notes: set.notes?.trim() || null,
  completed: !!set.completed,
  subSets: set.subSets?.map(toWorkoutSetPayload),
});

/** The set payload for whichever document the editor is editing. */
export const toSetPayload = (kind: EditorKind) =>
  kind === 'workout' ? toWorkoutSetPayload : toUpsertPayload;
