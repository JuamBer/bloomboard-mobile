import { ChevronRight } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Animated, Platform, Pressable, View } from 'react-native';
import { radius } from '@shared/theme/theme';
import { makeStyles, useTheme } from '@shared/theme/ThemeProvider';
import { ElapsedTimer } from '@shared/ui/misc';
import { Text } from '@shared/ui/Text';

/** The pill's height, which the member layout reserves under the content. */
export const LIVE_PILL_HEIGHT = 58;

/**
 * "Session in progress" / "Workout under way", floating over every member
 * screen while one is on, so the member can wander off to their exercises or
 * profile and always get back in one tap. Sits just above the tab bar.
 */
export function LivePill({
  title,
  subtitle,
  since,
  onPress,
  bottom,
}: {
  title: string;
  subtitle: string;
  since: string;
  onPress: () => void;
  /** Distance from the screen's bottom edge. */
  bottom: number;
}) {
  const styles = useStyles();
  const theme = useTheme();
  // A useState, not a ref: the value is read while rendering (the styles).
  const [pulse] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(pulse, {
        toValue: 1,
        duration: 1400,
        useNativeDriver: Platform.OS !== 'web',
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const ink = theme.colors.accentContrast;
  return (
    <View pointerEvents="box-none" style={[styles.anchor, { bottom }]}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${title}. ${subtitle}`}
        style={({ pressed }) => [styles.pill, pressed && { opacity: 0.92 }]}
      >
        <View style={styles.dotBox}>
          <Animated.View
            style={[
              styles.dot,
              styles.ping,
              {
                backgroundColor: ink,
                opacity: pulse.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.6, 0],
                }),
                transform: [
                  {
                    scale: pulse.interpolate({
                      inputRange: [0, 1],
                      outputRange: [1, 2.4],
                    }),
                  },
                ],
              },
            ]}
          />
          <View style={[styles.dot, { backgroundColor: ink }]} />
        </View>
        <View style={styles.texts}>
          <Text variant="caption" weight="bold" color={ink} uppercase>
            {title}
          </Text>
          <Text
            variant="caption"
            color={ink}
            numberOfLines={1}
            style={styles.subtitle}
          >
            {subtitle}
          </Text>
        </View>
        <ElapsedTimer since={since} color={ink} />
        <ChevronRight size={17} color={ink} />
      </Pressable>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  anchor: {
    position: 'absolute',
    left: 16,
    right: 16,
    alignItems: 'center',
  },
  pill: {
    width: '100%',
    maxWidth: 448,
    height: LIVE_PILL_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    borderRadius: radius['3xl'],
    backgroundColor: t.colors.accent,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  dotBox: {
    width: 10,
    height: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: { width: 10, height: 10, borderRadius: 5 },
  ping: { position: 'absolute' },
  texts: { flex: 1, minWidth: 0 },
  subtitle: { opacity: 0.8 },
}));
