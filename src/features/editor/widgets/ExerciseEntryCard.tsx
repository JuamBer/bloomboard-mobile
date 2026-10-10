import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Gauge,
  History,
  Layers,
  ListOrdered,
  MessageSquare,
  MoreVertical,
  Pencil,
  Replace,
  RotateCcw,
  SlidersHorizontal,
  Trash2,
  Ungroup,
} from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { newRecordsToast } from '@features/workouts/lib/record-toast';
import { WorkoutReferencesSheet } from '@features/workouts/widgets/WorkoutReferencesSheet';
import type { UpsertWorkoutTemplateExercisePayload } from '@shared/api/services/workout-templates.service';
import type { UpsertWorkoutExercisePayload } from '@shared/api/services/workouts.service';
import { makeStyles } from '@shared/theme/ThemeProvider';
import type {
  CompositeMetric,
  EditorExercise,
  EditorSuperSetGroup,
  Exercise,
  Metric,
  MetricValue,
} from '@shared/types/api.types';
import { ActionSheet } from '@shared/ui/ActionSheet';
import { IconButton } from '@shared/ui/Button';
import { ConfirmDialog } from '@shared/ui/ConfirmDialog';
import { Text } from '@shared/ui/Text';
import { orderByKeys } from '../constants/metric-field-config';
import { useDebouncedSave } from '../hooks/useDebouncedSave';
import { useEditorSource, type EditorDoc } from '../lib/editor-source';
import { useRegisterEntry } from '../lib/scroll-registry';
import {
  useSessionResolved,
  useTemplateSession,
} from '../lib/template-session';
import { exerciseSeconds, formatDuration } from '../lib/workout-time';
import {
  toEditableSet,
  toSetPayload,
  type EditableWorkoutSet,
} from '../types/workout-set.types';
import {
  AddZone,
  EntryNotesField,
  ExerciseNameLink,
  ExerciseThumb,
  SessionStatusToggle,
} from './EditorParts';
import { CreateSuperSetSheet, NameSheet } from './EditorSheets';
import { ExercisePickerSheet } from './ExercisePickerSheet';
import {
  MetricSelectorSheet,
  type MetricSelection,
} from './MetricSelectorSheet';
import { SetsEditor } from './SetsEditor';

// A timed block's clock reads these two, so the metric sheet will not let
// them be dropped while the block stays Work/Rest.
export const WORK_REST_METRIC_KEYS = ['TIME', 'REST'];

/** Rebuilds a set's metrics for a new selection: keeps the values of the
 *  metrics that stay, adds empty ones, drops the rest — in column order. */
export const rebuildMetrics = (
  existing: EditableWorkoutSet['metrics'],
  keys: string[],
  units: Record<string, string>,
): EditableWorkoutSet['metrics'] => {
  const next: EditableWorkoutSet['metrics'] = {};
  for (const key of keys) {
    let base = existing[key] ?? ({ mode: 'EXACT', value: null } as MetricValue);
    if (units[key]) base = { ...base, unit: units[key] };
    next[key] = base;
  }
  return next;
};

interface ExerciseEntryCardProps {
  entry: EditorExercise;
  /** The template's or the workout's id (see EditorSource). */
  docId: string;
  blockId: string;
  isReadOnly?: boolean;
  superSetGroups?: EditorSuperSetGroup[];
  /** The block's entries — the pool "create super-set" offers. */
  blockExercises?: EditorExercise[];
  /** The block is a timed circuit: the entry shows how long it runs. */
  isWorkRest?: boolean;
  /** Just added: open the metrics sheet once. */
  autoOpenMetrics?: boolean;
  onAutoOpenConsumed?: () => void;
  onOpenSort: () => void;
  onRemove: () => void;
}

/**
 * One exercise of a plan or a workout: who it is, its notes and its sets. It
 * autosaves (debounced, never racing itself, flushed on leaving); a tick saves
 * at once, as it moves the workout on (the next exercise opens, the TV
 * follows). A workout is written from more than this card — the trainer's
 * board, another device — so a server change with nothing pending here is
 * taken in, never overwritten by a stale save.
 */
