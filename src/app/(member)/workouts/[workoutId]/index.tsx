import { useLocalSearchParams } from 'expo-router';
import { WorkoutScreen } from '@features/workouts/WorkoutScreen';

export default function WorkoutRoute() {
  const { workoutId } = useLocalSearchParams<{ workoutId: string }>();
  return <WorkoutScreen key={workoutId} workoutId={workoutId} />;
}
