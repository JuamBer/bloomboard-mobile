import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { addMonths, format, isSameMonth, isToday } from 'date-fns';
import { useRouter } from 'expo-router';
import {
  BedDouble,
  ChevronLeft,
  ChevronRight,
  Flame,
  type LucideIcon,
} from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  byDay,
  dateLocale,
  dayKey,
  dayPattern,
  gridRange,
  monthGrid,
} from '@features/calendar/lib/calendar';
import { workoutsService } from '@shared/api/services/workouts.service';
import { radius } from '@shared/theme/theme';
import { makeStyles, useTheme } from '@shared/theme/ThemeProvider';
import type { WorkoutSummary } from '@shared/types/api.types';
import { IconButton } from '@shared/ui/Button';
import { Screen, StackHeader } from '@shared/ui/layout';
import { QueryState } from '@shared/ui/states';
import { Text } from '@shared/ui/Text';
import { useTrainingSummary } from './hooks';
import { restDays } from './lib/training';
import { WorkoutCard } from './widgets/WorkoutCard';

/**
 * The member's training by the month (Perfil › Calendario): every day with a
 * workout marked, the chosen day's workouts under the grid, and on top the
 * streak — weeks in a row with at least one — and the days of rest since the
 * last. A month is loaded at a time (GET /me/workouts?from&to).
 */
