import { useLocalSearchParams } from 'expo-router';
import { ExerciseScreen } from '@features/exercises/ExerciseScreen';

export default function ExerciseRoute() {
  const { exerciseId } = useLocalSearchParams<{ exerciseId: string }>();
  return <ExerciseScreen key={exerciseId} exerciseId={exerciseId} />;
}
