import { Check, ChevronRight } from 'lucide-react-native';
import { Children, Fragment, type ComponentType, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { alpha, radius } from '@shared/theme/theme';
import { makeStyles, useTheme } from '@shared/theme/ThemeProvider';
import { Sheet } from '@shared/ui/Sheet';
import { Text } from '@shared/ui/Text';

/** Anything drawn like a lucide icon: the brand marks too. */
export type RowIcon = ComponentType<{
  size?: number;
  color?: string;
  strokeWidth?: number;
}>;

/**
 * A titled block of settings rows on one card, the rows split by hairlines —
 * Ajustes and its pages.
 */
export function SettingsGroup({
  title,
  footer,
  children,
}: {
  title?: string;
  /** A quieter line under the card. */
  footer?: string;
  children: ReactNode;
}) {
  const styles = useStyles();
  const rows = Children.toArray(children).filter(Boolean);
  return (
    <View style={styles.group}>
      {title ? (
        <Text variant="micro" muted={0.45} uppercase style={styles.title}>
          {title}
        </Text>
      ) : null}
      <View style={styles.card}>
        {rows.map((row, i) => (
          <Fragment key={i}>
            {i > 0 && <View style={styles.rule} />}
            {row}
          </Fragment>
        ))}
      </View>
      {footer ? (
        <Text variant="caption" muted={0.45} style={styles.title}>
          {footer}
        </Text>
      ) : null}
    </View>
  );
}

/** One setting: an icon, what it is, its current value, and where it goes. */
export function SettingsRow({
  icon: Icon,
  title,
  subtitle,
  value,
  onPress,
  chevron = !!onPress,
  destructive = false,
  right,
}: {
  icon?: RowIcon;
  title: string;
  subtitle?: string;
  /** The current choice, at the right ("Métrico"). */
  value?: string;
  onPress?: () => void;
  chevron?: boolean;
  destructive?: boolean;
  right?: ReactNode;
}) {
  const styles = useStyles();
  const theme = useTheme();
  const ink = destructive ? theme.colors.dangerInk : theme.text(0.6);
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={value ? `${title}, ${value}` : title}
      style={({ pressed }) => [
        styles.row,
        pressed && { backgroundColor: theme.fill(0.05) },
      ]}
    >
      {Icon ? (
        <View style={[styles.iconBox, destructive && styles.iconDanger]}>
          <Icon size={18} color={ink} strokeWidth={2} />
        </View>
      ) : null}
      <View style={styles.texts}>
        <Text
          variant="bodySmall"
          weight="semibold"
          color={destructive ? theme.colors.dangerInk : undefined}
          numberOfLines={1}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text variant="caption" muted={0.45} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {value ? (
        <Text
          variant="bodySmall"
          muted={0.45}
          numberOfLines={1}
          style={styles.value}
        >
          {value}
        </Text>
      ) : null}
      {right}
      {chevron && <ChevronRight size={17} color={theme.text(0.25)} />}
    </Pressable>
  );
}

export interface SettingsOption<V extends string> {
  value: V;
  label: string;
  hint?: string;
}

/** A setting's choices, from the bottom: a tap picks one and closes. */
export function OptionSheet<V extends string>({
  open,
  onClose,
  title,
  value,
  options,
  onChange,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  value: V;
  options: SettingsOption<V>[];
  onChange: (value: V) => void;
}) {
  const styles = useStyles();
  const theme = useTheme();
  return (
    <Sheet open={open} onClose={onClose} title={title}>
      <View style={styles.card}>
        {options.map((option, i) => {
          const selected = option.value === value;
          return (
            <Fragment key={option.value}>
              {i > 0 && <View style={[styles.rule, styles.ruleFlush]} />}
              <Pressable
                onPress={() => {
                  if (!selected) onChange(option.value);
                  onClose();
                }}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
                style={({ pressed }) => [
                  styles.row,
                  pressed && { backgroundColor: theme.fill(0.05) },
                ]}
              >
                <View style={styles.texts}>
                  <Text
                    variant="bodySmall"
                    weight={selected ? 'bold' : 'semibold'}
                  >
                    {option.label}
                  </Text>
                  {option.hint ? (
                    <Text variant="caption" muted={0.45}>
                      {option.hint}
                    </Text>
                  ) : null}
                </View>
                {selected && (
                  <Check
                    size={18}
                    color={theme.colors.accentInk}
                    strokeWidth={2.6}
                  />
                )}
              </Pressable>
            </Fragment>
          );
        })}
      </View>
    </Sheet>
  );
}

const useStyles = makeStyles((t) => ({
  group: { gap: 8 },
  title: { paddingHorizontal: 4 },
  card: {
    borderRadius: radius['2xl'],
    borderWidth: 1,
    borderColor: t.line(0.08),
    backgroundColor: t.colors.surface,
    overflow: 'hidden',
  },
  rule: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 60,
    backgroundColor: t.line(0.12),
  },
  ruleFlush: { marginLeft: 0 },
  row: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: radius.lg,
    backgroundColor: t.fill(0.05),
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconDanger: { backgroundColor: alpha(t.colors.danger, 0.1) },
  texts: { flex: 1, minWidth: 0, gap: 2 },
  value: { maxWidth: '45%' },
}));
