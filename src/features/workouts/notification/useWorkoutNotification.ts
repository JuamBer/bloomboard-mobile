import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { workoutQueryKey } from '@features/editor/lib/editor-source';
import { useUnitSystem } from '@features/units/useUnitSystem';
import { useActiveWorkout, workoutQuery } from '../hooks';
import { currentStep, notificationText } from './content';
import {
  COMPLETE_SET_ACTION,
  clearWorkoutNotification,
  completeSetFromNotification,
  isWorkoutNotification,
  notificationsAllowed,
  notificationsSupported,
  setUpWorkoutNotifications,
  showWorkoutNotification,
} from './notification';

/**
 * Keeps the "workout under way" notification in step with the workout while
 * the app runs (mounted once, in the member layout): shown when one starts —
 * asking for permission the first time —, redrawn whenever the exercise, the
 * set or its values change, gone when it is finished or discarded. Its button
 * and its tap are handled here while the app is alive; ./task.ts handles the
 * button when it is not.
 */
export function useWorkoutNotification() {
  const { i18n } = useTranslation(['app']);
  const unitSystem = useUnitSystem();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: active } = useActiveWorkout();
  const workoutId = active?.id ?? null;
  const [allowed, setAllowed] = useState(false);
  const shownFor = useRef<string | null>(null);

  // The workout itself, shared with its screen's copy (same key).
  const { data: workout } = useQuery({
    // In the background: a workout deleted elsewhere is no news to toast.
    ...workoutQuery(queryClient, workoutId ?? '', { silent: true }),
    enabled: notificationsSupported && !!workoutId,
    refetchInterval: 30_000,
  });

  useEffect(() => {
    void setUpWorkoutNotifications(i18n.t).catch(() => undefined);
  }, [i18n, i18n.language]);

  // Asked when a workout is under way — the moment it means something.
  useEffect(() => {
    if (!workoutId) return;
    let cancelled = false;
    void notificationsAllowed(true)
      .then((ok) => !cancelled && setAllowed(ok))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [workoutId]);

  const live = workout && !workout.finishedAt ? workout : null;
  const text = live
    ? notificationText(live, currentStep(live), i18n.t, unitSystem)
    : null;
  const signature = text ? `${live!.id}|${JSON.stringify(text)}` : null;

  useEffect(() => {
    if (!allowed || !live) return;
    shownFor.current = live.id;
    void showWorkoutNotification(live, i18n.t, unitSystem).catch(
      () => undefined,
    );
    // Redrawn only when what it says changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowed, signature]);

  // Finished, discarded, or another one took its place.
  useEffect(() => {
    const shown = shownFor.current;
    if (shown && shown !== (live?.id ?? null)) {
      shownFor.current = null;
      void clearWorkoutNotification(shown);
    }
  }, [live?.id]);

  // The button and the tap, while the app is alive.
  useEffect(() => {
    if (!notificationsSupported) return;
    const sub = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data;
        if (!isWorkoutNotification(data)) return;
        if (response.actionIdentifier === COMPLETE_SET_ACTION) {
          void completeSetFromNotification(data)
            .then((updated) => {
              queryClient.setQueryData(workoutQueryKey(updated.id), updated);
              void queryClient.invalidateQueries({
                queryKey: ['me', 'workouts'],
              });
            })
            .catch(() => undefined);
          return;
        }
        router.push({
          pathname: '/workouts/[workoutId]',
          params: { workoutId: data.workoutId },
        });
      },
    );
    return () => sub.remove();
  }, [queryClient, router]);
}
