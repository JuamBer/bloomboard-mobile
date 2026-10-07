import { Image } from 'expo-image';
import {
  Building2,
  Copy,
  Dumbbell,
  Globe,
  Plus,
  UserRound,
} from 'lucide-react-native';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { EXERCISE_MEDIA_BG, exerciseMedia } from '@shared/lib/exercise-media';
import { isMasterOwned, isMemberOwned } from '@shared/lib/ownership';
import { radius } from '@shared/theme/theme';
import { makeStyles, useTheme } from '@shared/theme/ThemeProvider';
import type { Exercise } from '@shared/types/api.types';
import { Text } from '@shared/ui/Text';
import { MUSCLE_LABELS } from '../constants/exercise.labels';

/**
 * One exercise in a grid — the list and the picker: its picture, where it is
 * from (the app's and one's own as an icon, a company by name, since a
 * member needs to see whose it is), its name and first muscles.
 */
export function ExerciseCard({
  exercise,
  originLabel,
  onPress,
  action,
  busy,
  disabled,
}: {
  exercise: Exercise;
  originLabel: string;
  onPress: () => void;
  /** The picker's: what tapping does, said on the card (no hover on a phone). */
  action?: { label: string; copies: boolean };
  busy?: boolean;
  disabled?: boolean;
}) {
  const styles = useStyles();
  const theme = useTheme();
  const uri = exerciseMedia(exercise.imageUrls, 'medium');
  const master = isMasterOwned(exercise);
  const own = isMemberOwned(exercise);
  const OriginIcon = master ? Globe : own ? UserRound : Building2;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || busy}
      accessibilityRole="button"
      accessibilityLabel={`${exercise.name} · ${originLabel}${action ? ` · ${action.label}` : ''}`}
      style={({ pressed }) => [
        styles.card,
        pressed && { borderColor: theme.line(0.25) },
        disabled && !busy && { opacity: 0.6 },
      ]}
    >
      <View
        style={[styles.media, uri && { backgroundColor: EXERCISE_MEDIA_BG }]}
      >
        {uri ? (
          <Image
            source={{ uri }}
            style={styles.image}
            contentFit="cover"
            transition={150}
            recyclingKey={exercise.id}
          />
        ) : (
          <Dumbbell size={34} color={theme.text(0.12)} />
        )}
        <View style={[styles.origin, !master && !own && styles.originCompany]}>
          <OriginIcon
            size={11}
            color={!master && !own ? '#60a5fa' : theme.text(0.6)}
            strokeWidth={2.5}
          />
          {!master && !own ? (
            <Text
              variant="micro"
              color="#60a5fa"
              numberOfLines={1}
              style={styles.originText}
            >
              {originLabel}
            </Text>
          ) : null}
        </View>
        {busy && (
          <View style={styles.busy}>
            <ActivityIndicator color="#ffffff" />
          </View>
        )}
      </View>
      <View style={styles.body}>
        <Text
          variant="bodySmall"
          weight="semibold"
          numberOfLines={2}
          style={styles.name}
        >
          {exercise.name}
        </Text>
        {action ? (
          <View style={styles.action}>
            {action.copies ? (
              <Copy size={12} color={theme.colors.accentInk} />
            ) : (
              <Plus size={12} color={theme.colors.accentInk} />
            )}
            <Text variant="micro" accent numberOfLines={1}>
              {action.label}
            </Text>
          </View>
        ) : (
          <View style={styles.muscles}>
            {exercise.targetMuscles.slice(0, 2).map((m) => (
              <View key={m} style={styles.muscle}>
                <Text variant="micro" muted={0.45} numberOfLines={1}>
                  {MUSCLE_LABELS[m]}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </Pressable>
  );
}

const useStyles = makeStyles((t) => ({
  card: {
    flex: 1,
    overflow: 'hidden',
    borderRadius: radius['2xl'],
    borderWidth: 1,
    borderColor: t.line(0.1),
    backgroundColor: t.colors.surface,
  },
  media: {
    aspectRatio: 1,
    backgroundColor: t.fill(0.05),
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: { width: '100%', height: '100%' },
  origin: {
    position: 'absolute',
    top: 8,
    left: 8,
    maxWidth: '80%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: radius.md,
    backgroundColor: t.colors.surface,
    borderWidth: 1,
    borderColor: t.line(0.1),
  },
  originCompany: {
    backgroundColor: t.dark ? 'rgba(96,165,250,0.15)' : '#eff6ff',
    borderColor: 'rgba(96,165,250,0.3)',
  },
  originText: { flexShrink: 1 },
  busy: {
    ...({
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
    } as const),
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { padding: 10, gap: 6 },
  name: { minHeight: 40 },
  muscles: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  muscle: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.md,
    backgroundColor: t.fill(0.05),
  },
  action: { flexDirection: 'row', alignItems: 'center', gap: 4 },
}));
