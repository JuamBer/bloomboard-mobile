import { Tabs } from 'expo-router';
import { useHasSessions } from '@features/member/hooks';
import {
  MemberTabBar,
  type MemberTab,
} from '@features/member/widgets/MemberTabBar';

/**
 * The member's destinations. The calendar exists only for someone who trains
 * somewhere with sessions; everyone has their routines (where training
 * starts) and their profile (their workouts, exercises, measurements and
 * workout calendar, and Ajustes).
 */
export default function MemberTabsLayout() {
  const hasSessions = useHasSessions();
  const visible: MemberTab[] = [
    ...(hasSessions ? (['calendar'] as const) : []),
    'routines',
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
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}
