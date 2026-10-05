import type {
  BodyPart,
  Difficulty,
  Equipment,
  ExerciseMetric,
  Muscle,
  QueryExercisesParams,
  QueryMemberExercisesParams,
} from '@shared/types/api.types';

export interface ExerciseFilters {
  metric: ExerciseMetric | '';
  difficulty: Difficulty | '';
  bodyPart: BodyPart | '';
  muscle: Muscle | '';
  equipment: Equipment | '';
  /** Where the exercise comes from — one of the page's origin options ('' =
   *  any). Staff: 'master' (the app's) or 'company'; a member: 'master',
   *  'own' or `company:<id>` for each company they train with. */
  origin: string;
}

export const EMPTY_EXERCISE_FILTERS: ExerciseFilters = {
  metric: '',
  difficulty: '',
  bodyPart: '',
  muscle: '',
  equipment: '',
  origin: '',
};

export const hasActiveExerciseFilters = (f: ExerciseFilters): boolean =>
  f.metric !== '' ||
  f.difficulty !== '' ||
  f.bodyPart !== '' ||
  f.muscle !== '' ||
  f.equipment !== '' ||
  f.origin !== '';

/** Number of active filters — the badge on the "Filtros" button. */
export const countActiveExerciseFilters = (f: ExerciseFilters): number =>
  [f.metric, f.difficulty, f.bodyPart, f.muscle, f.equipment, f.origin].filter(
    (v) => v !== '',
  ).length;

// ─── URL search-param state ───────────────────────────────────────────────────
// The exercises list keeps its page / filters / sorting in the URL so the
// state survives navigating into an exercise and back (and can be shared / opened
// in a new tab). All fields are optional; defaults are omitted from the URL.

export interface ExercisesSearch {
  q?: string;
  page?: number;
  sortBy?: QueryExercisesParams['sortBy'];
  sortOrder?: 'asc' | 'desc';
  metric?: string;
  difficulty?: string;
  bodyPart?: string;
  muscle?: string;
  equipment?: string;
  /** 'master' or 'company' — validateExercisesSearch drops anything else. */
  origin?: string;
}

/**
 * `validateSearch` for the exercises route. Keeps only meaningful (non-default)
 * values so the URL stays clean — e.g. `/exercises` with no query string is the
 * pristine grid on page 1.
 */
export const validateExercisesSearch = (
  raw: Record<string, unknown>,
): ExercisesSearch => {
  const out: ExercisesSearch = {};
  if (typeof raw.q === 'string' && raw.q.trim() !== '') out.q = raw.q;
  const page = Number(raw.page);
  if (Number.isInteger(page) && page > 1) out.page = page;
  if (raw.sortBy === 'createdAt' || raw.sortBy === 'difficulty')
    out.sortBy = raw.sortBy;
  if (raw.sortOrder === 'desc') out.sortOrder = 'desc';
  for (const key of [
    'metric',
    'difficulty',
    'bodyPart',
    'muscle',
    'equipment',
  ] as const) {
    const v = raw[key];
    if (typeof v === 'string' && v !== '') out[key] = v;
  }
  if (raw.origin === 'master' || raw.origin === 'company')
    out.origin = raw.origin;
  return out;
};

/** Derives the dropdown filter state from the URL search params. */
export const exercisesSearchToFilters = (
  s: ExercisesSearch,
): ExerciseFilters => ({
  metric: (s.metric ?? '') as ExerciseFilters['metric'],
  difficulty: (s.difficulty ?? '') as ExerciseFilters['difficulty'],
  bodyPart: (s.bodyPart ?? '') as ExerciseFilters['bodyPart'],
  muscle: (s.muscle ?? '') as ExerciseFilters['muscle'],
  equipment: (s.equipment ?? '') as ExerciseFilters['equipment'],
  origin: s.origin ?? '',
});

type StructuralQuery = Pick<
  QueryExercisesParams,
  'metric' | 'difficulty' | 'bodyPart' | 'muscle' | 'equipment'
>;

/** Every filter but the origin, which each API expresses its own way. */
const structuralQuery = (f: ExerciseFilters): StructuralQuery => ({
  metric: f.metric || undefined,
  difficulty: f.difficulty || undefined,
  bodyPart: f.bodyPart || undefined,
  muscle: f.muscle || undefined,
  equipment: f.equipment || undefined,
});

/** Maps the UI filter state to the exercises API query params (staff). */
export const exerciseFiltersToQuery = (
  f: ExerciseFilters,
): StructuralQuery & Pick<QueryExercisesParams, 'isMaster'> => ({
  ...structuralQuery(f),
  isMaster:
    f.origin === 'master' ? true : f.origin === 'company' ? false : undefined,
});

/** The member's origin option for one of their companies. */
export const memberCompanyOrigin = (companyId: string) =>
  `company:${companyId}`;

/** Maps the UI filter state to the /me/exercises query params. With no origin
 *  picked the list holds everything the member can read. */
export const memberExerciseFiltersToQuery = (
  f: ExerciseFilters,
): StructuralQuery &
  Pick<QueryMemberExercisesParams, 'source' | 'companyId'> => {
  const base = structuralQuery(f);
  if (f.origin === 'master') return { ...base, source: 'catalog' };
  if (f.origin === 'own') return { ...base, source: 'own' };
  if (f.origin.startsWith('company:'))
    return { ...base, companyId: f.origin.slice('company:'.length) };
  return base;
};
