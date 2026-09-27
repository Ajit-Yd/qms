import { prisma } from "@/src/lib/prisma";
import type { Profile } from "@/src/lib/permissions";

/** Pass null to load every organization (Primary Admin only). */
export async function loadProfiles(organizationId?: string | null): Promise<Profile[]> {
  return prisma.profile.findMany(organizationId ? { where: { organizationId } } : undefined);
}