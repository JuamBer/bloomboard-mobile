import { useLocalSearchParams } from 'expo-router';
import { ActivateScreen } from '@features/auth/ActivateScreen';

// The emailed activation link, opened in the app. Reachable signed in or not:
// the phone may hold someone else's session.
export default function ActivateRoute() {
  const { token } = useLocalSearchParams<{ token: string }>();
  return <ActivateScreen token={token} />;
}
