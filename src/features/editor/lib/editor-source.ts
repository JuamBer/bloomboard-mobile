import { createContext, useContext } from 'react';
import type { QueryKey } from '@tanstack/react-query';
import {
  workoutTemplatesService,
  type UpsertSuperSetGroupPayload,
  type UpsertWorkoutTemplateBlockPayload,
  type UpsertWorkoutTemplateExercisePayload,
  type SuperSetSlotPayload,
} from '@shared/api/services/workout-templates.service';
import {
  workoutsService,
  type UpsertWorkoutExercisePayload,
  type WorkoutSuperSetSlotPayload,
} from '@shared/api/services/workouts.service';
import type { EditorBlock, EditorExercise } from '@shared/types/api.types';

/**
 * What the shared editor is editing: a plan (a workout template) or a workout
 * (what was trained). The cards never call a service directly — they ask the
 * source, so the same BlockCard / ExerciseEntryCard / SuperSetCard write to
 * /workout-templates or /workouts, and keep the right query cache in step.
 */
export type EditorKind = 'template' | 'workout';

/** A document the editor renders: whatever has blocks. */
export interface EditorDoc {
  id: string;
  /** Whose it is: a client's template or workout. Null for a company's. */
  userId?: string | null;
  blocks?: EditorBlock[];
}

/**
 * The person the document in the editor belongs to — so an exercise opened
 * from a client's routine or workout shows that client's stats.
 */
export const EditorOwnerContext = createContext<string | null>(null);

/** The calls the editor makes. Both services implement them with the same
 *  arguments; only the payload of a set differs (a workout's is exact). */
export interface EditorApi {
  getById(id: string): Promise<EditorDoc>;
  addBlock(
    id: string,
    dto: UpsertWorkoutTemplateBlockPayload,
  ): Promise<EditorBlock>;
  updateBlock(
    id: string,
    blockId: string,
    dto: UpsertWorkoutTemplateBlockPayload,
  ): Promise<EditorBlock>;
  removeBlock(id: string, blockId: string): Promise<EditorDoc>;
  reorderBlocks(id: string, blockIds: string[]): Promise<EditorDoc>;
  createSuperSetGroup(
    id: string,
    blockId: string,
    dto: UpsertSuperSetGroupPayload,
  ): Promise<EditorDoc>;
  deleteSuperSetGroup(
    id: string,
    blockId: string,
    groupId: string,
  ): Promise<EditorDoc>;
  updateSuperSetSequence(
    id: string,
    blockId: string,
    groupId: string,
    slots: (SuperSetSlotPayload | WorkoutSuperSetSlotPayload)[],
  ): Promise<EditorDoc>;
  addExercise(
    id: string,
    blockId: string,
    dto: UpsertWorkoutTemplateExercisePayload | UpsertWorkoutExercisePayload,
  ): Promise<EditorExercise>;
  updateExercise(
    id: string,
    blockId: string,
    entryId: string,
    dto: UpsertWorkoutTemplateExercisePayload | UpsertWorkoutExercisePayload,
  ): Promise<EditorExercise>;
  removeExercise(
    id: string,
    blockId: string,
    entryId: string,
  ): Promise<EditorDoc>;
  reorderExercises(
    id: string,
    blockId: string,
    entryIds: string[],
  ): Promise<EditorDoc>;
}

export interface EditorSource {
  kind: EditorKind;
  /** The template's or the workout's id. */
  id: string;
  /** The query its detail is cached under — every write lands there. */
  queryKey: QueryKey;
  api: EditorApi;
}

export const templateQueryKey = (id: string) => ['workout-template', id];
export const workoutQueryKey = (id: string) => ['workout', id];

export const templateEditorSource = (id: string): EditorSource => ({
  kind: 'template',
  id,
  queryKey: templateQueryKey(id),
  api: workoutTemplatesService as unknown as EditorApi,
});

export const workoutEditorSource = (id: string): EditorSource => ({
  kind: 'workout',
  id,
  queryKey: workoutQueryKey(id),
  api: workoutsService as unknown as EditorApi,
});

const EditorSourceContext = createContext<EditorSource | null>(null);

export const EditorSourceProvider = EditorSourceContext.Provider;

/** The document the editor around this component is editing. */
export function useEditorSource(): EditorSource {
  const source = useContext(EditorSourceContext);
  if (!source) {
    throw new Error('useEditorSource: no EditorSourceProvider above');
  }
  return source;
}

/** True inside a workout's editor — sets are logged and ticked, not planned. */
export const useIsWorkout = () => useEditorSource().kind === 'workout';
