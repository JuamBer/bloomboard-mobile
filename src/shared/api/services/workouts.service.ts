import { apiClient, orNull } from '../client';
import type {
  ActiveWorkout,
  ExerciseProgressReport,
  ExerciseProgressStatus,
  PaginatedResponse,
  SetMetrics,
  SetType,
  Workout,
  WorkoutBlock,
  WorkoutExercise,
  WorkoutReferences,
  WorkoutSummary,
} from '../../types/api.types';
import type {
  UpsertSuperSetGroupPayload,
  UpsertWorkoutTemplateBlockPayload,
  UpsertWorkoutTemplateExercisePayload,
} from './workout-templates.service';

/** A workout's set as it is saved: what was done (exact, no mode), the plan's
 *  target carried along, and whether it is ticked. */
export interface UpsertWorkoutExerciseSetPayload {
  setType?: SetType;
  metrics?: Record<
    string,
    { value: number | string | null; unit?: string | null }
  >;
  targetMetrics?: SetMetrics | null;
  notes?: string | null;
  /** The plan's comment, echoed back like `targetMetrics`. */
  planNotes?: string | null;
  completed?: boolean;
  subSets?: UpsertWorkoutExerciseSetPayload[];
}

export interface UpsertWorkoutExercisePayload extends Omit<
  UpsertWorkoutTemplateExercisePayload,
  'sets'
> {
  sets?: UpsertWorkoutExerciseSetPayload[];
}

export interface WorkoutSuperSetSlotPayload {
  exerciseEntryId: string;
  set: UpsertWorkoutExerciseSetPayload;
}

export interface UpdateWorkoutPayload {
  name?: string;
  description?: string | null;
  notes?: string | null;
  startedAt?: string;
  /** A date finishes it; null resumes it. */
  finishedAt?: string | null;
}

/**
 * Workouts — what was actually trained. The editor methods mirror
 * workoutTemplatesService one for one (same arguments, same shapes) so the
 * shared editor drives either; a member's history and progress live under
 * /me.
 */
