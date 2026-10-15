import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  Dumbbell,
  ListOrdered,
  MoreVertical,
  Pause,
  Pencil,
  Play,
  Timer,
  Trash2,
} from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { radius } from '@shared/theme/theme';
import { makeStyles, useTheme } from '@shared/theme/ThemeProvider';
import type { EditorBlock } from '@shared/types/api.types';
import { ActionSheet } from '@shared/ui/ActionSheet';
import { Button, IconButton } from '@shared/ui/Button';
import { ConfirmDialog } from '@shared/ui/ConfirmDialog';
import { ReorderSheet } from '@shared/ui/ReorderSheet';
import { Text } from '@shared/ui/Text';
import { useSessionRun, type SessionRun } from '@features/member/session-run';
import { runElapsedMs } from '@features/workouts/lib/work-rest-controls';
import { WorkRestPlayer } from '@features/workouts/widgets/WorkRestPlayer';
import {
  useEditorSource,
  useIsWorkout,
  type EditorDoc,
} from '../lib/editor-source';
import { formatDuration, hasIncompleteWorkRest } from '../lib/workout-time';
import { AddZone } from './EditorParts';
import { ExerciseEntryCard } from './ExerciseEntryCard';
import { ExercisePickerSheet } from './ExercisePickerSheet';
import { SuperSetCard } from './SuperSetCard';

/**
 * A block — a heading over its exercises, not a card around them (a card
 * spends a border and a padding each side, and on a phone that is width the
 * sets need). A block with no name is the loose exercises at the plan's own
 * level: rows with no heading.
 */
