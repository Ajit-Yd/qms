import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { requireSessionUser } from "@/src/lib/api-auth";
import { canManageCommittees } from "@/src/lib/permissions";

export async function GET(request: Request) {
  const auth = await requireSessionUser();
  if ("response" in auth) return auth.response;
  // Only the Primary Admin may look outside their own organization.
  const requested = new URL(request.url).searchParams.get("organizationId");
  const organizationId = auth.isPrimaryAdmin && requested ? requested : auth.organizationId;
  const committees = await prisma.committee.findMany({
    where: { organizationId },
    include: { memberships: true, tasks: true, createdByProfile: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ committees });
}

export async function POST(request: Request) {
  const auth = await requireSessionUser();
  if ("response" in auth) return auth.response;
  if (!canManageCommittees(auth.userId, auth.profiles)) {
    return NextResponse.json({ error: "You do not have permission to create committees" }, { status: 403 });
  }
  const body = await request.json();
  const name = String(body.name ?? "").trim();
  if (!name) return NextResponse.json({ error: "Committee name is required" }, { status: 400 });
  const requested = String(body.organizationId ?? "");
  if (requested && requested !== auth.organizationId && !auth.isPrimaryAdmin) {
    return NextResponse.json({ error: "You can only create committees in your own organization" }, { status: 403 });
  }
  const organizationId = auth.isPrimaryAdmin && requested ? requested : auth.organizationId;
  const committee = await prisma.committee.create({
    data: {
      name,
      description: body.description || "",
      createdBy: auth.userId,
      organizationId,
    },
  });
  return NextResponse.json({ success: true, committee }, { status: 201 });
}
