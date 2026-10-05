import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowUpDown,
  CornerDownRight,
  Gauge,
  History,
  ListOrdered,
  MessageSquare,
  MoreVertical,
  Pencil,
  Plus,
  Replace,
  RotateCcw,
  SlidersHorizontal,
  Trash2,
  Ungroup,
  X,
} from 'lucide-react-native';
import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { newRecordsToast } from '@features/workouts/lib/record-toast';
import { WorkoutReferencesSheet } from '@features/workouts/widgets/WorkoutReferencesSheet';
import type { UpsertWorkoutTemplateExercisePayload } from '@shared/api/services/workout-templates.service';
import { radius } from '@shared/theme/theme';
import { makeStyles, useTheme } from '@shared/theme/ThemeProvider';
import type {
  CompositeMetric,
  EditorExercise,
  EditorSuperSetGroup,
  Exercise,
  Metric,
  MetricMode,
  MetricValue,
  SetMetrics,
  SetType,
} from '@shared/types/api.types';
import { ActionSheet } from '@shared/ui/ActionSheet';
import { IconButton } from '@shared/ui/Button';
import { ConfirmDialog } from '@shared/ui/ConfirmDialog';
import { ReorderSheet } from '@shared/ui/ReorderSheet';
import { Text } from '@shared/ui/Text';
import {
  createDefaultSet,
  createDefaultSubSet,
  isCompoundSetType,
  orderByKeys,
} from '../constants/metric-field-config';
import { SET_TYPE_KEYS } from '../constants/template.labels';
import { useDebouncedSave } from '../hooks/useDebouncedSave';
import { useUnitAcronym } from '../hooks/useMetricsCatalog';
import { useEditorSource, type EditorDoc } from '../lib/editor-source';
import { fieldPosition } from '../lib/field-chain';
import { canonicalUnit, formatTarget } from '../lib/logged-values';
import { formatSetMetrics } from '../lib/metric-format';
import { useRegisterEntry } from '../lib/scroll-registry';
import { showsSetComment } from '../lib/set-comment';
import {
  buildSlots,
  countSlotsFor,
  memberColor,
  slotLabel,
  toSlotPayload,
  unionColumns,
  type SuperSetSlot,
} from '../lib/superset-sequence';
import {
  useSessionResolved,
  useTemplateSession,
} from '../lib/template-session';
import { previousPlaceholder } from '../lib/workout-cells';
import type { EditableWorkoutSet } from '../types/workout-set.types';
import {
  EntryNotesField,
  ExerciseNameLink,
  ExerciseThumb,
  SessionCollapseToggle,
  SessionStatusToggle,
} from './EditorParts';
import { NameSheet } from './EditorSheets';
import { rebuildMetrics, WORK_REST_METRIC_KEYS } from './ExerciseEntryCard';
import { ExercisePickerSheet } from './ExercisePickerSheet';
import { MetricCell } from './MetricCell';
import { MetricSelectorSheet } from './MetricSelectorSheet';
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

/** Everything about a member that isn't its sets. Owned here so this card is
 *  the single writer for its members: the sequence save and this one never
 *  contend over the same fields. */
interface MemberMeta {
  notes: string;
  customName: string;
  metrics: Metric[];
  compositeMetrics: CompositeMetric[];
  metricOrder: string[];
}

const buildMeta = (members: EditorExercise[]): Record<string, MemberMeta> =>
  Object.fromEntries(
    members.map((entry) => [
      entry.id,
      {
        notes: entry.notes ?? '',
        customName: entry.customName ?? '',
        metrics: entry.metrics,
        compositeMetrics: entry.compositeMetrics ?? [],
        metricOrder: entry.metricOrder ?? [],
      },
    ]),
  );

const metaPayload = (
  entry: EditorExercise,
  meta: MemberMeta,
  exerciseId = entry.exerciseId,
): UpsertWorkoutTemplateExercisePayload => ({
  exerciseId,
  notes: meta.notes,
  customName: meta.customName,
  superSetGroupId: entry.superSetGroupId,
  metricKeys: meta.metrics.map((m) => m.key),
  compositeMetricKeys: meta.compositeMetrics.map((m) => m.key),
  metricOrder: meta.metricOrder,
  // No `sets`: those belong to the sequence save.
});

/**
 * A super-set shown the way it is performed: one ordered list of set-slots. A
 * slot is one set of one member, so any order is just a different list —
 * "bench, bench, biceps, bench" included — labelled the way trainers write
 * it (A1, B1, A2). It is completed as one: one tick, server-side for all.
 */
