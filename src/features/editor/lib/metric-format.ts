import type {
  CompositeMetric,
  Metric,
  SetMetrics,
  EditorSet,
} from '@shared/types/api.types';

/** A formatted metric ready to render: the display text plus enough of the raw
 *  value to style it (currently only RPE needs that — see `rpeTone`). */
export interface MetricChip {
  /** Metric key, e.g. "REPS", "WEIGHT", "RPE". */
  key: string;
  /** Display text, e.g. "10 reps", "6/8 RPE". */
  text: string;
  /** Highest numeric value in the chip (the max of a range), when numeric. */
  numeric: number | null;
}

/** One metric of one set, split into its parts. The chips layout glues the unit
 *  back on; the table layout keeps them apart — value in the cell, unit in the
 *  column header. */
export interface MetricCell {
  /** Metric key, e.g. "REPS", "WEIGHT", "RPE". */
  key: string;
  /** The value alone, with any comparison prefix: "80", "8/10", "<5". */
  value: string;
  /** Unit key stored on this value, when the metric carries one. */
  unit: string | null;
  /** Highest numeric value (the max of a range), when numeric. */
  numeric: number | null;
}

const toNumber = (v: unknown): number | null => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

/** Orders a set's metric entries by the resolved metric order. Keys the order
 *  doesn't mention keep their position in the stored JSON, appended after. */
function orderedEntries(
  metrics: SetMetrics | undefined,
  order?: string[],
): [string, SetMetrics[string]][] {
  const entries = Object.entries(metrics ?? {});
  const rank = new Map((order ?? []).map((key, index) => [key, index]));
  if (rank.size === 0) return entries;
  const fallback = rank.size;
  return [...entries].sort(
    ([a], [b]) => (rank.get(a) ?? fallback) - (rank.get(b) ?? fallback),
  );
}

/**
 * Splits a set's stored metrics into ordered {@link MetricCell}s, dropping every
 * metric left blank. Shared by both TV metric layouts.
 */
export function formatSetMetricCells(
  metrics: SetMetrics | undefined,
  /** Resolved metric key order (entry.resolvedMetricOrder). */
  order?: string[],
): MetricCell[] {
  const cells: MetricCell[] = [];
  for (const [key, val] of orderedEntries(metrics, order)) {
    if (!val) continue;

    let value: string;
    let numeric: number | null;
    if (val.mode === 'RANGE') {
      const min = val.min ?? '';
      const max = val.max ?? '';
      if (min === '' && max === '') continue;
      // A half-filled range is a single number: printing "6/" leaves the
      // reader waiting for a second value that was never set, so the lone end
      // is shown on its own.
      const only = min === '' ? max : max === '' ? min : null;
      value = only === null ? `${min}/${max}` : String(only);
      // A range's intensity is read off its top end.
      numeric = toNumber(only === null ? max : only);
    } else {
      if (val.value == null || val.value === '') continue;
      const prefix =
        val.mode === 'LESS_THAN' ? '<' : val.mode === 'GREATER_THAN' ? '>' : '';
      value = `${prefix}${val.value}`;
      numeric = toNumber(val.value);
    }

    cells.push({ key, value, unit: val.unit ?? null, numeric });
  }
  return cells;
}

/** Short label per metric key: its acronym, else its name, else the key. */
function shortLabels(
  entryMetrics: Metric[],
  entryComposites: CompositeMetric[],
): Map<string, string> {
  const labelByKey = new Map<string, string>();
  for (const m of entryMetrics ?? [])
    labelByKey.set(m.key, m.acronym ?? m.name ?? m.key);
  for (const c of entryComposites ?? [])
    labelByKey.set(c.key, c.acronym ?? c.name ?? c.key);
  return labelByKey;
}

/**
 * Builds compact, TV-readable metric chips for a set, e.g. "10 reps", "80 kg",
 * "8–10", "RPE 8". When a value has a unit we show the unit (it carries the
 * meaning); otherwise we fall back to the metric's short label.
 */
