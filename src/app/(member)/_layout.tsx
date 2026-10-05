import { Stack, usePathname, useRouter, useSegments } from 'expo-router';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useActiveSession } from '@features/member/hooks';
import { useSessionSocket } from '@features/member/session-socket';
import { LIVE_PILL_HEIGHT, LivePill } from '@features/member/widgets/LivePill';
import { TAB_BAR_HEIGHT } from '@features/member/widgets/MemberTabBar';
import { useActiveWorkout } from '@features/workouts/hooks';
import { WorkoutFinishFlow } from '@features/workouts/widgets/WorkoutFinishFlow';
import { useTheme } from '@shared/theme/ThemeProvider';
import { BottomInsetContext } from '@shared/ui/layout';

/**
 * The member's area. A stack over the tabs, so a routine's plan, a workout,
 * an exercise or the session control open on top of the tab they came from.
 *
 * While a session runs (or a workout of their own is under way) a pill floats
 * over every screen but that one, one tap from it. What follows finishing a
 * workout (its summary, then the wrap-up) is mounted here, not on the screen
 * that finished it: finishing a session's workout ends the session screen.
 */
export default function MemberLayout() {
  const { t } = useTranslation(['member', 'workouts']);
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const segments = useSegments() as string[];
  const inTabs = segments.includes('(tabs)');

  const { data: activeSession } = useActiveSession();
  const { data: activeWorkout } = useActiveWorkout();
  useSessionSocket(!!activeSession);

  const showSessionPill = !!activeSession && !pathname.startsWith('/session');
  // A workout started on one's own (a session's has the session pill), on
  // every screen but its own.
  const ownWorkout =
    activeWorkout && !activeWorkout.sessionUserId ? activeWorkout : null;
  const showWorkoutPill =
    !showSessionPill &&
    !!ownWorkout &&
    !pathname.startsWith(`/workouts/${ownWorkout.id}`);
  const pillShown = showSessionPill || showWorkoutPill;

  // Above the tab bar on a tab, above the home indicator elsewhere.
  const pillBottom = inTabs
    ? TAB_BAR_HEIGHT + insets.bottom + 10
    : insets.bottom + 12;

  return (
    <BottomInsetContext.Provider
      value={{
        extra: pillShown ? LIVE_PILL_HEIGHT + 16 : 0,
        safeAreaHandled: inTabs,
      }}
    >
      <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: theme.colors.background },
          }}
        />
        {showSessionPill && activeSession && (
          <LivePill
            title={t('member:sessionControl.pill')}
            subtitle={[activeSession.service?.name, activeSession.center.name]
              .filter(Boolean)
              .join(' · ')}
            since={
              activeSession.sessionUser.checkedInAt ?? activeSession.startsAt
            }
            onPress={() => router.push('/session')}
            bottom={pillBottom}
          />
        )}
        {showWorkoutPill && ownWorkout && (
          <LivePill
            title={t('workouts:pill')}
            subtitle={ownWorkout.name}
            since={ownWorkout.startedAt}
            onPress={() =>
              router.push({
                pathname: '/workouts/[workoutId]',
                params: { workoutId: ownWorkout.id },
              })
            }
            bottom={pillBottom}
          />
        )}
        <WorkoutFinishFlow />
      </View>
    </BottomInsetContext.Provider>
  );
}
