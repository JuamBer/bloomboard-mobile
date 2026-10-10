import { useQuery } from '@tanstack/react-query';
import { Check, ClipboardCopy, MessageSquare } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { isCompoundSetType } from '@features/editor/constants/metric-field-config';
import { SET_TYPE_INITIALS } from '@features/editor/constants/template.labels';
import { useUnitAcronym } from '@features/editor/hooks/useMetricsCatalog';
import {
  canonicalUnit,
  targetToLogged,
} from '@features/editor/lib/logged-values';
import { formatSetMetrics } from '@features/editor/lib/metric-format';
import type { EditableWorkoutSet } from '@features/editor/types/workout-set.types';
import { useSetTypeColors } from '@features/editor/widgets/SetControls';
import { workoutsService } from '@shared/api/services/workouts.service';
import { radius } from '@shared/theme/theme';
import { makeStyles, useTheme } from '@shared/theme/ThemeProvider';
import type {
  EditorExercise,
  MetricValue,
  ReferenceSet,
  SetMetrics,
} from '@shared/types/api.types';
import { Button } from '@shared/ui/Button';
import { Sheet } from '@shared/ui/Sheet';
import { CenteredSpinner } from '@shared/ui/Spinner';
import { Text } from '@shared/ui/Text';
import { formatWorkoutDate } from '../lib/dates';

/** Rewrites an exercise's sets with copied values. */
export type CopySets = (current: EditableWorkoutSet[]) => EditableWorkoutSet[];

/**
 * What a person compares an exercise against while logging it: the plan for
 * today, the last time they did it, and the last time they did it in this same
 * plan — each with its notes (the plan's, or what they wrote then) and its
 * sets' comments. Each can be copied into the sets — by position, values only,
 * nothing ticked — to be adjusted from there.
 */
