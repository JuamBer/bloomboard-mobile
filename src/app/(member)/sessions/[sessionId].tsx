import { useLocalSearchParams } from 'expo-router';
import { SessionDetailScreen } from '@features/calendar/SessionDetailScreen';

export default function SessionRoute() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  return <SessionDetailScreen sessionId={sessionId} />;
}
