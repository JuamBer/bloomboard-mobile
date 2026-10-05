import { Check, type LucideIcon } from 'lucide-react-native';
import type { ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { radius } from '@shared/theme/theme';
import { makeStyles, useTheme } from '@shared/theme/ThemeProvider';
import { Text } from './Text';

// ─── Segmented control ────────────────────────────────────────────────────────

export interface SegmentOption<V extends string> {
  value: V;
  label: string;
  icon?: LucideIcon;
}

/** One of a few — theme, language, a calendar view. */
export function Segmented<V extends string>({
  value,
  options,
  onChange,
  style,
}: {
  value: V;
  options: SegmentOption<V>[];
  onChange: (value: V) => void;
  style?: StyleProp<ViewStyle>;
}) {
  const styles = useStyles();
  const theme = useTheme();
  return (
    <View style={[styles.segmented, style]} accessibilityRole="tablist">
      {options.map((opt) => {
        const selected = opt.value === value;
        const Icon = opt.icon;
        return (
          <Pressable
            key={opt.value}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => !selected && onChange(opt.value)}
            style={[styles.segment, selected && styles.segmentSelected]}
          >
            {Icon && (
              <Icon
                size={15}
                strokeWidth={2.25}
                color={selected ? theme.colors.accentInk : theme.text(0.5)}
              />
            )}
            <Text
              variant="label"
              weight="bold"
              color={selected ? theme.colors.accentInk : theme.text(0.55)}
              numberOfLines={1}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ─── Checkbox ────────────────────────────────────────────────────────────────

export function Checkbox({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: ReactNode;
  disabled?: boolean;
}) {
  const styles = useStyles();
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked, disabled }}
      disabled={disabled}
      onPress={() => onChange(!checked)}
      hitSlop={6}
      style={styles.checkRow}
    >
      <View
        style={[
          styles.checkBox,
          checked && {
            backgroundColor: theme.colors.accent,
            borderColor: theme.colors.accent,
          },
        ]}
      >
        {checked && (
          <Check
            size={13}
            strokeWidth={3.5}
            color={theme.colors.accentContrast}
          />
        )}
      </View>
      {typeof label === 'string' ? (
        <Text variant="bodySmall" muted={0.75} style={styles.flex}>
          {label}
        </Text>
      ) : (
        label
      )}
    </Pressable>
  );
}

// ─── Chip ────────────────────────────────────────────────────────────────────

/** A selectable pill — filters, a TV, a plan. Accent-tinted when on. */
export function Chip({
  label,
  selected,
  onPress,
  icon: Icon,
  disabled,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: LucideIcon;
  disabled?: boolean;
}) {
  const styles = useStyles();
  const theme = useTheme();
  const ink = selected ? theme.colors.accentInk : theme.text(0.6);
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || !onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected, disabled: !!disabled }}
      style={({ pressed }) => [
        styles.chip,
        selected && styles.chipSelected,
        pressed && !selected && { backgroundColor: theme.fill(0.06) },
        disabled && { opacity: 0.5 },
      ]}
    >
      {Icon && <Icon size={14} color={ink} strokeWidth={2.25} />}
      <Text variant="label" weight="bold" color={ink} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

/** A small static label — a status, a count, an origin. */
export function Badge({
  label,
  tone = 'neutral',
  icon: Icon,
}: {
  label: string;
  tone?: 'neutral' | 'accent' | 'success' | 'warning' | 'danger';
  icon?: LucideIcon;
}) {
  const theme = useTheme();
  const tones = {
    neutral: {
      bg: theme.fill(0.05),
      border: theme.line(0.1),
      ink: theme.text(0.6),
    },
    accent: {
      bg: theme.ink(0.1),
      border: theme.ink(0.2),
      ink: theme.colors.accentInk,
    },
    success: {
      bg: 'rgba(16,185,129,0.1)',
      border: 'rgba(16,185,129,0.25)',
      ink: theme.colors.successInk,
    },
    warning: {
      bg: 'rgba(245,158,11,0.12)',
      border: 'rgba(245,158,11,0.3)',
      ink: theme.colors.warningInk,
    },
    danger: {
      bg: 'rgba(239,68,68,0.1)',
      border: 'rgba(239,68,68,0.2)',
      ink: theme.colors.dangerInk,
    },
  }[tone];
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        alignSelf: 'flex-start',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: radius.full,
        borderWidth: 1,
        borderColor: tones.border,
        backgroundColor: tones.bg,
      }}
    >
      {Icon && <Icon size={12} color={tones.ink} strokeWidth={2.5} />}
      <Text variant="caption" weight="bold" color={tones.ink} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

// ─── Progress bar ────────────────────────────────────────────────────────────

export function ProgressBar({
  value,
  color,
  height = 6,
}: {
  /** 0–1. */
  value: number;
  color?: string;
  height?: number;
}) {
  const theme = useTheme();
  return (
    <View
      style={{
        height,
        borderRadius: height / 2,
        backgroundColor: theme.fill(0.1),
        overflow: 'hidden',
        flex: 1,
      }}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(value * 100) }}
    >
      <View
        style={{
          width: `${Math.max(0, Math.min(1, value)) * 100}%`,
          height: '100%',
          borderRadius: height / 2,
          backgroundColor: color ?? theme.colors.accent,
        }}
      />
    </View>
  );
}

// ─── Card / section ──────────────────────────────────────────────────────────

/** A surface card — the web's `rounded-2xl border border-foreground/10
 *  bg-surface p-5` that every member page section uses. */
export function Card({
  children,
  style,
  padded = true,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
}) {
  const styles = useStyles();
  return (
    <View style={[styles.card, padded && styles.cardPadded, style]}>
      {children}
    </View>
  );
}

/** A titled section inside a card. */
export function Section({
  title,
  subtitle,
  aside,
  children,
  style,
}: {
  title: string;
  subtitle?: string;
  aside?: ReactNode;
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const styles = useStyles();
  return (
    <Card style={[styles.section, style]}>
      <View style={styles.sectionHeader}>
        <View style={styles.flex}>
          <Text variant="subheading">{title}</Text>
          {subtitle ? (
            <Text variant="caption" muted={0.5}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        {aside}
      </View>
      {children}
    </Card>
  );
}

export function Divider({ style }: { style?: StyleProp<ViewStyle> }) {
  const theme = useTheme();
  return (
    <View
      style={[
        { height: StyleSheet.hairlineWidth, backgroundColor: theme.line(0.1) },
        style,
      ]}
    />
  );
}

const useStyles = makeStyles((t) => ({
  segmented: {
    flexDirection: 'row',
    gap: 4,
    padding: 4,
    borderRadius: radius['2xl'],
    backgroundColor: t.fill(0.05),
    borderWidth: 1,
    borderColor: t.line(0.08),
  },
  segment: {
    flex: 1,
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 8,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  segmentSelected: {
    backgroundColor: t.colors.surface,
    borderColor: t.ink(0.2),
  },
  checkRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  checkBox: {
    width: 20,
    height: 20,
    marginTop: 1,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: t.line(0.3),
    alignItems: 'center',
    justifyContent: 'center',
  },
  chip: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: t.line(0.1),
  },
  chipSelected: { backgroundColor: t.ink(0.1), borderColor: t.ink(0.2) },
  card: {
    borderRadius: radius['2xl'],
    borderWidth: 1,
    borderColor: t.line(0.1),
    backgroundColor: t.colors.surface,
  },
  cardPadded: { padding: 18 },
  section: { gap: 14 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  flex: { flex: 1 },
}));
