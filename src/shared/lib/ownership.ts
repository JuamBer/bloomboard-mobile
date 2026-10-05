/**
 * Ownership helpers. Master (global, read-only) vs company-owned is derived
 * from the owner columns across exercises, templates and routines — there is
 * no `isMaster` field. A member's own content has no company either, so the
 * catalog is "no company AND no member".
 */
export interface CompanyScoped {
  companyId: string | null;
  userId?: string | null;
}

export const isMasterOwned = (entity: CompanyScoped): boolean =>
  entity.companyId === null && !entity.userId;

/** A member's own (exercise): theirs, not a company's nor the catalog's. */
export const isMemberOwned = (entity: CompanyScoped): boolean =>
  !!entity.userId;
