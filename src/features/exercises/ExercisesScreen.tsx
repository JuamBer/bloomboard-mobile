import { useRouter } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { useState } from 'react';
import { FlatList, RefreshControl, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useLimitGuard } from '@features/member/hooks';
import { UpgradeSheet } from '@features/member/widgets/MemberPlan';
import { makeStyles, useTheme } from '@shared/theme/ThemeProvider';
import { IconButton } from '@shared/ui/Button';
import {
  CONTENT_MAX_WIDTH,
  PageHeader,
  useContentBottomPadding,
} from '@shared/ui/layout';
import { CenteredSpinner, Spinner } from '@shared/ui/Spinner';
import { EmptyState, QueryState } from '@shared/ui/states';
import {
  EMPTY_EXERCISE_FILTERS,
  countActiveExerciseFilters,
  type ExerciseFilters,
} from './constants/exercise.filters';
import { useExerciseOrigins } from './origins';
import { ExerciseCard } from './widgets/ExerciseCard';
import {
  ExerciseFilterSheet,
  ExerciseSearchBar,
  useDebouncedSearch,
  useMemberExerciseList,
} from './widgets/ExerciseFilters';
import { ExerciseFormSheet } from './widgets/ExerciseFormSheet';

/**
 * Every exercise the member can read: the app's, their own, and those of the
 * companies they train with — narrowed by "Origen", one chip per company by
 * name. A company's exercise opens and can be copied; it is not put in the
 * member's workouts as it is (see the exercise screen).
 */
export function ExercisesScreen() {
  const { t } = useTranslation(['member', 'exercises', 'common']);
  const styles = useStyles();
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const bottomPadding = useContentBottomPadding();
  const origins = useExerciseOrigins();
  const { guard, blocked, dismiss } = useLimitGuard();
  const search = useDebouncedSearch();
  const [filters, setFilters] = useState<ExerciseFilters>(
    EMPTY_EXERCISE_FILTERS,
  );
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const list = useMemberExerciseList({
    search: search.settled,
    filters,
    scope: 'list',
  });
  const exercises = list.data?.pages.flatMap((p) => p.data) ?? [];
  const total = list.data?.pages[0]?.meta.total;
  const openExercise = (exerciseId: string) =>
    router.push({
      pathname: '/exercises/[exerciseId]',
      params: { exerciseId },
    });

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <FlatList
        data={exercises}
        keyExtractor={(e) => e.id}
        numColumns={2}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        columnWrapperStyle={styles.columns}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: bottomPadding },
        ]}
        ListHeaderComponent={
          <View style={styles.header}>
            <PageHeader
              title={t('member:exercises.title')}
              subtitle={t('member:exercises.subtitle')}
              aside={
                <IconButton
                  icon={Plus}
                  variant="primary"
                  size={42}
                  accessibilityLabel={t('member:exercises.new')}
                  onPress={() => guard('exercises', () => setCreating(true))}
                />
              }
            />
            <ExerciseSearchBar
              value={search.text}
              onChange={search.setText}
              activeFilters={countActiveExerciseFilters(filters)}
              onOpenFilters={() => setFiltersOpen(true)}
            />
            <QueryState
              isLoading={false}
              isError={list.isError}
              onRetry={() => list.refetch()}
            />
          </View>
        }
        ListEmptyComponent={
          list.isLoading ? (
            <CenteredSpinner />
          ) : list.isError ? null : (
            <EmptyState
              description={
                filters.origin === 'own'
                  ? t('member:exercises.ownEmpty')
                  : t('common:states.empty')
              }
            />
          )
        }
        ListFooterComponent={list.isFetchingNextPage ? <Spinner /> : null}
        onEndReached={() =>
          list.hasNextPage && !list.isFetchingNextPage && list.fetchNextPage()
        }
        onEndReachedThreshold={0.6}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            tintColor={theme.colors.accentInk}
            colors={[theme.colors.accent]}
            progressBackgroundColor={theme.colors.surface}
            onRefresh={async () => {
              setRefreshing(true);
              try {
                await list.refetch();
              } finally {
                setRefreshing(false);
              }
            }}
          />
        }
        renderItem={({ item, index }) => (
          <View
            style={[
              styles.cell,
              exercises.length % 2 === 1 &&
                index === exercises.length - 1 &&
                styles.lastOdd,
            ]}
          >
            <ExerciseCard
              exercise={item}
              originLabel={origins.labelOf(item)}
              onPress={() => openExercise(item.id)}
            />
          </View>
        )}
      />
      <ExerciseFilterSheet
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        filters={filters}
        onChange={(patch) => setFilters((f) => ({ ...f, ...patch }))}
        originOptions={origins.options}
        total={total}
      />
      <ExerciseFormSheet
        open={creating}
        initialName={search.text}
        onClose={() => setCreating(false)}
        onSaved={(created) => {
          setCreating(false);
          openExercise(created.id);
        }}
      />
      <UpgradeSheet limit={blocked} onClose={dismiss} />
    </View>
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
    gap: 12,
  },
  header: { gap: 14, marginBottom: 4 },
  columns: { gap: 12 },
  cell: { flex: 1 },
  lastOdd: { maxWidth: '50%', paddingRight: 6 },
}));
