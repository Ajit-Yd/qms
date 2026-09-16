import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { requireSessionUser } from "@/src/lib/api-auth";
import { getSubordinateIds, type Profile } from "@/src/lib/permissions";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireSessionUser();
  if ("response" in auth) return auth.response;

  const { id } = await params;
  const profile = await prisma.profile.findUnique({
    where: { id },
    select: { id: true, name: true, email: true, roleTitle: true, reportsTo: true, active: true, canManageCommittees: true, createdAt: true },
  });
  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  const manager = profile.reportsTo
    ? await prisma.profile.findUnique({
        where: { id: profile.reportsTo },
        select: { id: true, name: true, roleTitle: true },
      })
    : null;

  const directReports = await prisma.profile.findMany({
    where: { reportsTo: id },
    select: { id: true, name: true, roleTitle: true, email: true },
    orderBy: { name: "asc" },
  });

  const memberships = await prisma.committeeMembership.findMany({
    where: { profileId: id },
    include: { committee: { select: { id: true, name: true } } },
  });

  const allProfiles = await prisma.profile.findMany({
    select: { id: true, name: true, roleTitle: true, reportsTo: true, active: true, canManageCommittees: true, email: true },
  });
  const totalSubordinates = getSubordinateIds(id, allProfiles as Profile[]).length;

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