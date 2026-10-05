import { apiClient } from '../client';
import type {
  BlockMode,
  Difficulty,
  SetMetrics,
  SetType,
  WorkoutTemplate,
  WorkoutTemplateBlock,
  WorkoutTemplateExercise,
} from '../../types/api.types';

export interface UpsertWorkoutSetPayload {
  setType?: SetType;
  metrics?: SetMetrics;
  notes?: string | null;
  subSets?: UpsertWorkoutSetPayload[];
}

export interface UpsertWorkoutTemplateExercisePayload {
  exerciseId: string;
  notes?: string;
  /** Per-template display name override; empty/omitted falls back to the exercise's own name. */
  customName?: string;
  superSetGroupId?: string | null;
  metricKeys?: string[];
  compositeMetricKeys?: string[];
  /** Explicit column order override; empty = follow the company order. */
  metricOrder?: string[];
  /** Omit entirely to leave the entry's sets untouched — that's how a super-set
   *  member saves its notes/metrics while the sequence endpoint owns its sets. */
  sets?: UpsertWorkoutSetPayload[];
}

/** One position of a super-set sequence: the exercise performed there and the
 *  set it is performed with. Array order is the performance order. */
export interface SuperSetSlotPayload {
  exerciseEntryId: string;
  set: UpsertWorkoutSetPayload;
}

export interface UpsertSuperSetGroupPayload {
  /** Unused by the UI — every super-set is drawn in the company's accent. The
   *  column is kept so a per-group colour stays possible. */
  color?: string;
}

export interface UpsertWorkoutTemplateBlockPayload {
  /** Omitted on create: the group of loose exercises at the template's own
   *  level (no heading, no colour, no timed mode). */
  name?: string;
  description?: string;
  color?: string;
  /** Switching a block to WORK_REST seeds TIME + REST on every set it owns
   *  that does not already carry them (server side). */
  mode?: BlockMode;
}

export interface UpdateWorkoutTemplatePayload {
  name?: string;
  description?: string;
  difficulty?: Difficulty;
  goalIds?: string[];
}

/**
 * A plan's editor endpoints, opened to members for the templates they built
 * (reads also: the copies their companies made for them, and a session's).
 * The list, create, status, delete, copy and export are staff-only.
 */
export const workoutTemplatesService = {
  getById: async (id: string): Promise<WorkoutTemplate> => {
    const { data } = await apiClient.get<WorkoutTemplate>(
      `/workout-templates/${id}`,
    );
    return data;
  },

  isNameAvailable: async (
    name: string,
    excludeId?: string,
  ): Promise<boolean> => {
    const { data } = await apiClient.get<{ available: boolean }>(
      '/workout-templates/name-available',
      { params: { name, ...(excludeId ? { excludeId } : {}) } },
    );
    return data.available;
  },

  update: async (
    id: string,
    dto: UpdateWorkoutTemplatePayload,
  ): Promise<WorkoutTemplate> => {
    const { data } = await apiClient.patch<WorkoutTemplate>(
      `/workout-templates/${id}`,
      dto,
    );
    return data;
  },

  // --- Blocks ---

  addBlock: async (
    templateId: string,
    dto: UpsertWorkoutTemplateBlockPayload,
  ): Promise<WorkoutTemplateBlock> => {
    const { data } = await apiClient.post<WorkoutTemplateBlock>(
      `/workout-templates/${templateId}/blocks`,
      dto,
    );
    return data;
  },

  updateBlock: async (
    templateId: string,
    blockId: string,
    dto: UpsertWorkoutTemplateBlockPayload,
  ): Promise<WorkoutTemplateBlock> => {
    const { data } = await apiClient.patch<WorkoutTemplateBlock>(
      `/workout-templates/${templateId}/blocks/${blockId}`,
      dto,
    );
    return data;
  },

  removeBlock: async (
    templateId: string,
    blockId: string,
  ): Promise<WorkoutTemplate> => {
    const { data } = await apiClient.delete<WorkoutTemplate>(
      `/workout-templates/${templateId}/blocks/${blockId}`,
    );
    return data;
  },

  reorderBlocks: async (
    templateId: string,
    blockIds: string[],
  ): Promise<WorkoutTemplate> => {
    const { data } = await apiClient.patch<WorkoutTemplate>(
      `/workout-templates/${templateId}/blocks/reorder`,
      { blockIds },
    );
    return data;
  },

  // --- Super Set Groups ---

  createSuperSetGroup: async (
    templateId: string,
    blockId: string,
    dto: UpsertSuperSetGroupPayload,
  ): Promise<WorkoutTemplate> => {
    const { data } = await apiClient.post<WorkoutTemplate>(
      `/workout-templates/${templateId}/blocks/${blockId}/super-sets`,
      dto,
    );
    return data;
  },

  updateSuperSetGroup: async (
    templateId: string,
    blockId: string,
    groupId: string,
    dto: UpsertSuperSetGroupPayload,
  ): Promise<WorkoutTemplate> => {
    const { data } = await apiClient.patch<WorkoutTemplate>(
      `/workout-templates/${templateId}/blocks/${blockId}/super-sets/${groupId}`,
      dto,
    );
    return data;
  },

  // Rewrites a super-set's whole sequence at once — the only way its order and
  // its members' sets are authored, so a drag never leaves a half-applied order.
  updateSuperSetSequence: async (
    templateId: string,
    blockId: string,
    groupId: string,
    slots: SuperSetSlotPayload[],
  ): Promise<WorkoutTemplate> => {
    const { data } = await apiClient.put<WorkoutTemplate>(
      `/workout-templates/${templateId}/blocks/${blockId}/super-sets/${groupId}/sequence`,
      { slots },
    );
    return data;
  },

  deleteSuperSetGroup: async (
    templateId: string,
    blockId: string,
    groupId: string,
  ): Promise<WorkoutTemplate> => {
    const { data } = await apiClient.delete<WorkoutTemplate>(
      `/workout-templates/${templateId}/blocks/${blockId}/super-sets/${groupId}`,
    );
    return data;
  },

  // --- Block exercises ---

  addExercise: async (
    templateId: string,
    blockId: string,
    dto: UpsertWorkoutTemplateExercisePayload,
  ): Promise<WorkoutTemplateExercise> => {
    const { data } = await apiClient.post<WorkoutTemplateExercise>(
      `/workout-templates/${templateId}/blocks/${blockId}/exercises`,
      dto,
    );
    return data;
  },

  updateExercise: async (
    templateId: string,
    blockId: string,
    exerciseEntryId: string,
    dto: UpsertWorkoutTemplateExercisePayload,
  ): Promise<WorkoutTemplateExercise> => {
    const { data } = await apiClient.patch<WorkoutTemplateExercise>(
      `/workout-templates/${templateId}/blocks/${blockId}/exercises/${exerciseEntryId}`,
      dto,
    );
    return data;
  },

  removeExercise: async (
    templateId: string,
    blockId: string,
    exerciseEntryId: string,
  ): Promise<WorkoutTemplate> => {
    const { data } = await apiClient.delete<WorkoutTemplate>(
      `/workout-templates/${templateId}/blocks/${blockId}/exercises/${exerciseEntryId}`,
    );
    return data;
  },

  reorderExercises: async (
    templateId: string,
    blockId: string,
    exerciseEntryIds: string[],
  ): Promise<WorkoutTemplate> => {
    const { data } = await apiClient.patch<WorkoutTemplate>(
      `/workout-templates/${templateId}/blocks/${blockId}/exercises/reorder`,
      { exerciseEntryIds },
    );
    return data;
  },
};
