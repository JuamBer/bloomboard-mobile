import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { addMonths, format, isSameMonth, isToday } from 'date-fns';
import { useRouter } from 'expo-router';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  List,
  MapPin,
} from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useActiveSession } from '@features/member/hooks';
import { meService } from '@shared/api/services/me.service';
import { radius } from '@shared/theme/theme';
import { makeStyles, useTheme } from '@shared/theme/ThemeProvider';
import type { MemberSession } from '@shared/types/api.types';
import { IconButton } from '@shared/ui/Button';
import { Segmented } from '@shared/ui/controls';
import { PageHeader, Screen } from '@shared/ui/layout';
import { EmptyState, QueryState } from '@shared/ui/states';
import { Text } from '@shared/ui/Text';
import {
  byDay,
  dateLocale,
  dayKey,
  dayPattern,
  gridRange,
  isRunning,
  monthGrid,
} from './lib/calendar';

type View_ = 'agenda' | 'month';

/**
 * The member's sessions, across every company they train with — read-only:
 * no filters, nothing to create, no one else's data (no bookings count, no
 * birthdays). Loaded a month at a time (GET /me/sessions?from&to).
 *
 * Two views: the agenda (the month's sessions, day by day) and the month grid
 * (a dot per session; a day's sessions under it). The web's 3-day and week
 * time grids don't read at a phone's width. A running session leads to the
 * session control.
 */
export function CalendarScreen() {
  const { t, i18n } = useTranslation(['member', 'session', 'common']);
  const styles = useStyles();
  const theme = useTheme();
  const router = useRouter();
  const locale = dateLocale(i18n.language);
  const [view, setView] = useState<View_>('agenda');
  const [month, setMonth] = useState(() => new Date());
  const [selected, setSelected] = useState(() => new Date());
  const { data: active } = useActiveSession();

  const range = gridRange(month);
  const {
    data: sessions,
    isLoading,
    isError,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['me', 'sessions', range.from, range.to],
    queryFn: () => meService.getSessions(range.from, range.to),
    placeholderData: keepPreviousData,
  });
  const days = byDay(sessions ?? []);
  // The session under way opens its control (the pill leads there too).
  const openSession = (sessionId: string) =>
    sessionId === active?.id
      ? router.push('/session')
      : router.push({
          pathname: '/sessions/[sessionId]',
          params: { sessionId },
        });

  const shiftMonth = (by: number) => {
    const next = addMonths(month, by);
    setMonth(next);
    setSelected(isSameMonth(next, new Date()) ? new Date() : next);
  };

  const sessionRow = (s: MemberSession) => {
    const running = isRunning(s);
    const status = s.sessionUsers[0]?.status;
    return (
      <Pressable
        key={s.id}
        onPress={() => openSession(s.id)}
        accessibilityRole="button"
        style={({ pressed }) => [
          styles.session,
          running && styles.running,
          pressed && { opacity: 0.8 },
        ]}
      >
        <View
          style={[
            styles.serviceBar,
            { backgroundColor: s.service?.color ?? theme.colors.accentInk },
          ]}
        />
        <View style={styles.time}>
          <Text variant="bodySmall" weight="bold" style={styles.tabular}>
            {format(new Date(s.startsAt), 'HH:mm')}
          </Text>
          <Text variant="caption" muted={0.45} style={styles.tabular}>
            {format(new Date(s.endsAt), 'HH:mm')}
          </Text>
        </View>
        <View style={styles.flex}>
          <Text variant="bodySmall" weight="bold" numberOfLines={1}>
            {s.service?.name ?? s.center.company.commercialName}
          </Text>
          <View style={styles.inline}>
            <MapPin size={11} color={theme.text(0.4)} />
            <Text
              variant="caption"
              muted={0.5}
              numberOfLines={1}
              style={styles.flex}
            >
              {s.center.kind === 'VIRTUAL'
                ? `${s.center.company.commercialName} · ${t('member:session.online')}`
                : s.center.name}
            </Text>
          </View>
          {s.professionals.length > 0 && (
            <Text variant="caption" muted={0.45} numberOfLines={1}>
              {t('member:calendar.with', {
                names: s.professionals
                  .map((p) => p.alias || p.firstName)
                  .join(', '),
              })}
            </Text>
          )}
        </View>
        {running ? (
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text variant="micro" accent>
              {t('member:sessionControl.live')}
            </Text>
          </View>
        ) : status && status !== 'PRESENT' ? (
          <Text variant="micro" muted={0.5}>
            {t(`member:calendar.status.${status}`)}
          </Text>
        ) : null}
      </Pressable>
    );
  };

  const monthTitle = format(month, 'LLLL yyyy', { locale });

  return (
    <Screen onRefresh={refetch}>
      <PageHeader
        title={t('member:calendar.title')}
        subtitle={t('member:calendar.subtitle')}
      />

      <Segmented<View_>
        value={view}
        onChange={setView}
        options={[
          { value: 'agenda', label: t('session:calendar.agenda'), icon: List },
          {
            value: 'month',
            label: t('session:calendar.month'),
            icon: CalendarDays,
          },
        ]}
      />

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
            {monthTitle}
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

      {sessions && view === 'month' && (
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
          {(days.get(dayKey(selected)) ?? []).length === 0 ? (
            <Text variant="bodySmall" muted={0.45}>
              {t('member:calendar.noSessionsDay')}
            </Text>
          ) : (
            <View style={styles.list}>
              {(days.get(dayKey(selected)) ?? []).map(sessionRow)}
            </View>
          )}
        </>
      )}

      {sessions && view === 'agenda' && (
        <>
          {[...days.entries()].filter(
            ([key]) => key.slice(0, 7) === format(month, 'yyyy-MM'),
          ).length === 0 ? (
            <EmptyState
              icon={CalendarDays}
              description={t('member:calendar.empty')}
            />
          ) : (
            [...days.entries()]
              .filter(([key]) => key.slice(0, 7) === format(month, 'yyyy-MM'))
              .map(([key, list]) => {
                const day = new Date(`${key}T12:00:00`);
                return (
                  <View key={key} style={styles.day}>
                    <View style={styles.inline}>
                      <Text
                        variant="micro"
                        uppercase
                        color={
                          isToday(day)
                            ? theme.colors.accentInk
                            : theme.text(0.45)
                        }
                      >
                        {format(day, dayPattern(i18n.language), { locale })}
                      </Text>
                      {isToday(day) && (
                        <Text variant="micro" accent>
                          · {t('member:calendar.today')}
                        </Text>
                      )}
                    </View>
                    <View style={styles.list}>{list.map(sessionRow)}</View>
                  </View>
                );
              })
          )}
        </>
      )}
    </Screen>
  );
}

