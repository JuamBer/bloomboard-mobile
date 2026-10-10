import { createContext, useContext } from 'react';
import type { ExerciseProgressStatus } from '@shared/types/api.types';

/**
 * A workout being trained live (WorkoutView while it is under way): the
 * exercise that is up is marked, and one with no sets to tick has a tick of
 * its own. What the exercise cards read, derived by the screen from the
 * workout's own statuses. Null outside a live workout — a template, a finished
 * workout — where the cards are plain editors.
 *
 * The web's copy also folds every exercise but the current one on a wide
 * screen (`toggleCollapsed`, `compact`); on a phone nothing folds — what the
 * web calls compact is all this app has (specs/member-app.md).
 */
export interface TemplateSessionView {
  statusOf: (entryId: string) => ExerciseProgressStatus;
  /** The first PENDING exercise in training order; null once all are done. */
  currentEntryId: string | null;
  mark: (entryId: string, status: ExerciseProgressStatus) => void;
}

export const TemplateSessionContext = createContext<TemplateSessionView | null>(
  null,
);

/** Null outside a live workout: the editor is then a plain editor. */
export const useTemplateSession = () => useContext(TemplateSessionContext);

/** One status for several entries — a super-set's members: pending while any
 *  is, done when all are, skipped when resolved with any skip. */
export const statusOfAll = (
  session: TemplateSessionView,
  entryIds: string[],
): ExerciseProgressStatus => {
  const statuses = entryIds.map(session.statusOf);
  if (statuses.includes('PENDING')) return 'PENDING';
  return statuses.every((s) => s === 'COMPLETED') ? 'COMPLETED' : 'SKIPPED';
};

/** Whether the entries are resolved (done or skipped) in the live workout;
 *  false outside one. The cards dim what is behind the trainee. */
export const useSessionResolved = (entryIds: string[]) => {
  const session = useTemplateSession();
  return !!session && statusOfAll(session, entryIds) !== 'PENDING';
};
