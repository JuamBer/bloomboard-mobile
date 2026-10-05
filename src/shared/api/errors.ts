import type { TFunction } from 'i18next';

/** What the API sends back with a refused request. Coded errors carry a
 *  `code` and the facts to explain it. */
export interface ApiErrorBody {
  message?: string | string[];
  code?: string;
  limit?: string;
  max?: number;
  templates?: number;
  clients?: number;
  workoutId?: string;
}

interface AxiosLikeError {
  response?: { status?: number; data?: ApiErrorBody };
  message?: string;
}

export const errorBody = (error: unknown): ApiErrorBody | undefined =>
  (error as AxiosLikeError)?.response?.data;

export const errorStatus = (error: unknown): number | undefined =>
  (error as AxiosLikeError)?.response?.status;

/** Codes whose caller turns them into UI of its own — never a toast.
 *  WORKOUT_IN_PROGRESS: starting a workout while one is open opens that one
 *  (features/workouts/hooks.ts). */
export const HANDLED_BY_CALLER = new Set(['WORKOUT_IN_PROGRESS']);

/**
 * A friendly title and text for the API's coded business errors — rules, not
 * faults (a plan limit, an exercise still in use). The server's own message is
 * English and technical; these say what to do. Null for anything uncoded.
 */
export function codedErrorMessage(
  t: TFunction,
  data: ApiErrorBody | undefined,
): { title: string; description: string } | null {
  switch (data?.code) {
    // A member at their own plan's limit. The app usually catches it first
    // and opens the upgrade sheet; this covers a stale plan.
    case 'MEMBER_LIMIT_REACHED':
      return {
        title: t('member:limits.reachedTitle'),
        description: t('member:limits.reached', {
          max: data.max,
          noun: t(`member:limits.noun.${data.limit}`, { count: data.max }),
        }),
      };
    case 'EXERCISE_IN_USE':
      return {
        title: t('exercises:inUse.title'),
        description: t('exercises:inUse.description', {
          where: [
            data.templates
              ? t('exercises:usages.templates', { count: data.templates })
              : null,
            data.clients
              ? t('exercises:usages.clients', { count: data.clients })
              : null,
          ]
            .filter(Boolean)
            .join(t('exercises:inUse.and')),
        }),
      };
    default:
      return null;
  }
}

/** The server's message, or what to say when the request never reached it. */
export function errorMessage(t: TFunction, error: unknown): string {
  const err = error as AxiosLikeError;
  const message = err?.response?.data?.message;
  if (Array.isArray(message)) return message.join(', ');
  if (message) return message;
  if (!err?.response) return t('common:errors.network');
  return err?.message ?? t('common:errors.generic');
}
