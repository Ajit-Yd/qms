import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { requireSessionUser } from "@/src/lib/api-auth";
import { getSubordinateIds } from "@/src/lib/permissions";
import { orgScope } from "@/src/lib/tenant";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireSessionUser();
  if ("response" in auth) return auth.response;

  const { id } = await params;
  // Everything below is pinned to the caller's tenant. Without the scope an
  // authenticated user in one organization could read any profile platform-wide.
  const profile = await prisma.profile.findFirst({
    where: { id, ...orgScope(auth) },
    select: { id: true, name: true, email: true, roleTitle: true, reportsTo: true, active: true, canManageCommittees: true, createdAt: true },
  });
  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  const manager = profile.reportsTo
    ? await prisma.profile.findFirst({
        where: { id: profile.reportsTo, ...orgScope(auth) },
        select: { id: true, name: true, roleTitle: true },
      })
    : null;

  const directReports = await prisma.profile.findMany({
    where: { reportsTo: id, ...orgScope(auth) },
    select: { id: true, name: true, roleTitle: true, email: true },
    orderBy: { name: "asc" },
  });

  const memberships = await prisma.committeeMembership.findMany({
    where: { profileId: id, committee: orgScope(auth) },
    include: { committee: { select: { id: true, name: true } } },
  });

  // auth.profiles is already organization-scoped, so no extra query is needed.
  const totalSubordinates = getSubordinateIds(id, auth.profiles).length;

  return NextResponse.json({
    profile,
    manager,
    directReports,
    totalSubordinates,
    memberships: memberships.map((m) => ({
      id: m.id,
      roleInCommittee: m.roleInCommittee,
      committeeId: m.committee.id,
      committeeName: m.committee.name,
    })),
  });
}