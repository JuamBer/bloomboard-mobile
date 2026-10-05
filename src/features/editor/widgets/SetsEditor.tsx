import { CornerDownRight, Plus, Trash2, X } from 'lucide-react-native';
import { Fragment, useMemo } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
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
import { IconButton } from '@shared/ui/Button';
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
import { previousPlaceholder } from '../lib/workout-cells';
import type { EditableWorkoutSet } from '../types/workout-set.types';
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
 * sub-sets under it, and the add button. Every change is handed up whole;
 * the card autosaves.
 */
export function SetsEditor({
  metrics,
  compositeMetrics = [],
  columnOrder,
  sets,
  onChange,
  isReadOnly = false,
  modeEditing = false,
  onExitModeEditing,
  commentsEditing = false,
  logging = false,
  onTickChanged,
  previousSets,
}: SetsEditorProps) {
  const { t } = useTranslation(['templates', 'common']);
  const theme = useTheme();
  const rowTint = useRowTint();
  const unitAcronym = useUnitAcronym();
  // A locked plan has nothing to edit, modes included; a workout has none.
  const modeEdit = modeEditing && !isReadOnly && !logging;
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
    return col.unit ?? col.unitOptions?.[0];
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
    updateSet(index, {
      completed: done,
      // A compound set is done as a whole.
      subSets: sets[index].subSets?.map((sub) => ({ ...sub, completed: done })),
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
      [key]: { ...(m[key] ?? { value: null }), mode } as MetricValue,
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
      <SetGrid>
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
          {logging && <FixedCell width={COL.tick} />}
          {!isReadOnly && <FixedCell width={COL.action} />}
        </GridRow>

        {sets.map((set, index) => {
          const compound = isCompoundSetType(set.setType);
          const subSets = set.subSets ?? [];
          const tint = rowTint(set.setType, logging && !!set.completed);
          return (
            <Fragment key={set.id ?? index}>
              <GridRow tint={tint} last={!compound || subSets.length === 0}>
                <FixedCell width={COL.type}>
                  <SetTypeBadge
                    setType={set.setType}
                    onChange={(v) => handleSetTypeChange(index, v)}
                    isReadOnly={isReadOnly}
                    records={logging ? set.recordDetails : undefined}
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
                      position={fieldPosition(index, colIndex)}
                    />
                  </MetricColumn>
                ))}
                {logging && (
                  <FixedCell width={COL.tick}>
                    <SetTick
                      done={!!set.completed}
                      isReadOnly={isReadOnly}
                      onToggle={() => toggleDone(index)}
                    />
                  </FixedCell>
                )}
                {!isReadOnly && (
                  <FixedCell width={COL.action}>
                    <IconButton
                      icon={Trash2}
                      size={30}
                      accessibilityLabel={t('common:delete')}
                      onPress={() => removeSet(index)}
                      disabled={sets.length <= 1}
                      color={theme.text(0.35)}
                    />
                  </FixedCell>
                )}
              </GridRow>

              {compound &&
                subSets.map((sub, subIndex) => (
                  <GridRow
                    key={sub.id ?? `sub-${subIndex}`}
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
                            updateSubSetMetric(index, subIndex, col.key, value)
                          }
                          isReadOnly={isReadOnly}
                          modeEditing={modeEdit}
                          logging={logging}
                          placeholder={formatTarget(
                            sub.targetMetrics?.[col.key],
                          )}
                          unit={activeUnitKey(col)}
                          position={fieldPosition(index, colIndex, subIndex)}
                        />
                      </MetricColumn>
                    ))}
                    {logging && <FixedCell width={COL.tick} />}
                    {!isReadOnly && (
                      <FixedCell width={COL.action}>
                        <IconButton
                          icon={X}
                          size={30}
                          accessibilityLabel={t('common:remove')}
                          onPress={() => removeSubSet(index, subIndex)}
                          disabled={subSets.length <= 1}
                          color={theme.text(0.35)}
                        />
                      </FixedCell>
                    )}
                  </GridRow>
                ))}

              {showsSetComment(set.notes, commentsEditing, isReadOnly) && (
                <SetCommentRow
                  value={set.notes ?? ''}
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
