import { useLocalSearchParams } from 'expo-router';
import { ExerciseUsagesScreen } from '@features/exercises/ExerciseUsagesScreen';

export default function ExerciseUsagesRoute() {
  const { exerciseId } = useLocalSearchParams<{ exerciseId: string }>();
  return <ExerciseUsagesScreen exerciseId={exerciseId} />;
}
