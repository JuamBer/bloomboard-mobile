import * as Haptics from 'expo-haptics';
import { Check, CircleHelp, Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { Platform, Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { RecordTrophy } from '@features/workouts/widgets/RecordList';
import { alpha, radius } from '@shared/theme/theme';
import { makeStyles, useTheme } from '@shared/theme/ThemeProvider';
import type { RecordDetail, SetType } from '@shared/types/api.types';
import { Sheet } from '@shared/ui/Sheet';
import { Text } from '@shared/ui/Text';
import {
  SET_TYPE_HUES,
  SET_TYPE_INITIALS,
  SET_TYPE_KEYS,
} from '../constants/template.labels';
import { FIELD_HEIGHT } from './MetricCell';

/** A set type's badge colours: its hue at 10% / 20%, or the neutral steps. */
export function useSetTypeColors() {
  const theme = useTheme();
  return (setType: SetType) => {
    const hue = SET_TYPE_HUES[setType];
    return hue
      ? { ink: hue, bg: alpha(hue, 0.1), border: alpha(hue, 0.25) }
      : { ink: theme.text(0.6), bg: theme.fill(0.05), border: theme.line(0.1) };
  };
}

/** The tint of a row of this type — or green once the set is ticked. */
export function useRowTint() {
  return (setType: SetType, done: boolean) => {
    if (done) return 'rgba(16,185,129,0.09)';
    const hue = SET_TYPE_HUES[setType];
    return hue ? alpha(hue, 0.06) : undefined;
  };
}

/** The letter badge — W, N, D… — which opens the types in a bottom sheet,
 *  with a trophy on it when the set beat a personal record. Each type has a
 *  "?" that unfolds what it means (app:guide.setTypes, the guide's page
 *  too), and the sheet ends in Delete — the way to remove a set when the
 *  table scrolls sideways and swiping it does not (SwipeRow). */
export function SetTypeBadge({
  setType,
  onChange,
  isReadOnly,
  records = [],
  onDelete,
}: {
  setType: SetType;
  onChange: (setType: SetType) => void;
  isReadOnly?: boolean;
  records?: RecordDetail[];
  /** Removes the set; absent where it cannot go (the last one). */
  onDelete?: () => void;
}) {
  const { t } = useTranslation(['templates', 'app', 'common']);
  const styles = useStyles();
  const theme = useTheme();
  const colorsOf = useSetTypeColors();
  const [open, setOpen] = useState(false);
  const [explained, setExplained] = useState<SetType | null>(null);
  const c = colorsOf(setType);
  const label = t(`templates:setTypes.${SET_TYPE_KEYS[setType]}`);
  const types = Object.keys(SET_TYPE_KEYS) as SetType[];
  return (
    <View>
      <Pressable
        onPress={() => setOpen(true)}
        disabled={isReadOnly}
        accessibilityRole={isReadOnly ? 'text' : 'button'}
        accessibilityLabel={label}
        hitSlop={6}
        style={[
          isReadOnly ? styles.badgeSmall : styles.badge,
          { backgroundColor: c.bg, borderColor: c.border },
        ]}
      >
        <Text variant="caption" weight="bold" color={c.ink}>
          {SET_TYPE_INITIALS[setType]}
        </Text>
      </Pressable>
      <RecordTrophy records={records} />
      {!isReadOnly && (
        <Sheet
          open={open}
          onClose={() => setOpen(false)}
          title={t('templates:setsEditor.setType')}
        >
          <View style={styles.typeList}>
            {types.map((type) => {
              const tc = colorsOf(type);
              const selected = type === setType;
              const label = t(`templates:setTypes.${SET_TYPE_KEYS[type]}`);
              return (
                <View key={type}>
                  <View style={styles.typeLine}>
                    <Pressable
                      onPress={() => {
                        if (!selected) onChange(type);
                        setOpen(false);
                      }}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      style={({ pressed }) => [
                        styles.typeRow,
                        selected && { backgroundColor: theme.fill(0.06) },
                        pressed && { backgroundColor: theme.fill(0.08) },
                      ]}
                    >
                      <View
                        style={[
                          styles.badge,
                          { backgroundColor: tc.bg, borderColor: tc.border },
                        ]}
                      >
                        <Text variant="caption" weight="bold" color={tc.ink}>
                          {SET_TYPE_INITIALS[type]}
                        </Text>
                      </View>
                      <Text variant="body" weight="medium" style={styles.flex}>
                        {label}
                      </Text>
                      {selected && <Check size={17} color={theme.text(0.6)} />}
                    </Pressable>
                    <Pressable
                      onPress={() =>
                        setExplained((e) => (e === type ? null : type))
                      }
                      hitSlop={6}
                      accessibilityRole="button"
                      accessibilityState={{ expanded: explained === type }}
                      accessibilityLabel={t('app:guide.setTypes.whatIs', {
                        type: label,
                      })}
                      style={styles.help}
                    >
                      <CircleHelp
                        size={19}
                        color={
                          explained === type
                            ? theme.colors.accentInk
                            : theme.text(0.4)
                        }
                      />
                    </Pressable>
                  </View>
                  {explained === type && (
                    <Text variant="bodySmall" muted={0.65} style={styles.why}>
                      {t(`app:guide.setTypes.items.${type}.body`)}
                    </Text>
                  )}
                </View>
              );
            })}
            {onDelete && (
              <Pressable
                onPress={() => {
                  setOpen(false);
                  onDelete();
                }}
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.typeRow,
                  styles.deleteRow,
                  pressed && { backgroundColor: theme.fill(0.08) },
                ]}
              >
                <View style={styles.badge}>
                  <Trash2 size={17} color={theme.colors.dangerInk} />
                </View>
                <Text
                  variant="body"
                  weight="medium"
                  color={theme.colors.dangerInk}
                  style={styles.flex}
                >
                  {t('app:editor.deleteSet')}
                </Text>
              </Pressable>
            )}
          </View>
        </Sheet>
      )}
    </View>
  );
}

