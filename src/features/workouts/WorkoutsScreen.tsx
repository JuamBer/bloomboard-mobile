import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import {
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Dumbbell,
  MapPin,
  Play,
  Plus,
  Timer,
  Trophy,
} from 'lucide-react-native';
import { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { meService } from '@shared/api/services/me.service';
import { workoutsService } from '@shared/api/services/workouts.service';
import { radius } from '@shared/theme/theme';
import { makeStyles, useTheme } from '@shared/theme/ThemeProvider';
import type { WorkoutSummary } from '@shared/types/api.types';
import { Button } from '@shared/ui/Button';
import {
  CONTENT_MAX_WIDTH,
  PageHeader,
  useContentBottomPadding,
} from '@shared/ui/layout';
import { Sheet } from '@shared/ui/Sheet';
import { CenteredSpinner, Spinner } from '@shared/ui/Spinner';
import { EmptyState } from '@shared/ui/states';
import { Text } from '@shared/ui/Text';
import { MY_WORKOUTS_KEY, useActiveWorkout, useStartWorkout } from './hooks';
import { formatMinutes, formatTime, formatWorkoutDate } from './lib/dates';
import { formatKg } from './lib/records';

/**
 * The member's training: every workout they have done — at a center or on
 * their own — newest first. Starting one is here too: empty, or from one of
 * their plans. How an exercise is going is on that exercise's page.
 */
export function WorkoutsScreen() {
  const { t } = useTranslation(['workouts']);
  const styles = useStyles();
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const bottomPadding = useContentBottomPadding();
  const [starting, setStarting] = useState(false);
  const { data: active } = useActiveWorkout();
  // A session's workout is reached from its control; this is one's own.
  const open = active && !active.sessionUserId ? active : null;

  const history = useInfiniteQuery({
    queryKey: MY_WORKOUTS_KEY,
    queryFn: ({ pageParam }) => workoutsService.mine.list(pageParam),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.meta.page < last.meta.totalPages ? last.meta.page + 1 : undefined,
  });
  const workouts = history.data?.pages.flatMap((p) => p.data) ?? [];
  const [refreshing, setRefreshing] = useState(false);

  const openWorkout = (workoutId: string) =>
    router.push({ pathname: '/workouts/[workoutId]', params: { workoutId } });

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <FlatList
        data={workouts}
        keyExtractor={(w) => w.id}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: bottomPadding },
        ]}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        ListHeaderComponent={
          <View style={styles.header}>
            <PageHeader
              title={t('workouts:history.title')}
              subtitle={t('workouts:history.subtitle')}
            />
            {open ? (
              <Button
                label={t('workouts:start.continue')}
                icon={Play}
                size="lg"
                fullWidth
                onPress={() => openWorkout(open.id)}
              />
            ) : (
              <Button
                label={t('workouts:start.action')}
                icon={Play}
                size="lg"
                fullWidth
                onPress={() => setStarting(true)}
              />
            )}
          </View>
        }
        ListEmptyComponent={
          history.isLoading ? (
            <CenteredSpinner />
          ) : (
            <EmptyState
              icon={Dumbbell}
              description={t('workouts:history.empty')}
            />
          )
        }
        ListFooterComponent={history.isFetchingNextPage ? <Spinner /> : null}
        onEndReached={() =>
          history.hasNextPage &&
          !history.isFetchingNextPage &&
          history.fetchNextPage()
        }
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            tintColor={theme.colors.accentInk}
            colors={[theme.colors.accent]}
            progressBackgroundColor={theme.colors.surface}
            onRefresh={async () => {
              setRefreshing(true);
              try {
                await history.refetch();
              } finally {
                setRefreshing(false);
              }
            }}
          />
        }
        renderItem={({ item }) => (
          <WorkoutRow workout={item} onPress={() => openWorkout(item.id)} />
        )}
      />
      <StartWorkoutSheet open={starting} onClose={() => setStarting(false)} />
    </View>
  );
}

/** One workout of the history: when, where, the plan it followed, how much
 *  of it was done, the kilos moved and the records it set. */
