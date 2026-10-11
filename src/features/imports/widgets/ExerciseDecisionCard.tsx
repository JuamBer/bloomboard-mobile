import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { Check, Dumbbell, Search } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { meService } from '@shared/api/services/me.service';
import { makeStyles, useTheme } from '@shared/theme/ThemeProvider';
import type {
  HevyExerciseOption,
  HevyPreviewExercise,
} from '@shared/types/api.types';
import { Badge, Segmented } from '@shared/ui/controls';
import { Text } from '@shared/ui/Text';
import { TextField } from '@shared/ui/TextField';
import { needsReview, type DraftDecision } from '../lib/decisions';

const TONE = {
  linked: 'success',
  exact: 'success',
  alias: 'success',
  suggested: 'warning',
  none: 'neutral',
} as const;

/**
 * One Hevy exercise and what it becomes — the web's ExerciseDecisionRow:
 * matched to an exercise here (the proposed ones, or any found by search),
 * created as the member's own, or not imported.
 */
export function ExerciseDecisionCard({
  item,
  draft,
  onChange,
}: {
  item: HevyPreviewExercise;
  draft: DraftDecision;
  onChange: (draft: DraftDecision) => void;
}) {
  const { t } = useTranslation(['imports']);
  const styles = useStyles();

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <View style={styles.flex}>
          <Text variant="bodySmall" weight="bold" numberOfLines={2}>
            {item.title}
          </Text>
          <Text variant="caption" muted={0.45}>
            {t('imports:exercises.sets', { count: item.sets })} ·{' '}
            {t('imports:exercises.workouts', { count: item.workouts })}
          </Text>
        </View>
        <Badge
          label={t(`imports:exercises.status.${item.status}`)}
          tone={TONE[item.status]}
        />
      </View>

      <Segmented
        value={draft.action}
        options={(['match', 'create', 'skip'] as const).map((value) => ({
          value,
          label: t(`imports:exercises.actions.${value}`),
        }))}
        onChange={(action) => {
          if (action === 'match') {
            onChange({
              action,
              exercise: item.exercise ?? item.candidates[0] ?? null,
            });
          } else if (action === 'create') {
            onChange({ action, name: item.title });
          } else {
            onChange({ action });
          }
        }}
      />

      {draft.action === 'match' && (
        <MatchPicker
          item={item}
          selected={draft.exercise}
          onSelect={(exercise) => onChange({ action: 'match', exercise })}
        />
      )}
      {draft.action === 'create' && (
        <TextField
          label={t('imports:exercises.createName')}
          value={draft.name}
          onChangeText={(name) => onChange({ action: 'create', name })}
          maxLength={120}
        />
      )}
      {draft.action === 'skip' && (
        <Text variant="caption" muted={0.45}>
          {t('imports:exercises.skipHint')}
        </Text>
      )}
    </View>
  );
}

function MatchPicker({
  item,
  selected,
  onSelect,
}: {
  item: HevyPreviewExercise;
  selected: HevyExerciseOption | null;
  onSelect: (exercise: HevyExerciseOption) => void;
}) {
  const { t } = useTranslation(['imports']);
  const styles = useStyles();
  const theme = useTheme();
  // A recognised exercise shows only its match until asked to change it.
  const [open, setOpen] = useState(!selected || needsReview(item));
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  useEffect(() => {
    const id = setTimeout(() => setQuery(search.trim()), 400);
    return () => clearTimeout(id);
  }, [search]);

  const { data: found } = useQuery({
    queryKey: ['imports', 'exercise-search', query],
    queryFn: () =>
      meService.getExercises({
        search: query,
        source: 'usable',
        page: 1,
        limit: 8,
      }),
    enabled: query.length >= 2,
    staleTime: 60_000,
  });
  const searched: HevyExerciseOption[] = (found?.data ?? []).map((e) => ({
    id: e.id,
    name: e.name,
    own: !!e.userId,
    equipments: e.equipments ?? [],
    imageUrl: e.imageUrls?.[0] ?? null,
  }));
  const options = query.length >= 2 ? searched : item.candidates;
  const list =
    selected && !options.some((o) => o.id === selected.id)
      ? [selected, ...options]
      : options;

  if (!open && selected) {
    return (
      <View style={[styles.option, styles.optionActive]}>
        <Thumb option={selected} />
        <Text variant="bodySmall" numberOfLines={2} style={styles.flex}>
          {selected.name}
        </Text>
        <Pressable onPress={() => setOpen(true)} hitSlop={8}>
          <Text variant="label" weight="bold" accent>
            {t('imports:exercises.change')}
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.picker}>
      <TextField
        value={search}
        onChangeText={setSearch}
        placeholder={t('imports:exercises.searchPlaceholder')}
        trailing={<Search size={16} color={theme.text(0.3)} />}
        autoCorrect={false}
      />
      {!selected && (
        <Text variant="caption" weight="bold" color={theme.colors.warningInk}>
          {t('imports:exercises.chooseExercise')}
        </Text>
      )}
      {list.length === 0 ? (
        <Text variant="caption" muted={0.4}>
          {t('imports:exercises.noResults')}
        </Text>
      ) : (
        list.map((option) => {
          const active = option.id === selected?.id;
          return (
            <Pressable
              key={option.id}
              onPress={() => onSelect(option)}
              accessibilityState={{ selected: active }}
              style={[styles.option, active && styles.optionActive]}
            >
              <Thumb option={option} />
              <Text variant="bodySmall" numberOfLines={2} style={styles.flex}>
                {option.name}
              </Text>
              {option.own && <Badge label={t('imports:exercises.own')} />}
              {active && <Check size={16} color={theme.colors.accentInk} />}
            </Pressable>
          );
        })
      )}
    </View>
  );
}

function Thumb({ option }: { option: HevyExerciseOption }) {
  const styles = useStyles();
  const theme = useTheme();
  return (
    <View style={styles.thumb}>
      {option.imageUrl ? (
        <Image
          source={{ uri: option.imageUrl }}
          style={styles.thumbImage}
          contentFit="contain"
        />
      ) : (
        <Dumbbell size={16} color={theme.text(0.3)} />
      )}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  card: { gap: 12, paddingVertical: 14 },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  flex: { flex: 1, minWidth: 0 },
  picker: { gap: 6 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  optionActive: { borderColor: t.ink(0.2), backgroundColor: t.ink(0.1) },
  thumb: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  thumbImage: { width: 36, height: 36 },
}));
