import { useQueryClient } from '@tanstack/react-query';
import { useRouter, type Href } from 'expo-router';
import {
  CalendarDays,
  Dumbbell,
  Ruler,
  Settings,
  type LucideIcon,
} from 'lucide-react-native';
import { useState } from 'react';
import { FlatList, Pressable, RefreshControl, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useMemberProfile } from '@features/member/hooks';
import {
  useTrainingSummary,
  useWorkoutHistory,
} from '@features/workouts/hooks';
import { WorkoutCard } from '@features/workouts/widgets/WorkoutCard';
import { radius } from '@shared/theme/theme';
import { makeStyles, useTheme } from '@shared/theme/ThemeProvider';
import { Button, IconButton } from '@shared/ui/Button';
import {
  CONTENT_MAX_WIDTH,
  PageHeader,
  useContentBottomPadding,
} from '@shared/ui/layout';
import { Avatar } from '@shared/ui/misc';
import { CenteredSpinner, Spinner } from '@shared/ui/Spinner';
import { EmptyState, QueryState } from '@shared/ui/states';
import { Text } from '@shared/ui/Text';

/**
 * The member's profile: who they are and how much they have trained, the way
 * into their exercises, measurements and calendar, and every workout they
 * have done, newest first, loading more as they scroll. Everything about the
 * account and the app (details, password, plan, units, language, help) is
 * behind the gear, in Ajustes.
 */
export function ProfileScreen() {
  const { t } = useTranslation(['member', 'app']);
  const styles = useStyles();
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const bottomPadding = useContentBottomPadding();
  const queryClient = useQueryClient();
  const { data: profile, isError, refetch } = useMemberProfile();
  const summary = useTrainingSummary();
  const history = useWorkoutHistory();
  const workouts = history.data?.pages.flatMap((p) => p.data) ?? [];
  const [refreshing, setRefreshing] = useState(false);

  // What they go by: the nickname when they have one.
  const displayName = profile
    ? profile.alias?.trim() || `${profile.firstName} ${profile.lastName}`.trim()
    : '';

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
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListHeaderComponent={
          <View style={styles.header}>
            <PageHeader
              title={t('member:profile.title')}
              aside={
                <IconButton
                  icon={Settings}
                  size={42}
                  accessibilityLabel={t('app:settings.title')}
                  onPress={() => router.push('/settings')}
                />
              }
            />
            <QueryState isLoading={false} isError={isError} onRetry={refetch} />
            {profile && (
              <View style={styles.identity}>
                <Avatar
                  firstName={profile.firstName}
                  lastName={profile.lastName}
                  url={profile.avatarUrl}
                  size={72}
                />
                <View style={styles.flex}>
                  <Text variant="title" numberOfLines={2}>
                    {displayName}
                  </Text>
                  <Text variant="bodySmall" muted={0.55}>
                    {summary.data
                      ? t('app:profile.workoutsCount', {
                          count: summary.data.total,
                        })
                      : ' '}
                  </Text>
                </View>
              </View>
            )}
            <View style={styles.tiles}>
              <Tile
                icon={Dumbbell}
                label={t('app:profile.exercises')}
                href="/exercises"
              />
              <Tile
                icon={Ruler}
                label={t('app:profile.measurements')}
                href="/measurements"
              />
              <Tile
                icon={CalendarDays}
                label={t('app:profile.calendar')}
                href="/workouts/calendar"
              />
            </View>
            <Text variant="subheading" style={styles.listTitle}>
              {t('app:profile.workouts')}
            </Text>
          </View>
        }
        ListEmptyComponent={
          history.isLoading ? (
            <CenteredSpinner />
          ) : history.isError ? (
            <QueryState
              isLoading={false}
              isError
              onRetry={() => history.refetch()}
            />
          ) : (
            <EmptyState
              icon={Dumbbell}
              description={t('app:profile.workoutsEmpty')}
              action={
                <Button
                  label={t('app:profile.toRoutines')}
                  variant="soft"
                  size="sm"
                  onPress={() => router.navigate('/routines')}
                />
              }
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
                await Promise.all([
                  refetch(),
                  queryClient.invalidateQueries({
                    queryKey: ['me', 'workouts'],
                  }),
                ]);
              } finally {
                setRefreshing(false);
              }
            }}
          />
        }
        renderItem={({ item }) => (
          <WorkoutCard workout={item} onPress={() => openWorkout(item.id)} />
        )}
      />
    </View>
  );
}

/** One of the profile's ways in: an icon over a word. */
function Tile({
  icon: Icon,
  label,
  href,
}: {
  icon: LucideIcon;
  label: string;
  href: Href;
}) {
  const styles = useStyles();
  const theme = useTheme();
  const router = useRouter();
  return (
    <Pressable
      onPress={() => router.push(href)}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.tile,
        pressed && { backgroundColor: theme.fill(0.06) },
      ]}
    >
      <Icon size={22} color={theme.colors.accentInk} strokeWidth={2} />
      <Text variant="label" numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
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
  header: { gap: 18, marginBottom: 12 },
  flex: { flex: 1, minWidth: 0, gap: 2 },
  identity: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  tiles: { flexDirection: 'row', gap: 10 },
  tile: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    gap: 8,
    paddingVertical: 16,
    paddingHorizontal: 6,
    borderRadius: radius['2xl'],
    borderWidth: 1,
    borderColor: t.line(0.08),
    backgroundColor: t.colors.surface,
  },
  listTitle: { marginTop: 6 },
  separator: { height: 10 },
}));
