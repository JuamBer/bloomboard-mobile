import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react-native';
import { useState } from 'react';
import { FlatList, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  EMPTY_EXERCISE_FILTERS,
  countActiveExerciseFilters,
  type ExerciseFilters,
} from '@features/exercises/constants/exercise.filters';
import { useExerciseOrigins } from '@features/exercises/origins';
import { ExerciseCard } from '@features/exercises/widgets/ExerciseCard';
import {
  ExerciseFilterSheet,
  ExerciseSearchBar,
  useDebouncedSearch,
  useMemberExerciseList,
} from '@features/exercises/widgets/ExerciseFilters';
import { ExerciseFormSheet } from '@features/exercises/widgets/ExerciseFormSheet';
import { useLimitGuard } from '@features/member/hooks';
import { UpgradeSheet } from '@features/member/widgets/MemberPlan';
import { meService } from '@shared/api/services/me.service';
import type { EditorExercise, Exercise } from '@shared/types/api.types';
import { IconButton } from '@shared/ui/Button';
import { Sheet } from '@shared/ui/Sheet';
import { CenteredSpinner, Spinner } from '@shared/ui/Spinner';
import { Text } from '@shared/ui/Text';
import { createDefaultSet } from '../constants/metric-field-config';
import { useEditorSource, type EditorDoc } from '../lib/editor-source';
import { toUpsertPayload } from '../types/workout-set.types';

/**
 * Finds an exercise and puts it in the plan or workout — or, with `onSelect`,
 * just picks one (replacing an exercise).
 *
 * A member sees everything they can read — the app's, their own, each of
 * their companies' — but builds only from the app's and their own: a
 * company's exercise is copied into theirs first ("Copiar y añadir"), counted
 * against their plan, and the copy is what goes in. If the company leaves Bloom
 * Board, nothing the member built breaks. The backend refuses anything else.
 */
export function ExercisePickerSheet({
  open,
  onClose,
  docId,
  blockId,
  title,
  onAdded,
  onSelect,
  excludeExerciseId,
  superSetGroupId,
}: {
  open: boolean;
  onClose: () => void;
  docId: string;
  blockId: string;
  title?: string;
  /** After it was added: the new entry (its metrics sheet opens next). */
  onAdded?: (entry: EditorExercise) => void;
  /** A plain picker: hands the exercise over instead of adding it. */
  onSelect?: (exercise: Exercise) => void;
  /** Not offered (replacing it with itself). */
  excludeExerciseId?: string;
  /** Into this super-set: its set goes at the end of the sequence. */
  superSetGroupId?: string;
}) {
  const { t } = useTranslation(['templates', 'exercises', 'common']);
  const queryClient = useQueryClient();
  const editor = useEditorSource();
  const origins = useExerciseOrigins();
  const { guard, blocked, dismiss } = useLimitGuard();
  const search = useDebouncedSearch();
  const [filters, setFilters] = useState<ExerciseFilters>(
    EMPTY_EXERCISE_FILTERS,
  );
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const list = useMemberExerciseList({
    search: search.settled,
    filters,
    pageSize: 30,
    scope: 'picker',
    // Every exercise card holds a (closed) picker: only an open one loads.
    enabled: open,
  });
  const exercises = (list.data?.pages.flatMap((p) => p.data) ?? []).filter(
    (e) => e.id !== excludeExerciseId,
  );
  const total = list.data?.pages[0]?.meta.total;

  /** A company's exercise: readable, not usable as it is. */
  const needsCopy = (exercise: Exercise) => !!exercise.companyId;

  // An exercise goes in as an empty entry (no metrics); the card then opens
  // the metrics sheet to configure it.
  const add = useMutation({
    mutationFn: (exercise: Exercise) =>
      editor.api.addExercise(docId, blockId, {
        exerciseId: exercise.id,
        notes: '',
        superSetGroupId,
        sets: [createDefaultSet([], [])].map(toUpsertPayload),
      }),
    onMutate: (exercise) => setBusyId(exercise.id),
    onSuccess: (entry) => {
      queryClient.setQueryData(editor.queryKey, (old?: EditorDoc) =>
        old?.blocks
          ? {
              ...old,
              blocks: old.blocks.map((b) =>
                b.id === blockId
                  ? { ...b, exercises: [...b.exercises, entry] }
                  : b,
              ),
            }
          : old,
      );
      onAdded?.(entry);
    },
    onSettled: () => setBusyId(null),
  });

  const hand = (exercise: Exercise) => {
    if (onSelect) {
      onSelect(exercise);
      onClose();
    } else {
      add.mutate(exercise);
    }
  };

  const copyAndUse = useMutation({
    mutationFn: (exercise: Exercise) => meService.copyExercise(exercise.id),
    onMutate: (exercise) => setBusyId(exercise.id),
    onSuccess: (created) => {
      void queryClient.invalidateQueries({ queryKey: ['me'] });
      hand(created);
    },
    onError: () => setBusyId(null),
  });

  const pick = (exercise: Exercise) =>
    needsCopy(exercise)
      ? guard('exercises', () => copyAndUse.mutate(exercise))
      : hand(exercise);

  const actionLabel = (exercise: Exercise) =>
    needsCopy(exercise)
      ? onSelect
        ? t('templates:addExercise.copyAndUse')
        : t('templates:addExercise.copyAndAdd')
      : t('common:add');

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={title ?? t('templates:addExercise.title')}
      full
      scroll={false}
    >
      <View style={{ paddingHorizontal: 16, gap: 8, paddingBottom: 8 }}>
        <ExerciseSearchBar
          value={search.text}
          onChange={search.setText}
          activeFilters={countActiveExerciseFilters(filters)}
          onOpenFilters={() => setFiltersOpen(true)}
          trailing={
            <IconButton
              icon={Plus}
              variant="soft"
              size={44}
              accessibilityLabel={t('templates:addExercise.createNew')}
              onPress={() => guard('exercises', () => setCreating(true))}
            />
          }
        />
        {filters.origin.startsWith('company:') && (
          <Text variant="caption" muted={0.5}>
            {t('templates:addExercise.copyHint')}
          </Text>
        )}
      </View>
      {list.isLoading ? (
        <CenteredSpinner />
      ) : (
        <FlatList
          data={exercises}
          keyExtractor={(e) => e.id}
          numColumns={2}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          columnWrapperStyle={{ gap: 10 }}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingBottom: 24,
            gap: 10,
          }}
          onEndReached={() =>
            list.hasNextPage && !list.isFetchingNextPage && list.fetchNextPage()
          }
          onEndReachedThreshold={0.6}
          ListEmptyComponent={
            <Text
              variant="bodySmall"
              muted={0.45}
              center
              style={{ paddingVertical: 32 }}
            >
              {t('common:states.empty')}
            </Text>
          }
          ListFooterComponent={list.isFetchingNextPage ? <Spinner /> : null}
          renderItem={({ item, index }) => (
            <View
              style={{
                flex: 1,
                maxWidth:
                  exercises.length % 2 && index === exercises.length - 1
                    ? '50%'
                    : undefined,
              }}
            >
              <ExerciseCard
                exercise={item}
                originLabel={origins.labelOf(item)}
                onPress={() => pick(item)}
                action={{ label: actionLabel(item), copies: needsCopy(item) }}
                busy={busyId === item.id}
                disabled={busyId !== null}
              />
            </View>
          )}
        />
      )}
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
        onSaved={(exercise) => {
          setCreating(false);
          hand(exercise);
        }}
      />
      <UpgradeSheet limit={blocked} onClose={dismiss} />
    </Sheet>
  );
}
