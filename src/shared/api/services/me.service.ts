import { apiClient, orNull } from '../client';
import type {
  BodyPart,
  Difficulty,
  Equipment,
  Exercise,
  Muscle,
  ExerciseProgressStatus,
  MemberActiveSession,
  MemberExercise,
  MemberExerciseUsage,
  MemberPlan,
  MemberProfile,
  MemberRoutine,
  MemberSession,
  MemberSessionDetail,
  PaginatedResponse,
  QueryMemberExercisesParams,
  WorkoutTemplate,
} from '../../types/api.types';

/** What a member writes when creating or editing their own exercise. */
export interface ExerciseWritePayload {
  name?: string;
  metricKeys?: string[];
  compositeMetricKeys?: string[];
  difficulty?: Difficulty | null;
  bodyParts?: BodyPart[];
  equipments?: Equipment[];
  targetMuscles?: Muscle[];
  secondaryMuscles?: Muscle[];
  overview?: string | null;
  instructions?: string[];
  exerciseTips?: string[];
  variations?: string[];
  keywords?: string[];
  relatedExerciseIds?: string[];
}

// The member's API: everything under /me, for a CLIENT token. A member
// reads what their companies prepared for them and builds their own routines
// and exercises on their plan. Editing a plan's contents goes through
// /workout-templates (workoutTemplatesService), the same endpoints as staff;
// their workouts — what they trained — through workoutsService.
export const meService = {
  getProfile: async (): Promise<MemberProfile> => {
    const { data } = await apiClient.get<MemberProfile>('/me/profile');
    return data;
  },

  /** Omitted = unchanged, null = cleared. */
  updateProfile: async (
    changes: Partial<
      Pick<MemberProfile, 'alias' | 'phone' | 'gender' | 'birthday'>
    >,
  ): Promise<MemberProfile> => {
    const { data } = await apiClient.patch<MemberProfile>(
      '/me/profile',
      changes,
    );
    return data;
  },

  getPlan: async (): Promise<MemberPlan> => {
    const { data } = await apiClient.get<MemberPlan>('/me/plan');
    return data;
  },

  // ─── Sessions ──────────────────────────────────────────────────────────────

  /** Sessions starting within [from, to] (ISO datetimes), oldest first. */
  getSessions: async (from: string, to: string): Promise<MemberSession[]> => {
    const { data } = await apiClient.get<MemberSession[]>('/me/sessions', {
      params: { from, to },
    });
    return data;
  },

  getSession: async (id: string): Promise<MemberSessionDetail> => {
    const { data } = await apiClient.get<MemberSessionDetail>(
      `/me/sessions/${id}`,
    );
    return data;
  },

  /** The session running right now with the member in it, or null. */
  getActiveSession: async (): Promise<MemberActiveSession | null> => {
    const { data } = await apiClient.get<MemberActiveSession | ''>(
      '/me/sessions/active',
    );
    return orNull(data);
  },

  markExercise: async (
    sessionId: string,
    exerciseId: string,
    status: ExerciseProgressStatus,
  ) => {
    const { data } = await apiClient.patch(
      `/me/sessions/${sessionId}/exercises/${exerciseId}/status`,
      { status },
    );
    return data;
  },

  /** The member finishes their workout in a session: off the board and the
   *  TVs, as when the trainer finishes them. */
  finishSession: async (sessionId: string): Promise<void> => {
    await apiClient.post(`/me/sessions/${sessionId}/finish`);
  },

  /** Puts the member on one of the center's TVs, or on none (null). */
  setScreen: async (
    sessionId: string,
    screenId: string | null,
  ): Promise<MemberActiveSession | null> => {
    const { data } = await apiClient.put<MemberActiveSession | ''>(
      `/me/sessions/${sessionId}/screen`,
      { screenId },
    );
    return orNull(data);
  },

  // ─── Routines ──────────────────────────────────────────────────────────────

  getRoutines: async (): Promise<MemberRoutine[]> => {
    const { data } = await apiClient.get<MemberRoutine[]>('/me/routines');
    return data;
  },

  getRoutine: async (id: string): Promise<MemberRoutine> => {
    const { data } = await apiClient.get<MemberRoutine>(`/me/routines/${id}`);
    return data;
  },

  createRoutine: async (dto: {
    name: string;
    description?: string;
  }): Promise<MemberRoutine> => {
    const { data } = await apiClient.post<MemberRoutine>('/me/routines', dto);
    return data;
  },

  updateRoutine: async (
    id: string,
    dto: { name: string; description?: string },
  ): Promise<MemberRoutine> => {
    const { data } = await apiClient.patch<MemberRoutine>(
      `/me/routines/${id}`,
      dto,
    );
    return data;
  },

  removeRoutine: async (id: string) => {
    const { data } = await apiClient.delete(`/me/routines/${id}`);
    return data;
  },

  addBlankWorkout: async (
    routineId: string,
    dto: { name: string; description?: string },
  ): Promise<MemberRoutine> => {
    const { data } = await apiClient.post<MemberRoutine>(
      `/me/routines/${routineId}/templates`,
      dto,
    );
    return data;
  },

  reorderWorkouts: async (
    routineId: string,
    routineWorkoutIds: string[],
  ): Promise<MemberRoutine> => {
    const { data } = await apiClient.patch<MemberRoutine>(
      `/me/routines/${routineId}/workouts/reorder`,
      { routineWorkoutIds },
    );
    return data;
  },

  removeWorkout: async (
    routineId: string,
    routineWorkoutId: string,
  ): Promise<MemberRoutine> => {
    const { data } = await apiClient.delete<MemberRoutine>(
      `/me/routines/${routineId}/workouts/${routineWorkoutId}`,
    );
    return data;
  },

  getTemplate: async (id: string): Promise<WorkoutTemplate> => {
    const { data } = await apiClient.get<WorkoutTemplate>(
      `/me/templates/${id}`,
    );
    return data;
  },

  // ─── Exercises ─────────────────────────────────────────────────────────────

  getExercises: async (
    params?: QueryMemberExercisesParams,
  ): Promise<PaginatedResponse<MemberExercise>> => {
    const { data } = await apiClient.get<PaginatedResponse<MemberExercise>>(
      '/me/exercises',
      { params },
    );
    return data;
  },

  getExercise: async (id: string): Promise<MemberExercise> => {
    const { data } = await apiClient.get<MemberExercise>(`/me/exercises/${id}`);
    return data;
  },

  /** Several readable exercises by id — an exercise sheet's related ones. */
  getExercisesByIds: async (ids: string[]): Promise<MemberExercise[]> => {
    if (ids.length === 0) return [];
    const { data } = await apiClient.get<MemberExercise[]>(
      '/me/exercises/batch',
      { params: { ids: ids.join(',') } },
    );
    return data;
  },

  getExerciseUsages: async (id: string): Promise<MemberExerciseUsage[]> => {
    const { data } = await apiClient.get<MemberExerciseUsage[]>(
      `/me/exercises/${id}/usages`,
    );
    return data;
  },

  createExercise: async (dto: ExerciseWritePayload): Promise<Exercise> => {
    const { data } = await apiClient.post<Exercise>('/me/exercises', dto);
    return data;
  },

  updateExercise: async (
    id: string,
    dto: ExerciseWritePayload,
  ): Promise<Exercise> => {
    const { data } = await apiClient.patch<Exercise>(
      `/me/exercises/${id}`,
      dto,
    );
    return data;
  },

  removeExercise: async (id: string) => {
    const { data } = await apiClient.delete(`/me/exercises/${id}`);
    return data;
  },

  /** Whether the member already has an exercise with this exact name — their
   *  names are unique among their own (the catalog's may repeat). */
  isOwnExerciseNameAvailable: async (
    name: string,
    excludeId?: string,
  ): Promise<boolean> => {
    const { data } = await apiClient.get<PaginatedResponse<MemberExercise>>(
      '/me/exercises',
      { params: { source: 'own', search: name, limit: 50 } },
    );
    return !data.data.some((e) => e.name === name && e.id !== excludeId);
  },

  /** Copies a catalog or company exercise into the member's own. */
  copyExercise: async (id: string): Promise<Exercise> => {
    const { data } = await apiClient.post<Exercise>(`/me/exercises/${id}/copy`);
    return data;
  },
};
