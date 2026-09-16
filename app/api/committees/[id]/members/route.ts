import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { requireSessionUser } from "@/src/lib/api-auth";
import { canManageCommitteeMembers } from "@/src/lib/permissions";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireSessionUser();
  if ("response" in auth) return auth.response;
  if (!canManageCommitteeMembers(auth.userId, auth.profiles)) {
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
  const membership = await prisma.committeeMembership.create({
    data: { committeeId, profileId, roleInCommittee },
  });
  return NextResponse.json({ success: true, membership }, { status: 201 });
}
