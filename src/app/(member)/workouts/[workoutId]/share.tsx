import { useLocalSearchParams } from 'expo-router';
import { ShareWorkoutScreen } from '@features/workouts/share/ShareWorkoutScreen';

export default function ShareWorkoutRoute() {
  const { workoutId } = useLocalSearchParams<{ workoutId: string }>();
  return <ShareWorkoutScreen key={workoutId} workoutId={workoutId} />;
}
