import { Image } from 'expo-image';
import { ChevronRight, type LucideIcon } from 'lucide-react-native';
import { useEffect, useState, type ReactNode } from 'react';
import {
  Pressable,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { radius } from '@shared/theme/theme';
import { makeStyles, useTheme } from '@shared/theme/ThemeProvider';
import { Text, type TextVariant } from './Text';

// ─── Elapsed timer ───────────────────────────────────────────────────────────

/** mm:ss since `since`, h:mm:ss past an hour. */
export const formatElapsed = (ms: number) => {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
};

/** A clock counting up from a moment — a session's check-in, a workout's
 *  start. Ticks once a second. */
export function ElapsedTimer({
  since,
  variant = 'numeric',
  color,
  style,
}: {
  since: string;
  variant?: TextVariant;
  color?: string;
  style?: StyleProp<TextStyle>;
}) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <Text
      variant={variant}
      color={color}
      style={[{ fontVariant: ['tabular-nums'] }, style]}
    >
      {formatElapsed(now - Date.parse(since))}
    </Text>
  );
}

// ─── Avatar ──────────────────────────────────────────────────────────────────

export function Avatar({
  firstName,
  lastName,
  url,
  size = 64,
}: {
  firstName: string;
  lastName: string;
  url?: string | null;
  size?: number;
}) {
  const theme = useTheme();
  const initials = `${firstName[0] ?? ''}${lastName[0] ?? ''}`.toUpperCase();
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: radius['2xl'],
        borderWidth: 1,
        borderColor: theme.ink(0.2),
        backgroundColor: theme.ink(0.1),
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      {url ? (
        <Image
          source={{ uri: url }}
          style={{ width: size, height: size }}
          contentFit="cover"
          accessibilityIgnoresInvertColors
        />
      ) : (
        <Text variant="heading" accent>
          {initials}
        </Text>
      )}
    </View>
  );
}

// ─── List row ────────────────────────────────────────────────────────────────

/** A tappable row: an icon or thumbnail, a title and a quieter line, and a
 *  chevron (or whatever `right` says). */
export function ListRow({
  title,
  subtitle,
  icon: Icon,
  leading,
  right,
  onPress,
  chevron = !!onPress,
  style,
  numberOfLines = 1,
}: {
  title: string;
  subtitle?: ReactNode;
  icon?: LucideIcon;
  leading?: ReactNode;
  right?: ReactNode;
  onPress?: () => void;
  chevron?: boolean;
  style?: StyleProp<ViewStyle>;
  numberOfLines?: number;
}) {
  const styles = useStyles();
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      style={({ pressed }) => [
        styles.row,
        pressed && { backgroundColor: theme.fill(0.05) },
        style,
      ]}
    >
      {leading ??
        (Icon ? (
          <View style={styles.iconBox}>
            <Icon size={18} color={theme.text(0.5)} strokeWidth={2} />
          </View>
        ) : null)}
      <View style={styles.texts}>
        <Text variant="bodySmall" weight="bold" numberOfLines={numberOfLines}>
          {title}
        </Text>
        {typeof subtitle === 'string' ? (
          <Text variant="caption" muted={0.45} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : (
          subtitle
        )}
      </View>
      {right}
      {chevron && <ChevronRight size={17} color={theme.text(0.25)} />}
    </Pressable>
  );
}

const useStyles = makeStyles((t) => ({
  row: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: radius['2xl'],
    borderWidth: 1,
    borderColor: t.line(0.08),
    backgroundColor: t.colors.surface,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: radius.lg,
    backgroundColor: t.fill(0.05),
    alignItems: 'center',
    justifyContent: 'center',
  },
  texts: { flex: 1, minWidth: 0, gap: 2 },
}));
