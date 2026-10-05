import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import {
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Flag,
  MapPin,
  MoreVertical,
  Pencil,
  Play,
  Trash2,
} from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  EditorSourceProvider,
  workoutEditorSource,
  workoutQueryKey,
} from '@features/editor/lib/editor-source';
import type { TemplateSessionView } from '@features/editor/lib/template-session';
import { EditorBody } from '@features/editor/widgets/EditorBody';
import {
  EditorScroll,
  type EditorScrollHandle,
} from '@features/editor/widgets/EditorScroll';
import { meService } from '@shared/api/services/me.service';
import { workoutsService } from '@shared/api/services/workouts.service';
import {
  currentExerciseIndex,
  flattenExercises,
  markTargetIds,
  progressSummary,
  statusOf,
  withMarked,
} from '@shared/lib/sessionProgress';
import { radius } from '@shared/theme/theme';
import { makeStyles, useTheme } from '@shared/theme/ThemeProvider';
import type { ExerciseProgressStatus, Workout } from '@shared/types/api.types';
import { ActionSheet } from '@shared/ui/ActionSheet';
import { Button, IconButton } from '@shared/ui/Button';
import { ConfirmDialog } from '@shared/ui/ConfirmDialog';
import { ProgressBar } from '@shared/ui/controls';
import { ElapsedTimer } from '@shared/ui/misc';
import { QueryState } from '@shared/ui/states';
import { Text } from '@shared/ui/Text';
import { formatMinutes, formatTime, formatWorkoutDate } from './lib/dates';
import { useFinishFlow } from './lib/finish-flow';
import { EditWorkoutSheet } from './widgets/EditWorkoutSheet';

const entryIdsOf = (workout: Workout) =>
  workout.blocks.flatMap((b) => b.exercises.map((e) => e.id));

const KEEP_AWAKE_TAG = 'bloom-workout';

/**
 * One workout — what someone trained, or is training — in the shared editor:
 * its sets take exact values, a tick each, the plan as placeholder, and the
 * references. While it is under way it is trained live: every exercise but the
 * one that is up is folded, completing it opens the next and scrolls to it,
 * and the screen stays awake (the phone sits on the bench between sets).
 *
 * The member finishes it here — their own, or their session's, which also
 * takes them off the board (the trainer's Finish does the same there) — and
 * the finish flow follows. One of their own under way can be discarded.
 */
