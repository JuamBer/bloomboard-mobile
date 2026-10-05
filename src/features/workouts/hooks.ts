import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { errorBody } from '@shared/api/errors';
import { workoutsService } from '@shared/api/services/workouts.service';
import { toast } from '@shared/ui/toast/toast.store';

export const ACTIVE_WORKOUT_KEY = ['me', 'workouts', 'active'] as const;
export const MY_WORKOUTS_KEY = ['me', 'workouts', 'list'] as const;

/** The member's workout under way, if any — a center session's too. */
export function useActiveWorkout() {
  return useQuery({
    queryKey: ACTIVE_WORKOUT_KEY,
    queryFn: workoutsService.mine.active,
    refetchInterval: 60_000,
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
