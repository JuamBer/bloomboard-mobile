import { Check, type LucideIcon } from 'lucide-react-native';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { radius } from '@shared/theme/theme';
import { makeStyles, useTheme } from '@shared/theme/ThemeProvider';
import { Sheet } from './Sheet';
import { Text } from './Text';

export interface SheetAction {
  key: string;
  label: string;
  icon?: LucideIcon;
  onPress: () => void;
  destructive?: boolean;
  disabled?: boolean;
  /** A spinner in place of the icon (a copy in flight). */
  pending?: boolean;
  /** Starts a new group: a rule above it. */
  separated?: boolean;
  /** Marks the current choice (a picker built on this). */
  selected?: boolean;
  /** A second, quieter line under the label. */
  hint?: string;
  /** Leaves the sheet open after the press (it closes by default). */
  keepOpen?: boolean;
}

/**
 * The ⋯ menu, as the web app draws it on a phone: full-width rows in a bottom
 * sheet, titled with what the menu is about (shared/components/ActionMenu).
 */
export function ActionSheet({
  open,
  onClose,
  title,
  subtitle,
  actions,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  actions: (SheetAction | false | null | undefined)[];
}) {
  const styles = useStyles();
  const theme = useTheme();
  const items = actions.filter(Boolean) as SheetAction[];
  return (
    <Sheet open={open} onClose={onClose} title={title} subtitle={subtitle}>
      <View style={styles.list}>
        {items.map((action) => {
          const ink = action.destructive
            ? theme.colors.dangerInk
            : theme.colors.foreground;
          const Icon = action.icon;
          return (
            <View key={action.key}>
              {action.separated && <View style={styles.rule} />}
              <Pressable
                disabled={action.disabled || action.pending}
                accessibilityRole="button"
                accessibilityState={{
                  disabled: !!action.disabled,
                  selected: !!action.selected,
                }}
                onPress={() => {
                  if (!action.keepOpen) onClose();
                  action.onPress();
                }}
                style={({ pressed }) => [
                  styles.row,
                  action.selected && { backgroundColor: theme.fill(0.06) },
                  pressed && { backgroundColor: theme.fill(0.08) },
                  action.disabled && { opacity: 0.4 },
                ]}
              >
                {action.pending ? (
                  <ActivityIndicator
                    size="small"
                    color={theme.colors.accentInk}
                  />
                ) : Icon ? (
                  <Icon
                    size={19}
                    color={action.destructive ? ink : theme.text(0.6)}
                    strokeWidth={2}
                  />
                ) : null}
                <View style={styles.texts}>
                  <Text variant="body" weight="medium" color={ink}>
                    {action.label}
                  </Text>
                  {action.hint ? (
                    <Text variant="caption" muted={0.5}>
                      {action.hint}
                    </Text>
                  ) : null}
                </View>
                {action.selected && (
                  <Check size={17} color={theme.text(0.6)} strokeWidth={2.5} />
                )}
              </Pressable>
            </View>
          );
        })}
      </View>
    </Sheet>
  );
}

const useStyles = makeStyles((t) => ({
  list: { marginHorizontal: -8 },
  row: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius['2xl'],
  },
  texts: { flex: 1 },
  rule: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: t.line(0.1),
    marginVertical: 6,
    marginHorizontal: 12,
  },
}));
