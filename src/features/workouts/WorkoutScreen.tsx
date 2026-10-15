import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@shared/theme/ThemeProvider';
import { StackHeader } from '@shared/ui/layout';
import { workoutQuery } from './hooks';
import { WorkoutView } from './WorkoutView';

/** One workout on its own screen — from the profile, the calendar, a pill,
 *  a session. Its name is the bar's title; the details are under it. */
export function WorkoutScreen({ workoutId }: { workoutId: string }) {
  const { t } = useTranslation(['common']);
  const theme = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  // The view's own query (same key): only the name is read here.
  const { data: workout } = useQuery(workoutQuery(queryClient, workoutId));
  const back = () =>
    router.canGoBack() ? router.back() : router.replace('/profile');
  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <StackHeader
        title={workout?.name}
        backLabel={t('common:back')}
        onBack={back}
      />
      <WorkoutView workoutId={workoutId} onDeleted={back} />
    </View>
  );
}