export function formatSetMetricChips(
  metrics: SetMetrics | undefined,
  entryMetrics: Metric[],
  entryComposites: CompositeMetric[],
  unitAcronym: (key: string) => string,
  /** Resolved metric key order (entry.resolvedMetricOrder). Keys it doesn't
   *  mention keep their position in the stored JSON, appended after. */
  order?: string[],
): MetricChip[] {
  const labelByKey = shortLabels(entryMetrics, entryComposites);
  return formatSetMetricCells(metrics, order).map((cell) => {
    const suffix = cell.unit
      ? unitAcronym(cell.unit)
      : (labelByKey.get(cell.key) ?? cell.key);
    return {
      key: cell.key,
      text: `${cell.value} ${suffix}`.trim(),
      numeric: cell.numeric,
    };
  });
}

/** Text-only view of {@link formatSetMetricChips}, for callers that just print. */
export function formatSetMetrics(
  metrics: SetMetrics | undefined,
  entryMetrics: Metric[],
  entryComposites: CompositeMetric[],
  unitAcronym: (key: string) => string,
  order?: string[],
): string[] {
  return formatSetMetricChips(
    metrics,
    entryMetrics,
    entryComposites,
    unitAcronym,
    order,
  ).map((c) => c.text);
}

// ─── Table layout ─────────────────────────────────────────────────────────────

/** A column of the TABLE metric layout — one metric, drawn once as a header. */
export interface MetricColumn {
  key: string;
  /** Short metric name, e.g. "REPS", "KG", "RPE". */
  label: string;
  /** Short unit, e.g. "kg", "s" — null when the metric carries no unit. */
  unit: string | null;
}

/** Every set of an exercise, parents and sub-sets alike, in render order. */
export function flattenSets(sets: EditorSet[]): EditorSet[] {
  return (sets ?? []).flatMap((set) => [set, ...(set.subSets ?? [])]);
}

/**
 * The columns an exercise's set table needs: one per metric that ANY of its sets
 * actually fills in, in the resolved metric order. Metrics left blank across the
 * board are skipped — an empty column would eat the horizontal room this layout
 * exists to win back.
 *
 * The unit is read off the first set that carries one; units are uniform across
 * an exercise's sets (they are chosen per metric, in the metrics dialog), which
 * is exactly why hoisting them into the header is lossless.
 */
export function buildMetricColumns(
  sets: EditorSet[],
  entryMetrics: Metric[],
  entryComposites: CompositeMetric[],
  unitAcronym: (key: string) => string,
  order?: string[],
): MetricColumn[] {
  const labelByKey = shortLabels(entryMetrics, entryComposites);
  const columns: MetricColumn[] = [];
  const byKey = new Map<string, MetricColumn>();

  for (const set of flattenSets(sets)) {
    for (const cell of formatSetMetricCells(set.metrics, order)) {
      const existing = byKey.get(cell.key);
      if (existing) {
        // A later set may be the first to name the unit.
        if (!existing.unit && cell.unit) existing.unit = unitAcronym(cell.unit);
        continue;
      }
      const column: MetricColumn = {
        key: cell.key,
        label: labelByKey.get(cell.key) ?? cell.key,
        unit: cell.unit ? unitAcronym(cell.unit) : null,
      };
      byKey.set(cell.key, column);
      columns.push(column);
    }
  }

  // The per-set cells are already ordered, but sets may fill different subsets
  // of the metrics, so first-seen order alone can interleave wrongly. Re-sort by
  // the resolved order, keeping unranked keys where they landed.
  const rank = new Map((order ?? []).map((key, index) => [key, index]));
  if (rank.size === 0) return columns;
  const fallback = rank.size;
  return columns
    .map((column, index) => ({ column, index }))
    .sort(
      (a, b) =>
        (rank.get(a.column.key) ?? fallback + a.index) -
        (rank.get(b.column.key) ?? fallback + b.index),
    )
    .map((entry) => entry.column);
}
