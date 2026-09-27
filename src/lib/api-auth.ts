import { getServerSession } from "next-auth/next";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/src/lib/prisma";
import { loadProfiles } from "@/src/lib/load-profiles";
import type { Profile } from "@/src/lib/permissions";

export type SessionUser = {
  userId: string;
  /** Scoped to the viewer's organization, except for the Primary Admin who sees all. */
  profiles: Profile[];
  organizationId: string;
  isPrimaryAdmin: boolean;
};

export async function requireSessionUser(): Promise<SessionUser | { response: NextResponse }> {
  const session = await getServerSession(authOptions);
  const userId = session?.user && "id" in session.user ? String(session.user.id) : "";
  if (!userId) {
    return { response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  const viewer = await prisma.profile.findUnique({
    where: { id: userId },
    select: { organizationId: true, systemRole: true },
  });
  if (!viewer) {
    return { response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  const isPrimaryAdmin = viewer.systemRole === "primary_admin";
  const profiles = await loadProfiles(isPrimaryAdmin ? null : viewer.organizationId);
  return { userId, profiles, organizationId: viewer.organizationId, isPrimaryAdmin };
}
