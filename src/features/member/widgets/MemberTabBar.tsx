import type { Tabs } from 'expo-router';
import {
  Activity,
  CalendarDays,
  ClipboardList,
  Dumbbell,
  UserRound,
  type LucideIcon,
} from 'lucide-react-native';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { makeStyles, useTheme } from '@shared/theme/ThemeProvider';
import { Text } from '@shared/ui/Text';

type TabBarProps = Parameters<
  NonNullable<ComponentProps<typeof Tabs>['tabBar']>
>[0];

/** The bar's height above the home indicator. */
export const TAB_BAR_HEIGHT = 58;

export type MemberTab =
  'calendar' | 'routines' | 'workouts' | 'exercises' | 'profile';

const TABS: Record<MemberTab, { labelKey: string; icon: LucideIcon }> = {
  calendar: { labelKey: 'member:nav.calendar', icon: CalendarDays },
  routines: { labelKey: 'member:nav.routines', icon: ClipboardList },
  workouts: { labelKey: 'member:nav.workouts', icon: Activity },
  exercises: { labelKey: 'member:nav.exercises', icon: Dumbbell },
  profile: { labelKey: 'member:nav.profile', icon: UserRound },
};

/**
 * The member's tab bar — the web portal's phone tab bar: every destination in
 * it, no top bar, signing out at the foot of the profile. The calendar only
 * exists for someone who trains somewhere with sessions.
 */
export function MemberTabBar({
  state,
  navigation,
  insets,
  visible,
}: TabBarProps & { visible: MemberTab[] }) {
  const { t } = useTranslation(['member']);
  const styles = useStyles();
  const theme = useTheme();
  const focused = state.routes[state.index]?.name;
  return (
    <View
      style={[
        styles.bar,
        {
          paddingBottom: insets.bottom,
          height: TAB_BAR_HEIGHT + insets.bottom,
        },
      ]}
      accessibilityRole="tablist"
    >
      {visible.map((name) => {
        const route = state.routes.find((r) => r.name === name);
        if (!route) return null;
        const { labelKey, icon: Icon } = TABS[name];
        const active = focused === name;
        const ink = active ? theme.colors.accentInk : theme.text(0.4);
        return (
          <Pressable
            key={name}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={t(labelKey)}
            onPress={() => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });
              if (!active && !event.defaultPrevented) {
                navigation.navigate(route.name);
              }
            }}
            style={styles.tab}
          >
            <Icon size={21} color={ink} strokeWidth={active ? 2.4 : 2} />
            <Text
              variant="micro"
              color={ink}
              numberOfLines={1}
              style={styles.label}
            >
              {t(labelKey)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  bar: {
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: t.colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: t.line(0.08),
  },
  tab: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingTop: 2,
  },
  label: { maxWidth: '100%', paddingHorizontal: 2 },
}));