/** A workout set's tick: done or not, saved at once. Green with a white check
 *  when done — the web's DONE_TICK. As tall as the value fields beside it. */
export function SetTick({
  done,
  isReadOnly,
  onToggle,
  size = FIELD_HEIGHT,
}: {
  done: boolean;
  isReadOnly?: boolean;
  onToggle: () => void;
  size?: number;
}) {
  const { t } = useTranslation(['workouts']);
  const theme = useTheme();
  if (isReadOnly && !done) return <View style={{ width: size }} />;
  const label = done
    ? t('workouts:set.markUndone')
    : t('workouts:set.markDone');
  return (
    <Pressable
      onPress={() => {
        if (!done && Platform.OS !== 'web') {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        onToggle();
      }}
      disabled={isReadOnly}
      hitSlop={6}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: done }}
      accessibilityLabel={label}
      style={{
        width: size,
        height: size,
        borderRadius: radius.lg,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
        borderColor: done ? 'rgba(255,255,255,0.9)' : theme.line(0.2),
        backgroundColor: done ? theme.colors.success : 'transparent',
      }}
    >
      {done && <Check size={size * 0.5} color="#ffffff" strokeWidth={3} />}
    </Pressable>
  );
}

const useStyles = makeStyles(() => ({
  // As tall as the value fields beside it (a read-only row has none).
  badge: {
    width: FIELD_HEIGHT,
    height: FIELD_HEIGHT,
    borderRadius: radius.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeSmall: {
    width: 26,
    height: 26,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeList: { marginHorizontal: -8 },
  typeLine: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  typeRow: {
    flex: 1,
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    borderRadius: radius['2xl'],
  },
  help: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  why: { paddingLeft: 64, paddingRight: 16, paddingBottom: 10 },
  deleteRow: { marginTop: 6, borderColor: 'transparent' },
  flex: { flex: 1 },
}));