export const workoutsService = {
  getById: async (id: string): Promise<Workout> => {
    const { data } = await apiClient.get<Workout>(`/workouts/${id}`);
    return data;
  },

  update: async (id: string, dto: UpdateWorkoutPayload): Promise<Workout> => {
    const { data } = await apiClient.patch<Workout>(`/workouts/${id}`, dto);
    return data;
  },

  remove: async (id: string): Promise<void> => {
    await apiClient.delete(`/workouts/${id}`);
  },

  /** Marks an exercise as a whole; completing ticks its sets, reopening
   *  unticks them. A super-set is marked as one. */
  setExerciseStatus: async (
    id: string,
    entryId: string,
    status: ExerciseProgressStatus,
  ): Promise<Workout> => {
    const { data } = await apiClient.patch<Workout>(
      `/workouts/${id}/exercises/${entryId}/status`,
      { status },
    );
    return data;
  },

  references: async (
    id: string,
    entryId: string,
  ): Promise<WorkoutReferences> => {
    const { data } = await apiClient.get<WorkoutReferences>(
      `/workouts/${id}/exercises/${entryId}/references`,
    );
    return data;
  },

  // ─── Editor (mirrors workoutTemplatesService) ────────────────────────────────

  addBlock: async (
    id: string,
    dto: UpsertWorkoutTemplateBlockPayload,
  ): Promise<WorkoutBlock> => {
    const { data } = await apiClient.post<WorkoutBlock>(
      `/workouts/${id}/blocks`,
      dto,
    );
    return data;
  },

  updateBlock: async (
    id: string,
    blockId: string,
    dto: UpsertWorkoutTemplateBlockPayload,
  ): Promise<WorkoutBlock> => {
    const { data } = await apiClient.patch<WorkoutBlock>(
      `/workouts/${id}/blocks/${blockId}`,
      dto,
    );
    return data;
  },

  removeBlock: async (id: string, blockId: string): Promise<Workout> => {
    const { data } = await apiClient.delete<Workout>(
      `/workouts/${id}/blocks/${blockId}`,
    );
    return data;
  },

  reorderBlocks: async (id: string, blockIds: string[]): Promise<Workout> => {
    const { data } = await apiClient.patch<Workout>(
      `/workouts/${id}/blocks/reorder`,
      { blockIds },
    );
    return data;
  },

  createSuperSetGroup: async (
    id: string,
    blockId: string,
    dto: UpsertSuperSetGroupPayload,
  ): Promise<Workout> => {
    const { data } = await apiClient.post<Workout>(
      `/workouts/${id}/blocks/${blockId}/super-sets`,
      dto,
    );
    return data;
  },

  updateSuperSetSequence: async (
    id: string,
    blockId: string,
    groupId: string,
    slots: WorkoutSuperSetSlotPayload[],
  ): Promise<Workout> => {
    const { data } = await apiClient.put<Workout>(
      `/workouts/${id}/blocks/${blockId}/super-sets/${groupId}/sequence`,
      { slots },
    );
    return data;
  },

  deleteSuperSetGroup: async (
    id: string,
    blockId: string,
    groupId: string,
  ): Promise<Workout> => {
    const { data } = await apiClient.delete<Workout>(
      `/workouts/${id}/blocks/${blockId}/super-sets/${groupId}`,
    );
    return data;
  },

  addExercise: async (
    id: string,
    blockId: string,
    dto: UpsertWorkoutExercisePayload,
  ): Promise<WorkoutExercise> => {
    const { data } = await apiClient.post<WorkoutExercise>(
      `/workouts/${id}/blocks/${blockId}/exercises`,
      dto,
    );
    return data;
  },

  updateExercise: async (
    id: string,
    blockId: string,
    entryId: string,
    dto: UpsertWorkoutExercisePayload,
  ): Promise<WorkoutExercise> => {
    const { data } = await apiClient.patch<WorkoutExercise>(
      `/workouts/${id}/blocks/${blockId}/exercises/${entryId}`,
      dto,
    );
    return data;
  },

  removeExercise: async (
    id: string,
    blockId: string,
    entryId: string,
  ): Promise<Workout> => {
    const { data } = await apiClient.delete<Workout>(
      `/workouts/${id}/blocks/${blockId}/exercises/${entryId}`,
    );
    return data;
  },

  reorderExercises: async (
    id: string,
    blockId: string,
    exerciseEntryIds: string[],
  ): Promise<Workout> => {
    const { data } = await apiClient.patch<Workout>(
      `/workouts/${id}/blocks/${blockId}/exercises/reorder`,
      { exerciseEntryIds },
    );
    return data;
  },

  // ─── The member's own (/me) ─────────────────────────────────────────────────

  mine: {
    list: async (
      page = 1,
      limit = 20,
    ): Promise<PaginatedResponse<WorkoutSummary>> => {
      const { data } = await apiClient.get<PaginatedResponse<WorkoutSummary>>(
        '/me/workouts',
        { params: { page, limit } },
      );
      return data;
    },

    /** The workout under way, or null. */
    active: async (): Promise<ActiveWorkout | null> => {
      const { data } = await apiClient.get<ActiveWorkout | ''>(
        '/me/workouts/active',
      );
      return orNull(data);
    },

    /** Starts one — empty, or from a plan. 409 WORKOUT_IN_PROGRESS while
     *  another is open. */
    start: async (dto: {
      workoutTemplateId?: string;
      name?: string;
    }): Promise<Workout> => {
      const { data } = await apiClient.post<Workout>('/me/workouts', dto);
      return data;
    },

    exercise: async (
      exerciseId: string,
      templateId?: string,
    ): Promise<ExerciseProgressReport> => {
      const { data } = await apiClient.get<ExerciseProgressReport>(
        `/me/progress/exercises/${exerciseId}`,
        { params: templateId ? { templateId } : undefined },
      );
      return data;
    },
  },
};
