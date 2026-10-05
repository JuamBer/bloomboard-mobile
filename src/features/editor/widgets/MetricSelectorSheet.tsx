import {
  ArrowDown,
  ArrowUp,
  Check,
  Lock,
  RotateCcw,
} from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { radius } from '@shared/theme/theme';
import { makeStyles, useTheme } from '@shared/theme/ThemeProvider';
import type { CompositeMetric, Metric } from '@shared/types/api.types';
import { Button, IconButton } from '@shared/ui/Button';
import { Segmented } from '@shared/ui/controls';
import { Sheet } from '@shared/ui/Sheet';
import { CenteredSpinner } from '@shared/ui/Spinner';
import { Text } from '@shared/ui/Text';
import { orderByKeys } from '../constants/metric-field-config';
import { unitLabel } from '../constants/unit.labels';
import { useMetricsCatalog } from '../hooks/useMetricsCatalog';

export interface MetricSelection {
  metrics: Metric[];
  compositeMetrics: CompositeMetric[];
  /** The unit chosen per multi-unit metric. */
  units: Record<string, string>;
  /** The entry's own column order; empty = follow the default. */
  metricOrder: string[];
}

type SelectedItem =
  | { type: 'simple'; metric: Metric }
  | { type: 'composite'; metric: CompositeMetric };

/**
 * Which columns an exercise's sets have — weight, reps, RPE, time… — their
 * order and their units. The exercise's own defaults are marked; a composite
 * (speed = distance / time) excludes logging one of its parts on its own;
 * a Work/Rest block keeps TIME and REST, which its clock reads.
 *
 * A member has no company, so the "default" order is the catalog's.
 */
