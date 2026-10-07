import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import {
  Check,
  ChevronDown,
  Dumbbell,
  SkipForward,
  type LucideIcon,
} from 'lucide-react-native';
import { Platform, Pressable, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { EXERCISE_MEDIA_BG, exerciseMedia } from '@shared/lib/exercise-media';
import { fonts, radius } from '@shared/theme/theme';
import { makeStyles, useTheme } from '@shared/theme/ThemeProvider';
import type { EditorExercise } from '@shared/types/api.types';
import { Text } from '@shared/ui/Text';
import { useIsWorkout } from '../lib/editor-source';
import { statusOfAll, useTemplateSession } from '../lib/template-session';

// ─── Live-session controls ───────────────────────────────────────────────────
// Both render nothing outside a live workout, so the cards can place them
// unconditionally and stay plain editors everywhere else. They act on
// `entryIds`: one exercise, or every member of a super-set (completed as one).

/**
 * The tick at the head of an exercise or super-set — the one way to mark it.
 * A done one goes back to pending, which is how a mis-tap is undone.
 */
export function SessionStatusToggle({ entryIds }: { entryIds: string[] }) {
  const { t } = useTranslation(['templates']);
  const theme = useTheme();
  const session = useTemplateSession();
  if (!session) return null;
  const status = statusOfAll(session, entryIds);
  const resolved = status !== 'PENDING';
  const isCurrent =
    !!session.currentEntryId && entryIds.includes(session.currentEntryId);
  const label = resolved
    ? t('templates:session.unmark')
    : t('templates:session.complete');
  return (
    <Pressable
      onPress={() => {
        if (!resolved && Platform.OS !== 'web') {
          void Haptics.notificationAsync(
            Haptics.NotificationFeedbackType.Success,
          );
        }
        session.mark(entryIds[0], resolved ? 'PENDING' : 'COMPLETED');
      }}
      hitSlop={8}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: resolved }}
      accessibilityLabel={label}
      style={{
        width: 30,
        height: 30,
        borderRadius: radius.lg,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
        borderColor:
          status === 'COMPLETED'
            ? 'rgba(255,255,255,0.9)'
            : status === 'SKIPPED'
              ? 'rgba(245,158,11,0.5)'
              : isCurrent
                ? theme.colors.accentInk
                : theme.line(0.2),
        backgroundColor:
          status === 'COMPLETED'
            ? theme.colors.success
            : status === 'SKIPPED'
              ? 'rgba(245,158,11,0.15)'
              : 'transparent',
      }}
    >
      {status === 'COMPLETED' ? (
        <Check size={16} color="#ffffff" strokeWidth={3} />
      ) : status === 'SKIPPED' ? (
        <SkipForward size={14} color={theme.colors.warningInk} />
      ) : null}
    </Pressable>
  );
}

/** Opens or folds one exercise — or a whole super-set. Only a live workout
 *  has it: there every exercise but the current one starts folded. */
export function SessionCollapseToggle({
  entryIds,
  collapsed,
}: {
  entryIds: string[];
  collapsed: boolean;
}) {
  const { t } = useTranslation(['templates']);
  const theme = useTheme();
  const session = useTemplateSession();
  if (!session) return null;
  return (
    <Pressable
      onPress={() => session.toggleCollapsed(entryIds)}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityState={{ expanded: !collapsed }}
      accessibilityLabel={
        collapsed
          ? t('templates:detail.showSets')
          : t('templates:detail.hideSets')
      }
      style={{
        width: 32,
        height: 32,
        alignItems: 'center',
        justifyContent: 'center',
        transform: [{ rotate: collapsed ? '-90deg' : '0deg' }],
      }}
    >
      <ChevronDown size={18} color={theme.text(0.4)} />
    </Pressable>
  );
}

// ─── Exercise identity ───────────────────────────────────────────────────────

