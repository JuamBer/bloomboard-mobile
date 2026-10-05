import {
  addDays,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { enGB, es, type Locale } from 'date-fns/locale';

/** Weeks start on Monday, in Spain and in the web's calendar. */
export const WEEK_STARTS_ON = 1 as const;

export const dateLocale = (language: string): Locale =>
  language === 'en' ? enGB : es;

/** Day-level pattern: Spanish needs its "de" ("jueves 24 de septiembre"),
 *  which a shared pattern would print in English too. */
export const dayPattern = (language: string) =>
  language === 'en' ? 'EEEE d MMMM' : "EEEE d 'de' MMMM";

/**
 * The days a month grid draws: whole weeks from the Monday on or before the
 * 1st to the Sunday on or after the last day — 35 or 42 cells.
 */
export function monthGrid(month: Date): Date[] {
  const first = startOfWeek(startOfMonth(month), {
    weekStartsOn: WEEK_STARTS_ON,
  });
  const last = endOfWeek(endOfMonth(month), { weekStartsOn: WEEK_STARTS_ON });
  const days: Date[] = [];
  for (let d = first; d <= last; d = addDays(d, 1)) days.push(d);
  return days;
}

/** The range the sessions are loaded for (GET /me/sessions?from&to): the
 *  grid's first day at 00:00 to its last at 23:59:59.999, as ISO. */
export function gridRange(month: Date): { from: string; to: string } {
  const days = monthGrid(month);
  const from = new Date(days[0]);
  from.setHours(0, 0, 0, 0);
  const to = new Date(days[days.length - 1]);
  to.setHours(23, 59, 59, 999);
  return { from: from.toISOString(), to: to.toISOString() };
}

/** Sessions grouped by local day ("2026-10-05"), in start order. */
export function byDay<S extends { startsAt: string }>(
  sessions: S[],
): Map<string, S[]> {
  const days = new Map<string, S[]>();
  for (const s of [...sessions].sort(
    (a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt),
  )) {
    const key = format(new Date(s.startsAt), 'yyyy-MM-dd');
    const list = days.get(key) ?? [];
    list.push(s);
    days.set(key, list);
  }
  return days;
}

export const dayKey = (day: Date) => format(day, 'yyyy-MM-dd');

/** Whether a session is running at `now`. */
export const isRunning = (
  s: { startsAt: string; endsAt: string },
  now = Date.now(),
) => Date.parse(s.startsAt) <= now && now < Date.parse(s.endsAt);

export { isSameDay };
