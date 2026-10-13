import { differenceInCalendarDays } from 'date-fns';
import { getCalendars } from 'expo-localization';

/** The phone's IANA time zone — where the member's weeks start and end for
 *  the streak. Europe/Madrid when the platform says nothing. */
export function deviceTimeZone(): string {
  try {
    return (
      getCalendars()[0]?.timeZone ??
      Intl.DateTimeFormat().resolvedOptions().timeZone ??
      'Europe/Madrid'
    );
  } catch {
    return 'Europe/Madrid';
  }
}

/**
 * Days of rest since the last workout: calendar days on this phone, so one
 * done yesterday evening is 1 this morning. Null with none yet; 0 when one
 * was done today (or is under way).
 */
export function restDays(
  lastWorkoutAt: string | null,
  now: Date = new Date(),
): number | null {
  if (!lastWorkoutAt) return null;
  return Math.max(0, differenceInCalendarDays(now, new Date(lastWorkoutAt)));
}
