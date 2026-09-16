import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { requireSessionUser } from "@/src/lib/api-auth";
import { canGrantCommitteePermission, toPublicProfile, validateGrantPermission } from "@/src/lib/permissions";

export async function POST(request: Request) {
  const auth = await requireSessionUser();
  if ("response" in auth) return auth.response;
  if (!canGrantCommitteePermission(auth.userId, auth.profiles)) {
    return NextResponse.json({ error: "Only the top authority can grant committee management permissions" }, { status: 403 });
  }
  const body = await request.json();
  const { targetUserId, grant } = body;
  if (!targetUserId || typeof grant !== "boolean") {
    return NextResponse.json({ error: "Target user ID and grant flag are required" }, { status: 400 });
  }
  const validation = validateGrantPermission(auth.userId, targetUserId, auth.profiles);
  if (!validation.valid) return NextResponse.json({ error: validation.reason }, { status: 403 });
  const profile = await prisma.profile.update({
    where: { id: targetUserId },
    data: { canManageCommittees: grant },
  });
  return NextResponse.json({
    success: true,
    message: grant
      ? `Granted committee management permission to user ${targetUserId}`
      : `Revoked committee management permission from user ${targetUserId}`,
    profile: toPublicProfile(profile),
  });
}