export function WorkoutCalendarScreen() {
  const { t, i18n } = useTranslation(['app', 'member']);
  const styles = useStyles();
  const router = useRouter();
  const locale = dateLocale(i18n.language);
  const [month, setMonth] = useState(() => new Date());
  const [selected, setSelected] = useState(() => new Date());
  const summary = useTrainingSummary();

  const range = gridRange(month);
  const { data, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ['me', 'workouts', 'calendar', range.from, range.to],
    // A month grid holds at most 42 days: one page of 100 is all of it.
    queryFn: () => workoutsService.mine.list(1, 100, range),
    placeholderData: keepPreviousData,
  });
  const days = byDay(
    (data?.data ?? []).map((w) => ({ ...w, startsAt: w.startedAt })),
  );
  const selectedWorkouts = days.get(dayKey(selected)) ?? [];

  const shiftMonth = (by: number) => {
    const next = addMonths(month, by);
    setMonth(next);
    setSelected(isSameMonth(next, new Date()) ? new Date() : next);
  };
  const openWorkout = (workoutId: string) =>
    router.push({ pathname: '/workouts/[workoutId]', params: { workoutId } });

  const streak = summary.data?.weekStreak ?? 0;
  const rest = restDays(summary.data?.lastWorkoutAt ?? null);

  return (
    <View style={styles.root}>
      <StackHeader title={t('app:calendar.title')} />
      <Screen
        safeTop={false}
        onRefresh={() => Promise.all([refetch(), summary.refetch()])}
      >
        <View style={styles.stats}>
          <StatCard
            icon={Flame}
            label={t('app:calendar.streak')}
            value={
              summary.data ? t('app:calendar.weeks', { count: streak }) : '—'
            }
            hint={
              summary.data
                ? streak > 0
                  ? t('app:calendar.streakHint')
                  : t('app:calendar.streakNone')
                : undefined
            }
            lit={streak > 0}
          />
          <StatCard
            icon={BedDouble}
            label={t('app:calendar.rest')}
            value={
              rest == null
                ? '—'
                : rest === 0
                  ? t('app:calendar.today')
                  : t('app:calendar.days', { count: rest })
            }
            hint={
              rest == null
                ? summary.data
                  ? t('app:calendar.noWorkoutsYet')
                  : undefined
                : rest === 0
                  ? t('app:calendar.trainedToday')
                  : t('app:calendar.restHint')
            }
          />
        </View>

        <View style={styles.monthBar}>
          <IconButton
            icon={ChevronLeft}
            accessibilityLabel={t('member:calendar.previous')}
            onPress={() => shiftMonth(-1)}
          />
          <Pressable
            onPress={() => {
              setMonth(new Date());
              setSelected(new Date());
            }}
            accessibilityRole="button"
            accessibilityHint={t('member:calendar.today')}
            style={styles.monthTitle}
          >
            <Text variant="subheading" style={styles.capitalize}>
              {format(month, 'LLLL yyyy', { locale })}
            </Text>
            {isFetching && !isLoading ? (
              <Text variant="caption" muted={0.35}>
                …
              </Text>
            ) : null}
          </Pressable>
          <IconButton
            icon={ChevronRight}
            accessibilityLabel={t('member:calendar.next')}
            onPress={() => shiftMonth(1)}
          />
        </View>

        <QueryState isLoading={isLoading} isError={isError} onRetry={refetch} />

        {data && (
          <>
            <MonthGrid
              month={month}
              selected={selected}
              onSelect={setSelected}
              days={days}
              locale={locale}
            />
            <Text variant="micro" muted={0.45} uppercase>
              {format(selected, dayPattern(i18n.language), { locale })}
            </Text>
            {selectedWorkouts.length === 0 ? (
              <Text variant="bodySmall" muted={0.45}>
                {t('app:calendar.noWorkoutsDay')}
              </Text>
            ) : (
              <View style={styles.list}>
                {selectedWorkouts.map((w) => (
                  <WorkoutCard
                    key={w.id}
                    workout={w}
                    onPress={() => openWorkout(w.id)}
                  />
                ))}
              </View>
            )}
          </>
        )}
      </Screen>
    </View>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  lit = false,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  hint?: string;
  lit?: boolean;
}) {
  const styles = useStyles();
  const theme = useTheme();
  return (
    <View style={styles.stat}>
      <View style={styles.statHead}>
        <Icon
          size={15}
          color={lit ? theme.colors.warningInk : theme.text(0.45)}
        />
        <Text variant="caption" muted={0.55} numberOfLines={1}>
          {label}
        </Text>
      </View>
      <Text variant="heading" numberOfLines={1} style={styles.tabular}>
        {value}
      </Text>
      {hint ? (
        <Text variant="micro" muted={0.4} numberOfLines={2}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

/** The month as a grid of days, each day with a workout marked in the accent
 *  colour, the chosen one ringed. */
function MonthGrid({
  month,
  selected,
  onSelect,
  days,
  locale,
}: {
  month: Date;
  selected: Date;
  onSelect: (day: Date) => void;
  days: Map<string, WorkoutSummary[]>;
  locale: ReturnType<typeof dateLocale>;
}) {
  const { t } = useTranslation(['app']);
  const styles = useStyles();
  const theme = useTheme();
  const cells = monthGrid(month);
  const weekdays = cells
    .slice(0, 7)
    .map((d) => format(d, 'EEEEEE', { locale }));
  return (
    <View style={styles.grid}>
      <View style={styles.week}>
        {weekdays.map((w, i) => (
          <Text
            key={i}
            variant="micro"
            muted={0.4}
            center
            style={styles.cellWidth}
            uppercase
          >
            {w}
          </Text>
        ))}
      </View>
      {Array.from({ length: cells.length / 7 }, (_, row) => (
        <View key={row} style={styles.week}>
          {cells.slice(row * 7, row * 7 + 7).map((day) => {
            const count = (days.get(dayKey(day)) ?? []).length;
            const isSelected = dayKey(day) === dayKey(selected);
            const inMonth = isSameMonth(day, month);
            const today = isToday(day);
            return (
              <Pressable
                key={dayKey(day)}
                onPress={() => onSelect(day)}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={`${format(day, 'PPPP', { locale })}${
                  count ? ` · ${t('app:calendar.workouts', { count })}` : ''
                }`}
                style={[styles.cell, styles.cellWidth]}
              >
                <View
                  style={[
                    styles.marker,
                    count > 0 &&
                      (inMonth ? styles.markerTrained : styles.markerFaded),
                    isSelected && styles.markerSelected,
                  ]}
                >
                  <Text
                    variant="bodySmall"
                    weight={
                      count > 0 || today || isSelected ? 'bold' : 'regular'
                    }
                    color={
                      count > 0 && inMonth
                        ? theme.colors.accentContrast
                        : today
                          ? theme.colors.accentInk
                          : theme.text(inMonth ? 0.85 : 0.25)
                    }
                    style={styles.tabular}
                  >
                    {format(day, 'd')}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  root: { flex: 1, backgroundColor: t.colors.background },
  stats: { flexDirection: 'row', gap: 10 },
  stat: {
    flex: 1,
    minWidth: 0,
    gap: 2,
    padding: 14,
    borderRadius: radius['2xl'],
    borderWidth: 1,
    borderColor: t.line(0.08),
    backgroundColor: t.colors.surface,
  },
  statHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  monthBar: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  monthTitle: {
    flex: 1,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  capitalize: { textTransform: 'capitalize' },
  list: { gap: 10 },
  tabular: { fontVariant: ['tabular-nums'] },
  grid: {
    gap: 4,
    padding: 8,
    borderRadius: radius['2xl'],
    borderWidth: 1,
    borderColor: t.line(0.08),
    backgroundColor: t.colors.surface,
  },
  week: { flexDirection: 'row' },
  cellWidth: { width: `${100 / 7}%` },
  cell: { height: 46, alignItems: 'center', justifyContent: 'center' },
  marker: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  markerTrained: { backgroundColor: t.colors.accent },
  // A trained day of the next or last month, in the grid's spill-over.
  markerFaded: { backgroundColor: t.ink(0.15) },
  markerSelected: { borderColor: t.text(0.85) },
}));
