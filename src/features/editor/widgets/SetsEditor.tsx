import { CornerDownRight, Plus } from 'lucide-react-native';
import { Fragment, useMemo } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useUnitSystem } from '@features/units/useUnitSystem';
import { toStoredValue } from '@shared/lib/unit-system';
import {
  compositesIn,
  metricsIn,
  previousSetsIn,
  toDisplaySet,
  toStoredSet,
} from '../lib/display-sets';
import { useTheme } from '@shared/theme/ThemeProvider';
import type {
  CompositeMetric,
  Metric,
  MetricMode,
  MetricValue,
  PreviousSet,
  SetMetrics,
  SetType,
} from '@shared/types/api.types';
import {
  buildColDefs,
  createDefaultSet,
  createDefaultSubSet,
  isCompoundSetType,
  type MetricColDef,
} from '../constants/metric-field-config';
import { SET_TYPE_KEYS } from '../constants/template.labels';
import { useUnitAcronym } from '../hooks/useMetricsCatalog';
import { fieldPosition } from '../lib/field-chain';
import { canonicalUnit, formatTarget } from '../lib/logged-values';
import { showsSetComment } from '../lib/set-comment';
import {
  previousPlaceholder,
  withPlaceholderValues,
} from '../lib/workout-cells';
import { rowKey, type EditableWorkoutSet } from '../types/workout-set.types';
import { MetricCell } from './MetricCell';
import { SetTick, SetTypeBadge, useRowTint } from './SetControls';
import {
  AddRowButton,
  COL,
  FixedCell,
  GridRow,
  MetricColumn,
  MetricHeader,
  ModeEditingBanner,
  SetCommentRow,
  SetGrid,
  SwipeRow,
} from './SetGrid';

interface SetsEditorProps {
  metrics: Metric[];
  compositeMetrics?: CompositeMetric[];
  /** Metric keys in render order. Falls back to metrics-then-composites. */
  columnOrder?: string[];
  sets: EditableWorkoutSet[];
  onChange: (sets: EditableWorkoutSet[]) => void;
  isReadOnly?: boolean;
  /** Swaps every value field for its comparison-mode picker (⋯ → "Cambiar
   *  modos"). Owned by the exercise card. */
  modeEditing?: boolean;
  onExitModeEditing?: () => void;
  /** A comment field under every set (⋯ → "Comentar series"). */
  commentsEditing?: boolean;
  /** A workout's sets: each is ticked, takes exact values, and shows the
   *  plan's value as its placeholder and a trophy when it set a record. */
  logging?: boolean;
  /** After a set is ticked or unticked — the card saves it at once. */
  onTickChanged?: () => void;
  /** A workout's: what was logged the last time this exercise was done. */
  previousSets?: PreviousSet[];
}

/**
 * One exercise's sets, as the web's SetsEditor: a row per set (its type, a
 * cell per metric, in a workout the tick), the rows of a compound set's
 * sub-sets under it, and the add button. A set is deleted by swiping it to
 * the left (or from its type's sheet). Every change is handed up whole; the
 * card autosaves.
 *
 * A finished workout read as a record shows no ticks and no green: what was
 * done is the values (the ticks come back with Editar).
 */