function WorkoutRow({
  workout: w,
  onPress,
}: {
  workout: WorkoutSummary;
  onPress: () => void;
}) {
  const { t, i18n } = useTranslation(['workouts']);
  const styles = useStyles();
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.row,
        pressed && { borderColor: theme.line(0.2) },
      ]}
    >
      <View style={styles.flex}>
        <Text variant="micro" muted={0.45} uppercase>
          {formatWorkoutDate(w.startedAt, i18n.language)} ·{' '}
          {formatTime(w.startedAt, i18n.language)}
        </Text>
        <Text variant="body" weight="bold" numberOfLines={1}>
          {w.name}
        </Text>
        <View style={styles.inline}>
          <MapPin size={12} color={theme.text(0.45)} />
          <Text
            variant="caption"
            muted={0.5}
            numberOfLines={1}
            style={styles.flex}
          >
            {w.session
              ? [w.session.center.name, w.session.service?.name]
                  .filter(Boolean)
                  .join(' · ')
              : t('workouts:history.onYourOwnMine')}
          </Text>
        </View>
        <View style={styles.stats}>
          {!w.finishedAt ? (
            <View style={styles.inline}>
              <View style={styles.liveDot} />
              <Text variant="caption" weight="bold" accent>
                {t('workouts:history.inProgress')}
              </Text>
            </View>
          ) : (
            w.durationMinutes != null && (
              <View style={styles.inline}>
                <Timer size={12} color={theme.text(0.55)} />
                <Text variant="caption" muted={0.6}>
                  {formatMinutes(w.durationMinutes)}
                </Text>
              </View>
            )
          )}
          <View style={styles.inline}>
            <CheckCircle2 size={12} color={theme.text(0.55)} />
            <Text variant="caption" muted={0.6}>
              {t('workouts:history.exercisesDone', {
                done: w.exercisesDone,
                total: w.exercises,
              })}
            </Text>
          </View>
          <Text variant="caption" muted={0.6}>
            {t('workouts:history.sets', { count: w.setsDone })}
          </Text>
          {w.volume > 0 && (
            <Text variant="caption" muted={0.6}>
              {formatKg(w.volume)}
            </Text>
          )}
          {w.records > 0 && (
            <View style={styles.inline}>
              <Trophy size={12} color={theme.colors.warningInk} />
              <Text
                variant="caption"
                weight="bold"
                color={theme.colors.warningInk}
              >
                {t('workouts:history.records', { count: w.records })}
              </Text>
            </View>
          )}
        </View>
        {w.exerciseNames.length > 0 && (
          <Text variant="caption" muted={0.4} numberOfLines={1}>
            {w.exerciseNames.join(' · ')}
          </Text>
        )}
      </View>
      <ChevronRight size={17} color={theme.text(0.25)} />
    </Pressable>
  );
}

/**
 * How a member starts training on their own: an empty workout, built as they
 * go, or one of their plans — their own routines' and the ones their centers
 * prepared — to follow and change as they please.
 */
export function StartWorkoutSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation(['workouts']);
  const styles = useStyles();
  const theme = useTheme();
  const start = useStartWorkout(onClose);
  const { data: routines, isLoading } = useQuery({
    queryKey: ['me', 'routines'],
    queryFn: meService.getRoutines,
    enabled: open,
  });
  const pending = start.isPending
    ? (start.variables?.workoutTemplateId ?? 'empty')
    : null;
  const option = (
    key: string,
    title: string,
    subtitle: string | null,
    empty: boolean,
    templateId?: string,
  ) => (
    <Pressable
      key={key}
      disabled={start.isPending}
      onPress={() => start.mutate({ workoutTemplateId: templateId })}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.option,
        pressed && { borderColor: theme.line(0.2) },
      ]}
    >
      <View style={styles.optionIcon}>
        {empty ? (
          <Plus size={17} color={theme.text(0.5)} />
        ) : (
          <ClipboardList size={17} color={theme.text(0.5)} />
        )}
      </View>
      <View style={styles.flex}>
        <Text variant="bodySmall" weight="bold" numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="caption" muted={0.45} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {pending === (templateId ?? 'empty') ? (
        <ActivityIndicator size="small" color={theme.colors.accentInk} />
      ) : (
        <ChevronRight size={16} color={theme.text(0.25)} />
      )}
    </Pressable>
  );
  const withWorkouts = (routines ?? []).filter(
    (r) => (r.workouts ?? []).length > 0,
  );
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={t('workouts:start.title')}
      subtitle={t('workouts:start.hint')}
    >
      {option(
        'empty',
        t('workouts:start.empty'),
        t('workouts:start.emptyHint'),
        true,
      )}
      {isLoading ? (
        <CenteredSpinner />
      ) : (
        withWorkouts.map((routine) => (
          <View key={routine.id} style={styles.routine}>
            <Text variant="micro" muted={0.45} uppercase>
              {routine.name}
              {routine.assignedBy
                ? ` · ${routine.assignedBy.commercialName}`
                : ''}
            </Text>
            {(routine.workouts ?? []).map((w) =>
              option(
                w.id,
                w.workoutTemplate.name,
                t('workouts:start.exercises', {
                  count: w.workoutTemplate.blocks.reduce(
                    (n, b) => n + b.exercises.length,
                    0,
                  ),
                }),
                false,
                w.workoutTemplate.id,
              ),
            )}
          </View>
        ))
      )}
    </Sheet>
  );
}

const useStyles = makeStyles((t) => ({
  root: { flex: 1, backgroundColor: t.colors.background },
  content: {
    width: '100%',
    maxWidth: CONTENT_MAX_WIDTH,
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  header: { gap: 16, marginBottom: 16 },
  flex: { flex: 1, minWidth: 0 },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 14,
    borderRadius: radius['2xl'],
    borderWidth: 1,
    borderColor: t.line(0.08),
    backgroundColor: t.colors.surface,
  },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  stats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: 12,
    rowGap: 4,
    marginTop: 8,
    marginBottom: 4,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: t.colors.accentInk,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 10,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: t.line(0.08),
    backgroundColor: t.colors.surface,
  },
  optionIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.lg,
    backgroundColor: t.fill(0.05),
    alignItems: 'center',
    justifyContent: 'center',
  },
  routine: { gap: 8 },
}));
