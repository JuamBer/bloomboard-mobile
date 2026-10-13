import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@shared/theme/ThemeProvider';
import { StackHeader } from '@shared/ui/layout';
import { WorkoutView } from './WorkoutView';

/** One workout on its own screen — from the profile, the calendar, a pill,
 *  a session. */
export function WorkoutScreen({ workoutId }: { workoutId: string }) {
  const { t } = useTranslation(['common']);
  const theme = useTheme();
  const router = useRouter();
  const back = () =>
    router.canGoBack() ? router.back() : router.replace('/profile');
  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <StackHeader backLabel={t('common:back')} onBack={back} />
      <WorkoutView workoutId={workoutId} onDeleted={back} />
    </View>
  );
}