/** The month as a grid of days, a dot per session in its service's colour. */
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
  days: Map<string, MemberSession[]>;
  locale: ReturnType<typeof dateLocale>;
}) {
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
            const list = days.get(dayKey(day)) ?? [];
            const isSelected = dayKey(day) === dayKey(selected);
            const inMonth = isSameMonth(day, month);
            return (
              <Pressable
                key={dayKey(day)}
                onPress={() => onSelect(day)}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={`${format(day, 'PPPP', { locale })}${list.length ? ` · ${list.length}` : ''}`}
                style={[
                  styles.cell,
                  styles.cellWidth,
                  isSelected && styles.cellSelected,
                ]}
              >
                <Text
                  variant="bodySmall"
                  weight={isToday(day) || isSelected ? 'bold' : 'regular'}
                  color={
                    isSelected
                      ? theme.colors.accentContrast
                      : isToday(day)
                        ? theme.colors.accentInk
                        : theme.text(inMonth ? 0.85 : 0.25)
                  }
                >
                  {format(day, 'd')}
                </Text>
                <View style={styles.dots}>
                  {list.slice(0, 3).map((s) => (
                    <View
                      key={s.id}
                      style={[
                        styles.dot,
                        {
                          backgroundColor: isSelected
                            ? theme.colors.accentContrast
                            : (s.service?.color ?? theme.colors.accentInk),
                        },
                      ]}
                    />
                  ))}
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
  monthBar: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  monthTitle: {
    flex: 1,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  capitalize: { textTransform: 'capitalize' },
  day: { gap: 8 },
  list: { gap: 8 },
  session: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingRight: 12,
    paddingVertical: 10,
    borderRadius: radius['2xl'],
    borderWidth: 1,
    borderColor: t.line(0.08),
    backgroundColor: t.colors.surface,
    overflow: 'hidden',
  },
  running: { borderColor: t.ink(0.4) },
  serviceBar: {
    width: 4,
    alignSelf: 'stretch',
    borderRadius: 2,
    marginLeft: 6,
  },
  time: { width: 44, alignItems: 'center' },
  tabular: { fontVariant: ['tabular-nums'] },
  flex: { flex: 1, minWidth: 0 },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
    backgroundColor: t.ink(0.1),
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: t.colors.accentInk,
  },
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
  cell: {
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    borderRadius: radius.xl,
  },
  cellSelected: { backgroundColor: t.colors.accent },
  dots: { flexDirection: 'row', gap: 3, height: 5 },
  dot: { width: 5, height: 5, borderRadius: 2.5 },
}));
