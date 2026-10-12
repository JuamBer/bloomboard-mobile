import type {
  CompositeMetric,
  Metric,
  PreviousSet,
  UnitSystem,
} from '@shared/types/api.types';
import {
  compositeForSystem,
  convertSetMetrics,
  metricForSystem,
  toDisplayMetrics,
  toStoredMetrics,
} from '@shared/lib/unit-system';
import type { EditableWorkoutSet } from '../types/workout-set.types';

// The editors show sets in the viewer's unit system and hand changes back with
// every untouched value as it was stored (shared/lib/unit-system.ts). Their
// state stays in stored form — whatever lands in it (a server refresh, copied
// references) is converted on the way to the screen, never on the way in.

/** A set, its plan targets and its sub-sets, as the viewer reads them. */
export const toDisplaySet = (
  set: EditableWorkoutSet,
  system: UnitSystem,
): EditableWorkoutSet => ({
  ...set,
  metrics: toDisplayMetrics(set.metrics, system),
  ...(set.targetMetrics
    ? { targetMetrics: toDisplayMetrics(set.targetMetrics, system) }
    : {}),
  ...(set.subSets
    ? { subSets: set.subSets.map((sub) => toDisplaySet(sub, system)) }
    : {}),
});

/** Back to stored form: untouched values as stored, edited ones as typed. */
export const toStoredSet = (set: EditableWorkoutSet): EditableWorkoutSet => ({
  ...set,
  metrics: toStoredMetrics(set.metrics),
  ...(set.targetMetrics
    ? { targetMetrics: toStoredMetrics(set.targetMetrics) }
    : {}),
  ...(set.subSets ? { subSets: set.subSets.map(toStoredSet) } : {}),
});

/** A partial set update, its values back in stored form. */
export const toStoredPatch = (
  patch: Partial<EditableWorkoutSet>,
): Partial<EditableWorkoutSet> => ({
  ...patch,
  ...(patch.metrics ? { metrics: toStoredMetrics(patch.metrics) } : {}),
  ...(patch.targetMetrics
    ? { targetMetrics: toStoredMetrics(patch.targetMetrics) }
    : {}),
  ...(patch.subSets ? { subSets: patch.subSets.map(toStoredSet) } : {}),
});

/** What was logged last time, as the viewer reads it — hints are read-only,
 *  and one copied into a set is typed in the viewer's units. */
export const previousSetsIn = (
  previous: PreviousSet[] | undefined,
  system: UnitSystem,
): PreviousSet[] | undefined =>
  previous?.map((p) => ({
    ...p,
    metrics: convertSetMetrics(p.metrics, system),
  }));

export const metricsIn = (metrics: Metric[], system: UnitSystem) =>
  metrics.map((m) => metricForSystem(m, system));

export const compositesIn = (
  composites: CompositeMetric[],
  system: UnitSystem,
) => composites.map((cm) => compositeForSystem(cm, system));
