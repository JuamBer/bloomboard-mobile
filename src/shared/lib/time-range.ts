/** How far back a history reaches: the last 3 months, the last year, or all
 *  of it — Medidas and an exercise's stats share it (and its labels,
 *  `app:measurementsRange`). */
export type TimeRange = '3M' | '1Y' | 'ALL';
export const TIME_RANGES: TimeRange[] = ['3M', '1Y', 'ALL'];

/** Whether a date falls in the range, counted back from `now`. */
export function withinRange(
  iso: string,
  range: TimeRange,
  now: Date = new Date(),
): boolean {
  if (range === 'ALL') return true;
  const from = new Date(now);
  if (range === '3M') from.setMonth(from.getMonth() - 3);
  else from.setFullYear(from.getFullYear() - 1);
  return Date.parse(iso) >= from.getTime();
}
