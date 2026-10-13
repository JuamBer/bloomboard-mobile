import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { workoutQueryKey } from '@features/editor/lib/editor-source';
import { errorBody } from '@shared/api/errors';
import { workoutsService } from '@shared/api/services/workouts.service';
import { toast } from '@shared/ui/toast/toast.store';
import { deviceTimeZone } from './lib/training';

export const ACTIVE_WORKOUT_KEY = ['me', 'workouts', 'active'] as const;
export const MY_WORKOUTS_KEY = ['me', 'workouts', 'list'] as const;
// Under ['me', 'workouts'], so whatever refreshes the history refreshes it.
export const TRAINING_SUMMARY_KEY = ['me', 'workouts', 'summary'] as const;

/** The member's workout under way, if any — a center session's too. */
export function useActiveWorkout() {
  return useQuery({
    queryKey: ACTIVE_WORKOUT_KEY,
    queryFn: workoutsService.mine.active,
    refetchInterval: 60_000,
  });
}

/** Throws away one of the member's own workouts under way (DELETE
 *  /workouts/:id) and refreshes everything that showed it: the pill, the
 *  history, the summary. */
export function useDiscardWorkout(onDiscarded?: () => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (workoutId: string) => workoutsService.remove(workoutId),
    onSuccess: (_void, workoutId) => {
      queryClient.removeQueries({ queryKey: workoutQueryKey(workoutId) });
      void queryClient.invalidateQueries({ queryKey: ['me', 'workouts'] });
      onDiscarded?.();
    },
  });
}

/** The member's history, newest first, a page at a time — the profile's
 *  list. */
export function useWorkoutHistory() {
  return useInfiniteQuery({
    queryKey: MY_WORKOUTS_KEY,
    queryFn: ({ pageParam }) => workoutsService.mine.list(pageParam),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.meta.page < last.meta.totalPages ? last.meta.page + 1 : undefined,
  });
}

/** How many workouts they have finished, their streak of weeks and the last
 *  one — the profile's count and the calendar's header. */
export function useTrainingSummary() {
  return useQuery({
    queryKey: TRAINING_SUMMARY_KEY,
    queryFn: () => workoutsService.mine.summary(deviceTimeZone()),
  });
}

/**
 * Starts a workout — empty, or from a plan — and opens it. With one already
 * under way the server refuses (409 WORKOUT_IN_PROGRESS): that one opens
 * instead, with a word about why.
 */
export function useStartWorkout(onStarted?: () => void) {
  const { t } = useTranslation(['workouts']);
  const router = useRouter();
  const queryClient = useQueryClient();
  const open = (workoutId: string) => {
    onStarted?.();
    router.push({ pathname: '/workouts/[workoutId]', params: { workoutId } });
  };
  return useMutation({
    mutationFn: (dto: { workoutTemplateId?: string }) =>
      workoutsService.mine.start(dto),
    onSuccess: (workout) => {
      void queryClient.invalidateQueries({ queryKey: ['me', 'workouts'] });
      open(workout.id);
    },
    onError: (error: unknown) => {
      const data = errorBody(error);
      if (data?.code === 'WORKOUT_IN_PROGRESS' && data.workoutId) {
        toast.info(t('workouts:start.alreadyOpen'));
        open(data.workoutId);
      }
    },
  });
}
