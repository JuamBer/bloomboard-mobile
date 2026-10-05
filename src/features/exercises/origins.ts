import { useTranslation } from 'react-i18next';
import { useMemberProfile } from '@features/member/hooks';
import type { Exercise } from '@shared/types/api.types';
import { memberCompanyOrigin } from './constants/exercise.filters';

export interface ExerciseOriginOption {
  value: string;
  label: string;
}

/**
 * Where an exercise can come from, as a member names it: "App" for the
 * platform catalog, their own, and each company they train with by its name —
 * a member tells companies apart (the web's useExerciseOrigins, member side).
 */
export function useExerciseOrigins() {
  const { t } = useTranslation(['exercises']);
  const { data: profile } = useMemberProfile();
  const companies = new Map(
    (profile?.affiliations ?? []).map((a) => [
      a.company.id,
      a.company.commercialName,
    ]),
  );
  const app = t('exercises:origin.app');
  const own = t('exercises:origin.own');
  const companyFallback = t('exercises:origin.company');

  const options: ExerciseOriginOption[] = [
    { value: 'master', label: app },
    { value: 'own', label: own },
    ...[...companies].map(([id, name]) => ({
      value: memberCompanyOrigin(id),
      label: name,
    })),
  ];

  const labelOf = (exercise: Pick<Exercise, 'companyId' | 'userId'>) => {
    if (exercise.userId) return own;
    if (!exercise.companyId) return app;
    return companies.get(exercise.companyId) ?? companyFallback;
  };

  return { options, labelOf, companies };
}

/** A failed delete refused because the exercise is still in a workout (409
 *  EXERCISE_IN_USE). The API client already explains it in a toast; the
 *  caller's job is to show where. */
export const isExerciseInUse = (error: unknown): boolean =>
  (error as { response?: { data?: { code?: string } } })?.response?.data
    ?.code === 'EXERCISE_IN_USE';
