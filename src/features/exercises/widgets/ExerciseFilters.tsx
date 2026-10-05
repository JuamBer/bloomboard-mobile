import { keepPreviousData, useInfiniteQuery } from '@tanstack/react-query';
import { Search, SlidersHorizontal, X } from 'lucide-react-native';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useMetricsCatalog } from '@features/editor/hooks/useMetricsCatalog';
import { meService } from '@shared/api/services/me.service';
import { fonts, radius } from '@shared/theme/theme';
import { makeStyles, useTheme } from '@shared/theme/ThemeProvider';
import { Button } from '@shared/ui/Button';
import { Chip } from '@shared/ui/controls';
import { SelectField } from '@shared/ui/pickers';
import { Sheet } from '@shared/ui/Sheet';
import { Text } from '@shared/ui/Text';
import {
  EMPTY_EXERCISE_FILTERS,
  countActiveExerciseFilters,
  memberExerciseFiltersToQuery,
  type ExerciseFilters,
} from '../constants/exercise.filters';
import {
  BODY_PART_LABELS,
  DIFFICULTY_LABELS,
  EQUIPMENT_LABELS,
  MUSCLE_LABELS,
} from '../constants/exercise.labels';
import type { ExerciseOriginOption } from '../origins';

const toOptions = (labels: Record<string, string>) =>
  Object.entries(labels).map(([value, label]) => ({ value, label }));

/**
 * Every exercise the member can read — the catalog, their own, each of their
 * companies' — searched and filtered, a page at a time. The list and the
 * picker read the same query.
 */
export function useMemberExerciseList({
  search,
  filters,
  pageSize = 24,
  scope,
  enabled = true,
}: {
  search: string;
  filters: ExerciseFilters;
  pageSize?: number;
  /** Separates the picker's cache from the list's. */
  scope: string;
  /** Off while the picker that reads it is closed. */
  enabled?: boolean;
}) {
  const query = useMemo(() => memberExerciseFiltersToQuery(filters), [filters]);
  return useInfiniteQuery({
    queryKey: ['me', 'exercises', scope, search, query],
    queryFn: ({ pageParam }) =>
      meService.getExercises({
        search: search || undefined,
        page: pageParam,
        limit: pageSize,
        sortBy: 'name',
        ...query,
      }),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.meta.page < last.meta.totalPages ? last.meta.page + 1 : undefined,
    placeholderData: keepPreviousData,
    enabled,
  });
}

/** A search box whose value settles 350 ms after the last keystroke. */
export function useDebouncedSearch() {
  const [text, setText] = useState('');
  const [settled, setSettled] = useState('');
  useEffect(() => {
    const id = setTimeout(() => setSettled(text.trim()), 350);
    return () => clearTimeout(id);
  }, [text]);
  return { text, setText, settled };
}

/** The search bar and the "Filtros" button with its count. */
export function ExerciseSearchBar({
  value,
  onChange,
  activeFilters,
  onOpenFilters,
  trailing,
}: {
  value: string;
  onChange: (text: string) => void;
  activeFilters: number;
  onOpenFilters: () => void;
  trailing?: ReactNode;
}) {
  const styles = useStyles();
  const theme = useTheme();
  const { t } = useTranslation(['exercises']);
  return (
    <View style={styles.bar}>
      <View style={styles.search}>
        <Search size={16} color={theme.text(0.3)} />
        <TextInput
          value={value}
          onChangeText={onChange}
          placeholder={t('exercises:list.search')}
          placeholderTextColor={theme.text(0.3)}
          autoCorrect={false}
          returnKeyType="search"
          style={styles.input}
        />
        {value ? (
          <Pressable
            onPress={() => onChange('')}
            hitSlop={10}
            accessibilityRole="button"
          >
            <X size={16} color={theme.text(0.4)} />
          </Pressable>
        ) : null}
      </View>
      <Pressable
        onPress={onOpenFilters}
        accessibilityRole="button"
        accessibilityLabel={t('exercises:filters.title')}
        style={[styles.filterButton, activeFilters > 0 && styles.filterActive]}
      >
        <SlidersHorizontal
          size={17}
          color={activeFilters > 0 ? theme.colors.accentInk : theme.text(0.6)}
        />
        {activeFilters > 0 && (
          <View style={styles.count}>
            <Text variant="micro" color={theme.colors.accentContrast}>
              {activeFilters}
            </Text>
          </View>
        )}
      </Pressable>
      {trailing}
    </View>
  );
}