export function WorkoutView({
  workoutId,
  top,
  aside,
  onFinished,
  onDeleted,
}: {
  workoutId: string;
  /** Pinned above the scroll — the session control's bar. Given Finish
   *  once the header (and its Finish) has scrolled away. */
  top?: (pinnedFinish: ReactNode) => ReactNode;
  /** Under the header — the session's TV picker. */
  aside?: ReactNode;
  /** After the member finishes it. */
  onFinished?: () => void;
  /** After it is deleted or discarded. */
  onDeleted?: () => void;
}) {
  const { t, i18n } = useTranslation(['workouts', 'templates', 'common']);
  const styles = useStyles();
  const theme = useTheme();
  const queryClient = useQueryClient();
  const key = workoutQueryKey(workoutId);
  const source = useMemo(() => workoutEditorSource(workoutId), [workoutId]);
  const startFinishFlow = useFinishFlow((s) => s.start);
  const scrollRef = useRef<EditorScrollHandle>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [confirmFinish, setConfirmFinish] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  // Whether the header card has scrolled out of view — set only when it
  // crosses, so scrolling never re-renders the whole editor.
  const headerHeight = useRef(0);
  const [pastHeader, setPastHeader] = useState(false);
  const onScroll = (y: number) => {
    const past = headerHeight.current > 0 && y > headerHeight.current;
    if (past !== pastHeader) setPastHeader(past);
  };

  const {
    data: workout,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: key,
    queryFn: () => workoutsService.getById(workoutId),
    // Written from more than one place (the board, the member's phone):
    // keep this copy close to the server's while it is under way.
    refetchInterval: (query) =>
      query.state.data && !query.state.data.finishedAt ? 8_000 : false,
  });

  const live = !!workout && !workout.finishedAt;

  // The screen stays on while a workout is under way.
  useEffect(() => {
    if (!live) return;
    void activateKeepAwakeAsync(KEEP_AWAKE_TAG).catch(() => undefined);
    return () => {
      void deactivateKeepAwake(KEEP_AWAKE_TAG).catch(() => undefined);
    };
  }, [live]);

  // ─── Live mode ─────────────────────────────────────────────────────────────
  const flat = workout && live ? flattenExercises(workout) : [];
  const currentIdx = currentExerciseIndex(flat);
  const currentEntryId = currentIdx >= 0 ? flat[currentIdx].exercise.id : null;

  // Only the exercise that is up stays open; each folds or opens on its own.
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [followedEntryId, setFollowedEntryId] = useState<string | null>();
  if (live && workout && currentEntryId !== followedEntryId) {
    setFollowedEntryId(currentEntryId);
    setCollapsed((prev) => {
      const next =
        followedEntryId === undefined
          ? new Set(entryIdsOf(workout))
          : new Set(prev);
      if (followedEntryId) next.add(followedEntryId);
      if (currentEntryId) next.delete(currentEntryId);
      return next;
    });
  }
  if (!live && followedEntryId !== undefined) {
    setFollowedEntryId(undefined);
    setCollapsed(new Set());
  }

  // Scrolls to the exercise that is up when the workout opens, and after a
  // mark made here moves it on — not when another device moves it.
  const scrollToCurrent = useRef(true);
  useEffect(() => {
    if (!live || !currentEntryId || !scrollToCurrent.current) return;
    const id = setTimeout(() => {
      if (scrollRef.current?.scrollToEntry(currentEntryId))
        scrollToCurrent.current = false;
    }, 250);
    return () => clearTimeout(id);
  }, [live, currentEntryId]);

  const invalidateHosts = () => {
    void queryClient.invalidateQueries({ queryKey: ['me', 'session'] });
    void queryClient.invalidateQueries({ queryKey: ['me', 'workouts'] });
  };

  const mark = useMutation({
    mutationFn: ({
      entryId,
      status,
    }: {
      entryId: string;
      status: ExerciseProgressStatus;
    }) => workoutsService.setExerciseStatus(workoutId, entryId, status),
    onMutate: async ({ entryId, status }) => {
      await queryClient.cancelQueries({ queryKey: key });
      const prev = queryClient.getQueryData<Workout>(key);
      if (prev)
        queryClient.setQueryData(key, withMarked(prev, entryId, status));
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(key, ctx.prev);
    },
    onSuccess: (updated) => queryClient.setQueryData(key, updated),
    onSettled: invalidateHosts,
  });

  const markEntry = (entryId: string, status: ExerciseProgressStatus) => {
    if (!workout) return;
    const targets = markTargetIds(workout, entryId);
    const nextCurrent =
      flat.find(
        (f) =>
          (targets.includes(f.exercise.id) ? status : f.status) === 'PENDING',
      )?.exercise.id ?? null;
    if (nextCurrent !== currentEntryId) scrollToCurrent.current = true;
    mark.mutate({ entryId, status });
  };

  const toggleCollapsed = (entryIds: string[]) =>
    setCollapsed((prev) => {
      const open = entryIds.every((id) => prev.has(id));
      const next = new Set(prev);
      for (const id of entryIds) {
        if (open) next.delete(id);
        else next.add(id);
      }
      return next;
    });

  const statusById = new Map(
    (workout?.blocks ?? []).flatMap((b) =>
      b.exercises.map((e) => [e.id, statusOf(e)] as const),
    ),
  );
  const sessionView: TemplateSessionView | null =
    live && workout
      ? {
          statusOf: (id) => statusById.get(id) ?? 'PENDING',
          currentEntryId,
          mark: markEntry,
          toggleCollapsed,
        }
      : null;

  // ─── The workout itself ────────────────────────────────────────────────────

  const finish = useMutation({
    mutationFn: async (finished: boolean) => {
      // A session's workout closes with the member's attendance.
      const sessionId = workout?.sessionUser?.session.id;
      if (finished && sessionId) {
        await meService.finishSession(sessionId);
        return workoutsService.getById(workoutId);
      }
      return workoutsService.update(workoutId, {
        finishedAt: finished ? new Date().toISOString() : null,
      });
    },
    onSuccess: (updated, finished) => {
      queryClient.setQueryData(key, updated);
      invalidateHosts();
      if (finished) {
        startFinishFlow(workoutId);
        onFinished?.();
      }
    },
  });

  const remove = useMutation({
    mutationFn: () => workoutsService.remove(workoutId),
    onSuccess: () => {
      invalidateHosts();
      queryClient.removeQueries({ queryKey: key });
      onDeleted?.();
    },
  });

  if (!workout) {
    return (
      <View style={styles.root}>
        {top?.(null)}
        <View style={styles.state}>
          <QueryState
            isLoading={isLoading}
            isError={isError}
            onRetry={refetch}
          />
        </View>
      </View>
    );
  }

  const isReadOnly = !workout.editable;
  const fromSession = !!workout.sessionUser;
  const session = workout.sessionUser?.session;
  const { done, total } = progressSummary(flattenExercises(workout));
  // The member finishes a session's workout too (their own checkout).
  const canFinish = !isReadOnly;
  // Only one's own: a session's workout is the session's record.
  const ownUnderWay = !isReadOnly && !fromSession && !workout.finishedAt;
  const pinFinish = canFinish && !workout.finishedAt && pastHeader;
  const finishButton = (
    <Button
      label={t('workouts:detail.finishShort')}
      icon={Flag}
      size="sm"
      onPress={() => setConfirmFinish(true)}
      loading={finish.isPending}
    />
  );

  return (
    <View style={styles.root}>
      {top?.(pinFinish ? finishButton : null)}
      <EditorScroll ref={scrollRef} onScroll={onScroll} onRefresh={refetch}>
        <View
          style={styles.header}
          onLayout={(e) => {
            headerHeight.current = e.nativeEvent.layout.height;
          }}
        >
          <View style={styles.headerTop}>
            <View style={styles.flex}>
              <Text variant="title">{workout.name}</Text>
              <View style={styles.meta}>
                <MetaLine icon={CalendarClock}>
                  {formatWorkoutDate(workout.startedAt, i18n.language)} ·{' '}
                  {formatTime(workout.startedAt, i18n.language)}
                </MetaLine>
                {session && (
                  <MetaLine icon={MapPin}>
                    {[session.center.name, session.service?.name]
                      .filter(Boolean)
                      .join(' · ')}
                  </MetaLine>
                )}
                {workout.workoutTemplate && (
                  <MetaLine icon={ClipboardList}>
                    {workout.workoutTemplate.name}
                  </MetaLine>
                )}
              </View>
            </View>
            <View style={styles.headerSide}>
              {workout.finishedAt ? (
                <View style={styles.doneBadge}>
                  <CheckCircle2 size={13} color={theme.colors.successInk} />
                  <Text
                    variant="caption"
                    weight="bold"
                    color={theme.colors.successInk}
                  >
                    {formatMinutes(
                      Math.max(
                        0,
                        Math.round(
                          (Date.parse(workout.finishedAt) -
                            Date.parse(workout.startedAt)) /
                            60_000,
                        ),
                      ),
                    )}
                  </Text>
                </View>
              ) : (
                <ElapsedTimer since={workout.startedAt} variant="heading" />
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
          </View>

          {total > 0 && (
            <View style={styles.progress}>
              <ProgressBar value={done / total} />
              <Text
                variant="caption"
                weight="bold"
                muted={0.55}
                style={styles.tabular}
              >
                {t('workouts:detail.progress', { done, total })}
              </Text>
            </View>
          )}

          {workout.notes ? (
            <Text variant="bodySmall" muted={0.6}>
              {workout.notes}
            </Text>
          ) : null}

          {canFinish && !workout.finishedAt && (
            <View style={styles.actions}>
              {ownUnderWay && (
                <Button
                  label={t('workouts:detail.discardShort')}
                  icon={Trash2}
                  variant="secondary"
                  disabled={remove.isPending || finish.isPending}
                  onPress={() => setConfirmDelete(true)}
                />
              )}
              <Button
                // Beside Discard there is only room for the short label.
                label={t(
                  ownUnderWay
                    ? 'workouts:detail.finishShort'
                    : 'workouts:detail.finish',
                )}
                icon={Flag}
                flex
                loading={finish.isPending}
                disabled={remove.isPending}
                onPress={() => setConfirmFinish(true)}
              />
            </View>
          )}
          {fromSession && !workout.finishedAt && !canFinish && (
            <Text variant="caption" muted={0.4}>
              {t('workouts:detail.sessionFinishes')}
            </Text>
          )}
        </View>

        {aside}

        <EditorSourceProvider value={source}>
          <EditorBody
            doc={workout}
            isReadOnly={isReadOnly}
            collapsedExercises={collapsed}
            sessionView={sessionView}
            emptyReadOnly={t('workouts:detail.empty')}
          />
        </EditorSourceProvider>
      </EditorScroll>

      {/* Once the header has scrolled away: the clock, the progress and Finish. */}
      {!top && pinFinish && (
        <View style={styles.pinned}>
          <Text
            variant="bodySmall"
            weight="bold"
            numberOfLines={1}
            style={styles.flex}
          >
            {workout.name}
          </Text>
          {total > 0 && (
            <Text
              variant="caption"
              weight="bold"
              muted={0.55}
              style={styles.tabular}
            >
              {done}/{total}
            </Text>
          )}
          <ElapsedTimer since={workout.startedAt} />
          {finishButton}
        </View>
      )}

      <ActionSheet
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        title={workout.name}
        actions={[
          {
            key: 'edit',
            label: t('common:edit'),
            icon: Pencil,
            onPress: () => setEditing(true),
          },
          !fromSession &&
            !!workout.finishedAt && {
              key: 'resume',
              label: t('workouts:detail.resume'),
              icon: Play,
              onPress: () => finish.mutate(false),
            },
          // Under way, Discard sits beside Finish instead.
          !fromSession &&
            !!workout.finishedAt && {
              key: 'delete',
              label: t('common:delete'),
              icon: Trash2,
              destructive: true,
              separated: true,
              onPress: () => setConfirmDelete(true),
            },
        ]}
      />

      <EditWorkoutSheet
        open={editing}
        workout={workout}
        onClose={() => setEditing(false)}
        onSaved={(updated) => {
          queryClient.setQueryData(key, updated);
          invalidateHosts();
          setEditing(false);
        }}
      />

      <ConfirmDialog
        open={confirmFinish}
        onClose={() => setConfirmFinish(false)}
        title={t('workouts:detail.finishTitle')}
        description={[
          done < total
            ? t('workouts:detail.finishPending', { count: total - done })
            : t('workouts:detail.finishAllDone'),
          // Finishing is leaving the room, as far as the board can tell.
          fromSession && t('workouts:detail.finishSession'),
        ]
          .filter(Boolean)
          .join(' ')}
        confirmLabel={t('workouts:detail.finish')}
        destructive={false}
        loading={finish.isPending}
        onConfirm={() => {
          setConfirmFinish(false);
          finish.mutate(true);
        }}
      />

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title={
          workout.finishedAt
            ? t('workouts:detail.deleteTitle')
            : t('workouts:detail.discardTitle')
        }
        description={t(
          workout.finishedAt
            ? 'workouts:detail.deleteDescription'
            : 'workouts:detail.discardDescription',
          { name: workout.name },
        )}
        confirmLabel={
          workout.finishedAt
            ? t('common:delete')
            : t('workouts:detail.discardShort')
        }
        loading={remove.isPending}
        onConfirm={() => {
          setConfirmDelete(false);
          remove.mutate();
        }}
      />
    </View>
  );
}

function MetaLine({
  icon: Icon,
  children,
}: {
  icon: typeof MapPin;
  children: ReactNode;
}) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
      <Icon size={13} color={theme.text(0.45)} />
      <Text
        variant="caption"
        muted={0.5}
        numberOfLines={1}
        style={{ flexShrink: 1 }}
      >
        {children}
      </Text>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  root: { flex: 1, backgroundColor: t.colors.background },
  state: { padding: 16 },
  flex: { flex: 1, minWidth: 0 },
  header: {
    gap: 12,
    padding: 16,
    marginBottom: 20,
    borderRadius: radius['2xl'],
    borderWidth: 1,
    borderColor: t.line(0.06),
    backgroundColor: t.fill(0.03),
  },
  headerTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  headerSide: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  meta: { gap: 3, marginTop: 6 },
  doneBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    height: 30,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.25)',
    backgroundColor: 'rgba(16,185,129,0.1)',
  },
  progress: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  tabular: { fontVariant: ['tabular-nums'] },
  actions: { flexDirection: 'row', gap: 8 },
  pinned: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: t.colors.background,
    borderBottomWidth: 1,
    borderBottomColor: t.line(0.08),
  },
}));
