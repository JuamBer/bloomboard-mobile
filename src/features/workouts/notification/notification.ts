import { File, Paths } from 'expo-file-system';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { exerciseMedia } from '@shared/lib/exercise-media';
import { workoutsService } from '@shared/api/services/workouts.service';
import type { UnitSystem, Workout } from '@shared/types/api.types';
import {
  canCompleteSet,
  completeSetPayload,
  currentStep,
  notificationText,
  type WorkoutStep,
} from './content';

/**
 * The "workout under way" notification (specs/member-app.md, decision 17): the
 * exercise that is up, its next set and its values, with "Completar serie" —
 * which ticks that set from the shade, the app open or not (a background task
 * on Android, ./task.ts). One per workout, replaced in place as it moves on,
 * on a silent channel so an update never buzzes; it goes when the workout
 * does. Android cannot put a picture on a local notification through
 * expo-notifications: the exercise's photo shows on iOS only.
 */

export const WORKOUT_CHANNEL = 'workout';
export const WORKOUT_CATEGORY = 'workout-set';
export const COMPLETE_SET_ACTION = 'complete-set';

/** What a notification carries for its button and its tap. */
export interface WorkoutNotificationData extends Record<string, unknown> {
  kind: 'workout';
  workoutId: string;
  blockId?: string;
  entryId?: string;
  setId?: string;
}

/** Off the web build (a development check in a browser has no shade). */
export const notificationsSupported = Platform.OS !== 'web';

const identifier = (workoutId: string) => `workout-${workoutId}`;

type Translate = (key: string, options?: Record<string, unknown>) => string;

// Shown while the app is open too: in the shade, with no banner or sound —
// it is a status, not news.
if (notificationsSupported) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: false,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

/** The channel and the button, in the app's language (re-run when it
 *  changes: Android names the channel in its settings). */
export async function setUpWorkoutNotifications(t: Translate) {
  if (!notificationsSupported) return;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(WORKOUT_CHANNEL, {
      name: t('app:workoutNotification.channel'),
      description: t('app:workoutNotification.channelDescription'),
      importance: Notifications.AndroidImportance.LOW,
      sound: null,
      enableVibrate: false,
      vibrationPattern: null,
      showBadge: false,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });
  }
  await Notifications.setNotificationCategoryAsync(WORKOUT_CATEGORY, [
    {
      identifier: COMPLETE_SET_ACTION,
      buttonTitle: t('app:workoutNotification.completeSet'),
      options: { opensAppToForeground: false },
    },
  ]);
}

/** Whether we may notify — asking once, the first time a workout starts.
 *  Denied is final: Android stops showing the prompt anyway. */
export async function notificationsAllowed(ask: boolean): Promise<boolean> {
  if (!notificationsSupported) return false;
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!ask || !current.canAskAgain) return false;
  return (await Notifications.requestPermissionsAsync()).granted;
}

/** iOS shows a picture beside the text; it must be a local file. */
async function iosPhoto(step: WorkoutStep | null) {
  if (Platform.OS !== 'ios' || !step) return undefined;
  const url = exerciseMedia(step.entry.exercise.imageUrls, 'small');
  if (!url) return undefined;
  try {
    const file = new File(
      Paths.cache,
      `notification-${step.entry.exerciseId}.jpg`,
    );
    if (!file.exists) await File.downloadFileAsync(url, file);
    return [{ identifier: 'photo', url: file.uri, type: 'public.jpeg' }];
  } catch {
    return undefined;
  }
}

/** Shows (or replaces) the workout's notification for where it is now. */
export async function showWorkoutNotification(
  workout: Workout,
  t: Translate,
  unitSystem: UnitSystem,
) {
  if (!notificationsSupported) return;
  const step = currentStep(workout);
  const text = notificationText(workout, step, t, unitSystem);
  const data: WorkoutNotificationData = {
    kind: 'workout',
    workoutId: workout.id,
    ...(step && canCompleteSet(step)
      ? { blockId: step.blockId, entryId: step.entry.id, setId: step.set!.id }
      : {}),
  };
  const attachments = await iosPhoto(step);
  await Notifications.scheduleNotificationAsync({
    identifier: identifier(workout.id),
    content: {
      title: text.title,
      subtitle: text.subtitle,
      body: text.body,
      data,
      sticky: true,
      autoDismiss: false,
      ...(canCompleteSet(step) ? { categoryIdentifier: WORKOUT_CATEGORY } : {}),
      ...(attachments ? { attachments } : {}),
    },
    trigger: Platform.OS === 'android' ? { channelId: WORKOUT_CHANNEL } : null,
  });
}

/** Takes the workout's notification away (finished, discarded, signed out). */
export async function clearWorkoutNotification(workoutId: string) {
  if (!notificationsSupported) return;
  await Notifications.dismissNotificationAsync(identifier(workoutId)).catch(
    () => undefined,
  );
}

/**
 * "Completar serie": ticks the set the notification named, as the sets table
 * would, and returns the workout as it is now. Already ticked (on the screen,
 * or by a second delivery of the same tap) changes nothing.
 */
export async function completeSetFromNotification(
  data: WorkoutNotificationData,
): Promise<Workout> {
  const workout = await workoutsService.getById(data.workoutId);
  const entry = workout.blocks
    .flatMap((b) => b.exercises)
    .find((e) => e.id === data.entryId);
  const payload =
    entry && data.setId ? completeSetPayload(entry, data.setId) : null;
  if (!entry || !payload || !data.blockId || workout.finishedAt) return workout;
  await workoutsService.updateExercise(
    workout.id,
    data.blockId,
    entry.id,
    payload,
  );
  return workoutsService.getById(workout.id);
}

export const isWorkoutNotification = (
  data: unknown,
): data is WorkoutNotificationData =>
  !!data &&
  typeof data === 'object' &&
  (data as { kind?: unknown }).kind === 'workout' &&
  typeof (data as { workoutId?: unknown }).workoutId === 'string';