/**
 * The filters, as the web shows them on a phone: a full sheet. Short enums
 * are chips (tap the active one to clear it), muscles and equipment —
 * dozens of values — searchable lists. Every filter is single-value: the API
 * takes one of each.
 */
export function ExerciseFilterSheet({
  open,
  onClose,
  filters,
  onChange,
  originOptions,
  total,
}: {
  open: boolean;
  onClose: () => void;
  filters: ExerciseFilters;
  onChange: (patch: Partial<ExerciseFilters>) => void;
  originOptions: ExerciseOriginOption[];
  total?: number;
}) {
  const { t } = useTranslation(['exercises']);
  const styles = useStyles();
  const { data: catalog } = useMetricsCatalog();
  const chips = (
    key: 'origin' | 'difficulty' | 'bodyPart' | 'metric',
    options: { value: string; label: string }[],
  ) => (
    <View style={styles.chips}>
      {options.map((opt) => {
        const active = filters[key] === opt.value;
        return (
          <Chip
            key={opt.value}
            label={opt.label}
            selected={active}
            onPress={() =>
              onChange({
                [key]: active ? '' : opt.value,
              } as Partial<ExerciseFilters>)
            }
          />
        );
      })}
    </View>
  );
  const group = (label: string, children: ReactNode) => (
    <View style={styles.group}>
      <Text variant="micro" muted={0.45} uppercase>
        {label}
      </Text>
      {children}
    </View>
  );
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={t('exercises:filters.title')}
      full
      footer={
        <>
          <Button
            label={t('exercises:filters.clear')}
            variant="secondary"
            flex
            disabled={countActiveExerciseFilters(filters) === 0}
            onPress={() => onChange(EMPTY_EXERCISE_FILTERS)}
          />
          <Button
            label={
              total === undefined
                ? t('exercises:filters.showResults')
                : t('exercises:filters.showResultsCount', { count: total })
            }
            flex
            onPress={onClose}
          />
        </>
      }
    >
      {originOptions.length > 1 &&
        group(t('exercises:filters.scope'), chips('origin', originOptions))}
      {group(
        t('exercises:filters.difficulty'),
        chips('difficulty', toOptions(DIFFICULTY_LABELS)),
      )}
      {group(
        t('exercises:filters.bodyPart'),
        chips('bodyPart', toOptions(BODY_PART_LABELS)),
      )}
      <SelectField
        label={t('exercises:filters.muscle')}
        value={filters.muscle}
        onChange={(v) => onChange({ muscle: v as ExerciseFilters['muscle'] })}
        options={toOptions(MUSCLE_LABELS)}
        placeholder={t('exercises:filters.any')}
        clearable
      />
      <SelectField
        label={t('exercises:filters.equipment')}
        value={filters.equipment}
        onChange={(v) =>
          onChange({ equipment: v as ExerciseFilters['equipment'] })
        }
        options={toOptions(EQUIPMENT_LABELS)}
        placeholder={t('exercises:filters.any')}
        clearable
      />
      {catalog &&
        group(
          t('exercises:filters.metric'),
          chips(
            'metric',
            catalog.metrics.map((m) => ({ value: m.key, label: m.name })),
          ),
        )}
    </Sheet>
  );
}

const useStyles = makeStyles((t) => ({
  bar: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  search: {
    flex: 1,
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: t.line(0.1),
    backgroundColor: t.fill(0.05),
  },
  input: {
    flex: 1,
    minWidth: 0,
    height: 42,
    paddingVertical: 0,
    fontFamily: fonts.sans,
    fontSize: 15,
    color: t.colors.foreground,
  },
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: t.line(0.1),
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterActive: { borderColor: t.ink(0.3), backgroundColor: t.ink(0.1) },
  count: {
    position: 'absolute',
    top: -6,
    right: -6,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: t.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  group: { gap: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
}));
