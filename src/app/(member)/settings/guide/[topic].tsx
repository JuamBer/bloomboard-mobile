import { useLocalSearchParams } from 'expo-router';
import { GuideTopicScreen } from '@features/settings/GuideScreen';

// Ajustes › Guía de entrenamiento › one topic.
export default function GuideTopicRoute() {
  const { topic } = useLocalSearchParams<{ topic: string }>();
  return <GuideTopicScreen topic={topic} />;
}
