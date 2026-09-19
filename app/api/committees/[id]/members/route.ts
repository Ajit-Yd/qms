import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { requireSessionUser } from "@/src/lib/api-auth";
import { canManageCommittees, getSubordinateIds } from "@/src/lib/permissions";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireSessionUser();
  if ("response" in auth) return auth.response;
  if (!canManageCommittees(auth.userId, auth.profiles)) {
    return NextResponse.json({ error: "You do not have permission to manage committee members" }, { status: 403 });
  }
  const { id: committeeId } = await params;
  const committee = await prisma.committee.findUnique({ where: { id: committeeId } });
  if (!committee) return NextResponse.json({ error: "Committee not found" }, { status: 404 });
  const body = await request.json();
  const { profileId, roleInCommittee } = body;
  if (!profileId || !["head", "member"].includes(roleInCommittee)) {
    return NextResponse.json({ error: "Profile ID and valid role are required" }, { status: 400 });
  }
  // Enforce hierarchy: can only add subordinates (all levels)
  if (!getSubordinateIds(auth.userId, auth.profiles).includes(profileId)) {
    return NextResponse.json({ error: "Can only add subordinates (all levels) to committee" }, { status: 403 });
  }
  // Check existing membership + profile active
  const existing = await prisma.committeeMembership.findUnique({ where: { committeeId_profileId: { committeeId, profileId } } });
  if (existing) return NextResponse.json({ error: "User is already a member of this committee" }, { status: 409 });
  const targetProfile = await prisma.profile.findUnique({ where: { id: profileId }, select: { active: true } });
  if (!targetProfile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  if (targetProfile.active === false) return NextResponse.json({ error: "Cannot add inactive user" }, { status: 400 });

  try {
    const membership = await prisma.committeeMembership.create({
      data: { committeeId, profileId, roleInCommittee },
    });
    return NextResponse.json({ success: true, membership }, { status: 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("Unique constraint") || msg.includes("unique")) {
      return NextResponse.json({ error: "Membership already exists" }, { status: 409 });
    }
    throw e;
  }
}
