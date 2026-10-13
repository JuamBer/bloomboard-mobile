import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import i18n from '@/i18n';
import { useLanguageStore } from '@/i18n/language.store';
import { useAuthStore } from '@features/auth/auth.store';
import { configurationsService } from '@shared/api/services/configurations.service';
import {
  COMPLETE_SET_ACTION,
  completeSetFromNotification,
  isWorkoutNotification,
  notificationsSupported,
  showWorkoutNotification,
} from './notification';

/**
 * "Completar serie" with the app in the background or closed. On Android,
 * expo-task-manager starts this bundle headless and runs the task with the
 * tap; nothing has loaded yet, so it signs in from the stored tokens, takes
 * the member's language and units, ticks the set and redraws the notification
 * for the next one. With the app open the member layout's listener handles
 * the tap instead (useWorkoutNotification) — both are safe to run, a set
 * already ticked is left alone.
 *
 * Defined at module scope from the app's entry (index.ts), before Expo
 * Router, as expo-task-manager requires.
 */
export const WORKOUT_NOTIFICATION_TASK = 'bloom-workout-notification';

async function handleBackgroundAction(
  payload: Notifications.NotificationTaskPayload,
) {
  if (!('actionIdentifier' in payload)) return;
  if (payload.actionIdentifier !== COMPLETE_SET_ACTION) return;
  const data = payload.notification.request.content.data;
  if (!isWorkoutNotification(data)) return;

  const auth = useAuthStore.getState();
  if (auth.status === 'loading') await auth.hydrate();
  if (useAuthStore.getState().status !== 'signedIn') return;

  await useLanguageStore.persist.rehydrate();
  const language = useLanguageStore.getState().language;
  if (i18n.language !== language) await i18n.changeLanguage(language);
  const unitSystem = await configurationsService
    .getMine()
    .then((c) => c.unitSystem)
    .catch(() => 'METRIC' as const);

  const workout = await completeSetFromNotification(data);
  if (!workout.finishedAt) {
    await showWorkoutNotification(workout, i18n.t, unitSystem);
  }
}

if (notificationsSupported) {
  TaskManager.defineTask<Notifications.NotificationTaskPayload>(
    WORKOUT_NOTIFICATION_TASK,
    async ({ data, error }) => {
      if (error || !data) return;
      try {
        await handleBackgroundAction(data);
      } catch {
        // Offline or signed out: the set stays to tick in the app.
      }
    },
  );
  void Notifications.registerTaskAsync(WORKOUT_NOTIFICATION_TASK).catch(
    () => undefined,
  );
}