export function MetricSelectorSheet({
  open,
  onClose,
  exerciseMetrics,
  exerciseCompositeMetrics,
  selectedMetricKeys,
  selectedCompositeMetricKeys,
  selectedUnits,
  currentMetricOrder = [],
  lockedMetricKeys = [],
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  exerciseMetrics: Metric[];
  exerciseCompositeMetrics: CompositeMetric[];
  selectedMetricKeys: string[];
  selectedCompositeMetricKeys: string[];
  selectedUnits: Record<string, string>;
  currentMetricOrder?: string[];
  lockedMetricKeys?: string[];
  onConfirm: (selection: MetricSelection) => void;
}) {
  const { t } = useTranslation(['templates', 'common']);
  const styles = useStyles();
  const theme = useTheme();
  const { data: catalog, isLoading } = useMetricsCatalog();
  const locked = useMemo(() => new Set(lockedMetricKeys), [lockedMetricKeys]);

  const [simpleKeys, setSimpleKeys] = useState<string[]>(selectedMetricKeys);
  const [compositeKeys, setCompositeKeys] = useState<string[]>(
    selectedCompositeMetricKeys,
  );
  const [units, setUnits] = useState<Record<string, string>>({});
  const [order, setOrder] = useState<string[]>([]);
  const [orderDirty, setOrderDirty] = useState(false);

  // Seeded each time the sheet opens (also on the auto-open after adding an
  // exercise), from the entry's current selection.
  const [wasOpen, setWasOpen] = useState(false);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      const hasOverride = currentMetricOrder.length > 0;
      const keys = [...selectedMetricKeys, ...selectedCompositeMetricKeys];
      setSimpleKeys(selectedMetricKeys);
      setCompositeKeys(selectedCompositeMetricKeys);
      setUnits({});
      setOrder(
        hasOverride ? orderByKeys(keys, (k) => k, currentMetricOrder) : keys,
      );
      setOrderDirty(hasOverride);
    }
  }

  /** With composite C selected and one of its parts too, C's other part is
   *  off: the composite already derives it. */
  const disabledSimpleKeys = useMemo(() => {
    const disabled = new Set<string>();
    for (const key of compositeKeys) {
      const c = catalog?.compositeMetrics.find((cm) => cm.key === key);
      if (!c) continue;
      if (simpleKeys.includes(c.numerator.key)) disabled.add(c.denominator.key);
      if (simpleKeys.includes(c.denominator.key)) disabled.add(c.numerator.key);
    }
    return disabled;
  }, [compositeKeys, simpleKeys, catalog]);

  const toggle = (key: string, composite: boolean) => {
    if (!composite && disabledSimpleKeys.has(key)) return;
    const setKeys = composite ? setCompositeKeys : setSimpleKeys;
    setKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
    setOrder((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  };

  const defaultKeys = new Set([
    ...exerciseMetrics.map((m) => m.key),
    ...exerciseCompositeMetrics.map((m) => m.key),
  ]);

  const selectedItems = useMemo<SelectedItem[]>(() => {
    const items: SelectedItem[] = [];
    for (const key of order) {
      const simple = simpleKeys.includes(key)
        ? catalog?.metrics.find((m) => m.key === key)
        : undefined;
      if (simple) {
        items.push({ type: 'simple', metric: simple });
        continue;
      }
      const composite = compositeKeys.includes(key)
        ? catalog?.compositeMetrics.find((m) => m.key === key)
        : undefined;
      if (composite) items.push({ type: 'composite', metric: composite });
    }
    return items;
  }, [order, catalog, simpleKeys, compositeKeys]);

  const available = {
    simple: (catalog?.metrics ?? []).filter((m) => !simpleKeys.includes(m.key)),
    composite: (catalog?.compositeMetrics ?? []).filter(
      (m) => !compositeKeys.includes(m.key),
    ),
  };

  const unitAcronym = (key: string) =>
    catalog?.units.find((u) => u.key === key)?.acronym ?? key;
  const unitFor = (m: Metric | CompositeMetric) =>
    units[m.key] ?? selectedUnits[m.key] ?? m.defaultUnit ?? m.units[0];
  const unitOptionLabel = (key: string) =>
    `${unitLabel(key)} (${unitAcronym(key)})`;
  const compositeSublabel = (cm: CompositeMetric) => {
    const parts = `${cm.numerator.name} / ${cm.denominator.name}`;
    return (cm.units ?? []).length === 1
      ? `${parts} · ${unitAcronym(cm.units[0])}`
      : parts;
  };

  const move = (index: number, by: -1 | 1) => {
    setOrder((prev) => {
      const visible = selectedItems.map((i) => i.metric.key);
      const next = [...visible];
      const [key] = next.splice(index, 1);
      next.splice(index + by, 0, key);
      return [...next, ...prev.filter((k) => !visible.includes(k))];
    });
    setOrderDirty(true);
  };

  const confirm = () => {
    const metrics = selectedItems
      .filter(
        (i): i is { type: 'simple'; metric: Metric } => i.type === 'simple',
      )
      .map((i) => i.metric);
    const compositeMetrics = selectedItems
      .filter(
        (i): i is { type: 'composite'; metric: CompositeMetric } =>
          i.type === 'composite',
      )
      .map((i) => i.metric);
    const finalUnits: Record<string, string> = {};
    for (const m of [...metrics, ...compositeMetrics]) {
      if ((m.units ?? []).length > 1) finalUnits[m.key] = unitFor(m);
    }
    // An explicit order only when it was customised (now or before);
    // otherwise the entry keeps following the default.
    onConfirm({
      metrics,
      compositeMetrics,
      units: finalUnits,
      metricOrder: orderDirty ? order : [],
    });
    onClose();
  };

  const availableRow = (
    key: string,
    label: string,
    sublabel: string | undefined,
    composite: boolean,
  ) => {
    const disabled = !composite && disabledSimpleKeys.has(key);
    return (
      <Pressable
        key={key}
        onPress={() => toggle(key, composite)}
        disabled={disabled}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: false, disabled }}
        style={({ pressed }) => [
          styles.row,
          pressed && { backgroundColor: theme.fill(0.06) },
          disabled && { opacity: 0.3 },
        ]}
      >
        <View style={styles.box} />
        <View style={styles.texts}>
          <Text variant="bodySmall" weight="medium">
            {label}
          </Text>
          {sublabel ? (
            <Text variant="caption" muted={0.45} numberOfLines={1}>
              {sublabel}
            </Text>
          ) : null}
        </View>
        {defaultKeys.has(key) && (
          <Text variant="micro" accent>
            {t('templates:metricSelector.byDefault')}
          </Text>
        )}
      </Pressable>
    );
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={t('templates:metricSelector.title')}
      full
      footer={
        <>
          <Button
            label={t('common:cancel')}
            variant="secondary"
            flex
            onPress={onClose}
          />
          <Button
            label={t('common:confirm')}
            flex
            onPress={confirm}
            disabled={isLoading}
          />
        </>
      }
    >
      {isLoading || !catalog ? (
        <CenteredSpinner />
      ) : (
        <>
          {selectedItems.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHead}>
                <Text
                  variant="micro"
                  muted={0.45}
                  uppercase
                  style={styles.flex}
                >
                  {t('app:metrics.selected')}
                </Text>
                {orderDirty && selectedItems.length > 1 && (
                  <Pressable
                    onPress={() => {
                      setOrder([...simpleKeys, ...compositeKeys]);
                      setOrderDirty(false);
                    }}
                    hitSlop={8}
                    style={styles.reset}
                  >
                    <RotateCcw size={12} color={theme.text(0.45)} />
                    <Text variant="caption" weight="bold" muted={0.45}>
                      {t('templates:metricSelector.resetOrder')}
                    </Text>
                  </Pressable>
                )}
              </View>
              {selectedItems.map((item, index) => {
                const m = item.metric;
                const isLocked = locked.has(m.key);
                const multi = (m.units ?? []).length > 1;
                const sublabel =
                  item.type === 'composite'
                    ? compositeSublabel(item.metric)
                    : !multi && m.units[0]
                      ? unitOptionLabel(m.units[0])
                      : undefined;
                return (
                  <View key={m.key} style={[styles.selected]}>
                    <View style={styles.selectedHead}>
                      <Pressable
                        onPress={() =>
                          !isLocked && toggle(m.key, item.type === 'composite')
                        }
                        disabled={isLocked}
                        accessibilityRole="checkbox"
                        accessibilityState={{
                          checked: true,
                          disabled: isLocked,
                        }}
                        accessibilityHint={
                          isLocked
                            ? t('templates:metricSelector.lockedByMode')
                            : undefined
                        }
                        style={styles.selectedToggle}
                      >
                        <View style={[styles.box, styles.boxOn]}>
                          {isLocked ? (
                            <Lock
                              size={11}
                              color={theme.colors.accentContrast}
                            />
                          ) : (
                            <Check
                              size={13}
                              strokeWidth={3}
                              color={theme.colors.accentContrast}
                            />
                          )}
                        </View>
                        <View style={styles.texts}>
                          <Text variant="bodySmall" weight="bold">
                            {m.name}
                          </Text>
                          {sublabel ? (
                            <Text
                              variant="caption"
                              muted={0.45}
                              numberOfLines={1}
                            >
                              {sublabel}
                            </Text>
                          ) : null}
                        </View>
                      </Pressable>
                      <IconButton
                        icon={ArrowUp}
                        size={32}
                        accessibilityLabel={t('app:actions.moveUp')}
                        disabled={index === 0}
                        onPress={() => move(index, -1)}
                      />
                      <IconButton
                        icon={ArrowDown}
                        size={32}
                        accessibilityLabel={t('app:actions.moveDown')}
                        disabled={index === selectedItems.length - 1}
                        onPress={() => move(index, 1)}
                      />
                    </View>
                    {multi && (
                      <View style={styles.units}>
                        <Text variant="caption" muted={0.5}>
                          {t('templates:metricSelector.unit')}
                        </Text>
                        <Segmented
                          value={unitFor(m)}
                          onChange={(u) =>
                            setUnits((prev) => ({ ...prev, [m.key]: u }))
                          }
                          options={m.units.map((u) => ({
                            value: u,
                            label: unitAcronym(u),
                          }))}
                          style={styles.flex}
                        />
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          )}

          {available.simple.length > 0 && (
            <View style={styles.section}>
              <Text variant="micro" muted={0.45} uppercase>
                {t('templates:metricSelector.simpleMetrics')}
              </Text>
              {available.simple.map((m) =>
                availableRow(
                  m.key,
                  m.name,
                  m.units.length === 1
                    ? unitOptionLabel(m.units[0])
                    : undefined,
                  false,
                ),
              )}
            </View>
          )}
          {available.composite.length > 0 && (
            <View style={styles.section}>
              <Text variant="micro" muted={0.45} uppercase>
                {t('templates:metricSelector.compositeMetrics')}
              </Text>
              {available.composite.map((cm) =>
                availableRow(cm.key, cm.name, compositeSublabel(cm), true),
              )}
            </View>
          )}
        </>
      )}
    </Sheet>
  );
}

const useStyles = makeStyles((t) => ({
  section: { gap: 6 },
  sectionHead: { flexDirection: 'row', alignItems: 'center' },
  reset: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  flex: { flex: 1 },
  row: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: t.line(0.06),
    backgroundColor: t.fill(0.03),
  },
  selected: {
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: t.ink(0.3),
    backgroundColor: t.ink(0.1),
  },
  selectedHead: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  selectedToggle: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  box: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: t.line(0.3),
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxOn: { backgroundColor: t.colors.accent, borderColor: t.colors.accent },
  texts: { flex: 1, minWidth: 0 },
  units: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingLeft: 32,
  },
}));
