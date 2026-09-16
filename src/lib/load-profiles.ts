import { prisma } from "@/src/lib/prisma";
import type { Profile } from "@/src/lib/permissions";

export async function loadProfiles(): Promise<Profile[]> {
  return prisma.profile.findMany();
}