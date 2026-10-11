import type {
  HevyDecision,
  HevyExerciseOption,
  HevyPreview,
  HevyPreviewExercise,
} from '@shared/types/api.types';

/** What the member has chosen for one Hevy exercise, while reviewing. */
export type DraftDecision =
  | { action: 'match'; exercise: HevyExerciseOption | null }
  | { action: 'create'; name: string }
  | { action: 'skip' };

export type Drafts = Record<string, DraftDecision>;

/** The member looks at these first: proposed, or with nothing proposed. */
export const needsReview = (e: HevyPreviewExercise) =>
  e.status === 'suggested' || e.status === 'none';

/**
 * Where the review starts. Recognised and suggested exercises are matched to
 * what was proposed; one with no match becomes the member's own while their
 * plan has room (the most used first), and is left out after that — every
 * choice visible and changeable before anything is written.
 */
export function initialDrafts(preview: HevyPreview): Drafts {
  const { limit, used } = preview.customExercises;
  let room = limit === null ? Infinity : Math.max(0, limit - used);
  const drafts: Drafts = {};
  const bySets = [...preview.exercises].sort((a, b) => b.sets - a.sets);
  for (const e of bySets) {
    if (e.exercise) {
      drafts[e.key] = { action: 'match', exercise: e.exercise };
    } else if (room > 0) {
      drafts[e.key] = { action: 'create', name: e.title };
      room--;
    } else {
      drafts[e.key] = { action: 'skip' };
    }
  }
  return drafts;
}

const nameKey = (name: string) =>
  name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

/** How many exercises the drafts create — two with one name are one. */
export function creating(drafts: Drafts) {
  return new Set(
    Object.values(drafts)
      .filter((d) => d.action === 'create')
      .map((d) => nameKey((d as { name: string }).name)),
  ).size;
}

export function quota(preview: HevyPreview, drafts: Drafts) {
  const { limit, used } = preview.customExercises;
  const count = creating(drafts);
  if (limit === null) return { count, limit, left: null, over: 0 };
  const left = Math.max(0, limit - used);
  return { count, limit, left: left - count, over: Math.max(0, count - left) };
}

/** A draft the import can't take yet: a match with no exercise, a nameless create. */
export const incomplete = (d: DraftDecision) =>
  (d.action === 'match' && !d.exercise) ||
  (d.action === 'create' && !d.name.trim());

export function toDecisions(
  preview: HevyPreview,
  drafts: Drafts,
): HevyDecision[] {
  return preview.exercises.map((e): HevyDecision => {
    const d = drafts[e.key] ?? { action: 'skip' };
    if (d.action === 'match' && d.exercise) {
      return { title: e.title, action: 'match', exerciseId: d.exercise.id };
    }
    if (d.action === 'create') {
      return { title: e.title, action: 'create', name: d.name.trim() };
    }
    return { title: e.title, action: 'skip' };
  });
}
