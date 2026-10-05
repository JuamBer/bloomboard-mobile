import type {
  CompositeMetric,
  Metric,
  MetricOption,
  MetricValue,
  MetricValueType,
  SetMetrics,
  SetType,
} from '@shared/types/api.types';
import type { EditableWorkoutSet } from '../types/workout-set.types';

export type MetricInputType = 'number' | 'string';

export interface MetricColDef {
  key: string;
  label: string;
  /** Compact display form for the table header (falls back to the full name). */
  acronym: string;
  /** Coarse input kind for number vs text fields. */
  valueType: MetricInputType;
  /** Underlying metric value type — drives the control (dropdown, format, …). */
  metricValueType: MetricValueType;
  /** Selectable options for OPTIONS metrics (e.g. RPE, Zona cardio). */
  options?: MetricOption[];
  /** Template pattern for FORMAT_TEXT metrics (e.g. "{d}-{d}-{d}"). */
  format?: string | null;
  unit?: string;
  unitOptions?: string[];
  step?: number;
  min?: number;
  max?: number;
  /** Digit budget: focus jumps to the next field once this many digits are typed. */
  maxDigits?: number;
  /** The column's minimum width on a phone, in points. The value sits in the
   *  cell and the unit in the header, so a number needs little room. */
  width: number;
}

/** How many digits a metric can usefully take before the cursor should move on.
 *  Sized to the largest value anyone would ever record — 999 kg, 99 reps, 9 RIR —
 *  so reaching the cap means the field is finished. Only NUMBER metrics are
 *  eligible; opt another one in by adding its key here. Consumed by
 *  `useAutoAdvance` in `SetsEditor` (planning) and `ResultSheet` (logging). */
export const METRIC_MAX_DIGITS: Record<string, number> = {
  WEIGHT: 3,
  REPS: 2,
  RIR: 1,
};

export function metricToColDef(m: Metric): MetricColDef {
  const isNumber = m.valueType === 'NUMBER' || m.valueType === 'TIME';
  const hasUnitOptions = m.units.length > 1;
  // RPE is a two-character coloured chip (RpePicker): a fixed narrow column,
  // so the table spreads its spare room over the other columns.
  const width =
    m.key.toUpperCase() === 'RPE'
      ? 52
      : m.valueType === 'OPTIONS'
        ? 104
        : m.valueType === 'FORMAT_TEXT'
          ? 92
          : 64;
  return {
    key: m.key,
    label: m.name,
    acronym: m.acronym || m.name,
    valueType: isNumber ? 'number' : 'string',
    metricValueType: m.valueType,
    options: m.valueType === 'OPTIONS' ? m.options : undefined,
    format: m.valueType === 'FORMAT_TEXT' ? m.format : undefined,
    unitOptions: hasUnitOptions ? m.units : undefined,
    unit: hasUnitOptions ? undefined : (m.defaultUnit ?? m.units[0]),
    maxDigits: m.valueType === 'NUMBER' ? METRIC_MAX_DIGITS[m.key] : undefined,
    width,
  };
}

export function compositeMetricToColDef(m: CompositeMetric): MetricColDef {
  const isNumber = m.valueType === 'NUMBER' || m.valueType === 'TIME';
  // Composites carry compound units (km/h, min/km) drawn from the same Unit
  // table as simple metrics, so the unit plumbing below is deliberately the
  // same as `metricToColDef`'s — the column header, the in-cell suffix and the
  // unit picker all read these two fields.
  const units = m.units ?? [];
  const hasUnitOptions = units.length > 1;
  return {
    key: m.key,
    label: m.name,
    acronym: m.acronym || m.name,
    valueType: isNumber ? 'number' : 'string',
    metricValueType: m.valueType,
    unitOptions: hasUnitOptions ? units : undefined,
    unit: hasUnitOptions ? undefined : (m.defaultUnit ?? units[0]),
    width: 72,
  };
}

export type FormatToken =
  { type: 'digit'; idx: number } | { type: 'lit'; text: string };

/** Parses a metric format template into render tokens: each `{d}` becomes a
 *  numbered single-digit slot, every other character a literal separator.
 *  Example: "{d}-{d}-{d}" → [digit0, "-", digit1, "-", digit2]. */