export function BlockCard({
  block,
  docId,
  isReadOnly = false,
  onEdit,
  onRemove,
  onOpenSort,
  isLast = false,
  autoMetricsEntryId = null,
  onAutoMetricsConsumed,
}: {
  block: EditorBlock;
  docId: string;
  isReadOnly?: boolean;
  onEdit: () => void;
  onRemove: () => void;
  onOpenSort: () => void;
  /** The last block: a loose group there leaves its "add" to the plan-level
   *  button right below it. */
  isLast?: boolean;
  /** An entry added from the plan level, whose metrics sheet opens. */
  autoMetricsEntryId?: string | null;
  onAutoMetricsConsumed?: () => void;
}) {
  const { t } = useTranslation(['templates', 'common', 'workouts']);
  const styles = useStyles();
  const theme = useTheme();
  const queryClient = useQueryClient();
  const editor = useEditorSource();
  const [menuOpen, setMenuOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [justAdded, setJustAdded] = useState<string | null>(null);

  const exercises = block.exercises ?? [];
  const loose = block.name === null;
  const isWorkRest = block.mode === 'WORK_REST';
  const incomplete = isWorkRest && hasIncompleteWorkRest(block);
  const groups = block.superSetGroups ?? [];
  // A member training a timed block runs the TV's clock on their phone. Only
  // in a workout they can still log (a plan is not trained, a finished workout
  // is history) and only when every set has a duration. As on the web.
  const canRun =
    useIsWorkout() &&
    isWorkRest &&
    !incomplete &&
    !isReadOnly &&
    exercises.length > 0;
  const [running, setRunning] = useState(false);

  // In a session's control the block that is up runs the room's clock — the
  // one the board and the TV play — and the player opens on its own when the
  // trainer starts it; closed, it stays closed for that run (its strip below
  // reopens it). Elsewhere a timed block runs on the phone's own clock.
  const sessionRun = useSessionRun();
  const synced = !!sessionRun && isWorkRest;
  const myRun =
    synced && sessionRun.run?.blockId === block.id ? sessionRun.run : null;
  const [hiddenRun, setHiddenRun] = useState<string | null>(null);
  const playerOpen = synced ? !!myRun && hiddenRun !== myRun.key : running;
  // As on the board: only the block that is up starts, and only with no run.
  const canStart = synced
    ? canRun && !sessionRun.run && sessionRun.readyBlockId === block.id
    : canRun;

  const writeDoc = (updated: EditorDoc) =>
    queryClient.setQueryData(editor.queryKey, updated);

  // The sort sheet lists loose exercises one by one and each super-set as one
  // row carrying its members; the order inside a super-set is its sequence's.
  const sortUnits = (() => {
    const seen = new Set<string>();
    const units: {
      id: string;
      label: string;
      sublabel?: string;
      entryIds: string[];
    }[] = [];
    for (const entry of exercises) {
      if (seen.has(entry.id)) continue;
      const group = groups.find((g) => g.id === entry.superSetGroupId);
      const members = group
        ? exercises.filter((e) => e.superSetGroupId === group.id)
        : [entry];
      for (const m of members) seen.add(m.id);
      units.push({
        id: group ? `group:${group.id}` : entry.id,
        label: group
          ? t('templates:superSet.title')
          : entry.customName || entry.exercise.name,
        sublabel: group
          ? members.map((m) => m.customName || m.exercise.name).join(' · ')
          : undefined,
        entryIds: members.map((m) => m.id),
      });
    }
    return units;
  })();

  const reorder = useMutation({
    mutationFn: (ids: string[]) =>
      editor.api.reorderExercises(docId, block.id, ids),
    onSuccess: writeDoc,
  });
  const removeExercise = useMutation({
    mutationFn: (entryId: string) =>
      editor.api.removeExercise(docId, block.id, entryId),
    onSuccess: writeDoc,
  });

  return (
    <View style={styles.block}>
      {!loose && (
        <View style={styles.header}>
          <View
            style={[
              styles.stripe,
              { backgroundColor: block.color ?? theme.fill(0.15) },
            ]}
          />
          <View style={styles.titleBox}>
            <View style={styles.titleRow}>
              {/* A timed block says so with its clock, and nothing more. */}
              {isWorkRest && (
                <Timer
                  size={17}
                  color={theme.colors.accentInk}
                  accessibilityLabel={t('templates:blockMode.WORK_REST')}
                />
              )}
              <Text variant="subheading" numberOfLines={2} style={styles.flex}>
                {block.name}
              </Text>
            </View>
            {incomplete && (
              <View style={[styles.badge, styles.badgeWarning]}>
                <AlertTriangle size={11} color={theme.colors.warningInk} />
                <Text variant="micro" color={theme.colors.warningInk} uppercase>
                  {t('templates:blockMode.incomplete')}
                </Text>
              </View>
            )}
            {block.description ? (
              <Text variant="caption" muted={0.5}>
                {block.description}
              </Text>
            ) : null}
          </View>
          {canStart && (
            <Button
              label={t('workouts:workRest.start')}
              icon={Play}
              size="sm"
              accessibilityLabel={t('workouts:workRest.startHint')}
              loading={synced && sessionRun.starting}
              onPress={() => {
                if (!synced) return setRunning(true);
                setHiddenRun(null);
                sessionRun.start();
              }}
            />
          )}
          {!isReadOnly && (
            <IconButton
              icon={MoreVertical}
              size={34}
              accessibilityLabel={t('common:options')}
              onPress={() => setMenuOpen(true)}
            />
          )}
        </View>
      )}

      {myRun && sessionRun && (
        <RunStrip
          run={myRun}
          controls={sessionRun}
          onOpen={() => setHiddenRun(null)}
        />
      )}

      <View>
        {exercises.length === 0 && loose ? null : exercises.length === 0 ? (
          isReadOnly ? (
            <View style={styles.empty}>
              <Dumbbell size={22} color={theme.text(0.15)} />
              <Text variant="bodySmall" muted={0.3}>
                {t('templates:blockCard.noExercises')}
              </Text>
            </View>
          ) : (
            <AddZone
              icon={Dumbbell}
              label={t('templates:blockCard.addExercise')}
              description={t('templates:blockCard.addFirstExercise')}
              onPress={() => setAdding(true)}
              large
            />
          )
        ) : (
          exercises.map((entry) => {
            const group = groups.find((g) => g.id === entry.superSetGroupId);
            if (group) {
              const members = exercises.filter(
                (e) => e.superSetGroupId === group.id,
              );
              // A super-set draws once, at its first member's position.
              if (members[0]?.id !== entry.id) return null;
              return (
                <SuperSetCard
                  // Remount on a mode flip: switching to Work/Rest seeds
                  // TIME/REST server-side into these autosaving drafts.
                  key={`${group.id}:${block.mode}`}
                  group={group}
                  members={members}
                  docId={docId}
                  blockId={block.id}
                  isReadOnly={isReadOnly}
                  isWorkRest={isWorkRest}
                  onOpenSort={() => setSortOpen(true)}
                />
              );
            }
            return (
              <ExerciseEntryCard
                key={`${entry.id}:${block.mode}`}
                entry={entry}
                docId={docId}
                blockId={block.id}
                isReadOnly={isReadOnly}
                superSetGroups={groups}
                blockExercises={exercises}
                isWorkRest={isWorkRest}
                autoOpenMetrics={
                  entry.id === justAdded || entry.id === autoMetricsEntryId
                }
                onAutoOpenConsumed={() => {
                  setJustAdded(null);
                  onAutoMetricsConsumed?.();
                }}
                onOpenSort={() => setSortOpen(true)}
                onRemove={() => removeExercise.mutate(entry.id)}
              />
            );
          })
        )}
        {!isReadOnly && exercises.length > 0 && !(loose && isLast) && (
          <AddZone
            icon={Dumbbell}
            label={t('templates:blockCard.addExercise')}
            onPress={() => setAdding(true)}
          />
        )}
      </View>

      <ActionSheet
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        title={block.name ?? undefined}
        actions={[
          {
            key: 'edit',
            label: t('templates:blockCard.editBlock'),
            icon: Pencil,
            onPress: onEdit,
          },
          exercises.length >= 2 && {
            key: 'sortExercises',
            label: t('templates:blockCard.sortExercises'),
            icon: ListOrdered,
            onPress: () => setSortOpen(true),
          },
          {
            key: 'sortBlocks',
            label: t('templates:blockCard.sortBlocks'),
            icon: ListOrdered,
            onPress: onOpenSort,
          },
          {
            key: 'delete',
            label: t('templates:blockCard.deleteBlock'),
            icon: Trash2,
            destructive: true,
            separated: true,
            onPress: () => setConfirmRemove(true),
          },
        ]}
      />

      <ExercisePickerSheet
        open={adding}
        onClose={() => setAdding(false)}
        docId={docId}
        blockId={block.id}
        title={
          block.name
            ? `${t('templates:addExercise.title')} · ${block.name}`
            : t('templates:addExercise.title')
        }
        onAdded={(entry) => {
          setJustAdded(entry.id);
          setAdding(false);
        }}
      />

      <ConfirmDialog
        open={confirmRemove}
        onClose={() => setConfirmRemove(false)}
        title={t('templates:blockCard.deleteBlock')}
        description={t('templates:blockCard.deleteBlockConfirm', {
          name: block.name,
        })}
        confirmLabel={t('common:delete')}
        onConfirm={() => {
          setConfirmRemove(false);
          onRemove();
        }}
      />

      <ReorderSheet
        open={sortOpen}
        onClose={() => setSortOpen(false)}
        title={t('templates:blockCard.sortExercises')}
        items={sortUnits}
        onSave={(ids) => {
          // Each unit back into its members, so a moved super-set keeps its
          // exercises together and the payload is a full permutation.
          const members = new Map(sortUnits.map((u) => [u.id, u.entryIds]));
          reorder.mutate(ids.flatMap((id) => members.get(id) ?? []));
        }}
      />

      {playerOpen && (
        <WorkRestPlayer
          block={block}
          sync={
            myRun && sessionRun
              ? {
                  startedAt: myRun.startedAt,
                  pausedAt: myRun.pausedAt,
                  onPause: sessionRun.pause,
                  onSeek: sessionRun.seek,
                  onOver: sessionRun.over,
                }
              : undefined
          }
          onClose={() => (myRun ? setHiddenRun(myRun.key) : setRunning(false))}
        />
      )}
    </View>
  );
}

/**
 * A session's run under way on this block, under its heading: running or
 * paused, how long is left, and the way back into the player — with the
 * board's two escapes, Cancelar (a false start) and Terminar (done early).
 * Its own clock, so the block's cards never re-render with it.
 */
function RunStrip({
  run,
  controls,
  onOpen,
}: {
  run: NonNullable<SessionRun['run']>;
  controls: SessionRun;
  onOpen: () => void;
}) {
  const { t } = useTranslation(['app', 'workouts']);
  const styles = useStyles();
  const theme = useTheme();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, []);
  const paused = run.pausedAt !== null;
  const total = Date.parse(run.endsAt) - Date.parse(run.startedAt);
  const elapsed =
    runElapsedMs(
      { workRestStartedAt: run.startedAt, workRestPausedAt: run.pausedAt },
      now,
    ) ?? 0;
  const left = Math.max(0, Math.ceil((total - elapsed) / 1000));
  return (
    <View style={styles.run}>
      <View style={styles.runHead}>
        {paused ? (
          <Pause size={13} color={theme.colors.accentInk} />
        ) : (
          <View style={styles.runDot} />
        )}
        <Text
          variant="caption"
          weight="bold"
          accent
          uppercase
          style={styles.flex}
        >
          {paused ? t('workouts:workRest.paused') : t('app:workRest.running')}
        </Text>
        <Text variant="bodySmall" weight="bold" accent style={styles.tabular}>
          {formatDuration(left)}
        </Text>
      </View>
      <View style={styles.runActions}>
        <Button
          label={t('app:workRest.cancel')}
          variant="secondary"
          size="sm"
          flex
          onPress={controls.cancel}
        />
        <Button
          label={t('app:workRest.finish')}
          variant="secondary"
          size="sm"
          flex
          onPress={controls.finish}
        />
        <Button
          label={t('app:workRest.open')}
          icon={Play}
          size="sm"
          flex
          onPress={onOpen}
        />
      </View>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  block: { gap: 4 },
  // Centred: a block with only a name sat at the top of a row as tall as
  // its buttons.
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: t.line(0.08),
  },
  stripe: { width: 5, alignSelf: 'stretch', borderRadius: 3 },
  titleBox: { flex: 1, minWidth: 0, gap: 4, justifyContent: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  flex: { flex: 1, minWidth: 0 },
  badge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  badgeWarning: {
    backgroundColor: 'rgba(245,158,11,0.1)',
    borderColor: 'rgba(245,158,11,0.25)',
  },
  empty: { alignItems: 'center', gap: 6, paddingVertical: 24 },
  run: {
    gap: 10,
    padding: 12,
    marginTop: 6,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: t.ink(0.2),
    backgroundColor: t.ink(0.08),
  },
  runHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  runDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: t.colors.accent,
  },
  runActions: { flexDirection: 'row', gap: 8 },
  tabular: { fontVariant: ['tabular-nums'] },
}));
