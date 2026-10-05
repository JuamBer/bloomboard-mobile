import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { CalendarDays, Tv } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { WorkoutView } from '@features/workouts/WorkoutView';
import { meService } from '@shared/api/services/me.service';
import {
  currentExerciseIndex,
  flattenExercises,
  progressSummary,
} from '@shared/lib/sessionProgress';
import { radius } from '@shared/theme/theme';
import { makeStyles, useTheme } from '@shared/theme/ThemeProvider';
import type { MemberActiveSession } from '@shared/types/api.types';
import { Button } from '@shared/ui/Button';
import { Chip, ProgressBar } from '@shared/ui/controls';
import { StackHeader } from '@shared/ui/layout';
import { ElapsedTimer } from '@shared/ui/misc';
import { CenteredSpinner } from '@shared/ui/Spinner';
import { EmptyState } from '@shared/ui/states';
import { Text } from '@shared/ui/Text';
import { MEMBER_ACTIVE_SESSION_KEY, useActiveSession } from './hooks';

/**
 * The member's own session control: how long they have been in, which TV
 * shows them, and their workout for it — the same live workout the trainer
 * opens from the board, where they log what they lift and tick sets and
 * exercises, and the TV moves on with them. Both can drive it; the other's
 * changes arrive with the next poll (4 s) or the socket's ping. Here from the
 * moment the member is on the board until they leave it — their own Finish,
 * the trainer's, or the automatic one after the session.
 */
export function SessionScreen() {
  const { t } = useTranslation(['member']);
  const styles = useStyles();
  const router = useRouter();
  const { data: active, isLoading } = useActiveSession(true);
  const back = () => (router.canGoBack() ? router.back() : router.replace('/'));

  if (isLoading) {
    return (
      <View style={styles.root}>
        <StackHeader onBack={back} />
        <CenteredSpinner />
      </View>
    );
  }

  if (!active) {
    return (
      <View style={styles.root}>
        <StackHeader onBack={back} />
        <View style={styles.pad}>
          <EmptyState
            icon={CalendarDays}
            title={t('member:sessionControl.none')}
            description={t('member:sessionControl.noneHint')}
            action={
              <Button
                label={t('member:sessionControl.toCalendar')}
                variant="secondary"
                onPress={() => router.replace('/calendar')}
              />
            }
          />
        </View>
      </View>
    );
  }

  const workout = active.sessionUser.workout;

  if (!workout) {
    return (
      <View style={styles.root}>
        <SessionBar active={active} onBack={back} />
        <View style={styles.pad}>
          <TvPicker active={active} />
          <Text variant="bodySmall" muted={0.5} style={styles.note}>
            {t('member:session.noWorkout')}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <WorkoutView
        // A new workout (the trainer swapped the plan) starts its own view.
        key={workout.id}
        workoutId={workout.id}
        top={(finish) => (
          <SessionBar active={active} onBack={back} finish={finish} />
        )}
        aside={<TvPicker active={active} />}
        // Finishing ends the session: what is left is the workout itself.
        onFinished={() =>
          router.replace({
            pathname: '/workouts/[workoutId]',
            params: { workoutId: workout.id },
          })
        }
      />
    </View>
  );
}

/** Pinned on top: the service, the progress and the time since check-in —
 *  and Finish, once the workout's header has scrolled away. */
function SessionBar({
  active,
  onBack,
  finish,
}: {
  active: MemberActiveSession;
  onBack: () => void;
  finish?: ReactNode;
}) {
  const { t } = useTranslation(['member']);
  const styles = useStyles();
  const flat = flattenExercises(active.sessionUser.workout);
  const { done, total } = progressSummary(flat);
  const allDone = total > 0 && currentExerciseIndex(flat) < 0;
  return (
    <View>
      <StackHeader
        title={active.service?.name ?? t('member:sessionControl.session')}
        onBack={onBack}
        right={
          <ElapsedTimer
            since={active.sessionUser.checkedInAt ?? active.startsAt}
            variant="heading"
          />
        }
      />
      {(total > 0 || finish) && (
        <View style={styles.progress}>
          <View style={styles.live} />
          {total > 0 ? (
            <>
              <ProgressBar value={done / total} />
              <Text
                variant="caption"
                weight="bold"
                muted={0.55}
                style={styles.tabular}
              >
                {allDone
                  ? t('member:sessionControl.allDone')
                  : `${done}/${total}`}
              </Text>
            </>
          ) : (
            <View style={styles.flex} />
          )}
          {finish}
        </View>
      )}
    </View>
  );
}

/** Which TV shows the member: one of the center's, or none. The trainer's
 *  board can show someone on several; a member moving themselves never
 *  needs to. */
function TvPicker({ active }: { active: MemberActiveSession }) {
  const { t } = useTranslation(['member']);
  const styles = useStyles();
  const theme = useTheme();
  const queryClient = useQueryClient();
  const setScreen = useMutation({
    mutationFn: (screenId: string | null) =>
      meService.setScreen(active.id, screenId),
    onSuccess: (next) =>
      queryClient.setQueryData(MEMBER_ACTIVE_SESSION_KEY, next),
  });
  if (active.screens.length === 0) return null;
  const onScreen = active.screenIds[0] ?? null;
  return (
    <View style={styles.tv}>
      <View style={styles.tvHead}>
        <Tv size={14} color={theme.text(0.6)} />
        <Text variant="caption" weight="bold" muted={0.6}>
          {t('member:sessionControl.tv')}
        </Text>
      </View>
      <View style={styles.chips}>
        {[
          { id: null, name: t('member:sessionControl.noTv') },
          ...active.screens,
        ].map((screen) => (
          <Chip
            key={screen.id ?? 'none'}
            label={screen.name}
            selected={screen.id === onScreen}
            disabled={setScreen.isPending}
            onPress={() =>
              screen.id !== onScreen && setScreen.mutate(screen.id)
            }
          />
        ))}
      </View>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  root: { flex: 1, backgroundColor: t.colors.background },
  pad: { padding: 16, gap: 16 },
  note: {
    padding: 16,
    borderRadius: radius['2xl'],
    borderWidth: 1,
    borderColor: t.line(0.1),
    backgroundColor: t.colors.surface,
  },
  progress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: t.line(0.06),
    backgroundColor: t.colors.background,
  },
  live: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: t.colors.accent,
  },
  tabular: { fontVariant: ['tabular-nums'] },
  flex: { flex: 1 },
  tv: {
    gap: 10,
    padding: 14,
    marginBottom: 20,
    borderRadius: radius['2xl'],
    borderWidth: 1,
    borderColor: t.line(0.1),
    backgroundColor: t.colors.surface,
  },
  tvHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
}));
