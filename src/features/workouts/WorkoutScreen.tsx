import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@shared/theme/ThemeProvider';
import { StackHeader } from '@shared/ui/layout';
import { WorkoutView } from './WorkoutView';

/** One workout on its own screen — from the history, a pill, a session. */
export function WorkoutScreen({ workoutId }: { workoutId: string }) {
  const { t } = useTranslation(['workouts']);
  const theme = useTheme();
  const router = useRouter();
  const back = () =>
    router.canGoBack() ? router.back() : router.replace('/workouts');
  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <StackHeader backLabel={t('workouts:history.title')} onBack={back} />
      <WorkoutView workoutId={workoutId} onDeleted={back} />
    </View>
  );
}
