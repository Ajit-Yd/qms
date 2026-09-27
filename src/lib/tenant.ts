import type { SessionUser } from "@/src/lib/api-auth";

/**
 * Prisma filter that pins a lookup to the caller's organization.
 * The Primary Admin is exempt — they own every organization.
 * Use as `{ where: { id, ...orgScope(auth) } }`; a cross-tenant id then 404s
 * instead of leaking another organization's rows.
 */
export function orgScope(auth: SessionUser): { organizationId?: string } {
  return auth.isPrimaryAdmin ? {} : { organizationId: auth.organizationId };
}

/** The organization a write should land in; only the Primary Admin may target another. */
export function resolveTargetOrganization(
  auth: SessionUser,
  requested?: string | null
): string {
  return auth.isPrimaryAdmin && requested ? requested : auth.organizationId;
}
