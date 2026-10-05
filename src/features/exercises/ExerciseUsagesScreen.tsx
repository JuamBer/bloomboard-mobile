import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { LayoutTemplate } from 'lucide-react-native';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { meService } from '@shared/api/services/me.service';
import { useTheme } from '@shared/theme/ThemeProvider';
import { Badge } from '@shared/ui/controls';
import { PageHeader, Screen, StackHeader } from '@shared/ui/layout';
import { ListRow } from '@shared/ui/misc';
import { EmptyState, QueryState } from '@shared/ui/states';

/**
 * Where the member uses an exercise: their own workouts and the ones their
 * companies prepared for them — never a company's catalog. A tap opens the
 * plan scrolled to the exercise. Not paginated: it is bounded by the
 * member's own workouts.
 */
export function ExerciseUsagesScreen({ exerciseId }: { exerciseId: string }) {
  const { t } = useTranslation(['member', 'exercises']);
  const theme = useTheme();
  const router = useRouter();
  const { data: exercise } = useQuery({
    queryKey: ['me', 'exercise', exerciseId],
    queryFn: () => meService.getExercise(exerciseId),
  });
  const {
    data: usages,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['me', 'exercise', exerciseId, 'usages'],
    queryFn: () => meService.getExerciseUsages(exerciseId),
  });
  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <StackHeader
        title={exercise?.name}
        backLabel={t('member:exercise.back')}
      />
      <Screen safeTop={false} onRefresh={refetch}>
        <PageHeader
          title={t('member:exercise.usages')}
          subtitle={exercise?.name}
        />
        <QueryState isLoading={isLoading} isError={isError} onRetry={refetch} />
        {usages &&
          (usages.length === 0 ? (
            <EmptyState
              icon={LayoutTemplate}
              description={t('member:exercise.noUsages')}
            />
          ) : (
            usages.map((use) => (
              <ListRow
                key={use.id}
                icon={LayoutTemplate}
                title={use.name}
                subtitle={[
                  use.routine?.name,
                  use.assignedBy
                    ? t('member:routines.byCompany', {
                        company: use.assignedBy.commercialName,
                      })
                    : t('member:routines.own'),
                ]
                  .filter(Boolean)
                  .join(' · ')}
                right={
                  use.entryIds.length > 1 ? (
                    <Badge label={`×${use.entryIds.length}`} />
                  ) : undefined
                }
                onPress={() =>
                  router.push({
                    pathname: '/templates/[templateId]',
                    params: { templateId: use.id, entry: use.entryIds[0] },
                  })
                }
              />
            ))
          ))}
      </Screen>
    </View>
  );
}