export function SuperSetCard({
  group,
  members,
  docId,
  blockId,
  isReadOnly = false,
  collapsed,
  isWorkRest = false,
  onOpenSort,
}: {
  group: EditorSuperSetGroup;
  /** Members in block order — the order their letters are handed out in. */
  members: EditorExercise[];
  docId: string;
  blockId: string;
  isReadOnly?: boolean;
  collapsed: boolean;
  isWorkRest?: boolean;
  onOpenSort: () => void;
}) {
  const { t } = useTranslation(['templates', 'common', 'workouts', 'app']);
  const styles = useStyles();
  const theme = useTheme();
  const queryClient = useQueryClient();
  const editor = useEditorSource();
  const isWorkout = editor.kind === 'workout';
  const rowTint = useRowTint();
  const unitAcronym = useUnitAcronym();
  const memberIds = members.map((m) => m.id);
  const registerView = useRegisterEntry(memberIds);

  const [slots, setSlots] = useState<SuperSetSlot[]>(() => buildSlots(members));
  const [meta, setMeta] = useState<Record<string, MemberMeta>>(() =>
    buildMeta(members),
  );
  // Membership changes come from outside (an exercise joins, one leaves):
  // reseed the draft rather than remount, which would flush a save
  // describing a group that no longer exists in that shape.
  const memberKey = memberIds.join(',');
  const [seededKey, setSeededKey] = useState(memberKey);
  if (memberKey !== seededKey) {
    setSeededKey(memberKey);
    setSlots(buildSlots(members));
    setMeta(buildMeta(members));
  }

  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [metricsFor, setMetricsFor] = useState<string | null>(null);
  const [renameFor, setRenameFor] = useState<string | null>(null);
  const [replaceFor, setReplaceFor] = useState<string | null>(null);
  const [referencesFor, setReferencesFor] = useState<string | null>(null);
  const [slotMenu, setSlotMenu] = useState<number | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [addExercise, setAddExercise] = useState(false);
  const [sequenceSortOpen, setSequenceSortOpen] = useState(false);
  const [confirmDissolve, setConfirmDissolve] = useState(false);
  const [modeEditing, setModeEditing] = useState(false);
  const modeEdit = modeEditing && !isReadOnly && !isWorkout;
  const [commentsEditing, setCommentsEditing] = useState(false);
  // Set once the group is being deleted: from then on this card writes
  // nothing, or its autosaves would flush against a group that is gone.
  const [groupGone, setGroupGone] = useState(false);

  const byId = useMemo(() => new Map(members.map((e) => [e.id, e])), [members]);
  const cols = useMemo(() => unionColumns(members, []), [members]);

  const writeDoc = (updated: EditorDoc) =>
    queryClient.setQueryData(editor.queryKey, updated);
  const writeEntry = (updated: EditorExercise) =>
    queryClient.setQueryData(editor.queryKey, (old?: EditorDoc) =>
      old?.blocks
        ? {
            ...old,
            blocks: old.blocks.map((b) =>
              b.id === blockId
                ? {
                    ...b,
                    exercises: b.exercises.map((e) =>
                      e.id === updated.id ? updated : e,
                    ),
                  }
                : b,
            ),
          }
        : old,
    );

  // ─── Saving ────────────────────────────────────────────────────────────────

  // Per-member signature of what's persisted: a metadata save only PATCHes
  // the member that changed.
  const savedMetaRef = useRef<Record<string, string>>(
    Object.fromEntries(
      Object.entries(buildMeta(members)).map(([id, m]) => [
        id,
        JSON.stringify(m),
      ]),
    ),
  );

  const flushMeta = async (record: Record<string, MemberMeta>) => {
    for (const [entryId, m] of Object.entries(record)) {
      const entry = byId.get(entryId);
      if (!entry) continue;
      const sig = JSON.stringify(m);
      if (sig === savedMetaRef.current[entryId]) continue;
      const updated = await editor.api.updateExercise(
        docId,
        blockId,
        entryId,
        metaPayload(entry, m),
      );
      savedMetaRef.current[entryId] = sig;
      writeEntry(updated);
    }
  };

  useDebouncedSave({
    buildPayload: () => meta,
    initialPayload: () => buildMeta(members),
    save: flushMeta,
    disabled: isReadOnly || groupGone,
  });

  const sequenceSave = useDebouncedSave({
    buildPayload: () => slots,
    initialPayload: () => buildSlots(members),
    save: async (next) => {
      // Metric selections land before the sets that reference them, or the
      // server rejects a metric it doesn't yet know is selected.
      await flushMeta(meta);
      const updated = await editor.api.updateSuperSetSequence(
        docId,
        blockId,
        group.id,
        toSlotPayload(next, editor.kind),
      );
      if (isWorkout) {
        const block = updated.blocks?.find((b) => b.id === blockId);
        for (const member of members) {
          const after = block?.exercises.find((e) => e.id === member.id);
          if (after) newRecordsToast(t, member, after);
        }
      }
      writeDoc(updated);
    },
    disabled: isReadOnly || groupGone,
  });

  // A tick is saved at once: it moves the workout on.
  const [tickSaves, setTickSaves] = useState(0);
  useEffect(() => {
    if (tickSaves) sequenceSave.flush();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tickSaves]);

  // Marks made elsewhere reach the draft when nothing here is pending.
  const serverSlots = JSON.stringify(buildSlots(members));
  const [seenSlots, setSeenSlots] = useState(serverSlots);
  if (isWorkout && serverSlots !== seenSlots) {
    setSeenSlots(serverSlots);
    if (JSON.stringify(slots) === sequenceSave.savedSignature()) {
      const fresh = buildSlots(members);
      setSlots(fresh);
      sequenceSave.markSaved(fresh);
    }
  }

  /** Writes whatever is pending while the group still exists — the step
   *  before any change of membership. */
  const saveNow = async () => {
    await flushMeta(meta);
    const updated = await editor.api.updateSuperSetSequence(
      docId,
      blockId,
      group.id,
      toSlotPayload(slots, editor.kind),
    );
    sequenceSave.markSaved(slots);
    return updated;
  };

  // ─── Membership ────────────────────────────────────────────────────────────

  const removeMember = useMutation({
    mutationFn: async (entryId: string) => {
      const entry = byId.get(entryId)!;
      await saveNow();
      // A super-set of one isn't one: the last goes back to a plain card.
      const dissolves = members.length <= 2;
      if (dissolves) setGroupGone(true);
      const remaining = slots.filter((slot) => slot.entryId !== entryId);
      setSlots(remaining);
      sequenceSave.markSaved(remaining);
      await editor.api.updateExercise(docId, blockId, entryId, {
        ...metaPayload(entry, meta[entryId]),
        superSetGroupId: null,
      });
      if (dissolves)
        return editor.api.deleteSuperSetGroup(docId, blockId, group.id);
      return editor.api.getById(docId);
    },
    onSuccess: writeDoc,
    onError: () => setGroupGone(false),
  });

  const dissolve = useMutation({
    mutationFn: async () => {
      await saveNow();
      setGroupGone(true);
      return editor.api.deleteSuperSetGroup(docId, blockId, group.id);
    },
    onSuccess: writeDoc,
    onError: () => setGroupGone(false),
  });

  const replaceExercise = useMutation({
    mutationFn: (exercise: Exercise) => {
      const entry = byId.get(replaceFor!)!;
      return editor.api.updateExercise(
        docId,
        blockId,
        entry.id,
        metaPayload(entry, meta[entry.id], exercise.id),
      );
    },
    onSuccess: (updated) => {
      savedMetaRef.current[updated.id] = JSON.stringify({
        notes: updated.notes ?? '',
        customName: updated.customName ?? '',
        metrics: updated.metrics,
        compositeMetrics: updated.compositeMetrics ?? [],
        metricOrder: updated.metricOrder ?? [],
      } satisfies MemberMeta);
      writeEntry(updated);
      setReplaceFor(null);
    },
  });

  // ─── Sequence editing ──────────────────────────────────────────────────────

  const updateSlot = (index: number, patch: Partial<EditableWorkoutSet>) =>
    setSlots((prev) =>
      prev.map((slot, i) =>
        i === index ? { ...slot, set: { ...slot.set, ...patch } } : slot,
      ),
    );

  const metricsOf = (entryId: string) => meta[entryId]?.metrics ?? [];
  const compositesOf = (entryId: string) =>
    meta[entryId]?.compositeMetrics ?? [];
  const hasMetrics = (entryId: string) =>
    metricsOf(entryId).length > 0 || compositesOf(entryId).length > 0;
  const keysOf = (entryId: string) =>
    new Set([
      ...metricsOf(entryId).map((m) => m.key),
      ...compositesOf(entryId).map((m) => m.key),
    ]);

  const handleSetTypeChange = (index: number, setType: SetType) => {
    const slot = slots[index];
    if (isCompoundSetType(setType)) {
      const subSets = slot.set.subSets?.length
        ? slot.set.subSets
        : [
            createDefaultSubSet(
              metricsOf(slot.entryId),
              compositesOf(slot.entryId),
            ),
          ];
      updateSlot(index, { setType, subSets });
    } else {
      updateSlot(index, { setType, subSets: undefined });
    }
  };

  const addSubSet = (index: number) => {
    const slot = slots[index];
    const base = createDefaultSubSet(
      metricsOf(slot.entryId),
      compositesOf(slot.entryId),
    );
    const withUnits = { ...base.metrics };
    for (const [key, v] of Object.entries(slot.set.metrics)) {
      if (v?.unit && withUnits[key])
        withUnits[key] = { ...withUnits[key]!, unit: v.unit };
    }
    updateSlot(index, {
      subSets: [...(slot.set.subSets ?? []), { ...base, metrics: withUnits }],
    });
  };

  /** A slot for one member, seeded from that member's last set. */
  const addSlot = (entryId: string) => {
    const previous = [...slots]
      .reverse()
      .find((slot) => slot.entryId === entryId)?.set;
    setSlots((prev) => [
      ...prev,
      {
        entryId,
        set: createDefaultSet(
          metricsOf(entryId),
          compositesOf(entryId),
          previous,
        ),
      },
    ]);
  };

  const toggleSlotDone = (index: number) => {
    const done = !slots[index].set.completed;
    updateSlot(index, {
      completed: done,
      subSets: slots[index].set.subSets?.map((sub) => ({
        ...sub,
        completed: done,
      })),
    });
    setTickSaves((n) => n + 1);
  };

  /** References copied into one member's slots, by its own set order. */
  const copyIntoMember = (
    entryId: string,
    copy: (sets: EditableWorkoutSet[]) => EditableWorkoutSet[],
  ) =>
    setSlots((prev) => {
      const positions = prev
        .map((slot, i) => (slot.entryId === entryId ? i : -1))
        .filter((i) => i !== -1);
      const copied = copy(positions.map((i) => prev[i].set));
      const next = prev.map((slot, i) => {
        const k = positions.indexOf(i);
        return k === -1 ? slot : { ...slot, set: copied[k] };
      });
      for (const extra of copied.slice(positions.length))
        next.push({ entryId, set: extra });
      return next;
    });

  /** Hands a slot to another member, keeping the values the two share so
   *  swapping bench for pull-ups doesn't wipe the reps just typed. */
  const moveSlotTo = (index: number, entryId: string) => {
    if (slots[index].entryId === entryId) return;
    const previous = [...slots]
      .reverse()
      .find((slot) => slot.entryId === entryId)?.set;
    const fresh = createDefaultSet(
      metricsOf(entryId),
      compositesOf(entryId),
      previous,
    );
    const carried = { ...fresh.metrics };
    for (const [key, value] of Object.entries(slots[index].set.metrics)) {
      if (key in carried && value) carried[key] = value;
    }
    setSlots((prev) =>
      prev.map((slot, i) =>
        i === index
          ? {
              entryId,
              set: {
                ...fresh,
                setType: slot.set.setType,
                metrics: carried,
                subSets: undefined,
              },
            }
          : slot,
      ),
    );
  };

  const applyMetrics = (
    entryId: string,
    sel: {
      metrics: Metric[];
      compositeMetrics: CompositeMetric[];
      units: Record<string, string>;
      metricOrder: string[];
    },
  ) => {
    const keys = orderByKeys(
      [
        ...sel.metrics.map((m) => m.key),
        ...sel.compositeMetrics.map((m) => m.key),
      ],
      (k) => k,
      sel.metricOrder,
    );
    setMeta((prev) => ({
      ...prev,
      [entryId]: {
        ...prev[entryId],
        metrics: sel.metrics,
        compositeMetrics: sel.compositeMetrics,
        metricOrder: sel.metricOrder,
      },
    }));
    setSlots((prev) =>
      prev.map((slot) =>
        slot.entryId === entryId
          ? {
              ...slot,
              set: {
                ...slot.set,
                metrics: rebuildMetrics(slot.set.metrics, keys, sel.units),
                subSets: slot.set.subSets?.map((sub) => ({
                  ...sub,
                  metrics: rebuildMetrics(sub.metrics, keys, sel.units),
                })),
              },
            }
          : slot,
      ),
    );
  };

  const patchMeta = (entryId: string, patch: Partial<MemberMeta>) =>
    setMeta((prev) => ({ ...prev, [entryId]: { ...prev[entryId], ...patch } }));

  const dialogUnits = (entryId: string) => {
    const first = slots.find((slot) => slot.entryId === entryId)?.set;
    const units: Record<string, string> = {};
    for (const [key, v] of Object.entries(first?.metrics ?? {}))
      if (v?.unit) units[key] = v.unit;
    return units;
  };

  const columnModes = (key: string): MetricMode[] =>
    slots.flatMap((slot) => [
      slot.set.metrics[key]?.mode ?? 'EXACT',
      ...(slot.set.subSets ?? []).map(
        (sub) => sub.metrics[key]?.mode ?? 'EXACT',
      ),
    ]);
  const applyColumnMode = (key: string, mode: MetricMode) => {
    const patch = (m: SetMetrics): SetMetrics =>
      key in m
        ? {
            ...m,
            [key]: { ...(m[key] ?? { value: null }), mode } as MetricValue,
          }
        : m;
    setSlots((prev) =>
      prev.map((slot) => ({
        ...slot,
        set: {
          ...slot.set,
          metrics: patch(slot.set.metrics),
          subSets: slot.set.subSets?.map((sub) => ({
            ...sub,
            metrics: patch(sub.metrics),
          })),
        },
      })),
    );
  };

  const activeUnitKey = (key: string, fallback?: string) => {
    for (const s of slots) {
      const u = s.set.metrics[key]?.unit ?? s.set.targetMetrics?.[key]?.unit;
      if (u) return canonicalUnit(u) ?? undefined;
    }
    return fallback;
  };

  const session = useTemplateSession();
  const isCurrent =
    !!session?.currentEntryId && memberIds.includes(session.currentEntryId);
  const resolved = useSessionResolved(memberIds);
  const memberNames = Object.fromEntries(
    members.map((e) => [e.id, meta[e.id]?.customName || e.exercise.name]),
  );
  const lastSlot = slots.at(-1);
  const menuEntry = menuFor ? byId.get(menuFor) : undefined;

  return (
    <View ref={registerView} style={[styles.card, isCurrent && styles.current]}>
      {/* Members: identity and notes. One tick for the whole group. */}
      <View style={styles.membersRow}>
        <SessionStatusToggle entryIds={memberIds} />
        <View style={styles.members}>
          {members.map((entry, memberIndex) => {
            const m = meta[entry.id];
            if (!m) return null;
            const color = memberColor(memberIndex);
            return (
              <View key={entry.id} style={styles.member}>
                <View style={styles.memberHead}>
                  <View
                    style={[
                      styles.letter,
                      {
                        backgroundColor: color.backgroundColor,
                        borderColor: color.borderColor,
                      },
                    ]}
                  >
                    <Text variant="caption" weight="bold" color={color.color}>
                      {String.fromCharCode(65 + memberIndex)}
                    </Text>
                  </View>
                  <ExerciseThumb
                    exercise={entry.exercise}
                    size={36}
                    dimmed={resolved}
                  />
                  <View style={styles.flex}>
                    <ExerciseNameLink
                      exercise={entry.exercise}
                      customName={m.customName}
                      dimmed={resolved}
                    />
                  </View>
                  {isWorkout && (
                    <IconButton
                      icon={History}
                      size={32}
                      accessibilityLabel={t('workouts:references.open')}
                      onPress={() => setReferencesFor(entry.id)}
                    />
                  )}
                  {!isReadOnly && (
                    <IconButton
                      icon={MoreVertical}
                      size={32}
                      accessibilityLabel={t(
                        'templates:exerciseEntryCard.actions',
                      )}
                      onPress={() => setMenuFor(entry.id)}
                    />
                  )}
                  {memberIndex === 0 && (
                    <SessionCollapseToggle
                      entryIds={memberIds}
                      collapsed={collapsed}
                    />
                  )}
                </View>
                {!collapsed && (!isReadOnly || m.notes.trim()) && (
                  <EntryNotesField
                    value={m.notes}
                    onChange={(notes) => patchMeta(entry.id, { notes })}
                    disabled={isReadOnly}
                  />
                )}
              </View>
            );
          })}
        </View>
      </View>

      {!collapsed && (
        <View style={styles.sequence}>
          {modeEdit && (
            <ModeEditingBanner onDone={() => setModeEditing(false)} />
          )}
          <SetGrid>
            <GridRow>
              <FixedCell width={COL.label} />
              <FixedCell width={COL.type} />
              {cols.map((col) => {
                const unit = activeUnitKey(col.key, col.unit);
                return (
                  <MetricHeader
                    key={col.key}
                    col={col}
                    unitLabel={unit ? unitAcronym(unit) : undefined}
                    modes={modeEdit ? columnModes(col.key) : undefined}
                    onApplyMode={
                      modeEdit
                        ? (mode) => applyColumnMode(col.key, mode)
                        : undefined
                    }
                  />
                );
              })}
              {isWorkout && <FixedCell width={COL.tick} />}
              {!isReadOnly && <FixedCell width={COL.action} />}
            </GridRow>

            {slots.map((slot, index) => {
              const label = slotLabel(slots, index, members);
              const color = memberColor(label);
              const editable = keysOf(slot.entryId);
              const compound = isCompoundSetType(slot.set.setType);
              const subSets = slot.set.subSets ?? [];
              const tint = rowTint(
                slot.set.setType,
                isWorkout && !!slot.set.completed,
              );
              const member = byId.get(slot.entryId);
              const memberSetIndex = slots
                .slice(0, index)
                .filter((s) => s.entryId === slot.entryId).length;
              const inert = (
                <Text variant="caption" muted={0.2} center>
                  ·
                </Text>
              );
              return (
                <Fragment key={slot.set.id ?? `slot-${index}`}>
                  <GridRow tint={tint} last={!compound || subSets.length === 0}>
                    <FixedCell width={COL.label}>
                      <Pressable
                        onPress={() => setSlotMenu(index)}
                        disabled={isReadOnly}
                        accessibilityRole="button"
                        accessibilityLabel={`${label} · ${memberNames[slot.entryId]}`}
                        accessibilityHint={
                          isReadOnly
                            ? undefined
                            : t('templates:superSet.moveToExercise')
                        }
                        style={[
                          styles.slotLabel,
                          {
                            backgroundColor: color.backgroundColor,
                            borderColor: color.borderColor,
                          },
                        ]}
                      >
                        <Text variant="micro" color={color.color}>
                          {label}
                        </Text>
                      </Pressable>
                    </FixedCell>
                    <FixedCell width={COL.type}>
                      <SetTypeBadge
                        setType={slot.set.setType}
                        onChange={(v) => handleSetTypeChange(index, v)}
                        isReadOnly={isReadOnly}
                        records={isWorkout ? slot.set.recordDetails : undefined}
                      />
                    </FixedCell>
                    {cols.map((col, colIndex) => (
                      <MetricColumn key={col.key} col={col}>
                        {editable.has(col.key) ? (
                          <MetricCell
                            col={col}
                            value={slot.set.metrics[col.key]}
                            onChange={(value) =>
                              updateSlot(index, {
                                metrics: {
                                  ...slot.set.metrics,
                                  [col.key]: value,
                                },
                              })
                            }
                            isReadOnly={isReadOnly}
                            modeEditing={modeEdit}
                            logging={isWorkout}
                            placeholder={
                              formatTarget(slot.set.targetMetrics?.[col.key]) ??
                              (isWorkout
                                ? previousPlaceholder(
                                    member?.previousSets,
                                    memberSetIndex,
                                    col.key,
                                  )
                                : undefined)
                            }
                            unit={
                              slot.set.metrics[col.key]?.unit ??
                              activeUnitKey(col.key, col.unit)
                            }
                            position={fieldPosition(index, colIndex)}
                          />
                        ) : (
                          inert
                        )}
                      </MetricColumn>
                    ))}
                    {isWorkout && (
                      <FixedCell width={COL.tick}>
                        <SetTick
                          done={!!slot.set.completed}
                          isReadOnly={isReadOnly}
                          onToggle={() => toggleSlotDone(index)}
                        />
                      </FixedCell>
                    )}
                    {!isReadOnly && (
                      <FixedCell width={COL.action}>
                        <IconButton
                          icon={Trash2}
                          size={30}
                          accessibilityLabel={
                            countSlotsFor(slots, slot.entryId) > 1
                              ? t('common:delete')
                              : t('templates:superSet.lastSlotHint')
                          }
                          disabled={countSlotsFor(slots, slot.entryId) <= 1}
                          onPress={() =>
                            setSlots((prev) =>
                              prev.filter((_, i) => i !== index),
                            )
                          }
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
                        <FixedCell width={COL.label} />
                        <FixedCell width={COL.type}>
                          <CornerDownRight size={14} color={theme.text(0.3)} />
                        </FixedCell>
                        {cols.map((col, colIndex) => (
                          <MetricColumn key={col.key} col={col}>
                            {editable.has(col.key) ? (
                              <MetricCell
                                col={col}
                                value={sub.metrics[col.key]}
                                onChange={(value) =>
                                  updateSlot(index, {
                                    subSets: subSets.map((s, j) =>
                                      j === subIndex
                                        ? {
                                            ...s,
                                            metrics: {
                                              ...s.metrics,
                                              [col.key]: value,
                                            },
                                          }
                                        : s,
                                    ),
                                  })
                                }
                                isReadOnly={isReadOnly}
                                modeEditing={modeEdit}
                                logging={isWorkout}
                                placeholder={formatTarget(
                                  sub.targetMetrics?.[col.key],
                                )}
                                unit={activeUnitKey(col.key, col.unit)}
                                position={fieldPosition(
                                  index,
                                  colIndex,
                                  subIndex,
                                )}
                              />
                            ) : (
                              inert
                            )}
                          </MetricColumn>
                        ))}
                        {isWorkout && <FixedCell width={COL.tick} />}
                        {!isReadOnly && (
                          <FixedCell width={COL.action}>
                            <IconButton
                              icon={X}
                              size={30}
                              accessibilityLabel={t('common:remove')}
                              disabled={subSets.length <= 1}
                              onPress={() =>
                                updateSlot(index, {
                                  subSets: subSets.filter(
                                    (_, j) => j !== subIndex,
                                  ),
                                })
                              }
                              color={theme.text(0.35)}
                            />
                          </FixedCell>
                        )}
                      </GridRow>
                    ))}
                  {showsSetComment(
                    slot.set.notes,
                    commentsEditing,
                    isReadOnly,
                  ) && (
                    <SetCommentRow
                      value={slot.set.notes ?? ''}
                      onChange={(notes) => updateSlot(index, { notes })}
                      isReadOnly={isReadOnly}
                    />
                  )}
                </Fragment>
              );
            })}
          </SetGrid>

          {!isReadOnly && (
            <AddRowButton
              label={t('templates:superSet.addSlot')}
              onPress={() => setAddOpen(true)}
            />
          )}
        </View>
      )}

      {/* ⋯ of one member: its own actions, then the group's. */}
      <ActionSheet
        open={!!menuEntry}
        onClose={() => setMenuFor(null)}
        title={menuEntry ? memberNames[menuEntry.id] : undefined}
        actions={
          menuEntry
            ? [
                {
                  key: 'metrics',
                  label: t('templates:exerciseEntryCard.metrics'),
                  icon: Gauge,
                  onPress: () => setMetricsFor(menuEntry.id),
                },
                {
                  key: 'replace',
                  label: t('templates:exerciseEntryCard.replaceExercise'),
                  icon: Replace,
                  onPress: () => setReplaceFor(menuEntry.id),
                },
                meta[menuEntry.id]?.customName
                  ? {
                      key: 'reset',
                      label: t('templates:exerciseEntryCard.resetName'),
                      icon: RotateCcw,
                      onPress: () =>
                        patchMeta(menuEntry.id, { customName: '' }),
                    }
                  : {
                      key: 'rename',
                      label: t('templates:exerciseEntryCard.rename'),
                      icon: Pencil,
                      onPress: () => setRenameFor(menuEntry.id),
                    },
                {
                  key: 'add',
                  label: t('templates:superSet.addExercise'),
                  icon: Plus,
                  separated: true,
                  onPress: () => setAddExercise(true),
                },
                !isWorkout && {
                  key: 'modes',
                  label: modeEditing
                    ? t('templates:exerciseEntryCard.exitChangeModes')
                    : t('templates:exerciseEntryCard.changeModes'),
                  icon: SlidersHorizontal,
                  onPress: () => setModeEditing((v) => !v),
                },
                {
                  key: 'comments',
                  label: commentsEditing
                    ? t('templates:setComment.stop')
                    : t('templates:setComment.start'),
                  icon: MessageSquare,
                  onPress: () => setCommentsEditing((v) => !v),
                },
                slots.length > 1 && {
                  key: 'sequence',
                  label: t('app:editor.sortSequence'),
                  icon: ArrowUpDown,
                  onPress: () => setSequenceSortOpen(true),
                },
                {
                  key: 'sort',
                  label: t('templates:blockCard.sortExercises'),
                  icon: ListOrdered,
                  onPress: onOpenSort,
                },
                {
                  key: 'leave',
                  label: t('templates:superSet.removeMember'),
                  icon: Ungroup,
                  destructive: true,
                  separated: true,
                  onPress: () => removeMember.mutate(menuEntry.id),
                },
                {
                  key: 'dissolve',
                  label: t('templates:superSet.dissolve'),
                  icon: Ungroup,
                  destructive: true,
                  onPress: () => setConfirmDissolve(true),
                },
              ]
            : []
        }
      />

      {/* Which member performs a slot. */}
      <ActionSheet
        open={slotMenu !== null}
        onClose={() => setSlotMenu(null)}
        title={t('templates:superSet.moveToExercise')}
        actions={members.map((entry, i) => ({
          key: entry.id,
          label: `${String.fromCharCode(65 + i)} · ${memberNames[entry.id]}`,
          selected: slotMenu !== null && slots[slotMenu]?.entryId === entry.id,
          onPress: () => slotMenu !== null && moveSlotTo(slotMenu, entry.id),
        }))}
      />

      {/* Add a set to one member — or, while the last set is compound, inside it. */}
      <ActionSheet
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title={t('templates:superSet.addSlot')}
        actions={[
          lastSlot &&
            isCompoundSetType(lastSlot.set.setType) && {
              key: 'inside',
              label: t('templates:setsEditor.addSetInside', {
                type: t(
                  `templates:setTypes.${SET_TYPE_KEYS[lastSlot.set.setType]}`,
                ),
              }),
              icon: CornerDownRight,
              onPress: () => addSubSet(slots.length - 1),
            },
          ...members.map((entry, i) => ({
            key: entry.id,
            label: `${String.fromCharCode(65 + i)} · ${memberNames[entry.id]}`,
            separated:
              i === 0 && !!lastSlot && isCompoundSetType(lastSlot.set.setType),
            onPress: () => addSlot(entry.id),
          })),
        ]}
      />

      <ReorderSheet
        open={sequenceSortOpen}
        onClose={() => setSequenceSortOpen(false)}
        title={t('app:editor.sortSequence')}
        items={slots.map((slot, index) => {
          const label = slotLabel(slots, index, members);
          const color = memberColor(label);
          const member = byId.get(slot.entryId);
          const values = member
            ? formatSetMetrics(
                slot.set.metrics,
                metricsOf(slot.entryId),
                compositesOf(slot.entryId),
                unitAcronym,
                member.resolvedMetricOrder,
              )
            : [];
          return {
            id: String(index),
            label: memberNames[slot.entryId],
            sublabel: values.join(' · ') || undefined,
            leading: (
              <View
                style={[
                  styles.slotLabel,
                  {
                    backgroundColor: color.backgroundColor,
                    borderColor: color.borderColor,
                  },
                ]}
              >
                <Text variant="micro" color={color.color}>
                  {label}
                </Text>
              </View>
            ),
          };
        })}
        onSave={(ids) => setSlots((prev) => ids.map((id) => prev[Number(id)]))}
      />

      {members.map((entry) => {
        const m = meta[entry.id];
        if (!m) return null;
        return (
          <Fragment key={`sheets-${entry.id}`}>
            <MetricSelectorSheet
              open={metricsFor === entry.id}
              onClose={() => setMetricsFor(null)}
              exerciseMetrics={entry.exercise.metrics}
              exerciseCompositeMetrics={entry.exercise.compositeMetrics ?? []}
              selectedMetricKeys={
                hasMetrics(entry.id)
                  ? m.metrics.map((x) => x.key)
                  : entry.exercise.metrics.map((x) => x.key)
              }
              selectedCompositeMetricKeys={
                hasMetrics(entry.id)
                  ? m.compositeMetrics.map((x) => x.key)
                  : (entry.exercise.compositeMetrics ?? []).map((x) => x.key)
              }
              selectedUnits={dialogUnits(entry.id)}
              currentMetricOrder={m.metricOrder}
              lockedMetricKeys={isWorkRest ? WORK_REST_METRIC_KEYS : undefined}
              onConfirm={(sel) => applyMetrics(entry.id, sel)}
            />
            <NameSheet
              open={renameFor === entry.id}
              onClose={() => setRenameFor(null)}
              title={t('templates:exerciseEntryCard.renameDialogTitle')}
              description={t(
                'templates:exerciseEntryCard.renameDialogDescription',
              )}
              label={t('templates:exerciseEntryCard.customNameLabel')}
              placeholder={entry.exercise.name}
              initialName={m.customName}
              onConfirm={(name) => {
                patchMeta(entry.id, { customName: name });
                setRenameFor(null);
              }}
            />
          </Fragment>
        );
      })}

      {isWorkout && referencesFor && byId.get(referencesFor) && (
        <WorkoutReferencesSheet
          open
          onClose={() => setReferencesFor(null)}
          workoutId={docId}
          entry={byId.get(referencesFor)!}
          canCopy={!isReadOnly}
          onCopy={(copy) => {
            copyIntoMember(referencesFor, copy);
            setReferencesFor(null);
          }}
        />
      )}

      <ExercisePickerSheet
        open={!!replaceFor}
        onClose={() => setReplaceFor(null)}
        docId={docId}
        blockId={blockId}
        title={t('templates:replaceExercise.title')}
        excludeExerciseId={
          replaceFor ? byId.get(replaceFor)?.exerciseId : undefined
        }
        onSelect={(exercise) => replaceExercise.mutate(exercise)}
      />
      <ExercisePickerSheet
        open={addExercise}
        onClose={() => setAddExercise(false)}
        docId={docId}
        blockId={blockId}
        superSetGroupId={group.id}
        title={t('templates:superSet.addExercise')}
        onAdded={() => setAddExercise(false)}
      />

      <ConfirmDialog
        open={confirmDissolve}
        onClose={() => setConfirmDissolve(false)}
        title={t('templates:superSet.dissolve')}
        description={t('templates:superSet.dissolveConfirm')}
        confirmLabel={t('common:delete')}
        onConfirm={() => {
          setConfirmDissolve(false);
          dissolve.mutate();
        }}
      />
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  card: {
    paddingVertical: 12,
    gap: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: t.line(0.08),
  },
  current: {
    borderLeftWidth: 3,
    borderLeftColor: t.colors.accentInk,
    paddingLeft: 8,
    marginLeft: -11,
  },
  membersRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  members: {
    flex: 1,
    gap: 8,
    paddingLeft: 10,
    borderLeftWidth: 2,
    borderLeftColor: t.ink(0.35),
  },
  member: { gap: 4 },
  memberHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  letter: {
    width: 24,
    height: 24,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flex: { flex: 1, minWidth: 0 },
  sequence: { gap: 8 },
  slotLabel: {
    minWidth: 32,
    height: 28,
    paddingHorizontal: 4,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
}));