export function ExerciseThumb({
  exercise,
  size = 44,
  dimmed,
}: {
  exercise: Pick<EditorExercise['exercise'], 'imageUrls' | 'name'>;
  size?: number;
  dimmed?: boolean;
}) {
  const styles = useStyles();
  const theme = useTheme();
  const uri = exerciseMedia(exercise.imageUrls, 'thumb');
  // A picture is never dimmed (see EXERCISE_MEDIA_BG); only the icon of an
  // exercise without one fades with a resolved row.
  return (
    <View
      style={[
        styles.thumb,
        { width: size, height: size },
        uri
          ? { backgroundColor: EXERCISE_MEDIA_BG }
          : { opacity: dimmed ? 0.5 : 1 },
      ]}
    >
      {uri ? (
        <Image
          source={{ uri }}
          style={{ width: size, height: size }}
          contentFit="cover"
          accessibilityLabel={exercise.name}
          transition={150}
        />
      ) : (
        <Dumbbell size={size * 0.42} color={theme.text(0.2)} />
      )}
    </View>
  );
}

/**
 * An exercise's name, which opens its page (how to do it, and the member's
 * stats on it). A per-plan name shows, with the original under it.
 */
export function ExerciseNameLink({
  exercise,
  customName,
  dimmed,
}: {
  exercise: EditorExercise['exercise'];
  customName?: string | null;
  dimmed?: boolean;
}) {
  const { t } = useTranslation(['templates']);
  const router = useRouter();
  const name = customName || exercise.name;
  return (
    <Pressable
      onPress={() =>
        router.push({
          pathname: '/exercises/[exerciseId]',
          params: { exerciseId: exercise.id },
        })
      }
      accessibilityRole="link"
      accessibilityHint={t('templates:exerciseNameLink.clickToOpen')}
      style={{ opacity: dimmed ? 0.5 : 1 }}
      hitSlop={4}
    >
      <Text variant="bodySmall" weight="bold" numberOfLines={2}>
        {name}
      </Text>
      {customName ? (
        <Text variant="caption" muted={0.45} numberOfLines={1}>
          {t('templates:exerciseNameLink.originalName', {
            name: exercise.name,
          })}
        </Text>
      ) : null}
    </Pressable>
  );
}

/**
 * An exercise's notes: one line by default, growing with the text, with no
 * label and no box — the placeholder says what it is. In a workout the note is
 * about how it went, not instructions. Locked, it is just text.
 */
export function EntryNotesField({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const styles = useStyles();
  const theme = useTheme();
  const isWorkout = useIsWorkout();
  const { t } = useTranslation(['templates', 'workouts']);
  if (disabled) {
    return (
      <Text variant="bodySmall" muted={0.6}>
        {value}
      </Text>
    );
  }
  return (
    <TextInput
      value={value}
      onChangeText={onChange}
      multiline
      placeholder={
        isWorkout
          ? t('workouts:exerciseNotes')
          : t('templates:exerciseEntryCard.notesPlaceholder')
      }
      placeholderTextColor={theme.text(0.3)}
      accessibilityLabel={t('templates:exerciseEntryCard.notes')}
      style={styles.notes}
    />
  );
}

// ─── Add zones ───────────────────────────────────────────────────────────────

/** A dashed "add" target: big with a hint where a section starts empty,
 *  slim under a list. */
export function AddZone({
  icon: Icon,
  label,
  description,
  onPress,
  large,
}: {
  icon: LucideIcon;
  label: string;
  description?: string;
  onPress: () => void;
  large?: boolean;
}) {
  const styles = useStyles();
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.zone,
        large && styles.zoneLarge,
        pressed && { backgroundColor: theme.fill(0.05) },
      ]}
    >
      <Icon size={large ? 22 : 16} color={theme.text(0.4)} />
      <View style={large ? styles.zoneTexts : undefined}>
        <Text variant="bodySmall" weight="bold" muted={0.6} center={large}>
          {label}
        </Text>
        {description ? (
          <Text variant="caption" muted={0.4} center={large}>
            {description}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const useStyles = makeStyles((t) => ({
  thumb: {
    borderRadius: radius.xl,
    backgroundColor: t.fill(0.05),
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  notes: {
    fontFamily: fonts.sans,
    fontSize: 14,
    lineHeight: 19,
    color: t.colors.foreground,
    paddingHorizontal: 2,
    paddingVertical: 4,
  },
  zone: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 12,
    borderRadius: radius['2xl'],
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: t.line(0.15),
  },
  zoneLarge: {
    flexDirection: 'column',
    paddingVertical: 22,
    gap: 6,
  },
  zoneTexts: { alignItems: 'center', gap: 2 },
}));