export function ExerciseEntryCard({
  entry,
  docId,
  blockId,
  isReadOnly = false,
  superSetGroups = [],
  blockExercises = [],
  isWorkRest = false,
  autoOpenMetrics = false,
  onAutoOpenConsumed,
  onOpenSort,
  onRemove,
}: ExerciseEntryCardProps) {
  const { t } = useTranslation(['templates', 'common', 'workouts']);
  const styles = useStyles();
  const queryClient = useQueryClient();
  const editor = useEditorSource();
  const isWorkout = editor.kind === 'workout';
  const session = useTemplateSession();
  const isCurrent = session?.currentEntryId === entry.id;
  const resolved = useSessionResolved([entry.id]);
  const registerView = useRegisterEntry([entry.id]);

  const [notes, setNotes] = useState(entry.notes ?? '');
  const [customName, setCustomName] = useState(entry.customName ?? '');
  const [sets, setSets] = useState<EditableWorkoutSet[]>(() =>
    entry.sets.map(toEditableSet),
  );
  const [metrics, setMetrics] = useState<Metric[]>(entry.metrics);
  const [compositeMetrics, setCompositeMetrics] = useState<CompositeMetric[]>(
    entry.compositeMetrics ?? [],
  );
  // Explicit column order; empty until reordered, so the default keeps applying.
  const [metricOrder, setMetricOrder] = useState<string[]>(
    entry.metricOrder ?? [],
  );
  const [menuOpen, setMenuOpen] = useState(false);
  const [metricsOpen, setMetricsOpen] = useState(false);
  const [autoSeed, setAutoSeed] = useState<{
    simple: string[];
    composite: string[];
  } | null>(null);
  const [renameOpen, setRenameOpen] = useState(false);
  const [replaceOpen, setReplaceOpen] = useState(false);
  const [superSetOpen, setSuperSetOpen] = useState(false);
  const [referencesOpen, setReferencesOpen] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [modeEditing, setModeEditing] = useState(false);
  const [commentsEditing, setCommentsEditing] = useState(false);

  const superSetGroup = superSetGroups.find(
    (g) => g.id === entry.superSetGroupId,
  );
  const hasMetrics = metrics.length > 0 || compositeMetrics.length > 0;
  const entrySeconds = exerciseSeconds(entry);

  const selectedUnits: Record<string, string> = {};
  for (const [key, v] of Object.entries(sets[0]?.metrics ?? {})) {
    if (v?.unit) selectedUnits[key] = v.unit;
  }

  // ─── Autosave ──────────────────────────────────────────────────────────────

  const buildPayload = (
    n: string,
    m: Metric[],
    cm: CompositeMetric[],
    s: EditableWorkoutSet[],
    superSetGroupId: string | null,
    order: string[],
    cName: string,
    exerciseId: string = entry.exerciseId,
  ): UpsertWorkoutTemplateExercisePayload | UpsertWorkoutExercisePayload => ({
    exerciseId,
    notes: n,
    customName: cName,
    superSetGroupId,
    metricKeys: m.map((x) => x.key),
    compositeMetricKeys: cm.map((x) => x.key),
    metricOrder: order,
    sets: s.map(toSetPayload(editor.kind)),
  });

  const currentPayload = () =>
    buildPayload(
      notes,
      metrics,
      compositeMetrics,
      sets,
      entry.superSetGroupId,
      metricOrder,
      customName,
    );

  /** What the server holds — the baseline the debounce compares against. */
  const savedPayload = () =>
    buildPayload(
      entry.notes ?? '',
      entry.metrics,
      entry.compositeMetrics ?? [],
      entry.sets.map(toEditableSet),
      entry.superSetGroupId,
      entry.metricOrder ?? [],
      entry.customName ?? '',
    );

  /** Updates the cached document's entry without touching this card's draft. */
  const writeCache = (updated: EditorExercise) =>
    queryClient.setQueryData(editor.queryKey, (old?: EditorDoc) =>
      old?.blocks
        ? {
            ...old,
            blocks: old.blocks.map((b) =>
              b.id === blockId
                ? {
                    ...b,
                    exercises: b.exercises.map((e) =>
                      e.id === entry.id ? updated : e,
                    ),
                  }
                : b,
            ),
          }
        : old,
    );

  // No save indicator: a failed save toasts (the API client does it for every
  // request), and a good one needs no word.
  const { markSaved, flush, savedSignature } = useDebouncedSave({
    buildPayload: currentPayload,
    initialPayload: savedPayload,
    save: (payload) =>
      editor.api
        .updateExercise(docId, blockId, entry.id, payload)
        .then((updated) => {
          // A set just ticked may have beaten a personal best.
          if (isWorkout) newRecordsToast(t, entry, updated);
          writeCache(updated);
        }),
    disabled: isReadOnly,
  });

  // A tick is saved at once, after the render that holds it.
  const [tickSaves, setTickSaves] = useState(0);
  useEffect(() => {
    if (tickSaves) flush();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tickSaves]);

  // The server's copy changed (the head tick, the board, another device) and
  // nothing here is waiting to be saved: take it in.
  const serverSignature = JSON.stringify(savedPayload());
  const [seenSignature, setSeenSignature] = useState(serverSignature);
  if (isWorkout && serverSignature !== seenSignature) {
    setSeenSignature(serverSignature);
    if (JSON.stringify(currentPayload()) === savedSignature()) {
      setSets(entry.sets.map(toEditableSet));
      setNotes(entry.notes ?? '');
      setCustomName(entry.customName ?? '');
      setMetrics(entry.metrics);
      setCompositeMetrics(entry.compositeMetrics ?? []);
      setMetricOrder(entry.metricOrder ?? []);
      markSaved(savedPayload());
    }
  }

  // ─── Metrics ───────────────────────────────────────────────────────────────

  const applyMetrics = ({
    metrics: m,
    compositeMetrics: cm,
    units,
    metricOrder: order,
  }: MetricSelection) => {
    // The set JSON keys in display order, so whatever iterates the raw object
    // (the TV's chips) lines up with the table.
    const keys = orderByKeys(
      [...m.map((x) => x.key), ...cm.map((x) => x.key)],
      (k) => k,
      order,
    );
    setMetrics(m);
    setCompositeMetrics(cm);
    setMetricOrder(order);
    setSets(
      sets.map((set) => ({
        ...set,
        metrics: rebuildMetrics(set.metrics, keys, units),
        subSets: set.subSets?.map((sub) => ({
          ...sub,
          metrics: rebuildMetrics(sub.metrics, keys, units),
        })),
      })),
    );
  };

  // With nothing selected yet (just added, or cleared), the sheet starts from
  // the exercise's own defaults.
  const openMetrics = () => {
    if (!hasMetrics) {
      setAutoSeed({
        simple: entry.exercise.metrics.map((x) => x.key),
        composite: (entry.exercise.compositeMetrics ?? []).map((x) => x.key),
      });
    }
    setMetricsOpen(true);
  };

  const autoOpened = useRef(false);
  useEffect(() => {
    if (autoOpenMetrics && !autoOpened.current) {
      autoOpened.current = true;
      openMetrics();
      onAutoOpenConsumed?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoOpenMetrics]);

  // ─── Exercise-level writes ─────────────────────────────────────────────────

  const leaveSuperSet = useMutation({
    mutationFn: () =>
      editor.api.updateExercise(
        docId,
        blockId,
        entry.id,
        buildPayload(
          notes,
          metrics,
          compositeMetrics,
          sets,
          null,
          metricOrder,
          customName,
        ),
      ),
    onSuccess: (updated) => {
      markSaved(
        buildPayload(
          updated.notes ?? '',
          updated.metrics,
          updated.compositeMetrics ?? [],
          updated.sets.map(toEditableSet),
          updated.superSetGroupId,
          updated.metricOrder ?? [],
          updated.customName ?? '',
        ),
      );
      writeCache(updated);
    },
  });

  // Swaps the exercise and keeps everything else — notes, sets, metrics,
  // order — built from this card's draft, so unsaved edits survive the swap.
  const replaceExercise = useMutation({
    mutationFn: (exercise: Exercise) =>
      editor.api.updateExercise(
        docId,
        blockId,
        entry.id,
        buildPayload(
          notes,
          metrics,
          compositeMetrics,
          sets,
          entry.superSetGroupId,
          metricOrder,
          customName,
          exercise.id,
        ),
      ),
    onSuccess: (updated) => {
      setNotes(updated.notes ?? '');
      setCustomName(updated.customName ?? '');
      setMetrics(updated.metrics);
      setCompositeMetrics(updated.compositeMetrics ?? []);
      setMetricOrder(updated.metricOrder ?? []);
      setSets(updated.sets.map(toEditableSet));
      markSaved(
        buildPayload(
          updated.notes ?? '',
          updated.metrics,
          updated.compositeMetrics ?? [],
          updated.sets.map(toEditableSet),
          updated.superSetGroupId,
          updated.metricOrder ?? [],
          updated.customName ?? '',
          updated.exerciseId,
        ),
      );
      writeCache(updated);
    },
  });

  const displayName = customName || entry.exercise.name;

  return (
    <View ref={registerView} style={[styles.row, isCurrent && styles.current]}>
      <View style={styles.header}>
        <SessionStatusToggle entryIds={[entry.id]} hasSets={hasMetrics} />
        <ExerciseThumb exercise={entry.exercise} dimmed={resolved} />
        <View style={styles.identity}>
          <ExerciseNameLink
            exercise={entry.exercise}
            customName={customName}
            dimmed={resolved}
          />
          {isWorkRest && entrySeconds > 0 && (
            <Text variant="caption" muted={0.4}>
              {formatDuration(entrySeconds)}
            </Text>
          )}
        </View>
        {isWorkout && (
          <IconButton
            icon={History}
            size={34}
            accessibilityLabel={t('workouts:references.open')}
            onPress={() => setReferencesOpen(true)}
          />
        )}
        {!isReadOnly && superSetGroup && (
          <IconButton
            icon={Ungroup}
            size={34}
            accessibilityLabel={t(
              'templates:exerciseEntryCard.removeFromSuperset',
            )}
            loading={leaveSuperSet.isPending}
            onPress={() => leaveSuperSet.mutate()}
          />
        )}
        {!isReadOnly && (
          <IconButton
            icon={MoreVertical}
            size={34}
            accessibilityLabel={t('templates:exerciseEntryCard.actions')}
            onPress={() => setMenuOpen(true)}
          />
        )}
      </View>

      <View style={styles.body}>
        {(!isReadOnly || notes.trim() || entry.planNotes?.trim()) && (
          <EntryNotesField
            value={notes}
            onChange={setNotes}
            planNotes={entry.planNotes}
            disabled={isReadOnly}
          />
        )}
        {hasMetrics ? (
          <SetsEditor
            metrics={metrics}
            compositeMetrics={compositeMetrics}
            columnOrder={metricOrder}
            sets={sets}
            onChange={setSets}
            isReadOnly={isReadOnly}
            modeEditing={modeEditing}
            onExitModeEditing={() => setModeEditing(false)}
            commentsEditing={commentsEditing}
            logging={isWorkout}
            onTickChanged={() => setTickSaves((n) => n + 1)}
            previousSets={entry.previousSets}
          />
        ) : (
          !isReadOnly && (
            <AddZone
              icon={Gauge}
              label={t('templates:exerciseEntryCard.addMetrics')}
              description={t('templates:exerciseEntryCard.addMetricsHint')}
              onPress={openMetrics}
              large
            />
          )
        )}
      </View>

      <ActionSheet
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        title={displayName}
        actions={[
          {
            key: 'metrics',
            label: t('templates:exerciseEntryCard.metrics'),
            icon: Gauge,
            onPress: openMetrics,
          },
          hasMetrics &&
            !isWorkout && {
              key: 'modes',
              label: modeEditing
                ? t('templates:exerciseEntryCard.exitChangeModes')
                : t('templates:exerciseEntryCard.changeModes'),
              icon: SlidersHorizontal,
              onPress: () => setModeEditing((v) => !v),
            },
          hasMetrics && {
            key: 'comments',
            label: commentsEditing
              ? t('templates:setComment.stop')
              : t('templates:setComment.start'),
            icon: MessageSquare,
            onPress: () => setCommentsEditing((v) => !v),
          },
          {
            key: 'replace',
            label: t('templates:exerciseEntryCard.replaceExercise'),
            icon: Replace,
            onPress: () => setReplaceOpen(true),
          },
          blockExercises.length >= 2 &&
            !entry.superSetGroupId && {
              key: 'superset',
              label: t('templates:superSet.create'),
              icon: Layers,
              onPress: () => setSuperSetOpen(true),
            },
          {
            key: 'sort',
            label: t('templates:blockCard.sortExercises'),
            icon: ListOrdered,
            onPress: onOpenSort,
          },
          customName
            ? {
                key: 'resetName',
                label: t('templates:exerciseEntryCard.resetName'),
                icon: RotateCcw,
                onPress: () => setCustomName(''),
              }
            : {
                key: 'rename',
                label: t('templates:exerciseEntryCard.rename'),
                icon: Pencil,
                onPress: () => setRenameOpen(true),
              },
          {
            key: 'delete',
            label: t('common:delete'),
            icon: Trash2,
            destructive: true,
            separated: true,
            onPress: () => setConfirmRemove(true),
          },
        ]}
      />

      <MetricSelectorSheet
        open={metricsOpen}
        onClose={() => {
          setMetricsOpen(false);
          setAutoSeed(null);
        }}
        exerciseMetrics={entry.exercise.metrics}
        exerciseCompositeMetrics={entry.exercise.compositeMetrics ?? []}
        selectedMetricKeys={
          autoSeed ? autoSeed.simple : metrics.map((m) => m.key)
        }
        selectedCompositeMetricKeys={
          autoSeed ? autoSeed.composite : compositeMetrics.map((m) => m.key)
        }
        selectedUnits={selectedUnits}
        currentMetricOrder={metricOrder}
        lockedMetricKeys={isWorkRest ? WORK_REST_METRIC_KEYS : undefined}
        onConfirm={applyMetrics}
      />

      <NameSheet
        open={renameOpen}
        onClose={() => setRenameOpen(false)}
        title={t('templates:exerciseEntryCard.renameDialogTitle')}
        description={t('templates:exerciseEntryCard.renameDialogDescription')}
        label={t('templates:exerciseEntryCard.customNameLabel')}
        placeholder={entry.exercise.name}
        initialName={customName}
        onConfirm={(name) => {
          setCustomName(name);
          setRenameOpen(false);
        }}
      />

      <CreateSuperSetSheet
        open={superSetOpen}
        onClose={() => setSuperSetOpen(false)}
        docId={docId}
        blockId={blockId}
        origin={entry}
        candidates={blockExercises.filter((e) => e.id !== entry.id)}
      />

      <ExercisePickerSheet
        open={replaceOpen}
        onClose={() => setReplaceOpen(false)}
        docId={docId}
        blockId={blockId}
        title={t('templates:replaceExercise.title')}
        excludeExerciseId={entry.exerciseId}
        onSelect={(exercise) => replaceExercise.mutate(exercise)}
      />

      {isWorkout && (
        <WorkoutReferencesSheet
          open={referencesOpen}
          onClose={() => setReferencesOpen(false)}
          workoutId={docId}
          entry={entry}
          canCopy={!isReadOnly}
          onCopy={(copy) => {
            setSets(copy(sets));
            setReferencesOpen(false);
          }}
        />
      )}

      <ConfirmDialog
        open={confirmRemove}
        onClose={() => setConfirmRemove(false)}
        title={t('templates:exerciseEntryCard.removeTitle')}
        description={t('templates:exerciseEntryCard.removeConfirm', {
          name: entry.exercise.name,
        })}
        confirmLabel={t('common:delete')}
        onConfirm={() => {
          setConfirmRemove(false);
          onRemove();
        }}
      />
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  row: {
    paddingVertical: 12,
    gap: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: t.line(0.08),
  },
  // The exercise that is up: a bar in the margin, so marking it never shifts
  // the content.
  current: {
    borderLeftWidth: 3,
    borderLeftColor: t.colors.accentInk,
    paddingLeft: 8,
    marginLeft: -11,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  identity: { flex: 1, minWidth: 0, gap: 2 },
  body: { gap: 10 },
}));
