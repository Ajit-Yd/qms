import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { requireSessionUser } from "@/src/lib/api-auth";
import { canManageCommittees } from "@/src/lib/permissions";

export async function GET() {
  const auth = await requireSessionUser();
  if ("response" in auth) return auth.response;
  const committees = await prisma.committee.findMany({
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
  const committee = await prisma.committee.create({
    data: {
      name,
      description: body.description || "",
      createdBy: auth.userId,
    },
  });
  return NextResponse.json({ success: true, committee }, { status: 201 });
}