export function WorkoutReferencesSheet({
  open,
  onClose,
  workoutId,
  entry,
  canCopy,
  onCopy,
}: {
  open: boolean;
  onClose: () => void;
  workoutId: string;
  entry: EditorExercise;
  canCopy: boolean;
  onCopy: (copy: CopySets) => void;
}) {
  const { t, i18n } = useTranslation(['workouts', 'common']);
  const styles = useStyles();
  const theme = useTheme();
  const unitAcronym = useUnitAcronym();
  const colorsOf = useSetTypeColors();
  const { data, isLoading } = useQuery({
    queryKey: ['workout', workoutId, 'references', entry.id],
    queryFn: () => workoutsService.references(workoutId, entry.id),
    enabled: open,
  });

  const keys = new Set([
    ...entry.metrics.map((m) => m.key),
    ...entry.compositeMetrics.map((m) => m.key),
  ]);

  /** A reference set's values, as this exercise logs them. */
  const valuesOf = (metrics: SetMetrics, fromPlan: boolean): SetMetrics => {
    const values: SetMetrics = {};
    for (const [key, raw] of Object.entries(metrics ?? {})) {
      if (!keys.has(key) || !raw) continue;
      const value = fromPlan ? targetToLogged(raw) : raw.value;
      if (value === null || value === undefined || value === '') continue;
      const unit = canonicalUnit(raw.unit);
      values[key] = { value, ...(unit ? { unit } : {}) } as MetricValue;
    }
    return values;
  };

  const copier =
    (source: ReferenceSet[], fromPlan: boolean): CopySets =>
    (current) => {
      const next = [...current];
      source.forEach((ref, i) => {
        const base: EditableWorkoutSet = next[i] ?? {
          setType: ref.setType,
          metrics: {},
          notes: '',
          targetMetrics: null,
          completed: false,
          records: [],
        };
        const compound =
          isCompoundSetType(base.setType) && isCompoundSetType(ref.setType);
        next[i] = {
          ...base,
          metrics: { ...base.metrics, ...valuesOf(ref.metrics, fromPlan) },
          subSets: compound
            ? (base.subSets ?? []).map((sub, j) =>
                ref.subSets?.[j]
                  ? {
                      ...sub,
                      metrics: {
                        ...sub.metrics,
                        ...valuesOf(ref.subSets[j].metrics, fromPlan),
                      },
                    }
                  : sub,
              )
            : base.subSets,
        };
      });
      return next;
    };

  const section = (
    title: string,
    subtitle: string | null,
    notes: string | null | undefined,
    sets: ReferenceSet[] | null,
    empty: string,
    fromPlan: boolean,
  ) => (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <View style={styles.flex}>
          <Text variant="subheading">{title}</Text>
          {subtitle ? (
            <Text variant="caption" muted={0.45} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        {canCopy && sets && sets.length > 0 && (
          <Button
            label={t('workouts:references.copy')}
            icon={ClipboardCopy}
            variant="soft"
            size="sm"
            onPress={() => onCopy(copier(sets, fromPlan))}
          />
        )}
      </View>
      {notes?.trim() ? (
        <View style={styles.note}>
          <MessageSquare size={15} color={theme.text(0.35)} />
          <Text variant="bodySmall" muted={0.7} style={styles.flex}>
            {notes.trim()}
          </Text>
        </View>
      ) : null}
      {sets && sets.length > 0 ? (
        <View style={styles.sets}>
          {sets.map((set, i) => {
            const text = formatSetMetrics(
              set.metrics,
              entry.metrics,
              entry.compositeMetrics,
              unitAcronym,
              entry.resolvedMetricOrder,
            );
            const c = colorsOf(set.setType);
            return (
              <View key={i} style={[styles.setItem, i > 0 && styles.setRule]}>
                <View style={styles.setRow}>
                  <Text variant="caption" muted={0.35} style={styles.index}>
                    {i + 1}
                  </Text>
                  <View
                    style={[
                      styles.badge,
                      { backgroundColor: c.bg, borderColor: c.border },
                    ]}
                  >
                    <Text variant="micro" color={c.ink}>
                      {SET_TYPE_INITIALS[set.setType]}
                    </Text>
                  </View>
                  <Text variant="bodySmall" style={styles.flex}>
                    {text.length ? text.join(' · ') : '—'}
                  </Text>
                  {set.completed && (
                    <Check
                      size={16}
                      color={theme.colors.success}
                      strokeWidth={3}
                    />
                  )}
                </View>
                {/* The set's comment, under its values. */}
                {set.notes?.trim() ? (
                  <Text variant="caption" muted={0.55} style={styles.setNote}>
                    {set.notes.trim()}
                  </Text>
                ) : null}
              </View>
            );
          })}
        </View>
      ) : // A plan that only says something in words has nothing more to add.
      notes?.trim() ? null : (
        <Text variant="caption" muted={0.4} style={styles.empty}>
          {empty}
        </Text>
      )}
    </View>
  );

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={t('workouts:references.title')}
      subtitle={entry.customName || entry.exercise.name}
      full
    >
      {isLoading || !data ? (
        <CenteredSpinner />
      ) : (
        <>
          {section(
            t('workouts:references.plan'),
            null,
            data.planNotes,
            data.plan,
            t('workouts:references.noPlan'),
            true,
          )}
          {section(
            t('workouts:references.last'),
            data.last
              ? `${data.last.workoutName} · ${formatWorkoutDate(data.last.performedAt, i18n.language)}`
              : null,
            data.last?.notes,
            data.last?.sets ?? null,
            t('workouts:references.noLast'),
            false,
          )}
          {section(
            t('workouts:references.lastInTemplate'),
            data.lastInTemplate
              ? formatWorkoutDate(
                  data.lastInTemplate.performedAt,
                  i18n.language,
                )
              : null,
            data.lastInTemplate?.notes,
            data.lastInTemplate?.sets ?? null,
            t('workouts:references.noLastInTemplate'),
            false,
          )}
          {canCopy && (
            <Text variant="caption" muted={0.4}>
              {t('workouts:references.copyHint')}
            </Text>
          )}
        </>
      )}
    </Sheet>
  );
}

const useStyles = makeStyles((t) => ({
  section: { gap: 8 },
  sectionHead: { flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
  flex: { flex: 1 },
  sets: {
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: t.line(0.08),
  },
  setItem: { paddingHorizontal: 12, paddingVertical: 9, gap: 2 },
  setRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  // Past the number and the badge (14 + 10 + 22 + 10).
  setNote: { marginLeft: 56 },
  note: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: radius.xl,
    backgroundColor: t.fill(0.03),
  },
  setRule: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: t.line(0.06),
  },
  index: { width: 14, textAlign: 'right' },
  badge: {
    width: 22,
    height: 22,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: {
    padding: 12,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: t.line(0.1),
  },
}));