export function parseFormatTokens(format: string | null | undefined): {
  tokens: FormatToken[];
  digitCount: number;
} {
  const tokens: FormatToken[] = [];
  if (!format) return { tokens, digitCount: 0 };
  let idx = 0;
  for (let i = 0; i < format.length;) {
    if (format.startsWith('{d}', i)) {
      tokens.push({ type: 'digit', idx });
      idx += 1;
      i += 3;
    } else {
      tokens.push({ type: 'lit', text: format[i] });
      i += 1;
    }
  }
  return { tokens, digitCount: idx };
}

/** Sorts `items` by an ordered list of keys. Keys the order doesn't mention keep
 *  their original relative position at the end — so a metric added to the
 *  catalog after a company set its order still shows up, just last. */
export function orderByKeys<T>(
  items: T[],
  keyOf: (item: T) => string,
  order: string[] | undefined,
): T[] {
  if (!order?.length) return items;

  const rank = new Map(order.map((key, index) => [key, index]));
  const fallback = order.length;
  return [...items].sort(
    (a, b) =>
      (rank.get(keyOf(a)) ?? fallback) - (rank.get(keyOf(b)) ?? fallback),
  );
}

/** Build ordered column defs. Without `order`, simple metrics come first and
 *  composites last (the historical behaviour); with it, the two are interleaved
 *  exactly as `order` says — that's what lets a composite sit between two
 *  simple metrics. */
export function buildColDefs(
  metrics: Metric[],
  compositeMetrics: CompositeMetric[],
  order?: string[],
): MetricColDef[] {
  const defs = [
    ...metrics.map(metricToColDef),
    ...(compositeMetrics ?? []).map(compositeMetricToColDef),
  ];
  return orderByKeys(defs, (def) => def.key, order);
}

/** Stable client-side id for newly created sets/sub-sets so React keys stay
 *  constant across auto-saves (server ids are never sent back into local
 *  state). Hermes has no crypto.randomUUID; uniqueness within a card is all a
 *  key needs. */
let clientSetSeq = 0;
const newClientSetId = (): string =>
  `tmp-${Date.now().toString(36)}-${(clientSetSeq++).toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;

/** Set types that are composed of an ordered list of sub-sets. */
export const COMPOUND_SET_TYPES: ReadonlySet<SetType> = new Set<SetType>([
  'DROP',
  'REST_PAUSE',
  'CLUSTER',
]);

export const isCompoundSetType = (setType: SetType): boolean =>
  COMPOUND_SET_TYPES.has(setType);

const createDefaultMetrics = (
  metrics: Metric[],
  compositeMetrics: CompositeMetric[],
): SetMetrics => {
  const result: SetMetrics = {};
  for (const m of metrics) {
    const value: MetricValue = { mode: 'EXACT', value: null };
    if (m.units.length > 1) value.unit = m.defaultUnit ?? m.units[0];
    result[m.key] = value;
  }
  for (const cm of compositeMetrics ?? []) {
    const value: MetricValue = { mode: 'EXACT', value: null };
    if ((cm.units ?? []).length > 1) value.unit = cm.defaultUnit ?? cm.units[0];
    result[cm.key] = value;
  }
  return result;
};

export const createDefaultSubSet = (
  metrics: Metric[],
  compositeMetrics: CompositeMetric[],
): EditableWorkoutSet => ({
  id: newClientSetId(),
  setType: 'NORMAL',
  metrics: createDefaultMetrics(metrics, compositeMetrics),
});

/**
 * A new set, seeded from the one before it so the coach keeps typing instead
 * of refilling every column. A compound set (cluster, drop set…) is never
 * copied as one: the set after it is a plain set with its values, and growing
 * the compound is a choice of its own ("inside the cluster", see SetsEditor).
 */
export const createDefaultSet = (
  metrics: Metric[],
  compositeMetrics: CompositeMetric[],
  previous?: EditableWorkoutSet,
): EditableWorkoutSet => {
  if (previous) {
    const compound = isCompoundSetType(previous.setType);
    return {
      ...previous,
      id: newClientSetId(),
      setType: compound ? 'NORMAL' : previous.setType,
      metrics: { ...previous.metrics },
      // In a workout the copy is the next set to do, not one already done.
      ...(previous.completed !== undefined
        ? { completed: false, records: [] }
        : {}),
      subSets: compound
        ? undefined
        : previous.subSets?.map((s) => ({
            ...s,
            id: newClientSetId(),
            metrics: { ...s.metrics },
          })),
    };
  }

  return {
    id: newClientSetId(),
    setType: 'NORMAL',
    metrics: createDefaultMetrics(metrics, compositeMetrics),
  };
};
