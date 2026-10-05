import type { PreviousSet } from '@shared/types/api.types';
import { formatTarget } from './logged-values';

/** One row's hint from the last time: its own set, or the last one for a row
 *  beyond what was done then. */
export const previousPlaceholder = (
  previousSets: PreviousSet[] | undefined,
  index: number,
  key: string,
) => {
  if (!previousSets?.length) return undefined;
  const set = previousSets[Math.min(index, previousSets.length - 1)];
  return formatTarget(set.metrics[key]);
};
