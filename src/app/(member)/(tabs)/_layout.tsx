import { Tabs } from 'expo-router';
import { useHasSessions } from '@features/member/hooks';
import {
  MemberTabBar,
  type MemberTab,
} from '@features/member/widgets/MemberTabBar';

/**
 * The member's destinations. The calendar exists only for someone who trains
 * somewhere with sessions; someone who trains on their own (at a regular gym)
 * has their routines, workouts and exercises.
 */
export default function MemberTabsLayout() {
  const hasSessions = useHasSessions();
  const visible: MemberTab[] = [
    ...(hasSessions ? (['calendar'] as const) : []),
    'routines',
    'workouts',
    'exercises',
    'profile',
  ];
  return (
    <Tabs
      screenOptions={{ headerShown: false, animation: 'fade' }}
      tabBar={(props) => <MemberTabBar {...props} visible={visible} />}
    >
      <Tabs.Screen name="index" options={{ href: null }} />
      <Tabs.Screen name="calendar" />
      <Tabs.Screen name="routines" />
      <Tabs.Screen name="workouts" />
      <Tabs.Screen name="exercises" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}
