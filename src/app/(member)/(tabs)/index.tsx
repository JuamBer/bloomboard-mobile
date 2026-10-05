import { Redirect } from 'expo-router';
import { useMemberProfile } from '@features/member/hooks';
import { CenteredSpinner } from '@shared/ui/Spinner';

// Someone who trains somewhere lands on their calendar; everyone else on their
// routines, which always exist. Offline with nothing cached: the routines.
export default function MemberHome() {
  const { data, isLoading } = useMemberProfile();
  if (isLoading)
    return <CenteredSpinner style={{ flex: 1, justifyContent: 'center' }} />;
  return (
    <Redirect
      href={
        data?.affiliations.some((a) => a.hasSessions)
          ? '/calendar'
          : '/routines'
      }
    />
  );
}
