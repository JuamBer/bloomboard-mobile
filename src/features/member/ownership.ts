import type { WorkoutTemplate } from '@shared/types/api.types';

/**
 * Whether a plan is the member's own — built by them, so theirs to edit —
 * rather than one a company prepared for them (userId is theirs too, but
 * assignedByCompanyId names the company) or a session's.
 */
export const isOwnWorkout = (
  template: Pick<WorkoutTemplate, 'userId' | 'assignedByCompanyId'>,
  memberId: string | undefined,
): boolean =>
  !!memberId && template.userId === memberId && !template.assignedByCompanyId;
