import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { useRouter } from 'expo-router';
import { CalendarDays, Clock, MapPin, Users } from 'lucide-react-native';
import { useMemo, type ReactNode } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  EditorSourceProvider,
  templateEditorSource,
  workoutEditorSource,
  workoutQueryKey,
} from '@features/editor/lib/editor-source';
import { EditorBody } from '@features/editor/widgets/EditorBody';
import { useActiveSession } from '@features/member/hooks';
import { meService } from '@shared/api/services/me.service';
import { workoutsService } from '@shared/api/services/workouts.service';
import { radius } from '@shared/theme/theme';
import { makeStyles, useTheme } from '@shared/theme/ThemeProvider';
import { Badge } from '@shared/ui/controls';
import { Screen, StackHeader } from '@shared/ui/layout';
import { ListRow } from '@shared/ui/misc';
import { QueryState } from '@shared/ui/states';
import { Text } from '@shared/ui/Text';
import { dateLocale, dayPattern } from './lib/calendar';

const NO_COLLAPSED = new Set<string>();

/**
 * A session in the member's calendar, about the member alone: when, where,
 * with which professionals (names only, never a way into anyone's profile),
 * their status if not "Reservada", and their workout — what they trained, or
 * the plan for it. The other people booked are not listed: a member has no
 * business reading who else is coming. While it runs, it leads to the control.
 */
export function SessionDetailScreen({ sessionId }: { sessionId: string }) {
  const { t, i18n } = useTranslation([
    'member',
    'session',
    'templates',
    'workouts',
  ]);
  const styles = useStyles();
  const theme = useTheme();
  const router = useRouter();
  const locale = dateLocale(i18n.language);
  const { data: active } = useActiveSession();
  const {
    data: session,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['me', 'session', sessionId],
    queryFn: () => meService.getSession(sessionId),
  });
  const workoutId = session?.sessionUser.workout?.id;
  const templateId = session?.sessionUser.workoutTemplate?.id;
  // The trained workout's full tree (the session detail carries a reference).
  const { data: workout } = useQuery({
    queryKey: workoutId ? workoutQueryKey(workoutId) : ['workout', 'none'],
    queryFn: () => workoutsService.getById(workoutId!),
    enabled: !!workoutId,
  });
  const workoutSource = useMemo(
    () => (workoutId ? workoutEditorSource(workoutId) : null),
    [workoutId],
  );
  const templateSource = useMemo(
    () => (templateId ? templateEditorSource(templateId) : null),
    [templateId],
  );

  const isRunning = !!session && active?.id === session.id;
  const status = session?.sessionUser.status;

  const fact = (icon: ReactNode, text: string) => (
    <View style={styles.fact}>
      {icon}
      <Text variant="bodySmall" muted={0.65} style={styles.flex}>
        {text}
      </Text>
    </View>
  );

  return (
    <View style={styles.root}>
      <StackHeader
        title={session?.service?.name ?? session?.center.company.commercialName}
      />
      <Screen safeTop={false} onRefresh={refetch}>
        {!session ? (
          <QueryState
            isLoading={isLoading}
            isError={isError}
            onRetry={refetch}
          />
        ) : (
          <>
            <View style={styles.head}>
              <View style={styles.titleRow}>
                {session.service?.color ? (
                  <View
                    style={[
                      styles.colorDot,
                      { backgroundColor: session.service.color },
                    ]}
                  />
                ) : null}
                <Text variant="title" style={styles.flex}>
                  {session.service?.name ??
                    session.center.company.commercialName}
                </Text>
              </View>
              {fact(
                <CalendarDays size={15} color={theme.text(0.4)} />,
                format(new Date(session.startsAt), dayPattern(i18n.language), {
                  locale,
                }),
              )}
              {fact(
                <Clock size={15} color={theme.text(0.4)} />,
                `${format(new Date(session.startsAt), 'HH:mm')} – ${format(new Date(session.endsAt), 'HH:mm')}`,
              )}
              {fact(
                <MapPin size={15} color={theme.text(0.4)} />,
                session.center.kind === 'VIRTUAL'
                  ? `${session.center.company.commercialName} · ${t('member:session.online')}`
                  : session.center.name,
              )}
              {session.professionals.length > 0 &&
                fact(
                  <Users size={15} color={theme.text(0.4)} />,
                  session.professionals
                    .map((p) => `${p.firstName} ${p.lastName}`)
                    .join(', '),
                )}
              {status && status !== 'PRESENT' && (
                <Badge label={t(`member:calendar.status.${status}`)} />
              )}
            </View>

            {isRunning && (
              <ListRow
                title={t('member:sessionControl.open')}
                leading={<View style={styles.liveDot} />}
                onPress={() => router.push('/session')}
                style={styles.liveRow}
              />
            )}

            <Text variant="subheading">
              {workoutId
                ? t('member:session.trained')
                : t('member:session.workout')}
            </Text>
            {workoutId ? (
              <>
                <ListRow
                  title={t('member:session.openWorkout')}
                  onPress={() =>
                    router.push({
                      pathname: '/workouts/[workoutId]',
                      params: { workoutId },
                    })
                  }
                />
                {workout && workoutSource && (
                  // What they trained, read here; logged on its own screen.
                  <EditorSourceProvider value={workoutSource}>
                    <EditorBody
                      doc={workout}
                      isReadOnly
                      collapsedExercises={NO_COLLAPSED}
                      emptyReadOnly={t('workouts:detail.empty')}
                    />
                  </EditorSourceProvider>
                )}
              </>
            ) : session.sessionUser.workoutTemplate && templateSource ? (
              <EditorSourceProvider value={templateSource}>
                <EditorBody
                  doc={session.sessionUser.workoutTemplate}
                  isReadOnly
                  collapsedExercises={NO_COLLAPSED}
                  emptyReadOnly={t('templates:detail.noBlocksYet')}
                />
              </EditorSourceProvider>
            ) : (
              <Text variant="bodySmall" muted={0.5} style={styles.note}>
                {t('member:session.noWorkout')}
              </Text>
            )}
          </>
        )}
      </Screen>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  root: { flex: 1, backgroundColor: t.colors.background },
  head: {
    gap: 8,
    padding: 16,
    borderRadius: radius['2xl'],
    borderWidth: 1,
    borderColor: t.line(0.06),
    backgroundColor: t.fill(0.03),
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  colorDot: { width: 12, height: 12, borderRadius: 6 },
  fact: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  flex: { flex: 1, minWidth: 0 },
  liveDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: t.colors.accent,
    marginHorizontal: 4,
  },
  liveRow: { borderColor: t.ink(0.4), backgroundColor: t.ink(0.1) },
  note: {
    padding: 16,
    borderRadius: radius['2xl'],
    borderWidth: 1,
    borderColor: t.line(0.1),
    backgroundColor: t.colors.surface,
  },
}));