export function SetsEditor({
  metrics: storedMetrics,
  compositeMetrics: storedComposites = [],
  columnOrder,
  sets: storedSets,
  onChange: onStoredChange,
  isReadOnly = false,
  modeEditing = false,
  onExitModeEditing,
  commentsEditing = false,
  logging = false,
  onTickChanged,
  previousSets: storedPreviousSets,
}: SetsEditorProps) {
  const { t } = useTranslation(['templates', 'common']);
  // Everything below works in the member's units (kg or lb, km or mi): the
  // sets, their hints and the units a new value takes. The sets go back out
  // with every untouched value exactly as it was stored.
  const unitSystem = useUnitSystem();
  const metrics = useMemo(
    () => metricsIn(storedMetrics, unitSystem),
    [storedMetrics, unitSystem],
  );
  const compositeMetrics = useMemo(
    () => compositesIn(storedComposites, unitSystem),
    [storedComposites, unitSystem],
  );
  const sets = useMemo(
    () => storedSets.map((set) => toDisplaySet(set, unitSystem)),
    [storedSets, unitSystem],
  );
  const previousSets = useMemo(
    () => previousSetsIn(storedPreviousSets, unitSystem),
    [storedPreviousSets, unitSystem],
  );
  const onChange = (next: EditableWorkoutSet[]) =>
    onStoredChange(next.map(toStoredSet));
  const theme = useTheme();
  const rowTint = useRowTint();
  const unitAcronym = useUnitAcronym();
  // A locked plan has nothing to edit, modes included; a workout has none.
  const modeEdit = modeEditing && !isReadOnly && !logging;
  // The ticks (and a done set's green) are for logging, not for reading back.
  const ticks = logging && !isReadOnly;
  const cols = useMemo(
    () => buildColDefs(metrics, compositeMetrics, columnOrder),
    [metrics, compositeMetrics, columnOrder],
  );

  // The unit in effect for a column: the one stored on any set (uniform,
  // chosen in the metrics sheet) or the metric's default. A workout's empty
  // set still says its unit through the plan's target.
  const activeUnitKey = (col: MetricColDef): string | undefined => {
    if (
      col.metricValueType === 'OPTIONS' ||
      col.metricValueType === 'FORMAT_TEXT'
    )
      return undefined;
    for (const s of sets) {
      const u = s.metrics[col.key]?.unit ?? s.targetMetrics?.[col.key]?.unit;
      if (u) return canonicalUnit(u) ?? undefined;
    }
    return col.unit ?? col.defaultUnit ?? col.unitOptions?.[0];
  };

  // The plan's value; with no plan, what was done the last time.
  const placeholderFor = (index: number, key: string) =>
    formatTarget(sets[index].targetMetrics?.[key]) ??
    (logging ? previousPlaceholder(previousSets, index, key) : undefined);

  // ─── Mutations ─────────────────────────────────────────────────────────────

  const updateSet = (index: number, patch: Partial<EditableWorkoutSet>) =>
    onChange(sets.map((s, i) => (i === index ? { ...s, ...patch } : s)));

  const updateSetMetric = (index: number, key: string, value: MetricValue) =>
    updateSet(index, { metrics: { ...sets[index].metrics, [key]: value } });

  const updateSubSetMetric = (
    index: number,
    subIndex: number,
    key: string,
    value: MetricValue,
  ) =>
    updateSet(index, {
      subSets: (sets[index].subSets ?? []).map((s, j) =>
        j === subIndex ? { ...s, metrics: { ...s.metrics, [key]: value } } : s,
      ),
    });

  const toggleDone = (index: number) => {
    const done = !sets[index].completed;
    // Ticked, the empty fields keep the hints they showed as real values;
    // unticked, what is there stays.
    const set = done
      ? withPlaceholderValues(
          sets[index],
          // A plan-only column logs nothing, so a tick copies nothing into it.
          cols.filter((col) => !col.planOnly).map((col) => col.key),
          {
            previousSets,
            index,
            unitOf: (key) => {
              const col = cols.find((c) => c.key === key);
              return col && activeUnitKey(col);
            },
          },
        )
      : sets[index];
    updateSet(index, {
      ...set,
      completed: done,
      // A compound set is done as a whole.
      subSets: set.subSets?.map((sub) => ({ ...sub, completed: done })),
    });
    onTickChanged?.();
  };

  const handleSetTypeChange = (index: number, setType: SetType) => {
    const set = sets[index];
    if (isCompoundSetType(setType)) {
      const subSets = set.subSets?.length
        ? set.subSets
        : [createDefaultSubSet(metrics, compositeMetrics)];
      updateSet(index, { setType, subSets });
    } else {
      updateSet(index, { setType, subSets: undefined });
    }
  };

  const addSubSet = (index: number) => {
    const set = sets[index];
    const base = createDefaultSubSet(metrics, compositeMetrics);
    // Inherit any chosen units from the parent set's metrics.
    const withUnits = { ...base.metrics };
    for (const [key, v] of Object.entries(set.metrics)) {
      if (v?.unit && withUnits[key])
        withUnits[key] = { ...withUnits[key]!, unit: v.unit };
    }
    updateSet(index, {
      subSets: [...(set.subSets ?? []), { ...base, metrics: withUnits }],
    });
  };

  const removeSubSet = (index: number, subIndex: number) =>
    updateSet(index, {
      subSets: (sets[index].subSets ?? []).filter((_, j) => j !== subIndex),
    });

  const removeSet = (index: number) => {
    if (sets.length <= 1) return;
    onChange(sets.filter((_, i) => i !== index));
  };

  const addSet = () =>
    onChange([
      ...sets,
      createDefaultSet(metrics, compositeMetrics, sets.at(-1)),
    ]);

  // A column's modes, for its header while the mode editor is open.
  const columnModes = (key: string): MetricMode[] =>
    sets.flatMap((set) => [
      set.metrics[key]?.mode ?? 'EXACT',
      ...(set.subSets ?? []).map((sub) => sub.metrics[key]?.mode ?? 'EXACT'),
    ]);

  const applyColumnMode = (key: string, mode: MetricMode) => {
    const patch = (m: SetMetrics): SetMetrics => ({
      ...m,
      // On the stored value: a mode says nothing about units, so changing it
      // must not re-save the column's numbers converted.
      [key]: {
        ...(m[key] ? toStoredValue(m[key]) : { value: null }),
        mode,
      } as MetricValue,
    });
    onChange(
      sets.map((set) => ({
        ...set,
        metrics: patch(set.metrics),
        subSets: set.subSets?.map((sub) => ({
          ...sub,
          metrics: patch(sub.metrics),
        })),
      })),
    );
  };

  const lastSet = sets.at(-1);
  const compoundLast =
    lastSet && isCompoundSetType(lastSet.setType) ? lastSet.setType : null;

  return (
    <View style={{ gap: 8 }}>
      {modeEdit && onExitModeEditing && (
        <ModeEditingBanner onDone={onExitModeEditing} />
      )}
      <SetGrid cols={cols} fixedWidth={COL.type + (ticks ? COL.tick : 0)}>
        {/* Header: only the metrics are named; the badge reads on its own. */}
        <GridRow>
          <FixedCell width={COL.type} />
          {cols.map((col) => {
            const unit = activeUnitKey(col);
            return (
              <MetricHeader
                key={col.key}
                col={col}
                unitLabel={unit ? unitAcronym(unit) : undefined}
                modes={modeEdit ? columnModes(col.key) : undefined}
                onApplyMode={
                  modeEdit ? (m) => applyColumnMode(col.key, m) : undefined
                }
              />
            );
          })}
          {ticks && <FixedCell width={COL.tick} />}
        </GridRow>

        {sets.map((set, index) => {
          const compound = isCompoundSetType(set.setType);
          const subSets = set.subSets ?? [];
          const done = ticks && !!set.completed;
          const tint = rowTint(set.setType, done);
          const key = rowKey(set, index);
          const deletable = !isReadOnly && sets.length > 1;
          return (
            <Fragment key={key}>
              <SwipeRow
                id={key}
                enabled={deletable}
                onDelete={() => removeSet(index)}
              >
                <GridRow tint={tint} last={!compound || subSets.length === 0}>
                  <FixedCell width={COL.type}>
                    <SetTypeBadge
                      setType={set.setType}
                      onChange={(v) => handleSetTypeChange(index, v)}
                      isReadOnly={isReadOnly}
                      records={logging ? set.recordDetails : undefined}
                      onDelete={deletable ? () => removeSet(index) : undefined}
                    />
                  </FixedCell>
                  {cols.map((col, colIndex) => (
                    <MetricColumn key={col.key} col={col}>
                      <MetricCell
                        col={col}
                        value={set.metrics[col.key]}
                        onChange={(value) =>
                          updateSetMetric(index, col.key, value)
                        }
                        isReadOnly={isReadOnly}
                        modeEditing={modeEdit}
                        logging={logging}
                        placeholder={placeholderFor(index, col.key)}
                        unit={activeUnitKey(col)}
                        planValue={set.targetMetrics?.[col.key]}
                        position={fieldPosition(index, colIndex)}
                        completed={done}
                      />
                    </MetricColumn>
                  ))}
                  {ticks && (
                    <FixedCell width={COL.tick}>
                      <SetTick
                        done={!!set.completed}
                        onToggle={() => toggleDone(index)}
                      />
                    </FixedCell>
                  )}
                </GridRow>
              </SwipeRow>

              {compound &&
                subSets.map((sub, subIndex) => (
                  <SwipeRow
                    key={rowKey(sub, subIndex)}
                    id={`${key}:${rowKey(sub, subIndex)}`}
                    enabled={!isReadOnly && subSets.length > 1}
                    onDelete={() => removeSubSet(index, subIndex)}
                  >
                    <GridRow
                      tint={tint}
                      first={false}
                      last={subIndex === subSets.length - 1}
                    >
                      <FixedCell width={COL.type}>
                        <CornerDownRight size={14} color={theme.text(0.3)} />
                      </FixedCell>
                      {cols.map((col, colIndex) => (
                        <MetricColumn key={col.key} col={col}>
                          <MetricCell
                            col={col}
                            value={sub.metrics[col.key]}
                            onChange={(value) =>
                              updateSubSetMetric(
                                index,
                                subIndex,
                                col.key,
                                value,
                              )
                            }
                            isReadOnly={isReadOnly}
                            modeEditing={modeEdit}
                            logging={logging}
                            placeholder={formatTarget(
                              sub.targetMetrics?.[col.key],
                            )}
                            unit={activeUnitKey(col)}
                            planValue={sub.targetMetrics?.[col.key]}
                            position={fieldPosition(index, colIndex, subIndex)}
                            completed={done}
                          />
                        </MetricColumn>
                      ))}
                      {ticks && <FixedCell width={COL.tick} />}
                    </GridRow>
                  </SwipeRow>
                ))}

              {showsSetComment(set, commentsEditing, isReadOnly) && (
                <SetCommentRow
                  value={set.notes ?? ''}
                  planNotes={set.planNotes}
                  onChange={(notes) => updateSet(index, { notes })}
                  isReadOnly={isReadOnly}
                />
              )}
            </Fragment>
          );
        })}
      </SetGrid>

      {!isReadOnly && (
        <AddRowButton
          label={t('templates:setsEditor.addSet')}
          onPress={addSet}
          actions={
            compoundLast
              ? [
                  {
                    key: 'after',
                    label: t('templates:setsEditor.addSetAfter'),
                    icon: Plus,
                    onPress: addSet,
                  },
                  {
                    key: 'inside',
                    label: t('templates:setsEditor.addSetInside', {
                      type: t(
                        `templates:setTypes.${SET_TYPE_KEYS[compoundLast]}`,
                      ),
                    }),
                    icon: CornerDownRight,
                    onPress: () => addSubSet(sets.length - 1),
                  },
                ]
              : undefined
          }
        />
      )}
    </View>
  );
}
